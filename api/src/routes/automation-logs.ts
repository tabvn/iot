import type { StorageEnv } from "@/db/storage";
import { queryByPk, get } from "@/db/storage";
import type { AutomationLogEntity, AutomationLogIndexEntity } from "@/db/types";
import { resolveWorkspace, type AuthEnv } from "@/auth";
import type { RouterType } from "itty-router";
import { successResponse, unauthorizedResponse } from "@/api-responses";

function formatLogResponse(log: AutomationLogEntity) {
  return {
    logId: log.logId,
    workspaceId: log.workspaceId,
    automationId: log.automationId,
    automationName: log.automationName,
    triggerType: log.triggerType,
    triggerData: log.triggerData,
    conditionsMatched: log.conditionsMatched,
    status: log.status,
    actionResults: log.actionResults,
    totalDurationMs: log.totalDurationMs,
    createdAt: log.createdAt,
    expiresAt: log.expiresAt,
  };
}

export function automationLogsRouter(router: RouterType) {
  // List all logs for a workspace
  router.get("/automations/logs", async (request: any, env: StorageEnv & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;

    const url = new URL(request.url);
    const filterAutomationId = url.searchParams.get("automationId");
    const filterStatus = url.searchParams.get("status");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);

    const result = await queryByPk<AutomationLogEntity>(env, `AUTO_LOG#${workspaceId}`);
    let logs = result.items
      .filter((e) => e.entityType === "AUTOMATION_LOG")
      .sort((a, b) => b.sk.localeCompare(a.sk)); // most recent first

    if (filterAutomationId) {
      logs = logs.filter((l) => l.automationId === filterAutomationId);
    }
    if (filterStatus) {
      logs = logs.filter((l) => l.status === filterStatus);
    }

    logs = logs.slice(0, limit);

    return successResponse({
      logs: logs.map(formatLogResponse),
    });
  });

  // List logs for a specific automation
  router.get("/automations/:automationId/logs", async (request: any, env: StorageEnv & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;
    const { automationId } = request.params;

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);

    const indexResult = await queryByPk<AutomationLogIndexEntity>(env, `AUTO_LOG_IDX#${automationId}`);
    const sorted = indexResult.items
      .filter((e) => e.entityType === "AUTOMATION_LOG" && e.workspaceId === workspaceId)
      .sort((a, b) => b.sk.localeCompare(a.sk))
      .slice(0, limit);

    // Fetch full log entities
    const logs = await Promise.all(
      sorted.map(async (idx) => {
        const full = await get<AutomationLogEntity>(env, `AUTO_LOG#${workspaceId}`, idx.sk);
        if (!full) {
          return {
            logId: idx.logId,
            workspaceId: idx.workspaceId,
            automationId: idx.automationId,
            status: idx.status,
            totalDurationMs: idx.totalDurationMs,
            createdAt: idx.createdAt,
          };
        }
        return formatLogResponse(full);
      })
    );

    return successResponse({ logs });
  });
}
