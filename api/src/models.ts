// Shared TypeScript data models for the Cloudflare API

export type PK = string;
export type SK = string;

// Single-table logical entity types
export type EntityType = "USER" | "USER-EMAIL" | "WORKSPACE" | "DEVICE" | "SESSION" | "AUTOMATION" | "API_KEY";

export interface BaseEntity {
  pk: PK;      // e.g. USER#<userId>, WS#<workspaceId>, DEV#<deviceId>
  sk: SK;      // sort key, supports multiple item types per PK
  entityType: EntityType;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface UserEntity extends BaseEntity {
  entityType: "USER";
  userId: string;
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
}

export interface UserEmailEntity extends BaseEntity {
    entityType: "USER-EMAIL";
    userId: string;
    email: string;
    passwordHash: string;
}
export interface WorkspaceEntity extends BaseEntity {
  entityType: "WORKSPACE";
  workspaceId: string;
  ownerUserId: string;
  name: string;
  slug: string;
  description?: string;
}

export interface DeviceFieldMapping {
  sourceField: string;
  displayLabel: string;
  dataType: "number" | "string" | "boolean" | "json";
  unit?: string;
  min?: number;
  max?: number;
  precision?: number;
  icon?: string;
  color?: string;
}

export interface DeviceEntity extends BaseEntity {
  entityType: "DEVICE";
  deviceId: string;
  workspaceId: string;
  name: string;
  type: string;
  status: "online" | "offline" | "error";
  description?: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  location?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  fieldMappings?: DeviceFieldMapping[];
  lastSeenAt?: string;
}

export interface SessionEntity extends BaseEntity {
  entityType: "SESSION";
  sessionId: string;
  userId: string;
  expiresAt: string;
}

export type WorkspacePlan = "starter" | "professional" | "business" | "enterprise";

export interface WorkspacePlanEntity extends BaseEntity {
  entityType: "WORKSPACE";
  workspaceId: string;
  plan: WorkspacePlan;
}

export type AutomationStatus = "active" | "paused" | "disabled";

export type AutomationTriggerType = "device_data" | "device_status" | "schedule";

export interface DeviceDataCondition {
  field: string; // mapped field key
  operator:
    | "equals"
    | "not_equals"
    | "greater_than"
    | "less_than"
    | "greater_than_or_equal"
    | "less_than_or_equal"
    | "contains"
    | "not_contains";
  value: any;
}

export interface DeviceDataTriggerConfig {
  type: "device_data";
  deviceId: string;
  logic: "AND" | "OR";
  conditions: DeviceDataCondition[];
}

export interface DeviceStatusTriggerConfig {
  type: "device_status";
  deviceId: string;
  status: "online" | "offline";
}

export interface ScheduleTriggerConfig {
  type: "schedule";
  cron: string; // cron expression
  timezone?: string;
}

export type AutomationTriggerConfig =
  | DeviceDataTriggerConfig
  | DeviceStatusTriggerConfig
  | ScheduleTriggerConfig;

export type AutomationActionType =
  | "send_webhook"
  | "send_email"
  | "send_sms"
  | "update_device"
  | "delay"
  | "log";

export interface AutomationActionConfigBase {
  type: AutomationActionType;
  delayMs?: number; // optional delay before execution
}

export interface SendWebhookActionConfig extends AutomationActionConfigBase {
  type: "send_webhook";
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  bodyTemplate?: Record<string, any>;
}

export interface UpdateDeviceActionConfig extends AutomationActionConfigBase {
  type: "update_device";
  targetDeviceId: string;
  field: string;
  value: any;
}

export interface SendEmailActionConfig extends AutomationActionConfigBase {
  type: "send_email";
  to: string;
  subject: string;
  body: string;
}

export interface DelayActionConfig extends AutomationActionConfigBase {
  type: "delay";
  delaySeconds: number;
}

export interface LogActionConfig extends AutomationActionConfigBase {
  type: "log";
  message: string;
}

export type AutomationActionConfig =
  | SendWebhookActionConfig
  | UpdateDeviceActionConfig
  | SendEmailActionConfig
  | DelayActionConfig
  | LogActionConfig;

// Optional conditions evaluated after the trigger fires.
// Allows combining triggers with extra device data checks,
// e.g. schedule fires at 9am AND temperature > 30.
export interface AutomationConditionGroup {
  logic: "AND" | "OR";
  conditions: DeviceDataCondition[];
  deviceId: string; // which device's latest fields to check
}

export interface AutomationEntity extends BaseEntity {
  entityType: "AUTOMATION";
  workspaceId: string;
  automationId: string;
  name: string;
  description?: string;
  status: AutomationStatus;
  triggerType: AutomationTriggerType;
  triggerConfig: AutomationTriggerConfig;
  conditionGroups?: AutomationConditionGroup[]; // optional extra conditions
  conditionLogic?: "AND" | "OR"; // how to combine multiple condition groups (default AND)
  actions: AutomationActionConfig[];
}

export type MemberRole = "owner" | "admin" | "editor" | "viewer";

export type DevicePermission = "view" | "control" | "manage";

export interface WorkspaceMemberEntity extends BaseEntity {
  entityType: "WORKSPACE";
  workspaceId: string;
  userId: string;
  role: MemberRole;
  devicePermissions?: Record<string, DevicePermission[]>;
}

export interface WorkspaceBillingEntity extends BaseEntity {
  entityType: "WORKSPACE";
  workspaceId: string;
  invoiceId: string;
  amount: number;
  status: string;
  period: string;
}

export interface WorkspaceApiKeyEntity extends BaseEntity {
  entityType: "API_KEY";
  pk: `WS#${string}`;           // WS#<workspaceId>
  sk: `API_KEY#${string}`;      // API_KEY#<apiKeyId>
  apiKeyId: string;
  workspaceId: string;
  name: string;
  revokedAt?: string;
}

export type TableEntity =
  | UserEntity
  | UserEmailEntity
  | WorkspaceEntity
  | DeviceEntity
  | SessionEntity
  | WorkspacePlanEntity
  | AutomationEntity
  | WorkspaceMemberEntity
  | WorkspaceBillingEntity
  | WorkspaceApiKeyEntity;

// Login payload / response shapes
export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface LoginResponseBody {
  sessionId: string;
  userId: string;
}
