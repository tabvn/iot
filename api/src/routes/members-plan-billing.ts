import { createRepositories } from '@/db';
import type { StorageEnv } from '@/db/storage';
import type { MemberRole, DevicePermission } from '@/db/types';
import { resolveWorkspace, type AuthEnv, requireRole } from '@/auth';
import type { RouterType } from 'itty-router';
import { notifyMemberJoined, notifyMemberLeft, notifyMemberRoleChanged } from '@/notifications';
import {
  jsonResponse,
  successResponse,
  createdResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  badRequestResponse,
  toApiMember,
  toApiPlan,
  toApiBillingInvoice,
} from '@/api-responses';

interface WorkspaceMemberPayload {
  userId: string;
  role: MemberRole;
  devicePermissions?: Record<string, DevicePermission[]>;
}

function validateWorkspaceMemberPayload(
  body: unknown
): { ok: true; value: WorkspaceMemberPayload } | { ok: false, error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be an object' };
  const b = body as Partial<WorkspaceMemberPayload>;
  if (!b.userId || typeof b.userId !== 'string' || !b.userId.trim()) {
    return { ok: false, error: 'userId is required' };
  }
  if (!b.role) {
    return { ok: false, error: 'role is required' };
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
  // Get current user's membership in this workspace
  router.get('/members/me', async (request: any, env: AuthEnv & StorageEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved || resolved.auth.type !== 'user' || !resolved.auth.userId) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;

    const db = createRepositories(env);
    const member = await db.members.get(workspaceId, resolved.auth.userId);
    if (!member) {
      return notFoundResponse('Not a member of this workspace');
    }

    const user = await db.users.getById(resolved.auth.userId);
    return successResponse(toApiMember(member, user));
  });

  // Add workspace member (manage access required)
  router.post('/members', async (request: any, env: AuthEnv & StorageEnv, ctx: ExecutionContext) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!requireRole(resolved, 'admin')) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;

    const parsed = await request.json().catch(() => null);
    const validation = validateWorkspaceMemberPayload(parsed);
    if (!validation.ok) {
      return badRequestResponse(validation.error);
    }
    const body = validation.value;

    const db = createRepositories(env);

    // Check if user exists
    const user = await db.users.getById(body.userId);
    if (!user) {
      return notFoundResponse('User not found');
    }

    // Check if already a member
    if (await db.members.isMember(workspaceId, body.userId)) {
      return errorResponse('User is already a member', 409);
    }

    // Add member
    const member = await db.members.add({
      workspaceId,
      userId: body.userId,
      role: body.role,
      devicePermissions: body.devicePermissions,
    });

    // Dispatch notification
    ctx.waitUntil(
      notifyMemberJoined(env, workspaceId, user.name || body.userId).catch((err) => {
        console.error('[members][notify][error]', err);
      })
    );

    return createdResponse({
      member: toApiMember(member, user),
    });
  });

  // Update member (manage access required)
  router.put('/members/:userId', async (request: any, env: AuthEnv & StorageEnv, ctx: ExecutionContext) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!requireRole(resolved, 'admin')) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;
    const { userId } = request.params;

    const body = (await request.json().catch(() => null)) as Partial<WorkspaceMemberPayload> | null;
    if (!body) {
      return badRequestResponse('Empty payload');
    }

    // Validate role if provided
    if (body.role && !['admin', 'editor', 'viewer'].includes(body.role)) {
      return badRequestResponse('Invalid role. Must be admin, editor, or viewer');
    }

    const db = createRepositories(env);

    // Check if member exists
    const existing = await db.members.get(workspaceId, userId);
    if (!existing) {
      return notFoundResponse('Member not found');
    }

    // Cannot change owner's role
    if (existing.role === 'owner') {
      return badRequestResponse('Cannot change the role of the workspace owner');
    }

    // Update member
    const updated = await db.members.update(workspaceId, userId, {
      role: body.role,
      devicePermissions: body.devicePermissions,
    });

    if (!updated) {
      return notFoundResponse('Member not found');
    }

    const user = await db.users.getById(userId);

    // Notify if role changed
    if (body.role && body.role !== existing.role) {
      ctx.waitUntil(
        notifyMemberRoleChanged(env, workspaceId, userId, user?.name || userId, existing.role, body.role).catch((err) => {
          console.error('[members][notify][error]', err);
        })
      );
    }

    return successResponse({
      member: toApiMember(updated, user),
    });
  });

  // Remove member (manage access required)
  router.delete('/members/:userId', async (request: any, env: AuthEnv & StorageEnv, ctx: ExecutionContext) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!requireRole(resolved, 'admin')) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;
    const { userId } = request.params;

    const db = createRepositories(env);

    // Resolve user name before removal for notification
    const user = await db.users.getById(userId);
    await db.members.remove(workspaceId, userId);

    ctx.waitUntil(
      notifyMemberLeft(env, workspaceId, user?.name || userId).catch((err) => {
        console.error('[members][notify][error]', err);
      })
    );

    return successResponse({ ok: true });
  });

  // List members (any authenticated workspace context)
  router.get('/members', async (request: any, env: AuthEnv & StorageEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;

    const db = createRepositories(env);
    const memberEntities = await db.members.getAllByWorkspace(workspaceId);

    // Fetch user details for each member
    const members = await Promise.all(
      memberEntities.map(async (member) => {
        const user = await db.users.getById(member.userId);
        return toApiMember(member, user);
      })
    );

    return successResponse({ members });
  });

  // Update workspace plan (manage access required)
  router.put('/plan', async (request: any, env: AuthEnv & StorageEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!requireRole(resolved, 'owner')) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;

    const body = (await request.json().catch(() => null)) as { plan: string } | null;
    if (!body?.plan) {
      return badRequestResponse('plan is required');
    }

    const validPlans = ['starter', 'professional', 'business', 'enterprise'];
    if (!validPlans.includes(body.plan)) {
      return badRequestResponse('Invalid plan');
    }

    const db = createRepositories(env);
    const { put } = await import('@/db/storage');
    const { Keys, Timestamps, EntityTypes } = await import('@/db/types');

    const now = Timestamps.now();
    const planEntity = {
      ...Keys.workspacePlan(workspaceId),
      entityType: EntityTypes.WORKSPACE,
      createdAt: now,
      updatedAt: now,
      workspaceId,
      plan: body.plan as any,
      maxDevices: body.plan === 'starter' ? 5 : body.plan === 'professional' ? 25 : body.plan === 'business' ? 100 : 1000,
      maxMembers: body.plan === 'starter' ? 3 : body.plan === 'professional' ? 10 : body.plan === 'business' ? 50 : 500,
      maxAutomations: body.plan === 'starter' ? 5 : body.plan === 'professional' ? 25 : body.plan === 'business' ? 100 : 500,
      dataRetentionDays: body.plan === 'starter' ? 7 : body.plan === 'professional' ? 30 : body.plan === 'business' ? 90 : 365,
    };

    await put(env, planEntity as any);

    return successResponse({
      workspaceId,
      plan: body.plan,
    });
  });

  // Get current plan
  router.get('/plan', async (request: any, env: AuthEnv & StorageEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;

    const { get } = await import('@/db/storage');
    const { Keys } = await import('@/db/types');
    const { pk, sk } = Keys.workspacePlan(workspaceId);
    const planEntity = await get(env, pk, sk);

    if (!planEntity) {
      // Return default starter plan
      return successResponse({
        workspaceId,
        plan: 'starter',
        maxDevices: 5,
        maxMembers: 3,
        maxAutomations: 5,
        dataRetentionDays: 7,
      });
    }

    return successResponse(toApiPlan(planEntity as any));
  });

  // Get billing history
  router.get('/billing', async (request: any, env: AuthEnv & StorageEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;

    const { queryByPkAndSkPrefix } = await import('@/db/storage');
    const result = await queryByPkAndSkPrefix(env, `WS#${workspaceId}`, 'BILLING#');

    const invoices = result.items.map((entity: any) => toApiBillingInvoice(entity));

    return successResponse({ invoices });
  });
}
