const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Login failed");
  }
  return (await res.json()) as { token?: string; sessionId: string; userId: string };
}

export async function apiSignup(name: string, email: string, password: string) {
  const res = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name,email, passwordHash: password }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Sign up failed");
  }
  return res.json() as Promise<{ userId: string }>;
}

export async function apiGetMe(token: string) {
  const res = await fetch(`${API_BASE}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Failed to fetch user");
  }
  return (await res.json()) as { userId: string; name: string; email: string; avatarUrl?: string };
}

export async function apiListWorkspaces(token: string, userId: string) {
  const res = await fetch(`${API_BASE}/users/${userId}/workspaces`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Failed to load workspaces");
  }
  return res.json() as Promise<{
    workspaces: { workspaceId: string; name: string; slug: string; description?: string; createdAt: string }[];
  }>;
}

export async function apiCreateWorkspace(token: string, payload: { name: string; slug: string; description?: string }) {
  const res = await fetch(`${API_BASE}/workspaces`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Failed to create workspace");
  }
  return res.json() as Promise<{ workspaceId: string; name: string; slug: string; description?: string; createdAt: string }>;
}

export async function apiListDevices(token: string, workspaceSlug: string) {
  const res = await fetch(`${API_BASE}/devices`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-workspace-alias": workspaceSlug,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Failed to load devices");
  }
  return res.json() as Promise<{
    devices: { deviceId: string; name: string; type: string; createdAt: string }[];
  }>;
}

export async function apiCheckSlugAvailable(slug: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/workspaces/by-alias/${encodeURIComponent(slug)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  // 404 = available, 200 = taken
  return res.status === 404;
}

export async function apiUpdateUser(
  token: string,
  userId: string,
  payload: { name?: string; email?: string; avatarUrl?: string },
) {
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Failed to update user");
  }
  return res.json() as Promise<{ userId: string; name: string; email: string; avatarUrl?: string }>;
}

export interface CreateDevicePayload {
  name: string;
  type: string;
  description?: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  location?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  fieldMappings?: {
    sourceField: string;
    displayLabel: string;
    dataType: "number" | "string" | "boolean" | "json";
    unit?: string;
    min?: number;
    max?: number;
    precision?: number;
    icon?: string;
    color?: string;
  }[];
}

// ---- Device detail ----

export interface DeviceDetail {
  pk: string;
  sk: string;
  entityType: string;
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
  fieldMappings?: {
    sourceField: string;
    displayLabel: string;
    dataType: "number" | "string" | "boolean" | "json";
    unit?: string;
    min?: number;
    max?: number;
    precision?: number;
    icon?: string;
    color?: string;
  }[];
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
}

export async function apiGetDevice(token: string, workspaceSlug: string, deviceId: string): Promise<DeviceDetail> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-workspace-alias": workspaceSlug,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Failed to load device");
  }
  return res.json() as Promise<DeviceDetail>;
}

// ---- Analytics ----

export interface AnalyticsPoint {
  at: string;
  status?: string;
  fields: Record<string, unknown>;
}

export interface AnalyticsResponse {
  deviceId: string;
  from?: string;
  to?: string;
  points: AnalyticsPoint[];
  nextCursor?: string;
}

export async function apiGetDeviceAnalytics(
  token: string,
  workspaceSlug: string,
  deviceId: string,
  params?: { from?: string; to?: string; cursor?: string; limit?: number },
): Promise<AnalyticsResponse> {
  const url = new URL(`${API_BASE}/devices/${deviceId}/analytics`);
  if (params?.from) url.searchParams.set("from", params.from);
  if (params?.to) url.searchParams.set("to", params.to);
  if (params?.cursor) url.searchParams.set("cursor", params.cursor);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));

  const res = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-workspace-alias": workspaceSlug,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Failed to load analytics");
  }
  return res.json() as Promise<AnalyticsResponse>;
}

// ---- Ingest (seed data) ----

export async function apiIngestDeviceData(
  token: string,
  workspaceSlug: string,
  deviceId: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-workspace-alias": workspaceSlug,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Failed to ingest data");
  }
  return res.json() as Promise<{ ok: boolean }>;
}

export async function apiUpdateDevice(token: string, workspaceSlug: string, deviceId: string, payload: Partial<CreateDevicePayload>) {
  const res = await fetch(`${API_BASE}/devices/${deviceId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-workspace-alias": workspaceSlug,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Failed to update device");
  }
  return res.json();
}

// ---- Create device ----

export async function apiCreateDevice(token: string, workspaceSlug: string, payload: CreateDevicePayload) {
  const res = await fetch(`${API_BASE}/devices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-workspace-alias": workspaceSlug,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Failed to create device");
  }
  return res.json();
}

// ============================================================================
// Automations API
// ============================================================================

export type AutomationStatus = "active" | "paused" | "disabled";
export type AutomationTriggerType = "device_data" | "device_status" | "schedule";

export interface DeviceDataCondition {
  field: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "greater_than_or_equal" | "less_than_or_equal" | "contains" | "not_contains";
  value: unknown;
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
  cron: string;
  timezone?: string;
}

export type AutomationTriggerConfig =
  | DeviceDataTriggerConfig
  | DeviceStatusTriggerConfig
  | ScheduleTriggerConfig;

export type AutomationActionType = "send_webhook" | "send_email" | "send_sms" | "update_device" | "delay" | "log";

export interface AutomationActionConfigBase {
  type: AutomationActionType;
  delayMs?: number;
}

export interface SendWebhookActionConfig extends AutomationActionConfigBase {
  type: "send_webhook";
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  bodyTemplate?: Record<string, unknown>;
}

export interface UpdateDeviceActionConfig extends AutomationActionConfigBase {
  type: "update_device";
  targetDeviceId: string;
  field: string;
  value: unknown;
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

export interface AutomationConditionGroup {
  logic: "AND" | "OR";
  conditions: DeviceDataCondition[];
  deviceId: string;
}

export interface Automation {
  pk: string;
  sk: string;
  entityType: "AUTOMATION";
  workspaceId: string;
  automationId: string;
  name: string;
  description?: string;
  status: AutomationStatus;
  triggerType: AutomationTriggerType;
  triggerConfig: AutomationTriggerConfig;
  conditionGroups?: AutomationConditionGroup[];
  conditionLogic?: "AND" | "OR";
  actions: AutomationActionConfig[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutomationPayload {
  name: string;
  description?: string;
  triggerType: AutomationTriggerType;
  triggerConfig: AutomationTriggerConfig;
  actions: AutomationActionConfig[];
}

export interface UpdateAutomationPayload {
  name?: string;
  description?: string;
  status?: AutomationStatus;
  triggerType?: AutomationTriggerType;
  triggerConfig?: AutomationTriggerConfig;
  actions?: AutomationActionConfig[];
}

// ---- List automations ----

export async function apiListAutomations(token: string, workspaceSlug: string): Promise<{ automations: Automation[] }> {
  const res = await fetch(`${API_BASE}/automations`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-workspace-alias": workspaceSlug,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Failed to load automations");
  }
  return res.json() as Promise<{ automations: Automation[] }>;
}

// ---- Get automation ----

export async function apiGetAutomation(token: string, workspaceSlug: string, automationId: string): Promise<Automation> {
  const res = await fetch(`${API_BASE}/automations/${automationId}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-workspace-alias": workspaceSlug,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Failed to load automation");
  }
  return res.json() as Promise<Automation>;
}

// ---- Create automation ----

export async function apiCreateAutomation(token: string, workspaceSlug: string, payload: CreateAutomationPayload): Promise<{ automationId: string }> {
  const res = await fetch(`${API_BASE}/automations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-workspace-alias": workspaceSlug,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Failed to create automation");
  }
  return res.json() as Promise<{ automationId: string }>;
}

// ---- Update automation ----

export async function apiUpdateAutomation(token: string, workspaceSlug: string, automationId: string, payload: UpdateAutomationPayload): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/automations/${automationId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-workspace-alias": workspaceSlug,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Failed to update automation");
  }
  return res.json() as Promise<{ ok: boolean }>;
}

// ---- Delete automation ----

export async function apiDeleteAutomation(token: string, workspaceSlug: string, automationId: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/automations/${automationId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-workspace-alias": workspaceSlug,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Failed to delete automation");
  }
  return res.json() as Promise<{ ok: boolean }>;
}
