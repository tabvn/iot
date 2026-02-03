"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Trash2, Save, X, Thermometer, Droplet,
  Zap, Activity, AlertCircle, CheckCircle2, Settings, Database,
  Code, Package, Cpu, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { mockWorkspaces } from "@/data/mockData";

type DeviceType = 'Temperature Sensor' | 'Motion Sensor' | 'Camera' | 'Controller' | 'Power Outlet' | 'Environmental Sensor' | 'Smart Switch' | 'Smart Light' | 'Smart Thermostat' | 'Door Lock' | 'Fan';

interface FieldMappingForm {
  id: string;
  fieldKey: string;
  label: string;
  unit?: string;
  type: 'numeric' | 'boolean' | 'string' | 'object';
  chartEnabled: boolean;
  alertEnabled: boolean;
  minValue?: number;
  maxValue?: number;
}

const DEVICE_TYPES: DeviceType[] = [
  'Temperature Sensor',
  'Motion Sensor',
  'Camera',
  'Controller',
  'Power Outlet',
  'Environmental Sensor',
  'Smart Switch',
  'Smart Light',
  'Smart Thermostat',
  'Door Lock',
  'Fan'
];

export function AddDevicePage() {
  const params = useParams();
  const workspace = params?.workspace as string;
  const router = useRouter();
  const workspaceData = mockWorkspaces.find(w => w.slug === workspace || w.id === workspace);

  const [deviceInfo, setDeviceInfo] = useState({
    name: '',
    type: '' as DeviceType | '',
    ipAddress: '',
    location: '',
    description: '',
    manufacturer: '',
    firmware: '',
  });

  const [fieldMappings, setFieldMappings] = useState<FieldMappingForm[]>([]);

  if (!workspaceData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Workspace Not Found</h3>
            <p className="text-sm text-gray-600 mb-4">
              The workspace you&apos;re trying to add a device to doesn&apos;t exist.
            </p>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAddField = () => {
    const newField: FieldMappingForm = {
      id: `field-${Date.now()}`,
      fieldKey: '',
      label: '',
      type: 'numeric',
      chartEnabled: true,
      alertEnabled: false,
    };
    setFieldMappings([...fieldMappings, newField]);
  };

  const handleRemoveField = (id: string) => {
    setFieldMappings(fieldMappings.filter(f => f.id !== id));
  };

  const handleUpdateField = (id: string, updates: Partial<FieldMappingForm>) => {
    setFieldMappings(fieldMappings.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleSaveDevice = () => {
    if (!deviceInfo.name || !deviceInfo.type) {
      toast.error('Please fill in device name and type');
      return;
    }

    // Validate field mappings: require type and fieldKey/label
    const hasInvalidField = fieldMappings.some((field) =>
      !field.fieldKey.trim() || !field.label.trim() || !field.type
    );
    if (hasInvalidField) {
      toast.error('Please complete all field mappings (key, label, and data type).');
      return;
    }

    toast.success('Device created successfully!');
    router.push(`/${workspace}`);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/${workspace}`)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Add New Device</h1>
                <p className="text-sm text-gray-500 mt-0.5">{workspaceData.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/${workspace}`)}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveDevice}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-2 shadow-md"
              >
                <Save className="w-4 h-4" />
                Create Device
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Device Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info Card */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-blue-100">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Cpu className="w-5 h-5 text-blue-600" />
                  Device Information
                </CardTitle>
                <CardDescription>
                  Basic details about your IoT device
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="device-name" className="text-sm font-semibold">
                      Device Name *
                    </Label>
                    <Input
                      id="device-name"
                      placeholder="e.g., Living Room Sensor"
                      value={deviceInfo.name}
                      onChange={(e) => setDeviceInfo({ ...deviceInfo, name: e.target.value })}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="device-type" className="text-sm font-semibold">
                      Device Type *
                    </Label>
                    <Select
                      value={deviceInfo.type}
                      onValueChange={(value) => setDeviceInfo({ ...deviceInfo, type: value as DeviceType })}
                    >
                      <SelectTrigger id="device-type" className="h-11">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEVICE_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ip-address" className="text-sm font-semibold">
                      IP Address
                    </Label>
                    <Input
                      id="ip-address"
                      placeholder="e.g., 192.168.1.100"
                      value={deviceInfo.ipAddress}
                      onChange={(e) => setDeviceInfo({ ...deviceInfo, ipAddress: e.target.value })}
                      className="h-11 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm font-semibold">
                      Location
                    </Label>
                    <Input
                      id="location"
                      placeholder="e.g., Living Room"
                      value={deviceInfo.location}
                      onChange={(e) => setDeviceInfo({ ...deviceInfo, location: e.target.value })}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Optional description of the device..."
                    value={deviceInfo.description}
                    onChange={(e) => setDeviceInfo({ ...deviceInfo, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Field Mappings Card */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-gradient-to-br from-purple-50 to-pink-50 border-b border-purple-100">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="w-5 h-5 text-purple-600" />
                  Data Field Mappings
                </CardTitle>
                <CardDescription>
                  Define how your device data will be parsed and displayed
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {fieldMappings.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <Code className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">No field mappings yet</h4>
                    <p className="text-sm text-gray-600 mb-4 max-w-sm mx-auto">
                      Add field mappings to define how your device data should be parsed and displayed.
                    </p>
                    <Button onClick={handleAddField} variant="outline" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add First Field
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fieldMappings.map((field, index) => (
                      <Card key={field.id} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold text-gray-700">
                                  Field Key
                                </Label>
                                <Input
                                  placeholder="e.g., temperature"
                                  value={field.fieldKey}
                                  onChange={(e) => handleUpdateField(field.id, { fieldKey: e.target.value })}
                                  className="h-9 font-mono text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold text-gray-700">
                                  Display Label
                                </Label>
                                <Input
                                  placeholder="e.g., Temperature"
                                  value={field.label}
                                  onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                                  className="h-9"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold text-gray-700">
                                  Data Type *
                                </Label>
                                <Select
                                  value={field.type}
                                  onValueChange={(value) => handleUpdateField(field.id, { type: value as FieldMappingForm['type'] })}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="numeric">Numeric</SelectItem>
                                    <SelectItem value="boolean">Boolean</SelectItem>
                                    <SelectItem value="string">String</SelectItem>
                                    <SelectItem value="object">Object / JSON</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveField(field.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    <Button
                      onClick={handleAddField}
                      variant="outline"
                      className="w-full gap-2 border-dashed border-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Another Field
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview & Help */}
          <div className="space-y-6">
            {/* Preview Card */}
            <Card className="border border-gray-200 shadow-sm sticky top-24">
              <CardHeader className="bg-gradient-to-br from-green-50 to-emerald-50 border-b border-green-100">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-2">Device Name</p>
                  <p className="font-semibold text-gray-900">
                    {deviceInfo.name || <span className="text-gray-400">Not set</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">Device Type</p>
                  <p className="font-semibold text-gray-900">
                    {deviceInfo.type || <span className="text-gray-400">Not set</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">IP Address</p>
                  <p className="font-mono text-sm font-semibold text-gray-900">
                    {deviceInfo.ipAddress || <span className="text-gray-400">Not set</span>}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-gray-500 mb-2">Field Mappings</p>
                  {fieldMappings.length === 0 ? (
                    <p className="text-sm text-gray-400">No fields defined</p>
                  ) : (
                    <div className="space-y-2">
                      {fieldMappings.map(field => (
                        <div key={field.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Code className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="font-mono text-xs text-gray-600 truncate">
                              {field.fieldKey || '?'}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="text-xs font-semibold text-gray-900 truncate">
                              {field.label || '?'}
                            </span>
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-200 text-[10px] uppercase tracking-wide text-gray-700">
                              {field.type}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Help Card */}
            <Card className="border border-blue-200 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Info className="w-5 h-5 text-blue-600" />
                  Quick Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Field Key</h4>
                  <p className="text-xs text-gray-600">
                    The exact key name in your JSON payload (e.g., &quot;temp&quot;, &quot;humidity&quot;)
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Display Label</h4>
                  <p className="text-xs text-gray-600">
                    Human-friendly name shown in charts and dashboards
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Example JSON</h4>
                  <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-x-auto font-mono">
{`{
  "temp": 25.5,
  "humidity": 65,
  "status": "ok"
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
