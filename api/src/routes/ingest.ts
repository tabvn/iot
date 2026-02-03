import type { Env as StorageEnv } from "@/storage";
import { resolveWorkspace, type AuthEnv } from "@/auth";
import { getWorkspacePlan, checkRateLimit } from "@/rate-limit";
import { Router, type RouterType } from "itty-router";

export interface WorkerEnv extends StorageEnv {
  DEVICE_DO: DurableObjectNamespace;
}

export function ingestRouter(router: RouterType) {
  // Device ingest endpoint — workspace resolved from token (API key or device token)
  router.post("/devices/:deviceId/ingest", async (request: any, env: WorkerEnv & AuthEnv) => {
    const { deviceId } = request.params;
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const { workspaceId, auth } = resolved;

    // For device tokens, verify the token's deviceId matches the path
    if (auth.type === "device" && auth.deviceId !== deviceId) {
      return new Response(JSON.stringify({ error: "Device token does not match deviceId" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Rate limit per workspace plan
    const plan = await getWorkspacePlan(env, workspaceId);
    const allowed = await checkRateLimit(env, workspaceId, plan);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    const doName = `${workspaceId}:${deviceId}`;
    const id = env.DEVICE_DO.idFromName(doName);
    const stub = env.DEVICE_DO.get(id);
    return stub.fetch("https://device/ingest", request);
  });
}
