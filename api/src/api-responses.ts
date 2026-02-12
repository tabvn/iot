/**
 * API Response helpers for consistent responses
 */

// ============================================================================
// Response Types - These should match frontend api.ts types
// ============================================================================

export interface ApiUser {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface ApiWorkspace {
  workspaceId: string;
  name: string;
  slug: string;
  description?: string;
  ownerUserId: string;
  plan?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ApiWorkspaceMember {
  userId: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  role: string;
  devicePermissions?: Record<string, string[]>;
  createdAt: string;
}

export interface ApiDevice {
  deviceId: string;
  workspaceId: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'error';
  description?: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  location?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  fieldMappings?: ApiDeviceFieldMapping[];
  lastSeenAt?: string;
  lastData?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ApiDeviceFieldMapping {
  sourceField: string;
  displayLabel: string;
  dataType: 'number' | 'string' | 'boolean' | 'json';
  unit?: string;
  min?: number;
  max?: number;
  precision?: number;
  icon?: string;
  color?: string;
}

export interface ApiInvitation {
  invitationId: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  email: string;
  role: string;
  devicePermissions?: Record<string, string[]>;
  invitedByUserId: string;
  invitedByName?: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
}

export interface ApiAutomation {
  automationId: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: string;
  triggerType: string;
  triggerConfig: unknown;
  conditionGroups?: unknown[];
  conditionLogic?: string;
  actions: unknown[];
  lastTriggeredAt?: string;
  executionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiNotification {
  notificationId: string;
  workspaceId: string;
  userId: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface ApiSession {
  sessionId: string;
  userId: string;
  expiresAt: string;
  token?: string;
}

export interface ApiPlan {
  workspaceId: string;
  plan: string;
  maxDevices?: number;
  maxMembers?: number;
  maxAutomations?: number;
  dataRetentionDays?: number;
}

export interface ApiBillingInvoice {
  invoiceId: string;
  workspaceId: string;
  amount: number;
  status: string;
  period: string;
  paidAt?: string;
  createdAt: string;
}

export interface ApiApiKey {
  apiKeyId: string;
  workspaceId: string;
  name: string;
  keyPrefix: string;
  revokedAt?: string;
  lastUsedAt?: string;
  createdAt: string;
}

// ============================================================================
// JSON Response Helpers
// ============================================================================

export function jsonResponse<T>(data: T, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function successResponse<T>(data: T): Response {
  return jsonResponse(data, 200);
}

export function createdResponse<T>(data: T): Response {
  return jsonResponse(data, 201);
}

export function errorResponse(error: string, status: number = 400): Response {
  return jsonResponse({ error }, status);
}

export function notFoundResponse(message: string = 'Not found'): Response {
  return errorResponse(message, 404);
}

export function unauthorizedResponse(message: string = 'Unauthorized'): Response {
  return errorResponse(message, 401);
}

export function forbiddenResponse(message: string = 'Forbidden'): Response {
  return errorResponse(message, 403);
}

export function badRequestResponse(message: string): Response {
  return errorResponse(message, 400);
}

export function conflictResponse(message: string): Response {
  return errorResponse(message, 409);
}

export function internalErrorResponse(message: string = 'Internal server error'): Response {
  return errorResponse(message, 500);
}

// ============================================================================
// Entity to API Response Converters
// ============================================================================

import type {
  UserEntity,
  WorkspaceEntity,
  WorkspaceMemberEntity,
  DeviceEntity,
  WorkspaceInvitationEntity,
  AutomationEntity,
  UserNotificationEntity,
  WorkspacePlanEntity,
  WorkspaceBillingEntity,
  WorkspaceApiKeyEntity,
  SessionEntity,
} from '@/db/types';

export function toApiUser(entity: UserEntity): ApiUser {
  return {
    userId: entity.userId,
    name: entity.name,
    email: entity.email,
    avatarUrl: entity.avatarUrl,
    createdAt: entity.createdAt,
  };
}

export function toApiWorkspace(entity: WorkspaceEntity): ApiWorkspace {
  return {
    workspaceId: entity.workspaceId,
    name: entity.name,
    slug: entity.slug,
    description: entity.description,
    ownerUserId: entity.ownerUserId,
    plan: entity.plan,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toApiMember(
  entity: WorkspaceMemberEntity,
  user?: UserEntity | null
): ApiWorkspaceMember {
  return {
    userId: entity.userId,
    name: user?.name,
    email: user?.email,
    avatarUrl: user?.avatarUrl,
    role: entity.role,
    devicePermissions: entity.devicePermissions,
    createdAt: entity.createdAt,
  };
}

export function toApiDevice(entity: DeviceEntity): ApiDevice {
  return {
    deviceId: entity.deviceId,
    workspaceId: entity.workspaceId,
    name: entity.name,
    type: entity.type,
    status: entity.status,
    description: entity.description,
    manufacturer: entity.manufacturer,
    model: entity.model,
    firmwareVersion: entity.firmwareVersion,
    location: entity.location,
    tags: entity.tags,
    metadata: entity.metadata,
    fieldMappings: entity.fieldMappings,
    lastSeenAt: entity.lastSeenAt,
    lastData: entity.lastData,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toApiInvitation(entity: WorkspaceInvitationEntity): ApiInvitation {
  return {
    invitationId: entity.invitationId,
    workspaceId: entity.workspaceId,
    workspaceName: entity.workspaceName,
    workspaceSlug: entity.workspaceSlug,
    email: entity.email,
    role: entity.role,
    devicePermissions: entity.devicePermissions,
    invitedByUserId: entity.invitedByUserId,
    invitedByName: entity.invitedByName,
    status: entity.status,
    expiresAt: entity.expiresAt,
    createdAt: entity.createdAt,
    acceptedAt: entity.acceptedAt,
  };
}

export function toApiAutomation(entity: AutomationEntity): ApiAutomation {
  return {
    automationId: entity.automationId,
    workspaceId: entity.workspaceId,
    name: entity.name,
    description: entity.description,
    status: entity.status,
    triggerType: entity.triggerType,
    triggerConfig: entity.triggerConfig,
    conditionGroups: entity.conditionGroups,
    conditionLogic: entity.conditionLogic,
    actions: entity.actions,
    lastTriggeredAt: entity.lastTriggeredAt,
    executionCount: entity.executionCount,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toApiNotification(entity: UserNotificationEntity): ApiNotification {
  return {
    notificationId: entity.notificationId,
    workspaceId: entity.workspaceId,
    userId: entity.userId,
    type: entity.type,
    severity: entity.severity,
    title: entity.title,
    message: entity.message,
    metadata: entity.metadata,
    read: entity.read,
    readAt: entity.readAt,
    createdAt: entity.createdAt,
  };
}

export function toApiPlan(entity: WorkspacePlanEntity): ApiPlan {
  return {
    workspaceId: entity.workspaceId,
    plan: entity.plan,
    maxDevices: entity.maxDevices,
    maxMembers: entity.maxMembers,
    maxAutomations: entity.maxAutomations,
    dataRetentionDays: entity.dataRetentionDays,
  };
}

export function toApiBillingInvoice(entity: WorkspaceBillingEntity): ApiBillingInvoice {
  return {
    invoiceId: entity.invoiceId,
    workspaceId: entity.workspaceId,
    amount: entity.amount,
    status: entity.status,
    period: entity.period,
    paidAt: entity.paidAt,
    createdAt: entity.createdAt,
  };
}

export function toApiApiKey(entity: WorkspaceApiKeyEntity): ApiApiKey {
  return {
    apiKeyId: entity.apiKeyId,
    workspaceId: entity.workspaceId,
    name: entity.name,
    keyPrefix: entity.keyPrefix,
    revokedAt: entity.revokedAt,
    lastUsedAt: entity.lastUsedAt,
    createdAt: entity.createdAt,
  };
}

export function toApiSession(entity: SessionEntity, token?: string): ApiSession {
  return {
    sessionId: entity.sessionId,
    userId: entity.userId,
    expiresAt: entity.expiresAt,
    token,
  };
}

