import type { DurableObjectState } from "@cloudflare/workers-types";
import type { StorageEnv } from "@/db/storage";
import { queryByPk } from "@/db/storage";
import type { AutomationEntity, ScheduleTriggerConfig, AutomationTriggerType } from "@/db/types";
import {
  evaluateDeviceDataAutomations,
  evaluateDeviceStatusAutomations,
  evaluateScheduleAutomations,
  executeActionsWithLogging,
  recordExecutionLog,
  validateAutomationGraph,
  nextCronMatch,
} from "@/automation-engine";
import { dispatchAutomationNotification } from "@/notifications";
import { getWorkspacePlan } from "@/rate-limit";
import { successResponse, badRequestResponse, notFoundResponse } from "@/api-responses";

export class WorkspaceAutomationDO {
  private state: DurableObjectState;
  private env: StorageEnv;
  private workspaceId: string;
  private automations: AutomationEntity[] = [];
  private loaded = false;

  constructor(state: DurableObjectState, env: StorageEnv) {
    this.state = state;
    this.env = env;
    // idFromName() IDs expose .name with the original string; .toString() returns hex
    this.workspaceId = (state.id as any).name ?? state.id.toString();
  }

  private async loadAutomations() {
    const result = await queryByPk(this.env, `WS#${this.workspaceId}`);
    this.automations = result.items.filter((e: any): e is AutomationEntity => e.entityType === "AUTOMATION");
    this.loaded = true;

    const warnings = validateAutomationGraph(this.automations);
    for (const w of warnings) {
      console.warn("[automation][loop_warning]", { workspaceId: this.workspaceId, warning: w });
    }
  }

  private async ensureAutomationsLoaded() {
    if (!this.loaded) {
      await this.loadAutomations();
    }
  }

  private async executeWithLogging(
    auto: AutomationEntity,
    triggerType: AutomationTriggerType,
    triggerData: Record<string, unknown>,
    context: Record<string, any>
  ) {
    const start = Date.now();
    const actionResults = await executeActionsWithLogging(this.env as any, this.workspaceId, auto.actions, context);
    const totalDurationMs = Date.now() - start;
    const plan = await getWorkspacePlan(this.env, this.workspaceId);
    const logEntity = await recordExecutionLog(
      this.env,
      this.workspaceId,
      auto,
      triggerType,
      triggerData,
      actionResults,
      totalDurationMs,
      plan
    );
    await dispatchAutomationNotification(this.env, this.workspaceId, auto, logEntity).catch((err) => {
      console.error("[automation][notification][error]", err);
    });
  }

  private async scheduleNextAlarm() {
    const scheduleAutomations = this.automations.filter(
      (a) => a.status === "active" && a.triggerType === "schedule" && a.triggerConfig.type === "schedule"
    );

    if (scheduleAutomations.length === 0) {
      await this.state.storage.deleteAlarm();
      return;
    }

    const now = new Date();
    let earliest: Date | null = null;

    for (const auto of scheduleAutomations) {
      const cfg = auto.triggerConfig as ScheduleTriggerConfig;
      const next = nextCronMatch(cfg.cron, now, cfg.timezone);
      if (next && (!earliest || next.getTime() < earliest.getTime())) {
        earliest = next;
      }
    }

    if (earliest) {
      await this.state.storage.setAlarm(earliest.getTime());
    }
  }

  async alarm() {
    await this.ensureAutomationsLoaded();
    const now = new Date();
    const matches = await evaluateScheduleAutomations(this.env, this.workspaceId, this.automations, now);
    for (const auto of matches) {
      const context = { now: now.toISOString(), trigger: "schedule", automationId: auto.automationId };
      await this.executeWithLogging(auto, "schedule", { now: now.toISOString() }, context);
    }
    await this.scheduleNextAlarm();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === "POST" && pathname.endsWith("/invalidate")) {
      await this.loadAutomations();
      await this.scheduleNextAlarm();
      return successResponse({ ok: true });
    }

    if (request.method === "POST" && pathname.endsWith("/event/device-data")) {
      const body = (await request.json().catch(() => null)) as {
        deviceId: string;
        fields: Record<string, any>;
      } | null;
      if (!body) return badRequestResponse("Invalid request body");
      await this.ensureAutomationsLoaded();
      const matches = await evaluateDeviceDataAutomations(this.env, this.workspaceId, this.automations, body.deviceId, body.fields);
      for (const auto of matches) {
        const context = { deviceId: body.deviceId, fields: body.fields };
        await this.executeWithLogging(auto, "device_data", { deviceId: body.deviceId, fields: body.fields }, context);
      }
      return successResponse({ ok: true });
    }

    if (request.method === "POST" && pathname.endsWith("/event/device-status")) {
      const body = (await request.json().catch(() => null)) as {
        deviceId: string;
        status: "online" | "offline";
      } | null;
      if (!body) return badRequestResponse("Invalid request body");
      await this.ensureAutomationsLoaded();
      const matches = await evaluateDeviceStatusAutomations(this.env, this.workspaceId, this.automations, body.deviceId, body.status);
      for (const auto of matches) {
        const context = { deviceId: body.deviceId, status: body.status };
        await this.executeWithLogging(auto, "device_status", { deviceId: body.deviceId, status: body.status }, context);
      }
      return successResponse({ ok: true });
    }

    if (request.method === "POST" && pathname.endsWith("/event/schedule-tick")) {
      const body = (await request.json().catch(() => null)) as { now?: string } | null;
      const now = body?.now ? new Date(body.now) : new Date();
      await this.ensureAutomationsLoaded();
      const matches = await evaluateScheduleAutomations(this.env, this.workspaceId, this.automations, now);
      for (const auto of matches) {
        const context = { now: now.toISOString(), trigger: "schedule", automationId: auto.automationId };
        await this.executeWithLogging(auto, "schedule", { now: now.toISOString() }, context);
      }
      await this.scheduleNextAlarm();
      return successResponse({ ok: true });
    }

    return notFoundResponse();
  }
}
