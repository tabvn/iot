/**
 * Thebaycity IoT Platform - Type Definitions Index
 * Central export point for all TypeScript types, interfaces, and constants
 */

// Export all models
export * from './models';

// Export all API types
export * from './api';

// Export all constants
export * from './constants';

// Re-export commonly used types for convenience
export type {
  // Core entities
  User,
  UserProfile,
  Workspace,
  Device,
  DeviceData,
  FieldMapping,
  
  // Authentication
  AuthCredentials,
  AuthTokens,
  Session,
  
  // API & Integrations
  ApiKey,
  Webhook,
  WebhookDelivery,
  
  // Automation
  Automation,
  AutomationTriggerConfig,
  AutomationActionConfig,
  AutomationExecution,
  
  // Analytics
  DeviceAnalytics,
  WorkspaceAnalytics,
  AnalyticsMetric,
  
  // Billing
  Subscription,
  PaymentMethod,
  Invoice,
  
  // Notifications & Alerts
  Notification,
  DeviceAlert,
  
  // Audit
  AuditLog,
  
  // System
  SystemStatus,
  SystemMetrics,
  
  // Helpers
  PaginatedResponse,
  ApiResponse,
  ApiError,
} from './models';

export type {
  // Auth DTOs
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
  
  // User DTOs
  UpdateUserRequest,
  UserResponse,
  
  // Workspace DTOs
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  WorkspaceResponse,
  WorkspaceListResponse,
  
  // Device DTOs
  CreateDeviceRequest,
  UpdateDeviceRequest,
  DeviceResponse,
  DeviceListResponse,
  PushDeviceDataRequest,
  PushDeviceDataResponse,
  QueryDeviceDataRequest,
  QueryDeviceDataResponse,
  
  // API Key DTOs
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  ApiKeyResponse,
  
  // Webhook DTOs
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookResponse,
  
  // Automation DTOs
  CreateAutomationRequest,
  UpdateAutomationRequest,
  AutomationResponse,
  
  // Billing DTOs
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  SubscriptionResponse,
  
  // Common responses
  SuccessResponse,
  ErrorResponse,
  ApiResult,
} from './api';

// Export enums for easy access
export {
  UserRole,
  WorkspaceMemberRole,
  SubscriptionTier,
  SubscriptionStatus,
  BillingInterval,
  DeviceStatus,
  DeviceType,
  DataType,
  AutomationTriggerType,
  AutomationActionType,
  ConditionOperator,
  NotificationType,
  AuditEventType,
  PaymentStatus,
} from './models';

// Export constants
export {
  API_CONFIG,
  API_ENDPOINTS,
  WS_CHANNELS,
  SUBSCRIPTION_PLANS,
  DEVICE_TYPES,
  DEVICE_STATUS_CONFIG,
  DATA_TYPES,
  COMMON_UNITS,
  AUTOMATION_TRIGGER_TYPES,
  AUTOMATION_ACTION_TYPES,
  CONDITION_OPERATORS,
  TIME_INTERVALS,
  DATE_RANGES,
  NOTIFICATION_TYPES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ERROR_CODES,
  STORAGE_KEYS,
  REGEX_PATTERNS,
} from './constants';
