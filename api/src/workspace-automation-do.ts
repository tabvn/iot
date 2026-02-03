import type { DurableObjectState } from "@cloudflare/workers-types";
import type { Env } from "@/storage";
import { queryByPk } from "@/storage";
import type { AutomationEntity, ScheduleTriggerConfig } from "@/models";
import {
  evaluateDeviceDataAutomations,
  evaluateDeviceStatusAutomations,
  evaluateScheduleAutomations,
  executeActions,
  validateAutomationGraph,
  nextCronMatch,
} from "@/automation-engine";

export class WorkspaceAutomationDO {
  private state: DurableObjectState;
  private env: Env;
  private workspaceId: string;
  private automations: AutomationEntity[] = [];
  private loaded = false;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.workspaceId = state.id.toString();
  }

  private async loadAutomations() {
    const items = await queryByPk(this.env, `WS#${this.workspaceId}`);
    this.automations = items.filter((e): e is AutomationEntity => e.entityType === "AUTOMATION");
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
      await executeActions(this.env, this.workspaceId, auto.actions, {
        now: now.toISOString(),
        trigger: "schedule",
        automationId: auto.automationId,
      });
    }
    await this.scheduleNextAlarm();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === "POST" && pathname.endsWith("/invalidate")) {
      await this.loadAutomations();
      await this.scheduleNextAlarm();
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (request.method === "POST" && pathname.endsWith("/event/device-data")) {
      const body = (await request.json().catch(() => null)) as {
        deviceId: string;
        fields: Record<string, any>;
      } | null;
      if (!body) return new Response(JSON.stringify({ error: "Bad Request" }), { status: 400, headers: { "Content-Type": "application/json" } });
      await this.ensureAutomationsLoaded();
      const matches = await evaluateDeviceDataAutomations(this.env, this.workspaceId, this.automations, body.deviceId, body.fields);
      for (const auto of matches) {
        await executeActions(this.env, this.workspaceId, auto.actions, {
          deviceId: body.deviceId,
          fields: body.fields,
        });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (request.method === "POST" && pathname.endsWith("/event/device-status")) {
      const body = (await request.json().catch(() => null)) as {
        deviceId: string;
        status: "online" | "offline";
      } | null;
      if (!body) return new Response(JSON.stringify({ error: "Bad Request" }), { status: 400, headers: { "Content-Type": "application/json" } });
      await this.ensureAutomationsLoaded();
      const matches = await evaluateDeviceStatusAutomations(this.env, this.workspaceId, this.automations, body.deviceId, body.status);
      for (const auto of matches) {
        await executeActions(this.env, this.workspaceId, auto.actions, {
          deviceId: body.deviceId,
          status: body.status,
        });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (request.method === "POST" && pathname.endsWith("/event/schedule-tick")) {
      const body = (await request.json().catch(() => null)) as { now?: string } | null;
      const now = body?.now ? new Date(body.now) : new Date();
      await this.ensureAutomationsLoaded();
      const matches = await evaluateScheduleAutomations(this.env, this.workspaceId, this.automations, now);
      for (const auto of matches) {
        await executeActions(this.env, this.workspaceId, auto.actions, {
          now: now.toISOString(),
          trigger: "schedule",
          automationId: auto.automationId,
        });
      }
      await this.scheduleNextAlarm();
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }
}
