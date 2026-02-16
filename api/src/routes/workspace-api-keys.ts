import type { StorageEnv } from '@/db/storage';
import { put, get, queryByPkAndSkPrefix } from '@/db/storage';
import type { WorkspaceApiKeyEntity, ApiKeyHashIndexEntity } from '@/db/types';
import { resolveWorkspace, requireRole, hashApiKey, generateApiKey, type AuthEnv } from '@/auth';
import type { RouterType } from 'itty-router';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  unauthorizedResponse,
  badRequestResponse,
} from '@/api-responses';
import { notifyApiKeyCreated, notifyApiKeyRevoked } from '@/notifications';

interface CreateWorkspaceApiKeyRequest {
  name?: string;
}

export function workspaceApiKeysRouter(router: RouterType) {
  // Create a new API key for the current workspace
  router.post('/workspace/api-keys', async (request: Request, env: StorageEnv & AuthEnv, ctx: ExecutionContext) => {
    const resolved = await resolveWorkspace(env, request);
    if (!requireRole(resolved, 'owner')) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;

    const body = (await request.json().catch(() => null)) as CreateWorkspaceApiKeyRequest | null;
    const name = body?.name?.trim() || 'Workspace API Key';

    // Generate the API key
    const rawKey = generateApiKey('wsk');
    const keyHash = await hashApiKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    const apiKeyId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create the key entity
    const keyEntity: WorkspaceApiKeyEntity = {
      pk: `WS#${workspaceId}`,
      sk: `API_KEY#${apiKeyId}`,
      entityType: 'API_KEY',
      createdAt: now,
      updatedAt: now,
      workspaceId,
      apiKeyId,
      name,
      keyHash,
      keyPrefix,
    };

    // Create the hash index for fast lookup
    const indexEntity: ApiKeyHashIndexEntity = {
      pk: 'KEY_HASH_IDX',
      sk: `HASH#${keyHash}`,
      entityType: 'API_KEY',
      createdAt: now,
      updatedAt: now,
      keyType: 'workspace',
      workspaceId,
      keyId: apiKeyId,
    };

    await Promise.all([put(env, keyEntity), put(env, indexEntity)]);

    ctx.waitUntil(
      notifyApiKeyCreated(env, workspaceId, name, keyPrefix).catch((err) => {
        console.error('[api-keys][notify][error]', err);
      })
    );

    // Return the raw key - this is the ONLY time the full key is shown
    return createdResponse({
      apiKeyId,
      key: rawKey,
      keyPrefix,
      message: 'Store this key securely. It will not be shown again.',
    });
  });

  // List API keys for the current workspace (shows prefix, not full key)
  router.get('/workspace/api-keys', async (request: Request, env: StorageEnv & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request);
    if (!requireRole(resolved, 'admin')) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;

    const result = await queryByPkAndSkPrefix<WorkspaceApiKeyEntity>(env, `WS#${workspaceId}`, 'API_KEY#');
    const keys = result.items
      .filter((e) => e.entityType === 'API_KEY')
      .map((e) => ({
        apiKeyId: e.apiKeyId,
        name: e.name,
        keyPrefix: e.keyPrefix,
        revokedAt: e.revokedAt ?? null,
        createdAt: e.createdAt,
      }));

    return successResponse({ keys });
  });

  // Revoke an API key
  router.delete('/workspace/api-keys/:apiKeyId', async (request: any, env: StorageEnv & AuthEnv, ctx: ExecutionContext) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!requireRole(resolved, 'owner')) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;
    const { apiKeyId } = request.params;

    // Get the existing key
    const existing = await get<WorkspaceApiKeyEntity>(env, `WS#${workspaceId}`, `API_KEY#${apiKeyId}`);
    if (!existing) {
      return notFoundResponse('API key not found');
    }

    if (existing.revokedAt) {
      return badRequestResponse('API key already revoked');
    }

    const now = new Date().toISOString();

    // Update the key entity
    const revokedKey: WorkspaceApiKeyEntity = {
      ...existing,
      updatedAt: now,
      revokedAt: now,
    };

    // Update the hash index to mark as revoked
    const indexEntity = await get<ApiKeyHashIndexEntity>(env, 'KEY_HASH_IDX', `HASH#${existing.keyHash}`);

    const promises: Promise<void>[] = [put(env, revokedKey)];
    if (indexEntity) {
      const revokedIndex: ApiKeyHashIndexEntity = {
        ...indexEntity,
        updatedAt: now,
        revokedAt: now,
      };
      promises.push(put(env, revokedIndex));
    }

    await Promise.all(promises);

    ctx.waitUntil(
      notifyApiKeyRevoked(env, workspaceId, existing.name, existing.keyPrefix).catch((err) => {
        console.error('[api-keys][notify][error]', err);
      })
    );

    return successResponse({ ok: true });
  });
}
