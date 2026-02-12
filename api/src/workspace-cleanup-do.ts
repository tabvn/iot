import type { DurableObjectState } from "@cloudflare/workers-types";
import type { StorageEnv } from "@/db/storage";
import { createRepositories } from "@/db";
import { successResponse, notFoundResponse } from "@/api-responses";

interface CleanupState {
  startedAt: string | null;
  completedAt: string | null;
}

export class WorkspaceCleanupDurableObject {
  private state: DurableObjectState;
  private env: StorageEnv;
  private workspaceId: string;

  constructor(state: DurableObjectState, env: StorageEnv) {
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
        return successResponse({ ok: true, status: "completed" });
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
      return successResponse(state);
    }

    return notFoundResponse();
  }

  private async runCleanup() {
    const db = createRepositories(this.env);
    const prefix = this.env.TABLE_BUCKET_PREFIX || "";

    // Get all devices in workspace
    const devicesResult = await db.devices.getAllByWorkspace(this.workspaceId);
    const devices = devicesResult.items;

    // Clean up device data from R2
    for (const dev of devices) {
      const deviceId = dev.deviceId;

      // Delete device data points
      const devDataList = await this.env.DEVICE_DATA_BUCKET.list({
        prefix: `${prefix}DEV_DATA#${deviceId}`,
      });
      for (const obj of devDataList.objects) {
        await this.env.DEVICE_DATA_BUCKET.delete(obj.key);
      }

      // Delete device data indexes
      const devIdxList = await this.env.DEVICE_DATA_BUCKET.list({
        prefix: `${prefix}DEV_IDX#${deviceId}`,
      });
      for (const obj of devIdxList.objects) {
        await this.env.DEVICE_DATA_BUCKET.delete(obj.key);
      }
    }

    // Delete the workspace and all related entities
    await db.workspaces.delete(this.workspaceId);

    await this.setCleanupState({ completedAt: new Date().toISOString() });
  }
}
