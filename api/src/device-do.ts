import type { DurableObjectNamespace, DurableObjectState, R2Bucket } from '@cloudflare/workers-types';
import type { StorageEnv } from '@/db/storage';
import { put, get } from '@/db/storage';
import type { DeviceEntity } from '@/db/types';
import { Keys, EntityTypes } from '@/db/types';
import { getPlanLimits, getWorkspacePlan } from '@/rate-limit';
import {
  successResponse,
  badRequestResponse,
  notFoundResponse,
} from '@/api-responses';
import { notifyDeviceOnline, notifyDeviceOffline } from '@/notifications';

interface DeviceEnv extends StorageEnv {
  WORKSPACE_AUTOMATION_DO: DurableObjectNamespace;
}

interface DeviceStateSnapshot {
  lastSeenAt: string | null;
  lastPayload: unknown | null;
  status: 'online' | 'offline';
  fields?: Record<string, any>;
}

const DEFAULT_SNAPSHOT: DeviceStateSnapshot = {
  lastSeenAt: null,
  lastPayload: null,
  status: 'offline',
  fields: {},
};

const HEARTBEAT_INTERVAL_MS = 30_000; // 30s ping interval

export class DeviceDurableObject {
  private state: DurableObjectState;
  private env: DeviceEnv;
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private workspaceId: string;
  private deviceId: string;

  constructor(state: DurableObjectState, env: DeviceEnv) {
    this.state = state;
    this.env = env;

    // DO name is "workspaceId:deviceId" — parse once at construction
    // idFromName() IDs expose .name with the original string; .toString() returns hex
    const name = (state.id as any).name ?? state.id.toString();
    const sep = name.indexOf(':');
    if (sep !== -1) {
      this.workspaceId = name.slice(0, sep);
      this.deviceId = name.slice(sep + 1);
    } else {
      this.workspaceId = '';
      this.deviceId = name;
    }
  }

  private async getSnapshot(): Promise<DeviceStateSnapshot> {
    return (await this.state.storage.get<DeviceStateSnapshot>('state')) || { ...DEFAULT_SNAPSHOT };
  }

  private async persistDeviceStatus(status: 'online' | 'offline', lastSeenAt: string, fields?: Record<string, any>) {
    if (!this.workspaceId) return;
    const { pk, sk } = Keys.device(this.workspaceId, this.deviceId);
    const existing = await get<DeviceEntity>(this.env, pk, sk);
    if (!existing) return;
    const updated: DeviceEntity = {
      ...existing,
      updatedAt: lastSeenAt,
      status,
      lastSeenAt,
      lastData: fields ?? existing.lastData,
    };
    await put(this.env, updated);
  }

  private async updateStatus(status: 'online' | 'offline', payload?: unknown, fields?: Record<string, any>) {
    const now = new Date().toISOString();
    const current = await this.getSnapshot();
    const snapshot: DeviceStateSnapshot = {
      lastSeenAt: now,
      lastPayload: payload ?? current.lastPayload,
      status,
      fields: fields ?? current.fields,
    };
    await this.state.storage.put('state', snapshot);
    await this.persistDeviceStatus(status, now, fields);
  }

  private notifyAutomation(event: string, body: Record<string, unknown>) {
    if (!this.workspaceId) return;
    const id = this.env.WORKSPACE_AUTOMATION_DO.idFromName(this.workspaceId);
    const stub = this.env.WORKSPACE_AUTOMATION_DO.get(id);
    return stub.fetch(`https://automation/event/${event}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // WebSocket connection
    if (request.headers.get('Upgrade') === 'websocket' && pathname === '/ws') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

      server.accept();
      this.ws = server;
      await this.updateStatus('online');
      await this.notifyAutomation('device-status', { deviceId: this.deviceId, status: 'online' });
      if (this.workspaceId) {
        const { pk: dPk, sk: dSk } = Keys.device(this.workspaceId, this.deviceId);
        const device = await get<DeviceEntity>(this.env, dPk, dSk);
        notifyDeviceOnline(this.env, this.workspaceId, this.deviceId, device?.name).catch(() => {});
      }

      // Heartbeat: send ping every 30s to detect stale connections
      this.heartbeatTimer = setInterval(() => {
        try {
          server.send(JSON.stringify({ type: 'ping', at: new Date().toISOString() }));
        } catch {
          // Connection already closed
        }
      }, HEARTBEAT_INTERVAL_MS);

      server.addEventListener('message', async (event) => {
        const data = typeof event.data === 'string' ? event.data : '';

        // Handle pong responses silently
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'pong') return;
        } catch {
          // Not JSON — treat as data payload
        }

        const now = new Date().toISOString();
        const current = await this.getSnapshot();
        const snapshot: DeviceStateSnapshot = {
          lastSeenAt: now,
          lastPayload: event.data,
          status: current.status,
          fields: {},
        };
        await this.state.storage.put('state', snapshot);
        await this.persistDeviceStatus(current.status, now, {});
        server.send(JSON.stringify({ type: 'ack', at: now }));
      });

      server.addEventListener('close', async () => {
        if (this.heartbeatTimer) {
          clearInterval(this.heartbeatTimer);
          this.heartbeatTimer = null;
        }
        this.ws = null;
        await this.updateStatus('offline');
        await this.notifyAutomation('device-status', { deviceId: this.deviceId, status: 'offline' });
        if (this.workspaceId) {
          const { pk: dPk, sk: dSk } = Keys.device(this.workspaceId, this.deviceId);
          const device = await get<DeviceEntity>(this.env, dPk, dSk);
          notifyDeviceOffline(this.env, this.workspaceId, this.deviceId, device?.name).catch(() => {});
        }
      });

      server.addEventListener('error', async () => {
        if (this.heartbeatTimer) {
          clearInterval(this.heartbeatTimer);
          this.heartbeatTimer = null;
        }
        this.ws = null;
        await this.updateStatus('offline');
        await this.notifyAutomation('device-status', { deviceId: this.deviceId, status: 'offline' });
        if (this.workspaceId) {
          const { pk: dPk, sk: dSk } = Keys.device(this.workspaceId, this.deviceId);
          const device = await get<DeviceEntity>(this.env, dPk, dSk);
          notifyDeviceOffline(this.env, this.workspaceId, this.deviceId, device?.name).catch(() => {});
        }
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    // Publish/broadcast an event to the device WebSocket client(s)
    if (request.method === 'POST' && pathname === '/event') {
      const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body || typeof body !== 'object') {
        return badRequestResponse('Invalid event payload');
      }

      if (this.ws) {
        try {
          this.ws.send(JSON.stringify(body));
        } catch {
          // ignore send failures
        }
      }

      return successResponse({ ok: true });
    }

    // Send data to device via WebSocket
    if (request.method === 'POST' && pathname === '/send') {
      if (!this.ws) {
        return new Response(JSON.stringify({ error: 'Device WebSocket not connected' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const body = await request.json().catch(() => null);
      if (!body) {
        return badRequestResponse('Invalid JSON');
      }

      this.ws.send(JSON.stringify(body));
      return successResponse({ ok: true });
    }

    // Ingest device data
    if (request.method === 'POST' && pathname === '/ingest') {
      const body = (await request.json().catch(() => null)) as Record<string, any> | null;
      const now = new Date().toISOString();
      const fields: Record<string, any> = body && typeof body === 'object' ? { ...body } : {};

      const current = await this.getSnapshot();
      const snapshot: DeviceStateSnapshot = {
        lastSeenAt: now,
        lastPayload: body ?? current.lastPayload,
        status: current.status,
        fields,
      };
      await this.state.storage.put('state', snapshot);
      await this.persistDeviceStatus(current.status, now, fields);

      if (this.ws) {
        this.ws.send(JSON.stringify({ type: 'ingest', at: now, fields, raw: body }));
      }

      await this.notifyAutomation('device-data', { deviceId: this.deviceId, fields });

      // Persist raw data point
      const prefix = this.env.TABLE_BUCKET_PREFIX || '';
      const key = `${prefix}DEV_DATA#${this.deviceId}#${now}`;
      const plan = await getWorkspacePlan(this.env, this.workspaceId);
      const limits = getPlanLimits(plan);
      const expiresAt =
        typeof limits.ttlDays === 'number'
          ? new Date(Date.now() + limits.ttlDays * 24 * 60 * 60 * 1000).toISOString()
          : undefined;

      await this.env.DEVICE_DATA_BUCKET.put(
        key,
        JSON.stringify({
          deviceId: this.deviceId,
          at: now,
          expiresAt,
          status: snapshot.status,
          fields,
          rawPayload: body,
        })
      );

      // Append to daily shard index
      const date = new Date(now);
      const shardKey = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
      const idxKey = `${prefix}DEV_IDX#${this.deviceId}#${shardKey}`;

      let idxData: { deviceId: string; shard: string; points: { at: string; status: string; fields: Record<string, any> }[] } = {
        deviceId: this.deviceId,
        shard: shardKey,
        points: [],
      };

      const existingIdx = await this.env.DEVICE_DATA_BUCKET.get(idxKey);
      if (existingIdx) {
        try {
          idxData = JSON.parse(await existingIdx.text()) as typeof idxData;
        } catch {
          idxData = { deviceId: this.deviceId, shard: shardKey, points: [] };
        }
      }

      idxData.points.push({ at: now, status: snapshot.status, fields });

      const MAX_POINTS_PER_SHARD = 10000;
      if (idxData.points.length > MAX_POINTS_PER_SHARD) {
        idxData.points = idxData.points.slice(-MAX_POINTS_PER_SHARD);
      }

      await this.env.DEVICE_DATA_BUCKET.put(idxKey, JSON.stringify(idxData));

      return successResponse({ ok: true });
    }

    // Get device state
    if (request.method === 'GET' && pathname === '/state') {
      const snapshot = await this.getSnapshot();
      return successResponse(snapshot);
    }

    // Control command from automations
    if (request.method === 'POST' && pathname === '/control') {
      const body = (await request.json().catch(() => null)) as
        | { type: 'set_field'; field: string; value: any; context?: Record<string, any> }
        | null;
      if (!body || body.type !== 'set_field') {
        return badRequestResponse('Invalid control payload');
      }

      const now = new Date().toISOString();
      const current = await this.getSnapshot();
      const fields = { ...(current.fields ?? {}), [body.field]: body.value };
      const snapshot: DeviceStateSnapshot = {
        lastSeenAt: now,
        lastPayload: current.lastPayload,
        status: current.status,
        fields,
      };
      await this.state.storage.put('state', snapshot);
      await this.persistDeviceStatus(current.status, now, fields);

      if (this.ws) {
        this.ws.send(
          JSON.stringify({
            type: 'control',
            at: now,
            field: body.field,
            value: body.value,
            context: body.context,
          })
        );
      }

      return successResponse({ ok: true });
    }

    return notFoundResponse();
  }
}
