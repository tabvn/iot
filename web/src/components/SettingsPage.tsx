"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings, Building2, Bell, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { mockWorkspaces } from "@/data/mockData";

export function SettingsPage() {
  const params = useParams();
  const workspaceParam = params?.workspace as string;
  const workspace = mockWorkspaces.find((w) => w.slug === workspaceParam || w.id === workspaceParam);
  const [workspaceName, setWorkspaceName] = useState(workspace?.name || '');
  const [workspaceDescription, setWorkspaceDescription] = useState(workspace?.description || '');

  if (!workspace) {
    return <div>Workspace not found</div>;
  }

  const handleSaveChanges = () => {
    toast.success("Workspace settings updated successfully!");
  };

  const handleDeleteWorkspace = () => {
    toast.error("This action is not reversible. Please confirm to delete.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/${workspaceParam}`}>
            <Button variant="outline" size="icon" className="rounded-xl">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Workspace Settings</h1>
            <p className="text-gray-600 mt-1">{workspace.name}</p>
          </div>
        </div>

        {/* Workspace Information */}
        <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Building2 className="w-5 h-5 text-blue-600" />
              Workspace Information
            </CardTitle>
            <CardDescription>Update your workspace details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name" className="text-sm font-semibold">Workspace Name</Label>
              <Input 
                id="workspace-name"
                value={workspaceName} 
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Workspace name" 
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspace-description" className="text-sm font-semibold">Description</Label>
              <Input 
                id="workspace-description"
                value={workspaceDescription}
                onChange={(e) => setWorkspaceDescription(e.target.value)}
                placeholder="Workspace description" 
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Workspace ID</Label>
              <p className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded">{workspace.id}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Created</Label>
              <p className="text-sm text-gray-600">
                {new Date(workspace.createdAt).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <Separator />
            <Button 
              onClick={handleSaveChanges}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <Edit className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Bell className="w-5 h-5 text-purple-600" />
              Notifications
            </CardTitle>
            <CardDescription>Configure how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Device Alerts</p>
                <p className="text-sm text-gray-500">Get notified when devices go offline or have errors</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Member Activity</p>
                <p className="text-sm text-gray-500">Notifications when members join or leave</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Device Control Actions</p>
                <p className="text-sm text-gray-500">Get notified of device control changes</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Email Digest</p>
                <p className="text-sm text-gray-500">Weekly summary of workspace activity</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-gray-500">Receive push notifications on mobile</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-0 bg-gradient-to-br from-red-50 to-red-100 shadow-lg">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2 text-xl">
              <Trash2 className="w-5 h-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-red-700">
              Deleting this workspace will permanently remove all devices, members, settings, and data. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={handleDeleteWorkspace}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Workspace Permanently
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
