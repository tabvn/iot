"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Zap, Webhook, Trash2, Edit, ArrowLeft, GitBranch, Bell, Clock, Activity, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Rule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: {
    type: 'device' | 'schedule' | 'webhook';
    deviceId?: string;
    deviceName?: string;
    condition?: string;
    value?: number;
    schedule?: string;
  };
  actions: Array<{
    type: 'device_control' | 'notification' | 'webhook';
    deviceId?: string;
    deviceName?: string;
    action?: string;
    webhookUrl?: string;
    message?: string;
  }>;
  lastTriggered?: string;
  triggerCount: number;
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
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);

  const [rules, setRules] = useState<Rule[]>([
    {
      id: 'r1',
      name: 'Temperature Alert',
      description: 'Send notification when temperature exceeds 30°C',
      enabled: true,
      trigger: {
        type: 'device',
        deviceId: 'd1',
        deviceName: 'Living Room Sensor',
        condition: 'temperature_above',
        value: 30,
      },
      actions: [
        { type: 'notification', message: 'Temperature alert: Living room is too hot!' },
      ],
      lastTriggered: new Date(Date.now() - 3600000).toISOString(),
      triggerCount: 23,
    },
  ]);

  const [webhooks, setWebhooks] = useState<WebhookItem[]>([
    {
      id: 'wh1',
      name: 'Slack Notifications',
      url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
      secret: 'sk_live_abc123xyz789',
      events: ['device.online', 'device.offline'],
      enabled: true,
      lastTriggered: new Date(Date.now() - 1800000).toISOString(),
      triggerCount: 89,
    },
  ]);

  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[],
  });

  const handleToggleRule = (ruleId: string) => {
    setRules(rules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
    toast.success(`Rule ${rules.find(r => r.id === ruleId)?.enabled ? 'disabled' : 'enabled'}`);
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(rules.filter(r => r.id !== ruleId));
    toast.success('Rule deleted');
  };

  const handleToggleWebhook = (webhookId: string) => {
    setWebhooks(webhooks.map(w => w.id === webhookId ? { ...w, enabled: !w.enabled } : w));
    toast.success(`Webhook ${webhooks.find(w => w.id === webhookId)?.enabled ? 'disabled' : 'enabled'}`);
  };

  const handleDeleteWebhook = (webhookId: string) => {
    setWebhooks(webhooks.filter(w => w.id !== webhookId));
    toast.success('Webhook deleted');
  };

  const handleCopySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    toast.success('Secret copied to clipboard');
  };

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
          <div className="text-4xl font-bold">{rules.filter(r => r.enabled).length}</div>
          <div className="text-xs mt-2 opacity-75">of {rules.length} total</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium opacity-90">Active Webhooks</div>
            <Webhook className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-4xl font-bold">{webhooks.filter(w => w.enabled).length}</div>
          <div className="text-xs mt-2 opacity-75">of {webhooks.length} total</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium opacity-90">Total Triggers</div>
            <Zap className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-4xl font-bold">{rules.reduce((sum, r) => sum + r.triggerCount, 0)}</div>
          <div className="text-xs mt-2 opacity-75">all time</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium opacity-90">Webhook Calls</div>
            <Activity className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-4xl font-bold">{webhooks.reduce((sum, w) => sum + w.triggerCount, 0)}</div>
          <div className="text-xs mt-2 opacity-75">all time</div>
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
            {rules.map((rule) => (
              <Card key={rule.id} className="border border-gray-200 hover:shadow-md transition-all">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg font-bold">{rule.name}</CardTitle>
                        <Badge variant={rule.enabled ? "default" : "secondary"} className="text-xs">
                          {rule.enabled ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm">{rule.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={rule.enabled} onCheckedChange={() => handleToggleRule(rule.id)} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Triggered: <span className="font-semibold">{rule.triggerCount}x</span></span>
                      </div>
                      {rule.lastTriggered && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 text-xs">Last: {new Date(rule.lastTriggered).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteRule(rule.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
            {webhooks.map((webhook) => (
              <Card key={webhook.id} className="border border-gray-200 hover:shadow-md transition-all">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Webhook className="w-5 h-5 text-purple-600" />
                        <CardTitle className="text-lg font-bold">{webhook.name}</CardTitle>
                        <Badge variant={webhook.enabled ? "default" : "secondary"} className="text-xs">
                          {webhook.enabled ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm font-mono text-xs break-all">{webhook.url}</CardDescription>
                    </div>
                    <Switch checked={webhook.enabled} onCheckedChange={() => handleToggleWebhook(webhook.id)} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-bold text-gray-700 uppercase">Secret Key</Label>
                      <Button variant="ghost" size="sm" className="h-7 gap-2 text-xs" onClick={() => handleCopySecret(webhook.secret)}>
                        <Copy className="w-3 h-3" />
                        Copy
                      </Button>
                    </div>
                    <code className="text-xs font-mono bg-white px-3 py-2 rounded-lg border block">{webhook.secret}</code>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Called: <span className="font-semibold">{webhook.triggerCount}x</span></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteWebhook(webhook.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
