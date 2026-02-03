"use client";
import React, { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Settings,
  Users,
  CreditCard,
  Key,
  AlertTriangle,
  Building2,
  Mail,
  Calendar,
  Crown,
  Sparkles,
  Check,
  X,
  ArrowRight,
  Download,
  Trash2,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Code2,
  FileCode,
  BookOpen,
  Terminal,
  Lock,
  Zap,
  Database,
  Send,
  Webhook,
  PlayCircle,
  Shield,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { mockWorkspaces } from '@/data/mockData';

// Mock data
const members = [
  { id: '1', name: 'John Doe', email: 'john@company.com', role: 'owner', joinedAt: '2024-01-15', avatar: 'JD' },
  { id: '2', name: 'Sarah Chen', email: 'sarah@company.com', role: 'admin', joinedAt: '2024-02-20', avatar: 'SC' },
  { id: '3', name: 'Mike Johnson', email: 'mike@company.com', role: 'developer', joinedAt: '2024-03-10', avatar: 'MJ' },
];

const apiKeys = [
  { id: 'key_1', name: 'Production API Key', key: 'tbcy_prod_a1b2c3d4e5f6...', createdAt: '2024-01-15', lastUsed: '2 hours ago' },
  { id: 'key_2', name: 'Development API Key', key: 'tbcy_dev_x9y8z7w6v5u4...', createdAt: '2024-02-10', lastUsed: '5 days ago' },
];

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    features: [
      '5 devices',
      '250K API requests/mo',
      '7 days retention',
      '100 MB storage',
      '3 automation rules',
      '1 team member',
      'Community support',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 29,
    popular: true,
    features: [
      '50 devices',
      '2.5M API requests/mo',
      '90 days retention',
      '5 GB storage',
      '50 automation rules',
      '5 team members',
      'Email support',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 99,
    features: [
      '250 devices',
      '12M API requests/mo',
      '1 year retention',
      '25 GB storage',
      '500 automation rules',
      '20 team members',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    features: [
      '1,000+ devices',
      '50M+ API requests/mo',
      'Custom retention',
      '100 GB storage',
      'Unlimited rules',
      'Unlimited members',
      'Dedicated support',
    ],
  },
];

const invoices = [
  { id: 'inv_001', date: '2024-02-01', amount: 29, status: 'paid', period: 'Feb 2024' },
  { id: 'inv_002', date: '2024-01-01', amount: 29, status: 'paid', period: 'Jan 2024' },
  { id: 'inv_003', date: '2023-12-01', amount: 29, status: 'paid', period: 'Dec 2023' },
];

interface WorkspaceSettingsProps {
  initialTab?: string;
}

export function WorkspaceSettings({ initialTab }: WorkspaceSettingsProps) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceParam = params?.workspace as string;

  const workspace = mockWorkspaces.find((w) => w.slug === workspaceParam || w.id === workspaceParam);
  const currentPlan = plans.find(p => p.id === (workspace as any)?.plan || 'professional');

  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');

  // Derive current section from URL path and/or tab query
  const tabFromUrl = searchParams.get('tab') || initialTab || 'general';

  const baseSettingsUrl = `/${workspaceParam}/settings`;
  const settingsNavItems = [
    { id: 'general', label: 'General', href: baseSettingsUrl, icon: Settings },
    { id: 'members', label: 'Members', href: `${baseSettingsUrl}/members`, icon: Users },
    { id: 'plan', label: 'Plan & Billing', href: `${baseSettingsUrl}/plan`, icon: CreditCard },
    { id: 'api', label: 'API Integration', href: `${baseSettingsUrl}/api`, icon: Key },
    { id: 'advanced', label: 'Advanced', href: `${baseSettingsUrl}/advanced`, icon: AlertTriangle },
  ];


  // Determine active section by initialTab or ?tab fallback
  const activeSection = initialTab || tabFromUrl || 'general';

  const handleUpgrade = (planId: string) => {
    setSelectedPlan(planId);
    setShowUpgradeDialog(true);
  };

  const handleDowngrade = (planId: string) => {
    setSelectedPlan(planId);
    setShowDowngradeDialog(true);
  };

  const confirmUpgrade = () => {
    toast.success(`Successfully upgraded to ${selectedPlan}!`);
    setShowUpgradeDialog(false);
  };

  const confirmDowngrade = () => {
    toast.success(`Downgrade scheduled. Changes take effect at end of billing period.`);
    setShowDowngradeDialog(false);
  };

  const handleInviteMember = () => {
    toast.success('Invitation sent!');
    setShowInviteDialog(false);
  };

  const handleRemoveMember = (memberId: string) => {
    toast.success('Member removed from workspace');
  };

  const handleCreateApiKey = () => {
    toast.success('New API key created!');
    setShowNewKeyDialog(false);
  };

  const handleDeleteApiKey = (keyId: string) => {
    toast.success('API key deleted');
  };

  const handleCopyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('API key copied to clipboard');
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success('Copied to clipboard');
  };

  const handleDeleteWorkspace = () => {
    if (deleteConfirmation === workspace?.slug) {
      toast.success('Workspace deleted');
      router.push('/dashboard');
    } else {
      toast.error('Please enter the correct workspace slug');
    }
  };

  const canUpgrade = (planId: string) => {
    const planOrder = ['starter', 'professional', 'business', 'enterprise'];
    const currentIndex = planOrder.indexOf((workspace as any)?.plan || 'starter');
    const targetIndex = planOrder.indexOf(planId);
    return targetIndex > currentIndex;
  };

  const canDowngrade = (planId: string) => {
    const planOrder = ['starter', 'professional', 'business', 'enterprise'];
    const currentIndex = planOrder.indexOf((workspace as any)?.plan || 'starter');
    const targetIndex = planOrder.indexOf(planId);
    return targetIndex < currentIndex;
  };

  const codeExamples = {
    curl: `curl -X POST https://api.thebaycity.dev/v1/data \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "device_id": "device_001",
    "temperature": 22.5,
    "humidity": 65
  }'`,
    python: `import requests

url = "https://api.thebaycity.dev/v1/data"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
data = {
    "device_id": "device_001",
    "temperature": 22.5,
    "humidity": 65
}

response = requests.post(url, json=data, headers=headers)
print(response.json())`,
    javascript: `const axios = require('axios');

const url = 'https://api.thebaycity.dev/v1/data';
const headers = {
  'Authorization': 'Bearer YOUR_API_KEY',
  'Content-Type': 'application/json'
};
const data = {
  device_id: 'device_001',
  temperature: 22.5,
  humidity: 65
};

axios.post(url, data, { headers })
  .then(response => console.log(response.data))
  .catch(error => console.error(error));`,
    arduino: `#include <WiFi.h>
#include <HTTPClient.h>

void sendData() {
  HTTPClient http;
  http.begin("https://api.thebaycity.dev/v1/data");
  http.addHeader("Authorization", "Bearer YOUR_API_KEY");
  http.addHeader("Content-Type", "application/json");
  
  String payload = "{\\"device_id\\":\\"device_001\\",\\"temperature\\":22.5}";
  int httpCode = http.POST(payload);
  
  if(httpCode > 0) {
    String response = http.getString();
    Serial.println(response);
  }
  http.end();
}`
  };

  if (!workspace) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">Workspace not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Workspace Settings</h1>
              <p className="text-xs sm:text-sm text-gray-600">{workspace.name}</p>
            </div>
          </div>
        </div>

        {/* MOBILE SETTINGS DROPDOWN NAV (top) */}
        <div className="lg:hidden mb-4">
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="px-3 py-3 space-y-2">
              <div className="text-xs font-semibold text-gray-500 flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-500" />
                <span>Workspace settings</span>
              </div>
              <Select
                value={
                  activeSection === 'billing'
                    ? 'plan'
                    : activeSection === 'api'
                    ? 'api'
                    : activeSection === 'members'
                    ? 'members'
                    : activeSection === 'advanced'
                    ? 'advanced'
                    : 'general'
                }
                onValueChange={(value) => {
                  const item = settingsNavItems.find((i) => i.id === value);
                  if (!item) return;
                  router.push(item.href);
                }}
              >
                <SelectTrigger className="w-full h-10 text-sm">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {settingsNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SelectItem key={item.id} value={item.id} className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-500" />
                          <span>{item.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* DESKTOP HORIZONTAL TAB NAV */}
        <div className="hidden lg:block mb-6">
          <Card className="border border-gray-200 shadow-sm bg-white/80 backdrop-blur-sm">
            <CardContent className="px-4 py-3">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-800">Workspace settings</span>
                  <span className="hidden xl:inline text-xs text-gray-500">Manage configuration for this workspace</span>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {settingsNavItems.map((item) => {
                  const isActive =
                    (item.id === 'plan' && activeSection === 'billing') ||
                    (item.id === 'api' && activeSection === 'api') ||
                    (item.id === 'general' && activeSection === 'general') ||
                    (item.id === 'members' && activeSection === 'members') ||
                    (item.id === 'advanced' && activeSection === 'advanced');
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CONTENT */}
        <div className="space-y-6">
          {/* General settings section (was TabsContent value="general") */}
          {activeSection === 'general' && (
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50 p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Workspace Information
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Manage your workspace details and settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 p-4 sm:p-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold">Workspace Name</Label>
                  <Input id="name" defaultValue={workspace.name} className="h-10 sm:h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug" className="text-sm font-semibold">Workspace Slug</Label>
                  <Input id="slug" defaultValue={workspace.slug} className="h-10 sm:h-11" />
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Terminal className="w-3 h-3" />
                    thebaycity.dev/{workspace.slug}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                  <Textarea
                    id="description"
                    defaultValue={workspace.description || "IoT workspace for managing devices and data"}
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Created</Label>
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      {new Date(workspace.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Devices</Label>
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      <Database className="w-4 h-4 text-green-600" />
                      {workspace.deviceCount} active devices
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg w-full sm:w-auto">
                    <Check className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" className="w-full sm:w-auto">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Members section (was TabsContent value="members") */}
          {activeSection === 'members' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Team Members</h2>
                  <p className="text-xs sm:text-sm text-gray-600">Manage who has access to this workspace</p>
                </div>
                <Button onClick={() => setShowInviteDialog(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg w-full sm:w-auto">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
              </div>

              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardContent className="p-0">
                  <div className="divide-y">
                    {members.map((member) => (
                      <div key={member.id} className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-base sm:text-lg shadow-md flex-shrink-0">
                            {member.avatar}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-gray-900 text-base sm:text-lg truncate">{member.name}</div>
                            <div className="text-xs sm:text-sm text-gray-600 flex items-center gap-2">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{member.email}</span>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3 flex-shrink-0" />
                              Joined {new Date(member.joinedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-auto sm:ml-0">
                          <Badge
                            variant={member.role === 'owner' ? 'default' : 'secondary'}
                            className={member.role === 'owner' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' : ''}
                          >
                            {member.role === 'owner' && <Crown className="w-3 h-3 mr-1" />}
                            {member.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                            {member.role}
                          </Badge>
                          {member.role !== 'owner' && (
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemoveMember(member.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* API section (was TabsContent value="api") */}
          {activeSection === 'api' && (
            <>
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <Key className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        API Keys
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Manage your API keys for programmatic access</CardDescription>
                    </div>
                    <Button onClick={() => setShowNewKeyDialog(true)} size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" />
                      New Key
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {apiKeys.map((apiKey) => (
                      <div key={apiKey.id} className="p-4 sm:p-5 hover:bg-gray-50/50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">{apiKey.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">Created {new Date(apiKey.createdAt).toLocaleDateString()} • Last used {apiKey.lastUsed}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleCopyApiKey(apiKey.key)}>
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteApiKey(apiKey.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-xs sm:text-sm overflow-x-auto">
                          <code className="flex-1 truncate">{showApiKey[apiKey.id] ? apiKey.key : '••••••••••••••••••••'}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-gray-300 hover:text-white hover:bg-gray-800 flex-shrink-0"
                            onClick={() => setShowApiKey({ ...showApiKey, [apiKey.id]: !showApiKey[apiKey.id] })}
                          >
                            {showApiKey[apiKey.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b bg-gradient-to-r from-green-50 to-blue-50 p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    Quick Start Guide
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Send data from your IoT devices to Thebaycity</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                  <Tabs defaultValue="curl" className="space-y-4">
                    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                      <TabsList className="bg-gray-100 inline-flex w-auto min-w-full sm:w-full">
                        <TabsTrigger value="curl" className="text-xs sm:text-sm whitespace-nowrap">cURL</TabsTrigger>
                        <TabsTrigger value="python" className="text-xs sm:text-sm whitespace-nowrap">Python</TabsTrigger>
                        <TabsTrigger value="javascript" className="text-xs sm:text-sm whitespace-nowrap">JavaScript</TabsTrigger>
                        <TabsTrigger value="arduino" className="text-xs sm:text-sm whitespace-nowrap">Arduino</TabsTrigger>
                      </TabsList>
                    </div>

                    {Object.entries(codeExamples).map(([lang, code]) => (
                      <TabsContent key={lang} value={lang} className="space-y-3">
                        <div className="relative">
                          <pre className="bg-gray-900 text-gray-100 p-3 sm:p-4 rounded-lg overflow-x-auto text-xs sm:text-sm">
                            <code>{code}</code>
                          </pre>
                          <Button
                            variant="outline"
                            size="sm"
                            className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-gray-800 text-white border-gray-700 hover:bg-gray-700 text-xs"
                            onClick={() => copyToClipboard(code, lang)}
                          >
                            {copiedCode === lang ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                            {copiedCode === lang ? 'Copied!' : 'Copy'}
                          </Button>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50 p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Webhook className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    Webhook Configuration
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Receive real-time notifications when events occur</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4 sm:pt-6 p-4 sm:p-6">
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url" className="text-sm font-semibold">Webhook URL</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        id="webhook-url"
                        placeholder="https://your-server.com/webhook"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        className="h-10 sm:h-11"
                      />
                      <Button onClick={() => toast.success('Webhook URL saved')} className="bg-gradient-to-r from-purple-600 to-pink-600 whitespace-nowrap w-full sm:w-auto">
                        <Send className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">Events: device.online, device.offline, data.received, alert.triggered</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Billing / Plan section (was TabsContent value="billing") */}
          {activeSection === 'billing' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 shadow-sm">
                <p className="text-xs sm:text-sm text-blue-900">
                  <strong>💡 Per-Workspace Pricing:</strong> This subscription applies to <strong>this workspace only</strong>. Your account is free, and you can create unlimited workspaces. Each workspace can have its own plan.
                </p>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Plans & Pricing</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {plans.map((plan) => {
                    const isCurrentPlan = (workspace as any)?.plan === plan.id;
                    return (
                      <Card
                        key={plan.id}
                        className={`relative border-0 shadow-xl bg-white/80 backdrop-blur-sm transition-all hover:scale-105 ${
                          isCurrentPlan 
                            ? 'ring-2 ring-green-500 bg-gradient-to-br from-green-50/50 to-blue-50/50' 
                            : plan.popular 
                            ? 'ring-2 ring-blue-500' 
                            : ''
                        }`}
                      >
                        {isCurrentPlan ? (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg text-xs">
                              <Crown className="w-3 h-3 mr-1" />
                              Current Plan
                            </Badge>
                          </div>
                        ) : plan.popular ? (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg text-xs">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Popular
                            </Badge>
                          </div>
                        ) : null}

                        <CardHeader className="border-b pb-3 sm:pb-4 p-4 sm:p-6">
                          <CardTitle className="text-base sm:text-lg">{plan.name}</CardTitle>
                          <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
                            ${plan.price}<span className="text-sm text-gray-600">/mo</span>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-3 sm:pt-4 p-4 sm:p-6">
                          <div className="space-y-2 mb-4 sm:mb-6 min-h-[180px] sm:min-h-[200px]">
                            {plan.features.map((feature, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm">
                                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                <span className="text-gray-700">{feature}</span>
                              </div>
                            ))}
                          </div>
                          {canUpgrade(plan.id) && (
                            <Button onClick={() => handleUpgrade(plan.id)} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md text-xs sm:text-sm h-9 sm:h-10">
                              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                              Upgrade
                            </Button>
                          )}
                          {canDowngrade(plan.id) && (
                            <Button variant="outline" onClick={() => handleDowngrade(plan.id)} className="w-full hover:bg-gray-50 text-xs sm:text-sm h-9 sm:h-10">
                              Downgrade
                            </Button>
                          )}
                          {isCurrentPlan && (
                            <Button disabled className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white opacity-70 text-xs sm:text-sm h-9 sm:h-10">
                              <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                              Active Plan
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50 p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                    Billing History
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-gray-50/50 transition-colors">
                        <div>
                          <div className="font-semibold text-gray-900 text-sm sm:text-base">{invoice.period}</div>
                          <div className="text-xs sm:text-sm text-gray-600">{new Date(invoice.date).toLocaleDateString()}</div>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="text-left sm:text-right">
                            <div className="font-semibold text-gray-900 text-sm sm:text-base">${invoice.amount.toFixed(2)}</div>
                            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                              {invoice.status}
                            </Badge>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Advanced section (was TabsContent value="advanced") */}
          {activeSection === 'advanced' && (
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm border-red-200">
              <CardHeader className="border-b bg-gradient-to-r from-red-50 to-orange-50 p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-red-700 text-lg sm:text-xl">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Irreversible and destructive actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 p-4 sm:p-6">
                <div className="p-3 sm:p-4 border-2 border-red-200 rounded-lg bg-red-50/50">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Delete Workspace</h4>
                  <p className="text-xs sm:text-sm text-gray-600 mb-4">
                    Once you delete a workspace, there is no going back. All devices, data, and settings will be permanently removed.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Workspace
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>Send an invitation to join this workspace</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input id="invite-email" type="email" placeholder="colleague@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select defaultValue="member">
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowInviteDialog(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleInviteMember} className="bg-gradient-to-r from-blue-600 to-purple-600 w-full sm:w-auto">
              <Send className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>Generate a new API key for programmatic access</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name</Label>
              <Input id="key-name" placeholder="Production Server" />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowNewKeyDialog(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleCreateApiKey} className="bg-gradient-to-r from-blue-600 to-purple-600 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Create Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-700">Delete Workspace</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the workspace and all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">
                Type <code className="bg-gray-100 px-2 py-1 rounded text-sm">{workspace.slug}</code> to confirm
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Enter workspace slug"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteWorkspace}
              disabled={deleteConfirmation !== workspace.slug}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upgrade Plan</DialogTitle>
            <DialogDescription>Confirm your plan upgrade</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              You&apos;re about to upgrade to the <strong>{selectedPlan}</strong> plan. Changes will take effect immediately and you&apos;ll be charged a prorated amount for the remainder of this billing period.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={confirmUpgrade} className="bg-gradient-to-r from-blue-600 to-purple-600 w-full sm:w-auto">
              Confirm Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Downgrade Plan</DialogTitle>
            <DialogDescription>Confirm your plan downgrade</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              You&apos;re about to downgrade to the <strong>{selectedPlan}</strong> plan. Changes will take effect at the end of your current billing period.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowDowngradeDialog(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={confirmDowngrade} className="w-full sm:w-auto">Confirm Downgrade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
