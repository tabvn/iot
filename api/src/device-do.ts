import type { DurableObjectNamespace, DurableObjectState } from "@cloudflare/workers-types";
import type { Env as StorageEnv } from "@/storage";
import { getPlanLimits, getWorkspacePlan } from "@/rate-limit";
import { getEntity, putEntity } from "@/storage";
import type { DeviceEntity, TableEntity } from "@/models";

interface Env extends StorageEnv {
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
  private env: Env;
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private workspaceId: string;
  private deviceId: string;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    // DO name is "workspaceId:deviceId" — parse once at construction
    const name = state.id.toString();
    const sep = name.indexOf(":");
    if (sep !== -1) {
      this.workspaceId = name.slice(0, sep);
      this.deviceId = name.slice(sep + 1);
    } else {
      this.workspaceId = "";
      this.deviceId = name;
    }
  }

  private async getSnapshot(): Promise<DeviceStateSnapshot> {
    return (await this.state.storage.get<DeviceStateSnapshot>("state")) || { ...DEFAULT_SNAPSHOT };
  }

  private async persistDeviceStatus(status: 'online' | 'offline', lastSeenAt: string, fields?: Record<string, any>) {
    if (!this.workspaceId) return;
    const pk = `WS#${this.workspaceId}`;
    const sk = `DEV#${this.deviceId}`;
    const existing = await getEntity<DeviceEntity>(this.env, pk, sk);
    if (!existing) return;
    const updated = {
      ...existing,
      updatedAt: lastSeenAt,
      status,
      lastSeenAt,
      lastData: fields ?? (existing as unknown as Record<string, unknown>)["lastData"],
    };
    await putEntity(this.env, updated as TableEntity);
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
    await this.state.storage.put("state", snapshot);
    await this.persistDeviceStatus(status, now, fields);
  }

  private notifyAutomation(event: string, body: Record<string, unknown>) {
    if (!this.workspaceId) return;
    const id = this.env.WORKSPACE_AUTOMATION_DO.idFromName(this.workspaceId);
    const stub = this.env.WORKSPACE_AUTOMATION_DO.get(id);
    return stub.fetch(`https://automation/event/${event}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // WebSocket connection
    if (request.headers.get("Upgrade") === "websocket" && pathname === "/ws") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

      server.accept();
      this.ws = server;
      await this.updateStatus('online');
      await this.notifyAutomation("device-status", { deviceId: this.deviceId, status: "online" });

      // Heartbeat: send ping every 30s to detect stale connections
      this.heartbeatTimer = setInterval(() => {
        try {
          server.send(JSON.stringify({ type: "ping", at: new Date().toISOString() }));
        } catch {
          // Connection already closed — cleanup will happen in close handler
        }
      }, HEARTBEAT_INTERVAL_MS);

      server.addEventListener("message", async (event) => {
        const data = typeof event.data === "string" ? event.data : "";

        // Handle pong responses silently
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "pong") return;
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
        await this.state.storage.put("state", snapshot);
        await this.persistDeviceStatus(current.status, now, {});
        server.send(JSON.stringify({ type: "ack", at: now }));
      });

      server.addEventListener("close", async () => {
        if (this.heartbeatTimer) {
          clearInterval(this.heartbeatTimer);
          this.heartbeatTimer = null;
        }
        this.ws = null;
        await this.updateStatus('offline');
        await this.notifyAutomation("device-status", { deviceId: this.deviceId, status: "offline" });
      });

      server.addEventListener("error", async () => {
        if (this.heartbeatTimer) {
          clearInterval(this.heartbeatTimer);
          this.heartbeatTimer = null;
        }
        this.ws = null;
        await this.updateStatus('offline');
        await this.notifyAutomation("device-status", { deviceId: this.deviceId, status: "offline" });
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    // Publish/broadcast an event to the device WebSocket client(s)
    if (request.method === "POST" && pathname === "/event") {
      const body = await request.json().catch(() => null) as Record<string, unknown> | null;
      if (!body || typeof body !== "object") {
        return new Response(JSON.stringify({ error: "Invalid event payload" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (this.ws) {
        try {
          this.ws.send(JSON.stringify(body));
        } catch {
          // ignore send failures; connection may be closed
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Send data to device via WebSocket
    if (request.method === "POST" && pathname === "/send") {
      if (!this.ws) {
        return new Response(JSON.stringify({ error: "Device WebSocket not connected" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }

      const body = await request.json().catch(() => null);
      if (!body) {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      this.ws.send(JSON.stringify(body));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Ingest device data
    if (request.method === "POST" && pathname === "/ingest") {
      const body = await request.json().catch(() => null) as Record<string, any> | null;
      const now = new Date().toISOString();
      const fields: Record<string, any> = body && typeof body === 'object' ? { ...body } : {};

      const current = await this.getSnapshot();
      const snapshot: DeviceStateSnapshot = {
        lastSeenAt: now,
        lastPayload: body ?? current.lastPayload,
        status: current.status,
        fields,
      };
      await this.state.storage.put("state", snapshot);
      await this.persistDeviceStatus(current.status, now, fields);

      if (this.ws) {
        this.ws.send(JSON.stringify({ type: "ingest", at: now, fields, raw: body }));
      }

      await this.notifyAutomation("device-data", { deviceId: this.deviceId, fields });

      // Persist raw data point
      const key = `${this.env.TABLE_BUCKET_PREFIX}DEV_DATA#${this.deviceId}#${now}`;
      const plan = await getWorkspacePlan(this.env, this.workspaceId);
      const limits = getPlanLimits(plan);
      const expiresAt =
        typeof limits.ttlDays === "number"
          ? new Date(Date.now() + limits.ttlDays * 24 * 60 * 60 * 1000).toISOString()
          : undefined;

      await this.env.DEVICE_DATA_BUCKET.put(key, JSON.stringify({
        deviceId: this.deviceId,
        at: now,
        expiresAt,
        status: snapshot.status,
        fields,
        rawPayload: body,
      }));

      // Append to daily shard index
      const date = new Date(now);
      const shardKey = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
      const idxKey = `${this.env.TABLE_BUCKET_PREFIX}DEV_IDX#${this.deviceId}#${shardKey}`;

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

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get device state
    if (request.method === "GET" && pathname === "/state") {
      const snapshot = await this.getSnapshot();
      return new Response(JSON.stringify(snapshot), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Control command from automations
    if (request.method === "POST" && pathname === "/control") {
      const body = await request.json().catch(() => null) as
        | { type: "set_field"; field: string; value: any; context?: Record<string, any> }
        | null;
      if (!body || body.type !== "set_field") {
        return new Response(JSON.stringify({ error: "Invalid control payload" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
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
      await this.state.storage.put("state", snapshot);
      await this.persistDeviceStatus(current.status, now, fields);

      if (this.ws) {
        this.ws.send(JSON.stringify({
          type: "control",
          at: now,
          field: body.field,
          value: body.value,
          context: body.context,
        }));
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}
