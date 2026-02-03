export type DeviceStatus = 'online' | 'offline' | 'warning';
export type DeviceType = 'Temperature Sensor' | 'Motion Sensor' | 'Camera' | 'Controller' | 'Power Outlet' | 'Environmental Sensor' | 'Smart Switch' | 'Smart Light' | 'Smart Thermostat' | 'Door Lock' | 'Fan';
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';
export type DeviceEventType = 'status_change' | 'data_update' | 'control_action' | 'connection' | 'disconnection' | 'error' | 'alert';
export type DevicePermission = 'read' | 'write';

export interface DeviceControl {
  type: 'switch' | 'slider' | 'color' | 'temperature';
  state?: boolean;
  value?: number;
  color?: string;
  min?: number;
  max?: number;
}

export interface DeviceAccess {
  deviceId: string;
  permissions: DevicePermission[];
}

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  joinedAt: string;
  lastActive: string;
  deviceAccess: DeviceAccess[]; // Changed from sharedDevices to deviceAccess with permissions
}

export interface DeviceEvent {
  id: string;
  deviceId: string;
  type: DeviceEventType;
  message: string;
  timestamp: string;
  severity?: 'info' | 'warning' | 'error';
  metadata?: {
    previousValue?: any;
    newValue?: any;
    user?: string;
    [key: string]: any;
  };
}

export interface DataFieldMapping {
  fieldKey: string;
  label: string;
  unit?: string;
  type?: 'numeric' | 'boolean' | 'string' | 'object';
  chartEnabled?: boolean;
  alertEnabled?: boolean;
  minValue?: number;
  maxValue?: number;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  lastSeen: string;
  ipAddress: string;
  location?: string;
  temperature?: number;
  humidity?: number;
  power?: number;
  apiEndpoint?: string;
  lastDataReceived?: string;
  controllable?: boolean;
  control?: DeviceControl;
  sharedWith?: string[]; // Array of member IDs who have access to this device
  events?: DeviceEvent[];
  fieldMappings?: DataFieldMapping[]; // Field mappings for JSON data
  description?: string; // Device description
  firmware?: string; // Firmware version
  manufacturer?: string; // Device manufacturer
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  deviceCount: number;
  devices: Device[];
  apiKey?: string;
  webhookUrl?: string;
  members?: WorkspaceMember[];
  slug?: string; // URL-friendly workspace identifier
}

export interface ApiEndpoint {
  method: string;
  endpoint: string;
  description: string;
  example?: string;
}

export interface WebhookEvent {
  id: string;
  timestamp: string;
  event: string;
  deviceId: string;
  status: 'success' | 'failed';
  payload?: any;
}

export interface ControlLog {
  id: string;
  deviceId: string;
  deviceName: string;
  action: string;
  timestamp: string;
  user?: string;
}

// Analytics data types
export interface DataPoint {
  timestamp: string;
  value: number;
}

export interface DeviceMetrics {
  uptime: number; // percentage
  totalRecords: number;
  avgResponseTime: number; // ms
  dataRate: number; // KB/min
  healthStatus: 'healthy' | 'warning' | 'critical';
  errorRate: number; // percentage
  lastError?: string;
  lastErrorTime?: string;
}

export interface DeviceAnalyticsData {
  deviceId: string;
  metrics: DeviceMetrics;
  temperatureHistory: DataPoint[];
  humidityHistory: DataPoint[];
  powerHistory: DataPoint[];
  connectionHistory: DataPoint[]; // 1 = connected, 0 = disconnected
  dataReceivedHistory: DataPoint[]; // count of data points per time period
}
