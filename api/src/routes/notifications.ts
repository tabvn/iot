import { createRepositories } from "@/db";
import type { StorageEnv } from "@/db/storage";
import { put, get, queryByPk } from "@/db/storage";
import type {
  UserNotificationEntity,
  UserNotificationPreferencesEntity,
  NotificationType,
} from "@/db/types";
import { resolveWorkspace, type AuthEnv } from "@/auth";
import type { RouterType } from "itty-router";
import {
  successResponse,
  notFoundResponse,
  unauthorizedResponse,
  badRequestResponse,
  toApiNotification,
} from "@/api-responses";

const VALID_NOTIFICATION_TYPES: NotificationType[] = [
  "automation_triggered",
  "automation_failed",
  "automation_partial_failure",
  "member_joined",
  "member_left",
  "invitation_accepted",
  "device_offline",
  "device_online",
  "system",
];

export function notificationsRouter(router: RouterType) {
  // List notifications for current user in workspace
  router.get(
    "/notifications",
    async (request: Request, env: StorageEnv & AuthEnv) => {
      const resolved = await resolveWorkspace(env, request);
      if (!resolved) {
        return unauthorizedResponse();
      }
      const { workspaceId, auth } = resolved;
      if (!auth.userId) {
        return unauthorizedResponse("Notifications require user authentication");
      }

      const url = new URL(request.url);
      const unreadOnly = url.searchParams.get("unreadOnly") === "true";
      const limit = Math.min(
        parseInt(url.searchParams.get("limit") || "50", 10),
        200
      );

      const db = createRepositories(env);
      const result = await db.notifications.getAll(auth.userId, workspaceId, {
        limit: unreadOnly ? undefined : limit,
        sortOrder: "desc",
      });

      let notifications = result.items;
      if (unreadOnly) {
        notifications = notifications.filter((n) => !n.read).slice(0, limit);
      }

      return successResponse({
        notifications: notifications.map(toApiNotification),
      });
    }
  );

  // Get unread count
  router.get(
    "/notifications/unread-count",
    async (request: Request, env: StorageEnv & AuthEnv) => {
      const resolved = await resolveWorkspace(env, request);
      if (!resolved) {
        return unauthorizedResponse();
      }
      const { workspaceId, auth } = resolved;
      if (!auth.userId) {
        return unauthorizedResponse("Notifications require user authentication");
      }

      const db = createRepositories(env);
      const unread = await db.notifications.getUnread(auth.userId, workspaceId);

      return successResponse({ unreadCount: unread.length });
    }
  );

  // Mark a single notification as read
  router.post(
    "/notifications/:notificationId/read",
    async (request: any, env: StorageEnv & AuthEnv) => {
      const resolved = await resolveWorkspace(env, request as Request);
      if (!resolved) {
        return unauthorizedResponse();
      }
      const { workspaceId, auth } = resolved;
      if (!auth.userId) {
        return unauthorizedResponse("Notifications require user authentication");
      }

      const { notificationId } = request.params;

      // Find the notification
      const result = await queryByPk<UserNotificationEntity>(
        env,
        `USER_NOTIF#${auth.userId}#${workspaceId}`
      );
      const notif = result.items.find((n) => n.notificationId === notificationId);

      if (!notif) {
        return notFoundResponse("Notification not found");
      }

      const db = createRepositories(env);
      if (!notif.read) {
        await db.notifications.markAsRead(
          auth.userId,
          workspaceId,
          notificationId,
          notif.createdAt
        );
      }

      return successResponse({ ok: true });
    }
  );

  // Mark all notifications as read
  router.post(
    "/notifications/read-all",
    async (request: Request, env: StorageEnv & AuthEnv) => {
      const resolved = await resolveWorkspace(env, request);
      if (!resolved) {
        return unauthorizedResponse();
      }
      const { workspaceId, auth } = resolved;
      if (!auth.userId) {
        return unauthorizedResponse("Notifications require user authentication");
      }

      const db = createRepositories(env);
      const unread = await db.notifications.getUnread(auth.userId, workspaceId);

      await Promise.all(
        unread.map((n) =>
          db.notifications.markAsRead(auth.userId!, workspaceId, n.notificationId, n.createdAt)
        )
      );

      return successResponse({ ok: true, markedCount: unread.length });
    }
  );

  // Get notification preferences
  router.get(
    "/notifications/preferences",
    async (request: Request, env: StorageEnv & AuthEnv) => {
      const resolved = await resolveWorkspace(env, request);
      if (!resolved) {
        return unauthorizedResponse();
      }
      const { workspaceId, auth } = resolved;
      if (!auth.userId) {
        return unauthorizedResponse("Notifications require user authentication");
      }

      const prefs = await get<UserNotificationPreferencesEntity>(
        env,
        `USER_NOTIF_PREFS#${auth.userId}`,
        `WS#${workspaceId}`
      );

      return successResponse({
        disabledTypes: prefs?.disabledTypes ?? [],
        emailEnabled: prefs?.emailEnabled ?? true,
      });
    }
  );

  // Update notification preferences
  router.put(
    "/notifications/preferences",
    async (request: Request, env: StorageEnv & AuthEnv) => {
      const resolved = await resolveWorkspace(env, request);
      if (!resolved) {
        return unauthorizedResponse();
      }
      const { workspaceId, auth } = resolved;
      if (!auth.userId) {
        return unauthorizedResponse("Notifications require user authentication");
      }

      const body = (await request.json().catch(() => null)) as {
        disabledTypes?: NotificationType[];
        emailEnabled?: boolean;
      } | null;

      if (!body) {
        return badRequestResponse("Invalid body");
      }

      // Validate disabledTypes
      if (body.disabledTypes) {
        for (const t of body.disabledTypes) {
          if (!VALID_NOTIFICATION_TYPES.includes(t)) {
            return badRequestResponse(`Invalid notification type: ${t}`);
          }
        }
      }

      const existing = await get<UserNotificationPreferencesEntity>(
        env,
        `USER_NOTIF_PREFS#${auth.userId}`,
        `WS#${workspaceId}`
      );

      const now = new Date().toISOString();
      const prefs: UserNotificationPreferencesEntity = {
        pk: `USER_NOTIF_PREFS#${auth.userId}`,
        sk: `WS#${workspaceId}`,
        entityType: "NOTIFICATION",
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        userId: auth.userId,
        workspaceId,
        disabledTypes: body.disabledTypes ?? existing?.disabledTypes ?? [],
        emailEnabled: body.emailEnabled ?? existing?.emailEnabled ?? true,
      };

      await put(env, prefs);

      return successResponse({
        disabledTypes: prefs.disabledTypes,
        emailEnabled: prefs.emailEnabled,
      });
    }
  );
}
