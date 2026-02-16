import { createRepositories } from '@/db';
import type { StorageEnv } from '@/db/storage';
import type { RouterType } from 'itty-router';
import { getAuthFromRequest } from '@/auth';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  badRequestResponse,
  toApiUser,
  toApiWorkspace,
} from '@/api-responses';
import type { R2Bucket } from '@cloudflare/workers-types';

interface UserEnv extends StorageEnv {
  USER_DO: DurableObjectNamespace;
  WORKSPACE_DO: DurableObjectNamespace;
  WORKSPACE_CLEANUP_DO: DurableObjectNamespace;
  DEVICE_DATA_BUCKET: R2Bucket;
  TABLE_BUCKET_PREFIX?: string;
}

export function usersRouter(router: RouterType) {
  // Create user via UserDurableObject to avoid duplicates
  router.post('/users', async (request: any, env: UserEnv) => {
    const body = (await request.json().catch(() => null)) as {
      name?: string;
      email?: string;
      passwordHash?: string;
    } | null;

    if (!body?.email || !body.passwordHash) {
      return badRequestResponse('email and passwordHash are required');
    }
    if (body.passwordHash.length < 8) {
      return badRequestResponse('password must be at least 8 characters');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return badRequestResponse('Invalid email format');
    }

    const emailLower = body.email.toLowerCase();
    const id = env.USER_DO.idFromName(emailLower);
    const stub = env.USER_DO.get(id);
    const url = new URL(request.url);
    url.pathname = '/create';

    const res = await stub.fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: body.name, email: body.email, passwordHash: body.passwordHash }),
    });

    return res;
  });

  // Get current authenticated user
  router.get('/users/me', async (request: any, env: UserEnv) => {
    const auth = await getAuthFromRequest(env, request);
    if (!auth?.userId) {
      return unauthorizedResponse();
    }

    const db = createRepositories(env);
    const user = await db.users.getById(auth.userId);

    if (!user) {
      return notFoundResponse('User not found');
    }

    return successResponse(toApiUser(user));
  });

  // Get user by id
  router.get('/users/:userId', async (request: any, env: UserEnv) => {
    const auth = await getAuthFromRequest(env, request);
    if (!auth?.userId) {
      return unauthorizedResponse();
    }

    const { userId } = request.params;

    // Only allow viewing own profile or super_master can view any
    if (auth.userId !== userId && auth.type !== 'super_master') {
      return forbiddenResponse();
    }

    const db = createRepositories(env);
    const user = await db.users.getById(userId);

    if (!user) {
      return notFoundResponse('User not found');
    }

    return successResponse(toApiUser(user));
  });

  // Get user by email
  router.get('/users/by-email/:email', async (request: any, env: UserEnv) => {
    const rawEmail = request.params.email as string;

    const db = createRepositories(env);
    const user = await db.users.getByEmail(rawEmail);

    if (!user) {
      return notFoundResponse('User not found');
    }

    return successResponse({
      userId: user.userId,
      email: user.email,
    });
  });

  // Change password
  router.post('/users/change-password', async (request: Request, env: UserEnv) => {
    const auth = await getAuthFromRequest(env, request);
    if (!auth?.userId) {
      return unauthorizedResponse();
    }

    const body = (await request.json().catch(() => null)) as {
      currentPassword?: string;
      newPassword?: string;
    } | null;

    if (!body?.currentPassword || !body?.newPassword) {
      return badRequestResponse('currentPassword and newPassword are required');
    }

    if (body.newPassword.length < 8) {
      return badRequestResponse('New password must be at least 8 characters');
    }

    const db = createRepositories(env);
    const existing = await db.users.getById(auth.userId);

    if (!existing) {
      return notFoundResponse('User not found');
    }

    if (existing.passwordHash !== body.currentPassword) {
      return forbiddenResponse('Current password is incorrect');
    }

    await db.users.update(auth.userId, { passwordHash: body.newPassword });

    return successResponse({ ok: true });
  });

  // Update user
  router.put('/users/:userId', async (request: any, env: UserEnv) => {
    const auth = await getAuthFromRequest(env, request);
    if (!auth?.userId) {
      return unauthorizedResponse();
    }

    const { userId } = request.params;

    if (auth.userId !== userId && auth.type !== 'super_master') {
      return forbiddenResponse();
    }

    const body = (await request.json().catch(() => null)) as {
      name?: string;
      email?: string;
      passwordHash?: string;
      avatarUrl?: string;
    } | null;

    if (body?.passwordHash && body.passwordHash.length < 8) {
      return badRequestResponse('password must be at least 8 characters');
    }

    if (body?.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return badRequestResponse('Invalid email format');
      }
    }

    const db = createRepositories(env);
    const existing = await db.users.getById(userId);

    if (!existing) {
      return notFoundResponse('User not found');
    }

    // Handle via DO to ensure email uniqueness
    const email = body?.email ?? existing.email;
    const id = env.USER_DO.idFromName(email.toLowerCase());
    const stub = env.USER_DO.get(id);
    const url = new URL(request.url);
    url.pathname = '/update';

    const res = await stub.fetch(url.toString(), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        name: body?.name,
        email: body?.email,
        passwordHash: body?.passwordHash,
        avatarUrl: body?.avatarUrl,
      }),
    });

    return res;
  });

  // Delete user and cascade delete owned workspaces
  router.delete('/users/:userId', async (request: any, env: UserEnv) => {
    const auth = await getAuthFromRequest(env, request);
    if (!auth?.userId) {
      return unauthorizedResponse();
    }

    const { userId } = request.params;

    if (auth.userId !== userId && auth.type !== 'super_master') {
      return forbiddenResponse();
    }

    const db = createRepositories(env);
    const existing = await db.users.getById(userId);

    if (!existing) {
      return notFoundResponse('User not found');
    }

    // Get and delete owned workspaces
    const ownedWorkspaces = await db.workspaces.getByUserId(userId);

    for (const ws of ownedWorkspaces) {
      // Only delete if user is the owner
      if (ws.ownerUserId === userId) {
        const doId = env.WORKSPACE_DO.idFromName(ws.workspaceId);
        const stub = env.WORKSPACE_DO.get(doId);
        const res = await stub.fetch('https://workspace/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerUserId: userId, workspaceId: ws.workspaceId }),
        });

        if (!res.ok) {
          const msg = await res.text().catch(() => '');
          return new Response(
            JSON.stringify({ error: 'Failed to delete workspace', workspaceId: ws.workspaceId, details: msg }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Enqueue cleanup
        const cleanupId = env.WORKSPACE_CLEANUP_DO.idFromName(ws.workspaceId);
        const cleanupStub = env.WORKSPACE_CLEANUP_DO.get(cleanupId);
        await cleanupStub.fetch('https://workspace/cleanup/start', { method: 'POST' });
      }
    }

    // Delete user
    await db.users.delete(userId);

    return successResponse({ ok: true });
  });

  // Upload avatar
  router.post('/users/:userId/avatar', async (request: any, env: UserEnv) => {
    const auth = await getAuthFromRequest(env, request);
    if (!auth?.userId) {
      return unauthorizedResponse();
    }

    const { userId } = request.params;

    if (auth.type === 'user' && auth.userId !== userId) {
      return forbiddenResponse();
    }

    const db = createRepositories(env);
    const existing = await db.users.getById(userId);

    if (!existing) {
      return notFoundResponse('User not found');
    }

    const contentType = (request as Request).headers.get('Content-Type') || 'application/octet-stream';
    const key = `${env.TABLE_BUCKET_PREFIX || ''}USER_AVATAR#${userId}`;

    await env.DEVICE_DATA_BUCKET.put(key, (request as Request).body, {
      httpMetadata: { contentType },
    });

    const avatarUrl = `/users/${userId}/avatar`;

    // Update user with avatar URL
    await db.users.update(userId, { avatarUrl });

    return successResponse({ avatarUrl });
  });

  // Get avatar
  router.get('/users/:userId/avatar', async (request: any, env: UserEnv) => {
    const { userId } = request.params;
    const key = `${env.TABLE_BUCKET_PREFIX || ''}USER_AVATAR#${userId}`;
    const obj = await env.DEVICE_DATA_BUCKET.get(key);

    if (!obj) {
      return new Response('Not found', { status: 404 });
    }

    const headers = new Headers();
    if (obj.httpMetadata?.contentType) {
      headers.set('Content-Type', obj.httpMetadata.contentType);
    }

    return new Response(obj.body, { status: 200, headers });
  });

  // Get user's workspaces
  router.get('/users/:userId/workspaces', async (request: any, env: UserEnv) => {
    const auth = await getAuthFromRequest(env, request);
    if (!auth?.userId) {
      return unauthorizedResponse();
    }

    const { userId } = request.params;
    console.log('Fetching workspaces for userId:', userId);

    if (auth.userId !== userId && auth.type !== 'super_master') {
      return forbiddenResponse();
    }

    const db = createRepositories(env);
    const workspaces = await db.workspaces.getByUserId(userId);
    return successResponse({
      workspaces: workspaces.map((ws) => toApiWorkspace(ws)),
    });
  });
}
