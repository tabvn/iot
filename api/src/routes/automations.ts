import type { Env as StorageEnv } from "@/storage";
import type { Env as WorkerEnv } from "../worker";
import type { AutomationEntity, TableEntity, AutomationTriggerConfig, AutomationActionConfig } from "@/models";
import { putEntity, getEntity, queryByPk, deleteEntity } from "@/storage";
import { resolveWorkspace, hasManageAccess, type AuthEnv } from "@/auth";
import { validateCreateAutomationBody } from "@/schemas";
import { Router, type RouterType } from "itty-router";

type Env = StorageEnv & Pick<WorkerEnv, "WORKSPACE_AUTOMATION_DO">;

async function invalidateAutomationCache(env: Env, workspaceId: string) {
  const id = env.WORKSPACE_AUTOMATION_DO.idFromName(workspaceId);
  const stub = env.WORKSPACE_AUTOMATION_DO.get(id);
  await stub.fetch("https://automation/invalidate", { method: "POST" }).catch((err) => {
    console.error("[automations][invalidate][error]", err);
  });
}

interface UpdateAutomationBody {
  name?: string;
  description?: string;
  status?: AutomationEntity["status"];
  triggerType?: AutomationEntity["triggerType"];
  triggerConfig?: AutomationTriggerConfig;
  actions?: AutomationActionConfig[];
}

export function automationsRouter(router: RouterType) {
  // Create automation - requires manage access (user or workspace master)
  router.post("/automations", async (request: any, env: Env & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved || !hasManageAccess(resolved.auth)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { workspaceId } = resolved;

    const parsed = await request.json().catch(() => null);
    const validation = validateCreateAutomationBody(parsed);
    if (!validation.ok) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const body = validation.value;

    const now = new Date().toISOString();
    const automationId = crypto.randomUUID();

    const entity: AutomationEntity = {
      pk: `WS#${workspaceId}`,
      sk: `AUTO#${automationId}`,
      entityType: "AUTOMATION",
      createdAt: now,
      updatedAt: now,
      workspaceId,
      automationId,
      name: body.name,
      description: body.description,
      status: "active",
      triggerType: body.triggerType as AutomationEntity["triggerType"],
      triggerConfig: body.triggerConfig as unknown as AutomationTriggerConfig,
      actions: body.actions as unknown as AutomationActionConfig[],
    };

    await putEntity(env, entity as TableEntity);
    await invalidateAutomationCache(env, workspaceId);

    return new Response(JSON.stringify({ automationId }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  });

  // List automations - any authenticated workspace context may read
  router.get("/automations", async (request: any, env: Env & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { workspaceId } = resolved;
    const items = await queryByPk<AutomationEntity>(env, `WS#${workspaceId}`);
    const automations = items.filter((e) => e.entityType === "AUTOMATION");

    return new Response(JSON.stringify({ automations }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  // Get automation - any authenticated workspace context may read
  router.get("/automations/:automationId", async (request: any, env: Env & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { workspaceId } = resolved;
    const { automationId } = request.params;
    const entity = await getEntity<AutomationEntity>(env, `WS#${workspaceId}`, `AUTO#${automationId}`);
    if (!entity) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(entity), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  // Update automation - requires manage access
  router.put("/automations/:automationId", async (request: any, env: Env & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved || !hasManageAccess(resolved.auth)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { workspaceId } = resolved;
    const { automationId } = request.params;
    const body = (await request.json().catch(() => null)) as UpdateAutomationBody | null;

    const existing = await getEntity<AutomationEntity>(env, `WS#${workspaceId}`, `AUTO#${automationId}`);
    if (!existing) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const updated: AutomationEntity = {
      ...existing,
      name: body?.name ?? existing.name,
      description: body?.description ?? existing.description,
      status: body?.status ?? existing.status,
      triggerType: body?.triggerType ?? existing.triggerType,
      triggerConfig: body?.triggerConfig ?? existing.triggerConfig,
      actions: body?.actions ?? existing.actions,
      updatedAt: now,
    };

    await putEntity(env, updated as TableEntity);
    await invalidateAutomationCache(env, workspaceId);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  // Delete automation - requires manage access
  router.delete("/automations/:automationId", async (request: any, env: Env & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved || !hasManageAccess(resolved.auth)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { workspaceId } = resolved;
    const { automationId } = request.params;

    await deleteEntity(env, `WS#${workspaceId}`, `AUTO#${automationId}`);
    await invalidateAutomationCache(env, workspaceId);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}
