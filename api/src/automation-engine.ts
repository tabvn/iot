import type { StorageEnv } from '@/db/storage';
import { get, put, queryByPk } from '@/db/storage';
import type {
  AutomationEntity,
  AutomationConditionGroup,
  DeviceDataTriggerConfig,
  DeviceDataCondition,
  DeviceEntity,
  AutomationActionConfig,
  ScheduleTriggerConfig,
  WorkspaceEntity,
  AutomationLogEntity,
  AutomationLogIndexEntity,
  AutomationStatsEntity,
  AutomationLogStatus,
  ActionExecutionResult,
  AutomationTriggerType,
  WorkspacePlan,
} from '@/db/types';
import { Keys, EntityTypes } from '@/db/types';
import { sendEmail, automationEmailHtml, automationEmailText, type EmailEnv } from '@/email';
import { getPlanLimits } from '@/rate-limit';

function evaluateCondition(cond: DeviceDataCondition, fields: Record<string, any>): boolean {
  const actual = fields[cond.field];

  switch (cond.operator) {
    case "equals":
      return actual === cond.value;
    case "not_equals":
      return actual !== cond.value;
    case "greater_than":
      return typeof actual === "number" && actual > cond.value;
    case "less_than":
      return typeof actual === "number" && actual < cond.value;
    case "greater_than_or_equal":
      return typeof actual === "number" && actual >= cond.value;
    case "less_than_or_equal":
      return typeof actual === "number" && actual <= cond.value;
    case "contains":
      if (typeof actual === "string") return actual.includes(cond.value);
      if (Array.isArray(actual)) return actual.includes(cond.value);
      return false;
    case "not_contains":
      if (typeof actual === "string") return !actual.includes(cond.value);
      if (Array.isArray(actual)) return !actual.includes(cond.value);
      return true;
    default:
      return false;
  }
}

function evaluateDeviceDataTrigger(trigger: DeviceDataTriggerConfig, fields: Record<string, any>): boolean {
  const results = trigger.conditions.map((c) => evaluateCondition(c, fields));
  return trigger.logic === "AND" ? results.every(Boolean) : results.some(Boolean);
}

function evaluateConditionGroup(group: AutomationConditionGroup, fields: Record<string, any>): boolean {
  const results = group.conditions.map((c) => evaluateCondition(c, fields));
  return group.logic === "AND" ? results.every(Boolean) : results.some(Boolean);
}

// Fetch the latest persisted device fields from R2 for condition evaluation.
async function getDeviceFields(env: StorageEnv, workspaceId: string, deviceId: string): Promise<Record<string, any> | null> {
  const { pk, sk } = Keys.device(workspaceId, deviceId);
  const entity = await get<DeviceEntity>(env, pk, sk);
  if (!entity) return null;
  return entity.lastData as Record<string, any> | null;
}

// Evaluate optional conditionGroups on an automation.
// Returns true if no conditions, or all/any groups pass based on conditionLogic.
async function evaluateConditionGroups(
  env: StorageEnv,
  workspaceId: string,
  automation: AutomationEntity,
  knownDeviceFields?: { deviceId: string; fields: Record<string, any> }
): Promise<boolean> {
  const groups = automation.conditionGroups;
  if (!groups || groups.length === 0) return true;

  const logic = automation.conditionLogic ?? "AND";
  const results: boolean[] = [];

  for (const group of groups) {
    let fields: Record<string, any> | null = null;

    // Use known fields if they match the device, otherwise fetch from R2
    if (knownDeviceFields && knownDeviceFields.deviceId === group.deviceId) {
      fields = knownDeviceFields.fields;
    } else {
      fields = await getDeviceFields(env, workspaceId, group.deviceId);
    }

    if (!fields) {
      results.push(false);
      continue;
    }

    results.push(evaluateConditionGroup(group, fields));
  }

  return logic === "AND" ? results.every(Boolean) : results.some(Boolean);
}

export async function evaluateDeviceDataAutomations(
  env: StorageEnv,
  workspaceId: string,
  automations: AutomationEntity[],
  deviceId: string,
  fields: Record<string, any>
): Promise<AutomationEntity[]> {
  const candidates = automations.filter(
    (a) =>
      a.status === "active" &&
      a.triggerType === "device_data" &&
      a.triggerConfig.type === "device_data" &&
      a.triggerConfig.deviceId === deviceId &&
      evaluateDeviceDataTrigger(a.triggerConfig as DeviceDataTriggerConfig, fields)
  );

  // Evaluate extra condition groups (if any)
  const results: AutomationEntity[] = [];
  for (const a of candidates) {
    if (await evaluateConditionGroups(env, workspaceId, a, { deviceId, fields })) {
      results.push(a);
    }
  }
  return results;
}

export async function evaluateDeviceStatusAutomations(
  env: StorageEnv,
  workspaceId: string,
  automations: AutomationEntity[],
  deviceId: string,
  status: "online" | "offline"
): Promise<AutomationEntity[]> {
  const candidates = automations.filter(
    (a) =>
      a.status === "active" &&
      a.triggerType === "device_status" &&
      a.triggerConfig.type === "device_status" &&
      a.triggerConfig.deviceId === deviceId &&
      a.triggerConfig.status === status
  );

  const results: AutomationEntity[] = [];
  for (const a of candidates) {
    if (await evaluateConditionGroups(env, workspaceId, a)) {
      results.push(a);
    }
  }
  return results;
}

// Execute automation actions including HTTP fetch, email, device DO commands, etc.
export async function executeActions(
  env: StorageEnv & EmailEnv,
  workspaceId: string,
  actions: AutomationActionConfig[],
  context: Record<string, any>
) {
  // Get workspace name for email context
  let workspaceName = workspaceId;
  let automationName = context.automationId || "Automation";
  try {
    const result = await queryByPk(env, `WS#${workspaceId}`);
    const wsMeta = result.items.find((e: any) => e.sk === "METADATA") as WorkspaceEntity | undefined;
    if (wsMeta) workspaceName = wsMeta.name;
  } catch {
    // Use workspaceId as fallback
  }

  for (const action of actions) {
    // Optional per-action delay
    if (action.delayMs && action.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, action.delayMs));
    }

    try {
      switch (action.type) {
        case "log": {
          console.log("[automation][log]", { workspaceId, action, context });
          break;
        }
        case "send_webhook": {
          const url = action.url;
          const method = action.method ?? "POST";
          const headers = {
            "Content-Type": "application/json",
            ...(action.headers ?? {}),
          };
          const bodyObj = {
            ...(action.bodyTemplate ?? {}),
            context,
          };
          await fetch(url, {
            method,
            headers,
            body: method === "GET" ? undefined : JSON.stringify(bodyObj),
          }).catch((err) => {
            console.error("[automation][send_webhook][error]", err);
          });
          break;
        }
        case "update_device": {
          const targetDeviceId = action.targetDeviceId;
          const anyEnv = env as any;
          if (anyEnv.DEVICE_DO) {
            const doName = `${workspaceId}:${targetDeviceId}`;
            const id = anyEnv.DEVICE_DO.idFromName(doName);
            const stub = anyEnv.DEVICE_DO.get(id);
            await stub
              .fetch("https://device/control", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "set_field",
                  field: action.field,
                  value: action.value,
                  context,
                }),
              })
              .catch((err: unknown) => {
                console.error("[automation][update_device][error]", err);
              });
          }
          break;
        }
        case "send_email": {
          const result = await sendEmail(env, {
            to: action.to,
            subject: action.subject,
            html: automationEmailHtml({
              subject: action.subject,
              body: action.body,
              workspaceName,
              automationName,
              context,
            }),
            text: automationEmailText({
              subject: action.subject,
              body: action.body,
              workspaceName,
              automationName,
              context,
            }),
          });
          if (!result.ok) {
            console.error("[automation][send_email][error]", result.error);
          }
          break;
        }
        case "delay": {
          const seconds = action.delaySeconds ?? 0;
          if (seconds > 0) {
            await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
          }
          break;
        }
      }
    } catch (err) {
      console.error("[automation][executeActions][error]", err);
    }
  }
}

// Like executeActions but returns per-action results for logging
export async function executeActionsWithLogging(
  env: StorageEnv & EmailEnv,
  workspaceId: string,
  actions: AutomationActionConfig[],
  context: Record<string, any>
): Promise<ActionExecutionResult[]> {
  const results: ActionExecutionResult[] = [];

  let workspaceName = workspaceId;
  const automationName = context.automationId || "Automation";
  try {
    const result = await queryByPk(env, `WS#${workspaceId}`);
    const wsMeta = result.items.find((e: any) => e.sk === "METADATA") as WorkspaceEntity | undefined;
    if (wsMeta) workspaceName = wsMeta.name;
  } catch {
    // Use workspaceId as fallback
  }

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const start = Date.now();
    let status: "success" | "failure" = "success";
    let error: string | undefined;

    if (action.delayMs && action.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, action.delayMs));
    }

    try {
      switch (action.type) {
        case "log": {
          console.log("[automation][log]", { workspaceId, action, context });
          break;
        }
        case "send_webhook": {
          const url = action.url;
          const method = action.method ?? "POST";
          const headers = {
            "Content-Type": "application/json",
            ...(action.headers ?? {}),
          };
          const bodyObj = {
            ...(action.bodyTemplate ?? {}),
            context,
          };
          const resp = await fetch(url, {
            method,
            headers,
            body: method === "GET" ? undefined : JSON.stringify(bodyObj),
          });
          if (!resp.ok) {
            status = "failure";
            error = `HTTP ${resp.status}`;
          }
          break;
        }
        case "update_device": {
          const targetDeviceId = action.targetDeviceId;
          const anyEnv = env as any;
          if (anyEnv.DEVICE_DO) {
            const doName = `${workspaceId}:${targetDeviceId}`;
            const id = anyEnv.DEVICE_DO.idFromName(doName);
            const stub = anyEnv.DEVICE_DO.get(id);
            const resp = await stub.fetch("https://device/control", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "set_field",
                field: action.field,
                value: action.value,
                context,
              }),
            });
            if (!resp.ok) {
              status = "failure";
              error = `Device control HTTP ${resp.status}`;
            }
          } else {
            status = "failure";
            error = "DEVICE_DO not available";
          }
          break;
        }
        case "send_email": {
          const result = await sendEmail(env, {
            to: action.to,
            subject: action.subject,
            html: automationEmailHtml({
              subject: action.subject,
              body: action.body,
              workspaceName,
              automationName,
              context,
            }),
            text: automationEmailText({
              subject: action.subject,
              body: action.body,
              workspaceName,
              automationName,
              context,
            }),
          });
          if (!result.ok) {
            status = "failure";
            error = result.error;
          }
          break;
        }
        case "delay": {
          const seconds = action.delaySeconds ?? 0;
          if (seconds > 0) {
            await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
          }
          break;
        }
      }
    } catch (err) {
      status = "failure";
      error = err instanceof Error ? err.message : String(err);
    }

    results.push({
      actionIndex: i,
      actionType: action.type,
      status,
      error,
      durationMs: Date.now() - start,
    });
  }

  return results;
}

// Persist execution log and update stats
export async function recordExecutionLog(
  env: StorageEnv,
  workspaceId: string,
  automation: AutomationEntity,
  triggerType: AutomationTriggerType,
  triggerData: Record<string, unknown>,
  actionResults: ActionExecutionResult[],
  totalDurationMs: number,
  plan: WorkspacePlan
): Promise<AutomationLogEntity> {
  const now = new Date().toISOString();
  const logId = crypto.randomUUID();

  const hasFailure = actionResults.some((r) => r.status === "failure");
  const allFailure = actionResults.length > 0 && actionResults.every((r) => r.status === "failure");
  const status: AutomationLogStatus = allFailure
    ? "failure"
    : hasFailure
      ? "partial_failure"
      : "success";

  const limits = getPlanLimits(plan);
  const expiresAt =
    typeof limits.ttlDays === "number"
      ? new Date(Date.now() + limits.ttlDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

  const logEntity: AutomationLogEntity = {
    pk: `AUTO_LOG#${workspaceId}`,
    sk: `${now}#${logId}`,
    entityType: EntityTypes.AUTOMATION_LOG,
    createdAt: now,
    updatedAt: now,
    logId,
    workspaceId,
    automationId: automation.automationId,
    automationName: automation.name,
    triggerType,
    triggerData,
    conditionsMatched: true,
    status,
    actionResults,
    totalDurationMs,
    expiresAt,
  };

  const indexEntity: AutomationLogIndexEntity = {
    pk: `AUTO_LOG_IDX#${automation.automationId}`,
    sk: `${now}#${logId}`,
    entityType: EntityTypes.AUTOMATION_LOG,
    createdAt: now,
    updatedAt: now,
    logId,
    workspaceId,
    automationId: automation.automationId,
    status,
    totalDurationMs,
  };

  await Promise.all([
    put(env, logEntity),
    put(env, indexEntity),
  ]);

  await updateAutomationStats(env, workspaceId, automation.automationId, status, totalDurationMs, now);

  return logEntity;
}

async function updateAutomationStats(
  env: StorageEnv,
  workspaceId: string,
  automationId: string,
  status: AutomationLogStatus,
  durationMs: number,
  executionTime: string
): Promise<void> {
  const { pk, sk } = Keys.automationStats(workspaceId, automationId);
  const existing = await get<AutomationStatsEntity>(env, pk, sk);

  const now = new Date().toISOString();
  const stats: AutomationStatsEntity = existing
    ? { ...existing }
    : {
        pk,
        sk,
        entityType: EntityTypes.AUTOMATION_LOG,
        createdAt: now,
        updatedAt: now,
        workspaceId,
        automationId,
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        partialFailureCount: 0,
        lastExecutionAt: null,
        lastExecutionStatus: null,
        totalDurationMs: 0,
      };

  stats.totalExecutions += 1;
  if (status === "success") stats.successCount += 1;
  else if (status === "failure") stats.failureCount += 1;
  else stats.partialFailureCount += 1;
  stats.lastExecutionAt = executionTime;
  stats.lastExecutionStatus = status;
  stats.totalDurationMs += durationMs;
  stats.updatedAt = now;

  await put(env, stats);
}

// Simple circular loop detection: if two automations are configured so that
// A's action updates device X and B's trigger listens to device X (and vice versa),
// warn. This does not catch all possible loops but helps avoid obvious cycles.
export function validateAutomationGraph(automations: AutomationEntity[]): string[] {
  const warnings: string[] = [];

  const triggersByDevice = new Map<string, AutomationEntity[]>();
  for (const auto of automations) {
    if (
      auto.triggerType === "device_data" &&
      auto.triggerConfig.type === "device_data"
    ) {
      const dev = auto.triggerConfig.deviceId;
      const list = triggersByDevice.get(dev) ?? [];
      list.push(auto);
      triggersByDevice.set(dev, list);
    }
  }

  for (const auto of automations) {
    for (const action of auto.actions) {
      if (action.type === "update_device") {
        const affectedDev = action.targetDeviceId;
        const triggered = triggersByDevice.get(affectedDev) ?? [];
        for (const t of triggered) {
          if (t.automationId !== auto.automationId) {
            warnings.push(
              `Potential loop: automation ${auto.automationId} updates device ${affectedDev}, which is watched by automation ${t.automationId}`
            );
          }
        }
      }
    }
  }

  return warnings;
}

// Day-of-week aliases
const DOW_MAP: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
// Month aliases
const MONTH_MAP: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

function resolveAlias(token: string, map: Record<string, number>): string {
  return token.replace(/[a-z]{3}/gi, (m) => {
    const v = map[m.toLowerCase()];
    return v !== undefined ? String(v) : m;
  });
}

// Parse a single cron field against a value.
// Supports: literal, wildcard, ranges (1-5), steps (star/2, 1-10/3), lists (1,5,10).
function cronFieldMatches(field: string, value: number, min: number, max: number): boolean {
  return field.split(",").some((part) => {
    part = part.trim();

    // Handle step: "X/N" or "*/N" or "1-10/N"
    let step = 1;
    const slashIdx = part.indexOf("/");
    if (slashIdx !== -1) {
      step = Number(part.slice(slashIdx + 1));
      if (Number.isNaN(step) || step < 1) return false;
      part = part.slice(0, slashIdx);
    }

    let rangeStart: number;
    let rangeEnd: number;

    if (part === "*") {
      rangeStart = min;
      rangeEnd = max;
    } else if (part.includes("-")) {
      const [a, b] = part.split("-");
      rangeStart = Number(a);
      rangeEnd = Number(b);
      if (Number.isNaN(rangeStart) || Number.isNaN(rangeEnd)) return false;
    } else {
      const n = Number(part);
      if (Number.isNaN(n)) return false;
      if (slashIdx !== -1) {
        // e.g. "5/10" means starting at 5, every 10
        rangeStart = n;
        rangeEnd = max;
      } else {
        return n === value;
      }
    }

    // Check if value falls in range with step
    if (value < rangeStart || value > rangeEnd) return false;
    return (value - rangeStart) % step === 0;
  });
}

/**
 * Convert a Date to the components in a given IANA timezone.
 * Falls back to UTC if timezone is invalid or not provided.
 */
function datePartsInTimezone(now: Date, timezone?: string): { minute: number; hour: number; day: number; month: number; dow: number } {
  if (timezone) {
    try {
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour12: false,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        weekday: "short",
      });
      const parts = Object.fromEntries(
        fmt.formatToParts(now).map((p) => [p.type, p.value])
      );
      const dowStr = (parts.weekday ?? "").toLowerCase().slice(0, 3);
      return {
        minute: Number(parts.minute),
        hour: Number(parts.hour) === 24 ? 0 : Number(parts.hour),
        day: Number(parts.day),
        month: Number(parts.month),
        dow: DOW_MAP[dowStr] ?? now.getUTCDay(),
      };
    } catch {
      // invalid timezone – fall through to UTC
    }
  }

  return {
    minute: now.getUTCMinutes(),
    hour: now.getUTCHours(),
    day: now.getUTCDate(),
    month: now.getUTCMonth() + 1,
    dow: now.getUTCDay(),
  };
}

function cronMatches(cron: string, now: Date, timezone?: string): boolean {
  const tokens = cron.trim().split(/\s+/);
  if (tokens.length !== 5) return false;

  let [minF, hourF, dayF, monthF, dowF] = tokens;
  monthF = resolveAlias(monthF, MONTH_MAP);
  dowF = resolveAlias(dowF, DOW_MAP);

  const { minute, hour, day, month, dow } = datePartsInTimezone(now, timezone);

  return (
    cronFieldMatches(minF, minute, 0, 59) &&
    cronFieldMatches(hourF, hour, 0, 23) &&
    cronFieldMatches(dayF, day, 1, 31) &&
    cronFieldMatches(monthF, month, 1, 12) &&
    cronFieldMatches(dowF, dow, 0, 6)
  );
}

/**
 * Compute next cron match from `after` (exclusive). Returns null if not found
 * within ~2 years of scanning. Used by the DO to set precise alarms.
 */
export function nextCronMatch(cron: string, after: Date, timezone?: string): Date | null {
  // Scan minute-by-minute starting from the next minute
  const cursor = new Date(after);
  cursor.setUTCSeconds(0, 0);
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);

  const limit = 366 * 24 * 60; // ~1 year of minutes
  for (let i = 0; i < limit; i++) {
    if (cronMatches(cron, cursor, timezone)) return cursor;
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  }
  return null;
}

export async function evaluateScheduleAutomations(
  env: StorageEnv,
  workspaceId: string,
  automations: AutomationEntity[],
  now: Date
): Promise<AutomationEntity[]> {
  const candidates = automations.filter(
    (a) =>
      a.status === "active" &&
      a.triggerType === "schedule" &&
      a.triggerConfig.type === "schedule" &&
      cronMatches((a.triggerConfig as ScheduleTriggerConfig).cron, now, a.triggerConfig.timezone)
  );

  const results: AutomationEntity[] = [];
  for (const a of candidates) {
    if (await evaluateConditionGroups(env, workspaceId, a)) {
      results.push(a);
    }
  }
  return results;
}
