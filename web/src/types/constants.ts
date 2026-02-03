/**
 * Thebaycity IoT Platform - Constants & Enumerations
 * Platform-wide constants and configuration values
 */

import { SubscriptionTier, BillingInterval } from './models';

// ============================================================================
// API Configuration
// ============================================================================

export const API_CONFIG = {
  BASE_URL: process.env.VITE_API_URL || 'https://api.thebaycity.dev',
  WS_URL: process.env.VITE_WS_URL || 'wss://ws.thebaycity.dev',
  VERSION: 'v1',
  TIMEOUT: 30000, // 30 seconds
} as const;

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  LOGOUT: '/auth/logout',
  REFRESH_TOKEN: '/auth/refresh',
  RESET_PASSWORD: '/auth/reset-password',
  VERIFY_EMAIL: '/auth/verify-email',
  
  // User
  USER_PROFILE: '/user/profile',
  USER_PREFERENCES: '/user/preferences',
  USER_SESSIONS: '/user/sessions',
  
  // Workspaces
  WORKSPACES: '/workspaces',
  WORKSPACE_BY_ID: (id: string) => `/workspaces/${id}`,
  WORKSPACE_MEMBERS: (id: string) => `/workspaces/${id}/members`,
  WORKSPACE_INVITATIONS: (id: string) => `/workspaces/${id}/invitations`,
  WORKSPACE_SETTINGS: (id: string) => `/workspaces/${id}/settings`,
  WORKSPACE_USAGE: (id: string) => `/workspaces/${id}/usage`,
  
  // Devices
  DEVICES: (workspaceId: string) => `/workspaces/${workspaceId}/devices`,
  DEVICE_BY_ID: (workspaceId: string, deviceId: string) => 
    `/workspaces/${workspaceId}/devices/${deviceId}`,
  DEVICE_DATA: (workspaceId: string, deviceId: string) => 
    `/workspaces/${workspaceId}/devices/${deviceId}/data`,
  DEVICE_COMMANDS: (workspaceId: string, deviceId: string) => 
    `/workspaces/${workspaceId}/devices/${deviceId}/commands`,
  DEVICE_ALERTS: (workspaceId: string, deviceId: string) => 
    `/workspaces/${workspaceId}/devices/${deviceId}/alerts`,
  DEVICE_ANALYTICS: (workspaceId: string, deviceId: string) => 
    `/workspaces/${workspaceId}/devices/${deviceId}/analytics`,
  
  // Field Mapping
  FIELD_MAPPINGS: (workspaceId: string, deviceId: string) => 
    `/workspaces/${workspaceId}/devices/${deviceId}/field-mappings`,
  
  // API Keys
  API_KEYS: (workspaceId: string) => `/workspaces/${workspaceId}/api-keys`,
  API_KEY_BY_ID: (workspaceId: string, keyId: string) => 
    `/workspaces/${workspaceId}/api-keys/${keyId}`,
  
  // Webhooks
  WEBHOOKS: (workspaceId: string) => `/workspaces/${workspaceId}/webhooks`,
  WEBHOOK_BY_ID: (workspaceId: string, webhookId: string) => 
    `/workspaces/${workspaceId}/webhooks/${webhookId}`,
  WEBHOOK_TEST: (workspaceId: string, webhookId: string) => 
    `/workspaces/${workspaceId}/webhooks/${webhookId}/test`,
  
  // Automations
  AUTOMATIONS: (workspaceId: string) => `/workspaces/${workspaceId}/automations`,
  AUTOMATION_BY_ID: (workspaceId: string, automationId: string) => 
    `/workspaces/${workspaceId}/automations/${automationId}`,
  AUTOMATION_TRIGGER: (workspaceId: string, automationId: string) => 
    `/workspaces/${workspaceId}/automations/${automationId}/trigger`,
  AUTOMATION_EXECUTIONS: (workspaceId: string, automationId: string) => 
    `/workspaces/${workspaceId}/automations/${automationId}/executions`,
  
  // Analytics
  WORKSPACE_ANALYTICS: (workspaceId: string) => 
    `/workspaces/${workspaceId}/analytics`,
  
  // Billing
  SUBSCRIPTION: (workspaceId: string) => `/workspaces/${workspaceId}/subscription`,
  PAYMENT_METHODS: '/billing/payment-methods',
  INVOICES: (workspaceId: string) => `/workspaces/${workspaceId}/invoices`,
  SETUP_INTENT: '/billing/setup-intent',
  
  // Notifications
  NOTIFICATIONS: '/notifications',
  NOTIFICATION_BY_ID: (id: string) => `/notifications/${id}`,
  MARK_ALL_READ: '/notifications/mark-all-read',
  
  // Audit Logs
  AUDIT_LOGS: (workspaceId: string) => `/workspaces/${workspaceId}/audit-logs`,
  
  // System
  HEALTH: '/health',
  METRICS: '/metrics',
  SEARCH: '/search',
} as const;

// ============================================================================
// WebSocket Channels
// ============================================================================

export const WS_CHANNELS = {
  DEVICE_DATA: (deviceId: string) => `device:${deviceId}:data`,
  DEVICE_STATUS: (deviceId: string) => `device:${deviceId}:status`,
  DEVICE_ALERTS: (deviceId: string) => `device:${deviceId}:alerts`,
  WORKSPACE_DEVICES: (workspaceId: string) => `workspace:${workspaceId}:devices`,
  WORKSPACE_ALERTS: (workspaceId: string) => `workspace:${workspaceId}:alerts`,
  AUTOMATION_EXECUTIONS: (workspaceId: string) => `workspace:${workspaceId}:automations`,
  NOTIFICATIONS: (userId: string) => `user:${userId}:notifications`,
} as const;

// ============================================================================
// Subscription Plans
// ============================================================================

export const SUBSCRIPTION_PLANS = {
  [SubscriptionTier.STARTER]: {
    name: 'Starter',
    monthlyPrice: 0,
    yearlyPrice: 0,
    limits: {
      devices: 5,
      apiCalls: 250000,
      dataRetentionDays: 7,
      storageBytes: 100 * 1024 * 1024, // 100 MB
      members: 1,
      webhooks: 1,
      automations: 3,
      alerts: 10,
    },
    features: [
      'Basic device monitoring',
      'REST API access',
      'WebSocket real-time data',
      'Basic analytics',
      'Community support',
    ],
  },
  [SubscriptionTier.PROFESSIONAL]: {
    name: 'Professional',
    monthlyPrice: 29,
    yearlyPrice: 279, // ~20% discount
    limits: {
      devices: 50,
      apiCalls: 2500000,
      dataRetentionDays: 90,
      storageBytes: 5 * 1024 * 1024 * 1024, // 5 GB
      members: 5,
      webhooks: 10,
      automations: 50,
      alerts: 100,
    },
    features: [
      'Advanced device monitoring',
      'REST API access',
      'WebSocket real-time data',
      'Advanced analytics',
      'Custom field mapping',
      'Webhook integrations',
      'Email support (48h)',
      'Data export (CSV, JSON)',
    ],
  },
  [SubscriptionTier.BUSINESS]: {
    name: 'Business',
    monthlyPrice: 99,
    yearlyPrice: 950, // ~20% discount
    limits: {
      devices: 250,
      apiCalls: 12000000,
      dataRetentionDays: 365,
      storageBytes: 25 * 1024 * 1024 * 1024, // 25 GB
      members: 20,
      webhooks: -1, // unlimited
      automations: 500,
      alerts: 1000,
    },
    features: [
      'Enterprise device monitoring',
      'REST API access',
      'WebSocket real-time data',
      'Advanced analytics & insights',
      'Custom field mapping',
      'Unlimited webhooks',
      'Advanced automation',
      'Priority support (24h)',
      'Data export (CSV, JSON, XLSX)',
      'Custom integrations',
      'White-label options',
    ],
  },
  [SubscriptionTier.ENTERPRISE]: {
    name: 'Enterprise',
    monthlyPrice: 299,
    yearlyPrice: 2870, // ~20% discount
    limits: {
      devices: -1, // unlimited
      apiCalls: -1, // unlimited
      dataRetentionDays: -1, // custom
      storageBytes: 100 * 1024 * 1024 * 1024, // 100 GB
      members: -1, // unlimited
      webhooks: -1, // unlimited
      automations: -1, // unlimited
      alerts: -1, // unlimited
    },
    features: [
      'Unlimited devices',
      'Unlimited API calls',
      'Custom data retention',
      'Dedicated infrastructure',
      'Advanced analytics & BI',
      'Custom field mapping',
      'Unlimited webhooks',
      'Advanced automation',
      'Dedicated support (4h SLA)',
      'Custom integrations',
      'Full white-label',
      'On-premise deployment option',
      'Custom SLAs',
      'Advanced security features',
    ],
  },
} as const;

// ============================================================================
// Device Configurations
// ============================================================================

export const DEVICE_TYPES = [
  { value: 'sensor', label: 'Sensor', icon: 'Thermometer' },
  { value: 'actuator', label: 'Actuator', icon: 'Zap' },
  { value: 'gateway', label: 'Gateway', icon: 'Radio' },
  { value: 'controller', label: 'Controller', icon: 'Cpu' },
  { value: 'custom', label: 'Custom', icon: 'Box' },
] as const;

export const DEVICE_STATUS_CONFIG = {
  online: {
    label: 'Online',
    color: 'green',
    icon: 'CheckCircle',
    description: 'Device is connected and functioning normally',
  },
  offline: {
    label: 'Offline',
    color: 'gray',
    icon: 'XCircle',
    description: 'Device is not connected',
  },
  warning: {
    label: 'Warning',
    color: 'yellow',
    icon: 'AlertTriangle',
    description: 'Device is experiencing minor issues',
  },
  error: {
    label: 'Error',
    color: 'red',
    icon: 'AlertCircle',
    description: 'Device has critical errors',
  },
  maintenance: {
    label: 'Maintenance',
    color: 'blue',
    icon: 'Wrench',
    description: 'Device is under maintenance',
  },
} as const;

// ============================================================================
// Data Type Configurations
// ============================================================================

export const DATA_TYPES = [
  { value: 'number', label: 'Number', icon: '123' },
  { value: 'string', label: 'String', icon: 'Aa' },
  { value: 'boolean', label: 'Boolean', icon: 'ToggleLeft' },
  { value: 'json', label: 'JSON', icon: 'Braces' },
  { value: 'array', label: 'Array', icon: 'List' },
] as const;

export const COMMON_UNITS = [
  // Temperature
  { value: '°C', label: 'Celsius', category: 'Temperature' },
  { value: '°F', label: 'Fahrenheit', category: 'Temperature' },
  { value: 'K', label: 'Kelvin', category: 'Temperature' },
  
  // Humidity
  { value: '%', label: 'Percent', category: 'Humidity' },
  { value: '%RH', label: 'Relative Humidity', category: 'Humidity' },
  
  // Pressure
  { value: 'Pa', label: 'Pascal', category: 'Pressure' },
  { value: 'hPa', label: 'Hectopascal', category: 'Pressure' },
  { value: 'bar', label: 'Bar', category: 'Pressure' },
  { value: 'psi', label: 'PSI', category: 'Pressure' },
  
  // Distance
  { value: 'mm', label: 'Millimeter', category: 'Distance' },
  { value: 'cm', label: 'Centimeter', category: 'Distance' },
  { value: 'm', label: 'Meter', category: 'Distance' },
  { value: 'km', label: 'Kilometer', category: 'Distance' },
  { value: 'in', label: 'Inch', category: 'Distance' },
  { value: 'ft', label: 'Foot', category: 'Distance' },
  
  // Speed
  { value: 'm/s', label: 'Meters per second', category: 'Speed' },
  { value: 'km/h', label: 'Kilometers per hour', category: 'Speed' },
  { value: 'mph', label: 'Miles per hour', category: 'Speed' },
  
  // Power
  { value: 'W', label: 'Watt', category: 'Power' },
  { value: 'kW', label: 'Kilowatt', category: 'Power' },
  { value: 'mW', label: 'Milliwatt', category: 'Power' },
  
  // Voltage
  { value: 'V', label: 'Volt', category: 'Voltage' },
  { value: 'mV', label: 'Millivolt', category: 'Voltage' },
  
  // Current
  { value: 'A', label: 'Ampere', category: 'Current' },
  { value: 'mA', label: 'Milliampere', category: 'Current' },
  
  // Other
  { value: 'lux', label: 'Lux', category: 'Light' },
  { value: 'dB', label: 'Decibel', category: 'Sound' },
  { value: 'ppm', label: 'Parts per million', category: 'Concentration' },
] as const;

// ============================================================================
// Automation Configurations
// ============================================================================

export const AUTOMATION_TRIGGER_TYPES = [
  { value: 'device_data', label: 'Device Data', icon: 'Gauge' },
  { value: 'device_status', label: 'Device Status Change', icon: 'Activity' },
  { value: 'schedule', label: 'Schedule', icon: 'Clock' },
] as const;

export const AUTOMATION_ACTION_TYPES = [
  { value: 'send_webhook', label: 'Send Webhook', icon: 'Send' },
  { value: 'send_email', label: 'Send Email', icon: 'Mail' },
  { value: 'send_sms', label: 'Send SMS', icon: 'MessageSquare' },
  { value: 'update_device', label: 'Update Device', icon: 'Settings' },
  { value: 'delay', label: 'Delay', icon: 'Timer' },
  { value: 'log', label: 'Log', icon: 'FileText' },
] as const;

export const CONDITION_OPERATORS = [
  { value: 'equals', label: 'Equals (=)', symbol: '=' },
  { value: 'not_equals', label: 'Not Equals (≠)', symbol: '≠' },
  { value: 'greater_than', label: 'Greater Than (>)', symbol: '>' },
  { value: 'less_than', label: 'Less Than (<)', symbol: '<' },
  { value: 'greater_than_or_equal', label: 'Greater or Equal (≥)', symbol: '≥' },
  { value: 'less_than_or_equal', label: 'Less or Equal (≤)', symbol: '≤' },
  { value: 'contains', label: 'Contains', symbol: '⊃' },
  { value: 'not_contains', label: 'Not Contains', symbol: '⊅' },
] as const;

// ============================================================================
// Time & Date Configurations
// ============================================================================

export const TIME_INTERVALS = [
  { value: '1m', label: '1 minute', seconds: 60 },
  { value: '5m', label: '5 minutes', seconds: 300 },
  { value: '15m', label: '15 minutes', seconds: 900 },
  { value: '1h', label: '1 hour', seconds: 3600 },
  { value: '6h', label: '6 hours', seconds: 21600 },
  { value: '1d', label: '1 day', seconds: 86400 },
  { value: '1w', label: '1 week', seconds: 604800 },
  { value: '1M', label: '1 month', seconds: 2592000 },
] as const;

export const DATE_RANGES = [
  { value: 'last_hour', label: 'Last Hour' },
  { value: 'last_24h', label: 'Last 24 Hours' },
  { value: 'last_7d', label: 'Last 7 Days' },
  { value: 'last_30d', label: 'Last 30 Days' },
  { value: 'last_90d', label: 'Last 90 Days' },
  { value: 'custom', label: 'Custom Range' },
] as const;

// ============================================================================
// Notification Configurations
// ============================================================================

export const NOTIFICATION_TYPES = {
  info: { icon: 'Info', color: 'blue' },
  success: { icon: 'CheckCircle', color: 'green' },
  warning: { icon: 'AlertTriangle', color: 'yellow' },
  error: { icon: 'XCircle', color: 'red' },
  alert: { icon: 'Bell', color: 'orange' },
} as const;

// ============================================================================
// Permission Configurations
// ============================================================================

export const PERMISSIONS = {
  // Device permissions
  DEVICES_READ: 'devices:read',
  DEVICES_WRITE: 'devices:write',
  DEVICES_DELETE: 'devices:delete',
  
  // Data permissions
  DATA_READ: 'data:read',
  DATA_WRITE: 'data:write',
  DATA_DELETE: 'data:delete',
  
  // Automation permissions
  AUTOMATIONS_READ: 'automations:read',
  AUTOMATIONS_WRITE: 'automations:write',
  AUTOMATIONS_DELETE: 'automations:delete',
  
  // API Key permissions
  API_KEYS_READ: 'api_keys:read',
  API_KEYS_WRITE: 'api_keys:write',
  API_KEYS_DELETE: 'api_keys:delete',
  
  // Webhook permissions
  WEBHOOKS_READ: 'webhooks:read',
  WEBHOOKS_WRITE: 'webhooks:write',
  WEBHOOKS_DELETE: 'webhooks:delete',
  
  // Member permissions
  MEMBERS_READ: 'members:read',
  MEMBERS_INVITE: 'members:invite',
  MEMBERS_REMOVE: 'members:remove',
  
  // Settings permissions
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
  
  // Billing permissions
  BILLING_READ: 'billing:read',
  BILLING_WRITE: 'billing:write',
} as const;

export const ROLE_PERMISSIONS = {
  viewer: [
    PERMISSIONS.DEVICES_READ,
    PERMISSIONS.DATA_READ,
    PERMISSIONS.AUTOMATIONS_READ,
    PERMISSIONS.WEBHOOKS_READ,
    PERMISSIONS.MEMBERS_READ,
    PERMISSIONS.SETTINGS_READ,
  ],
  developer: [
    PERMISSIONS.DEVICES_READ,
    PERMISSIONS.DEVICES_WRITE,
    PERMISSIONS.DATA_READ,
    PERMISSIONS.DATA_WRITE,
    PERMISSIONS.AUTOMATIONS_READ,
    PERMISSIONS.AUTOMATIONS_WRITE,
    PERMISSIONS.API_KEYS_READ,
    PERMISSIONS.API_KEYS_WRITE,
    PERMISSIONS.WEBHOOKS_READ,
    PERMISSIONS.WEBHOOKS_WRITE,
    PERMISSIONS.MEMBERS_READ,
    PERMISSIONS.SETTINGS_READ,
  ],
  admin: [
    PERMISSIONS.DEVICES_READ,
    PERMISSIONS.DEVICES_WRITE,
    PERMISSIONS.DEVICES_DELETE,
    PERMISSIONS.DATA_READ,
    PERMISSIONS.DATA_WRITE,
    PERMISSIONS.DATA_DELETE,
    PERMISSIONS.AUTOMATIONS_READ,
    PERMISSIONS.AUTOMATIONS_WRITE,
    PERMISSIONS.AUTOMATIONS_DELETE,
    PERMISSIONS.API_KEYS_READ,
    PERMISSIONS.API_KEYS_WRITE,
    PERMISSIONS.API_KEYS_DELETE,
    PERMISSIONS.WEBHOOKS_READ,
    PERMISSIONS.WEBHOOKS_WRITE,
    PERMISSIONS.WEBHOOKS_DELETE,
    PERMISSIONS.MEMBERS_READ,
    PERMISSIONS.MEMBERS_INVITE,
    PERMISSIONS.MEMBERS_REMOVE,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SETTINGS_WRITE,
    PERMISSIONS.BILLING_READ,
    PERMISSIONS.BILLING_WRITE,
  ],
  owner: ['*'], // All permissions
} as const;

// ============================================================================
// Error Codes
// ============================================================================

export const ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  
  // Authorization errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Limit errors
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  
  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
} as const;

// ============================================================================
// Storage Keys (Local Storage / Session Storage)
// ============================================================================

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'thebaycity_access_token',
  REFRESH_TOKEN: 'thebaycity_refresh_token',
  USER_PREFERENCES: 'thebaycity_user_prefs',
  CURRENT_WORKSPACE: 'thebaycity_current_workspace',
  THEME: 'thebaycity_theme',
  LANGUAGE: 'thebaycity_language',
} as const;

// ============================================================================
// Regex Patterns
// ============================================================================

export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  DEVICE_ID: /^[a-zA-Z0-9_-]+$/,
  API_KEY: /^tbcy_[a-zA-Z0-9]{32}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
} as const;
