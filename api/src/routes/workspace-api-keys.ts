import type { Env } from "@/storage";
import type { WorkspaceApiKeyEntity, TableEntity } from "@/models";
import { putEntity, queryByPk } from "@/storage";
import { resolveWorkspace, hasManageAccess, type AuthEnv } from "@/auth";
import { Router, type RouterType } from "itty-router";

interface CreateWorkspaceApiKeyRequest {
  name?: string;
}

async function signWorkspaceApiJwt(env: AuthEnv, workspaceId: string, apiKeyId: string): Promise<string | null> {
  const secret = env.API_JWT_SECRET;
  if (!secret) return null;

  const header = { alg: "HS256", typ: "JWT" };
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    sub: apiKeyId,
    type: "api",
    workspaceId,
    keyId: apiKeyId,
    iat: nowSeconds,
    exp: nowSeconds + 30 * 24 * 60 * 60, // 30 days
  };

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  function base64UrlEncode(data: Uint8Array): string {
    const b64 = btoa(String.fromCharCode(...data));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  const headerJson = JSON.stringify(header);
  const payloadJson = JSON.stringify(payload);
  const headerB64 = base64UrlEncode(encoder.encode(headerJson));
  const payloadB64 = base64UrlEncode(encoder.encode(payloadJson));
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const signature = await crypto.subtle.sign("HMAC", key, data);
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

export function workspaceApiKeysRouter(router: RouterType) {
  // Create a new API key for the current workspace (workspace master or super master)
  router.post("/workspace/api-keys", async (request: Request, env: Env & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request);
    if (!resolved || !hasManageAccess(resolved.auth)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { workspaceId } = resolved;

    const body = (await request.json().catch(() => null)) as CreateWorkspaceApiKeyRequest | null;
    const name = body?.name?.trim() || "Workspace API Key";

    const apiKeyId = crypto.randomUUID();
    const now = new Date().toISOString();

    const entity: WorkspaceApiKeyEntity = {
      pk: `WS#${workspaceId}`,
      sk: `API_KEY#${apiKeyId}`,
      entityType: "API_KEY",
      createdAt: now,
      updatedAt: now,
      workspaceId,
      apiKeyId,
      name,
    };

    await putEntity(env, entity as TableEntity);

    const token = await signWorkspaceApiJwt(env, workspaceId, apiKeyId);

    return new Response(JSON.stringify({ apiKeyId, token }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  });

  // List API keys for the current workspace
  router.get("/workspace/api-keys", async (request: Request, env: Env & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request);
    if (!resolved || !hasManageAccess(resolved.auth)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { workspaceId } = resolved;

    const items = await queryByPk<WorkspaceApiKeyEntity>(env, `WS#${workspaceId}`);
    const keys = items
      .filter((e) => e.entityType === "API_KEY" && typeof e.sk === "string" && e.sk.startsWith("API_KEY#"))
      .map((e) => ({ apiKeyId: e.apiKeyId, name: e.name, revokedAt: e.revokedAt ?? null, createdAt: e.createdAt }));

    return new Response(JSON.stringify({ keys }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  // Revoke an API key (soft delete)
  router.delete("/workspace/api-keys/:apiKeyId", async (request: any, env: Env & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved || !hasManageAccess(resolved.auth)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { workspaceId } = resolved;
    const { apiKeyId } = request.params;

    const items = await queryByPk<WorkspaceApiKeyEntity>(env, `WS#${workspaceId}`);
    const existing = items.find((e) => e.entityType === "API_KEY" && e.apiKeyId === apiKeyId);
    if (!existing) {
      return new Response(JSON.stringify({ error: "API key not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const updated: WorkspaceApiKeyEntity = {
      ...existing,
      updatedAt: now,
      revokedAt: now,
    };

    await putEntity(env, updated as TableEntity);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}
