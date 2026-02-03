// Shared TypeScript schemas and lightweight runtime validators for API routes.

export interface CreateDeviceFieldMapping {
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

export interface CreateDeviceBody {
  name: string;
  type: string;
  description?: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  location?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  fieldMappings?: CreateDeviceFieldMapping[];
}

export interface CreateAutomationBody {
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  actions: Array<Record<string, unknown>>;
}

export interface ApiExplorerBody {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateCreateDeviceBody(
  body: unknown
): { ok: true; value: CreateDeviceBody } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be an object" };
  }
  const b = body as Partial<CreateDeviceBody>;
  if (!isNonEmptyString(b.name)) {
    return { ok: false, error: "name is required" };
  }
  if (!isNonEmptyString(b.type)) {
    return { ok: false, error: "type is required" };
  }
  const value: CreateDeviceBody = { name: b.name.trim(), type: b.type.trim() };
  const full = body as Record<string, unknown>;
  if (typeof full.description === "string") value.description = full.description.trim();
  if (typeof full.manufacturer === "string") value.manufacturer = full.manufacturer.trim();
  if (typeof full.model === "string") value.model = full.model.trim();
  if (typeof full.firmwareVersion === "string") value.firmwareVersion = full.firmwareVersion.trim();
  if (typeof full.location === "string") value.location = full.location.trim();
  if (Array.isArray(full.tags)) value.tags = full.tags.filter((t): t is string => typeof t === "string");
  if (full.metadata && typeof full.metadata === "object" && !Array.isArray(full.metadata)) {
    value.metadata = full.metadata as Record<string, unknown>;
  }
  if (Array.isArray(full.fieldMappings)) {
    const validTypes = new Set(["number", "string", "boolean", "json"]);
    value.fieldMappings = full.fieldMappings
      .filter((fm: any) => fm && typeof fm.sourceField === "string" && typeof fm.displayLabel === "string" && validTypes.has(fm.dataType))
      .map((fm: any) => ({
        sourceField: fm.sourceField,
        displayLabel: fm.displayLabel,
        dataType: fm.dataType,
        unit: fm.unit,
        min: fm.min,
        max: fm.max,
        precision: fm.precision,
        icon: fm.icon,
        color: fm.color,
      }));
  }
  return { ok: true, value };
}

export function validateCreateAutomationBody(
  body: unknown
): { ok: true; value: CreateAutomationBody } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be an object" };
  }
  const b = body as Partial<CreateAutomationBody>;
  if (!isNonEmptyString(b.name)) {
    return { ok: false, error: "name is required" };
  }
  if (!isNonEmptyString(b.triggerType)) {
    return { ok: false, error: "triggerType is required" };
  }
  if (b.triggerConfig == null || typeof b.triggerConfig !== "object") {
    return { ok: false, error: "triggerConfig is required" };
  }
  if (!Array.isArray(b.actions) || b.actions.length === 0) {
    return { ok: false, error: "actions must be a non-empty array" };
  }
  return {
    ok: true,
    value: {
      name: b.name.trim(),
      description: b.description,
      triggerType: b.triggerType,
      triggerConfig: b.triggerConfig as Record<string, unknown>,
      actions: b.actions as Array<Record<string, unknown>>,
    },
  };
}

export function validateApiExplorerBody(
  body: unknown
): { ok: true; value: ApiExplorerBody } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be an object" };
  }
  const b = body as Partial<ApiExplorerBody>;
  if (!isNonEmptyString(b.method)) {
    return { ok: false, error: "method is required" };
  }
  if (!isNonEmptyString(b.path)) {
    return { ok: false, error: "path is required" };
  }
  return {
    ok: true,
    value: {
      method: b.method.toUpperCase(),
      path: b.path,
      headers: b.headers ?? {},
      body: b.body,
    },
  };
}
