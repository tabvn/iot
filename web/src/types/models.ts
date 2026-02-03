/**
 * Thebaycity IoT Platform - TypeScript Models
 * Comprehensive type definitions for all platform features
 */

// ============================================================================
// Base Types & Enums
// ============================================================================

export type UUID = string;
export type Timestamp = string; // ISO 8601 format
export type Email = string;
export type URL = string;

export enum UserRole {
  ADMIN = 'admin',
  DEVELOPER = 'developer',
  VIEWER = 'viewer',
}

export enum WorkspaceMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  DEVELOPER = 'developer',
  VIEWER = 'viewer',
}

export enum SubscriptionTier {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  BUSINESS = 'business',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIALING = 'trialing',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}

export enum BillingInterval {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  WARNING = 'warning',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
}

export enum DeviceType {
  SENSOR = 'sensor',
  ACTUATOR = 'actuator',
  GATEWAY = 'gateway',
  CONTROLLER = 'controller',
  CUSTOM = 'custom',
}

export enum DataType {
  NUMBER = 'number',
  STRING = 'string',
  BOOLEAN = 'boolean',
  JSON = 'json',
  ARRAY = 'array',
}

export enum AutomationTriggerType {
  DEVICE_DATA = 'device_data',
  DEVICE_STATUS = 'device_status',
  SCHEDULE = 'schedule',
}

export enum AutomationActionType {
  SEND_WEBHOOK = 'send_webhook',
  SEND_EMAIL = 'send_email',
  SEND_SMS = 'send_sms',
  UPDATE_DEVICE = 'update_device',
  DELAY = 'delay',
  LOG = 'log',
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
}

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  ALERT = 'alert',
}

export enum AuditEventType {
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  WORKSPACE_CREATED = 'workspace_created',
  WORKSPACE_UPDATED = 'workspace_updated',
  WORKSPACE_DELETED = 'workspace_deleted',
  DEVICE_CREATED = 'device_created',
  DEVICE_UPDATED = 'device_updated',
  DEVICE_DELETED = 'device_deleted',
  AUTOMATION_CREATED = 'automation_created',
  AUTOMATION_TRIGGERED = 'automation_triggered',
  API_KEY_CREATED = 'api_key_created',
  API_KEY_REVOKED = 'api_key_revoked',
  MEMBER_INVITED = 'member_invited',
  MEMBER_REMOVED = 'member_removed',
  SUBSCRIPTION_CHANGED = 'subscription_changed',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

// ============================================================================
// User & Authentication Models
// ============================================================================

export interface User {
  id: UUID;
  email: Email;
  name: string;
  avatar?: URL;
  emailVerified: boolean;
  phoneNumber?: string;
  company?: string;
  timezone?: string;
  language?: string;
  twoFactorEnabled: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  metadata?: Record<string, any>;
}

export interface UserProfile extends User {
  preferences: UserPreferences;
  statistics: UserStatistics;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  weeklyReports: boolean;
  marketingEmails: boolean;
  defaultWorkspaceId?: UUID;
}

export interface UserStatistics {
  totalWorkspaces: number;
  totalDevices: number;
  totalAutomations: number;
  apiCallsThisMonth: number;
  storageUsed: number; // bytes
}

export interface AuthCredentials {
  email: Email;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface Session {
  id: UUID;
  userId: UUID;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  userAgent: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  lastActivityAt: Timestamp;
}

export interface DeviceInfo {
  browser?: string;
  os?: string;
  device?: string;
  isMobile: boolean;
}

// ============================================================================
// Workspace Models
// ============================================================================

export interface Workspace {
  id: UUID;
  name: string;
  slug: string;
  description?: string;
  logo?: URL;
  ownerId: UUID;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  billingInterval: BillingInterval;
  trialEndsAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  settings: WorkspaceSettings;
  limits: WorkspaceLimits;
  usage: WorkspaceUsage;
  metadata?: Record<string, any>;
}

export interface WorkspaceSettings {
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  language: string;
  defaultDeviceRetention: number; // days
  webhookSecret?: string;
  customDomain?: string;
  branding?: WorkspaceBranding;
}

export interface WorkspaceBranding {
  primaryColor?: string;
  secondaryColor?: string;
  logo?: URL;
  favicon?: URL;
  customCss?: string;
}

export interface WorkspaceLimits {
  maxDevices: number;
  maxApiCalls: number;
  maxDataRetentionDays: number;
  maxStorageBytes: number;
  maxMembers: number;
  maxWebhooks: number;
  maxAutomations: number;
  maxAlerts: number;
}

export interface WorkspaceUsage {
  devices: number;
  apiCallsThisMonth: number;
  storageUsedBytes: number;
  members: number;
  webhooks: number;
  automations: number;
  alerts: number;
  lastUpdatedAt: Timestamp;
}

export interface WorkspaceMember {
  id: UUID;
  workspaceId: UUID;
  userId: UUID;
  role: WorkspaceMemberRole;
  permissions: string[];
  invitedBy: UUID;
  invitedAt: Timestamp;
  joinedAt?: Timestamp;
  lastActivityAt?: Timestamp;
  user: User;
}

export interface WorkspaceInvitation {
  id: UUID;
  workspaceId: UUID;
  email: Email;
  role: WorkspaceMemberRole;
  invitedBy: UUID;
  token: string;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
}

// ============================================================================
// Device Models
// ============================================================================

export interface Device {
  id: UUID;
  workspaceId: UUID;
  name: string;
  deviceId: string; // Unique device identifier from hardware
  type: DeviceType;
  status: DeviceStatus;
  description?: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  hardwareVersion?: string;
  location?: DeviceLocation;
  tags: string[];
  metadata: Record<string, any>;
  fieldMapping: FieldMapping[];
  lastSeenAt?: Timestamp;
  lastDataAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: UUID;
}

export interface DeviceLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  address?: string;
  city?: string;
  country?: string;
}

export interface FieldMapping {
  id: UUID;
  deviceId: UUID;
  sourceField: string; // Original field name from device (JSON key)
  displayLabel: string; // Display label in UI
  dataType: DataType;
  unit?: string;
  min?: number;
  max?: number;
  precision?: number;
  icon?: string;
  color?: string;
  hidden: boolean;
  order: number;
}

export interface DeviceData {
  id: UUID;
  deviceId: UUID;
  workspaceId: UUID;
  timestamp: Timestamp;
  data: Record<string, any>; // Flexible JSON structure
  metadata?: Record<string, any>;
  receivedAt: Timestamp;
}

export interface SensorReading {
  field: string;
  value: number | string | boolean;
  unit?: string;
  timestamp: Timestamp;
}

export interface DeviceCommand {
  id: UUID;
  deviceId: UUID;
  command: string;
  payload: Record<string, any>;
  status: 'pending' | 'sent' | 'acknowledged' | 'failed';
  sentAt?: Timestamp;
  acknowledgedAt?: Timestamp;
  createdAt: Timestamp;
  createdBy: UUID;
}

export interface DeviceConfiguration {
  id: UUID;
  deviceId: UUID;
  config: Record<string, any>;
  version: number;
  appliedAt?: Timestamp;
  createdAt: Timestamp;
  createdBy: UUID;
}

export interface DeviceAlert {
  id: UUID;
  deviceId: UUID;
  workspaceId: UUID;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  acknowledged: boolean;
  acknowledgedBy?: UUID;
  acknowledgedAt?: Timestamp;
  resolvedAt?: Timestamp;
  createdAt: Timestamp;
  metadata?: Record<string, any>;
}

// ============================================================================
// API & Integration Models
// ============================================================================

export interface ApiKey {
  id: UUID;
  workspaceId: UUID;
  name: string;
  key: string; // Hashed in database, only shown once
  prefix: string; // First 8 chars for identification
  permissions: ApiKeyPermission[];
  rateLimit?: number;
  ipWhitelist?: string[];
  expiresAt?: Timestamp;
  lastUsedAt?: Timestamp;
  createdAt: Timestamp;
  createdBy: UUID;
  revokedAt?: Timestamp;
  revokedBy?: UUID;
}

export interface ApiKeyPermission {
  resource: string; // e.g., 'devices', 'data', 'webhooks'
  actions: string[]; // e.g., ['read', 'write', 'delete']
}

export interface ApiRequest {
  id: UUID;
  workspaceId: UUID;
  apiKeyId?: UUID;
  method: string;
  path: string;
  statusCode: number;
  duration: number; // milliseconds
  requestSize: number; // bytes
  responseSize: number; // bytes
  ipAddress: string;
  userAgent: string;
  timestamp: Timestamp;
  error?: string;
}

export interface Webhook {
  id: UUID;
  workspaceId: UUID;
  name: string;
  url: URL;
  events: string[]; // e.g., ['device.status.changed', 'data.received']
  secret?: string;
  headers?: Record<string, string>;
  enabled: boolean;
  retryCount: number;
  retryDelay: number; // seconds
  lastTriggeredAt?: Timestamp;
  lastSuccessAt?: Timestamp;
  lastFailureAt?: Timestamp;
  failureCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: UUID;
}

export interface WebhookDelivery {
  id: UUID;
  webhookId: UUID;
  event: string;
  payload: Record<string, any>;
  statusCode?: number;
  success: boolean;
  duration?: number; // milliseconds
  attempt: number;
  error?: string;
  createdAt: Timestamp;
  deliveredAt?: Timestamp;
}

// ============================================================================
// Automation Models
// ============================================================================

export type AutomationStatus = 'active' | 'paused' | 'disabled';

export interface AutomationConditionGroup {
  logic: 'AND' | 'OR';
  conditions: DeviceDataCondition[];
  deviceId: string;
}

export interface Automation {
  automationId: UUID;
  workspaceId: UUID;
  name: string;
  description?: string;
  status: AutomationStatus;
  triggerType: AutomationTriggerType;
  triggerConfig: AutomationTriggerConfig;
  conditionGroups?: AutomationConditionGroup[];
  conditionLogic?: 'AND' | 'OR';
  actions: AutomationActionConfig[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// --- Trigger configs (mirrors backend) ---

export interface DeviceDataCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
}

export interface DeviceDataTriggerConfig {
  type: 'device_data';
  deviceId: string;
  logic: 'AND' | 'OR';
  conditions: DeviceDataCondition[];
}

export interface DeviceStatusTriggerConfig {
  type: 'device_status';
  deviceId: string;
  status: 'online' | 'offline';
}

export interface ScheduleTriggerConfig {
  type: 'schedule';
  cron: string;
  timezone?: string;
}

export type AutomationTriggerConfig =
  | DeviceDataTriggerConfig
  | DeviceStatusTriggerConfig
  | ScheduleTriggerConfig;

// --- Action configs (mirrors backend) ---

export interface AutomationActionConfigBase {
  type: AutomationActionType;
  delayMs?: number;
}

export interface SendWebhookActionConfig extends AutomationActionConfigBase {
  type: AutomationActionType.SEND_WEBHOOK;
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  bodyTemplate?: Record<string, any>;
}

export interface UpdateDeviceActionConfig extends AutomationActionConfigBase {
  type: AutomationActionType.UPDATE_DEVICE;
  targetDeviceId: string;
  field: string;
  value: any;
}

export interface SendEmailActionConfig extends AutomationActionConfigBase {
  type: AutomationActionType.SEND_EMAIL;
  to: string;
  subject: string;
  body: string;
}

export interface DelayActionConfig extends AutomationActionConfigBase {
  type: AutomationActionType.DELAY;
  delaySeconds: number;
}

export interface LogActionConfig extends AutomationActionConfigBase {
  type: AutomationActionType.LOG;
  message: string;
}

export type AutomationActionConfig =
  | SendWebhookActionConfig
  | UpdateDeviceActionConfig
  | SendEmailActionConfig
  | DelayActionConfig
  | LogActionConfig;

export interface AutomationExecution {
  id: UUID;
  automationId: UUID;
  workspaceId: UUID;
  status: 'success' | 'failed' | 'partial';
  triggeredBy: string;
  duration: number; // milliseconds
  actionsExecuted: number;
  actionsFailed: number;
  logs: ExecutionLog[];
  error?: string;
  startedAt: Timestamp;
  completedAt: Timestamp;
}

export interface ExecutionLog {
  timestamp: Timestamp;
  level: 'info' | 'warning' | 'error';
  message: string;
  data?: Record<string, any>;
}

// ============================================================================
// Analytics Models
// ============================================================================

export interface DeviceAnalytics {
  deviceId: UUID;
  period: TimePeriod;
  metrics: AnalyticsMetric[];
  aggregations: AnalyticsAggregation[];
  trends: AnalyticsTrend[];
}

export interface TimePeriod {
  start: Timestamp;
  end: Timestamp;
  interval: '1m' | '5m' | '15m' | '1h' | '6h' | '1d' | '1w' | '1M';
}

export interface AnalyticsMetric {
  field: string;
  dataPoints: DataPoint[];
  statistics: Statistics;
}

export interface DataPoint {
  timestamp: Timestamp;
  value: number;
}

export interface Statistics {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  median: number;
  stdDev: number;
  percentile95: number;
  percentile99: number;
}

export interface AnalyticsAggregation {
  field: string;
  groupBy?: string;
  aggregationType: 'sum' | 'avg' | 'min' | 'max' | 'count';
  results: AggregationResult[];
}

export interface AggregationResult {
  key: string;
  value: number;
  count: number;
}

export interface AnalyticsTrend {
  field: string;
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  prediction?: number;
}

export interface WorkspaceAnalytics {
  workspaceId: UUID;
  period: TimePeriod;
  totalDevices: number;
  activeDevices: number;
  totalDataPoints: number;
  apiCalls: number;
  storageUsed: number;
  automationExecutions: number;
  webhookDeliveries: number;
  alerts: number;
  uptime: number; // percentage
  devicesByStatus: Record<DeviceStatus, number>;
  devicesByType: Record<DeviceType, number>;
  topDevicesByActivity: DeviceActivity[];
}

export interface DeviceActivity {
  deviceId: UUID;
  deviceName: string;
  dataPoints: number;
  lastActivity: Timestamp;
}

// ============================================================================
// Billing & Subscription Models
// ============================================================================

export interface Subscription {
  id: UUID;
  workspaceId: UUID;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  price: number;
  currency: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Timestamp;
  trialStart?: Timestamp;
  trialEnd?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PaymentMethod {
  id: UUID;
  userId: UUID;
  stripePaymentMethodId: string;
  type: 'card' | 'bank_account';
  brand?: string; // e.g., 'visa', 'mastercard'
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: Timestamp;
}

export interface Invoice {
  id: UUID;
  workspaceId: UUID;
  subscriptionId: UUID;
  invoiceNumber: string;
  stripeInvoiceId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  description: string;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  dueDate: Timestamp;
  paidAt?: Timestamp;
  invoiceUrl?: URL;
  pdfUrl?: URL;
  createdAt: Timestamp;
  lineItems: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  id: UUID;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  period?: {
    start: Timestamp;
    end: Timestamp;
  };
}

export interface UsageRecord {
  id: UUID;
  workspaceId: UUID;
  subscriptionId: UUID;
  metric: string; // e.g., 'api_calls', 'storage', 'devices'
  quantity: number;
  timestamp: Timestamp;
  period: {
    start: Timestamp;
    end: Timestamp;
  };
}

// ============================================================================
// Notification Models
// ============================================================================

export interface Notification {
  id: UUID;
  userId: UUID;
  workspaceId?: UUID;
  type: NotificationType;
  title: string;
  message: string;
  link?: URL;
  read: boolean;
  readAt?: Timestamp;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
}

export interface NotificationPreferences {
  userId: UUID;
  channels: NotificationChannel[];
  events: NotificationEvent[];
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'webhook';
  enabled: boolean;
  config?: Record<string, any>;
}

export interface NotificationEvent {
  event: string;
  channels: string[];
  enabled: boolean;
}

// ============================================================================
// Audit Log Models
// ============================================================================

export interface AuditLog {
  id: UUID;
  workspaceId?: UUID;
  userId: UUID;
  eventType: AuditEventType;
  resourceType: string;
  resourceId?: UUID;
  action: string;
  metadata?: Record<string, any>;
  changes?: AuditChange[];
  ipAddress: string;
  userAgent: string;
  timestamp: Timestamp;
}

export interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
}

// ============================================================================
// System Models
// ============================================================================

export interface SystemStatus {
  status: 'operational' | 'degraded' | 'outage';
  uptime: number; // percentage
  components: ComponentStatus[];
  lastUpdatedAt: Timestamp;
}

export interface ComponentStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  latency?: number; // milliseconds
  errorRate?: number; // percentage
}

export interface SystemMetrics {
  timestamp: Timestamp;
  apiRequests: number;
  wsConnections: number;
  activeDevices: number;
  dataPointsPerSecond: number;
  avgLatency: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
}

// ============================================================================
// Helper Types
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: Record<string, any>;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  statusCode: number;
}

export interface FilterOptions {
  search?: string;
  status?: string[];
  tags?: string[];
  dateFrom?: Timestamp;
  dateTo?: Timestamp;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx' | 'pdf';
  fields?: string[];
  dateRange?: {
    start: Timestamp;
    end: Timestamp;
  };
}

// ============================================================================
// WebSocket Models
// ============================================================================

export interface WebSocketMessage {
  type: 'auth' | 'subscribe' | 'unsubscribe' | 'data' | 'command' | 'ping' | 'pong';
  payload: Record<string, any>;
  timestamp: Timestamp;
  messageId?: string;
}

export interface WebSocketSubscription {
  channel: string;
  filters?: Record<string, any>;
}

export interface WebSocketAuth {
  apiKey: string;
  workspaceId: UUID;
}

export interface RealtimeDeviceData extends DeviceData {
  channel: string;
}

// ============================================================================
// Configuration Models
// ============================================================================

export interface PlatformConfig {
  features: FeatureFlags;
  limits: PlatformLimits;
  integrations: IntegrationConfig[];
}

export interface FeatureFlags {
  [key: string]: boolean;
}

export interface PlatformLimits {
  maxWorkspacesPerUser: number;
  maxApiKeyLifetime: number; // days
  maxWebhookRetries: number;
  maxAutomationActionsPerRule: number;
  rateLimitPerMinute: number;
}

export interface IntegrationConfig {
  name: string;
  enabled: boolean;
  config: Record<string, any>;
}
