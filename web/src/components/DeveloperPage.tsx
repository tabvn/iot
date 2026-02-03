"use client";
import { PublicPageHeader } from "@/components/PublicPageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Server, Wifi, Key, FileText, Zap } from "lucide-react";

export function DeveloperPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <PublicPageHeader />

      <div className="container mx-auto px-4 py-16 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-green-100 text-green-700">Developer Documentation</Badge>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            API Documentation
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Integrate your IoT devices with Thebaycity using our REST API and WebSocket connections.
          </p>
        </div>

        {/* API Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
                <Server className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>REST API</CardTitle>
              <CardDescription>Push and pull data using standard HTTP methods</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-3">
                <Wifi className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle>WebSocket</CardTitle>
              <CardDescription>Real-time bidirectional communication</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
                <Key className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>Secure API key-based authentication</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* API Tabs */}
        <Tabs defaultValue="rest" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rest">REST API</TabsTrigger>
            <TabsTrigger value="websocket">WebSocket</TabsTrigger>
            <TabsTrigger value="auth">Authentication</TabsTrigger>
          </TabsList>

          <TabsContent value="rest">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  REST API Endpoints
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-600">POST</Badge>
                      <code className="text-sm font-mono">/api/v1/devices/:deviceId/data</code>
                    </div>
                    <p className="text-sm text-gray-600">Push sensor data to a device</p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-blue-600">GET</Badge>
                      <code className="text-sm font-mono">/api/v1/devices/:deviceId/data</code>
                    </div>
                    <p className="text-sm text-gray-600">Retrieve device data history</p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-purple-600">PUT</Badge>
                      <code className="text-sm font-mono">/api/v1/devices/:deviceId/control</code>
                    </div>
                    <p className="text-sm text-gray-600">Send control commands to a device</p>
                  </div>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2 text-gray-400 text-xs">
                    <FileText className="w-4 h-4" />
                    Example Request
                  </div>
                  <pre className="text-sm text-green-400 overflow-x-auto">
{`curl -X POST https://api.thebaycity.dev/v1/devices/d1/data \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"temperature": 25.5, "humidity": 65}'`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="websocket">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="w-5 h-5" />
                  WebSocket Connection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Connection URL</h4>
                  <code className="text-sm font-mono bg-white px-3 py-2 rounded block">
                    wss://api.thebaycity.dev/ws?apiKey=YOUR_API_KEY
                  </code>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2 text-gray-400 text-xs">
                    <Code className="w-4 h-4" />
                    JavaScript Example
                  </div>
                  <pre className="text-sm text-green-400 overflow-x-auto">
{`const ws = new WebSocket('wss://api.thebaycity.dev/ws?apiKey=YOUR_API_KEY');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// Send data
ws.send(JSON.stringify({
  type: 'data',
  deviceId: 'd1',
  payload: { temperature: 25.5 }
}));`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auth">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Authentication
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-2">API Key Authentication</h4>
                  <p className="text-sm text-purple-800 mb-4">
                    Include your API key in the Authorization header of each request.
                  </p>
                  <code className="text-sm font-mono bg-white px-3 py-2 rounded block">
                    Authorization: Bearer YOUR_API_KEY
                  </code>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Getting Your API Key</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                    <li>Log in to your dashboard</li>
                    <li>Navigate to your workspace settings</li>
                    <li>Click on &quot;API Keys&quot; tab</li>
                    <li>Generate a new API key</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
