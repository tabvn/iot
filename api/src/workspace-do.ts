import type { DurableObjectState } from '@cloudflare/workers-types';
import type { StorageEnv } from '@/db/storage';
import { put, get, queryByPk } from '@/db/storage';
import type { WorkspaceEntity, WorkspaceMemberEntity } from '@/db/types';
import { Keys, EntityTypes } from '@/db/types';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse,
  conflictResponse,
} from '@/api-responses';

export class WorkspaceDurableObject {
  private state: DurableObjectState;
  private env: StorageEnv;
  private sockets: Set<WebSocket>;

  constructor(state: DurableObjectState, env: StorageEnv) {
    this.state = state;
    this.env = env;
    this.sockets = new Set();
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket', {
        status: 426,
        headers: { 'Content-Type': 'text/plain' },
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

    ws.addEventListener('message', (event) => {
      if (typeof event.data === 'string' && event.data === 'ping') {
        try {
          ws.send('pong');
        } catch {
          // ignore
        }
      }
    });

    ws.addEventListener('close', () => {
      this.sockets.delete(ws);
    });

    ws.addEventListener('error', () => {
      this.sockets.delete(ws);
    });
  }

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

    if (url.pathname === '/ws') {
      return this.handleWebSocket(request);
    }

    if (request.method === 'POST' && url.pathname === '/event') {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== 'object') {
        return badRequestResponse('invalid event');
      }
      this.broadcast(body);
      return successResponse({ ok: true });
    }

    if (request.method === 'POST' && url.pathname === '/create') {
      const body = (await request.json().catch(() => null)) as {
        ownerUserId?: string;
        name?: string;
        slug?: string;
        description?: string;
      } | null;

      if (!body?.ownerUserId || !body.name || !body.slug) {
        return badRequestResponse('ownerUserId, name, slug are required');
      }

      const slugLower = body.slug.toLowerCase();

      // Ensure slug uniqueness via alias index
      const { pk: aliasPk, sk: aliasSk } = Keys.workspaceAlias(slugLower);
      const existingAlias = await get(this.env, aliasPk, aliasSk);
      if (existingAlias && !('deletedAt' in existingAlias)) {
        return conflictResponse('Workspace alias already exists');
      }

      const workspaceId = crypto.randomUUID();
      const now = new Date().toISOString();

      // Main workspace entity
      const workspace: WorkspaceEntity = {
        ...Keys.workspace(workspaceId),
        entityType: EntityTypes.WORKSPACE,
        createdAt: now,
        updatedAt: now,
        workspaceId,
        ownerUserId: body.ownerUserId,
        name: body.name,
        slug: slugLower,
        description: body.description,
      };

      // User-to-workspace index (for listing user's workspaces)
      const userWorkspaceIndex: WorkspaceMemberEntity = {
        ...Keys.userWorkspace(body.ownerUserId, workspaceId),
        entityType: EntityTypes.WORKSPACE,
        createdAt: now,
        updatedAt: now,
        workspaceId,
        userId: body.ownerUserId,
        role: 'owner',
        devicePermissions: {},
      };

      // Alias index
      const aliasEntity: WorkspaceEntity = {
        pk: aliasPk,
        sk: aliasSk,
        entityType: EntityTypes.WORKSPACE,
        createdAt: now,
        updatedAt: now,
        workspaceId,
        ownerUserId: body.ownerUserId,
        name: body.name,
        slug: slugLower,
        description: body.description,
      };

      // Workspace-scoped member record (for membership verification)
      const workspaceMember: WorkspaceMemberEntity = {
        ...Keys.workspaceMember(workspaceId, body.ownerUserId),
        entityType: EntityTypes.WORKSPACE,
        createdAt: now,
        updatedAt: now,
        workspaceId,
        userId: body.ownerUserId,
        role: 'owner',
        devicePermissions: {},
      };

      await Promise.all([
        put(this.env, workspace),
        put(this.env, userWorkspaceIndex),
        put(this.env, aliasEntity),
        put(this.env, workspaceMember),
      ]);

      return createdResponse({
        workspaceId,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        ownerUserId: workspace.ownerUserId,
        createdAt: workspace.createdAt,
      });
    }

    if (request.method === 'PUT' && url.pathname === '/update') {
      const body = (await request.json().catch(() => null)) as {
        ownerUserId?: string;
        workspaceId?: string;
        name?: string;
        slug?: string;
        description?: string;
      } | null;

      if (!body?.ownerUserId || !body.workspaceId) {
        return badRequestResponse('ownerUserId and workspaceId are required');
      }

      const { pk, sk } = Keys.workspace(body.workspaceId);
      const existing = await get<WorkspaceEntity>(this.env, pk, sk);
      if (!existing) {
        return notFoundResponse('Workspace not found');
      }

      const now = new Date().toISOString();
      const newName = body.name ?? existing.name;
      const newSlug = (body.slug ?? existing.slug).toLowerCase();
      const oldSlug = existing.slug.toLowerCase();

      // Check if slug is changing and if new slug is available
      if (oldSlug !== newSlug) {
        const { pk: aliasPk, sk: aliasSk } = Keys.workspaceAlias(newSlug);
        const existingAlias = await get(this.env, aliasPk, aliasSk);
        if (existingAlias && !('deletedAt' in existingAlias)) {
          return conflictResponse('Workspace alias already exists');
        }
      }

      const updated: WorkspaceEntity = {
        ...existing,
        name: newName,
        slug: newSlug,
        description: body.description ?? existing.description,
        updatedAt: now,
      };

      const writes: Promise<void>[] = [put(this.env, updated)];

      // Update alias index if slug changed
      if (oldSlug !== newSlug) {
        const { pk: aliasPk, sk: aliasSk } = Keys.workspaceAlias(newSlug);
        const aliasEntity: WorkspaceEntity = {
          pk: aliasPk,
          sk: aliasSk,
          entityType: EntityTypes.WORKSPACE,
          createdAt: existing.createdAt,
          updatedAt: now,
          workspaceId: body.workspaceId,
          ownerUserId: existing.ownerUserId,
          name: newName,
          slug: newSlug,
        };
        writes.push(put(this.env, aliasEntity));
      }

      await Promise.all(writes);

      return successResponse({
        workspaceId: body.workspaceId,
        name: updated.name,
        slug: updated.slug,
        description: updated.description,
      });
    }

    if (request.method === 'DELETE' && url.pathname === '/delete') {
      const body = (await request.json().catch(() => null)) as {
        ownerUserId?: string;
        workspaceId?: string;
      } | null;

      if (!body?.ownerUserId || !body.workspaceId) {
        return badRequestResponse('ownerUserId and workspaceId are required');
      }

      const { pk, sk } = Keys.workspace(body.workspaceId);
      const existing = await get<WorkspaceEntity>(this.env, pk, sk);
      if (!existing) {
        return notFoundResponse('Workspace not found');
      }

      const now = new Date().toISOString();
      const slugLower = existing.slug.toLowerCase();

      // Soft-delete: mark entities with deletedAt
      const deleted: WorkspaceEntity & { deletedAt: string } = {
        ...existing,
        updatedAt: now,
        deletedAt: now,
      };

      const { pk: aliasPk, sk: aliasSk } = Keys.workspaceAlias(slugLower);
      const aliasDeleted = {
        ...existing,
        pk: aliasPk,
        sk: aliasSk,
        slug: slugLower,
        updatedAt: now,
        deletedAt: now,
      };

      const userWorkspaceDeleted: WorkspaceMemberEntity & { deletedAt: string } = {
        ...Keys.userWorkspace(body.ownerUserId, body.workspaceId),
        entityType: EntityTypes.WORKSPACE,
        createdAt: existing.createdAt,
        updatedAt: now,
        workspaceId: existing.workspaceId,
        userId: body.ownerUserId,
        role: 'owner',
        devicePermissions: {},
        deletedAt: now,
      };

      await Promise.all([
        put(this.env, deleted),
        put(this.env, aliasDeleted),
        put(this.env, userWorkspaceDeleted as any),
      ]);

      return successResponse({ ok: true });
    }

    return notFoundResponse();
  }
}
