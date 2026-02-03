import type { Env } from "@/storage";
import type { TableEntity, WorkspacePlan, WorkspaceMemberEntity, WorkspaceBillingEntity, MemberRole, DevicePermission } from "@/models";
import { putEntity, queryByPk, deleteEntity } from "@/storage";
import { resolveWorkspace, type AuthEnv, hasManageAccess } from "@/auth";
import { Router, type RouterType } from "itty-router";

interface WorkspaceMemberPayload {
  userId: string;
  role: MemberRole;
  devicePermissions?: Record<string, DevicePermission[]>;
}

function validateWorkspaceMemberPayload(body: unknown): { ok: true; value: WorkspaceMemberPayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Body must be an object" };
  const b = body as Partial<WorkspaceMemberPayload>;
  if (!b.userId || typeof b.userId !== "string" || !b.userId.trim()) {
    return { ok: false, error: "userId is required" };
  }
  if (!b.role) {
    return { ok: false, error: "role is required" };
  }
  return {
    ok: true,
    value: {
      userId: b.userId.trim(),
      role: b.role as MemberRole,
      devicePermissions: b.devicePermissions ?? {},
    },
  };
}

export function membersPlanBillingRouter(router: RouterType) {
  // Add workspace member (manage access required)
  router.post("/members", async (request: any, env: AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved || !hasManageAccess(resolved.auth)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { workspaceId } = resolved;

    const parsed = await request.json().catch(() => null);
    const validation = validateWorkspaceMemberPayload(parsed);
    if (!validation.ok) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const body = validation.value;

    const now = new Date().toISOString();
    const entity: WorkspaceMemberEntity = {
      pk: `WS#${workspaceId}`,
      sk: `MEMBER#${body.userId}`,
      entityType: "WORKSPACE",
      createdAt: now,
      updatedAt: now,
      workspaceId,
      userId: body.userId,
      role: body.role,
      devicePermissions: body.devicePermissions ?? {},
    };
    await putEntity(env, entity as TableEntity);
    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  });

  // Update member (manage access required)
  router.put("/members/:userId", async (request: any, env: AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved || !hasManageAccess(resolved.auth)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { workspaceId } = resolved;
    const { userId } = request.params;

    const body = (await request.json().catch(() => null)) as Partial<WorkspaceMemberPayload> | null;
    if (!body) {
      return new Response(JSON.stringify({ error: "empty payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const items = await queryByPk<WorkspaceMemberEntity>(env, `WS#${workspaceId}`);
    const existing = items.find((e) => e.sk === `MEMBER#${userId}`);
    if (!existing) {
      return new Response(JSON.stringify({ error: "Member not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const now = new Date().toISOString();
    const updated: WorkspaceMemberEntity = {
      ...existing,
      updatedAt: now,
      role: (body.role as MemberRole | undefined) ?? existing.role,
      devicePermissions: body.devicePermissions ?? existing.devicePermissions ?? {},
    };
    await putEntity(env, updated as TableEntity);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  // Remove member (manage access required)
  router.delete("/members/:userId", async (request: any, env: AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved || !hasManageAccess(resolved.auth)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { workspaceId } = resolved;
    const { userId } = request.params;
    await deleteEntity(env, `WS#${workspaceId}`, `MEMBER#${userId}`);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  // List members (any authenticated workspace context)
  router.get("/members", async (request: any, env: AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { workspaceId } = resolved;
    const items = await queryByPk<WorkspaceMemberEntity>(env, `WS#${workspaceId}`);
    const members = items
      .filter((e) => e.sk?.startsWith("MEMBER#"))
      .map((e) => ({
        userId: e.userId,
        role: e.role,
        devicePermissions: e.devicePermissions ?? {},
      }));
    return new Response(JSON.stringify({ members }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  // Update workspace plan (manage access required)
  router.put("/plan", async (request: any, env: AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved || !hasManageAccess(resolved.auth)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { workspaceId } = resolved;

    const body = (await request.json().catch(() => null)) as { plan: WorkspacePlan } | null;
    if (!body?.plan) {
      return new Response(JSON.stringify({ error: "plan is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const now = new Date().toISOString();
    const entity = {
      pk: `WS#${workspaceId}`,
      sk: "PLAN#current",
      entityType: "WORKSPACE" as const,
      createdAt: now,
      updatedAt: now,
      workspaceId,
      plan: body.plan,
    };
    await putEntity(env, entity as TableEntity);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  // Get workspace plan (any authenticated workspace context)
  router.get("/plan", async (request: any, env: AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { workspaceId } = resolved;
    const items = await queryByPk(env, `WS#${workspaceId}`);
    const plan = ((items.find((e) => e.sk === "PLAN#current") as { plan?: WorkspacePlan } | undefined)?.plan) || "starter";
    return new Response(JSON.stringify({ plan }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  // Billing history (any authenticated workspace context)
  router.get("/billing", async (request: any, env: AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { workspaceId } = resolved;
    const items = await queryByPk(env, `WS#${workspaceId}`);
    const invoices = items
      .filter((e): e is WorkspaceBillingEntity => e.sk?.startsWith("BILL#") === true)
      .map((e) => ({ invoiceId: e.invoiceId, amount: e.amount, status: e.status, period: e.period }));
    return new Response(JSON.stringify({ invoices }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}
