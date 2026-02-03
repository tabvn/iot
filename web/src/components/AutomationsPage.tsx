"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import {
  Plus, Zap, Webhook, Trash2, Edit, ArrowLeft, GitBranch, Bell, Clock, Activity,
  Copy, Loader2, AlertCircle, Database, Calendar, Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  apiListAutomations,
  apiUpdateAutomation,
  apiDeleteAutomation,
  type Automation,
} from "@/lib/api";

// SWR fetchers
async function automationsFetcher([, token, workspaceSlug]: [string, string, string]) {
  return apiListAutomations(token, workspaceSlug);
}

async function updateAutomationFetcher(
  _key: string,
  { arg }: { arg: { token: string; workspaceSlug: string; automationId: string; payload: { status?: "active" | "paused" | "disabled" } } }
) {
  return apiUpdateAutomation(arg.token, arg.workspaceSlug, arg.automationId, arg.payload);
}

async function deleteAutomationFetcher(
  _key: string,
  { arg }: { arg: { token: string; workspaceSlug: string; automationId: string } }
) {
  return apiDeleteAutomation(arg.token, arg.workspaceSlug, arg.automationId);
}

// Helper to get trigger icon
function getTriggerIcon(triggerType: string) {
  switch (triggerType) {
    case "device_data":
      return <Database className="w-4 h-4 text-blue-600" />;
    case "device_status":
      return <Wifi className="w-4 h-4 text-green-600" />;
    case "schedule":
      return <Calendar className="w-4 h-4 text-purple-600" />;
    default:
      return <Zap className="w-4 h-4 text-gray-600" />;
  }
}

// Helper to format trigger description
function formatTriggerDescription(automation: Automation): string {
  const config = automation.triggerConfig;
  switch (config.type) {
    case "device_data":
      return `When device data matches ${config.conditions.length} condition${config.conditions.length > 1 ? "s" : ""}`;
    case "device_status":
      return `When device goes ${config.status}`;
    case "schedule":
      return `Scheduled: ${config.cron}`;
    default:
      return "Custom trigger";
  }
}

interface WebhookItem {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
  lastTriggered?: string;
  triggerCount: number;
}

export function AutomationsPage() {
  const params = useParams();
  const workspace = params?.workspace as string;
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();

  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [automationToDelete, setAutomationToDelete] = useState<string | null>(null);

  // Fetch automations
  const {
    data: automationsData,
    error: automationsError,
    isLoading: automationsLoading,
    mutate: mutateAutomations,
  } = useSWR(
    token && workspace ? ["automations", token, workspace] : null,
    automationsFetcher
  );

  const automations = automationsData?.automations ?? [];

  // Update mutation
  const { trigger: triggerUpdate, isMutating: isUpdating } = useSWRMutation(
    "update-automation",
    updateAutomationFetcher
  );

  // Delete mutation
  const { trigger: triggerDelete, isMutating: isDeleting } = useSWRMutation(
    "delete-automation",
    deleteAutomationFetcher
  );

  // Webhooks (mock for now - can be connected to API later)
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [newWebhook, setNewWebhook] = useState({ name: "", url: "", events: [] as string[] });

  const handleToggleAutomation = useCallback(async (automation: Automation) => {
    if (!token) return;
    const newStatus = automation.status === "active" ? "paused" : "active";
    try {
      await triggerUpdate({
        token,
        workspaceSlug: workspace,
        automationId: automation.automationId,
        payload: { status: newStatus },
      });
      await mutateAutomations();
      toast.success(`Automation ${newStatus === "active" ? "enabled" : "paused"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update automation");
    }
  }, [token, workspace, triggerUpdate, mutateAutomations]);

  const handleDeleteAutomation = useCallback(async () => {
    if (!token || !automationToDelete) return;
    try {
      await triggerDelete({
        token,
        workspaceSlug: workspace,
        automationId: automationToDelete,
      });
      await mutateAutomations();
      toast.success("Automation deleted");
      setDeleteDialogOpen(false);
      setAutomationToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete automation");
    }
  }, [token, workspace, automationToDelete, triggerDelete, mutateAutomations]);

  const handleToggleWebhook = (webhookId: string) => {
    setWebhooks(webhooks.map((w) => (w.id === webhookId ? { ...w, enabled: !w.enabled } : w)));
    toast.success(`Webhook ${webhooks.find((w) => w.id === webhookId)?.enabled ? "disabled" : "enabled"}`);
  };

  const handleDeleteWebhook = (webhookId: string) => {
    setWebhooks(webhooks.filter((w) => w.id !== webhookId));
    toast.success("Webhook deleted");
  };

  const handleCopySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    toast.success("Secret copied to clipboard");
  };

  // Loading state
  if (authLoading || automationsLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-sm text-gray-600">Loading automations...</span>
        </div>
      </div>
    );
  }

  // Auth error
  if (!token) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">Not Authenticated</h3>
            <p className="text-sm text-gray-600 mb-4">Please log in to view automations.</p>
            <Button onClick={() => router.push("/login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // API error
  if (automationsError) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">Error Loading Automations</h3>
            <p className="text-sm text-gray-600 mb-4">{automationsError.message}</p>
            <Button onClick={() => mutateAutomations()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeAutomations = automations.filter((a) => a.status === "active");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${workspace}`}>
            <Button variant="ghost" size="icon" className="rounded-lg hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
              Automations & Integrations
            </h2>
            <p className="text-gray-500 mt-1">Create rules, configure webhooks, and automate your IoT devices</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium opacity-90">Active Rules</div>
            <GitBranch className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-4xl font-bold">{activeAutomations.length}</div>
          <div className="text-xs mt-2 opacity-75">of {automations.length} total</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium opacity-90">Active Webhooks</div>
            <Webhook className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-4xl font-bold">{webhooks.filter((w) => w.enabled).length}</div>
          <div className="text-xs mt-2 opacity-75">of {webhooks.length} total</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium opacity-90">Trigger Types</div>
            <Zap className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-4xl font-bold">
            {new Set(automations.map((a) => a.triggerType)).size}
          </div>
          <div className="text-xs mt-2 opacity-75">unique types</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium opacity-90">Total Actions</div>
            <Activity className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-4xl font-bold">
            {automations.reduce((sum, a) => sum + a.actions.length, 0)}
          </div>
          <div className="text-xs mt-2 opacity-75">configured</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rules">
            <GitBranch className="w-4 h-4 mr-2" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="w-4 h-4 mr-2" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Automation Rules</h3>
              <p className="text-sm text-gray-500 mt-1">Create conditional rules to automate device actions</p>
            </div>
            <Button
              onClick={() => router.push(`/${workspace}/automations/create`)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Rule
            </Button>
          </div>

          {/* Rules List */}
          <div className="space-y-4">
            {automations.length === 0 ? (
              <Card className="border border-dashed border-gray-300">
                <CardContent className="py-12 text-center">
                  <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="font-semibold text-gray-900 mb-2">No automation rules yet</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Create your first rule to automate device actions based on triggers.
                  </p>
                  <Button
                    onClick={() => router.push(`/${workspace}/automations/create`)}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Rule
                  </Button>
                </CardContent>
              </Card>
            ) : (
              automations.map((automation) => (
                <Card key={automation.automationId} className="border border-gray-200 hover:shadow-md transition-all">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getTriggerIcon(automation.triggerType)}
                          <CardTitle className="text-lg font-bold">{automation.name}</CardTitle>
                          <Badge
                            variant={automation.status === "active" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {automation.status === "active" ? "Active" : automation.status === "paused" ? "Paused" : "Disabled"}
                          </Badge>
                        </div>
                        <CardDescription className="text-sm">
                          {automation.description || formatTriggerDescription(automation)}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={automation.status === "active"}
                          onCheckedChange={() => handleToggleAutomation(automation)}
                          disabled={isUpdating}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Trigger and Actions summary */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>Trigger: {automation.triggerType.replace("_", " ")}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        <span>{automation.actions.length} action{automation.actions.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 text-xs">
                            Created: {new Date(automation.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                          onClick={() => router.push(`/${workspace}/automations/${automation.automationId}/edit`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setAutomationToDelete(automation.automationId);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Webhook Integrations</h3>
              <p className="text-sm text-gray-500 mt-1">Connect external services to receive real-time device events</p>
            </div>
            <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2">
                  <Plus className="w-4 h-4" />
                  Add Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Add Webhook</DialogTitle>
                  <DialogDescription className="text-base">
                    Configure a webhook to receive device events
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-5 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhook-name" className="text-base">Webhook Name</Label>
                    <Input
                      id="webhook-name"
                      placeholder="e.g., Slack Notifications"
                      value={newWebhook.name}
                      onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url" className="text-base">Webhook URL</Label>
                    <Input
                      id="webhook-url"
                      placeholder="https://hooks.slack.com/services/..."
                      value={newWebhook.url}
                      onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                      className="h-11"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setWebhookDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    Add Webhook
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Webhooks List */}
          <div className="space-y-4">
            {webhooks.length === 0 ? (
              <Card className="border border-dashed border-gray-300">
                <CardContent className="py-12 text-center">
                  <Webhook className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="font-semibold text-gray-900 mb-2">No webhooks configured</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Add a webhook to receive real-time notifications when device events occur.
                  </p>
                  <Button onClick={() => setWebhookDialogOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Webhook
                  </Button>
                </CardContent>
              </Card>
            ) : (
              webhooks.map((webhook) => (
                <Card key={webhook.id} className="border border-gray-200 hover:shadow-md transition-all">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Webhook className="w-5 h-5 text-purple-600" />
                          <CardTitle className="text-lg font-bold">{webhook.name}</CardTitle>
                          <Badge variant={webhook.enabled ? "default" : "secondary"} className="text-xs">
                            {webhook.enabled ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <CardDescription className="text-sm font-mono text-xs break-all">
                          {webhook.url}
                        </CardDescription>
                      </div>
                      <Switch checked={webhook.enabled} onCheckedChange={() => handleToggleWebhook(webhook.id)} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-bold text-gray-700 uppercase">Secret Key</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-2 text-xs"
                          onClick={() => handleCopySecret(webhook.secret)}
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </Button>
                      </div>
                      <code className="text-xs font-mono bg-white px-3 py-2 rounded-lg border block">
                        {webhook.secret}
                      </code>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">
                            Called: <span className="font-semibold">{webhook.triggerCount}x</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="gap-2">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteWebhook(webhook.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Automation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this automation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAutomation}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
