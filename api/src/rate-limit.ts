import type { StorageEnv } from '@/db/storage';
import { get } from '@/db/storage';
import type { WorkspacePlan } from '@/db/types';

export interface PlanLimits {
  requestsPerMinute: number;
  ttlDays: number | 'custom';
}

const PLAN_LIMITS: Record<WorkspacePlan, PlanLimits> = {
  starter: { requestsPerMinute: 60, ttlDays: 7 },
  professional: { requestsPerMinute: 600, ttlDays: 90 },
  business: { requestsPerMinute: 3000, ttlDays: 365 },
  enterprise: { requestsPerMinute: 10000, ttlDays: 'custom' },
};

export async function getWorkspacePlan(env: StorageEnv, workspaceId: string): Promise<WorkspacePlan> {
  const entity = await get(env, `WS#${workspaceId}`, 'PLAN#current') as { plan?: WorkspacePlan } | null;
  return entity?.plan || 'starter';
}

// Simple R2-based token bucket per workspace per minute
export async function checkRateLimit(env: StorageEnv, workspaceId: string, plan: WorkspacePlan): Promise<boolean> {
  const limits = PLAN_LIMITS[plan];
  const prefix = env.TABLE_BUCKET_PREFIX || '';
  const now = new Date();
  const minuteKey = `${now.getUTCFullYear()}${now.getUTCMonth()}${now.getUTCDate()}${now.getUTCHours()}${now.getUTCMinutes()}`;
  const key = `${prefix}RL#WS#${workspaceId}#${minuteKey}`;

  const obj = await env.DEVICE_DATA_BUCKET.get(key);
  let count = 0;
  if (obj) {
    const text = await obj.text();
    count = parseInt(text, 10) || 0;
  }
  if (count >= limits.requestsPerMinute) {
    return false;
  }
  await env.DEVICE_DATA_BUCKET.put(key, String(count + 1), { httpMetadata: { contentType: 'text/plain' } });
  return true;
}

export function getPlanLimits(plan: WorkspacePlan): PlanLimits {
  return PLAN_LIMITS[plan];
}
