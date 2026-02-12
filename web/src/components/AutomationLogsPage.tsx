"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, Loader2, AlertCircle, Clock, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronRight, Activity, Zap, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  apiListAutomationLogs,
  apiGetAutomation,
  apiGetAutomationStats,
  type AutomationLog,
  type Automation,
  type AutomationStats,
} from "@/lib/api";

// ---- SWR fetchers ----

async function automationFetcher([, token, slug, id]: [string, string, string, string]) {
  return apiGetAutomation(token, slug, id);
}

async function logsFetcher([, token, slug, id]: [string, string, string, string]) {
  return apiListAutomationLogs(token, slug, id, { limit: 100 });
}

async function statsFetcher([, token, slug, id]: [string, string, string, string]) {
  return apiGetAutomationStats(token, slug, id);
}

// ---- Helpers ----

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "success":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Success
        </Badge>
      );
    case "partial_failure":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Partial Failure
        </Badge>
      );
    case "failure":
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <XCircle className="w-3 h-3 mr-1" />
          Failure
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
}

function TriggerBadge({ triggerType }: { triggerType: string }) {
  const labels: Record<string, string> = {
    device_data: "Device Data",
    device_status: "Device Status",
    schedule: "Schedule",
  };
  return (
    <Badge variant="outline" className="text-xs">
      <Zap className="w-3 h-3 mr-1" />
      {labels[triggerType] || triggerType}
    </Badge>
  );
}

// ---- Log entry card ----

function LogEntryCard({ log }: { log: AutomationLog }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 flex-wrap">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
          )}
          <StatusBadge status={log.status} />
          <TriggerBadge triggerType={log.triggerType} />
          <span className="text-sm font-medium text-gray-900">{log.automationName}</span>
          <span className="ml-auto flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimestamp(log.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              {formatDuration(log.totalDurationMs)}
            </span>
          </span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="mt-3 space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">Action Results</h4>
            {log.actionResults.length === 0 ? (
              <p className="text-sm text-gray-500">No action results recorded.</p>
            ) : (
              <div className="space-y-2">
                {log.actionResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-sm ${
                      result.status === "success"
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          #{result.actionIndex + 1}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {result.actionType}
                        </Badge>
                        {result.status === "success" ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDuration(result.durationMs)}
                      </span>
                    </div>
                    {result.error && (
                      <p className="mt-2 text-xs text-red-700 bg-red-100 p-2 rounded">
                        {result.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ---- Main component ----

export function AutomationLogsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params?.workspace as string;
  const automationId = params?.automationId as string;
  const { token, isLoading: authLoading } = useAuth();

  const {
    data: automation,
    error: automationError,
    isLoading: automationLoading,
  } = useSWR<Automation>(
    token && workspaceSlug && automationId
      ? ["automation", token, workspaceSlug, automationId]
      : null,
    automationFetcher,
    { revalidateOnFocus: false }
  );

  const { data: logsData, error: logsError, isLoading: logsLoading } = useSWR(
    token && workspaceSlug && automationId
      ? ["automation-logs", token, workspaceSlug, automationId]
      : null,
    logsFetcher,
    { revalidateOnFocus: false }
  );

  const { data: stats } = useSWR<AutomationStats>(
    token && workspaceSlug && automationId
      ? ["automation-stats", token, workspaceSlug, automationId]
      : null,
    statsFetcher,
    { revalidateOnFocus: false }
  );

  // ---- Loading state ----

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

  // ---- Not authenticated ----

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">Not Authenticated</h3>
            <p className="text-sm text-gray-600 mb-4">Please log in to view automation logs.</p>
            <Button onClick={() => router.push("/login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Data loading ----

  if (automationLoading || logsLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-sm text-gray-600">Loading automation logs...</span>
        </div>
      </div>
    );
  }

  // ---- Error state ----

  if (automationError || logsError) {
    const errorMsg = automationError?.message || logsError?.message || "An error occurred";
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">Failed to Load</h3>
            <p className="text-sm text-gray-600 mb-4">{errorMsg}</p>
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Not found ----

  if (!automation) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">Not Found</h3>
            <p className="text-sm text-gray-600 mb-4">Automation not found.</p>
            <Button
              variant="outline"
              onClick={() => router.push(`/${workspaceSlug}/automations`)}
            >
              Back to Automations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const logs = logsData?.logs ?? [];

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
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Execution Logs</h1>
                <p className="text-sm text-gray-500 mt-0.5">{automation.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stats Summary */}
        {stats && (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Execution Summary
              </CardTitle>
              <CardDescription>
                Performance overview for this automation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase">Total Executions</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalExecutions}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase">Successes</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">{stats.successCount}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase">Failures</p>
                  <p className="text-2xl font-bold text-red-700 mt-1">
                    {stats.failureCount + stats.partialFailureCount}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase">Avg Duration</p>
                  <p className="text-2xl font-bold text-purple-700 mt-1">
                    {formatDuration(stats.averageDurationMs)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase">Last Run</p>
                  <p className="text-sm font-semibold text-gray-700 mt-1">
                    {stats.lastExecutionAt
                      ? formatTimestamp(stats.lastExecutionAt)
                      : "Never"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Log Entries */}
        {logs.length === 0 ? (
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2 text-gray-700">No Logs Yet</h3>
              <p className="text-sm text-gray-500">
                This automation has not been triggered yet. Logs will appear here after the first execution.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Executions ({logs.length})
            </h2>
            {logs.map((log) => (
              <LogEntryCard key={log.logId} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
