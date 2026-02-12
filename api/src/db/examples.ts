/**
 * Database Module Usage Examples
 *
 * This file demonstrates how to use the new repository pattern
 * for all CRUD operations.
 */

import { createRepositories, type Repositories } from './repositories';
import type { StorageEnv } from './storage';

// ============================================================================
// Setup
// ============================================================================

// Create all repositories from environment
function getDB(env: StorageEnv): Repositories {
  return createRepositories(env);
}

// ============================================================================
// User Examples
// ============================================================================

async function userExamples(env: StorageEnv) {
  const db = getDB(env);

  // Create a user
  const user = await db.users.create({
    name: 'John Doe',
    email: 'john@example.com',
    passwordHash: 'hashedPassword123',
  });
  console.log('Created user:', user.userId);

  // Get user by ID
  const foundUser = await db.users.getById(user.userId);
  console.log('Found user:', foundUser?.name);

  // Get user by email
  const userByEmail = await db.users.getByEmail('john@example.com');
  console.log('User by email:', userByEmail?.name);

  // Update user
  const updatedUser = await db.users.update(user.userId, {
    name: 'John Smith',
  });
  console.log('Updated user:', updatedUser?.name);

  // Check if email exists
  const emailExists = await db.users.emailExists('john@example.com');
  console.log('Email exists:', emailExists);

  // Verify password
  const verified = await db.users.verifyPassword('john@example.com', 'hashedPassword123');
  console.log('Password verified:', verified !== null);

  // Delete user
  await db.users.delete(user.userId);
  console.log('User deleted');
}

// ============================================================================
// Workspace Examples
// ============================================================================

async function workspaceExamples(env: StorageEnv) {
  const db = getDB(env);

  // Create workspace
  const workspace = await db.workspaces.create({
    ownerUserId: 'user-123',
    name: 'My Workspace',
    slug: 'my-workspace',
    description: 'A test workspace',
  });
  console.log('Created workspace:', workspace.workspaceId);

  // Get by ID
  const ws = await db.workspaces.getById(workspace.workspaceId);
  console.log('Found workspace:', ws?.name);

  // Get by slug
  const wsBySlug = await db.workspaces.getBySlug('my-workspace');
  console.log('Workspace by slug:', wsBySlug?.name);

  // Get all workspaces for a user
  const userWorkspaces = await db.workspaces.getByUserId('user-123');
  console.log('User workspaces:', userWorkspaces.length);

  // Update workspace
  const updated = await db.workspaces.update(workspace.workspaceId, {
    name: 'Updated Workspace Name',
  });
  console.log('Updated:', updated?.name);

  // Delete workspace
  await db.workspaces.delete(workspace.workspaceId);
}

// ============================================================================
// Member Examples
// ============================================================================

async function memberExamples(env: StorageEnv) {
  const db = getDB(env);

  // Add member to workspace
  const member = await db.members.add({
    workspaceId: 'ws-123',
    userId: 'user-456',
    role: 'editor',
    devicePermissions: {
      'device-1': ['view', 'control'],
    },
  });
  console.log('Added member:', member.userId);

  // Check if user is member
  const isMember = await db.members.isMember('ws-123', 'user-456');
  console.log('Is member:', isMember);

  // Get member
  const foundMember = await db.members.get('ws-123', 'user-456');
  console.log('Member role:', foundMember?.role);

  // Update member role
  await db.members.update('ws-123', 'user-456', { role: 'admin' });

  // Get all members of workspace
  const allMembers = await db.members.getAllByWorkspace('ws-123');
  console.log('Total members:', allMembers.length);

  // Remove member
  await db.members.remove('ws-123', 'user-456');
}

// ============================================================================
// Device Examples
// ============================================================================

async function deviceExamples(env: StorageEnv) {
  const db = getDB(env);

  // Create device
  const device = await db.devices.create({
    workspaceId: 'ws-123',
    name: 'Temperature Sensor',
    type: 'sensor',
    description: 'Living room temperature sensor',
    fieldMappings: [
      {
        sourceField: 'temp',
        displayLabel: 'Temperature',
        dataType: 'number',
        unit: '°C',
      },
    ],
  });
  console.log('Created device:', device.deviceId);

  // Get device
  const foundDevice = await db.devices.getById('ws-123', device.deviceId);
  console.log('Found device:', foundDevice?.name);

  // Update device status
  await db.devices.updateStatus('ws-123', device.deviceId, 'online');

  // Update device with latest data
  await db.devices.updateLastData('ws-123', device.deviceId, {
    temp: 22.5,
    humidity: 45,
  });

  // Get all devices in workspace
  const result = await db.devices.getAllByWorkspace('ws-123');
  console.log('Total devices:', result.items.length);

  // Get devices by status
  const onlineDevices = await db.devices.getByStatus('ws-123', 'online');
  console.log('Online devices:', onlineDevices.length);

  // Delete device
  await db.devices.delete('ws-123', device.deviceId);
}

// ============================================================================
// Device Data Examples
// ============================================================================

async function deviceDataExamples(env: StorageEnv) {
  const db = getDB(env);

  // Save device data
  const data = await db.deviceData.save({
    deviceId: 'device-123',
    workspaceId: 'ws-123',
    data: { temp: 22.5, humidity: 45 },
    ttlDays: 30, // Auto-expire after 30 days
  });
  console.log('Saved data at:', data.timestamp);

  // Get latest data
  const latest = await db.deviceData.getLatest('device-123', 10);
  console.log('Latest data points:', latest.length);

  // Get data by time range
  const rangeData = await db.deviceData.getByTimeRange(
    'device-123',
    '2026-02-01T00:00:00Z',
    '2026-02-10T23:59:59Z'
  );
  console.log('Data in range:', rangeData.items.length);

  // Delete old data
  const deleted = await db.deviceData.deleteOlderThan(
    'device-123',
    '2026-01-01T00:00:00Z'
  );
  console.log('Deleted old records:', deleted);
}

// ============================================================================
// Automation Examples
// ============================================================================

async function automationExamples(env: StorageEnv) {
  const db = getDB(env);

  // Create automation
  const automation = await db.automations.create({
    workspaceId: 'ws-123',
    name: 'High Temperature Alert',
    description: 'Send alert when temperature exceeds 30°C',
    triggerType: 'device_data',
    triggerConfig: {
      type: 'device_data',
      deviceId: 'device-123',
      logic: 'AND',
      conditions: [
        { field: 'temp', operator: 'greater_than', value: 30 },
      ],
    },
    actions: [
      {
        type: 'send_email',
        to: 'admin@example.com',
        subject: 'High Temperature Alert',
        body: 'Temperature exceeded 30°C',
      },
    ],
  });
  console.log('Created automation:', automation.automationId);

  // Get automation
  const found = await db.automations.getById('ws-123', automation.automationId);
  console.log('Found automation:', found?.name);

  // Update status
  await db.automations.updateStatus('ws-123', automation.automationId, 'paused');

  // Get active automations
  const active = await db.automations.getActiveByWorkspace('ws-123');
  console.log('Active automations:', active.length);

  // Get automations by trigger type
  const dataAutomations = await db.automations.getByTriggerType('ws-123', 'device_data');
  console.log('Data trigger automations:', dataAutomations.length);

  // Delete automation
  await db.automations.delete('ws-123', automation.automationId);
}

// ============================================================================
// Invitation Examples
// ============================================================================

async function invitationExamples(env: StorageEnv) {
  const db = getDB(env);

  // Create invitation
  const invitation = await db.invitations.create({
    workspaceId: 'ws-123',
    workspaceName: 'My Workspace',
    workspaceSlug: 'my-workspace',
    email: 'newuser@example.com',
    role: 'editor',
    invitedByUserId: 'user-123',
    invitedByName: 'Admin User',
  });
  console.log('Created invitation, token:', invitation.token);

  // Get by token (for acceptance)
  const byToken = await db.invitations.getByToken(invitation.token);
  console.log('Found by token:', byToken?.email);

  // Accept invitation
  await db.invitations.updateStatus('ws-123', invitation.invitationId, 'accepted', 'new-user-id');

  // Get all invitations for workspace
  const all = await db.invitations.getAllByWorkspace('ws-123');
  console.log('Total invitations:', all.length);

  // Get pending invitations for email
  const pending = await db.invitations.getPendingByEmail('newuser@example.com');
  console.log('Pending for email:', pending.length);
}

// ============================================================================
// Session Examples
// ============================================================================

async function sessionExamples(env: StorageEnv) {
  const db = getDB(env);

  // Create session
  const session = await db.sessions.create('user-123', 24); // 24 hours
  console.log('Created session:', session.sessionId);

  // Get session
  const found = await db.sessions.get('user-123', session.sessionId);
  console.log('Session valid:', found !== null);

  // Delete session (logout)
  await db.sessions.delete('user-123', session.sessionId);

  // Delete all sessions for user
  await db.sessions.deleteAllForUser('user-123');
}

// ============================================================================
// Notification Examples
// ============================================================================

async function notificationExamples(env: StorageEnv) {
  const db = getDB(env);

  // Create notification
  const notification = await db.notifications.create({
    workspaceId: 'ws-123',
    userId: 'user-123',
    type: 'device_offline',
    severity: 'warning',
    title: 'Device Offline',
    message: 'Temperature sensor went offline',
    metadata: { deviceId: 'device-123' },
  });
  console.log('Created notification:', notification.notificationId);

  // Get unread notifications
  const unread = await db.notifications.getUnread('user-123', 'ws-123');
  console.log('Unread notifications:', unread.length);

  // Mark as read
  await db.notifications.markAsRead(
    'user-123',
    'ws-123',
    notification.notificationId,
    notification.createdAt
  );

  // Get all notifications with pagination
  const all = await db.notifications.getAll('user-123', 'ws-123', { limit: 20 });
  console.log('Total notifications:', all.items.length);
  console.log('Has more:', all.hasMore);
}

// ============================================================================
// API Key Examples
// ============================================================================

async function apiKeyExamples(env: StorageEnv) {
  const db = getDB(env);

  // Create workspace API key
  const { entity, key } = await db.apiKeys.createWorkspaceKey('ws-123', 'Production API Key');
  console.log('Created API key:', key);
  console.log('Key prefix:', entity.keyPrefix);

  // Validate key (lookup by hash)
  const found = await db.apiKeys.getByHash(entity.keyHash);
  console.log('Key valid:', found !== null && !found.revokedAt);

  // Get all keys for workspace
  const allKeys = await db.apiKeys.getAllByWorkspace('ws-123');
  console.log('Total keys:', allKeys.length);

  // Revoke key
  await db.apiKeys.revoke('ws-123', entity.apiKeyId);
  console.log('Key revoked');
}

// Export for use
export {
  userExamples,
  workspaceExamples,
  memberExamples,
  deviceExamples,
  deviceDataExamples,
  automationExamples,
  invitationExamples,
  sessionExamples,
  notificationExamples,
  apiKeyExamples,
};


