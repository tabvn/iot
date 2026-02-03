// Realtime pub/sub helpers for workspace and device channels.
// These wrap calls to the relevant Durable Objects so the rest of the codebase
// can publish or broadcast events without knowing about DO internals.

import type { Env as WorkerEnv } from "./worker";

export type RealtimeMessage = {
  type: string;
  [key: string]: unknown;
};

// Publish a message to all subscribers of a workspace (workspace-level WebSocket clients)
export async function publishToWorkspace(
  env: WorkerEnv,
  workspaceAliasOrId: string,
  message: RealtimeMessage
): Promise<void> {
  const id = env.WORKSPACE_DO.idFromName(workspaceAliasOrId.toLowerCase());
  const stub = env.WORKSPACE_DO.get(id);
  await stub.fetch("https://workspace/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
}

// Broadcast a message to all workspace subscribers (alias form for clarity)
export async function broadcastToWorkspace(
  env: WorkerEnv,
  workspaceAlias: string,
  message: RealtimeMessage
): Promise<void> {
  return publishToWorkspace(env, workspaceAlias, message);
}

// Publish a message to a specific device channel (device-level WebSocket clients)
export async function publishToDevice(
  env: WorkerEnv,
  workspaceId: string,
  deviceId: string,
  message: RealtimeMessage
): Promise<void> {
  const doName = `${workspaceId}:${deviceId}`;
  const id = env.DEVICE_DO.idFromName(doName);
  const stub = env.DEVICE_DO.get(id);
  await stub.fetch("https://device/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
}
