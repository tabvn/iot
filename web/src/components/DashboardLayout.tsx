"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Cpu, Layers, ChevronDown, Plus, Code, Sparkles, FileText, Bell, Menu, X,
  CheckCircle2, XCircle, AlertTriangle, Info, Check, CheckCheck, Loader2, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarMenu } from "@/components/AvatarMenu";
import { useAuth } from "@/contexts/AuthContext";
// ACL hooks available if needed: import { useACL, ShowIf } from "@/lib/acl";
import {
  apiListWorkspaces,
  apiGetUnreadCount,
  apiListNotifications,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
  type WorkspaceNotification,
  type WorkspaceDetail,
} from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, user, isLoading: authLoading } = useAuth();
  const isHome = pathname === '/';

  // Extract workspace from URL pattern /:workspace/...
  const pathParts = pathname.split('/').filter(Boolean);
  const workspace = (!pathParts[0] || pathParts[0] === 'dashboard' || pathParts[0] === 'developer')
    ? null
    : pathParts[0];

  const [workspaces, setWorkspaces] = useState<WorkspaceDetail[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<WorkspaceNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (authLoading || !token || !user) return;
    apiListWorkspaces(token, user.id)
      .then((res) => setWorkspaces(res.workspaces))
      .catch(() => {});
  }, [token, user, authLoading]);

  const fetchUnread = () => {
    if (!token || !workspace) return;
    apiGetUnreadCount(token, workspace)
      .then((res) => setUnreadCount(res.unreadCount))
      .catch(() => {});
  };

  const fetchRecentNotifications = () => {
    if (!token || !workspace) return;
    setNotifLoading(true);
    apiListNotifications(token, workspace, { limit: 8 })
      .then((res) => setRecentNotifications(res.notifications))
      .catch(() => {})
      .finally(() => setNotifLoading(false));
  };

  useEffect(() => {
    if (authLoading || !token || !workspace) return;
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [token, workspace, authLoading]);

  // Fetch recent notifications when dropdown opens
  useEffect(() => {
    if (notifOpen) fetchRecentNotifications();
  }, [notifOpen]);

  const handleMarkRead = async (notificationId: string) => {
    if (!token || !workspace) return;
    setMarkingId(notificationId);
    try {
      await apiMarkNotificationRead(token, workspace, notificationId);
      setRecentNotifications((prev) =>
        prev.map((n) =>
          n.notificationId === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n
        )
      );
      fetchUnread();
    } catch {}
    setMarkingId(null);
  };

  const handleMarkAllRead = async () => {
    if (!token || !workspace) return;
    setMarkingAll(true);
    try {
      await apiMarkAllNotificationsRead(token, workspace);
      setRecentNotifications((prev) => prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch {}
    setMarkingAll(false);
  };

  const currentWorkspace = workspace
    ? workspaces.find(w => w.slug === workspace || w.workspaceId === workspace)
    : null;

  // Determine active section
  const isDevicesActive = workspace && !pathname.includes('/api') && !pathname.includes('/automations') && !pathname.includes('/settings') && !pathname.includes('/device/');
  const isAutomationActive = pathname.includes('/automations');
  const isApiActive = pathname.includes('/api');
  const isSettingsActive = pathname.includes('/settings');
  const isDeveloperActive = pathname.startsWith('/developer');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Modern Header with Workspace Switcher */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo + Workspace Switcher */}
            <div className="flex items-center gap-4">
              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>

              {/* Logo */}
              <Link href="/dashboard" className="flex items-center gap-3 group">
                <Logo variant="icon" size="md" />
                <div className="hidden sm:flex flex-col">
                  <span className="text-base font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
                    Thebaycity
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium -mt-0.5">
                    IoT Platform
                  </span>
                </div>
              </Link>

              <div className="hidden lg:block w-px h-8 bg-gray-300" />

              {/* Workspace Switcher */}
              {currentWorkspace && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="gap-2 px-3 h-10 hover:bg-gray-100 transition-all group inline-flex items-center justify-center rounded-md bg-transparent border-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                          <Layers className="w-4 h-4 text-white" />
                        </div>
                        <div className="hidden md:flex flex-col items-start">
                          <span className="text-sm font-semibold text-gray-900 leading-none">
                            {currentWorkspace.name}
                          </span>
                          <span className="text-xs text-gray-500 leading-none mt-0.5">
                            workspace
                          </span>
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72">
                    <DropdownMenuLabel className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                      Switch Workspace
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="max-h-72 overflow-y-auto">
                      {workspaces.map(ws => (
                        <DropdownMenuItem
                          key={ws.workspaceId}
                          onClick={() => router.push(`/${ws.slug || ws.workspaceId}`)}
                          className={`p-3 cursor-pointer ${ws.slug === workspace || ws.workspaceId === workspace ? 'bg-blue-50' : ''}`}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${
                              ws.slug === workspace || ws.workspaceId === workspace
                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                : 'bg-gradient-to-br from-gray-400 to-gray-500'
                            }`}>
                              <Layers className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {ws.name}
                                </p>
                                {(ws.slug === workspace || ws.workspaceId === workspace) && (
                                  <Badge variant="default" className="text-xs bg-blue-600">
                                    Active
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate">
                                {ws.description || ws.slug}
                              </p>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => router.push('/dashboard')}
                      className="p-3 cursor-pointer bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100"
                    >
                      <Plus className="w-4 h-4 mr-2 text-purple-600" />
                      <span className="font-semibold text-purple-900">Create New Workspace</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Center: Main Navigation (only show when in workspace) */}
            {currentWorkspace && (
              <nav className="hidden lg:flex items-center gap-1 absolute left-1/2 transform -translate-x-1/2">
                <Link href={`/${currentWorkspace.slug || currentWorkspace.workspaceId}`}>
                  <Button
                    variant="ghost"
                    className={`gap-2 px-4 h-9 transition-all relative ${
                      isDevicesActive
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg hover:from-blue-600 hover:to-indigo-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Cpu className="w-4 h-4" />
                    <span className="font-semibold">Devices</span>
                  </Button>
                </Link>
                <Link href={`/${currentWorkspace.slug || currentWorkspace.workspaceId}/automations`}>
                  <Button
                    variant="ghost"
                    className={`gap-2 px-4 h-9 transition-all ${
                      isAutomationActive
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md hover:shadow-lg hover:from-purple-600 hover:to-pink-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="font-semibold">Automation</span>
                  </Button>
                </Link>
                <Link href={`/${currentWorkspace.slug || currentWorkspace.workspaceId}/api`}>
                  <Button
                    variant="ghost"
                    className={`gap-2 px-4 h-9 transition-all ${
                      isApiActive
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-teal-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Code className="w-4 h-4" />
                    <span className="font-semibold">API & Docs</span>
                  </Button>
                </Link>
              </nav>
            )}

            {/* Global Navigation (show when NOT in workspace) */}
            {!currentWorkspace && (
              <nav className="hidden lg:flex items-center gap-1 absolute left-1/2 transform -translate-x-1/2">
                <Link href="/developer">
                  <Button
                    variant="ghost"
                    className={`gap-2 px-4 h-9 transition-all ${
                      isDeveloperActive
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-teal-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="font-semibold">Developer Docs</span>
                  </Button>
                </Link>
              </nav>
            )}

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Notifications Dropdown */}
              {workspace && (
                <Popover open={notifOpen} onOpenChange={setNotifOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative hover:bg-gray-100 rounded-lg"
                    >
                      <Bell className="w-5 h-5 text-gray-600" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white leading-none">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-96 p-0 shadow-2xl border-gray-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                          <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0 h-5">
                            {unreadCount}
                          </Badge>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          disabled={markingAll}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 disabled:opacity-50"
                        >
                          {markingAll ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCheck className="w-3 h-3" />
                          )}
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[400px] overflow-y-auto">
                      {notifLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        </div>
                      ) : recentNotifications.length === 0 ? (
                        <div className="py-10 text-center">
                          <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No notifications yet</p>
                        </div>
                      ) : (
                        recentNotifications.map((n) => (
                          <div
                            key={n.notificationId}
                            className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50/80 transition-colors ${
                              !n.read ? "bg-blue-50/40" : ""
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {n.severity === "success" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                              {n.severity === "error" && <XCircle className="w-4 h-4 text-red-500" />}
                              {n.severity === "warning" && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                              {n.severity === "info" && <Info className="w-4 h-4 text-blue-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs leading-snug ${!n.read ? "font-semibold text-gray-900" : "text-gray-600"}`}>
                                {n.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="text-[10px] text-gray-400 mt-1">
                                {(() => {
                                  const ms = Date.now() - new Date(n.createdAt).getTime();
                                  const m = Math.floor(ms / 60000);
                                  if (m < 1) return "Just now";
                                  if (m < 60) return `${m}m ago`;
                                  const h = Math.floor(m / 60);
                                  if (h < 24) return `${h}h ago`;
                                  return `${Math.floor(h / 24)}d ago`;
                                })()}
                              </p>
                            </div>
                            {!n.read && (
                              <button
                                onClick={() => handleMarkRead(n.notificationId)}
                                disabled={markingId === n.notificationId}
                                className="shrink-0 mt-0.5 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                                title="Mark as read"
                              >
                                {markingId === n.notificationId ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50/50">
                      <Link
                        href={`/${workspace}/settings/notifications`}
                        onClick={() => setNotifOpen(false)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center justify-center gap-1"
                      >
                        View all notifications
                      </Link>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              <div className="hidden sm:block w-px h-6 bg-gray-300 mx-1" />

              {/* Avatar Menu */}
              <AvatarMenu currentWorkspaceId={currentWorkspace?.workspaceId} />
            </div>
          </div>

          {/* Mobile Navigation */}
          {currentWorkspace && sidebarOpen && (
            <div className="lg:hidden border-t border-gray-200 py-3 space-y-1">
              <Link href={`/${currentWorkspace.slug || currentWorkspace.workspaceId}`} onClick={() => setSidebarOpen(false)}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 h-11 ${
                    isDevicesActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600'
                  }`}
                >
                  <Cpu className="w-5 h-5" />
                  <span className="font-semibold">Devices</span>
                </Button>
              </Link>
              <Link href={`/${currentWorkspace.slug || currentWorkspace.workspaceId}/automations`} onClick={() => setSidebarOpen(false)}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 h-11 ${
                    isAutomationActive ? 'bg-purple-50 text-purple-700' : 'text-gray-600'
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                  <span className="font-semibold">Automation</span>
                </Button>
              </Link>
              <Link href={`/${currentWorkspace.slug || currentWorkspace.workspaceId}/api`} onClick={() => setSidebarOpen(false)}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 h-11 ${
                    isApiActive ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600'
                  }`}
                >
                  <Code className="w-5 h-5" />
                  <span className="font-semibold">API & Docs</span>
                </Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/50 backdrop-blur-sm mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="2" fill="white" />
                  <circle cx="6" cy="6" r="1.5" fill="white" opacity="0.9" />
                  <circle cx="26" cy="6" r="1.5" fill="white" opacity="0.9" />
                  <circle cx="6" cy="26" r="1.5" fill="white" opacity="0.9" />
                  <circle cx="26" cy="26" r="1.5" fill="white" opacity="0.9" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-900">Thebaycity IoT Platform</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <p>© 2026 Thebaycity. Built for IoT developers.</p>
              <Link href="/terms" className="hover:text-gray-900 transition-colors">
                Terms & Conditions
              </Link>
              <Link href="/contact" className="hover:text-gray-900 transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
