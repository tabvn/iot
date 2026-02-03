import { Workspace, Device, ApiEndpoint, WebhookEvent, ControlLog, WorkspaceMember, DeviceEvent, DeviceAnalyticsData, DataPoint } from "@/app/types";

export const mockMembers: WorkspaceMember[] = [
  {
    id: 'm1',
    name: 'John Smith',
    email: 'john.smith@example.com',
    role: 'owner',
    joinedAt: '2025-01-15',
    lastActive: '2025-01-30T10:30:00',
    deviceAccess: [], // Owner has access to all devices
  },
  {
    id: 'm2',
    name: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    role: 'admin',
    joinedAt: '2025-01-16',
    lastActive: '2025-01-30T09:15:00',
    deviceAccess: [], // Admin has access to all devices
  },
  {
    id: 'm3',
    name: 'Mike Davis',
    email: 'mike.davis@example.com',
    role: 'member',
    joinedAt: '2025-01-18',
    lastActive: '2025-01-29T18:20:00',
    deviceAccess: [
      { deviceId: 'd1', permissions: ['read', 'write'] },
      { deviceId: 'd2', permissions: ['read', 'write'] },
      { deviceId: 'd4', permissions: ['read', 'write'] },
      { deviceId: 'd9', permissions: ['read', 'write'] },
      { deviceId: 'd10', permissions: ['read'] },
    ],
  },
  {
    id: 'm4',
    name: 'Emma Wilson',
    email: 'emma.w@example.com',
    role: 'viewer',
    joinedAt: '2025-01-20',
    lastActive: '2025-01-30T08:45:00',
    deviceAccess: [
      { deviceId: 'd1', permissions: ['read'] },
      { deviceId: 'd5', permissions: ['read'] },
    ],
  },
];

export const mockDeviceEvents: DeviceEvent[] = [
  {
    id: 'e1',
    deviceId: 'd1',
    type: 'data_update',
    message: 'Temperature reading updated',
    timestamp: '2025-01-30T10:30:00',
    severity: 'info',
    metadata: {
      previousValue: 22.3,
      newValue: 22.5,
    },
  },
  {
    id: 'e2',
    deviceId: 'd1',
    type: 'data_update',
    message: 'Humidity reading updated',
    timestamp: '2025-01-30T10:25:00',
    severity: 'info',
    metadata: {
      previousValue: 44,
      newValue: 45,
    },
  },
  {
    id: 'e3',
    deviceId: 'd1',
    type: 'connection',
    message: 'Device connected successfully',
    timestamp: '2025-01-30T08:00:00',
    severity: 'info',
  },
  {
    id: 'e4',
    deviceId: 'd2',
    type: 'control_action',
    message: 'Temperature set to 21°C',
    timestamp: '2025-01-30T09:45:00',
    severity: 'info',
    metadata: {
      user: 'Admin',
      previousValue: 20,
      newValue: 21,
    },
  },
  {
    id: 'e5',
    deviceId: 'd2',
    type: 'data_update',
    message: 'Temperature reading updated',
    timestamp: '2025-01-30T10:29:00',
    severity: 'info',
    metadata: {
      previousValue: 20.8,
      newValue: 21.0,
    },
  },
  {
    id: 'e6',
    deviceId: 'd3',
    type: 'disconnection',
    message: 'Device disconnected',
    timestamp: '2025-01-29T18:45:00',
    severity: 'warning',
  },
  {
    id: 'e7',
    deviceId: 'd3',
    type: 'error',
    message: 'Connection timeout after 3 retry attempts',
    timestamp: '2025-01-29T18:46:00',
    severity: 'error',
  },
  {
    id: 'e8',
    deviceId: 'd4',
    type: 'control_action',
    message: 'Device turned on',
    timestamp: '2025-01-30T10:20:00',
    severity: 'info',
    metadata: {
      user: 'Admin',
      newValue: true,
    },
  },
  {
    id: 'e9',
    deviceId: 'd5',
    type: 'alert',
    message: 'High memory usage detected (85%)',
    timestamp: '2025-01-30T09:15:00',
    severity: 'warning',
    metadata: {
      memoryUsage: 85,
    },
  },
  {
    id: 'e10',
    deviceId: 'd9',
    type: 'control_action',
    message: 'Brightness adjusted to 80%',
    timestamp: '2025-01-30T10:32:00',
    severity: 'info',
    metadata: {
      user: 'Admin',
      previousValue: 50,
      newValue: 80,
    },
  },
  {
    id: 'e11',
    deviceId: 'd10',
    type: 'control_action',
    message: 'Color changed to #ff6b6b',
    timestamp: '2025-01-30T09:30:00',
    severity: 'info',
    metadata: {
      user: 'Admin',
      previousValue: '#ffffff',
      newValue: '#ff6b6b',
    },
  },
  {
    id: 'e12',
    deviceId: 'd12',
    type: 'control_action',
    message: 'Door locked',
    timestamp: '2025-01-30T08:00:00',
    severity: 'info',
    metadata: {
      user: 'Admin',
      newValue: true,
    },
  },
  {
    id: 'e13',
    deviceId: 'd12',
    type: 'status_change',
    message: 'Device status changed to online',
    timestamp: '2025-01-30T07:55:00',
    severity: 'info',
    metadata: {
      previousValue: 'offline',
      newValue: 'online',
    },
  },
];

export const mockWorkspaces: Workspace[] = [
  {
    id: '1',
    name: 'Smart Home',
    description: 'Main home automation workspace',
    createdAt: '2025-01-15',
    deviceCount: 9,
    apiKey: 'sk_live_a8b2c4d6e8f0g2h4i6j8k0l2m4n6o8p0',
    webhookUrl: 'https://api.example.com/webhooks/smart-home',
    slug: 'smart-home',
    members: mockMembers,
    devices: [
      {
        id: 'd1',
        name: 'Living Room Sensor',
        type: 'Temperature Sensor',
        status: 'online',
        lastSeen: '2025-01-30T10:30:00',
        ipAddress: '192.168.1.101',
        location: 'Living Room',
        temperature: 22.5,
        humidity: 45,
        apiEndpoint: '/api/v1/devices/d1/data',
        lastDataReceived: '2025-01-30T10:30:00',
        controllable: false,
        sharedWith: ['m3', 'm4'],
        events: mockDeviceEvents.filter(e => e.deviceId === 'd1'),
        fieldMappings: [
          { fieldKey: 'temperature', label: 'Temperature (°C)', type: 'numeric', chartEnabled: true },
          { fieldKey: 'humidity', label: 'Humidity (%)', type: 'numeric', chartEnabled: true },
        ],
      },
      {
        id: 'd2',
        name: 'Smart Thermostat',
        type: 'Smart Thermostat',
        status: 'online',
        lastSeen: '2025-01-30T10:29:00',
        ipAddress: '192.168.1.102',
        location: 'Hallway',
        temperature: 21.0,
        apiEndpoint: '/api/v1/devices/d2/data',
        lastDataReceived: '2025-01-30T10:29:00',
        controllable: true,
        control: {
          type: 'temperature',
          value: 21,
          min: 16,
          max: 30,
        },
        sharedWith: ['m3'],
        events: mockDeviceEvents.filter(e => e.deviceId === 'd2'),
        fieldMappings: [
          { fieldKey: 'temperature', label: 'Setpoint (°C)', type: 'numeric', chartEnabled: true },
          { fieldKey: 'mode', label: 'Mode', type: 'string', chartEnabled: false },
        ],
      },
      {
        id: 'd3',
        name: 'Garage Door Sensor',
        type: 'Motion Sensor',
        status: 'offline',
        lastSeen: '2025-01-29T18:45:00',
        ipAddress: '192.168.1.103',
        location: 'Garage',
        apiEndpoint: '/api/v1/devices/d3/data',
        controllable: false,
        sharedWith: ['m3'],
        events: mockDeviceEvents.filter(e => e.deviceId === 'd3'),
        fieldMappings: [
          { fieldKey: 'motion', label: 'Motion Detected', type: 'boolean', chartEnabled: false },
        ],
      },
      {
        id: 'd4',
        name: 'Kitchen Smart Plug',
        type: 'Power Outlet',
        status: 'online',
        lastSeen: '2025-01-30T10:31:00',
        ipAddress: '192.168.1.104',
        location: 'Kitchen',
        power: 125,
        apiEndpoint: '/api/v1/devices/d4/data',
        lastDataReceived: '2025-01-30T10:31:00',
        controllable: true,
        control: {
          type: 'switch',
          state: true,
        },
        sharedWith: ['m3'],
        events: mockDeviceEvents.filter(e => e.deviceId === 'd4'),
      },
      {
        id: 'd5',
        name: 'Security Camera',
        type: 'Camera',
        status: 'warning',
        lastSeen: '2025-01-30T09:15:00',
        ipAddress: '192.168.1.105',
        location: 'Front Door',
        apiEndpoint: '/api/v1/devices/d5/data',
        lastDataReceived: '2025-01-30T09:15:00',
        controllable: false,
        sharedWith: ['m4'],
        events: mockDeviceEvents.filter(e => e.deviceId === 'd5'),
      },
      {
        id: 'd9',
        name: 'Living Room Light',
        type: 'Smart Light',
        status: 'online',
        lastSeen: '2025-01-30T10:32:00',
        ipAddress: '192.168.1.109',
        location: 'Living Room',
        apiEndpoint: '/api/v1/devices/d9/data',
        lastDataReceived: '2025-01-30T10:32:00',
        controllable: true,
        control: {
          type: 'slider',
          state: true,
          value: 80,
          min: 0,
          max: 100,
        },
        sharedWith: ['m3'],
        events: mockDeviceEvents.filter(e => e.deviceId === 'd9'),
      },
      {
        id: 'd10',
        name: 'Bedroom RGB Light',
        type: 'Smart Light',
        status: 'online',
        lastSeen: '2025-01-30T10:33:00',
        ipAddress: '192.168.1.110',
        location: 'Bedroom',
        apiEndpoint: '/api/v1/devices/d10/data',
        lastDataReceived: '2025-01-30T10:33:00',
        controllable: true,
        control: {
          type: 'color',
          state: true,
          value: 100,
          color: '#ff6b6b',
        },
        sharedWith: ['m3'],
        events: mockDeviceEvents.filter(e => e.deviceId === 'd10'),
      },
      {
        id: 'd11',
        name: 'Ceiling Fan',
        type: 'Fan',
        status: 'online',
        lastSeen: '2025-01-30T10:34:00',
        ipAddress: '192.168.1.111',
        location: 'Living Room',
        apiEndpoint: '/api/v1/devices/d11/data',
        lastDataReceived: '2025-01-30T10:34:00',
        controllable: true,
        control: {
          type: 'slider',
          state: false,
          value: 0,
          min: 0,
          max: 3,
        },
        sharedWith: ['m3'],
        events: mockDeviceEvents.filter(e => e.deviceId === 'd11'),
      },
      {
        id: 'd12',
        name: 'Front Door Lock',
        type: 'Door Lock',
        status: 'online',
        lastSeen: '2025-01-30T10:35:00',
        ipAddress: '192.168.1.112',
        location: 'Front Door',
        apiEndpoint: '/api/v1/devices/d12/data',
        lastDataReceived: '2025-01-30T10:35:00',
        controllable: true,
        control: {
          type: 'switch',
          state: true,
        },
        sharedWith: ['m3'],
        events: mockDeviceEvents.filter(e => e.deviceId === 'd12'),
      },
    ],
  },
  {
    id: '2',
    name: 'Office Building',
    description: 'Corporate office monitoring system',
    createdAt: '2025-01-10',
    deviceCount: 5,
    apiKey: 'sk_live_q1r3s5t7u9v1w3x5y7z9a1b3c5d7e9f1',
    webhookUrl: 'https://api.example.com/webhooks/office',
    slug: 'office-building',
    members: mockMembers,
    devices: [
      {
        id: 'd6',
        name: 'Conference Room Monitor',
        type: 'Environmental Sensor',
        status: 'online',
        lastSeen: '2025-01-30T10:28:00',
        ipAddress: '192.168.2.101',
        location: 'Conference Room A',
        temperature: 23.0,
        humidity: 50,
        apiEndpoint: '/api/v1/devices/d6/data',
        lastDataReceived: '2025-01-30T10:28:00',
        controllable: false,
        sharedWith: ['m3'],
        events: mockDeviceEvents.filter(e => e.deviceId === 'd6'),
      },
      {
        id: 'd7',
        name: 'Server Room Sensor',
        type: 'Temperature Sensor',
        status: 'online',
        lastSeen: '2025-01-30T10:30:00',
        ipAddress: '192.168.2.102',
        location: 'Server Room',
        temperature: 19.5,
        humidity: 40,
        apiEndpoint: '/api/v1/devices/d7/data',
        lastDataReceived: '2025-01-30T10:30:00',
        controllable: false,
        sharedWith: ['m3'],
        events: mockDeviceEvents.filter(e => e.deviceId === 'd7'),
      },
      {
        id: 'd8',
        name: 'Main Entrance Camera',
        type: 'Camera',
        status: 'online',
        lastSeen: '2025-01-30T10:31:00',
        ipAddress: '192.168.2.103',
        location: 'Main Entrance',
        apiEndpoint: '/api/v1/devices/d8/data',
        lastDataReceived: '2025-01-30T10:31:00',
        controllable: false,
        sharedWith: ['m3'],
        events: mockDeviceEvents.filter(e => e.deviceId === 'd8'),
      },
      {
        id: 'd13',
        name: 'Office Lights',
        type: 'Smart Light',
        status: 'online',
        lastSeen: '2025-01-30T10:36:00',
        ipAddress: '192.168.2.104',
        location: 'Open Office',
        apiEndpoint: '/api/v1/devices/d13/data',
        lastDataReceived: '2025-01-30T10:36:00',
        controllable: true,
        control: {
          type: 'slider',
          state: true,
          value: 100,
          min: 0,
          max: 100,
        },
        sharedWith: ['m3'],
        events: mockDeviceEvents.filter(e => e.deviceId === 'd13'),
      },
      {
        id: 'd14',
        name: 'AC Unit',
        type: 'Smart Thermostat',
        status: 'online',
        lastSeen: '2025-01-30T10:37:00',
        ipAddress: '192.168.2.105',
        location: 'Open Office',
        temperature: 22.0,
        apiEndpoint: '/api/v1/devices/d14/data',
        lastDataReceived: '2025-01-30T10:37:00',
        controllable: true,
        control: {
          type: 'temperature',
          value: 22,
          min: 16,
          max: 30,
        },
        sharedWith: ['m3'],
        events: mockDeviceEvents.filter(e => e.deviceId === 'd14'),
      },
    ],
  },
];

export const apiEndpoints: ApiEndpoint[] = [
  {
    method: 'POST',
    endpoint: '/api/v1/devices/{device_id}/data',
    description: 'Send device data to the platform',
    example: JSON.stringify({
      temperature: 22.5,
      humidity: 45,
      timestamp: '2025-01-30T10:30:00Z'
    }, null, 2),
  },
  {
    method: 'GET',
    endpoint: '/api/v1/devices/{device_id}',
    description: 'Get device information',
  },
  {
    method: 'GET',
    endpoint: '/api/v1/devices/{device_id}/status',
    description: 'Get current device status',
  },
  {
    method: 'PUT',
    endpoint: '/api/v1/devices/{device_id}',
    description: 'Update device configuration',
    example: JSON.stringify({
      name: 'Living Room Sensor',
      location: 'Living Room',
      settings: {
        interval: 60
      }
    }, null, 2),
  },
  {
    method: 'POST',
    endpoint: '/api/v1/devices/{device_id}/control',
    description: 'Control device (switch on/off, adjust settings)',
    example: JSON.stringify({
      action: 'turn_on',
      value: 80,
      color: '#ff6b6b'
    }, null, 2),
  },
  {
    method: 'DELETE',
    endpoint: '/api/v1/devices/{device_id}',
    description: 'Remove a device from the workspace',
  },
];

export const mockWebhookEvents: WebhookEvent[] = [
  {
    id: 'w1',
    timestamp: '2025-01-30T10:30:00',
    event: 'device.data.received',
    deviceId: 'd1',
    status: 'success',
    payload: { temperature: 22.5, humidity: 45 },
  },
  {
    id: 'w2',
    timestamp: '2025-01-30T10:29:00',
    event: 'device.status.changed',
    deviceId: 'd3',
    status: 'failed',
    payload: { status: 'offline' },
  },
  {
    id: 'w3',
    timestamp: '2025-01-30T10:28:00',
    event: 'device.data.received',
    deviceId: 'd2',
    status: 'success',
    payload: { temperature: 21.0 },
  },
  {
    id: 'w4',
    timestamp: '2025-01-30T10:27:00',
    event: 'device.control.executed',
    deviceId: 'd9',
    status: 'success',
    payload: { action: 'turn_on', brightness: 80 },
  },
];

export const mockControlLogs: ControlLog[] = [
  {
    id: 'c1',
    deviceId: 'd9',
    deviceName: 'Living Room Light',
    action: 'Turned on, brightness set to 80%',
    timestamp: '2025-01-30T10:32:00',
    user: 'Admin',
  },
  {
    id: 'c2',
    deviceId: 'd4',
    deviceName: 'Kitchen Smart Plug',
    action: 'Turned on',
    timestamp: '2025-01-30T10:20:00',
    user: 'Admin',
  },
  {
    id: 'c3',
    deviceId: 'd2',
    deviceName: 'Smart Thermostat',
    action: 'Temperature set to 21°C',
    timestamp: '2025-01-30T09:45:00',
    user: 'Admin',
  },
  {
    id: 'c4',
    deviceId: 'd10',
    deviceName: 'Bedroom RGB Light',
    action: 'Color changed to #ff6b6b',
    timestamp: '2025-01-30T09:30:00',
    user: 'Admin',
  },
  {
    id: 'c5',
    deviceId: 'd12',
    deviceName: 'Front Door Lock',
    action: 'Locked',
    timestamp: '2025-01-30T08:00:00',
    user: 'Admin',
  },
];

// Helper function to generate time series data
function generateTimeSeriesData(
  baseValue: number,
  variance: number,
  hoursBack: number,
  intervalMinutes: number = 15
): DataPoint[] {
  const data: DataPoint[] = [];
  const now = new Date();
  const points = Math.floor((hoursBack * 60) / intervalMinutes);

  for (let i = points; i >= 0; i--) {
    const time = new Date(now.getTime() - i * intervalMinutes * 60 * 1000);
    const randomVariance = (Math.random() - 0.5) * 2 * variance;
    const value = Math.round((baseValue + randomVariance) * 10) / 10;
    data.push({
      timestamp: time.toISOString(),
      value: Math.max(0, value),
    });
  }
  return data;
}

// Generate connection history (1 = online, 0 = offline)
function generateConnectionHistory(hoursBack: number, offlinePeriods: { start: number; duration: number }[] = []): DataPoint[] {
  const data: DataPoint[] = [];
  const now = new Date();
  const intervalMinutes = 5;
  const points = Math.floor((hoursBack * 60) / intervalMinutes);

  for (let i = points; i >= 0; i--) {
    const time = new Date(now.getTime() - i * intervalMinutes * 60 * 1000);
    const hoursAgo = i * intervalMinutes / 60;

    let isOffline = false;
    for (const period of offlinePeriods) {
      if (hoursAgo >= period.start && hoursAgo < period.start + period.duration) {
        isOffline = true;
        break;
      }
    }

    data.push({
      timestamp: time.toISOString(),
      value: isOffline ? 0 : 1,
    });
  }
  return data;
}

// Mock analytics data for devices
export const mockDeviceAnalytics: DeviceAnalyticsData[] = [
  // Living Room Sensor (d1) - Temperature Sensor
  {
    deviceId: 'd1',
    metrics: {
      uptime: 99.8,
      totalRecords: 12847,
      avgResponseTime: 142,
      dataRate: 1.2,
      healthStatus: 'healthy',
      errorRate: 0.02,
    },
    temperatureHistory: generateTimeSeriesData(22.5, 1.5, 24),
    humidityHistory: generateTimeSeriesData(45, 5, 24),
    powerHistory: [],
    connectionHistory: generateConnectionHistory(24),
    dataReceivedHistory: generateTimeSeriesData(4, 0.5, 24),
  },
  // Smart Thermostat (d2)
  {
    deviceId: 'd2',
    metrics: {
      uptime: 99.9,
      totalRecords: 8432,
      avgResponseTime: 98,
      dataRate: 0.8,
      healthStatus: 'healthy',
      errorRate: 0.01,
    },
    temperatureHistory: generateTimeSeriesData(21.0, 0.5, 24),
    humidityHistory: [],
    powerHistory: [],
    connectionHistory: generateConnectionHistory(24),
    dataReceivedHistory: generateTimeSeriesData(3, 0.3, 24),
  },
  // Garage Door Sensor (d3) - Offline device
  {
    deviceId: 'd3',
    metrics: {
      uptime: 87.5,
      totalRecords: 3241,
      avgResponseTime: 0,
      dataRate: 0,
      healthStatus: 'critical',
      errorRate: 12.5,
      lastError: 'Connection timeout after 3 retry attempts',
      lastErrorTime: '2025-01-29T18:46:00',
    },
    temperatureHistory: [],
    humidityHistory: [],
    powerHistory: [],
    connectionHistory: generateConnectionHistory(24, [{ start: 0, duration: 16 }]), // Offline for last 16 hours
    dataReceivedHistory: generateTimeSeriesData(2, 0.5, 24),
  },
  // Kitchen Smart Plug (d4)
  {
    deviceId: 'd4',
    metrics: {
      uptime: 99.5,
      totalRecords: 15632,
      avgResponseTime: 112,
      dataRate: 2.1,
      healthStatus: 'healthy',
      errorRate: 0.05,
    },
    temperatureHistory: [],
    humidityHistory: [],
    powerHistory: generateTimeSeriesData(125, 30, 24),
    connectionHistory: generateConnectionHistory(24),
    dataReceivedHistory: generateTimeSeriesData(5, 0.8, 24),
  },
  // Security Camera (d5) - Warning status
  {
    deviceId: 'd5',
    metrics: {
      uptime: 95.2,
      totalRecords: 24156,
      avgResponseTime: 234,
      dataRate: 15.5,
      healthStatus: 'warning',
      errorRate: 4.8,
      lastError: 'High memory usage detected (85%)',
      lastErrorTime: '2025-01-30T09:15:00',
    },
    temperatureHistory: [],
    humidityHistory: [],
    powerHistory: generateTimeSeriesData(45, 10, 24),
    connectionHistory: generateConnectionHistory(24, [{ start: 8, duration: 0.5 }, { start: 14, duration: 0.25 }]),
    dataReceivedHistory: generateTimeSeriesData(60, 10, 24),
  },
  // Conference Room Monitor (d6) - Office Building
  {
    deviceId: 'd6',
    metrics: {
      uptime: 99.8,
      totalRecords: 18432,
      avgResponseTime: 112,
      dataRate: 2.4,
      healthStatus: 'healthy',
      errorRate: 0.02,
    },
    temperatureHistory: generateTimeSeriesData(23.0, 1.2, 24),
    humidityHistory: generateTimeSeriesData(50, 6, 24),
    powerHistory: [],
    connectionHistory: generateConnectionHistory(24),
    dataReceivedHistory: generateTimeSeriesData(6, 0.8, 24),
  },
  // Server Room Sensor (d7) - Office Building
  {
    deviceId: 'd7',
    metrics: {
      uptime: 99.99,
      totalRecords: 45632,
      avgResponseTime: 45,
      dataRate: 8.2,
      healthStatus: 'healthy',
      errorRate: 0.001,
    },
    temperatureHistory: generateTimeSeriesData(19.5, 0.5, 24),
    humidityHistory: generateTimeSeriesData(40, 3, 24),
    powerHistory: generateTimeSeriesData(320, 45, 24),
    connectionHistory: generateConnectionHistory(24),
    dataReceivedHistory: generateTimeSeriesData(20, 2, 24),
  },
  // Main Entrance Camera (d8) - Office Building
  {
    deviceId: 'd8',
    metrics: {
      uptime: 99.7,
      totalRecords: 38456,
      avgResponseTime: 178,
      dataRate: 28.5,
      healthStatus: 'healthy',
      errorRate: 0.03,
    },
    temperatureHistory: [],
    humidityHistory: [],
    powerHistory: generateTimeSeriesData(72, 18, 24),
    connectionHistory: generateConnectionHistory(24),
    dataReceivedHistory: generateTimeSeriesData(95, 25, 24),
  },
  // Living Room Light (d9)
  {
    deviceId: 'd9',
    metrics: {
      uptime: 99.7,
      totalRecords: 6842,
      avgResponseTime: 78,
      dataRate: 0.5,
      healthStatus: 'healthy',
      errorRate: 0.03,
    },
    temperatureHistory: [],
    humidityHistory: [],
    powerHistory: generateTimeSeriesData(12, 8, 24), // Light uses varying power
    connectionHistory: generateConnectionHistory(24),
    dataReceivedHistory: generateTimeSeriesData(2, 0.5, 24),
  },
  // Bedroom RGB Light (d10)
  {
    deviceId: 'd10',
    metrics: {
      uptime: 99.8,
      totalRecords: 5123,
      avgResponseTime: 65,
      dataRate: 0.4,
      healthStatus: 'healthy',
      errorRate: 0.02,
    },
    temperatureHistory: [],
    humidityHistory: [],
    powerHistory: generateTimeSeriesData(15, 10, 24),
    connectionHistory: generateConnectionHistory(24),
    dataReceivedHistory: generateTimeSeriesData(2, 0.4, 24),
  },
  // HVAC Controller (d11)
  {
    deviceId: 'd11',
    metrics: {
      uptime: 99.9,
      totalRecords: 18745,
      avgResponseTime: 156,
      dataRate: 3.2,
      healthStatus: 'healthy',
      errorRate: 0.01,
    },
    temperatureHistory: generateTimeSeriesData(22.0, 2, 24),
    humidityHistory: generateTimeSeriesData(50, 8, 24),
    powerHistory: generateTimeSeriesData(850, 200, 24),
    connectionHistory: generateConnectionHistory(24),
    dataReceivedHistory: generateTimeSeriesData(8, 1, 24),
  },
  // Front Door Lock (d12)
  {
    deviceId: 'd12',
    metrics: {
      uptime: 99.95,
      totalRecords: 2341,
      avgResponseTime: 45,
      dataRate: 0.2,
      healthStatus: 'healthy',
      errorRate: 0.005,
    },
    temperatureHistory: [],
    humidityHistory: [],
    powerHistory: generateTimeSeriesData(2, 0.5, 24), // Low power for lock
    connectionHistory: generateConnectionHistory(24),
    dataReceivedHistory: generateTimeSeriesData(1, 0.3, 24),
  },
  // Ceiling Fan (d13)
  {
    deviceId: 'd13',
    metrics: {
      uptime: 98.5,
      totalRecords: 4521,
      avgResponseTime: 89,
      dataRate: 0.6,
      healthStatus: 'healthy',
      errorRate: 0.15,
    },
    temperatureHistory: [],
    humidityHistory: [],
    powerHistory: generateTimeSeriesData(35, 15, 24),
    connectionHistory: generateConnectionHistory(24, [{ start: 20, duration: 0.5 }]),
    dataReceivedHistory: generateTimeSeriesData(2, 0.5, 24),
  },
  // Office Building devices
  // HVAC Zone 1 (d14)
  {
    deviceId: 'd14',
    metrics: {
      uptime: 99.7,
      totalRecords: 28456,
      avgResponseTime: 134,
      dataRate: 4.5,
      healthStatus: 'healthy',
      errorRate: 0.03,
    },
    temperatureHistory: generateTimeSeriesData(22.5, 1, 24),
    humidityHistory: generateTimeSeriesData(42, 5, 24),
    powerHistory: generateTimeSeriesData(2500, 500, 24),
    connectionHistory: generateConnectionHistory(24),
    dataReceivedHistory: generateTimeSeriesData(12, 2, 24),
  },
  // Conference Room Sensor (d15)
  {
    deviceId: 'd15',
    metrics: {
      uptime: 99.9,
      totalRecords: 15632,
      avgResponseTime: 98,
      dataRate: 2.1,
      healthStatus: 'healthy',
      errorRate: 0.01,
    },
    temperatureHistory: generateTimeSeriesData(23.2, 1.5, 24),
    humidityHistory: generateTimeSeriesData(40, 6, 24),
    powerHistory: [],
    connectionHistory: generateConnectionHistory(24),
    dataReceivedHistory: generateTimeSeriesData(6, 1, 24),
  },
  // Lobby Motion Sensor (d16)
  {
    deviceId: 'd16',
    metrics: {
      uptime: 99.6,
      totalRecords: 8745,
      avgResponseTime: 67,
      dataRate: 1.2,
      healthStatus: 'healthy',
      errorRate: 0.04,
    },
    temperatureHistory: [],
    humidityHistory: [],
    powerHistory: [],
    connectionHistory: generateConnectionHistory(24),
    dataReceivedHistory: generateTimeSeriesData(45, 15, 24), // Motion events
  },
  // Server Room Environmental (d17)
  {
    deviceId: 'd17',
    metrics: {
      uptime: 99.99,
      totalRecords: 42156,
      avgResponseTime: 45,
      dataRate: 8.5,
      healthStatus: 'healthy',
      errorRate: 0.001,
    },
    temperatureHistory: generateTimeSeriesData(19.5, 0.5, 24), // Server room kept cool
    humidityHistory: generateTimeSeriesData(35, 3, 24), // Low humidity
    powerHistory: generateTimeSeriesData(450, 50, 24),
    connectionHistory: generateConnectionHistory(24),
    dataReceivedHistory: generateTimeSeriesData(20, 3, 24),
  },
  // Main Entrance Security (d18)
  {
    deviceId: 'd18',
    metrics: {
      uptime: 99.8,
      totalRecords: 35412,
      avgResponseTime: 156,
      dataRate: 25.0,
      healthStatus: 'healthy',
      errorRate: 0.02,
    },
    temperatureHistory: [],
    humidityHistory: [],
    powerHistory: generateTimeSeriesData(65, 15, 24),
    connectionHistory: generateConnectionHistory(24),
    dataReceivedHistory: generateTimeSeriesData(85, 20, 24), // High data for video
  },
  // Parking Lot Controller (d19)
  {
    deviceId: 'd19',
    metrics: {
      uptime: 98.9,
      totalRecords: 12456,
      avgResponseTime: 189,
      dataRate: 3.2,
      healthStatus: 'healthy',
      errorRate: 0.11,
    },
    temperatureHistory: generateTimeSeriesData(15, 5, 24), // Outdoor temps
    humidityHistory: generateTimeSeriesData(55, 15, 24),
    powerHistory: generateTimeSeriesData(180, 40, 24),
    connectionHistory: generateConnectionHistory(24, [{ start: 15, duration: 0.25 }]),
    dataReceivedHistory: generateTimeSeriesData(8, 2, 24),
  },
  // Emergency Lighting (d20)
  {
    deviceId: 'd20',
    metrics: {
      uptime: 99.95,
      totalRecords: 4521,
      avgResponseTime: 34,
      dataRate: 0.3,
      healthStatus: 'healthy',
      errorRate: 0.005,
    },
    temperatureHistory: [],
    humidityHistory: [],
    powerHistory: generateTimeSeriesData(5, 2, 24), // Low power standby
    connectionHistory: generateConnectionHistory(24),
    dataReceivedHistory: generateTimeSeriesData(1, 0.3, 24),
  },
];

// Helper function to get analytics for a specific device
export function getDeviceAnalytics(deviceId: string): DeviceAnalyticsData | undefined {
  return mockDeviceAnalytics.find(a => a.deviceId === deviceId);
}
