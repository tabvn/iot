/**
 * Core entity types and interfaces for the IoT platform
 * Single-table design with PK/SK pattern for R2 storage
 */

// ============================================================================
// Core Types
// ============================================================================

export type PK = string;
export type SK = string;
export type ISOTimestamp = string;
export type UUID = string;

// ============================================================================
// Entity Type Enum
// ============================================================================

export const EntityTypes = {
  USER: 'USER',
  USER_EMAIL: 'USER-EMAIL',
  WORKSPACE: 'WORKSPACE',
  DEVICE: 'DEVICE',
  DEVICE_DATA: 'DEVICE_DATA',
  SESSION: 'SESSION',
  AUTOMATION: 'AUTOMATION',
  API_KEY: 'API_KEY',
  DEVICE_API_KEY: 'DEVICE_API_KEY',
  SUPER_MASTER_KEY: 'SUPER_MASTER_KEY',
  INVITATION: 'INVITATION',
  AUTOMATION_LOG: 'AUTOMATION_LOG',
  NOTIFICATION: 'NOTIFICATION',
} as const;

export type EntityType = typeof EntityTypes[keyof typeof EntityTypes];

// ============================================================================
// Base Entity
// ============================================================================

export interface BaseEntity {
  pk: PK;
  sk: SK;
  entityType: EntityType;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
  deletedAt?: ISOTimestamp; // Soft delete support
  version?: number; // Optimistic locking
}

// ============================================================================
// User Entities
// ============================================================================

export interface UserEntity extends BaseEntity {
  entityType: typeof EntityTypes.USER;
  userId: UUID;
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
}

export interface UserEmailIndexEntity extends BaseEntity {
  entityType: typeof EntityTypes.USER_EMAIL;
  userId: UUID;
  email: string;
  passwordHash: string;
}

// Alias for backward compatibility
export type UserEmailEntity = UserEmailIndexEntity;

// ============================================================================
// Workspace Entities
// ============================================================================

export type WorkspacePlan = 'starter' | 'professional' | 'business' | 'enterprise';

export interface WorkspaceEntity extends BaseEntity {
  entityType: typeof EntityTypes.WORKSPACE;
  workspaceId: UUID;
  ownerUserId: UUID;
  name: string;
  slug: string;
  description?: string;
  plan?: WorkspacePlan;
}

export type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type DevicePermission = 'view' | 'control' | 'manage';

export interface WorkspaceMemberEntity extends BaseEntity {
  entityType: typeof EntityTypes.WORKSPACE;
  workspaceId: UUID;
  userId: UUID;
  role: MemberRole;
  devicePermissions?: Record<string, DevicePermission[]>;
}

export interface WorkspacePlanEntity extends BaseEntity {
  entityType: typeof EntityTypes.WORKSPACE;
  workspaceId: UUID;
  plan: WorkspacePlan;
  maxDevices: number;
  maxMembers: number;
  maxAutomations: number;
  dataRetentionDays: number;
}

export interface WorkspaceBillingEntity extends BaseEntity {
  entityType: typeof EntityTypes.WORKSPACE;
  workspaceId: UUID;
  invoiceId: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  period: string;
  paidAt?: ISOTimestamp;
}

// ============================================================================
// Device Entities
// ============================================================================

export type DeviceStatus = 'online' | 'offline' | 'error';

export interface DeviceFieldMapping {
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

export interface DeviceEntity extends BaseEntity {
  entityType: typeof EntityTypes.DEVICE;
  deviceId: UUID;
  workspaceId: UUID;
  name: string;
  type: string;
  status: DeviceStatus;
  description?: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  location?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  fieldMappings?: DeviceFieldMapping[];
  lastSeenAt?: ISOTimestamp;
  lastData?: Record<string, unknown>;
}

export interface DeviceDataEntity extends BaseEntity {
  entityType: typeof EntityTypes.DEVICE_DATA;
  deviceId: UUID;
  workspaceId: UUID;
  timestamp: ISOTimestamp;
  data: Record<string, unknown>;
  ttl?: ISOTimestamp; // For data expiration
}

// ============================================================================
// Session Entity
// ============================================================================

export interface SessionEntity extends BaseEntity {
  entityType: typeof EntityTypes.SESSION;
  sessionId: UUID;
  userId: UUID;
  expiresAt: ISOTimestamp;
  userAgent?: string;
  ipAddress?: string;
}

// ============================================================================
// Automation Entities
// ============================================================================

export type AutomationStatus = 'active' | 'paused' | 'disabled';
export type AutomationTriggerType = 'device_data' | 'device_status' | 'schedule' | 'interval';

export interface DeviceDataCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' |
            'greater_than_or_equal' | 'less_than_or_equal' | 'contains' | 'not_contains';
  value: any; // Using any for backward compatibility with existing code
}

export interface DeviceDataTriggerConfig {
  type: 'device_data';
  deviceId: UUID;
  logic: 'AND' | 'OR';
  conditions: DeviceDataCondition[];
}

export interface DeviceStatusTriggerConfig {
  type: 'device_status';
  deviceId: UUID;
  status: DeviceStatus;
}

export interface ScheduleTriggerConfig {
  type: 'schedule';
  cron: string;
  timezone?: string;
}

export interface IntervalTriggerConfig {
  type: 'interval';
  intervalSeconds: number;
  startAt?: ISOTimestamp;
}

export type AutomationTriggerConfig =
  | DeviceDataTriggerConfig
  | DeviceStatusTriggerConfig
  | ScheduleTriggerConfig
  | IntervalTriggerConfig;

export type AutomationActionType =
  | 'send_webhook'
  | 'send_email'
  | 'send_sms'
  | 'update_device'
  | 'delay'
  | 'log';

export interface BaseActionConfig {
  type: AutomationActionType;
  delayMs?: number;
}

export interface SendWebhookActionConfig extends BaseActionConfig {
  type: 'send_webhook';
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  bodyTemplate?: Record<string, unknown>;
}

export interface UpdateDeviceActionConfig extends BaseActionConfig {
  type: 'update_device';
  targetDeviceId: UUID;
  field: string;
  value: unknown;
}

export interface SendEmailActionConfig extends BaseActionConfig {
  type: 'send_email';
  to: string;
  subject: string;
  body: string;
}

export interface DelayActionConfig extends BaseActionConfig {
  type: 'delay';
  delaySeconds: number;
}

export interface LogActionConfig extends BaseActionConfig {
  type: 'log';
  message: string;
}

export type AutomationActionConfig =
  | SendWebhookActionConfig
  | UpdateDeviceActionConfig
  | SendEmailActionConfig
  | DelayActionConfig
  | LogActionConfig;

export interface AutomationConditionGroup {
  logic: 'AND' | 'OR';
  conditions: DeviceDataCondition[];
  deviceId: UUID;
}

export interface AutomationEntity extends BaseEntity {
  entityType: typeof EntityTypes.AUTOMATION;
  workspaceId: UUID;
  automationId: UUID;
  name: string;
  description?: string;
  status: AutomationStatus;
  triggerType: AutomationTriggerType;
  triggerConfig: AutomationTriggerConfig;
  conditionGroups?: AutomationConditionGroup[];
  conditionLogic?: 'AND' | 'OR';
  actions: AutomationActionConfig[];
  lastTriggeredAt?: ISOTimestamp;
  executionCount?: number;
}

// ============================================================================
// API Key Entities
// ============================================================================

export interface WorkspaceApiKeyEntity extends BaseEntity {
  entityType: typeof EntityTypes.API_KEY;
  apiKeyId: UUID;
  workspaceId: UUID;
  name: string;
  keyHash: string;
  keyPrefix: string;
  revokedAt?: ISOTimestamp;
  lastUsedAt?: ISOTimestamp;
}

export interface DeviceApiKeyEntity extends BaseEntity {
  entityType: typeof EntityTypes.DEVICE_API_KEY;
  deviceApiKeyId: UUID;
  workspaceId: UUID;
  deviceId: UUID;
  name: string;
  keyHash: string;
  keyPrefix: string;
  revokedAt?: ISOTimestamp;
  lastUsedAt?: ISOTimestamp;
}

export interface SuperMasterKeyEntity extends BaseEntity {
  entityType: typeof EntityTypes.SUPER_MASTER_KEY;
  keyId: UUID;
  name: string;
  keyHash: string;
  keyPrefix: string;
  revokedAt?: ISOTimestamp;
  lastUsedAt?: ISOTimestamp;
}

export interface ApiKeyHashIndexEntity extends BaseEntity {
  entityType: typeof EntityTypes.API_KEY;
  keyType: 'workspace' | 'device' | 'super_master';
  workspaceId?: UUID;
  deviceId?: UUID;
  keyId: UUID;
  revokedAt?: ISOTimestamp;
}

// ============================================================================
// Invitation Entities
// ============================================================================

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface WorkspaceInvitationEntity extends BaseEntity {
  entityType: typeof EntityTypes.INVITATION;
  invitationId: UUID;
  workspaceId: UUID;
  workspaceName: string;
  workspaceSlug: string;
  email: string;
  role: MemberRole;
  devicePermissions?: Record<string, DevicePermission[]>;
  invitedByUserId: UUID;
  invitedByName?: string;
  status: InvitationStatus;
  token: string;
  expiresAt: ISOTimestamp;
  acceptedAt?: ISOTimestamp;
  acceptedByUserId?: UUID;
}

export interface InvitationEmailIndexEntity extends BaseEntity {
  entityType: typeof EntityTypes.INVITATION;
  invitationId: UUID;
  workspaceId: UUID;
  email: string;
  status: InvitationStatus;
}

export interface InvitationTokenIndexEntity extends BaseEntity {
  entityType: typeof EntityTypes.INVITATION;
  invitationId: UUID;
  workspaceId: UUID;
  token: string;
}

// ============================================================================
// Automation Log Entities
// ============================================================================

export type AutomationLogStatus = 'success' | 'partial_failure' | 'failure';

export interface ActionExecutionResult {
  actionIndex: number;
  actionType: AutomationActionType;
  status: 'success' | 'failure';
  error?: string;
  durationMs: number;
}

export interface AutomationLogEntity extends BaseEntity {
  entityType: typeof EntityTypes.AUTOMATION_LOG;
  logId: UUID;
  workspaceId: UUID;
  automationId: UUID;
  automationName: string;
  triggerType: AutomationTriggerType;
  triggerData: Record<string, unknown>;
  conditionsMatched: boolean;
  status: AutomationLogStatus;
  actionResults: ActionExecutionResult[];
  totalDurationMs: number;
  expiresAt?: ISOTimestamp;
}

export interface AutomationLogIndexEntity extends BaseEntity {
  entityType: typeof EntityTypes.AUTOMATION_LOG;
  logId: UUID;
  workspaceId: UUID;
  automationId: UUID;
  status: AutomationLogStatus;
  totalDurationMs: number;
}

export interface AutomationStatsEntity extends BaseEntity {
  entityType: typeof EntityTypes.AUTOMATION_LOG;
  workspaceId: UUID;
  automationId: UUID;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  partialFailureCount: number;
  lastExecutionAt: ISOTimestamp | null;
  lastExecutionStatus: AutomationLogStatus | null;
  totalDurationMs: number;
}

// ============================================================================
// Notification Entities
// ============================================================================

export type NotificationType =
  | 'automation_triggered'
  | 'automation_failed'
  | 'automation_partial_failure'
  | 'member_joined'
  | 'member_left'
  | 'invitation_accepted'
  | 'device_offline'
  | 'device_online'
  | 'system';

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';

export interface UserNotificationEntity extends BaseEntity {
  entityType: typeof EntityTypes.NOTIFICATION;
  notificationId: UUID;
  workspaceId: UUID;
  userId: UUID;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  readAt?: ISOTimestamp;
  expiresAt?: ISOTimestamp;
}

export interface UserNotificationPreferencesEntity extends BaseEntity {
  entityType: typeof EntityTypes.NOTIFICATION;
  userId: UUID;
  workspaceId: UUID;
  disabledTypes: NotificationType[];
  emailEnabled: boolean;
  pushEnabled?: boolean;
}

// ============================================================================
// Union Type for All Entities
// ============================================================================

export type AnyEntity =
  | UserEntity
  | UserEmailIndexEntity
  | WorkspaceEntity
  | WorkspaceMemberEntity
  | WorkspacePlanEntity
  | WorkspaceBillingEntity
  | DeviceEntity
  | DeviceDataEntity
  | SessionEntity
  | AutomationEntity
  | WorkspaceApiKeyEntity
  | DeviceApiKeyEntity
  | SuperMasterKeyEntity
  | ApiKeyHashIndexEntity
  | WorkspaceInvitationEntity
  | InvitationEmailIndexEntity
  | InvitationTokenIndexEntity
  | AutomationLogEntity
  | AutomationLogIndexEntity
  | AutomationStatsEntity
  | UserNotificationEntity
  | UserNotificationPreferencesEntity;

// ============================================================================
// Key Generation Helpers
// ============================================================================

export const Keys = {
  // User keys
  user: (userId: UUID) => ({ pk: `USER#${userId}`, sk: `PROFILE#${userId}` }),
  userEmail: (email: string) => ({ pk: `USER_EMAIL#${email.toLowerCase()}`, sk: `PROFILE` }),

  // Workspace keys
  workspace: (workspaceId: UUID) => ({ pk: `WS#${workspaceId}`, sk: 'METADATA' }),
  workspaceAlias: (slug: string) => ({ pk: `WS_ALIAS#${slug.toLowerCase()}`, sk: 'METADATA' }),
  workspaceMember: (workspaceId: UUID, userId: UUID) => ({ pk: `WS#${workspaceId}`, sk: `MEMBER#${userId}` }),
  workspacePlan: (workspaceId: UUID) => ({ pk: `WS#${workspaceId}`, sk: 'PLAN#current' }),
  workspaceBilling: (workspaceId: UUID, invoiceId: string) => ({ pk: `WS#${workspaceId}`, sk: `BILLING#${invoiceId}` }),
  userWorkspace: (userId: UUID, workspaceId: UUID) => ({ pk: `USER#${userId}`, sk: `WS#${workspaceId}` }),

  // Device keys
  device: (workspaceId: UUID, deviceId: UUID) => ({ pk: `WS#${workspaceId}`, sk: `DEVICE#${deviceId}` }),
  deviceData: (deviceId: UUID, timestamp: ISOTimestamp) => ({ pk: `DEV_DATA#${deviceId}`, sk: `TS#${timestamp}` }),
  deviceDataByHour: (deviceId: UUID, hourBucket: string) => ({ pk: `DEV_DATA#${deviceId}`, sk: `HOUR#${hourBucket}` }),

  // Session keys
  session: (userId: UUID, sessionId: UUID) => ({ pk: `USER#${userId}`, sk: `SESSION#${sessionId}` }),

  // Automation keys
  automation: (workspaceId: UUID, automationId: UUID) => ({ pk: `WS#${workspaceId}`, sk: `AUTO#${automationId}` }),
  automationLog: (workspaceId: UUID, timestamp: ISOTimestamp, logId: UUID) => ({
    pk: `AUTO_LOG#${workspaceId}`, sk: `${timestamp}#${logId}`
  }),
  automationLogIndex: (automationId: UUID, timestamp: ISOTimestamp, logId: UUID) => ({
    pk: `AUTO_LOG_IDX#${automationId}`, sk: `${timestamp}#${logId}`
  }),
  automationStats: (workspaceId: UUID, automationId: UUID) => ({
    pk: `WS#${workspaceId}`, sk: `AUTO_STATS#${automationId}`
  }),

  // API Key keys
  workspaceApiKey: (workspaceId: UUID, apiKeyId: UUID) => ({ pk: `WS#${workspaceId}`, sk: `API_KEY#${apiKeyId}` }),
  deviceApiKey: (workspaceId: UUID, deviceId: UUID) => ({ pk: `WS#${workspaceId}`, sk: `DEV_KEY#${deviceId}` }),
  superMasterKey: (keyId: UUID) => ({ pk: 'SUPER_MASTER_KEYS', sk: `KEY#${keyId}` }),
  apiKeyHashIndex: (keyHash: string) => ({ pk: 'KEY_HASH_IDX', sk: `HASH#${keyHash}` }),

  // Invitation keys
  invitation: (workspaceId: UUID, invitationId: UUID) => ({ pk: `WS#${workspaceId}`, sk: `INVITE#${invitationId}` }),
  invitationByEmail: (email: string, invitationId: UUID) => ({ pk: 'INVITE_EMAIL_IDX', sk: `EMAIL#${email.toLowerCase()}#${invitationId}` }),
  invitationByToken: (token: string) => ({ pk: 'INVITE_TOKEN_IDX', sk: `TOKEN#${token}` }),

  // Notification keys
  userNotification: (userId: UUID, workspaceId: UUID, timestamp: ISOTimestamp, notificationId: UUID) => ({
    pk: `USER_NOTIF#${userId}#${workspaceId}`, sk: `${timestamp}#${notificationId}`
  }),
  userNotificationPrefs: (userId: UUID, workspaceId: UUID) => ({
    pk: `USER_NOTIF_PREFS#${userId}`, sk: `WS#${workspaceId}`
  }),

  // Index prefixes for queries
  prefixes: {
    workspaceMembers: (workspaceId: UUID) => `WS#${workspaceId}#MEMBER#`,
    workspaceDevices: (workspaceId: UUID) => `WS#${workspaceId}#DEVICE#`,
    workspaceAutomations: (workspaceId: UUID) => `WS#${workspaceId}#AUTO#`,
    workspaceApiKeys: (workspaceId: UUID) => `WS#${workspaceId}#API_KEY#`,
    workspaceInvitations: (workspaceId: UUID) => `WS#${workspaceId}#INVITE#`,
    userSessions: (userId: UUID) => `USER#${userId}#SESSION#`,
    userWorkspaces: (userId: UUID) => `USER#${userId}#WS#`,
    deviceData: (deviceId: UUID) => `DEV_DATA#${deviceId}#`,
    automationLogs: (workspaceId: UUID) => `AUTO_LOG#${workspaceId}#`,
    userNotifications: (userId: UUID, workspaceId: UUID) => `USER_NOTIF#${userId}#${workspaceId}#`,
  },
} as const;

// ============================================================================
// Query Options
// ============================================================================

export interface QueryOptions {
  limit?: number;
  startAfter?: string; // Cursor for pagination
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

export interface QueryResult<T> {
  items: T[];
  cursor?: string;
  hasMore: boolean;
}

// ============================================================================
// Filter Types
// ============================================================================

export type FilterOperator = 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith';

export interface Filter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

// ============================================================================
// Batch Operation Types
// ============================================================================

export interface BatchWriteItem {
  type: 'put' | 'delete';
  entity?: AnyEntity;
  pk?: PK;
  sk?: SK;
}

export interface BatchWriteResult {
  success: boolean;
  failedItems?: BatchWriteItem[];
  error?: string;
}

// ============================================================================
// Timestamp Helpers
// ============================================================================

export const Timestamps = {
  now: (): ISOTimestamp => new Date().toISOString(),

  fromDate: (date: Date): ISOTimestamp => date.toISOString(),

  toDate: (timestamp: ISOTimestamp): Date => new Date(timestamp),

  addDays: (timestamp: ISOTimestamp, days: number): ISOTimestamp => {
    const date = new Date(timestamp);
    date.setDate(date.getDate() + days);
    return date.toISOString();
  },

  addHours: (timestamp: ISOTimestamp, hours: number): ISOTimestamp => {
    const date = new Date(timestamp);
    date.setHours(date.getHours() + hours);
    return date.toISOString();
  },

  addMinutes: (timestamp: ISOTimestamp, minutes: number): ISOTimestamp => {
    const date = new Date(timestamp);
    date.setMinutes(date.getMinutes() + minutes);
    return date.toISOString();
  },

  isExpired: (timestamp: ISOTimestamp): boolean => new Date(timestamp) < new Date(),

  hourBucket: (timestamp: ISOTimestamp): string => {
    const date = new Date(timestamp);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}`;
  },

  dayBucket: (timestamp: ISOTimestamp): string => {
    const date = new Date(timestamp);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  },
} as const;

// ============================================================================
// UUID Helper
// ============================================================================

export const generateUUID = (): UUID => crypto.randomUUID();

