import { Router, type RouterType, createCors } from "itty-router";
import type { StorageEnv } from "@/db/storage";
import { queryByPk, get, put } from "@/db/storage";
import type { WorkspaceEntity } from "@/db/types";
import { EntityTypes } from "@/db/types";
import { usersRouter } from "@/routes/users";
import { workspacesRouter } from "@/routes/workspaces";
import { devicesRouter } from "@/routes/devices";
import { loginRouter } from "@/routes/login";
import { ingestRouter } from "@/routes/ingest";
import { analyticsRouter } from "@/routes/analytics";
import { membersPlanBillingRouter } from "@/routes/members-plan-billing";
import { automationsRouter } from "@/routes/automations";
import { workspaceApiKeysRouter } from "@/routes/workspace-api-keys";
import { deviceApiKeysRouter } from "@/routes/device-api-keys";
import { superMasterKeysRouter } from "@/routes/super-master-keys";
import { invitationsRouter } from "@/routes/invitations";
import { automationLogsRouter } from "@/routes/automation-logs";
import { automationStatsRouter } from "@/routes/automation-stats";
import { notificationsRouter } from "@/routes/notifications";
import { getAuthFromRequest } from "@/auth";
import { openApiDoc } from "@/openapi";
import { validateApiExplorerBody } from "@/schemas";
import { swaggerHtml } from "@/swagger-ui";

// Durable Object class exports (required by Cloudflare Workers runtime)
export { DeviceDurableObject } from "@/device-do";
export { UserDurableObject } from "@/user-do";
export { WorkspaceDurableObject } from "@/workspace-do";
export { WorkspaceAutomationDO } from "@/workspace-automation-do";
export { WorkspaceCleanupDurableObject } from "@/workspace-cleanup-do";
// In the future we can add GlobalRealtimeDO and WorkspaceRealtimeDO exports here

// Unified environment interface used across all route and DO files
export interface Env extends StorageEnv {
  DEVICE_DO: DurableObjectNamespace;
  USER_DO: DurableObjectNamespace;
  WORKSPACE_DO: DurableObjectNamespace;
  WORKSPACE_AUTOMATION_DO: DurableObjectNamespace;
  WORKSPACE_CLEANUP_DO: DurableObjectNamespace;
  USER_JWT_SECRET?: string; // Only used for user JWT auth
  // Email configuration
  EMAIL_FROM?: string; // e.g., "noreply@thebaycity.dev"
  EMAIL_FROM_NAME?: string; // e.g., "Thebaycity IoT"
  APP_URL?: string; // e.g., "https://thebaycity.dev" for building invite links
}

// Shared JSON response helpers
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function jsonError(error: string, status: number): Response {
  return json({ error }, status);
}

const ALLOWED_ORIGINS = [
  "https://thebaycity.dev",
  "https://www.thebaycity.dev",
  "http://localhost:3000",
  "http://localhost:8787",
];

const { preflight, corsify } = createCors({
  origins: (origin: string) => ALLOWED_ORIGINS.includes(origin),
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  headers: ["Content-Type", "Authorization", "x-workspace-alias"],
});

const router: RouterType = Router();

// Handle CORS preflight requests
router.all("*", preflight);

// Authenticate WebSocket via ?token= query param or Authorization header
async function authenticateWsRequest(request: Request, env: Env): Promise<{ workspaceId: string; deviceId?: string } | null> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  // Build a fake request with Authorization header so verifyJwt works
  if (token) {
    const fakeReq = new Request(request.url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const auth = await getAuthFromRequest(env, fakeReq);
    if (auth?.workspaceId) return { workspaceId: auth.workspaceId, deviceId: auth.deviceId };
  }

  // Fallback to Authorization header
  const auth = await getAuthFromRequest(env, request);
  if (auth?.workspaceId) return { workspaceId: auth.workspaceId, deviceId: auth.deviceId };

  return null;
}

// Per-device WebSocket — forwards directly to DeviceDurableObject for upgrade
async function handleDeviceWebSocket(request: Request, env: Env): Promise<Response> {
  if (request.headers.get("Upgrade") !== "websocket") {
    return jsonError("Expected WebSocket", 426);
  }

  const url = new URL(request.url);
  const deviceId = url.pathname.split("/").pop() || "";
  if (!deviceId) {
    return jsonError("Missing deviceId", 400);
  }

  const wsAuth = await authenticateWsRequest(request, env);
  if (!wsAuth) {
    return jsonError("Unauthorized", 401);
  }

  // For device tokens, verify the token's deviceId matches the path
  if (wsAuth.deviceId && wsAuth.deviceId !== deviceId) {
    return jsonError("Device token does not match deviceId", 403);
  }

  // Forward the raw request to the DO — it handles the WebSocket upgrade
  const doName = `${wsAuth.workspaceId}:${deviceId}`;
  const id = env.DEVICE_DO.idFromName(doName);
  const stub = env.DEVICE_DO.get(id);
  return stub.fetch("https://device/ws", request);
}

// Placeholder for future workspace-level WebSocket handling
async function handleWorkspaceWebSocket(request: Request, env: Env): Promise<Response> {
  if (request.headers.get("Upgrade") !== "websocket") {
    return jsonError("Expected WebSocket", 426);
  }

  const url = new URL(request.url);
  const alias = url.pathname.split("/").pop() || "";
  if (!alias) {
    return jsonError("Missing workspace alias", 400);
  }

  const wsAuth = await authenticateWsRequest(request, env);
  if (!wsAuth) {
    return jsonError("Unauthorized", 401);
  }

  // For now, simply route to the WorkspaceDurableObject which can be extended to manage WS sessions
  const id = env.WORKSPACE_DO.idFromName(alias.toLowerCase());
  const stub = env.WORKSPACE_DO.get(id);
  return stub.fetch("https://workspace/ws", request);
}

// API Explorer route: allows interactive testing of other API endpoints in a controlled way
router.post("/explorer", async (request: Request, env: Env, ctx: ExecutionContext) => {
  // Require authentication; reuse existing auth logic so explorer respects roles
  const auth = await getAuthFromRequest(env, request);
  if (!auth) {
    return jsonError("Unauthorized", 401);
  }

  const parsed = await request.json().catch(() => null);
  const validation = validateApiExplorerBody(parsed);
  if (!validation.ok) {
    return jsonError(validation.error, 400);
  }
  const { method, path, headers: extraHeaders, body } = validation.value;

  // Prevent recursion and sensitive endpoints from being invoked via explorer
  if (path === "/explorer") {
    return jsonError("Cannot call /explorer from explorer", 400);
  }

  const url = new URL(request.url);
  url.pathname = path;

  const init: RequestInit = {
    method,
    headers: new Headers(request.headers),
  };

  // Merge/override headers from explorer body (except Authorization, which we keep from the original request)
  for (const [key, value] of Object.entries(extraHeaders ?? {})) {
    if (!key.toLowerCase().startsWith("authorization")) {
      (init.headers as Headers).set(key, String(value));
    }
  }

  if (body !== undefined && method !== "GET" && method !== "HEAD") {
    (init.headers as Headers).set("Content-Type", "application/json");
    init.body = JSON.stringify(body);
  }

  const simulatedRequest = new Request(url.toString(), init);

  // Reuse the same router and env/ctx so behavior is identical to real calls
  const response = (router.handle(simulatedRequest, env, ctx) as Promise<Response>);
  return response;
});

// Expose OpenAPI/Swagger JSON specification
router.get("/openapi.json", () => {
  return new Response(JSON.stringify(openApiDoc), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
});

router.get("/swagger.json", () => {
  return new Response(JSON.stringify(openApiDoc), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
});

router.get("/health", () => json({ ok: true, ts: new Date().toISOString() }));

// Simple embedded Swagger UI, served at /docs
router.get("/docs", () => {
  return new Response(swaggerHtml, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});

usersRouter(router);
workspacesRouter(router);
devicesRouter(router);
loginRouter(router);
ingestRouter(router);
analyticsRouter(router);
membersPlanBillingRouter(router);
automationLogsRouter(router);
automationStatsRouter(router);
automationsRouter(router);
notificationsRouter(router);
workspaceApiKeysRouter(router);
deviceApiKeysRouter(router);
superMasterKeysRouter(router);
invitationsRouter(router);

async function listAllWorkspaceIds(env: Env): Promise<string[]> {
  const result = await queryByPk(env, "WORKSPACES#ALL");
  const ids = result.items
    .filter((r: any) => !("deletedAt" in r))
    .map((r: any) => (r as { workspaceId: string }).workspaceId);

  if (ids.length > 0) return ids;

  // Backfill: scan R2 for workspace PKs using delimiter to find all WS#<uuid>/ prefixes
  const prefix = env.TABLE_BUCKET_PREFIX || "data/";
  const scanPrefix = `${prefix}WS#`;
  const foundIds: string[] = [];
  let cursor: string | undefined;

  do {
    const list = await env.DEVICE_DATA_BUCKET.list({
      prefix: scanPrefix,
      delimiter: "/",
      cursor,
    });

    for (const dp of list.delimitedPrefixes) {
      // dp = "data/WS#<uuid>/" — extract the uuid
      const pkPart = dp.slice(prefix.length, -1); // "WS#<uuid>"
      const wsId = pkPart.slice(3); // "<uuid>"
      if (wsId && !wsId.includes("#")) {
        foundIds.push(wsId);
      }
    }

    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);

  // Backfill WORKSPACES#ALL index for each found workspace
  if (foundIds.length > 0) {
    await Promise.all(
      foundIds.map(async (wsId) => {
        const ws = await get<WorkspaceEntity>(env, `WS#${wsId}`, "METADATA");
        if (ws && !ws.deletedAt) {
          const now = new Date().toISOString();
          await put(env, {
            pk: "WORKSPACES#ALL",
            sk: `WS#${wsId}`,
            entityType: EntityTypes.WORKSPACE,
            createdAt: ws.createdAt,
            updatedAt: now,
            workspaceId: wsId,
            ownerUserId: ws.ownerUserId,
            name: ws.name,
            slug: ws.slug,
          } as WorkspaceEntity);
        }
      })
    );
  }

  return foundIds;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/ws/devices/")) {
      return handleDeviceWebSocket(request, env);
    }

    if (url.pathname.startsWith("/ws/workspaces/")) {
      return handleWorkspaceWebSocket(request, env);
    }

    return router.handle(request, env, ctx).then(corsify) as Promise<Response>;
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const now = new Date();
    const workspaceIds = await listAllWorkspaceIds(env);

    for (const workspaceId of workspaceIds) {
      const id = env.WORKSPACE_AUTOMATION_DO.idFromName(workspaceId);
      const stub = env.WORKSPACE_AUTOMATION_DO.get(id);
      ctx.waitUntil(
        stub.fetch("https://automation/event/schedule-tick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ now: now.toISOString() }),
        })
      );
    }
  },
};
