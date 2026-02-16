const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// ============================================================================
// Shared helpers
// ============================================================================

async function handleResponse<T>(res: Response, fallbackError: string): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || fallbackError);
  }
  return res.json() as Promise<T>;
}

function authHeaders(token: string, workspaceSlug?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (workspaceSlug) {
    headers["x-workspace-alias"] = workspaceSlug;
  }
  return headers;
}

// ============================================================================
// Auth
// ============================================================================

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<{ token?: string; sessionId: string; userId: string }>(res, "Login failed");
}

export async function apiSignup(name: string, email: string, password: string) {
  const res = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, passwordHash: password }),
  });
  return handleResponse<{ userId: string }>(res, "Sign up failed");
}

export async function apiGetMe(token: string) {
  const res = await fetch(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<ApiUser>(res, "Failed to fetch user");
}

// ============================================================================
// User types & API
// ============================================================================

export interface ApiUser {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt?: string;
}

export async function apiUpdateUser(
  token: string,
  userId: string,
  payload: { name?: string; email?: string; passwordHash?: string; avatarUrl?: string },
) {
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<ApiUser>(res, "Failed to update user");
}

export async function apiChangePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/users/change-password`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return handleResponse(res, "Failed to change password");
}

// ============================================================================
// Workspace types & API
// ============================================================================

export interface WorkspaceStats {
  totalDevices: number;
  onlineDevices: number;
  totalAutomations: number;
  totalMembers: number;
}

export interface WorkspaceDetail {
  workspaceId: string;
  name: string;
  slug: string;
  description?: string;
  ownerUserId: string;
  plan?: string;
  createdAt: string;
  updatedAt?: string;
  stats?: WorkspaceStats;
}

export async function apiListWorkspaces(token: string, userId: string): Promise<{ workspaces: WorkspaceDetail[] }> {
  const res = await fetch(`${API_BASE}/users/${userId}/workspaces`, {
    headers: authHeaders(token),
  });
  return handleResponse(res, "Failed to load workspaces");
}

export async function apiCreateWorkspace(token: string, payload: { name: string; slug: string; description?: string }): Promise<WorkspaceDetail> {
  const res = await fetch(`${API_BASE}/workspaces`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "Failed to create workspace");
}

export async function apiGetWorkspaceByAlias(workspaceSlug: string): Promise<WorkspaceDetail> {
  const res = await fetch(`${API_BASE}/workspaces/by-alias/${encodeURIComponent(workspaceSlug)}`, {
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse(res, "Workspace not found");
}

export async function apiCheckSlugAvailable(slug: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/workspaces/by-alias/${encodeURIComponent(slug)}`, {
    headers: { "Content-Type": "application/json" },
  });
  return res.status === 404;
}

export async function apiUpdateWorkspace(
  token: string,
  workspaceSlug: string,
  payload: { name?: string; slug?: string; description?: string },
): Promise<WorkspaceDetail> {
  const res = await fetch(`${API_BASE}/workspace`, {
    method: "PUT",
    headers: authHeaders(token, workspaceSlug),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "Failed to update workspace");
}

export async function apiDeleteWorkspace(token: string, workspaceSlug: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/workspace`, {
    method: "DELETE",
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to delete workspace");
}

// ============================================================================
// Device types & API
// ============================================================================

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
  controllable?: boolean;
  defaultValue?: unknown;
}

export interface DeviceDetail {
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
  lastData?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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
  fieldMappings?: DeviceFieldMapping[];
}

export async function apiListDevices(token: string, workspaceSlug: string): Promise<{ devices: DeviceDetail[] }> {
  const res = await fetch(`${API_BASE}/devices`, {
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to load devices");
}

export async function apiGetDevice(token: string, workspaceSlug: string, deviceId: string): Promise<DeviceDetail> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}`, {
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to load device");
}

export async function apiCreateDevice(token: string, workspaceSlug: string, payload: CreateDevicePayload): Promise<DeviceDetail> {
  const res = await fetch(`${API_BASE}/devices`, {
    method: "POST",
    headers: authHeaders(token, workspaceSlug),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "Failed to create device");
}

export async function apiUpdateDevice(token: string, workspaceSlug: string, deviceId: string, payload: Partial<CreateDevicePayload>): Promise<DeviceDetail> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}`, {
    method: "PUT",
    headers: authHeaders(token, workspaceSlug),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "Failed to update device");
}

export async function apiDeleteDevice(token: string, workspaceSlug: string, deviceId: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}`, {
    method: "DELETE",
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to delete device");
}

// ============================================================================
// Analytics
// ============================================================================

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
  const url = new URL(`${API_BASE}/devices/${deviceId}/analytics`, typeof window !== "undefined" ? window.location.origin : undefined);
  if (params?.from) url.searchParams.set("from", params.from);
  if (params?.to) url.searchParams.set("to", params.to);
  if (params?.cursor) url.searchParams.set("cursor", params.cursor);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));

  const res = await fetch(url.toString(), {
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to load analytics");
}

// ============================================================================
// Ingest
// ============================================================================

export async function apiIngestDeviceData(
  token: string,
  workspaceSlug: string,
  deviceId: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/ingest`, {
    method: "POST",
    headers: authHeaders(token, workspaceSlug),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "Failed to ingest data");
}

// ============================================================================
// Device API Keys
// ============================================================================

export interface DeviceApiKeyInfo {
  hasKey: boolean;
  deviceApiKeyId?: string;
  name?: string;
  keyPrefix?: string;
  createdAt?: string;
}

export interface CreateDeviceApiKeyResponse {
  deviceApiKeyId: string;
  deviceId: string;
  key: string;
  keyPrefix: string;
  message: string;
}

export async function apiGetDeviceApiKey(token: string, workspaceSlug: string, deviceId: string): Promise<DeviceApiKeyInfo> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/api-key`, {
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to get device API key");
}

export async function apiCreateDeviceApiKey(
  token: string,
  workspaceSlug: string,
  deviceId: string,
  payload?: { name?: string },
): Promise<CreateDeviceApiKeyResponse> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/api-key`, {
    method: "POST",
    headers: authHeaders(token, workspaceSlug),
    body: JSON.stringify(payload || {}),
  });
  return handleResponse(res, "Failed to create device API key");
}

export async function apiRevokeDeviceApiKey(token: string, workspaceSlug: string, deviceId: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/api-key`, {
    method: "DELETE",
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to revoke device API key");
}

export async function apiControlDeviceField(
  token: string,
  workspaceSlug: string,
  deviceId: string,
  field: string,
  value: unknown,
): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/control`, {
    method: "POST",
    headers: authHeaders(token, workspaceSlug),
    body: JSON.stringify({ field, value }),
  });
  return handleResponse(res, "Failed to send control command");
}

// ============================================================================
// Workspace API Keys
// ============================================================================

export interface WorkspaceApiKey {
  apiKeyId: string;
  workspaceId: string;
  name: string;
  keyPrefix: string;
  revokedAt?: string;
  lastUsedAt?: string;
  createdAt: string;
}

export interface CreateWorkspaceApiKeyResponse {
  apiKeyId: string;
  key: string;
  keyPrefix: string;
  message: string;
}

export async function apiListWorkspaceApiKeys(token: string, workspaceSlug: string): Promise<{ keys: WorkspaceApiKey[] }> {
  const res = await fetch(`${API_BASE}/workspace/api-keys`, {
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to list workspace API keys");
}

export async function apiCreateWorkspaceApiKey(
  token: string,
  workspaceSlug: string,
  payload?: { name?: string },
): Promise<CreateWorkspaceApiKeyResponse> {
  const res = await fetch(`${API_BASE}/workspace/api-keys`, {
    method: "POST",
    headers: authHeaders(token, workspaceSlug),
    body: JSON.stringify(payload || {}),
  });
  return handleResponse(res, "Failed to create workspace API key");
}

export async function apiRevokeWorkspaceApiKey(token: string, workspaceSlug: string, apiKeyId: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/workspace/api-keys/${apiKeyId}`, {
    method: "DELETE",
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to revoke workspace API key");
}

// ============================================================================
// Workspace Members
// ============================================================================

export type MemberRole = "owner" | "admin" | "editor" | "viewer";
export type DevicePermission = "view" | "control" | "manage";

export interface WorkspaceMember {
  userId: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  role: MemberRole;
  devicePermissions?: Record<string, DevicePermission[]>;
  createdAt: string;
}

export async function apiListMembers(token: string, workspaceSlug: string): Promise<{ members: WorkspaceMember[] }> {
  const res = await fetch(`${API_BASE}/members`, {
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to list members");
}

export async function apiGetMyMembership(token: string, workspaceSlug: string): Promise<WorkspaceMember> {
  const res = await fetch(`${API_BASE}/members/me`, {
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to get membership");
}

export async function apiAddMember(
  token: string,
  workspaceSlug: string,
  payload: { userId: string; role: MemberRole; devicePermissions?: Record<string, DevicePermission[]> },
): Promise<{ member: WorkspaceMember }> {
  const res = await fetch(`${API_BASE}/members`, {
    method: "POST",
    headers: authHeaders(token, workspaceSlug),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "Failed to add member");
}

export async function apiUpdateMember(
  token: string,
  workspaceSlug: string,
  userId: string,
  payload: { role?: MemberRole; devicePermissions?: Record<string, DevicePermission[]> },
): Promise<{ member: WorkspaceMember }> {
  const res = await fetch(`${API_BASE}/members/${userId}`, {
    method: "PUT",
    headers: authHeaders(token, workspaceSlug),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "Failed to update member");
}

export async function apiRemoveMember(token: string, workspaceSlug: string, userId: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/members/${userId}`, {
    method: "DELETE",
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to remove member");
}

// ============================================================================
// Workspace Plan & Billing
// ============================================================================

export type WorkspacePlan = "starter" | "professional" | "business" | "enterprise";

export interface WorkspacePlanInfo {
  workspaceId: string;
  plan: WorkspacePlan;
  maxDevices?: number;
  maxMembers?: number;
  maxAutomations?: number;
  dataRetentionDays?: number;
}

export interface BillingInvoice {
  invoiceId: string;
  workspaceId: string;
  amount: number;
  status: string;
  period: string;
  paidAt?: string;
  createdAt: string;
}

export async function apiGetPlan(token: string, workspaceSlug: string): Promise<WorkspacePlanInfo> {
  const res = await fetch(`${API_BASE}/plan`, {
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to get plan");
}

export async function apiUpdatePlan(token: string, workspaceSlug: string, plan: WorkspacePlan): Promise<{ workspaceId: string; plan: string }> {
  const res = await fetch(`${API_BASE}/plan`, {
    method: "PUT",
    headers: authHeaders(token, workspaceSlug),
    body: JSON.stringify({ plan }),
  });
  return handleResponse(res, "Failed to update plan");
}

export async function apiGetBilling(token: string, workspaceSlug: string): Promise<{ invoices: BillingInvoice[] }> {
  const res = await fetch(`${API_BASE}/billing`, {
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to get billing history");
}

// ============================================================================
// Automations
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
  automationId: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: AutomationStatus;
  triggerType: AutomationTriggerType;
  triggerConfig: AutomationTriggerConfig;
  conditionGroups?: AutomationConditionGroup[];
  conditionLogic?: "AND" | "OR";
  actions: AutomationActionConfig[];
  lastTriggeredAt?: string;
  executionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutomationPayload {
  name: string;
  description?: string;
  triggerType: AutomationTriggerType;
  triggerConfig: AutomationTriggerConfig;
  conditionGroups?: AutomationConditionGroup[];
  conditionLogic?: "AND" | "OR";
  actions: AutomationActionConfig[];
}

export interface UpdateAutomationPayload {
  name?: string;
  description?: string;
  status?: AutomationStatus;
  triggerType?: AutomationTriggerType;
  triggerConfig?: AutomationTriggerConfig;
  conditionGroups?: AutomationConditionGroup[];
  conditionLogic?: "AND" | "OR";
  actions?: AutomationActionConfig[];
}

export async function apiListAutomations(token: string, workspaceSlug: string): Promise<{ automations: Automation[] }> {
  const res = await fetch(`${API_BASE}/automations`, {
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to load automations");
}

export async function apiGetAutomation(token: string, workspaceSlug: string, automationId: string): Promise<Automation> {
  const res = await fetch(`${API_BASE}/automations/${automationId}`, {
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to load automation");
}

export async function apiCreateAutomation(token: string, workspaceSlug: string, payload: CreateAutomationPayload): Promise<Automation> {
  const res = await fetch(`${API_BASE}/automations`, {
    method: "POST",
    headers: authHeaders(token, workspaceSlug),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "Failed to create automation");
}

export async function apiUpdateAutomation(token: string, workspaceSlug: string, automationId: string, payload: UpdateAutomationPayload): Promise<Automation> {
  const res = await fetch(`${API_BASE}/automations/${automationId}`, {
    method: "PUT",
    headers: authHeaders(token, workspaceSlug),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "Failed to update automation");
}

export async function apiDeleteAutomation(token: string, workspaceSlug: string, automationId: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/automations/${automationId}`, {
    method: "DELETE",
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to delete automation");
}

// ============================================================================
// Automation Execution Logs
// ============================================================================

export type AutomationLogStatus = "success" | "partial_failure" | "failure";

export interface ActionExecutionResult {
  actionIndex: number;
  actionType: string;
  status: "success" | "failure";
  error?: string;
  durationMs: number;
}

export interface AutomationLog {
  logId: string;
  workspaceId: string;
  automationId: string;
  automationName: string;
  triggerType: string;
  triggerData: Record<string, unknown>;
  conditionsMatched: boolean;
  status: AutomationLogStatus;
  actionResults: ActionExecutionResult[];
  totalDurationMs: number;
  createdAt: string;
  expiresAt?: string;
}

export async function apiListAutomationLogs(
  token: string,
  workspaceSlug: string,
  automationId: string,
  params?: { limit?: number },
): Promise<{ logs: AutomationLog[] }> {
  const url = new URL(`${API_BASE}/automations/${automationId}/logs`, typeof window !== "undefined" ? window.location.origin : undefined);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));

  const res = await fetch(url.toString(), {
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to load automation logs");
}

export async function apiListWorkspaceAutomationLogs(
  token: string,
  workspaceSlug: string,
  params?: { automationId?: string; status?: string; limit?: number },
): Promise<{ logs: AutomationLog[] }> {
  const url = new URL(`${API_BASE}/automations/logs`, typeof window !== "undefined" ? window.location.origin : undefined);
  if (params?.automationId) url.searchParams.set("automationId", params.automationId);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));

  const res = await fetch(url.toString(), {
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to load automation logs");
}

// ============================================================================
// Automation Stats
// ============================================================================

export interface AutomationStats {
  automationId: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  partialFailureCount: number;
  lastExecutionAt: string | null;
  lastExecutionStatus: AutomationLogStatus | null;
  averageDurationMs: number;
  totalDurationMs: number;
}

export async function apiGetAutomationStats(
  token: string,
  workspaceSlug: string,
  automationId: string,
): Promise<AutomationStats> {
  const res = await fetch(`${API_BASE}/automations/${automationId}/stats`, {
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to load automation stats");
}

export async function apiListAutomationStats(
  token: string,
  workspaceSlug: string,
): Promise<{ stats: AutomationStats[] }> {
  const res = await fetch(`${API_BASE}/automations/stats`, {
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to load automation stats");
}

// ============================================================================
// Workspace Invitations
// ============================================================================

export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

export interface WorkspaceInvitation {
  invitationId: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  email: string;
  role: MemberRole;
  devicePermissions?: Record<string, DevicePermission[]>;
  invitedByUserId: string;
  invitedByName?: string;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

export interface CreateInvitationPayload {
  email: string;
  role: MemberRole;
  devicePermissions?: Record<string, DevicePermission[]>;
}

export interface CreateInvitationResponse {
  invitationId: string;
  token: string;
  email: string;
  role: MemberRole;
  status: string;
  expiresAt: string;
  emailSent?: boolean;
}

export async function apiCreateInvitation(
  token: string,
  workspaceSlug: string,
  payload: CreateInvitationPayload,
): Promise<CreateInvitationResponse> {
  const res = await fetch(`${API_BASE}/invitations`, {
    method: "POST",
    headers: authHeaders(token, workspaceSlug),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "Failed to create invitation");
}

export async function apiListInvitations(
  token: string,
  workspaceSlug: string,
): Promise<{ invitations: WorkspaceInvitation[] }> {
  const res = await fetch(`${API_BASE}/invitations`, {
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to list invitations");
}

export async function apiGetInvitationByToken(inviteToken: string): Promise<WorkspaceInvitation> {
  const res = await fetch(`${API_BASE}/invitations/by-token/${inviteToken}`, {
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse(res, "Failed to get invitation");
}

export interface AcceptInvitationResponse {
  ok: boolean;
  workspaceId: string;
  workspaceSlug: string;
  role: string;
  userId?: string;
  userCreated?: boolean;
  token?: string;
  sessionId?: string;
}

export async function apiAcceptInvitation(
  authToken: string | undefined,
  inviteToken: string,
): Promise<AcceptInvitationResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}/invitations/accept/${inviteToken}`, {
    method: "POST",
    headers,
  });
  return handleResponse(res, "Failed to accept invitation");
}

export async function apiDeclineInvitation(inviteToken: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/invitations/decline/${inviteToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse(res, "Failed to decline invitation");
}

export async function apiCancelInvitation(
  token: string,
  workspaceSlug: string,
  invitationId: string,
): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/invitations/${invitationId}`, {
    method: "DELETE",
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to cancel invitation");
}

export async function apiGetMyInvitations(token: string): Promise<{ invitations: WorkspaceInvitation[] }> {
  const res = await fetch(`${API_BASE}/users/me/invitations`, {
    headers: authHeaders(token),
  });
  return handleResponse(res, "Failed to get invitations");
}

// ============================================================================
// Workspace Notifications
// ============================================================================

export type NotificationType =
  // Device
  | "device_created"
  | "device_updated"
  | "device_deleted"
  | "device_online"
  | "device_offline"
  // Automation
  | "automation_created"
  | "automation_updated"
  | "automation_deleted"
  | "automation_triggered"
  | "automation_failed"
  | "automation_partial_failure"
  // Members
  | "member_joined"
  | "member_left"
  | "member_role_changed"
  // Invitations
  | "invitation_created"
  | "invitation_accepted"
  | "invitation_declined"
  // Workspace
  | "workspace_updated"
  // API Keys
  | "api_key_created"
  | "api_key_revoked"
  // System
  | "system";

export type NotificationSeverity = "info" | "warning" | "error" | "success";

export interface WorkspaceNotification {
  notificationId: string;
  workspaceId: string;
  userId: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  disabledTypes: NotificationType[];
  emailEnabled: boolean;
}

export async function apiListNotifications(
  token: string,
  workspaceSlug: string,
  params?: { unreadOnly?: boolean; limit?: number; cursor?: string },
): Promise<{ notifications: WorkspaceNotification[]; hasMore: boolean; nextCursor?: string }> {
  const url = new URL(`${API_BASE}/notifications`, typeof window !== "undefined" ? window.location.origin : undefined);
  if (params?.unreadOnly) url.searchParams.set("unreadOnly", "true");
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.cursor) url.searchParams.set("cursor", params.cursor);

  const res = await fetch(url.toString(), {
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to load notifications");
}

export async function apiGetUnreadCount(
  token: string,
  workspaceSlug: string,
): Promise<{ unreadCount: number }> {
  const res = await fetch(`${API_BASE}/notifications/unread-count`, {
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to get unread count");
}

export async function apiMarkNotificationRead(
  token: string,
  workspaceSlug: string,
  notificationId: string,
): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
    method: "POST",
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to mark notification as read");
}

export async function apiMarkAllNotificationsRead(
  token: string,
  workspaceSlug: string,
): Promise<{ ok: boolean; markedCount: number }> {
  const res = await fetch(`${API_BASE}/notifications/read-all`, {
    method: "POST",
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to mark all notifications as read");
}

export async function apiGetNotificationPreferences(
  token: string,
  workspaceSlug: string,
): Promise<NotificationPreferences> {
  const res = await fetch(`${API_BASE}/notifications/preferences`, {
    headers: authHeaders(token, workspaceSlug),
  });
  return handleResponse(res, "Failed to get notification preferences");
}

export async function apiUpdateNotificationPreferences(
  token: string,
  workspaceSlug: string,
  payload: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const res = await fetch(`${API_BASE}/notifications/preferences`, {
    method: "PUT",
    headers: authHeaders(token, workspaceSlug),
    body: JSON.stringify(payload),
  });
  return handleResponse(res, "Failed to update notification preferences");
}
