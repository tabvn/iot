import { createRepositories } from '@/db';
import type { StorageEnv } from '@/db/storage';
import type { AutomationTriggerConfig, AutomationActionConfig, AutomationConditionGroup, AutomationStatus } from '@/db/types';
import { resolveWorkspace, requireRole, type AuthEnv } from '@/auth';
import { validateCreateAutomationBody } from '@/schemas';
import type { RouterType } from 'itty-router';
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  unauthorizedResponse,
  badRequestResponse,
  toApiAutomation,
} from '@/api-responses';
import { notifyWorkspaceActivity } from '@/notifications';

interface AutomationEnv extends StorageEnv {
  WORKSPACE_AUTOMATION_DO: DurableObjectNamespace;
}

async function invalidateAutomationCache(env: AutomationEnv, workspaceId: string) {
  const id = env.WORKSPACE_AUTOMATION_DO.idFromName(workspaceId);
  const stub = env.WORKSPACE_AUTOMATION_DO.get(id);
  await stub.fetch('https://automation/invalidate', { method: 'POST' }).catch((err) => {
    console.error('[automations][invalidate][error]', err);
  });
}

interface UpdateAutomationBody {
  name?: string;
  description?: string;
  status?: AutomationStatus;
  triggerType?: string;
  triggerConfig?: AutomationTriggerConfig;
  conditionGroups?: AutomationConditionGroup[];
  conditionLogic?: 'AND' | 'OR';
  actions?: AutomationActionConfig[];
}

export function automationsRouter(router: RouterType) {
  // Create automation - requires manage access
  router.post('/automations', async (request: any, env: AutomationEnv & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!requireRole(resolved, 'editor')) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;

    const parsed = await request.json().catch(() => null);
    const validation = validateCreateAutomationBody(parsed);
    if (!validation.ok) {
      return badRequestResponse(validation.error);
    }
    const body = validation.value;

    const db = createRepositories(env);
    const automation = await db.automations.create({
      workspaceId,
      name: body.name,
      description: body.description,
      triggerType: body.triggerType as any,
      triggerConfig: body.triggerConfig as unknown as AutomationTriggerConfig,
      conditionGroups: body.conditionGroups as unknown as AutomationConditionGroup[] | undefined,
      conditionLogic: body.conditionLogic,
      actions: body.actions as unknown as AutomationActionConfig[],
    });

    await invalidateAutomationCache(env, workspaceId);

    notifyWorkspaceActivity(env, workspaceId, `Automation "${body.name}" created`, `A new automation rule has been added to the workspace.`, { automationId: automation.automationId, automationName: body.name }).catch(() => {});

    return createdResponse(toApiAutomation(automation));
  });

  // List automations
  router.get('/automations', async (request: any, env: AutomationEnv & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;

    const db = createRepositories(env);
    const result = await db.automations.getAllByWorkspace(workspaceId);

    return successResponse({
      automations: result.items.map(toApiAutomation),
    });
  });

  // Get automation
  router.get('/automations/:automationId', async (request: any, env: AutomationEnv & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!resolved) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;
    const { automationId } = request.params;

    const db = createRepositories(env);
    const automation = await db.automations.getById(workspaceId, automationId);

    if (!automation) {
      return notFoundResponse('Automation not found');
    }

    return successResponse(toApiAutomation(automation));
  });

  // Update automation
  router.put('/automations/:automationId', async (request: any, env: AutomationEnv & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!requireRole(resolved, 'editor')) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;
    const { automationId } = request.params;

    const body = (await request.json().catch(() => null)) as UpdateAutomationBody | null;
    if (!body) {
      return badRequestResponse('Empty payload');
    }

    const db = createRepositories(env);
    const existing = await db.automations.getById(workspaceId, automationId);

    if (!existing) {
      return notFoundResponse('Automation not found');
    }

    const updated = await db.automations.update(workspaceId, automationId, {
      name: body.name,
      description: body.description,
      status: body.status,
      triggerType: body.triggerType as any,
      triggerConfig: body.triggerConfig,
      conditionGroups: body.conditionGroups,
      conditionLogic: body.conditionLogic,
      actions: body.actions,
    });

    await invalidateAutomationCache(env, workspaceId);

    if (!updated) {
      return notFoundResponse('Automation not found');
    }

    notifyWorkspaceActivity(env, workspaceId, `Automation "${updated.name}" updated`, `Automation rule "${updated.name}" has been modified.`, { automationId, automationName: updated.name }).catch(() => {});

    return successResponse(toApiAutomation(updated));
  });

  // Delete automation
  router.delete('/automations/:automationId', async (request: any, env: AutomationEnv & AuthEnv) => {
    const resolved = await resolveWorkspace(env, request as Request);
    if (!requireRole(resolved, 'admin')) {
      return unauthorizedResponse();
    }
    const { workspaceId } = resolved;
    const { automationId } = request.params;

    const db = createRepositories(env);
    const existing = await db.automations.getById(workspaceId, automationId);
    await db.automations.delete(workspaceId, automationId);
    await invalidateAutomationCache(env, workspaceId);

    notifyWorkspaceActivity(env, workspaceId, `Automation "${existing?.name || automationId}" deleted`, `An automation rule has been removed from the workspace.`, { automationId, automationName: existing?.name }).catch(() => {});

    return successResponse({ ok: true });
  });
}
