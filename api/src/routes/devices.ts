import { createRepositories } from '@/db';
import type { StorageEnv } from '@/db/storage';
import { resolveWorkspace, type AuthEnv, requireRole } from '@/auth';
import { validateCreateDeviceBody } from '@/schemas';
import type { RouterType } from 'itty-router';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  badRequestResponse,
  toApiDevice,
} from '@/api-responses';
import { notifyDeviceCreated, notifyDeviceUpdated, notifyDeviceDeleted } from '@/notifications';

interface DevicesEnv extends AuthEnv, StorageEnv {
  DEVICE_DO: DurableObjectNamespace;
}

export function devicesRouter(router: RouterType) {
  // Create device within workspace - requires manage access
  router.post('/devices', async (request: Request, env: AuthEnv & StorageEnv, ctx: ExecutionContext) => {
    const resolved = await resolveWorkspace(env, request);
    if (!requireRole(resolved, 'editor')) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;

    const parsed = await request.json().catch(() => null);
    const validation = validateCreateDeviceBody(parsed);
    if (!validation.ok) {
      return badRequestResponse(validation.error);
    }
    const body = validation.value;

    const db = createRepositories(env);
    const device = await db.devices.create({
      workspaceId,
      name: body.name,
      type: body.type,
      description: body.description,
      manufacturer: body.manufacturer,
      model: body.model,
      firmwareVersion: body.firmwareVersion,
      location: body.location,
      tags: body.tags,
      metadata: body.metadata,
      fieldMappings: body.fieldMappings,
    });

    ctx.waitUntil(
      notifyDeviceCreated(env, workspaceId, device.deviceId, body.name).catch((err) => {
        console.error('[devices][notify][error]', err);
      })
    );

    return createdResponse(toApiDevice(device));
  });

  // List devices in workspace
  router.get('/devices', async (request: Request, env: AuthEnv & StorageEnv) => {
    const resolved = await resolveWorkspace(env, request);
    if (!resolved) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;
    const db = createRepositories(env);
    const result = await db.devices.getAllByWorkspace(workspaceId);

    return successResponse({
      devices: result.items.map(toApiDevice),
    });
  });

  // Update device
  router.put('/devices/:deviceId', async (request: any, env: AuthEnv & StorageEnv, ctx: ExecutionContext) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!requireRole(resolved, 'editor')) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;
    const { deviceId } = request.params;

    const db = createRepositories(env);
    const existing = await db.devices.getById(workspaceId, deviceId);

    if (!existing) {
      return notFoundResponse('Device not found');
    }

    const body = await (request as Request).json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return badRequestResponse('Body must be an object');
    }

    const updates = body as Record<string, unknown>;
    const updatePayload: Record<string, any> = {};

    if (typeof updates.name === 'string' && updates.name.trim()) {
      updatePayload.name = updates.name.trim();
    }
    if (typeof updates.type === 'string' && updates.type.trim()) {
      updatePayload.type = updates.type.trim();
    }
    if (typeof updates.description === 'string') {
      updatePayload.description = updates.description.trim();
    }
    if (typeof updates.manufacturer === 'string') {
      updatePayload.manufacturer = updates.manufacturer.trim();
    }
    if (typeof updates.model === 'string') {
      updatePayload.model = updates.model.trim();
    }
    if (typeof updates.firmwareVersion === 'string') {
      updatePayload.firmwareVersion = updates.firmwareVersion.trim();
    }
    if (typeof updates.location === 'string') {
      updatePayload.location = updates.location.trim();
    }
    if (Array.isArray(updates.tags)) {
      updatePayload.tags = updates.tags.filter((t): t is string => typeof t === 'string');
    }
    if (updates.metadata && typeof updates.metadata === 'object' && !Array.isArray(updates.metadata)) {
      updatePayload.metadata = updates.metadata as Record<string, unknown>;
    }
    if (Array.isArray(updates.fieldMappings)) {
      const validTypes = new Set(['number', 'string', 'boolean', 'json']);
      updatePayload.fieldMappings = updates.fieldMappings
        .filter(
          (fm: any) =>
            fm &&
            typeof fm.sourceField === 'string' &&
            typeof fm.displayLabel === 'string' &&
            validTypes.has(fm.dataType)
        )
        .map((fm: any) => ({
          sourceField: fm.sourceField,
          displayLabel: fm.displayLabel,
          dataType: fm.dataType,
          unit: fm.unit,
          min: fm.min,
          max: fm.max,
          precision: fm.precision,
          icon: fm.icon,
          color: fm.color,
          controllable: fm.controllable === true ? true : undefined,
          defaultValue: fm.defaultValue,
        }));
    }

    const updated = await db.devices.update(workspaceId, deviceId, updatePayload);

    if (!updated) {
      return notFoundResponse('Device not found');
    }

    ctx.waitUntil(
      notifyDeviceUpdated(env, workspaceId, deviceId, updated.name).catch((err) => {
        console.error('[devices][notify][error]', err);
      })
    );

    return successResponse(toApiDevice(updated));
  });

  // Get a single device
  router.get('/devices/:deviceId', async (request: any, env: AuthEnv & StorageEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved) {
      return unauthorizedResponse();
    }
    const { workspaceId, auth } = resolved;
    const { deviceId } = request.params;

    const db = createRepositories(env);
    const device = await db.devices.getById(workspaceId, deviceId);

    if (!device) {
      return notFoundResponse('Device not found');
    }

    // Device token can only access its own record
    if (auth.type === 'device' && auth.deviceId && auth.deviceId !== device.deviceId) {
      return forbiddenResponse();
    }

    return successResponse(toApiDevice(device));
  });

  // Delete device
  router.delete('/devices/:deviceId', async (request: any, env: AuthEnv & StorageEnv, ctx: ExecutionContext) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!requireRole(resolved, 'admin')) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;
    const { deviceId } = request.params;

    const db = createRepositories(env);
    const existing = await db.devices.getById(workspaceId, deviceId);

    if (!existing) {
      return notFoundResponse('Device not found');
    }

    await db.devices.delete(workspaceId, deviceId);

    ctx.waitUntil(
      notifyDeviceDeleted(env, workspaceId, deviceId, existing.name).catch((err) => {
        console.error('[devices][notify][error]', err);
      })
    );

    return successResponse({ ok: true });
  });

  // Send control command to a device field
  router.post('/devices/:deviceId/control', async (request: any, env: DevicesEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!requireRole(resolved, 'editor')) {
      return unauthorizedResponse();
    }
    const { workspaceId, auth } = resolved;
    const { deviceId } = request.params;

    // Device tokens can only control themselves
    if (auth.type === 'device' && auth.deviceId !== deviceId) {
      return forbiddenResponse('Device token does not match deviceId');
    }

    const body = await (request as Request).json().catch(() => null) as { field?: string; value?: unknown } | null;
    if (!body || typeof body.field !== 'string') {
      return badRequestResponse('Missing field name');
    }

    const db = createRepositories(env);
    const device = await db.devices.getById(workspaceId, deviceId);
    if (!device) {
      return notFoundResponse('Device not found');
    }

    // Validate the field is controllable
    const mapping = device.fieldMappings?.find((fm) => fm.sourceField === body.field);
    if (!mapping?.controllable) {
      return forbiddenResponse('Field is not controllable');
    }

    // Forward to Device DO /control endpoint
    const doName = `${workspaceId}:${deviceId}`;
    const id = env.DEVICE_DO.idFromName(doName);
    const stub = env.DEVICE_DO.get(id);
    return stub.fetch('https://device/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'set_field', field: body.field, value: body.value }),
    });
  });
}
