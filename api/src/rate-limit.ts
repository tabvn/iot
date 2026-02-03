import type { Env } from "@/storage";
import type { WorkspacePlan } from "@/models";
import { queryByPk } from "@/storage";

export interface PlanLimits {
  requestsPerMinute: number;
  ttlDays: number | "custom";
}

const PLAN_LIMITS: Record<WorkspacePlan, PlanLimits> = {
  starter: { requestsPerMinute: 60, ttlDays: 7 },
  professional: { requestsPerMinute: 600, ttlDays: 90 },
  business: { requestsPerMinute: 3000, ttlDays: 365 },
  enterprise: { requestsPerMinute: 10000, ttlDays: "custom" },
};

export async function getWorkspacePlan(env: Env, workspaceId: string): Promise<WorkspacePlan> {
  const items = await queryByPk(env, `WS#${workspaceId}`);
  const plan = (items.find((e) => e.sk === "PLAN#current") as { plan?: WorkspacePlan } | undefined)?.plan;
  return plan || "starter";
}

// Simple R2-based token bucket per workspace per minute
export async function checkRateLimit(env: Env, workspaceId: string, plan: WorkspacePlan): Promise<boolean> {
  const limits = PLAN_LIMITS[plan];
  const now = new Date();
  const minuteKey = `${now.getUTCFullYear()}${now.getUTCMonth()}${now.getUTCDate()}${now.getUTCHours()}${now.getUTCMinutes()}`;
  const key = `${env.TABLE_BUCKET_PREFIX}RL#WS#${workspaceId}#${minuteKey}`;

  const obj = await env.DEVICE_DATA_BUCKET.get(key);
  let count = 0;
  if (obj) {
    const text = await obj.text();
    count = parseInt(text, 10) || 0;
  }
  if (count >= limits.requestsPerMinute) {
    return false;
  }
  await env.DEVICE_DATA_BUCKET.put(key, String(count + 1), { httpMetadata: { contentType: "text/plain" } });
  return true;
}

export function getPlanLimits(plan: WorkspacePlan): PlanLimits {
  return PLAN_LIMITS[plan];
}
