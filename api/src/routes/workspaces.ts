import type { Env } from "@/storage";
import type {TableEntity, WorkspaceEntity, WorkspaceMemberEntity} from "@/models";
import { putEntity, queryByPk, getEntity } from "@/storage";
import { resolveWorkspace, type AuthEnv, getAuthFromRequest } from "@/auth";
import { Router, type RouterType } from "itty-router";

const RESERVED_SLUGS = [
  "home",
  "blog",
  "contact",
  "dashboard",
  "developer",
  "forgot-password",
  "login",
  "pricing",
  "privacy",
  "reset-password",
  "signup",
  "terms",
  "actions",
  "api",
  "types",
  "settings",
  "account",
  "figma",
  "components",
  "lib",
  "styles",
  "utils",
  "users",
  "workspaces",
  "devices",
  "ingest",
  "analytics",
  "me",
  "by-email",
  "by-alias",
  "avatar",
];

export function workspacesRouter(router: RouterType) {
  // Create workspace via WorkspaceDurableObject to enforce unique alias
  router.post("/workspaces", async (request: Request, env: Env & AuthEnv & { WORKSPACE_DO: DurableObjectNamespace }) => {
    const auth = await getAuthFromRequest(env, request);
    if (!auth || (auth.type !== "user" && auth.type !== "super_master")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = (await request.json().catch(() => null)) as
      | { ownerUserId?: string; name?: unknown; slug?: unknown; description?: unknown }
      | null;
    const rawName = typeof body?.name === "string" ? body.name.trim() : "";
    const rawSlug = typeof body?.slug === "string" ? body.slug.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : undefined;

    if (!rawName || !rawSlug) {
      return new Response(JSON.stringify({ error: "ownerUserId, name, slug are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Normalize slug and perform a basic format check (OpenAPI expects a simple slug string)
    const slug = rawSlug.toLowerCase();
    if (RESERVED_SLUGS.includes(slug)) {
      return new Response(JSON.stringify({ error: "This is a reserved name and cannot be used." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const slugRegex = /^[a-z0-9-]{3,64}$/;
    if (!slugRegex.test(slug)) {
      return new Response(
        JSON.stringify({
          error: "slug must be 3-64 chars, lowercase letters, numbers, and hyphens only",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Determine ownerUserId: only super_master may override; regular users own their workspaces
    let ownerUserId: string | undefined;
    if (auth.type === "super_master") {
      if (typeof body?.ownerUserId === "string" && body.ownerUserId.trim()) {
        ownerUserId = body.ownerUserId.trim();
      } else {
        return new Response(
          JSON.stringify({ error: "ownerUserId is required when creating workspaces as super_master" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } else {
      // auth.type === "user" — ignore any ownerUserId in the body and use the authenticated user
      if (!auth.userId) {
        return new Response(JSON.stringify({ error: "Authenticated user missing userId" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      ownerUserId = auth.userId;
    }

    const id = env.WORKSPACE_DO.idFromName(slug);
    const stub = env.WORKSPACE_DO.get(id);
    const url = new URL(request.url);
    url.pathname = "/create";
    const res = await stub.fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerUserId, name: rawName, slug, description }),
    });
    return res;
  });

  // Update workspace — workspace identified via x-workspace-alias header
  router.put("/workspace", async (request: any, env: AuthEnv & { WORKSPACE_DO: DurableObjectNamespace }) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved || resolved.auth.type !== "user") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const { workspaceId } = resolved;

    const body = await request.json().catch(() => null) as Partial<WorkspaceEntity> | null;

    const aliasHeader = (request as Request).headers.get("x-workspace-alias") ?? "";
    const slugForRouting = aliasHeader.toLowerCase();
    const id = env.WORKSPACE_DO.idFromName(slugForRouting || workspaceId);
    const stub = env.WORKSPACE_DO.get(id);
    const url = new URL(request.url);
    url.pathname = "/update";
    const res = await stub.fetch(url.toString(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerUserId: resolved.auth.userId, workspaceId, name: body?.name, slug: body?.slug, description: body?.description }),
    });
    return res;
  });

  // Delete workspace — workspace identified via x-workspace-alias header
  router.delete("/workspace", async (request: any, env: AuthEnv & { WORKSPACE_DO: DurableObjectNamespace; WORKSPACE_CLEANUP_DO: DurableObjectNamespace }) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved || resolved.auth.type !== "user") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const { workspaceId } = resolved;

    const id = env.WORKSPACE_DO.idFromName(workspaceId);
    const stub = env.WORKSPACE_DO.get(id);
    const url = new URL(request.url);
    url.pathname = "/delete";
    const res = await stub.fetch(url.toString(), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerUserId: resolved.auth.userId, workspaceId }),
    });
    if (!res.ok) return res;

    const cleanupId = env.WORKSPACE_CLEANUP_DO.idFromName(workspaceId);
    const cleanupStub = env.WORKSPACE_CLEANUP_DO.get(cleanupId);
    await cleanupStub.fetch("https://workspace/cleanup/start", { method: "POST" });

    return new Response(JSON.stringify({ ok: true, cleanupQueued: true }), { status: 202, headers: { "Content-Type": "application/json" } });
  });

  // List workspaces for a user
  router.get("/users/:userId/workspaces", async (request: any, env: Env) => {
    const { userId } = request.params;
    const membershipItems = await queryByPk<WorkspaceMemberEntity>(env, `USER#${userId}`);
    const workspaceMemberships = membershipItems.filter((e) => e.entityType === "WORKSPACE");

    const workspacePromises = workspaceMemberships.map((member) =>
      getEntity<WorkspaceEntity>(env, `WS#${member.workspaceId}`, "METADATA")
    );
    const workspaceDocs = (await Promise.all(workspacePromises)).filter(
      (w): w is WorkspaceEntity => w !== null
    );

    const workspaces = workspaceDocs.map((e) => ({
      workspaceId: e.workspaceId,
      ownerUserId: e.ownerUserId,
      name: e.name,
      slug: e.slug,
      description: e.description,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      pk: e.pk,
      sk: e.sk,
      entityType: e.entityType,
    }));

    return new Response(JSON.stringify({ workspaces }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  // Lookup workspace by alias
  router.get("/workspaces/by-alias/:alias", async (request: any, env: Env) => {
    const rawAlias = request.params.alias as string;
    const alias = rawAlias.toLowerCase();

    const items = await queryByPk(env, `WS_ALIAS#${alias}`);
    const record = items[0] as { workspaceId?: string; ownerUserId?: string } | undefined;
    if (!record?.workspaceId || !record?.ownerUserId) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    const workspace = await getEntity<WorkspaceEntity>(
      env,
      `USER#${record.ownerUserId}`,
      `WS#${record.workspaceId}`
    );
    if (!workspace) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({ workspaceId: workspace.workspaceId, name: workspace.name, slug: workspace.slug, description: workspace.description, createdAt: workspace.createdAt }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  });
}
