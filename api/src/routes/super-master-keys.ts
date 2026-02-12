import type { StorageEnv } from '@/db/storage';
import { put, get, queryByPk } from '@/db/storage';
import type { SuperMasterKeyEntity, ApiKeyHashIndexEntity } from '@/db/types';
import { getAuthFromRequest, hashApiKey, generateApiKey, type AuthEnv } from '@/auth';
import type { RouterType } from 'itty-router';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  unauthorizedResponse,
  badRequestResponse,
} from '@/api-responses';

interface CreateSuperMasterKeyRequest {
  name?: string;
}

export function superMasterKeysRouter(router: RouterType) {
  // Create a new super master key - only existing super master can create new ones
  router.post('/admin/super-master-keys', async (request: Request, env: StorageEnv & AuthEnv) => {
    const auth = await getAuthFromRequest(env, request);
    if (!auth || auth.type !== 'super_master') {
      return unauthorizedResponse('Super Master access required');
    }

    const body = (await request.json().catch(() => null)) as CreateSuperMasterKeyRequest | null;
    const name = body?.name?.trim() || 'Super Master Key';

    // Generate the key
    const rawKey = generateApiKey('smk');
    const keyHash = await hashApiKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    const keyId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create key entity
    const keyEntity: SuperMasterKeyEntity = {
      pk: 'SUPER_MASTER_KEYS',
      sk: `KEY#${keyId}`,
      entityType: 'SUPER_MASTER_KEY',
      createdAt: now,
      updatedAt: now,
      keyId,
      name,
      keyHash,
      keyPrefix,
    };

    // Create hash index
    const indexEntity: ApiKeyHashIndexEntity = {
      pk: 'KEY_HASH_IDX',
      sk: `HASH#${keyHash}`,
      entityType: 'API_KEY',
      createdAt: now,
      updatedAt: now,
      keyType: 'super_master',
      keyId,
    };

    await Promise.all([put(env, keyEntity), put(env, indexEntity)]);

    return createdResponse({
      keyId,
      key: rawKey,
      keyPrefix,
      name,
      message: 'Store this key securely. It will not be shown again.',
    });
  });

  // List all super master keys (shows prefix, not full key)
  router.get('/admin/super-master-keys', async (request: Request, env: StorageEnv & AuthEnv) => {
    const auth = await getAuthFromRequest(env, request);
    if (!auth || auth.type !== 'super_master') {
      return unauthorizedResponse('Super Master access required');
    }

    const result = await queryByPk<SuperMasterKeyEntity>(env, 'SUPER_MASTER_KEYS');
    const keys = result.items
      .filter((e) => e.entityType === 'SUPER_MASTER_KEY')
      .map((e) => ({
        keyId: e.keyId,
        name: e.name,
        keyPrefix: e.keyPrefix,
        revokedAt: e.revokedAt ?? null,
        createdAt: e.createdAt,
      }));

    return successResponse({ keys });
  });

  // Revoke a super master key
  router.delete('/admin/super-master-keys/:keyId', async (request: any, env: StorageEnv & AuthEnv) => {
    const auth = await getAuthFromRequest(env, request as Request);
    if (!auth || auth.type !== 'super_master') {
      return unauthorizedResponse('Super Master access required');
    }

    const { keyId } = request.params;

    const existing = await get<SuperMasterKeyEntity>(env, 'SUPER_MASTER_KEYS', `KEY#${keyId}`);
    if (!existing) {
      return notFoundResponse('Key not found');
    }

    if (existing.revokedAt) {
      return badRequestResponse('Key already revoked');
    }

    // Check if this is the last active key - prevent revoking it
    const result = await queryByPk<SuperMasterKeyEntity>(env, 'SUPER_MASTER_KEYS');
    const activeKeys = result.items.filter((k) => k.entityType === 'SUPER_MASTER_KEY' && !k.revokedAt);
    if (activeKeys.length <= 1) {
      return badRequestResponse('Cannot revoke the last active super master key');
    }

    const now = new Date().toISOString();

    // Revoke the key
    const revoked: SuperMasterKeyEntity = {
      ...existing,
      updatedAt: now,
      revokedAt: now,
    };

    // Revoke the hash index
    const indexEntity = await get<ApiKeyHashIndexEntity>(env, 'KEY_HASH_IDX', `HASH#${existing.keyHash}`);

    const promises: Promise<void>[] = [put(env, revoked)];
    if (indexEntity) {
      const revokedIndex: ApiKeyHashIndexEntity = {
        ...indexEntity,
        updatedAt: now,
        revokedAt: now,
      };
      promises.push(put(env, revokedIndex));
    }

    await Promise.all(promises);

    return successResponse({ ok: true });
  });

  // Bootstrap route - create the first super master key (only works if no keys exist)
  router.post('/admin/bootstrap-super-master', async (request: Request, env: StorageEnv & AuthEnv) => {
    // Check if any super master keys exist
    const result = await queryByPk<SuperMasterKeyEntity>(env, 'SUPER_MASTER_KEYS');
    const activeKeys = result.items.filter((k) => k.entityType === 'SUPER_MASTER_KEY' && !k.revokedAt);

    if (activeKeys.length > 0) {
      return badRequestResponse('Super master keys already exist. Use authenticated endpoint to create more.');
    }

    const body = (await request.json().catch(() => null)) as CreateSuperMasterKeyRequest | null;
    const name = body?.name?.trim() || 'Initial Super Master Key';

    // Generate the key
    const rawKey = generateApiKey('smk');
    const keyHash = await hashApiKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    const keyId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create key entity
    const keyEntity: SuperMasterKeyEntity = {
      pk: 'SUPER_MASTER_KEYS',
      sk: `KEY#${keyId}`,
      entityType: 'SUPER_MASTER_KEY',
      createdAt: now,
      updatedAt: now,
      keyId,
      name,
      keyHash,
      keyPrefix,
    };

    // Create hash index
    const indexEntity: ApiKeyHashIndexEntity = {
      pk: 'KEY_HASH_IDX',
      sk: `HASH#${keyHash}`,
      entityType: 'API_KEY',
      createdAt: now,
      updatedAt: now,
      keyType: 'super_master',
      keyId,
    };

    await Promise.all([put(env, keyEntity), put(env, indexEntity)]);

    return createdResponse({
      keyId,
      key: rawKey,
      keyPrefix,
      name,
      message: 'Initial super master key created. Store this key securely! It will not be shown again.',
    });
  });
}
