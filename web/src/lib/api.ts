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
    body: JSON.stringify({ email, passwordHash: password }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || "Sign up failed");
  }
  return res.json();
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
  return (await res.json()) as { userId: string; email: string; avatarUrl?: string };
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

export async function apiUpdateUser(token: string, userId: string, payload: { email?: string; avatarUrl?: string }) {
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
  return res.json() as Promise<{ userId: string; email: string; avatarUrl?: string }>;
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
