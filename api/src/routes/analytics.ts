import { createRepositories } from '@/db';
import type { StorageEnv } from '@/db/storage';
import { resolveWorkspace, requireRole, type AuthEnv } from '@/auth';
import type { RouterType } from 'itty-router';
import {
  successResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/api-responses';
import type { R2Bucket } from '@cloudflare/workers-types';

interface AnalyticsEnv extends StorageEnv {
  DEVICE_DATA_BUCKET: R2Bucket;
  TABLE_BUCKET_PREFIX?: string;
}

interface DeviceAnalyticsPoint {
  at: string;
  status?: string;
  fields: Record<string, any>;
}

interface DeviceAnalyticsResponse {
  deviceId: string;
  from?: string;
  to?: string;
  points: DeviceAnalyticsPoint[];
  nextCursor?: string;
}

export function analyticsRouter(router: RouterType) {
  // Seed endpoint: generates sample data points directly into R2 (bypasses DO)
  router.post('/devices/:deviceId/seed', async (request: any, env: AnalyticsEnv & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!requireRole(resolved, 'admin')) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;
    const { deviceId } = request.params;

    const db = createRepositories(env);
    const device = await db.devices.getById(workspaceId, deviceId);

    if (!device) {
      return notFoundResponse('Device not found');
    }

    const body = (await request.json().catch(() => null)) as { count?: number } | null;
    const count = Math.min(body?.count ?? 50, 200);
    const mappings = device.fieldMappings;
    const prefix = env.TABLE_BUCKET_PREFIX || '';

    const now = Date.now();
    // Build shard map: shardKey -> points[]
    const shards: Record<string, { at: string; status: string; fields: Record<string, any> }[]> = {};

    for (let i = 0; i < count; i++) {
      // Spread data points over the last 24 hours
      const ts = new Date(now - (count - i) * ((24 * 3600000) / count));
      const at = ts.toISOString();
      const fields: Record<string, any> = {};

      if (mappings && mappings.length > 0) {
        for (const fm of mappings) {
          switch (fm.dataType) {
            case 'number': {
              const min = fm.min ?? 0;
              const max = fm.max ?? 100;
              const precision = fm.precision ?? 2;
              fields[fm.sourceField] = parseFloat((min + Math.random() * (max - min)).toFixed(precision));
              break;
            }
            case 'boolean':
              fields[fm.sourceField] = Math.random() > 0.5;
              break;
            case 'string':
              fields[fm.sourceField] = ['ok', 'warning', 'normal', 'active'][Math.floor(Math.random() * 4)];
              break;
            case 'json':
              fields[fm.sourceField] = parseFloat((Math.random() * 100).toFixed(2));
              break;
            default:
              fields[fm.sourceField] = parseFloat((Math.random() * 100).toFixed(2));
          }
        }
      } else {
        fields['value'] = parseFloat((20 + Math.random() * 30).toFixed(2));
      }

      const point = { at, status: 'offline', fields };

      // Raw data object
      const rawKey = `${prefix}DEV_DATA#${deviceId}#${at}`;
      await env.DEVICE_DATA_BUCKET.put(rawKey, JSON.stringify({ deviceId, at, status: 'offline', fields, rawPayload: fields }));

      // Group into daily shard
      const shardKey = `${ts.getUTCFullYear()}${String(ts.getUTCMonth() + 1).padStart(2, '0')}${String(ts.getUTCDate()).padStart(2, '0')}`;
      if (!shards[shardKey]) shards[shardKey] = [];
      shards[shardKey].push(point);
    }

    // Write shard indices
    for (const [shardKey, points] of Object.entries(shards)) {
      const idxKey = `${prefix}DEV_IDX#${deviceId}#${shardKey}`;

      // Merge with existing shard if present
      let existing: typeof points = [];
      const existingObj = await env.DEVICE_DATA_BUCKET.get(idxKey);
      if (existingObj) {
        try {
          const parsed = JSON.parse(await existingObj.text()) as { points: typeof points };
          existing = parsed.points || [];
        } catch {
          /* ignore */
        }
      }

      const merged = [...existing, ...points];
      await env.DEVICE_DATA_BUCKET.put(idxKey, JSON.stringify({ deviceId, shard: shardKey, points: merged }));
    }

    return successResponse({ ok: true, seeded: count });
  });

  router.get('/devices/:deviceId/analytics', async (request: any, env: AnalyticsEnv & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved) {
      return unauthorizedResponse();
    }
    const { workspaceId, auth } = resolved;
    const { deviceId } = request.params;

    // For device tokens, verify the token's deviceId matches
    if (auth.type === 'device' && auth.deviceId !== deviceId) {
      return forbiddenResponse('Device token does not match deviceId');
    }

    // Verify device belongs to this workspace
    const db = createRepositories(env);
    const device = await db.devices.getById(workspaceId, deviceId);

    if (!device) {
      return notFoundResponse('Device not found');
    }

    const url = new URL(request.url);
    const from = url.searchParams.get('from') || undefined;
    const to = url.searchParams.get('to') || undefined;
    const cursor = url.searchParams.get('cursor') || undefined;
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 500) : 100;

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const prefix = env.TABLE_BUCKET_PREFIX || '';

    const shardPrefixBase = `${prefix}DEV_IDX#${deviceId}#`;

    const list = await env.DEVICE_DATA_BUCKET.list({
      prefix: shardPrefixBase,
      cursor,
      limit,
    });

    const fromTs = from ? new Date(from).toISOString() : undefined;
    const toTs = to ? new Date(to).toISOString() : undefined;

    const rawPoints: DeviceAnalyticsPoint[] = [];

    for (const obj of list.objects) {
      const idx = obj.key.lastIndexOf('#');
      const shardKey = idx !== -1 ? obj.key.slice(idx + 1) : undefined;

      if (fromDate || toDate) {
        if (shardKey && shardKey.length === 8) {
          const year = Number(shardKey.slice(0, 4));
          const month = Number(shardKey.slice(4, 6)) - 1;
          const day = Number(shardKey.slice(6, 8));
          const shardDate = new Date(Date.UTC(year, month, day));
          if (fromDate && shardDate < new Date(fromDate.toDateString())) continue;
          if (toDate && shardDate > new Date(toDate.toDateString())) continue;
        }
      }

      const res = await env.DEVICE_DATA_BUCKET.get(obj.key);
      if (!res) continue;
      const text = await res.text();
      try {
        const idxData = JSON.parse(text) as {
          deviceId: string;
          shard: string;
          points: { at: string; status: string; fields: Record<string, any> }[];
        };
        for (const p of idxData.points) {
          if (fromTs && p.at < fromTs) continue;
          if (toTs && p.at > toTs) continue;
          rawPoints.push({ at: p.at, status: p.status, fields: p.fields });
        }
      } catch {
        continue;
      }
    }

    // Fallback: if no shard index data found, read raw DEV_DATA# objects directly
    if (rawPoints.length === 0) {
      const rawPrefix = `${prefix}DEV_DATA#${deviceId}#`;
      let rawCursor: string | undefined = cursor;
      let fetched = 0;
      const maxRaw = limit;

      do {
        const rawList = await env.DEVICE_DATA_BUCKET.list({
          prefix: rawPrefix,
          cursor: rawCursor,
          limit: maxRaw - fetched,
        });

        for (const obj of rawList.objects) {
          const res = await env.DEVICE_DATA_BUCKET.get(obj.key);
          if (!res) continue;
          try {
            const record = JSON.parse(await res.text()) as {
              at: string;
              status?: string;
              fields?: Record<string, any>;
              rawPayload?: Record<string, any>;
            };
            const pointAt = record.at;
            if (fromTs && pointAt < fromTs) continue;
            if (toTs && pointAt > toTs) continue;
            rawPoints.push({
              at: pointAt,
              status: record.status,
              fields: record.fields ?? record.rawPayload ?? {},
            });
            fetched++;
          } catch {
            continue;
          }
        }

        rawCursor = rawList.truncated ? rawList.cursor : undefined;
      } while (rawCursor && fetched < maxRaw);
    }

    rawPoints.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));

    const response: DeviceAnalyticsResponse = {
      deviceId,
      from,
      to,
      points: rawPoints,
      nextCursor: list.truncated ? list.cursor : undefined,
    };

    return successResponse(response);
  });
}
