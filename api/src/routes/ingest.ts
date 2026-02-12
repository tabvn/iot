import { createRepositories } from '@/db';
import type { StorageEnv } from '@/db/storage';
import { resolveWorkspace, type AuthEnv } from '@/auth';
import { getWorkspacePlan, checkRateLimit } from '@/rate-limit';
import { validateIngestData } from '@/validation';
import type { RouterType } from 'itty-router';
import {
  successResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  badRequestResponse,
} from '@/api-responses';

export interface IngestEnv extends StorageEnv {
  DEVICE_DO: DurableObjectNamespace;
}

export function ingestRouter(router: RouterType) {
  // Device ingest endpoint — workspace resolved from token (API key or device token)
  router.post('/devices/:deviceId/ingest', async (request: any, env: IngestEnv & AuthEnv) => {
    const { deviceId } = request.params;
    const resolved = await resolveWorkspace(env, request as Request);

    if (!resolved) {
      return unauthorizedResponse();
    }

    const { workspaceId, auth } = resolved;

    // For device tokens, verify the token's deviceId matches the path
    if (auth.type === 'device' && auth.deviceId !== deviceId) {
      return forbiddenResponse('Device token does not match deviceId');
    }

    // Rate limit per workspace plan
    const plan = await getWorkspacePlan(env, workspaceId);
    const allowed = await checkRateLimit(env, workspaceId, plan);

    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    // Parse request body for validation
    const body = (await (request as Request).json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return badRequestResponse('Invalid JSON body');
    }

    // Fetch device to get field mappings for validation
    const db = createRepositories(env);
    const device = await db.devices.getById(workspaceId, deviceId);

    if (!device) {
      return notFoundResponse('Device not found');
    }

    // Validate ingest data against field mappings (if configured)
    const validation = validateIngestData(body, device.fieldMappings);
    if (!validation.ok) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          errors: validation.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Forward validated data to device DO
    const doName = `${workspaceId}:${deviceId}`;
    const id = env.DEVICE_DO.idFromName(doName);
    const stub = env.DEVICE_DO.get(id);

    // Create new request with validated data
    return stub.fetch('https://device/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validation.validatedData),
    });
  });
}
