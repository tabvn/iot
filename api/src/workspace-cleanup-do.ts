import type { DurableObjectState } from "@cloudflare/workers-types";
import type { Env } from "@/storage";
import { queryByPk, deleteEntity } from "@/storage";
import type { DeviceEntity, AutomationEntity } from "@/models";

interface CleanupState {
  startedAt: string | null;
  completedAt: string | null;
}

export class WorkspaceCleanupDurableObject {
  private state: DurableObjectState;
  private env: Env;
  private workspaceId: string;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.workspaceId = state.id.toString();
  }

  private async getCleanupState(): Promise<CleanupState> {
    return (
      (await this.state.storage.get<CleanupState>("cleanupState")) || {
        startedAt: null,
        completedAt: null,
      }
    );
  }

  private async setCleanupState(partial: Partial<CleanupState>) {
    const current = await this.getCleanupState();
    const next = { ...current, ...partial };
    await this.state.storage.put("cleanupState", next);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === "POST" && pathname.endsWith("/start")) {
      const state = await this.getCleanupState();
      if (state.completedAt) {
        return new Response(JSON.stringify({ ok: true, status: "completed" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (!state.startedAt) {
        await this.setCleanupState({ startedAt: new Date().toISOString() });
      }

      this.state.waitUntil(this.runCleanup());

      return new Response(JSON.stringify({ ok: true, status: "running" }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET" && pathname.endsWith("/status")) {
      const state = await this.getCleanupState();
      return new Response(JSON.stringify(state), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  private async runCleanup() {
    const wsPk = `WS#${this.workspaceId}`;

    const entities = await queryByPk(this.env, wsPk);
    const devices: DeviceEntity[] = entities.filter((e) => e.entityType === "DEVICE");
    const automations: AutomationEntity[] = entities.filter((e) => e.entityType === "AUTOMATION");

    for (const dev of devices) {
      const deviceId = dev.deviceId;

      const devDataList = await this.env.DEVICE_DATA_BUCKET.list({
        prefix: `${this.env.TABLE_BUCKET_PREFIX}DEV_DATA#${deviceId}`,
      });
      for (const obj of devDataList.objects) {
        await this.env.DEVICE_DATA_BUCKET.delete(obj.key);
      }

      const devIdxList = await this.env.DEVICE_DATA_BUCKET.list({
        prefix: `${this.env.TABLE_BUCKET_PREFIX}DEV_IDX#${deviceId}`,
      });
      for (const obj of devIdxList.objects) {
        await this.env.DEVICE_DATA_BUCKET.delete(obj.key);
      }
    }

    for (const e of entities) {
      await deleteEntity(this.env, wsPk, e.sk);
    }

    await this.setCleanupState({ completedAt: new Date().toISOString() });
  }
}
