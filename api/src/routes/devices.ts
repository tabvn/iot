import type { Env } from "@/storage";
import type { TableEntity, DeviceEntity } from "@/models";
import { putEntity, queryByPk, getEntity } from "@/storage";
import { resolveWorkspace, type AuthEnv, hasManageAccess } from "@/auth";
import { validateCreateDeviceBody } from "@/schemas";
import { Router, type RouterType } from "itty-router";

export function devicesRouter(router: RouterType) {
  // Create device within workspace - requires manage access (user or workspace master)
  router.post("/devices", async (request: Request, env: AuthEnv) => {
    const resolved = await resolveWorkspace(env, request);
    if (!resolved || !hasManageAccess(resolved.auth)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { workspaceId } = resolved;

    const parsed = await request.json().catch(() => null);
    const validation = validateCreateDeviceBody(parsed);
    if (!validation.ok) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const body = validation.value;

    const deviceId = crypto.randomUUID();
    const now = new Date().toISOString();

    const entity: DeviceEntity = {
      pk: `WS#${workspaceId}`,
      sk: `DEV#${deviceId}`,
      entityType: "DEVICE",
      createdAt: now,
      updatedAt: now,
      deviceId,
      workspaceId,
      name: body.name,
      type: body.type,
      status: "offline",
      ...(body.description && { description: body.description }),
      ...(body.manufacturer && { manufacturer: body.manufacturer }),
      ...(body.model && { model: body.model }),
      ...(body.firmwareVersion && { firmwareVersion: body.firmwareVersion }),
      ...(body.location && { location: body.location }),
      ...(body.tags && { tags: body.tags }),
      ...(body.metadata && { metadata: body.metadata }),
      ...(body.fieldMappings && { fieldMappings: body.fieldMappings }),
    };

    await putEntity(env as Env, entity as TableEntity);

    return new Response(JSON.stringify({ deviceId, name: entity.name, type: entity.type }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  });

  // List devices in workspace - requires manage access
  router.get("/devices", async (request: Request, env: AuthEnv) => {
    const resolved = await resolveWorkspace(env, request);
    if (!resolved || !hasManageAccess(resolved.auth)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { workspaceId } = resolved;

    const items = await queryByPk<DeviceEntity>(env as Env, `WS#${workspaceId}`);
    const devices = items
      .filter((e: DeviceEntity) => e.entityType === "DEVICE")
      .map((e: DeviceEntity) => ({
        deviceId: e.deviceId,
        name: e.name,
        type: e.type,
        createdAt: e.createdAt,
        status: e.status,
        lastSeenAt: e.lastSeenAt,
      }));

    return new Response(JSON.stringify({ devices }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  // Update device
  router.put("/devices/:deviceId", async (request: any, env: AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved || !hasManageAccess(resolved.auth)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { workspaceId } = resolved;
    const { deviceId } = request.params;

    const entity = await getEntity<DeviceEntity>(env as Env, `WS#${workspaceId}`, `DEV#${deviceId}`);
    if (!entity) {
      return new Response(JSON.stringify({ error: "Device not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await (request as Request).json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Body must be an object" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const updates = body as Record<string, unknown>;
    const now = new Date().toISOString();

    const updated = { ...entity, updatedAt: now };
    if (typeof updates.name === "string" && updates.name.trim()) updated.name = updates.name.trim();
    if (typeof updates.type === "string" && updates.type.trim()) updated.type = updates.type.trim();
    if (typeof updates.description === "string") updated.description = updates.description.trim();
    if (typeof updates.manufacturer === "string") updated.manufacturer = updates.manufacturer.trim();
    if (typeof updates.model === "string") updated.model = updates.model.trim();
    if (typeof updates.firmwareVersion === "string") updated.firmwareVersion = updates.firmwareVersion.trim();
    if (typeof updates.location === "string") updated.location = updates.location.trim();
    if (Array.isArray(updates.tags)) updated.tags = updates.tags.filter((t): t is string => typeof t === "string");
    if (updates.metadata && typeof updates.metadata === "object" && !Array.isArray(updates.metadata)) {
      updated.metadata = updates.metadata as Record<string, unknown>;
    }
    if (Array.isArray(updates.fieldMappings)) {
      const validTypes = new Set(["number", "string", "boolean", "json"]);
      updated.fieldMappings = updates.fieldMappings
        .filter((fm: any) => fm && typeof fm.sourceField === "string" && typeof fm.displayLabel === "string" && validTypes.has(fm.dataType))
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
        }));
    }

    await putEntity(env as Env, updated as TableEntity);

    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  // Get a single device - device tokens can read themselves; user/workspace_master can read any device in workspace
  router.get("/devices/:deviceId", async (request: any, env: AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { workspaceId, auth } = resolved;
    const { deviceId } = request.params;

    const entity = await getEntity<DeviceEntity>(env as Env, `WS#${workspaceId}`, `DEV#${deviceId}`);
    if (!entity) {
      return new Response(JSON.stringify({ error: "Device not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Device token can only access its own record
    if (auth.type === "device" && auth.deviceId && auth.deviceId !== entity.deviceId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(entity), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}
