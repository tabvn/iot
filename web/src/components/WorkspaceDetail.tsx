"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Wifi, WifiOff, AlertTriangle, Thermometer, Droplet, Zap, Code, Settings, Activity, Clock, MapPin, Network, CheckCircle2, XCircle, AlertCircle, Info, Cpu, Package, Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Device, DeviceStatus, DataFieldMapping } from "@/app/types";
import { DeviceControl } from "@/components/DeviceControl";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiListDevices, type DeviceDetail } from "@/lib/api";
import { ShowIf } from "@/lib/acl";

export function WorkspaceDetail() {
  const params = useParams();
  const workspaceParam = params?.workspace as string;
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();

  const [devices, setDevices] = useState<DeviceDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token || !workspaceParam) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiListDevices(token, workspaceParam)
      .then((res) => {
        setDevices(res.devices);
        setError(null);
      })
      .catch((err) => {
        setError(err?.message || "Failed to load devices");
      })
      .finally(() => setLoading(false));
  }, [token, workspaceParam, authLoading]);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{workspaceParam}</h1>
          <p className="text-gray-600 mt-1">Manage your IoT devices in this workspace</p>
        </div>
        <ShowIf permission="devices:create">
          <Button
            onClick={() => router.push(`/${workspaceParam}/devices/add`)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Device
          </Button>
        </ShowIf>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Cpu className="w-8 h-8 opacity-80" />
              <div className="text-right">
                <div className="text-3xl font-bold">{devices.length}</div>
              </div>
            </div>
            <p className="text-sm font-medium text-blue-100">Total Devices</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Wifi className="w-8 h-8 opacity-80" />
              <div className="text-right">
                <div className="text-3xl font-bold">{devices.filter(d => d.status === "online").length}</div>
              </div>
            </div>
            <p className="text-sm font-medium text-green-100">Online</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-gray-500 to-gray-600 text-white shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <WifiOff className="w-8 h-8 opacity-80" />
              <div className="text-right">
                <div className="text-3xl font-bold">{devices.filter(d => d.status === "offline").length}</div>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-100">Offline</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 opacity-80" />
              <div className="text-right">
                <div className="text-3xl font-bold">{devices.filter(d => d.status === "error").length}</div>
              </div>
            </div>
            <p className="text-sm font-medium text-orange-100">Error</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-8 h-8 opacity-80" />
              <div className="text-right">
                <div className="text-3xl font-bold">{devices.filter(d => d.fieldMappings && d.fieldMappings.length > 0).length}</div>
              </div>
            </div>
            <p className="text-sm font-medium text-purple-100">With Data</p>
          </CardContent>
        </Card>
      </div>

      {/* Devices Grid */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Connected Devices</h2>
        {devices.length === 0 ? (
          <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50">
            <div className="relative mx-auto w-20 h-20 mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur opacity-20"></div>
              <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl flex items-center justify-center w-full h-full border border-blue-100">
                <Cpu className="w-10 h-10 text-blue-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No devices yet</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
              Add your first IoT device to start monitoring and controlling it from this workspace.
            </p>
            <ShowIf permission="devices:create">
              <Button
                onClick={() => router.push(`/${workspaceParam}/devices/add`)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-2 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Add Your First Device
              </Button>
            </ShowIf>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {devices.map((device) => (
              <Card key={device.deviceId} className="border border-gray-200 hover:border-gray-300 transition-all duration-200 rounded-2xl shadow-sm hover:shadow-md bg-white overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative">
                        {device.status === "online" ? (
                          <Wifi className="w-4 h-4 text-green-500" />
                        ) : device.status === "error" ? (
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg font-semibold text-gray-900 truncate">{device.name}</CardTitle>
                          <Badge
                            variant="secondary"
                            className={
                              device.status === "online"
                                ? "bg-green-100 text-green-700 border-0 px-3 py-1"
                                : device.status === "error"
                                ? "bg-orange-100 text-orange-700 border-0 px-3 py-1"
                                : "bg-gray-100 text-gray-700 border-0 px-3 py-1"
                            }
                          >
                            {device.status === "online" ? "Online" : device.status === "error" ? "Error" : "Offline"}
                          </Badge>
                        </div>
                        <CardDescription className="text-sm text-gray-500">{device.type}</CardDescription>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500">Device ID</p>
                        <p className="font-mono text-xs font-medium text-gray-700 truncate">{device.deviceId.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500">{device.lastSeenAt ? "Last Seen" : "Created"}</p>
                        <p className="text-xs font-medium text-gray-700">
                          {new Date(device.lastSeenAt || device.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <Button
                    variant="outline"
                    className="w-full gap-2 hover:bg-blue-50 transition-colors border-blue-300 rounded-xl text-blue-600 hover:text-blue-700 font-semibold"
                    onClick={() => router.push(`/${workspaceParam}/device/${device.deviceId}/analytics`)}
                  >
                    <Activity className="w-4 h-4" />
                    View Analytics & Data
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
