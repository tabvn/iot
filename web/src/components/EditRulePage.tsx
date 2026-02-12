"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, X, Save, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { AutomationForm } from "@/components/AutomationForm";
import { apiGetAutomation, type Automation } from "@/lib/api";

async function automationFetcher([, token, workspaceSlug, automationId]: [string, string, string, string]) {
  return apiGetAutomation(token, workspaceSlug, automationId);
}

export function EditRulePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params?.workspace as string;
  const automationId = params?.automationId as string;
  const { token, isLoading: authLoading } = useAuth();

  const { data: automation, error, isLoading } = useSWR<Automation>(
    token && workspaceSlug && automationId ? ["automation", token, workspaceSlug, automationId] : null,
    automationFetcher
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-sm text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">Not Authenticated</h3>
            <p className="text-sm text-gray-600 mb-4">Please log in to edit automations.</p>
            <Button onClick={() => router.push("/login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-sm text-gray-600">Loading automation...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">Failed to Load</h3>
            <p className="text-sm text-gray-600 mb-4">{error.message}</p>
            <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!automation) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">Not Found</h3>
            <p className="text-sm text-gray-600 mb-4">Automation not found.</p>
            <Button variant="outline" onClick={() => router.push(`/${workspaceSlug}/automations`)}>
              Back to Automations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/${workspaceSlug}/automations`)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Automation Rule</h1>
                <p className="text-sm text-gray-500 mt-0.5">{automation.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/${workspaceSlug}/automations`)}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                form="automation-form"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2 shadow-md"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AutomationForm
          workspaceSlug={workspaceSlug}
          mode="edit"
          automationId={automationId}
          initialData={automation}
        />
      </div>
    </div>
  );
}
