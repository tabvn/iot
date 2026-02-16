import type { StorageEnv } from '@/db/storage';
import { queryByPkAndSkPrefix, get } from '@/db/storage';
import type { AutomationStatsEntity } from '@/db/types';
import { resolveWorkspace, type AuthEnv } from '@/auth';
import type { RouterType } from 'itty-router';
import { successResponse, unauthorizedResponse } from '@/api-responses';

function formatStats(stats: AutomationStatsEntity | null, automationId: string) {
  if (!stats) {
    return {
      automationId,
      totalExecutions: 0,
      successCount: 0,
      failureCount: 0,
      partialFailureCount: 0,
      lastExecutionAt: null,
      lastExecutionStatus: null,
      averageDurationMs: 0,
      totalDurationMs: 0,
    };
  }
  return {
    automationId: stats.automationId,
    totalExecutions: stats.totalExecutions,
    successCount: stats.successCount,
    failureCount: stats.failureCount,
    partialFailureCount: stats.partialFailureCount,
    lastExecutionAt: stats.lastExecutionAt,
    lastExecutionStatus: stats.lastExecutionStatus,
    averageDurationMs:
      stats.totalExecutions > 0 ? Math.round(stats.totalDurationMs / stats.totalExecutions) : 0,
    totalDurationMs: stats.totalDurationMs,
  };
}

export function automationStatsRouter(router: RouterType) {
  // Get stats for all automations in workspace
  router.get('/automations/stats', async (request: any, env: StorageEnv & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;

    const result = await queryByPkAndSkPrefix<AutomationStatsEntity>(env, `WS#${workspaceId}`, 'AUTO_STATS#');
    const statsItems = result.items;

    const stats = statsItems.map((s) => formatStats(s, s.automationId));

    return successResponse({ stats });
  });

  // Get stats for a specific automation
  router.get('/automations/:automationId/stats', async (request: any, env: StorageEnv & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;
    const { automationId } = request.params;

    const stats = await get<AutomationStatsEntity>(env, `WS#${workspaceId}`, `AUTO_STATS#${automationId}`);

    return successResponse(formatStats(stats ?? null, automationId));
  });
}
