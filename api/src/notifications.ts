import type { StorageEnv } from '@/db/storage';
import { put, queryByPkAndSkPrefix, get } from '@/db/storage';
import type {
  WorkspaceMemberEntity,
  UserNotificationEntity,
  UserNotificationPreferencesEntity,
  AutomationEntity,
  AutomationLogEntity,
  MemberRole,
  NotificationType,
  NotificationSeverity,
} from '@/db/types';
import { EntityTypes } from '@/db/types';

interface NotificationPayload {
  workspaceId: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

const ROLE_VISIBILITY: Record<NotificationType, MemberRole[]> = {
  // Device
  device_created: ['owner', 'admin', 'editor'],
  device_updated: ['owner', 'admin', 'editor'],
  device_deleted: ['owner', 'admin'],
  device_online: ['owner', 'admin', 'editor', 'viewer'],
  device_offline: ['owner', 'admin', 'editor', 'viewer'],
  // Automation
  automation_created: ['owner', 'admin', 'editor'],
  automation_updated: ['owner', 'admin', 'editor'],
  automation_deleted: ['owner', 'admin'],
  automation_triggered: ['owner', 'admin', 'editor'],
  automation_failed: ['owner', 'admin'],
  automation_partial_failure: ['owner', 'admin'],
  // Members
  member_joined: ['owner', 'admin'],
  member_left: ['owner', 'admin'],
  member_role_changed: ['owner', 'admin'],
  // Invitations
  invitation_created: ['owner', 'admin'],
  invitation_accepted: ['owner', 'admin'],
  invitation_declined: ['owner', 'admin'],
  // Workspace
  workspace_updated: ['owner', 'admin', 'editor', 'viewer'],
  // API Keys
  api_key_created: ['owner', 'admin'],
  api_key_revoked: ['owner', 'admin'],
  // System
  system: ['owner', 'admin', 'editor', 'viewer'],
};

export async function dispatchNotification(
  env: StorageEnv,
  payload: NotificationPayload,
  options?: { excludeUserId?: string }
): Promise<void> {
  const { workspaceId, type, severity, title, message, metadata } = payload;
  const now = new Date().toISOString();
  const notificationId = crypto.randomUUID();

  const wsResult = await queryByPkAndSkPrefix<WorkspaceMemberEntity>(env, `WS#${workspaceId}`, 'MEMBER#');
  const members = wsResult.items.filter(
    (e): e is WorkspaceMemberEntity => e.entityType === 'WORKSPACE'
  );

  console.log(`[notifications][dispatch] type=${type} workspaceId=${workspaceId} members=${members.length}`);

  const eligibleRoles = ROLE_VISIBILITY[type] ?? ['owner', 'admin'];

  const writes: Promise<void>[] = [];
  for (const member of members) {
    if (!eligibleRoles.includes(member.role)) continue;
    if (options?.excludeUserId && member.userId === options.excludeUserId) continue;
    console.log(`[notifications][dispatch] writing notification for userId=${member.userId} role=${member.role}`);

    // Check user preferences
    const prefs = await get<UserNotificationPreferencesEntity>(
      env,
      `USER_NOTIF_PREFS#${member.userId}`,
      `WS#${workspaceId}`
    );
    if (prefs?.disabledTypes?.includes(type)) continue;

    const entity: UserNotificationEntity = {
      pk: `USER_NOTIF#${member.userId}#${workspaceId}`,
      sk: `${now}#${notificationId}`,
      entityType: EntityTypes.NOTIFICATION,
      createdAt: now,
      updatedAt: now,
      notificationId,
      workspaceId,
      userId: member.userId,
      type,
      severity,
      title,
      message,
      metadata,
      read: false,
    };
    writes.push(put(env, entity));
  }

  await Promise.all(writes);
}

export async function dispatchAutomationNotification(
  env: StorageEnv,
  workspaceId: string,
  automation: AutomationEntity,
  logEntity: AutomationLogEntity
): Promise<void> {
  let type: NotificationType;
  let severity: NotificationSeverity;
  let title: string;

  switch (logEntity.status) {
    case 'success':
      type = 'automation_triggered';
      severity = 'success';
      title = `Automation "${automation.name}" executed successfully`;
      break;
    case 'partial_failure':
      type = 'automation_partial_failure';
      severity = 'warning';
      title = `Automation "${automation.name}" completed with errors`;
      break;
    case 'failure':
      type = 'automation_failed';
      severity = 'error';
      title = `Automation "${automation.name}" failed`;
      break;
  }

  const failedActions = logEntity.actionResults.filter((r) => r.status === 'failure');
  const message =
    logEntity.status === 'success'
      ? `All ${logEntity.actionResults.length} action(s) completed in ${logEntity.totalDurationMs}ms`
      : `${failedActions.length}/${logEntity.actionResults.length} action(s) failed. ${failedActions.map((a) => a.error).join('; ')}`;

  await dispatchNotification(env, {
    workspaceId,
    type,
    severity,
    title,
    message,
    metadata: {
      automationId: automation.automationId,
      automationName: automation.name,
      logId: logEntity.logId,
      triggerType: logEntity.triggerType,
    },
  });
}

export async function notifyMemberJoined(
  env: StorageEnv,
  workspaceId: string,
  userName: string
): Promise<void> {
  await dispatchNotification(env, {
    workspaceId,
    type: 'member_joined',
    severity: 'info',
    title: `${userName} joined the workspace`,
    message: `${userName} has been added as a member.`,
    metadata: { userName },
  });
}

export async function notifyInvitationAccepted(
  env: StorageEnv,
  workspaceId: string,
  email: string,
  userName: string
): Promise<void> {
  await dispatchNotification(env, {
    workspaceId,
    type: 'invitation_accepted',
    severity: 'info',
    title: `${userName} accepted the invitation`,
    message: `${email} has accepted the workspace invitation.`,
    metadata: { email, userName },
  });
}

export async function notifyMemberLeft(
  env: StorageEnv,
  workspaceId: string,
  userName: string
): Promise<void> {
  await dispatchNotification(env, {
    workspaceId,
    type: 'member_left',
    severity: 'info',
    title: `${userName} was removed from the workspace`,
    message: `${userName} is no longer a member of this workspace.`,
    metadata: { userName },
  });
}

export async function notifyDeviceOnline(
  env: StorageEnv,
  workspaceId: string,
  deviceId: string,
  deviceName?: string
): Promise<void> {
  const label = deviceName || deviceId;
  await dispatchNotification(env, {
    workspaceId,
    type: 'device_online',
    severity: 'success',
    title: `Device "${label}" is online`,
    message: `Device ${label} has connected.`,
    metadata: { deviceId, deviceName },
  });
}

export async function notifyDeviceOffline(
  env: StorageEnv,
  workspaceId: string,
  deviceId: string,
  deviceName?: string
): Promise<void> {
  const label = deviceName || deviceId;
  await dispatchNotification(env, {
    workspaceId,
    type: 'device_offline',
    severity: 'warning',
    title: `Device "${label}" went offline`,
    message: `Device ${label} has disconnected.`,
    metadata: { deviceId, deviceName },
  });
}

export async function notifyWorkspaceActivity(
  env: StorageEnv,
  workspaceId: string,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await dispatchNotification(env, {
    workspaceId,
    type: 'system',
    severity: 'info',
    title,
    message,
    metadata,
  });
}

// ============================================================================
// Targeted Notification (single user, bypasses role fan-out)
// ============================================================================

export async function dispatchTargetedNotification(
  env: StorageEnv,
  payload: NotificationPayload & { targetUserId: string }
): Promise<void> {
  const { workspaceId, type, severity, title, message, metadata, targetUserId } = payload;
  const now = new Date().toISOString();
  const notificationId = crypto.randomUUID();

  const prefs = await get<UserNotificationPreferencesEntity>(
    env,
    `USER_NOTIF_PREFS#${targetUserId}`,
    `WS#${workspaceId}`
  );
  if (prefs?.disabledTypes?.includes(type)) return;

  const entity: UserNotificationEntity = {
    pk: `USER_NOTIF#${targetUserId}#${workspaceId}`,
    sk: `${now}#${notificationId}`,
    entityType: EntityTypes.NOTIFICATION,
    createdAt: now,
    updatedAt: now,
    notificationId,
    workspaceId,
    userId: targetUserId,
    type,
    severity,
    title,
    message,
    metadata,
    read: false,
  };
  await put(env, entity);
}

// ============================================================================
// Device CRUD Notifications
// ============================================================================

export async function notifyDeviceCreated(
  env: StorageEnv,
  workspaceId: string,
  deviceId: string,
  deviceName: string
): Promise<void> {
  await dispatchNotification(env, {
    workspaceId,
    type: 'device_created',
    severity: 'info',
    title: `Device "${deviceName}" created`,
    message: `A new device has been added to the workspace.`,
    metadata: { deviceId, deviceName },
  });
}

export async function notifyDeviceUpdated(
  env: StorageEnv,
  workspaceId: string,
  deviceId: string,
  deviceName: string
): Promise<void> {
  await dispatchNotification(env, {
    workspaceId,
    type: 'device_updated',
    severity: 'info',
    title: `Device "${deviceName}" updated`,
    message: `Device "${deviceName}" settings have been modified.`,
    metadata: { deviceId, deviceName },
  });
}

export async function notifyDeviceDeleted(
  env: StorageEnv,
  workspaceId: string,
  deviceId: string,
  deviceName: string
): Promise<void> {
  await dispatchNotification(env, {
    workspaceId,
    type: 'device_deleted',
    severity: 'warning',
    title: `Device "${deviceName}" deleted`,
    message: `Device "${deviceName}" has been removed from the workspace.`,
    metadata: { deviceId, deviceName },
  });
}

// ============================================================================
// Automation CRUD Notifications
// ============================================================================

export async function notifyAutomationCreated(
  env: StorageEnv,
  workspaceId: string,
  automationId: string,
  automationName: string
): Promise<void> {
  await dispatchNotification(env, {
    workspaceId,
    type: 'automation_created',
    severity: 'info',
    title: `Automation "${automationName}" created`,
    message: `A new automation rule has been added to the workspace.`,
    metadata: { automationId, automationName },
  });
}

export async function notifyAutomationUpdated(
  env: StorageEnv,
  workspaceId: string,
  automationId: string,
  automationName: string
): Promise<void> {
  await dispatchNotification(env, {
    workspaceId,
    type: 'automation_updated',
    severity: 'info',
    title: `Automation "${automationName}" updated`,
    message: `Automation rule "${automationName}" has been modified.`,
    metadata: { automationId, automationName },
  });
}

export async function notifyAutomationDeleted(
  env: StorageEnv,
  workspaceId: string,
  automationId: string,
  automationName: string
): Promise<void> {
  await dispatchNotification(env, {
    workspaceId,
    type: 'automation_deleted',
    severity: 'warning',
    title: `Automation "${automationName}" deleted`,
    message: `Automation rule "${automationName}" has been removed.`,
    metadata: { automationId, automationName },
  });
}

// ============================================================================
// Member Role Changed (dual dispatch: broadcast + targeted)
// ============================================================================

export async function notifyMemberRoleChanged(
  env: StorageEnv,
  workspaceId: string,
  targetUserId: string,
  userName: string,
  oldRole: MemberRole,
  newRole: MemberRole
): Promise<void> {
  // Broadcast to admins/owners, excluding the affected user to avoid duplicate
  await dispatchNotification(env, {
    workspaceId,
    type: 'member_role_changed',
    severity: 'info',
    title: `${userName}'s role changed to ${newRole}`,
    message: `${userName} was changed from ${oldRole} to ${newRole}.`,
    metadata: { userId: targetUserId, userName, oldRole, newRole },
  }, { excludeUserId: targetUserId });

  // Directly notify the affected user
  await dispatchTargetedNotification(env, {
    workspaceId,
    type: 'member_role_changed',
    severity: 'info',
    targetUserId,
    title: `Your role has been changed to ${newRole}`,
    message: `Your workspace role was updated from ${oldRole} to ${newRole}.`,
    metadata: { oldRole, newRole },
  });
}

// ============================================================================
// Invitation Notifications
// ============================================================================

export async function notifyInvitationCreated(
  env: StorageEnv,
  workspaceId: string,
  email: string,
  role: MemberRole
): Promise<void> {
  await dispatchNotification(env, {
    workspaceId,
    type: 'invitation_created',
    severity: 'info',
    title: `Invitation sent to ${email}`,
    message: `${email} was invited as ${role}.`,
    metadata: { email, role },
  });
}

export async function notifyInvitationDeclined(
  env: StorageEnv,
  workspaceId: string,
  email: string
): Promise<void> {
  await dispatchNotification(env, {
    workspaceId,
    type: 'invitation_declined',
    severity: 'info',
    title: `Invitation to ${email} was declined`,
    message: `${email} declined the workspace invitation.`,
    metadata: { email },
  });
}

// ============================================================================
// Workspace Updated
// ============================================================================

export async function notifyWorkspaceUpdated(
  env: StorageEnv,
  workspaceId: string,
  updatedFields: string[]
): Promise<void> {
  await dispatchNotification(env, {
    workspaceId,
    type: 'workspace_updated',
    severity: 'info',
    title: `Workspace settings updated`,
    message: `The following settings were changed: ${updatedFields.join(', ')}.`,
    metadata: { updatedFields },
  });
}

// ============================================================================
// API Key Notifications
// ============================================================================

export async function notifyApiKeyCreated(
  env: StorageEnv,
  workspaceId: string,
  keyName: string,
  keyPrefix: string
): Promise<void> {
  await dispatchNotification(env, {
    workspaceId,
    type: 'api_key_created',
    severity: 'info',
    title: `API key "${keyName}" created`,
    message: `A new workspace API key (${keyPrefix}...) has been created.`,
    metadata: { keyName, keyPrefix },
  });
}

export async function notifyApiKeyRevoked(
  env: StorageEnv,
  workspaceId: string,
  keyName: string,
  keyPrefix: string
): Promise<void> {
  await dispatchNotification(env, {
    workspaceId,
    type: 'api_key_revoked',
    severity: 'warning',
    title: `API key "${keyName}" revoked`,
    message: `Workspace API key (${keyPrefix}...) has been revoked.`,
    metadata: { keyName, keyPrefix },
  });
}
