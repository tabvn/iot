import { createRepositories } from '@/db';
import type { StorageEnv } from '@/db/storage';
import { put, get } from '@/db/storage';
import type { DeviceApiKeyEntity, ApiKeyHashIndexEntity } from '@/db/types';
import { resolveWorkspace, requireRole, hashApiKey, generateApiKey, type AuthEnv } from '@/auth';
import type { RouterType } from 'itty-router';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  unauthorizedResponse,
} from '@/api-responses';

interface CreateDeviceApiKeyRequest {
  name?: string;
}

export function deviceApiKeysRouter(router: RouterType) {
  // Create or regenerate a device API key (one key per device)
  router.post('/devices/:deviceId/api-key', async (request: any, env: StorageEnv & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!requireRole(resolved, 'editor')) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;
    const { deviceId } = request.params;

    // Verify device exists in this workspace
    const db = createRepositories(env);
    const device = await db.devices.getById(workspaceId, deviceId);

    if (!device) {
      return notFoundResponse('Device not found');
    }

    const body = (await request.json().catch(() => null)) as CreateDeviceApiKeyRequest | null;
    const name = body?.name?.trim() || `Device API Key - ${device.name}`;

    // Check if there's an existing key and revoke it
    const existing = await get<DeviceApiKeyEntity>(env, `WS#${workspaceId}`, `DEV_KEY#${deviceId}`);
    if (existing && !existing.revokedAt) {
      const now = new Date().toISOString();

      // Revoke the existing key
      const revoked: DeviceApiKeyEntity = {
        ...existing,
        updatedAt: now,
        revokedAt: now,
      };
      await put(env, revoked);

      // Revoke the hash index
      const oldIndex = await get<ApiKeyHashIndexEntity>(env, 'KEY_HASH_IDX', `HASH#${existing.keyHash}`);
      if (oldIndex) {
        const revokedIndex: ApiKeyHashIndexEntity = {
          ...oldIndex,
          updatedAt: now,
          revokedAt: now,
        };
        await put(env, revokedIndex);
      }
    }

    // Generate new key
    const rawKey = generateApiKey('dsk');
    const keyHash = await hashApiKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    const deviceApiKeyId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create new key entity
    const keyEntity: DeviceApiKeyEntity = {
      pk: `WS#${workspaceId}`,
      sk: `DEV_KEY#${deviceId}`,
      entityType: 'DEVICE_API_KEY',
      createdAt: now,
      updatedAt: now,
      workspaceId,
      deviceId,
      deviceApiKeyId,
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
      keyType: 'device',
      workspaceId,
      deviceId,
      keyId: deviceApiKeyId,
    };

    await Promise.all([put(env, keyEntity), put(env, indexEntity)]);

    return createdResponse({
      deviceApiKeyId,
      deviceId,
      key: rawKey,
      keyPrefix,
      message: 'Store this key securely. It will not be shown again.',
    });
  });

  // Get device API key info (not the full key)
  router.get('/devices/:deviceId/api-key', async (request: any, env: StorageEnv & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!requireRole(resolved, 'editor')) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;
    const { deviceId } = request.params;

    const entity = await get<DeviceApiKeyEntity>(env, `WS#${workspaceId}`, `DEV_KEY#${deviceId}`);
    if (!entity || entity.revokedAt) {
      return successResponse({ hasKey: false });
    }

    return successResponse({
      hasKey: true,
      deviceApiKeyId: entity.deviceApiKeyId,
      name: entity.name,
      keyPrefix: entity.keyPrefix,
      createdAt: entity.createdAt,
    });
  });

  // Revoke device API key
  router.delete('/devices/:deviceId/api-key', async (request: any, env: StorageEnv & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!requireRole(resolved, 'editor')) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;
    const { deviceId } = request.params;

    const existing = await get<DeviceApiKeyEntity>(env, `WS#${workspaceId}`, `DEV_KEY#${deviceId}`);
    if (!existing || existing.revokedAt) {
      return notFoundResponse('No active API key found for this device');
    }

    const now = new Date().toISOString();

    // Revoke the key
    const revoked: DeviceApiKeyEntity = {
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
}
