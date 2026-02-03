import type { DurableObjectState } from "@cloudflare/workers-types";
import type { Env as StorageEnv } from "@/storage";
import type { TableEntity, WorkspaceEntity, WorkspaceMemberEntity } from "@/models";
import { putEntity, queryByPk, getEntity } from "@/storage";

interface Env extends StorageEnv {}

export class WorkspaceDurableObject {
  private state: DurableObjectState;
  private env: Env;
  private sockets: Set<WebSocket>;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.sockets = new Set();
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket", {
        status: 426,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

    this.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as any);
  }

  private acceptWebSocket(ws: WebSocket) {
    ws.accept();
    this.sockets.add(ws);

    ws.addEventListener("message", (event) => {
      // Optionally handle messages from clients in the future
      // For now, we ignore or echo minimal keep-alive
      if (typeof event.data === "string" && event.data === "ping") {
        try {
          ws.send("pong");
        } catch {
          // ignore send errors
        }
      }
    });

    ws.addEventListener("close", () => {
      this.sockets.delete(ws);
    });

    ws.addEventListener("error", () => {
      this.sockets.delete(ws);
    });
  }

  // Broadcast helper for future workspace-level events
  private broadcast(message: unknown) {
    const data = JSON.stringify(message);
    for (const ws of this.sockets) {
      try {
        ws.send(data);
      } catch {
        this.sockets.delete(ws);
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      return this.handleWebSocket(request);
    }

    if (request.method === "POST" && url.pathname === "/event") {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return new Response(JSON.stringify({ error: "invalid event" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      this.broadcast(body);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST" && url.pathname === "/create") {
      const body = (await request.json().catch(() => null)) as {
        ownerUserId?: string;
        name?: string;
        slug?: string; // alias
        description?: string;
      } | null;

      if (!body?.ownerUserId || !body.name || !body.slug) {
        return new Response(JSON.stringify({ error: "ownerUserId, name, slug are required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const slugLower = body.slug.toLowerCase();

      // Ensure slug uniqueness via alias index
      const existingIndex = await queryByPk(this.env, `WS_ALIAS#${slugLower}`);
      if (existingIndex.length > 0) {
        return new Response(JSON.stringify({ error: "Workspace alias already exists" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }

      const workspaceId = crypto.randomUUID();
      const now = new Date().toISOString();

      const workspace: WorkspaceEntity = {
        pk: `WS#${workspaceId}`,
        sk: "METADATA",
        entityType: "WORKSPACE",
        createdAt: now,
        updatedAt: now,
        workspaceId,
        ownerUserId: body.ownerUserId,
        name: body.name,
        slug: body.slug,
        description: body.description,
      };

      const ownerMembership = {
        pk: `USER#${body.ownerUserId}`,
        sk: `WS#${workspaceId}`,
        entityType: "WORKSPACE" as const,
        createdAt: now,
        updatedAt: now,
        workspaceId,
        userId: body.ownerUserId,
        role: "owner" as const,
        devicePermissions: {},
      } satisfies WorkspaceMemberEntity;

      const aliasEntity = {
        pk: `WS_ALIAS#${slugLower}`,
        sk: `WS#${workspaceId}`,
        entityType: "WORKSPACE" as const,
        createdAt: now,
        updatedAt: now,
        workspaceId,
        ownerUserId: body.ownerUserId,
        name: body.name,
        slug: slugLower,
        description: body.description,
      } satisfies WorkspaceEntity;

      const globalIndex = {
        pk: "WORKSPACES#ALL",
        sk: `WS#${workspaceId}`,
        entityType: "WORKSPACE" as const,
        createdAt: now,
        updatedAt: now,
        workspaceId,
        ownerUserId: body.ownerUserId,
        name: body.name,
        slug: slugLower,
        description: body.description,
      } satisfies WorkspaceEntity;

      // Workspace-scoped member record so resolveWorkspace can verify membership
      const workspaceMember = {
        pk: `WS#${workspaceId}`,
        sk: `MEMBER#${body.ownerUserId}`,
        entityType: "WORKSPACE" as const,
        createdAt: now,
        updatedAt: now,
        workspaceId,
        userId: body.ownerUserId,
        role: "owner" as const,
        devicePermissions: {},
      } satisfies WorkspaceMemberEntity;

      await Promise.all([
        putEntity(this.env, workspace),
        putEntity(this.env, ownerMembership),
        putEntity(this.env, workspaceMember),
        putEntity(this.env, aliasEntity),
        putEntity(this.env, globalIndex),
      ]);

      return new Response(JSON.stringify({ workspaceId, name: workspace.name, slug: workspace.slug, description: workspace.description, createdAt: workspace.createdAt }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "PUT" && url.pathname === "/update") {
      const body = (await request.json().catch(() => null)) as {
        ownerUserId?: string;
        workspaceId?: string;
        name?: string;
        slug?: string;
        description?: string;
      } | null;

      if (!body?.ownerUserId || !body.workspaceId) {
        return new Response(JSON.stringify({ error: "ownerUserId and workspaceId are required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { ownerUserId, workspaceId } = body;
      const existing = await getEntity<WorkspaceEntity>(
        this.env,
        `WS#${workspaceId}`,
        "METADATA"
      );
      if (!existing) {
        return new Response(JSON.stringify({ error: "Workspace not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const now = new Date().toISOString();
      const newName = body.name ?? existing.name;
      const newSlug = body.slug ?? existing.slug;
      const newSlugLower = newSlug.toLowerCase();
      const oldSlugLower = existing.slug.toLowerCase();

      const updated: WorkspaceEntity = {
        ...existing,
        name: newName,
        slug: newSlug,
        description: body.description ?? existing.description,
        updatedAt: now,
      };

      const writes: Promise<unknown>[] = [putEntity(this.env, updated)];

      if (oldSlugLower !== newSlugLower) {
        // Ensure new alias is not already used
        const aliasIndex = await queryByPk(this.env, `WS_ALIAS#${newSlugLower}`);
        if (aliasIndex.length > 0) {
          return new Response(JSON.stringify({ error: "Workspace alias already exists" }), {
            status: 409,
            headers: { "Content-Type": "application/json" },
          });
        }

        const aliasEntity = {
          pk: `WS_ALIAS#${newSlugLower}`,
          sk: `WS#${workspaceId}`,
          entityType: "WORKSPACE" as const,
          createdAt: existing.createdAt,
          updatedAt: now,
          workspaceId,
          ownerUserId: existing.ownerUserId,
          name: newName,
          slug: newSlugLower,
        } satisfies WorkspaceEntity;
        writes.push(putEntity(this.env, aliasEntity));
      }

      // Also update owner membership record name/slug for convenience
      const ownerMembershipUpdated = {
        pk: `USER#${ownerUserId}`,
        sk: `WS#${workspaceId}`,
        entityType: "WORKSPACE" as const,
        createdAt: existing.createdAt,
        updatedAt: now,
        workspaceId,
        userId: ownerUserId,
        role: "owner" as const,
        devicePermissions: {},
      } satisfies WorkspaceMemberEntity;
      writes.push(putEntity(this.env, ownerMembershipUpdated));

      await Promise.all(writes);

      return new Response(JSON.stringify({ workspaceId, name: updated.name, slug: updated.slug, description: updated.description }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "DELETE" && url.pathname === "/delete") {
      const body = (await request.json().catch(() => null)) as {
        ownerUserId?: string;
        workspaceId?: string;
      } | null;

      if (!body?.ownerUserId || !body.workspaceId) {
        return new Response(JSON.stringify({ error: "ownerUserId and workspaceId are required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const existing = await getEntity<WorkspaceEntity>(
        this.env,
        `WS#${body.workspaceId}`,
        "METADATA"
      );
      if (!existing) {
        return new Response(JSON.stringify({ error: "Workspace not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const now = new Date().toISOString();
      const slugLower = existing.slug.toLowerCase();

      // Soft-delete: mark entities with deletedAt
      const deleted = { ...existing, updatedAt: now, deletedAt: now };

      const aliasEntity = {
        ...existing,
        pk: `WS_ALIAS#${slugLower}`,
        sk: `WS#${existing.workspaceId}`,
        slug: slugLower,
        updatedAt: now,
        deletedAt: now,
      };

      const globalIndexDeleted = {
        ...existing,
        pk: "WORKSPACES#ALL",
        sk: `WS#${existing.workspaceId}`,
        slug: slugLower,
        updatedAt: now,
        deletedAt: now,
      };

      const ownerMembershipDeleted = {
        pk: `USER#${body.ownerUserId}`,
        sk: `WS#${existing.workspaceId}`,
        entityType: "WORKSPACE" as const,
        createdAt: existing.createdAt,
        updatedAt: now,
        workspaceId: existing.workspaceId,
        userId: body.ownerUserId,
        role: "owner" as const,
        devicePermissions: {},
        deletedAt: now,
      };

      await Promise.all([
        putEntity(this.env, deleted as TableEntity),
        putEntity(this.env, ownerMembershipDeleted as TableEntity),
        putEntity(this.env, aliasEntity as TableEntity),
        putEntity(this.env, globalIndexDeleted as TableEntity),
      ]);

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}
