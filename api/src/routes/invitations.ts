import { createRepositories } from '@/db';
import type { StorageEnv } from '@/db/storage';
import type {
  WorkspaceInvitationEntity,
  WorkspaceEntity,
  UserEntity,
  MemberRole,
  DevicePermission,
} from '@/db/types';
import { Timestamps } from '@/db/types';
import { resolveWorkspace, type AuthEnv, requireRole, getAuthFromRequest } from '@/auth';
import { hashPassword } from '@/password';
import type { RouterType } from 'itty-router';
import { sendEmail, invitationEmailHtml, invitationEmailText, type EmailEnv } from '@/email';
import { notifyInvitationAccepted, notifyInvitationCreated, notifyInvitationDeclined } from '@/notifications';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  unauthorizedResponse,
  badRequestResponse,
  toApiInvitation,
} from '@/api-responses';

interface InvitationEnv extends StorageEnv, AuthEnv, EmailEnv {
  APP_URL?: string;
  USER_JWT_SECRET?: string;
}

// Sign a JWT for auto-created users (same as login.ts)
async function signUserJwt(secret: string, userId: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,
    type: 'user',
    iat: nowSeconds,
    exp: nowSeconds + 24 * 60 * 60,
  };

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  function base64UrlEncode(data: Uint8Array): string {
    const b64 = btoa(String.fromCharCode(...data));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

interface CreateInvitationPayload {
  email: string;
  role: MemberRole;
  devicePermissions?: Record<string, DevicePermission[]>;
}

function validateCreateInvitationPayload(
  body: unknown
): { ok: true; value: CreateInvitationPayload } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be an object' };
  const b = body as Partial<CreateInvitationPayload>;

  if (!b.email || !b.email.trim()) {
    return { ok: false, error: 'email is required' };
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(b.email.trim())) {
    return { ok: false, error: 'Invalid email format' };
  }

  if (!b.role || !['admin', 'editor', 'viewer'].includes(b.role)) {
    return { ok: false, error: 'role must be admin, editor, or viewer' };
  }

  return {
    ok: true,
    value: {
      email: b.email.trim().toLowerCase(),
      role: b.role,
      devicePermissions: b.devicePermissions,
    },
  };
}

export function invitationsRouter(router: RouterType) {
  // Create a new invitation
  router.post('/invitations', async (request: Request, env: InvitationEnv, ctx: ExecutionContext) => {
    const resolved = await resolveWorkspace(env, request);
    if (!requireRole(resolved, 'admin')) {
      return unauthorizedResponse();
    }
    const { workspaceId, auth } = resolved;

    const parsed = await request.json().catch(() => null);
    const validation = validateCreateInvitationPayload(parsed);
    if (!validation.ok) {
      return badRequestResponse(validation.error);
    }
    const { email, role, devicePermissions } = validation.value;

    const db = createRepositories(env);

    // 1. Check if user exists by email (fast lookup)
    const existingUser = await db.users.getByEmail(email);

    if (existingUser) {
      // Check if user is trying to invite themselves
      if (auth.userId && existingUser.userId === auth.userId) {
        return badRequestResponse('You cannot invite yourself');
      }

      // 2. Check if user is already a member (fast lookup)
      const isMember = await db.members.isMember(workspaceId, existingUser.userId);
      if (isMember) {
        // Check if this is the owner
        const workspace = await db.workspaces.getById(workspaceId);
        if (workspace && workspace.ownerUserId === existingUser.userId) {
          return badRequestResponse('Cannot invite the workspace owner');
        }
        return badRequestResponse('User is already a member of this workspace');
      }
    }

    // 3. Check for existing pending invitation
    const pendingInvitations = await db.invitations.getPendingByEmail(email);
    const hasPendingInvite = pendingInvitations.some((inv) => inv.workspaceId === workspaceId);
    if (hasPendingInvite) {
      return badRequestResponse('An invitation is already pending for this email');
    }

    // 4. Get workspace details for the invitation
    const workspace = await db.workspaces.getById(workspaceId);
    if (!workspace) {
      return notFoundResponse('Workspace not found');
    }

    // Get inviter details
    let inviterName: string | undefined;
    if (auth.userId) {
      const inviter = await db.users.getById(auth.userId);
      inviterName = inviter?.name;
    }

    // Create invitation using repository
    const invitation = await db.invitations.create({
      workspaceId,
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
      email,
      role,
      devicePermissions,
      invitedByUserId: auth.userId || '',
      invitedByName: inviterName,
      expiresInDays: 7,
    });

    // Send invitation email
    const appUrl = env.APP_URL || 'https://thebaycity.dev';
    const inviteLink = `${appUrl}/${workspace.slug}/invite/${invitation.token}`;

    const emailResult = await sendEmail(env, {
      to: email,
      subject: `You're invited to join ${workspace.name} on Thebaycity IoT`,
      html: invitationEmailHtml({
        workspaceName: workspace.name,
        inviterName,
        role,
        inviteLink,
        expiresAt: invitation.expiresAt,
      }),
      text: invitationEmailText({
        workspaceName: workspace.name,
        inviterName,
        role,
        inviteLink,
        expiresAt: invitation.expiresAt,
      }),
    });

    if (!emailResult.ok) {
      console.error('[invitations][send_email][error]', emailResult.error);
    }

    ctx.waitUntil(
      notifyInvitationCreated(env, workspaceId, email, role).catch((err) => {
        console.error('[invitations][notify][error]', err);
      })
    );

    return createdResponse({
      invitationId: invitation.invitationId,
      token: invitation.token,
      email,
      role,
      status: 'pending',
      expiresAt: invitation.expiresAt,
      emailSent: emailResult.ok,
    });
  });

  // List invitations for a workspace
  router.get('/invitations', async (request: Request, env: InvitationEnv) => {
    const resolved = await resolveWorkspace(env, request);
    if (!resolved) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;

    const db = createRepositories(env);
    const invitations = await db.invitations.getAllByWorkspace(workspaceId);

    return successResponse({
      invitations: invitations.map((inv) => toApiInvitation(inv)),
    });
  });

  // Get invitation by token (public - for accept page)
  router.get('/invitations/by-token/:token', async (request: any, env: InvitationEnv) => {
    const { token } = request.params;

    const db = createRepositories(env);
    const invitation = await db.invitations.getByToken(token);

    if (!invitation) {
      return notFoundResponse('Invitation not found');
    }

    // Check if expired
    if (Timestamps.isExpired(invitation.expiresAt)) {
      return new Response(
        JSON.stringify({
          error: 'Invitation has expired',
          status: 'expired',
        }),
        {
          status: 410,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if already accepted/declined
    if (invitation.status !== 'pending') {
      return badRequestResponse(`Invitation has already been ${invitation.status}`);
    }

    return successResponse(toApiInvitation(invitation));
  });

  // Accept invitation
  router.post('/invitations/accept/:token', async (request: any, env: InvitationEnv, ctx: ExecutionContext) => {
    const auth = await getAuthFromRequest(env, request as Request);
    const { token } = request.params;

    const db = createRepositories(env);
    const invitation = await db.invitations.getByToken(token);

    if (!invitation) {
      return notFoundResponse('Invitation not found');
    }

    // Check if expired
    if (Timestamps.isExpired(invitation.expiresAt)) {
      await db.invitations.updateStatus(invitation.workspaceId, invitation.invitationId, 'expired');
      return new Response(JSON.stringify({ error: 'Invitation has expired' }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if already accepted/declined
    if (invitation.status !== 'pending') {
      return badRequestResponse(`Invitation has already been ${invitation.status}`);
    }

    let userId: string;
    let user: UserEntity | null = null;
    let userAutoCreated = false;

    // If user is logged in, verify email matches
    if (auth && auth.type === 'user' && auth.userId) {
      user = await db.users.getById(auth.userId);
      if (!user) {
        return notFoundResponse('User not found');
      }

      // Email must match for logged-in users
      if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        return new Response(
          JSON.stringify({
            error: 'This invitation was sent to a different email address',
            invitedEmail: invitation.email,
            yourEmail: user.email,
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      userId = auth.userId;
    } else {
      // User not logged in - try to find or create user
      const existingUser = await db.users.getByEmail(invitation.email);

      if (existingUser) {
        // User exists but not logged in
        return new Response(
          JSON.stringify({
            error: 'Please log in to accept this invitation.',
            loginRequired: true,
            email: invitation.email,
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Auto-create user account
      const randomBytes = crypto.getRandomValues(new Uint8Array(9));
      const generatedPassword = Array.from(randomBytes)
        .map((b) => b.toString(36).padStart(2, '0'))
        .join('')
        .slice(0, 12);

      const hashedPassword = await hashPassword(generatedPassword);
      user = await db.users.create({
        name: invitation.email.split('@')[0],
        email: invitation.email,
        passwordHash: hashedPassword,
      });

      userId = user.userId;
      userAutoCreated = true;
    }

    // Check if user is already a member
    const isMember = await db.members.isMember(invitation.workspaceId, userId);
    if (isMember) {
      return badRequestResponse('You are already a member of this workspace');
    }

    // Add member to workspace
    await db.members.add({
      workspaceId: invitation.workspaceId,
      userId,
      role: invitation.role,
      devicePermissions: invitation.devicePermissions,
    });

    // Update invitation status
    await db.invitations.updateStatus(
      invitation.workspaceId,
      invitation.invitationId,
      'accepted',
      userId
    );

    // Dispatch notification
    if (user) {
      ctx.waitUntil(
        notifyInvitationAccepted(env, invitation.workspaceId, invitation.email, user.name).catch((err) => {
          console.error('[invitations][notify][error]', err);
        })
      );
    }

    // For auto-created users, generate a session + JWT
    let sessionToken: string | undefined;
    let sessionId: string | undefined;
    if (userAutoCreated && env.USER_JWT_SECRET) {
      const session = await db.sessions.create(userId, 24); // 24 hours
      sessionId = session.sessionId;
      sessionToken = await signUserJwt(env.USER_JWT_SECRET, userId);
    }

    return successResponse({
      ok: true,
      workspaceId: invitation.workspaceId,
      workspaceSlug: invitation.workspaceSlug,
      role: invitation.role,
      userId,
      userCreated: userAutoCreated,
      ...(userAutoCreated && sessionToken ? { token: sessionToken, sessionId } : {}),
    });
  });

  // Decline invitation
  router.post('/invitations/decline/:token', async (request: any, env: InvitationEnv, ctx: ExecutionContext) => {
    const { token } = request.params;

    const db = createRepositories(env);
    const invitation = await db.invitations.getByToken(token);

    if (!invitation) {
      return notFoundResponse('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      return badRequestResponse(`Invitation has already been ${invitation.status}`);
    }

    await db.invitations.updateStatus(invitation.workspaceId, invitation.invitationId, 'declined');

    ctx.waitUntil(
      notifyInvitationDeclined(env, invitation.workspaceId, invitation.email).catch((err) => {
        console.error('[invitations][notify][error]', err);
      })
    );

    return successResponse({ ok: true });
  });

  // Cancel/revoke invitation (by workspace admin)
  router.delete('/invitations/:invitationId', async (request: any, env: InvitationEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!requireRole(resolved, 'admin')) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;
    const { invitationId } = request.params;

    const db = createRepositories(env);
    const invitation = await db.invitations.getById(workspaceId, invitationId);

    if (!invitation) {
      return notFoundResponse('Invitation not found');
    }

    // Delete invitation (repository handles cleanup of indexes)
    await db.invitations.delete(workspaceId, invitationId);

    return successResponse({ ok: true });
  });

  // Get invitations for current user (by email)
  router.get('/users/me/invitations', async (request: Request, env: InvitationEnv) => {
    const auth = await getAuthFromRequest(env, request);
    if (!auth || auth.type !== 'user' || !auth.userId) {
      return unauthorizedResponse();
    }

    const db = createRepositories(env);

    // Get user's email
    const user = await db.users.getById(auth.userId);
    if (!user) {
      return notFoundResponse('User not found');
    }

    // Get pending invitations for this email
    const invitations = await db.invitations.getPendingByEmail(user.email);

    // Filter out expired invitations
    const validInvitations = invitations.filter((inv) => !Timestamps.isExpired(inv.expiresAt));

    return successResponse({
      invitations: validInvitations.map((inv) => ({
        invitationId: inv.invitationId,
        workspaceName: inv.workspaceName,
        workspaceSlug: inv.workspaceSlug,
        role: inv.role,
        devicePermissions: inv.devicePermissions,
        invitedByName: inv.invitedByName,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        token: inv.token,
      })),
    });
  });
}
