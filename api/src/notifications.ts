import type { StorageEnv } from '@/db/storage';
import { put, queryByPk, get } from '@/db/storage';
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
  automation_triggered: ['owner', 'admin', 'editor'],
  automation_failed: ['owner', 'admin'],
  automation_partial_failure: ['owner', 'admin'],
  member_joined: ['owner', 'admin'],
  member_left: ['owner', 'admin'],
  invitation_accepted: ['owner', 'admin'],
  device_offline: ['owner', 'admin', 'editor', 'viewer'],
  device_online: ['owner', 'admin', 'editor', 'viewer'],
  system: ['owner', 'admin', 'editor', 'viewer'],
};

export async function dispatchNotification(
  env: StorageEnv,
  payload: NotificationPayload
): Promise<void> {
  const { workspaceId, type, severity, title, message, metadata } = payload;
  const now = new Date().toISOString();
  const notificationId = crypto.randomUUID();

  const wsResult = await queryByPk(env, `WS#${workspaceId}`);
  const members = wsResult.items.filter(
    (e): e is WorkspaceMemberEntity => e.sk?.startsWith('MEMBER#') === true && e.entityType === 'WORKSPACE'
  );

  const eligibleRoles = ROLE_VISIBILITY[type] ?? ['owner', 'admin'];

  const writes: Promise<void>[] = [];
  for (const member of members) {
    if (!eligibleRoles.includes(member.role)) continue;

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
