"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Settings2,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  apiListNotifications,
  apiGetUnreadCount,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
  apiGetNotificationPreferences,
  apiUpdateNotificationPreferences,
  type WorkspaceNotification,
  type NotificationPreferences,
  type NotificationType,
} from "@/lib/api";

// ---- Helpers ----

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  automation_triggered: "Automation Triggered",
  automation_failed: "Automation Failed",
  automation_partial_failure: "Automation Partial Failure",
  member_joined: "Member Joined",
  member_left: "Member Left",
  invitation_accepted: "Invitation Accepted",
  device_offline: "Device Offline",
  device_online: "Device Online",
  system: "System",
};

const ALL_NOTIFICATION_TYPES: NotificationType[] = [
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

function severityIcon(severity: string) {
  switch (severity) {
    case "info":
      return <Info className="w-5 h-5 text-blue-500" />;
    case "success":
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case "warning":
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case "error":
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Info className="w-5 h-5 text-gray-400" />;
  }
}

function severityBorderColor(severity: string) {
  switch (severity) {
    case "info":
      return "border-l-blue-500";
    case "success":
      return "border-l-green-500";
    case "warning":
      return "border-l-yellow-500";
    case "error":
      return "border-l-red-500";
    default:
      return "border-l-gray-300";
  }
}

function typeBadgeColor(type: NotificationType) {
  if (type.startsWith("automation")) return "bg-purple-100 text-purple-700";
  if (type.startsWith("member") || type === "invitation_accepted")
    return "bg-blue-100 text-blue-700";
  if (type.startsWith("device")) return "bg-orange-100 text-orange-700";
  return "bg-gray-100 text-gray-700";
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ---- Component ----

export function NotificationsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params?.workspace as string;
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<"notifications" | "preferences">(
    "notifications"
  );
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // ---- SWR: Notifications ----

  const { data: notifData, mutate: mutateNotifs } = useSWR(
    token && workspaceSlug
      ? ["notifications", token, workspaceSlug, unreadOnly]
      : null,
    ([, t, s, uo]) =>
      apiListNotifications(t, s, { unreadOnly: uo, limit: 100 }),
    { revalidateOnFocus: false }
  );

  // ---- SWR: Unread count ----

  const { data: unreadData, mutate: mutateUnread } = useSWR(
    token && workspaceSlug
      ? ["unread-count", token, workspaceSlug]
      : null,
    ([, t, s]) => apiGetUnreadCount(t, s),
    { revalidateOnFocus: false }
  );

  // ---- SWR: Preferences ----

  const { data: prefsData, mutate: mutatePrefs } = useSWR(
    token && workspaceSlug
      ? ["notification-prefs", token, workspaceSlug]
      : null,
    ([, t, s]) => apiGetNotificationPreferences(t, s),
    { revalidateOnFocus: false }
  );

  const notifications = notifData?.notifications ?? [];
  const unreadCount = unreadData?.unreadCount ?? 0;
  const preferences: NotificationPreferences = prefsData ?? {
    disabledTypes: [],
    emailEnabled: false,
  };

  // ---- Handlers ----

  const handleMarkRead = async (notificationId: string) => {
    if (!token) return;
    setMarkingId(notificationId);
    try {
      await apiMarkNotificationRead(token, workspaceSlug, notificationId);
      mutateNotifs();
      mutateUnread();
    } catch (err: any) {
      toast.error(err.message || "Failed to mark notification as read");
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    setMarkingAll(true);
    try {
      const result = await apiMarkAllNotificationsRead(token, workspaceSlug);
      toast.success(
        `Marked ${result.markedCount} notification${result.markedCount !== 1 ? "s" : ""} as read`
      );
      mutateNotifs();
      mutateUnread();
    } catch (err: any) {
      toast.error(err.message || "Failed to mark all as read");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleToggleType = (type: NotificationType) => {
    const isDisabled = preferences.disabledTypes.includes(type);
    if (isDisabled) {
      mutatePrefs(
        {
          ...preferences,
          disabledTypes: preferences.disabledTypes.filter((t) => t !== type),
        },
        false
      );
    } else {
      mutatePrefs(
        {
          ...preferences,
          disabledTypes: [...preferences.disabledTypes, type],
        },
        false
      );
    }
  };

  const handleToggleEmail = () => {
    mutatePrefs(
      {
        ...preferences,
        emailEnabled: !preferences.emailEnabled,
      },
      false
    );
  };

  const handleSavePreferences = async () => {
    if (!token) return;
    setSavingPrefs(true);
    try {
      const updated = await apiUpdateNotificationPreferences(
        token,
        workspaceSlug,
        {
          disabledTypes: preferences.disabledTypes,
          emailEnabled: preferences.emailEnabled,
        }
      );
      mutatePrefs(updated, false);
      toast.success("Notification preferences saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save preferences");
    } finally {
      setSavingPrefs(false);
    }
  };

  // ---- Render ----

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 text-gray-600 hover:text-gray-900"
          onClick={() => router.push(`/${workspaceSlug}/settings`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Settings
        </Button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Notifications
              </h1>
              <p className="text-sm text-gray-600">
                Manage workspace notifications and preferences
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "notifications" ? "default" : "outline"}
            onClick={() => setActiveTab("notifications")}
            className={
              activeTab === "notifications"
                ? "bg-blue-600 hover:bg-blue-700"
                : ""
            }
          >
            <Bell className="w-4 h-4 mr-2" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] justify-center">
                {unreadCount}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "preferences" ? "default" : "outline"}
            onClick={() => setActiveTab("preferences")}
            className={
              activeTab === "preferences"
                ? "bg-blue-600 hover:bg-blue-700"
                : ""
            }
          >
            <Settings2 className="w-4 h-4 mr-2" />
            Preferences
          </Button>
        </div>

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Bell className="w-5 h-5 text-blue-600" />
                    Notifications
                    {unreadCount > 0 && (
                      <Badge className="bg-red-500 text-white text-xs">
                        {unreadCount} unread
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Stay up to date with your workspace activity
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="unread-only"
                      checked={unreadOnly}
                      onCheckedChange={setUnreadOnly}
                    />
                    <Label
                      htmlFor="unread-only"
                      className="text-sm text-gray-600 whitespace-nowrap"
                    >
                      Show unread only
                    </Label>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllRead}
                    disabled={markingAll || unreadCount === 0}
                  >
                    {markingAll ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCheck className="w-4 h-4 mr-2" />
                    )}
                    Mark All Read
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No notifications yet</p>
                  <p className="text-sm mt-1">
                    {unreadOnly
                      ? "No unread notifications. Try turning off the filter."
                      : "Notifications about automations, members, and devices will appear here."}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notif) => (
                    <div
                      key={notif.notificationId}
                      className={`p-4 sm:p-5 flex items-start gap-4 hover:bg-gray-50/50 transition-colors border-l-4 ${severityBorderColor(notif.severity)} ${
                        !notif.read ? "bg-blue-50/30" : ""
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {severityIcon(notif.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
                          <h4
                            className={`text-sm truncate ${
                              !notif.read
                                ? "font-bold text-gray-900"
                                : "font-medium text-gray-700"
                            }`}
                          >
                            {notif.title}
                          </h4>
                          <Badge
                            variant="secondary"
                            className={`text-xs w-fit ${typeBadgeColor(notif.type)}`}
                          >
                            {NOTIFICATION_TYPE_LABELS[notif.type] || notif.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          {notif.message}
                        </p>
                        <p className="text-xs text-gray-400">
                          {timeAgo(notif.createdAt)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {!notif.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() =>
                              handleMarkRead(notif.notificationId)
                            }
                            disabled={markingId === notif.notificationId}
                          >
                            {markingId === notif.notificationId ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            <span className="ml-1 text-xs hidden sm:inline">
                              Mark as read
                            </span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Preferences Tab */}
        {activeTab === "preferences" && (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50 p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Settings2 className="w-5 h-5 text-blue-600" />
                Notification Preferences
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Choose which notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6 p-4 sm:p-6">
              {/* Notification type toggles */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  Notification Types
                </h3>
                <div className="space-y-3">
                  {ALL_NOTIFICATION_TYPES.map((type) => {
                    const isEnabled =
                      !preferences.disabledTypes.includes(type);
                    return (
                      <div
                        key={type}
                        className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              isEnabled ? "bg-green-500" : "bg-gray-300"
                            }`}
                          />
                          <Label
                            htmlFor={`type-${type}`}
                            className="text-sm font-medium text-gray-700 cursor-pointer"
                          >
                            {NOTIFICATION_TYPE_LABELS[type]}
                          </Label>
                        </div>
                        <Switch
                          id={`type-${type}`}
                          checked={isEnabled}
                          onCheckedChange={() => handleToggleType(type)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Email toggle */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  Email Notifications
                </h3>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        preferences.emailEnabled
                          ? "bg-green-500"
                          : "bg-gray-300"
                      }`}
                    />
                    <Label
                      htmlFor="email-notifications"
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      Send email notifications
                    </Label>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={preferences.emailEnabled}
                    onCheckedChange={handleToggleEmail}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  When enabled, you will also receive notifications via email for
                  enabled notification types.
                </p>
              </div>

              {/* Save button */}
              <div className="pt-4 flex justify-end">
                <Button
                  onClick={handleSavePreferences}
                  disabled={savingPrefs}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                >
                  {savingPrefs ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
