import { createRepositories } from '@/db';
import type { StorageEnv } from '@/db/storage';
import { resolveWorkspace, requireRole, type AuthEnv, getAuthFromRequest } from '@/auth';
import type { RouterType } from 'itty-router';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  unauthorizedResponse,
  badRequestResponse,
  toApiWorkspace,
} from '@/api-responses';

const RESERVED_SLUGS = [
  'home',
  'blog',
  'contact',
  'dashboard',
  'developer',
  'forgot-password',
  'login',
  'pricing',
  'privacy',
  'reset-password',
  'signup',
  'terms',
  'actions',
  'api',
  'types',
  'settings',
  'account',
  'figma',
  'components',
  'lib',
  'styles',
  'utils',
  'users',
  'workspaces',
  'devices',
  'ingest',
  'analytics',
  'me',
  'by-email',
  'by-alias',
  'avatar',
  'invite',
  'members',
  'automations',
  'notifications',
];

interface WorkspaceEnv extends StorageEnv {
  WORKSPACE_DO: DurableObjectNamespace;
  WORKSPACE_CLEANUP_DO: DurableObjectNamespace;
}

export function workspacesRouter(router: RouterType) {
  // Create workspace via WorkspaceDurableObject to enforce unique alias
  router.post('/workspaces', async (request: Request, env: AuthEnv & WorkspaceEnv) => {
    const auth = await getAuthFromRequest(env, request);
    if (!auth || (auth.type !== 'user' && auth.type !== 'super_master')) {
      return unauthorizedResponse();
    }

    const body = (await request.json().catch(() => null)) as {
      ownerUserId?: string;
      name?: string;
      slug?: string;
      description?: string;
    } | null;

    const rawName = body?.name?.trim() || '';
    const rawSlug = body?.slug?.trim() || '';
    const description = body?.description?.trim();

    if (!rawName || !rawSlug) {
      return badRequestResponse('name and slug are required');
    }

    // Normalize slug and check format
    const slug = rawSlug.toLowerCase();
    if (RESERVED_SLUGS.includes(slug)) {
      return badRequestResponse('This is a reserved name and cannot be used.');
    }

    const slugRegex = /^[a-z0-9-]{3,64}$/;
    if (!slugRegex.test(slug)) {
      return badRequestResponse('slug must be 3-64 chars, lowercase letters, numbers, and hyphens only');
    }

    // Determine ownerUserId
    let ownerUserId: string;
    if (auth.type === 'super_master') {
      if (!body?.ownerUserId?.trim()) {
        return badRequestResponse('ownerUserId is required when creating workspaces as super_master');
      }
      ownerUserId = body.ownerUserId.trim();
    } else {
      if (!auth.userId) {
        return badRequestResponse('Authenticated user missing userId');
      }
      ownerUserId = auth.userId;
    }

    const id = env.WORKSPACE_DO.idFromName(slug);
    const stub = env.WORKSPACE_DO.get(id);
    const url = new URL(request.url);
    url.pathname = '/create';

    const res = await stub.fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerUserId, name: rawName, slug, description }),
    });

    return res;
  });

  // Update workspace
  router.put('/workspace', async (request: any, env: AuthEnv & WorkspaceEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!requireRole(resolved, 'admin')) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;

    const body = (await request.json().catch(() => null)) as {
      name?: string;
      slug?: string;
      description?: string;
    } | null;

    // Validate new slug if provided
    if (body?.slug) {
      const newSlug = body.slug.toLowerCase();
      if (RESERVED_SLUGS.includes(newSlug)) {
        return badRequestResponse('This is a reserved name and cannot be used.');
      }
      const slugRegex = /^[a-z0-9-]{3,64}$/;
      if (!slugRegex.test(newSlug)) {
        return badRequestResponse('slug must be 3-64 chars, lowercase letters, numbers, and hyphens only');
      }
    }

    const aliasHeader = (request as Request).headers.get('x-workspace-alias') ?? '';
    const slugForRouting = aliasHeader.toLowerCase();
    const id = env.WORKSPACE_DO.idFromName(slugForRouting || workspaceId);
    const stub = env.WORKSPACE_DO.get(id);
    const url = new URL(request.url);
    url.pathname = '/update';

    const res = await stub.fetch(url.toString(), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerUserId: resolved.auth.userId,
        workspaceId,
        name: body?.name,
        slug: body?.slug,
        description: body?.description,
      }),
    });

    return res;
  });

  // Delete workspace
  router.delete('/workspace', async (request: any, env: AuthEnv & WorkspaceEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!requireRole(resolved, 'owner')) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;

    const id = env.WORKSPACE_DO.idFromName(workspaceId);
    const stub = env.WORKSPACE_DO.get(id);
    const url = new URL(request.url);
    url.pathname = '/delete';

    const res = await stub.fetch(url.toString(), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerUserId: resolved.auth.userId, workspaceId }),
    });

    if (!res.ok) return res;

    // Queue cleanup
    const cleanupId = env.WORKSPACE_CLEANUP_DO.idFromName(workspaceId);
    const cleanupStub = env.WORKSPACE_CLEANUP_DO.get(cleanupId);
    await cleanupStub.fetch('https://workspace/cleanup/start', { method: 'POST' });

    return new Response(JSON.stringify({ ok: true, cleanupQueued: true }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  // List workspaces for a user (moved from users route for better organization)
  router.get('/users/:userId/workspaces', async (request: any, env: AuthEnv & StorageEnv) => {
    const auth = await getAuthFromRequest(env, request);
    if (!auth?.userId) {
      return unauthorizedResponse();
    }

    const { userId } = request.params;

    // Only allow viewing own workspaces or super_master can view any
    if (auth.userId !== userId && auth.type !== 'super_master') {
      return unauthorizedResponse();
    }

    const db = createRepositories(env);
    const workspaces = await db.workspaces.getByUserId(userId);

    return successResponse({
      workspaces: workspaces.map(toApiWorkspace),
    });
  });

  // Lookup workspace by alias
  router.get('/workspaces/by-alias/:alias', async (request: any, env: StorageEnv) => {
    const rawAlias = request.params.alias as string;
    const alias = rawAlias.toLowerCase();

    const db = createRepositories(env);
    const workspace = await db.workspaces.getBySlug(alias);

    if (!workspace) {
      return notFoundResponse('Workspace not found');
    }

    return successResponse(toApiWorkspace(workspace));
  });

  // Get current workspace (via x-workspace-alias header)
  router.get('/workspace', async (request: any, env: AuthEnv & StorageEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;

    const db = createRepositories(env);
    const workspace = await db.workspaces.getById(workspaceId);

    if (!workspace) {
      return notFoundResponse('Workspace not found');
    }

    return successResponse(toApiWorkspace(workspace));
  });
}
