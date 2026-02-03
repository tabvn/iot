/**
 * Thebaycity IoT Platform - API Request/Response Types
 * Data Transfer Objects (DTOs) for API communication
 */

import {
  User,
  Workspace,
  Device,
  ApiKey,
  Webhook,
  Automation,
  Subscription,
  WorkspaceMember,
  DeviceData,
  FieldMapping,
  PaymentMethod,
  Invoice,
  DeviceAlert,
  Notification,
  AuditLog,
  UUID,
  Email,
  UserRole,
  WorkspaceMemberRole,
  SubscriptionTier,
  BillingInterval,
  DeviceStatus,
  DeviceType,
  AutomationTriggerConfig,
  AutomationActionConfig,
  AutomationTriggerType,
  AutomationStatus,
  AutomationConditionGroup,
  TimePeriod,
} from './models';

// ============================================================================
// Authentication DTOs
// ============================================================================

export interface LoginRequest {
  email: Email;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SignupRequest {
  name: string;
  email: Email;
  password: string;
  company?: string;
  agreeToTerms: boolean;
}

export interface SignupResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ResetPasswordRequest {
  email: Email;
}

export interface ResetPasswordConfirmRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

// ============================================================================
// User DTOs
// ============================================================================

export interface UpdateUserRequest {
  name?: string;
  company?: string;
  phoneNumber?: string;
  timezone?: string;
  language?: string;
  avatar?: string;
}

export interface UpdateUserPreferencesRequest {
  theme?: 'light' | 'dark' | 'system';
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  weeklyReports?: boolean;
  marketingEmails?: boolean;
  defaultWorkspaceId?: UUID;
}

export interface UserResponse {
  user: User;
}

// ============================================================================
// Workspace DTOs
// ============================================================================

export interface CreateWorkspaceRequest {
  name: string;
  slug?: string;
  description?: string;
  timezone?: string;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  logo?: string;
  settings?: {
    timezone?: string;
    dateFormat?: string;
    timeFormat?: '12h' | '24h';
    currency?: string;
    language?: string;
  };
}

export interface WorkspaceResponse {
  workspace: Workspace;
}

export interface WorkspaceListResponse {
  workspaces: Workspace[];
  total: number;
}

export interface InviteMemberRequest {
  email: Email;
  role: WorkspaceMemberRole;
  message?: string;
}

export interface UpdateMemberRoleRequest {
  role: WorkspaceMemberRole;
  permissions?: string[];
}

export interface AcceptInvitationRequest {
  token: string;
}

// ============================================================================
// Device DTOs
// ============================================================================

export interface CreateDeviceRequest {
  name: string;
  deviceId: string;
  type: DeviceType;
  description?: string;
  manufacturer?: string;
  model?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateDeviceRequest {
  name?: string;
  description?: string;
  type?: DeviceType;
  status?: DeviceStatus;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface DeviceResponse {
  device: Device;
}

export interface DeviceListResponse {
  devices: Device[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateFieldMappingRequest {
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

export interface UpdateFieldMappingRequest {
  displayLabel?: string;
  unit?: string;
  min?: number;
  max?: number;
  icon?: string;
  color?: string;
  hidden?: boolean;
  order?: number;
}

export interface FieldMappingResponse {
  fieldMapping: FieldMapping;
}

export interface SendDeviceCommandRequest {
  command: string;
  payload: Record<string, any>;
}

export interface DeviceCommandResponse {
  commandId: UUID;
  status: 'pending' | 'sent';
}

// ============================================================================
// Device Data DTOs
// ============================================================================

export interface PushDeviceDataRequest {
  deviceId: string;
  timestamp?: string; // ISO 8601
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface PushDeviceDataResponse {
  success: boolean;
  dataId: UUID;
  receivedAt: string;
}

export interface QueryDeviceDataRequest {
  deviceId: UUID;
  fields?: string[];
  startTime: string;
  endTime: string;
  limit?: number;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  interval?: '1m' | '5m' | '15m' | '1h' | '6h' | '1d';
}

export interface QueryDeviceDataResponse {
  data: DeviceData[];
  total: number;
  aggregated?: boolean;
}

export interface ExportDeviceDataRequest {
  deviceId: UUID;
  fields?: string[];
  startTime: string;
  endTime: string;
  format: 'json' | 'csv' | 'xlsx';
}

export interface ExportDeviceDataResponse {
  downloadUrl: string;
  expiresAt: string;
}

// ============================================================================
// Analytics DTOs
// ============================================================================

export interface GetDeviceAnalyticsRequest {
  deviceId: UUID;
  period: TimePeriod;
  fields?: string[];
  includeStatistics?: boolean;
  includeTrends?: boolean;
}

export interface GetDeviceAnalyticsResponse {
  deviceId: UUID;
  period: TimePeriod;
  metrics: Array<{
    field: string;
    dataPoints: Array<{
      timestamp: string;
      value: number;
    }>;
    statistics?: {
      min: number;
      max: number;
      avg: number;
      sum: number;
      count: number;
    };
  }>;
  trends?: Array<{
    field: string;
    direction: 'up' | 'down' | 'stable';
    changePercent: number;
  }>;
}

export interface GetWorkspaceAnalyticsRequest {
  workspaceId: UUID;
  period: TimePeriod;
}

export interface GetWorkspaceAnalyticsResponse {
  workspaceId: UUID;
  period: TimePeriod;
  totalDevices: number;
  activeDevices: number;
  totalDataPoints: number;
  apiCalls: number;
  storageUsed: number;
  devicesByStatus: Record<string, number>;
  devicesByType: Record<string, number>;
}

// ============================================================================
// API Key DTOs
// ============================================================================

export interface CreateApiKeyRequest {
  name: string;
  permissions: Array<{
    resource: string;
    actions: string[];
  }>;
  expiresAt?: string;
  rateLimit?: number;
  ipWhitelist?: string[];
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey;
  key: string; // Plain text key - only shown once!
}

export interface ApiKeyResponse {
  apiKey: Omit<ApiKey, 'key'>; // Never return the actual key
}

export interface ApiKeyListResponse {
  apiKeys: Array<Omit<ApiKey, 'key'>>;
  total: number;
}

export interface RevokeApiKeyRequest {
  apiKeyId: UUID;
}

// ============================================================================
// Webhook DTOs
// ============================================================================

export interface CreateWebhookRequest {
  name: string;
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  enabled?: boolean;
  retryCount?: number;
}

export interface UpdateWebhookRequest {
  name?: string;
  url?: string;
  events?: string[];
  headers?: Record<string, string>;
  enabled?: boolean;
  retryCount?: number;
}

export interface WebhookResponse {
  webhook: Webhook;
}

export interface WebhookListResponse {
  webhooks: Webhook[];
  total: number;
}

export interface TestWebhookRequest {
  webhookId: UUID;
  payload?: Record<string, any>;
}

export interface TestWebhookResponse {
  success: boolean;
  statusCode?: number;
  duration: number;
  error?: string;
}

// ============================================================================
// Automation DTOs
// ============================================================================

export interface CreateAutomationRequest {
  name: string;
  description?: string;
  triggerType: AutomationTriggerType;
  triggerConfig: AutomationTriggerConfig;
  conditionGroups?: AutomationConditionGroup[];
  conditionLogic?: 'AND' | 'OR';
  actions: AutomationActionConfig[];
}

export interface UpdateAutomationRequest {
  name?: string;
  description?: string;
  status?: AutomationStatus;
  triggerType?: AutomationTriggerType;
  triggerConfig?: AutomationTriggerConfig;
  conditionGroups?: AutomationConditionGroup[];
  conditionLogic?: 'AND' | 'OR';
  actions?: AutomationActionConfig[];
}

export interface AutomationResponse {
  automation: Automation;
}

export interface AutomationListResponse {
  automations: Automation[];
  total: number;
}

export interface TriggerAutomationRequest {
  automationId: UUID;
  payload?: Record<string, any>;
}

export interface TriggerAutomationResponse {
  executionId: UUID;
  status: 'queued' | 'executing';
}

export interface AutomationExecutionResponse {
  executionId: UUID;
  automationId: UUID;
  status: 'success' | 'failed' | 'partial';
  duration: number;
  actionsExecuted: number;
  actionsFailed: number;
  logs: Array<{
    timestamp: string;
    level: 'info' | 'warning' | 'error';
    message: string;
  }>;
  error?: string;
}

// ============================================================================
// Subscription & Billing DTOs
// ============================================================================

export interface CreateSubscriptionRequest {
  workspaceId: UUID;
  tier: SubscriptionTier;
  billingInterval: BillingInterval;
  paymentMethodId?: string;
}

export interface UpdateSubscriptionRequest {
  tier?: SubscriptionTier;
  billingInterval?: BillingInterval;
  cancelAtPeriodEnd?: boolean;
}

export interface SubscriptionResponse {
  subscription: Subscription;
}

export interface AddPaymentMethodRequest {
  stripePaymentMethodId: string;
  setAsDefault?: boolean;
}

export interface PaymentMethodResponse {
  paymentMethod: PaymentMethod;
}

export interface PaymentMethodListResponse {
  paymentMethods: PaymentMethod[];
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  total: number;
}

export interface CreateSetupIntentResponse {
  clientSecret: string;
  setupIntentId: string;
}

export interface UsageSummaryResponse {
  workspaceId: UUID;
  period: {
    start: string;
    end: string;
  };
  usage: {
    devices: number;
    apiCalls: number;
    storage: number;
    dataPoints: number;
  };
  limits: {
    devices: number;
    apiCalls: number;
    storage: number;
  };
  overage: {
    apiCalls: number;
    storage: number;
  };
}

// ============================================================================
// Alert DTOs
// ============================================================================

export interface CreateAlertRequest {
  deviceId: UUID;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface AlertResponse {
  alert: DeviceAlert;
}

export interface AlertListResponse {
  alerts: DeviceAlert[];
  total: number;
  unacknowledged: number;
}

export interface AcknowledgeAlertRequest {
  alertId: UUID;
}

// ============================================================================
// Notification DTOs
// ============================================================================

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread: number;
}

export interface MarkNotificationReadRequest {
  notificationId: UUID;
}

export interface MarkAllNotificationsReadRequest {
  before?: string; // ISO timestamp
}

// ============================================================================
// Audit Log DTOs
// ============================================================================

export interface AuditLogListRequest {
  workspaceId?: UUID;
  userId?: UUID;
  eventType?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogListResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================================
// System & Health DTOs
// ============================================================================

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    storage: 'up' | 'down';
    workers: 'up' | 'down';
  };
  version: string;
}

export interface SystemMetricsResponse {
  timestamp: string;
  metrics: {
    apiRequests: number;
    wsConnections: number;
    activeDevices: number;
    dataPointsPerSecond: number;
    avgLatency: number;
    errorRate: number;
  };
}

// ============================================================================
// Batch Operations DTOs
// ============================================================================

export interface BatchDeviceUpdateRequest {
  deviceIds: UUID[];
  updates: Partial<UpdateDeviceRequest>;
}

export interface BatchDeviceUpdateResponse {
  updated: number;
  failed: number;
  errors: Array<{
    deviceId: UUID;
    error: string;
  }>;
}

export interface BatchDeviceCommandRequest {
  deviceIds: UUID[];
  command: string;
  payload: Record<string, any>;
}

export interface BatchDeviceCommandResponse {
  queued: number;
  failed: number;
  commandIds: UUID[];
}

// ============================================================================
// WebSocket DTOs
// ============================================================================

export interface WsAuthMessage {
  type: 'auth';
  payload: {
    apiKey: string;
    workspaceId: UUID;
  };
}

export interface WsSubscribeMessage {
  type: 'subscribe';
  payload: {
    channel: string;
    filters?: Record<string, any>;
  };
}

export interface WsUnsubscribeMessage {
  type: 'unsubscribe';
  payload: {
    channel: string;
  };
}

export interface WsDataMessage {
  type: 'data';
  payload: {
    channel: string;
    data: DeviceData;
  };
}

export interface WsErrorMessage {
  type: 'error';
  payload: {
    code: string;
    message: string;
  };
}

export type WsMessage =
  | WsAuthMessage
  | WsSubscribeMessage
  | WsUnsubscribeMessage
  | WsDataMessage
  | WsErrorMessage;

// ============================================================================
// Search & Filter DTOs
// ============================================================================

export interface SearchRequest {
  query: string;
  types?: ('device' | 'workspace' | 'automation')[];
  workspaceId?: UUID;
  limit?: number;
}

export interface SearchResponse {
  results: Array<{
    type: string;
    id: UUID;
    name: string;
    description?: string;
    score: number;
  }>;
  total: number;
}

export interface FilterDevicesRequest {
  workspaceId: UUID;
  status?: DeviceStatus[];
  type?: DeviceType[];
  tags?: string[];
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'lastSeenAt' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

// ============================================================================
// Validation Error Types
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    statusCode: 400;
    details: ValidationError[];
  };
}

// ============================================================================
// Common Response Types
// ============================================================================

export interface SuccessResponse {
  success: true;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: any;
  };
}

export type ApiResult<T> = 
  | ({ success: true } & T)
  | ErrorResponse;
