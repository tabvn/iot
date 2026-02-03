"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { DeviceForm } from "@/components/DeviceForm";
import { ArrowLeft, X, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetDevice, type DeviceDetail } from "@/lib/api";

async function deviceFetcher([, token, workspaceSlug, deviceId]: [string, string, string, string]) {
  return apiGetDevice(token, workspaceSlug, deviceId);
}

export default function EditDevicePage() {
  const params = useParams();
  const workspaceSlug = params.workspace as string;
  const deviceId = params.deviceId as string;
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();

  const { data: device, error, isLoading } = useSWR<DeviceDetail>(
    token ? ["device", token, workspaceSlug, deviceId] : null,
    deviceFetcher
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-sm text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to edit this device.</p>
          <Button onClick={() => router.push("/login")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-sm text-gray-600">Loading device...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load device: {error.message}</p>
          <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Device not found.</p>
          <Button variant="outline" onClick={() => router.push(`/${workspaceSlug}`)}>Back to Workspace</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/${workspaceSlug}/device/${deviceId}/analytics`)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Device</h1>
                <p className="text-sm text-gray-500 mt-0.5">{device.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/${workspaceSlug}/device/${deviceId}/analytics`)}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                form="edit-device-form"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-2 shadow-md"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DeviceForm
          workspaceSlug={workspaceSlug}
          mode="edit"
          deviceId={deviceId}
          initialData={device}
        />
      </div>
    </div>
  );
}
