"use client";
import { useState } from "react";
import { PublicPageHeader } from "@/components/PublicPageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Code, Server, Wifi, Key, FileText, Zap, Cpu, Copy, Check, ChevronDown, ChevronRight, Database, Shield, Clock, Users, Settings, Activity } from "lucide-react";

const API_BASE_URL = "https://api.thebaycity.dev";

interface EndpointProps {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
  auth?: string;
  body?: string;
  response?: string;
  headers?: string;
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-blue-600",
    POST: "bg-green-600",
    PUT: "bg-amber-600",
    PATCH: "bg-orange-600",
    DELETE: "bg-red-600",
  };
  return <Badge className={`${colors[method] || "bg-gray-600"} text-white font-mono text-xs`}>{method}</Badge>;
}

function Endpoint({ method, path, description, auth, body, response, headers }: EndpointProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyPath = () => {
    navigator.clipboard.writeText(`${API_BASE_URL}${path}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
          <MethodBadge method={method} />
          <code className="text-sm font-mono flex-1">{path}</code>
          <button
            onClick={(e) => { e.stopPropagation(); copyPath(); }}
            className="p-1 hover:bg-gray-200 rounded"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2 ml-7">{description}</p>
      </div>
      {expanded && (
        <div className="p-4 border-t bg-white space-y-4">
          {auth && (
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase mb-1">Authentication</h5>
              <p className="text-sm text-gray-700">{auth}</p>
            </div>
          )}
          {headers && (
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase mb-1">Headers</h5>
              <pre className="text-xs bg-gray-900 text-gray-300 p-3 rounded overflow-x-auto">{headers}</pre>
            </div>
          )}
          {body && (
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase mb-1">Request Body</h5>
              <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">{body}</pre>
            </div>
          )}
          {response && (
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase mb-1">Response</h5>
              <pre className="text-xs bg-gray-900 text-blue-400 p-3 rounded overflow-x-auto">{response}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
      </button>
      <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm text-green-400">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function EndpointSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Icon className="w-5 h-5 text-blue-600" />
        {title}
      </h3>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

export function DeveloperPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <PublicPageHeader />

      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-green-100 text-green-700">Developer Documentation</Badge>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            API Documentation
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Integrate your IoT devices with Thebaycity using our REST API and WebSocket connections.
            Full support for ESP8266, ESP32, Arduino, and any HTTP-capable device.
          </p>
        </div>

        {/* Quick Start Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-12">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
                <Server className="w-5 h-5 text-blue-600" />
              </div>
              <CardTitle className="text-base">REST API</CardTitle>
              <CardDescription className="text-sm">HTTP endpoints for data ingestion</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-2">
                <Wifi className="w-5 h-5 text-green-600" />
              </div>
              <CardTitle className="text-base">WebSocket</CardTitle>
              <CardDescription className="text-sm">Real-time bidirectional data</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-2">
                <Key className="w-5 h-5 text-purple-600" />
              </div>
              <CardTitle className="text-base">API Keys</CardTitle>
              <CardDescription className="text-sm">Secure authentication</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center mb-2">
                <Cpu className="w-5 h-5 text-orange-600" />
              </div>
              <CardTitle className="text-base">ESP8266</CardTitle>
              <CardDescription className="text-sm">Ready-to-use Arduino code</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Main Documentation Tabs */}
        <Tabs defaultValue="quickstart" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 h-auto">
            <TabsTrigger value="quickstart" className="text-xs sm:text-sm py-2">Quick Start</TabsTrigger>
            <TabsTrigger value="auth" className="text-xs sm:text-sm py-2">Authentication</TabsTrigger>
            <TabsTrigger value="devices" className="text-xs sm:text-sm py-2">Devices</TabsTrigger>
            <TabsTrigger value="data" className="text-xs sm:text-sm py-2">Data & Analytics</TabsTrigger>
            <TabsTrigger value="websocket" className="text-xs sm:text-sm py-2">WebSocket</TabsTrigger>
            <TabsTrigger value="esp8266" className="text-xs sm:text-sm py-2">ESP8266</TabsTrigger>
          </TabsList>

          {/* Quick Start Tab */}
          <TabsContent value="quickstart">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Quick Start Guide
                </CardTitle>
                <CardDescription>Get your first device sending data in 5 minutes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Step 1 */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center">1</span>
                    Get Your API Key
                  </h4>
                  <p className="text-sm text-gray-600 ml-8">
                    Navigate to your workspace settings and create a Device API Key or Workspace API Key.
                  </p>
                  <div className="ml-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <strong>API Key Types:</strong><br />
                      <code className="bg-amber-100 px-1 rounded">wsk_</code> - Workspace key (full access to all devices)<br />
                      <code className="bg-amber-100 px-1 rounded">dsk_</code> - Device key (access to single device only)
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center">2</span>
                    Create a Device
                  </h4>
                  <p className="text-sm text-gray-600 ml-8">
                    Create a device in your workspace dashboard or via API.
                  </p>
                  <div className="ml-8">
                    <CodeBlock code={`curl -X POST ${API_BASE_URL}/devices \\
  -H "Authorization: Bearer wsk_your_api_key" \\
  -H "x-workspace-alias: your-workspace" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Temperature Sensor",
    "type": "sensor",
    "fieldMappings": [
      {"sourceField": "temperature", "displayLabel": "Temperature", "dataType": "number", "unit": "°C", "min": -40, "max": 85},
      {"sourceField": "humidity", "displayLabel": "Humidity", "dataType": "number", "unit": "%", "min": 0, "max": 100}
    ]
  }'`} />
                  </div>
                </div>

                {/* Step 3 */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center">3</span>
                    Send Data
                  </h4>
                  <p className="text-sm text-gray-600 ml-8">
                    Push sensor data to the ingest endpoint.
                  </p>
                  <div className="ml-8">
                    <CodeBlock code={`curl -X POST ${API_BASE_URL}/devices/YOUR_DEVICE_ID/ingest \\
  -H "Authorization: Bearer dsk_your_device_key" \\
  -H "Content-Type: application/json" \\
  -d '{"temperature": 25.5, "humidity": 65}'`} />
                  </div>
                </div>

                {/* Step 4 */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center">4</span>
                    View Analytics
                  </h4>
                  <p className="text-sm text-gray-600 ml-8">
                    Query historical data and analytics from your device.
                  </p>
                  <div className="ml-8">
                    <CodeBlock code={`curl "${API_BASE_URL}/devices/YOUR_DEVICE_ID/analytics?from=2024-01-01&to=2024-01-31" \\
  -H "Authorization: Bearer wsk_your_api_key" \\
  -H "x-workspace-alias: your-workspace"`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Authentication Tab */}
          <TabsContent value="auth">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Authentication
                </CardTitle>
                <CardDescription>Secure your API requests with API keys</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">Workspace API Key</h4>
                    <code className="text-xs bg-blue-100 px-2 py-1 rounded">wsk_...</code>
                    <p className="text-sm text-blue-800 mt-2">Full access to all devices in the workspace. Use for server-side applications.</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-2">Device API Key</h4>
                    <code className="text-xs bg-green-100 px-2 py-1 rounded">dsk_...</code>
                    <p className="text-sm text-green-800 mt-2">Access to a single device only. Use for embedded devices like ESP8266.</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-900 mb-2">User JWT</h4>
                    <code className="text-xs bg-purple-100 px-2 py-1 rounded">eyJ...</code>
                    <p className="text-sm text-purple-800 mt-2">For user-authenticated requests. Requires x-workspace-alias header.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Using API Keys</h4>
                  <p className="text-sm text-gray-600">Include your API key in the Authorization header:</p>
                  <CodeBlock code={`Authorization: Bearer wsk_your_api_key_here`} />

                  <p className="text-sm text-gray-600">Or use the X-API-Key header:</p>
                  <CodeBlock code={`X-API-Key: wsk_your_api_key_here`} />
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Workspace Header</h4>
                  <p className="text-sm text-gray-600">For user JWT authentication, include the workspace alias header:</p>
                  <CodeBlock code={`x-workspace-alias: your-workspace-slug`} />
                </div>

                <EndpointSection title="API Key Management" icon={Key}>
                  <Endpoint
                    method="POST"
                    path="/workspace/api-keys"
                    description="Create a new workspace API key"
                    auth="User JWT with manage access"
                    headers={`Authorization: Bearer eyJ...
x-workspace-alias: your-workspace`}
                    body={`{
  "name": "Production Server Key"
}`}
                    response={`{
  "apiKeyId": "uuid",
  "key": "wsk_abc123...",  // Only shown once!
  "keyPrefix": "wsk_abc12345",
  "message": "Store this key securely."
}`}
                  />
                  <Endpoint
                    method="GET"
                    path="/workspace/api-keys"
                    description="List all workspace API keys"
                    auth="User JWT with manage access"
                    response={`{
  "keys": [
    {
      "apiKeyId": "uuid",
      "name": "Production Server Key",
      "keyPrefix": "wsk_abc12345",
      "revokedAt": null,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}`}
                  />
                  <Endpoint
                    method="DELETE"
                    path="/workspace/api-keys/:apiKeyId"
                    description="Revoke an API key"
                    auth="User JWT with manage access"
                    response={`{ "ok": true }`}
                  />
                  <Endpoint
                    method="POST"
                    path="/devices/:deviceId/api-key"
                    description="Create or regenerate a device API key (one key per device)"
                    auth="User JWT with manage access"
                    body={`{
  "name": "ESP8266 Sensor Key"
}`}
                    response={`{
  "deviceApiKeyId": "uuid",
  "deviceId": "device-uuid",
  "key": "dsk_xyz789...",  // Only shown once!
  "keyPrefix": "dsk_xyz78901",
  "message": "Store this key securely."
}`}
                  />
                </EndpointSection>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5" />
                  Device Management
                </CardTitle>
                <CardDescription>Create, update, and manage your IoT devices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <EndpointSection title="Device CRUD" icon={Database}>
                  <Endpoint
                    method="POST"
                    path="/devices"
                    description="Create a new device in the workspace"
                    auth="Workspace API Key or User JWT"
                    body={`{
  "name": "Living Room Sensor",
  "type": "sensor",
  "description": "Temperature and humidity sensor",
  "manufacturer": "ESP8266",
  "model": "NodeMCU",
  "location": "Living Room",
  "tags": ["indoor", "climate"],
  "fieldMappings": [
    {
      "sourceField": "temperature",
      "displayLabel": "Temperature",
      "dataType": "number",
      "unit": "°C",
      "min": -40,
      "max": 85,
      "precision": 1,
      "icon": "thermometer",
      "color": "#ef4444"
    },
    {
      "sourceField": "humidity",
      "displayLabel": "Humidity",
      "dataType": "number",
      "unit": "%",
      "min": 0,
      "max": 100
    }
  ]
}`}
                    response={`{
  "deviceId": "uuid",
  "workspaceId": "workspace-uuid",
  "name": "Living Room Sensor",
  "type": "sensor",
  "status": "offline",
  "createdAt": "2024-01-01T00:00:00Z"
}`}
                  />
                  <Endpoint
                    method="GET"
                    path="/devices"
                    description="List all devices in the workspace"
                    auth="Workspace API Key or User JWT"
                    response={`{
  "devices": [
    {
      "deviceId": "uuid",
      "name": "Living Room Sensor",
      "type": "sensor",
      "status": "online",
      "lastSeenAt": "2024-01-01T12:00:00Z"
    }
  ]
}`}
                  />
                  <Endpoint
                    method="GET"
                    path="/devices/:deviceId"
                    description="Get a specific device (device tokens can only access their own device)"
                    auth="Any API Key or User JWT"
                    response={`{
  "deviceId": "uuid",
  "workspaceId": "workspace-uuid",
  "name": "Living Room Sensor",
  "type": "sensor",
  "status": "online",
  "description": "Temperature and humidity sensor",
  "manufacturer": "ESP8266",
  "model": "NodeMCU",
  "location": "Living Room",
  "tags": ["indoor", "climate"],
  "fieldMappings": [...],
  "lastSeenAt": "2024-01-01T12:00:00Z",
  "lastData": {
    "temperature": 25.5,
    "humidity": 65
  }
}`}
                  />
                  <Endpoint
                    method="PUT"
                    path="/devices/:deviceId"
                    description="Update device properties"
                    auth="Workspace API Key or User JWT with manage access"
                    body={`{
  "name": "Updated Sensor Name",
  "location": "Bedroom",
  "fieldMappings": [...]
}`}
                    response={`{ "ok": true }`}
                  />
                </EndpointSection>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Field Mappings</h4>
                  <p className="text-sm text-blue-800 mb-3">
                    Field mappings define the schema for your device data. They enable validation, display formatting, and analytics.
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-blue-900">
                        <th className="pb-2">Property</th>
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Description</th>
                      </tr>
                    </thead>
                    <tbody className="text-blue-800">
                      <tr><td className="py-1"><code>sourceField</code></td><td>string</td><td>Key in incoming JSON data</td></tr>
                      <tr><td className="py-1"><code>displayLabel</code></td><td>string</td><td>Human-readable label</td></tr>
                      <tr><td className="py-1"><code>dataType</code></td><td>string</td><td>number, string, boolean, json</td></tr>
                      <tr><td className="py-1"><code>unit</code></td><td>string?</td><td>Unit of measurement</td></tr>
                      <tr><td className="py-1"><code>min</code></td><td>number?</td><td>Minimum valid value</td></tr>
                      <tr><td className="py-1"><code>max</code></td><td>number?</td><td>Maximum valid value</td></tr>
                      <tr><td className="py-1"><code>precision</code></td><td>number?</td><td>Decimal places for display</td></tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data & Analytics Tab */}
          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Data Ingestion & Analytics
                </CardTitle>
                <CardDescription>Push data from devices and query historical analytics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <EndpointSection title="Data Ingestion" icon={Database}>
                  <Endpoint
                    method="POST"
                    path="/devices/:deviceId/ingest"
                    description="Push sensor data to a device. Data is validated against field mappings if configured."
                    auth="Device API Key (dsk_) or Workspace API Key (wsk_)"
                    body={`{
  "temperature": 25.5,
  "humidity": 65,
  "pressure": 1013.25
}`}
                    response={`{ "ok": true }`}
                  />
                </EndpointSection>

                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="font-semibold text-amber-900 mb-2">Data Validation</h4>
                  <p className="text-sm text-amber-800">
                    If your device has field mappings configured, incoming data is validated against them:
                  </p>
                  <ul className="text-sm text-amber-800 mt-2 list-disc list-inside">
                    <li><strong>Type validation:</strong> Numbers must be numeric, booleans must be true/false</li>
                    <li><strong>Range validation:</strong> Numbers are checked against min/max bounds</li>
                    <li><strong>Passthrough:</strong> Unmapped fields are accepted without validation</li>
                  </ul>
                  <p className="text-sm text-amber-800 mt-2">
                    Invalid data returns a 400 error with detailed validation messages.
                  </p>
                </div>

                <EndpointSection title="Analytics" icon={Activity}>
                  <Endpoint
                    method="GET"
                    path="/devices/:deviceId/analytics"
                    description="Query historical data with optional date range filtering"
                    auth="Workspace API Key or User JWT"
                    headers={`Authorization: Bearer wsk_...
x-workspace-alias: your-workspace`}
                    response={`{
  "deviceId": "uuid",
  "from": "2024-01-01T00:00:00Z",
  "to": "2024-01-31T23:59:59Z",
  "points": [
    {
      "at": "2024-01-01T12:00:00Z",
      "status": "online",
      "fields": {
        "temperature": 25.5,
        "humidity": 65
      }
    }
  ]
}`}
                  />
                  <Endpoint
                    method="POST"
                    path="/devices/:deviceId/seed"
                    description="Generate sample data points for testing (development only)"
                    auth="Workspace API Key or User JWT with manage access"
                    body={`{
  "count": 100,
  "from": "2024-01-01",
  "to": "2024-01-31"
}`}
                    response={`{ "ok": true, "count": 100 }`}
                  />
                </EndpointSection>

                <EndpointSection title="Rate Limits" icon={Clock}>
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left">
                          <th className="pb-2">Plan</th>
                          <th className="pb-2">Rate Limit</th>
                          <th className="pb-2">Data Retention</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-600">
                        <tr><td className="py-1">Starter</td><td>60 req/min</td><td>7 days</td></tr>
                        <tr><td className="py-1">Professional</td><td>300 req/min</td><td>30 days</td></tr>
                        <tr><td className="py-1">Business</td><td>1000 req/min</td><td>90 days</td></tr>
                        <tr><td className="py-1">Enterprise</td><td>Unlimited</td><td>Unlimited</td></tr>
                      </tbody>
                    </table>
                  </div>
                </EndpointSection>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WebSocket Tab */}
          <TabsContent value="websocket">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="w-5 h-5" />
                  WebSocket API
                </CardTitle>
                <CardDescription>Real-time bidirectional communication for live device updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">Device WebSocket Endpoint</h4>
                  <code className="text-sm font-mono bg-white px-3 py-2 rounded block">
                    wss://api.thebaycity.dev/ws/devices/:deviceId?token=YOUR_API_KEY
                  </code>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Connection Example (JavaScript)</h4>
                  <CodeBlock language="javascript" code={`const deviceId = 'your-device-id';
const apiKey = 'dsk_your_device_key';

const ws = new WebSocket(
  \`wss://api.thebaycity.dev/ws/devices/\${deviceId}?token=\${apiKey}\`
);

ws.onopen = () => {
  console.log('Connected to device WebSocket');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'ping':
      // Respond to heartbeat
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
    case 'ingest':
      // Data was pushed to this device
      console.log('New data:', data.fields);
      break;
    case 'control':
      // Control command received
      console.log('Control:', data.field, '=', data.value);
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected');
};`} />
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Message Types</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <h5 className="font-medium mb-2">Incoming: ping</h5>
                      <p className="text-sm text-gray-600 mb-2">Server heartbeat (every 30s)</p>
                      <pre className="text-xs bg-gray-900 text-green-400 p-2 rounded">{`{ "type": "ping", "at": "..." }`}</pre>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <h5 className="font-medium mb-2">Outgoing: pong</h5>
                      <p className="text-sm text-gray-600 mb-2">Response to keep connection alive</p>
                      <pre className="text-xs bg-gray-900 text-blue-400 p-2 rounded">{`{ "type": "pong" }`}</pre>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <h5 className="font-medium mb-2">Incoming: ingest</h5>
                      <p className="text-sm text-gray-600 mb-2">New data pushed via REST API</p>
                      <pre className="text-xs bg-gray-900 text-green-400 p-2 rounded">{`{
  "type": "ingest",
  "at": "2024-01-01T12:00:00Z",
  "fields": { "temp": 25.5 },
  "raw": { ... }
}`}</pre>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <h5 className="font-medium mb-2">Incoming: control</h5>
                      <p className="text-sm text-gray-600 mb-2">Control command from automation</p>
                      <pre className="text-xs bg-gray-900 text-green-400 p-2 rounded">{`{
  "type": "control",
  "at": "...",
  "field": "relay",
  "value": true,
  "context": { ... }
}`}</pre>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ESP8266 Tab */}
          <TabsContent value="esp8266">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5" />
                  ESP8266 / ESP32 Integration
                </CardTitle>
                <CardDescription>Ready-to-use Arduino code for ESP8266 and ESP32 boards</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-2">Requirements</h4>
                  <ul className="text-sm text-orange-800 list-disc list-inside">
                    <li>Arduino IDE with ESP8266 or ESP32 board support</li>
                    <li>ArduinoJson library (v6 or later)</li>
                    <li>WiFi connection</li>
                    <li>Device API Key from your dashboard</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Complete ESP8266 Example</h4>
                  <p className="text-sm text-gray-600">
                    This example reads temperature and humidity from a DHT22 sensor and sends data every 30 seconds.
                  </p>
                  <CodeBlock language="cpp" code={`#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <DHT.h>

// WiFi Configuration
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Thebaycity API Configuration
const char* API_HOST = "api.thebaycity.dev";
const char* DEVICE_ID = "YOUR_DEVICE_ID";
const char* API_KEY = "dsk_YOUR_DEVICE_API_KEY";

// DHT Sensor Configuration
#define DHT_PIN D4
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

// Timing
const unsigned long SEND_INTERVAL = 30000; // 30 seconds
unsigned long lastSendTime = 0;

WiFiClientSecure client;

void setup() {
  Serial.begin(115200);
  delay(100);

  // Initialize DHT sensor
  dht.begin();

  // Connect to WiFi
  Serial.println();
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  // For HTTPS - skip certificate verification (not recommended for production)
  client.setInsecure();
}

void loop() {
  unsigned long currentTime = millis();

  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = currentTime;
    sendSensorData();
  }

  delay(100);
}

void sendSensorData() {
  // Read sensor data
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  // Check if readings are valid
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }

  Serial.printf("Temperature: %.1f°C, Humidity: %.1f%%\\n", temperature, humidity);

  // Build JSON payload
  StaticJsonDocument<200> doc;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // Send to API
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    String url = "https://" + String(API_HOST) + "/devices/" + String(DEVICE_ID) + "/ingest";

    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + String(API_KEY));

    int httpCode = http.POST(jsonPayload);

    if (httpCode > 0) {
      String response = http.getString();
      Serial.printf("HTTP %d: %s\\n", httpCode, response.c_str());
    } else {
      Serial.printf("HTTP error: %s\\n", http.errorToString(httpCode).c_str());
    }

    http.end();
  } else {
    Serial.println("WiFi not connected!");
  }
}`} />
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">ESP8266 with WebSocket (Real-time)</h4>
                  <p className="text-sm text-gray-600">
                    For real-time bidirectional communication, use the WebSocket library.
                  </p>
                  <CodeBlock language="cpp" code={`#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* WS_HOST = "api.thebaycity.dev";
const char* DEVICE_ID = "YOUR_DEVICE_ID";
const char* API_KEY = "dsk_YOUR_DEVICE_API_KEY";

WebSocketsClient webSocket;
unsigned long lastPing = 0;

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("WebSocket disconnected");
      break;

    case WStype_CONNECTED:
      Serial.println("WebSocket connected");
      break;

    case WStype_TEXT: {
      Serial.printf("Received: %s\\n", payload);

      StaticJsonDocument<512> doc;
      DeserializationError error = deserializeJson(doc, payload);

      if (!error) {
        const char* msgType = doc["type"];

        if (strcmp(msgType, "ping") == 0) {
          // Respond to heartbeat
          webSocket.sendTXT("{\\"type\\":\\"pong\\"}");
        }
        else if (strcmp(msgType, "control") == 0) {
          // Handle control command
          const char* field = doc["field"];
          JsonVariant value = doc["value"];

          Serial.printf("Control: %s = ", field);
          if (value.is<bool>()) {
            Serial.println(value.as<bool>() ? "true" : "false");
            // Apply control action here (e.g., toggle relay)
          }
        }
      }
      break;
    }
  }
}

void setup() {
  Serial.begin(115200);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi connected");

  // Connect to WebSocket with token in path
  String path = "/ws/devices/" + String(DEVICE_ID) + "?token=" + String(API_KEY);
  webSocket.beginSSL(WS_HOST, 443, path);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void loop() {
  webSocket.loop();

  // Send sensor data periodically
  if (millis() - lastPing > 30000) {
    lastPing = millis();

    StaticJsonDocument<200> doc;
    doc["temperature"] = 25.5;  // Replace with actual sensor reading
    doc["humidity"] = 65;

    String json;
    serializeJson(doc, json);
    webSocket.sendTXT(json);
  }
}`} />
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Minimal HTTP POST Example</h4>
                  <p className="text-sm text-gray-600">
                    Simplest possible example for sending data.
                  </p>
                  <CodeBlock language="cpp" code={`#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>

WiFiClientSecure client;

void sendData(float temp, float humidity) {
  client.setInsecure();

  HTTPClient http;
  http.begin(client, "https://api.thebaycity.dev/devices/YOUR_DEVICE_ID/ingest");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer dsk_YOUR_API_KEY");

  String payload = "{\\"temperature\\":" + String(temp) +
                   ",\\"humidity\\":" + String(humidity) + "}";

  int code = http.POST(payload);
  Serial.printf("Response: %d\\n", code);

  http.end();
}`} />
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Tips for Production</h4>
                  <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                    <li>Use proper SSL certificate verification instead of <code>setInsecure()</code></li>
                    <li>Implement retry logic with exponential backoff</li>
                    <li>Store credentials in EEPROM or SPIFFS, not in code</li>
                    <li>Use deep sleep between readings to save power</li>
                    <li>Add watchdog timer to recover from hangs</li>
                    <li>Buffer data locally if network is unavailable</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Additional API Sections */}
        <div className="mt-12 space-y-8">
          <h2 className="text-2xl font-bold">Additional API Endpoints</h2>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Automations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Endpoint
                method="POST"
                path="/automations"
                description="Create a new automation rule"
                auth="User JWT with manage access"
                body={`{
  "name": "High Temperature Alert",
  "triggerType": "device_data",
  "triggerConfig": {
    "type": "device_data",
    "deviceId": "device-uuid",
    "logic": "AND",
    "conditions": [
      { "field": "temperature", "operator": "greater_than", "value": 30 }
    ]
  },
  "actions": [
    {
      "type": "send_webhook",
      "url": "https://your-webhook.com/alert",
      "method": "POST",
      "bodyTemplate": { "message": "Temperature alert!" }
    }
  ]
}`}
              />
              <Endpoint method="GET" path="/automations" description="List all automations in the workspace" auth="Workspace API Key or User JWT" />
              <Endpoint method="GET" path="/automations/:automationId" description="Get a specific automation" auth="Workspace API Key or User JWT" />
              <Endpoint method="PUT" path="/automations/:automationId" description="Update an automation" auth="User JWT with manage access" />
              <Endpoint method="DELETE" path="/automations/:automationId" description="Delete an automation" auth="User JWT with manage access" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Users & Workspaces
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Endpoint method="POST" path="/users" description="Create a new user account" auth="None (public registration)" />
              <Endpoint method="GET" path="/users/me" description="Get current authenticated user profile" auth="User JWT" />
              <Endpoint method="POST" path="/login" description="Authenticate and get JWT token" auth="None" body={`{ "email": "user@example.com", "password": "..." }`} />
              <Endpoint method="POST" path="/workspaces" description="Create a new workspace" auth="User JWT" />
              <Endpoint method="GET" path="/users/:userId/workspaces" description="List workspaces for a user" auth="User JWT" />
              <Endpoint method="GET" path="/workspaces/by-alias/:alias" description="Get workspace by alias/slug" auth="User JWT" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Workspace Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Endpoint method="GET" path="/members" description="List workspace members" auth="User JWT" />
              <Endpoint method="POST" path="/members" description="Add a workspace member" auth="User JWT with manage access" />
              <Endpoint method="PUT" path="/members/:userId" description="Update member role and permissions" auth="User JWT with manage access" />
              <Endpoint method="DELETE" path="/members/:userId" description="Remove a member" auth="User JWT with manage access" />
              <Endpoint method="GET" path="/plan" description="Get current workspace plan" auth="User JWT" />
              <Endpoint method="PUT" path="/plan" description="Update workspace plan" auth="User JWT with manage access" />
              <Endpoint method="GET" path="/billing" description="Get billing history" auth="User JWT with manage access" />
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-gray-500 text-sm">
          <p>Need help? Contact us at <a href="mailto:support@thebaycity.dev" className="text-blue-600 hover:underline">support@thebaycity.dev</a></p>
        </div>
      </div>
    </div>
  );
}
