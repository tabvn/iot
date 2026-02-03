import type { Env } from "@/storage";
import { queryByPk } from "@/storage";

export type AuthType = "user" | "api" | "device" | "workspace_master" | "super_master";

export interface AuthContext {
  type: AuthType;
  userId?: string;
  workspaceId?: string;
  deviceId?: string;
}

interface JwtHeader {
  alg: string;
  typ: string;
}

interface JwtPayload {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number; // seconds since epoch
  nbf?: number; // seconds since epoch
  iat?: number; // seconds since epoch
  scope?: string;
  type?: string;
  workspaceId?: string;
  deviceId?: string;
}

export interface AuthEnv extends Env {
  USER_JWT_SECRET?: string;
  API_JWT_SECRET?: string;
  DEVICE_JWT_SECRET?: string;
  WORKSPACE_MASTER_JWT_SECRET?: string;
  SUPER_MASTER_JWT_SECRET?: string;
}

function base64UrlDecode(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function verifyHmacSha256(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  const headerJson = new TextDecoder().decode(base64UrlDecode(headerB64));
  const header = JSON.parse(headerJson) as JwtHeader;
  if (header.alg !== "HS256") return null;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecode(signatureB64);

  const valid = await crypto.subtle.verify("HMAC", key, signature, data);
  if (!valid) return null;

  const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
  const payload = JSON.parse(payloadJson) as JwtPayload;
  return payload;
}

function isExpired(payload: JwtPayload): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp !== undefined && nowSeconds > payload.exp) return true;
  if (payload.nbf !== undefined && nowSeconds < payload.nbf) return true;
  return false;
}

export async function verifyJwt(env: AuthEnv, token: string): Promise<AuthContext | null> {
  const userSecret = env.USER_JWT_SECRET;
  const apiSecret = env.API_JWT_SECRET;
  const deviceSecret = env.DEVICE_JWT_SECRET;
  const masterSecret = env.WORKSPACE_MASTER_JWT_SECRET;
  const superSecret = env.SUPER_MASTER_JWT_SECRET;

  // Try user token first
  if (userSecret) {
    const payload = await verifyHmacSha256(token, userSecret).catch(() => null);
    if (payload && !isExpired(payload) && (payload.type === "user" || !payload.type)) {
      const userId = payload.sub;
      if (!userId) return null;
      return { type: "user", userId };
    }
  }

  // API key token (workspace-level)
  if (apiSecret) {
    const payload = await verifyHmacSha256(token, apiSecret).catch(() => null);
    if (payload && !isExpired(payload) && payload.type === "api") {
      const workspaceId = payload.workspaceId || payload.sub;
      if (!workspaceId) return null;
      return { type: "api", workspaceId };
    }
  }

  // Device token (device + workspace)
  if (deviceSecret) {
    const payload = await verifyHmacSha256(token, deviceSecret).catch(() => null);
    if (payload && !isExpired(payload) && payload.type === "device") {
      const deviceId = payload.sub || payload.deviceId;
      const workspaceId = payload.workspaceId;
      if (!deviceId || !workspaceId) return null;
      return { type: "device", deviceId, workspaceId };
    }
  }

  // Workspace master token (full workspace access, like a user but without userId)
  if (masterSecret) {
    const payload = await verifyHmacSha256(token, masterSecret).catch(() => null);
    if (payload && !isExpired(payload) && payload.type === "workspace_master") {
      const workspaceId = payload.workspaceId || payload.sub;
      if (!workspaceId) return null;
      return { type: "workspace_master", workspaceId };
    }
  }

  // Super master token (root key, can manage everything across workspaces)
  if (superSecret) {
    const payload = await verifyHmacSha256(token, superSecret).catch(() => null);
    if (payload && !isExpired(payload) && payload.type === "super_master") {
      // super master is not bound to a specific workspaceId
      return { type: "super_master" };
    }
  }

  return null;
}

export function getAuthFromRequest(env: AuthEnv, request: Request): Promise<AuthContext | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return Promise.resolve(null);
  const token = authHeader.slice("Bearer ".length).trim();
  return verifyJwt(env, token);
}

// Whether this auth context has full management access (user, workspace master, or super master)
export function hasManageAccess(auth: AuthContext): boolean {
  return auth.type === "user" || auth.type === "workspace_master" || auth.type === "super_master";
}

// Resolve workspace alias from x-workspace-alias header
async function resolveWorkspaceIdFromAlias(env: Env, request: Request): Promise<string | null> {
  const aliasHeader = request.headers.get("x-workspace-alias");
  if (!aliasHeader) return null;
  const alias = aliasHeader.toLowerCase();
  const items = await queryByPk(env, `WS_ALIAS#${alias}`);
  const record = items[0] as { workspaceId?: string } | undefined;
  return record?.workspaceId ?? null;
}

// Unified workspace resolution for all routes that need workspace context.
// - API key token: workspaceId from token
// - Device token: workspaceId from token
// - Workspace master token: workspaceId from token
// - Super master token: workspaceId from x-workspace-alias header (required)
// - User token: workspaceId from x-workspace-alias header + membership check
export async function resolveWorkspace(
  env: AuthEnv,
  request: Request
): Promise<{ workspaceId: string; auth: AuthContext } | null> {
  const auth = await getAuthFromRequest(env, request);
  if (!auth) return null;

  // API key, device, and workspace master tokens carry workspaceId directly
  if ((auth.type === "api" || auth.type === "device" || auth.type === "workspace_master") && auth.workspaceId) {
    return { workspaceId: auth.workspaceId, auth };
  }

  // Super master: resolve workspace from x-workspace-alias, no membership check
  if (auth.type === "super_master") {
    const workspaceId = await resolveWorkspaceIdFromAlias(env, request);
    if (!workspaceId) return null;
    return { workspaceId, auth };
  }

  // User token: resolve workspace from x-workspace-alias header
  if (auth.type === "user" && auth.userId) {
    const workspaceId = await resolveWorkspaceIdFromAlias(env, request);
    if (!workspaceId) return null;

    // Verify user is a member of this workspace
    const items = await queryByPk(env, `WS#${workspaceId}`);
    const member = items.find((e) => e.sk === `MEMBER#${auth.userId}`);
    if (!member) return null;

    return { workspaceId, auth };
  }

  return null;
}
