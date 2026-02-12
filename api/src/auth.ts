import type { StorageEnv } from '@/db/storage';
import { get } from '@/db/storage';
import type { ApiKeyHashIndexEntity, WorkspaceEntity, MemberRole } from '@/db/types';
import { Keys } from '@/db/types';
import { createRepositories } from '@/db';

export type AuthType = 'user' | 'api' | 'device' | 'workspace_master' | 'super_master';

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

export interface AuthEnv extends StorageEnv {
  USER_JWT_SECRET?: string;
}

function base64UrlDecode(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function verifyHmacSha256(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  const headerJson = new TextDecoder().decode(base64UrlDecode(headerB64));
  const header = JSON.parse(headerJson) as JwtHeader;
  if (header.alg !== 'HS256') return null;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecode(signatureB64);

  const valid = await crypto.subtle.verify('HMAC', key, signature, data);
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

// Hash an API key using SHA-256
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Generate a random API key with prefix
export function generateApiKey(prefix: string): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const randomPart = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}_${randomPart}`;
}

// Validate an API key against the hash index - single direct lookup
async function validateApiKey(env: AuthEnv, key: string): Promise<AuthContext | null> {
  const keyHash = await hashApiKey(key);

  // Direct key lookup - O(1) operation
  const indexEntity = await get<ApiKeyHashIndexEntity>(env, 'KEY_HASH_IDX', `HASH#${keyHash}`);

  if (!indexEntity || indexEntity.revokedAt) {
    return null;
  }

  // Return appropriate auth context based on key type
  switch (indexEntity.keyType) {
    case 'workspace':
      return { type: 'api', workspaceId: indexEntity.workspaceId };
    case 'device':
      return { type: 'device', workspaceId: indexEntity.workspaceId, deviceId: indexEntity.deviceId };
    case 'super_master':
      return { type: 'super_master' };
    default:
      return null;
  }
}

// Verify JWT for user authentication only
async function verifyUserJwt(env: AuthEnv, token: string): Promise<AuthContext | null> {
  const userSecret = env.USER_JWT_SECRET;
  if (!userSecret) return null;

  const payload = await verifyHmacSha256(token, userSecret).catch(() => null);
  if (payload && !isExpired(payload) && (payload.type === 'user' || !payload.type)) {
    const userId = payload.sub;
    if (!userId) return null;
    return { type: 'user', userId };
  }

  return null;
}

export async function getAuthFromRequest(env: AuthEnv, request: Request): Promise<AuthContext | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;

  // Check for Bearer token
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();

    // Check if it's an API key (has specific prefix) - fast string check first
    if (token.length > 4) {
      const prefix = token.slice(0, 4);
      if (prefix === 'wsk_' || prefix === 'dsk_' || prefix === 'smk_') {
        return validateApiKey(env, token);
      }
    }

    // Otherwise try JWT (for user auth) - check for dots
    if (token.indexOf('.') !== -1) {
      return verifyUserJwt(env, token);
    }
  }

  // Check for X-API-Key header as alternative
  const apiKeyHeader = request.headers.get('X-API-Key');
  if (apiKeyHeader) {
    return validateApiKey(env, apiKeyHeader);
  }

  return null;
}

// Whether this auth context has full management access (user, workspace master, or super master)
export function hasManageAccess(auth: AuthContext): boolean {
  return auth.type === 'user' || auth.type === 'workspace_master' || auth.type === 'super_master';
}

// Role hierarchy: owner > admin > editor > viewer
const ROLE_LEVELS: Record<MemberRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

export function hasHigherOrEqualRole(role: MemberRole, minRole: MemberRole): boolean {
  return ROLE_LEVELS[role] >= ROLE_LEVELS[minRole];
}

/**
 * Check if a resolved workspace context meets a minimum role requirement.
 * API/device/super_master tokens bypass role checks (they have implicit full access).
 * Acts as a type guard: narrows `resolved` from `T | null` to `T`.
 */
export function requireRole(
  resolved: ResolvedWorkspace | null,
  minRole: MemberRole
): resolved is ResolvedWorkspace {
  if (!resolved) return false;
  // Non-user auth types bypass role checks
  if (resolved.auth.type !== 'user') return hasManageAccess(resolved.auth);
  if (!resolved.role) return false;
  return hasHigherOrEqualRole(resolved.role, minRole);
}

// Resolve workspace alias from x-workspace-alias header - direct key lookup
async function resolveWorkspaceIdFromAlias(env: StorageEnv, alias: string): Promise<string | null> {
  const { pk, sk } = Keys.workspaceAlias(alias);
  const record = await get<WorkspaceEntity>(env, pk, sk);
  return record?.workspaceId ?? null;
}

export interface ResolvedWorkspace {
  workspaceId: string;
  auth: AuthContext;
  role?: MemberRole;
}

// Unified workspace resolution for all routes that need workspace context.
// Optimized for fast path: API key/device tokens already have workspaceId
export async function resolveWorkspace(
  env: AuthEnv,
  request: Request
): Promise<ResolvedWorkspace | null> {
  const auth = await getAuthFromRequest(env, request);
  if (!auth) return null;

  // Fast path: API key and device tokens carry workspaceId directly from validation
  if ((auth.type === 'api' || auth.type === 'device') && auth.workspaceId) {
    return { workspaceId: auth.workspaceId, auth };
  }

  // Get workspace alias header once
  const aliasHeader = request.headers.get('x-workspace-alias');
  if (!aliasHeader) return null;

  const alias = aliasHeader.toLowerCase();

  // Super master: resolve workspace from alias, no membership check needed
  if (auth.type === 'super_master') {
    const workspaceId = await resolveWorkspaceIdFromAlias(env, alias);
    if (!workspaceId) return null;
    return { workspaceId, auth };
  }

  // User token: resolve workspace, verify membership, and get role
  if (auth.type === 'user' && auth.userId) {
    const workspaceId = await resolveWorkspaceIdFromAlias(env, alias);
    if (!workspaceId) return null;

    // Direct key lookup for membership + role - O(1) operation
    const db = createRepositories(env);
    const member = await db.members.get(workspaceId, auth.userId);
    if (!member) return null;

    return { workspaceId, auth, role: member.role };
  }

  return null;
}
