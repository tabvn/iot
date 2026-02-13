"use client";
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Key, Plus, Copy, Trash2, Check, Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  apiCreateWorkspaceApiKey,
  apiRevokeWorkspaceApiKey,
  type WorkspaceApiKey,
} from '@/lib/api';
import { mutate } from 'swr';

const apiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
});

type ApiKeyForm = z.infer<typeof apiKeySchema>;

interface ApiIntegrationSettingsProps {
  apiKeys: WorkspaceApiKey[];
  token: string | null;
  workspaceSlug: string;
}

interface DialogStates {
  showNewKey: boolean;
  newKeyResult: { key: string; name: string } | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

const codeExamples = (workspaceSlug: string) => ({
  curl: `curl -X POST ${API_BASE_URL}/devices/YOUR_DEVICE_ID/ingest \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "x-workspace-alias: ${workspaceSlug}" \\
  -H "Content-Type: application/json" \\
  -d '{"temperature": 22.5, "humidity": 65}'`,
  python: `import requests

url = "${API_BASE_URL}/devices/YOUR_DEVICE_ID/ingest"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "x-workspace-alias": "${workspaceSlug}",
    "Content-Type": "application/json"
}
data = {"temperature": 22.5, "humidity": 65}

response = requests.post(url, json=data, headers=headers)
print(response.json())`,
  javascript: `const response = await fetch('${API_BASE_URL}/devices/YOUR_DEVICE_ID/ingest', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'x-workspace-alias': '${workspaceSlug}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    temperature: 22.5,
    humidity: 65
  })
});

const data = await response.json();
console.log(data);`,
  arduino: `#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>

WiFiClientSecure client;

void sendData(float temp, float humidity) {
  client.setInsecure();
  HTTPClient http;

  http.begin(client, "${API_BASE_URL}/devices/YOUR_DEVICE_ID/ingest");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer YOUR_DEVICE_API_KEY");

  String payload = "{\\"temperature\\":" + String(temp) +
                   ",\\"humidity\\":" + String(humidity) + "}";

  int code = http.POST(payload);
  Serial.printf("Response: %d\\n", code);
  http.end();
}`,
});

export function ApiIntegrationSettings({
  apiKeys,
  token,
  workspaceSlug,
}: ApiIntegrationSettingsProps) {
  const [dialogs, setDialogs] = React.useState<DialogStates>({
    showNewKey: false,
    newKeyResult: null,
  });
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

  const form = useForm<ApiKeyForm>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: { name: '' },
  });

  const handleCreateApiKey = async (data: ApiKeyForm) => {
    if (!token) return;

    try {
      const result = await apiCreateWorkspaceApiKey(token, workspaceSlug, {
        name: data.name,
      });
      setDialogs((prev) => ({ ...prev, showNewKey: false }));
      form.reset();
      setDialogs((prev) => ({
        ...prev,
        newKeyResult: { key: result.key, name: data.name },
      }));
      mutate(`apiKeys-${workspaceSlug}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create API key');
    }
  };

  const handleRevokeApiKey = async (apiKeyId: string) => {
    if (!token) return;

    try {
      await apiRevokeWorkspaceApiKey(token, workspaceSlug, apiKeyId);
      toast.success('API key revoked');
      mutate(`apiKeys-${workspaceSlug}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke API key');
    }
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

  const examples = codeExamples(workspaceSlug);

  return (
    <>
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Key className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                API Keys
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Manage your API keys for programmatic access
              </CardDescription>
            </div>
            <Button
              onClick={() => setDialogs((prev) => ({ ...prev, showNewKey: true }))}
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-purple-600 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Key
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {apiKeys.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Key className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No API keys yet</p>
              <p className="text-sm">Create an API key to start integrating</p>
            </div>
          ) : (
            <div className="divide-y">
              {apiKeys.map((apiKey) => (
                <div
                  key={apiKey.apiKeyId}
                  className="p-4 sm:p-5 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {apiKey.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Created {new Date(apiKey.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyApiKey(apiKey.apiKeyId)}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy ID
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRevokeApiKey(apiKey.apiKeyId)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-xs sm:text-sm overflow-x-auto">
                    <code className="flex-1 truncate">{apiKey.keyPrefix}••••••••••••</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white hover:bg-gray-800 flex-shrink-0 h-7 w-7 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText(apiKey.keyPrefix);
                        toast.success('Key prefix copied to clipboard');
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b bg-gradient-to-r from-green-50 to-blue-50 p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            Quick Start Guide
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Send data from your IoT devices to Thebaycity
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
          <Tabs defaultValue="curl" className="space-y-4">
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="bg-gray-100 inline-flex w-auto min-w-full sm:w-full">
                <TabsTrigger value="curl" className="text-xs sm:text-sm whitespace-nowrap">
                  cURL
                </TabsTrigger>
                <TabsTrigger value="python" className="text-xs sm:text-sm whitespace-nowrap">
                  Python
                </TabsTrigger>
                <TabsTrigger
                  value="javascript"
                  className="text-xs sm:text-sm whitespace-nowrap"
                >
                  JavaScript
                </TabsTrigger>
                <TabsTrigger value="arduino" className="text-xs sm:text-sm whitespace-nowrap">
                  Arduino
                </TabsTrigger>
              </TabsList>
            </div>

            {Object.entries(examples).map(([lang, code]) => (
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
                    {copiedCode === lang ? (
                      <Check className="w-3 h-3 mr-1" />
                    ) : (
                      <Copy className="w-3 h-3 mr-1" />
                    )}
                    {copiedCode === lang ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog
        open={dialogs.showNewKey}
        onOpenChange={(open) => setDialogs((prev) => ({ ...prev, showNewKey: open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>Generate a new API key for programmatic access</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(handleCreateApiKey)}
            className="space-y-4 py-4"
          >
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                placeholder="Production Server"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
              )}
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogs((prev) => ({ ...prev, showNewKey: false }))}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-purple-600 w-full sm:w-auto"
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Key
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Key Result Dialog */}
      <Dialog
        open={!!dialogs.newKeyResult}
        onOpenChange={() => setDialogs((prev) => ({ ...prev, newKeyResult: null }))}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <Check className="w-5 h-5" />
              API Key Created
            </DialogTitle>
            <DialogDescription>
              Copy your API key now. You won&apos;t be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-amber-800">
                <strong>Important:</strong> This is the only time your API key will be
                displayed. Store it securely.
              </p>
            </div>
            <Label className="text-sm font-semibold mb-2 block">
              {dialogs.newKeyResult?.name}
            </Label>
            <div className="flex items-center gap-2 bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm">
              <code className="flex-1 break-all">{dialogs.newKeyResult?.key}</code>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:text-white hover:bg-gray-800 flex-shrink-0"
                onClick={() => {
                  if (dialogs.newKeyResult?.key) {
                    navigator.clipboard.writeText(dialogs.newKeyResult.key);
                    toast.success('API key copied!');
                  }
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setDialogs((prev) => ({ ...prev, newKeyResult: null }))}
              className="w-full"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

