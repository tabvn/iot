"use client";

import { useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import {
  ArrowLeft, TrendingUp, Activity, Clock, Database, Download,
  AlertCircle, CheckCircle2, Loader2,
  Wifi, BarChart3, LineChart, FileJson, Search, X, Copy, Check,
  ChevronDown, ChevronUp, Table, RefreshCw, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  LineChart as ReLineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import {
  apiGetDevice,
  apiGetDeviceAnalytics,
  type DeviceDetail,
  type AnalyticsResponse,
  type AnalyticsPoint,
} from "@/lib/api";

// ============================================================================
// Chart color palette
// ============================================================================

const CHART_COLORS = [
  "#ef4444", "#3b82f6", "#eab308", "#8b5cf6", "#ec4899",
  "#22c55e", "#f97316", "#06b6d4", "#6366f1", "#14b8a6",
];

function getFieldColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

// ============================================================================
// Time range helpers
// ============================================================================

type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d" | "custom";

function getFromDate(range: TimeRange): string | undefined {
  const now = Date.now();
  switch (range) {
    case "1h": return new Date(now - 3_600_000).toISOString();
    case "6h": return new Date(now - 6 * 3_600_000).toISOString();
    case "24h": return new Date(now - 24 * 3_600_000).toISOString();
    case "7d": return new Date(now - 7 * 24 * 3_600_000).toISOString();
    case "30d": return new Date(now - 30 * 24 * 3_600_000).toISOString();
    default: return undefined;
  }
}

// ============================================================================
// SWR fetchers
// ============================================================================

function deviceFetcher([, token, slug, id]: [string, string, string, string]) {
  return apiGetDevice(token, slug, id);
}

function analyticsFetcher([, token, slug, id, from, to, cursor, limit]: [string, string, string, string, string?, string?, string?, string?]) {
  return apiGetDeviceAnalytics(token, slug, id, {
    from: from || undefined,
    to: to || undefined,
    cursor: cursor || undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
  });
}

// ============================================================================
// Component
// ============================================================================

export function DeviceAnalytics() {
  const params = useParams();
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const workspaceSlug = params?.workspace as string;
  const deviceId = params?.deviceId as string;

  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showRawJson, setShowRawJson] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string>("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Compute from/to based on time range — stabilize to minute boundary to avoid
  // SWR key changing every millisecond and causing infinite re-fetches.
  const [fromDate, toDate] = useMemo(() => {
    if (timeRange === "custom") {
      return [
        customStartDate ? new Date(customStartDate).toISOString() : undefined,
        customEndDate ? new Date(customEndDate).toISOString() : undefined,
      ];
    }
    const from = getFromDate(timeRange);
    if (from) {
      // Round down to the nearest minute so the key is stable for ~60s
      const d = new Date(from);
      d.setSeconds(0, 0);
      return [d.toISOString(), undefined];
    }
    return [undefined, undefined];
  }, [timeRange, customStartDate, customEndDate]);

  // ---- SWR: Device detail ----
  const {
    data: device,
    error: deviceError,
    isLoading: deviceLoading,
  } = useSWR(
    token && workspaceSlug && deviceId ? ["device", token, workspaceSlug, deviceId] : null,
    deviceFetcher,
  );

  // ---- SWR: Analytics data ----
  const {
    data: analyticsData,
    error: analyticsError,
    isLoading: analyticsLoading,
    isValidating: analyticsValidating,
    mutate: mutateAnalytics,
  } = useSWR(
    token && workspaceSlug && deviceId
      ? ["analytics", token, workspaceSlug, deviceId, fromDate ?? "", toDate ?? "", "", "500"]
      : null,
    analyticsFetcher,
    { revalidateOnFocus: false },
  );

  // ---- Derived data ----
  const allPayloads = useMemo(() => {
    if (!analyticsData?.points) return [];
    return analyticsData.points.map((p: AnalyticsPoint, i: number) => ({
      id: `point-${i}`,
      timestamp: p.at,
      data: p.fields as Record<string, unknown>,
      status: p.status,
    }));
  }, [analyticsData]);

  const fieldMappingsMap = useMemo(() => {
    const map: Record<string, { displayLabel: string; dataType: string; unit?: string }> = {};
    for (const fm of device?.fieldMappings ?? []) {
      map[fm.sourceField] = { displayLabel: fm.displayLabel, dataType: fm.dataType, unit: fm.unit };
    }
    return map;
  }, [device]);

  const dataFields = useMemo(() => {
    if (allPayloads.length === 0) return Object.keys(fieldMappingsMap);
    return Object.keys(allPayloads[0]?.data || {});
  }, [allPayloads, fieldMappingsMap]);

  const numericFields = useMemo(() => {
    return dataFields.filter((f) => {
      const mapping = fieldMappingsMap[f];
      if (mapping) return mapping.dataType === "number";
      // Infer from data
      const sample = allPayloads.find((p) => typeof p.data[f] === "number");
      return !!sample;
    });
  }, [dataFields, fieldMappingsMap, allPayloads]);

  // Filter, search, sort
  const filteredPayloads = useMemo(() => {
    let filtered = [...allPayloads];

    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          JSON.stringify(p.data).toLowerCase().includes(searchQuery.toLowerCase()) ||
          new Date(p.timestamp).toLocaleString().toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    filtered.sort((a, b) => {
      if (sortField === "timestamp") {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
      }
      const valueA = a.data[sortField];
      const valueB = b.data[sortField];
      if (typeof valueA === "number" && typeof valueB === "number") {
        return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
      }
      return sortDirection === "asc"
        ? String(valueA).localeCompare(String(valueB))
        : String(valueB).localeCompare(String(valueA));
    });

    return filtered;
  }, [allPayloads, searchQuery, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredPayloads.length / pageSize) || 1;
  const paginatedPayloads = filteredPayloads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Chart data for numeric fields
  const chartData = useMemo(() => {
    return allPayloads.map((p) => ({
      time: new Date(p.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      timestamp: p.timestamp,
      ...Object.fromEntries(
        numericFields.map((f) => [f, typeof p.data[f] === "number" ? p.data[f] : null]),
      ),
    }));
  }, [allPayloads, numericFields]);

  // Field statistics
  const fieldStats = useMemo(() => {
    if (!filteredPayloads.length || !dataFields.length) return [];

    return dataFields.map((field) => {
      const values = filteredPayloads.map((p) => p.data[field]);
      const numericValues = values.filter((v): v is number => typeof v === "number");
      const mapping = fieldMappingsMap[field];

      if (numericValues.length > 0) {
        return {
          field,
          label: mapping?.displayLabel || field,
          unit: mapping?.unit,
          type: "numeric" as const,
          min: Math.min(...numericValues).toFixed(2),
          max: Math.max(...numericValues).toFixed(2),
          avg: (numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(2),
          current: String(filteredPayloads[0]?.data[field] ?? "N/A"),
        };
      }

      return {
        field,
        label: mapping?.displayLabel || field,
        unit: mapping?.unit,
        type: (typeof values[0] === "boolean" ? "boolean" : "string") as "boolean" | "string",
        uniqueValues: [...new Set(values.map(String))].length,
        current: String(filteredPayloads[0]?.data[field] ?? "N/A"),
      };
    });
  }, [filteredPayloads, dataFields, fieldMappingsMap]);

  // Stats summary
  const stats = useMemo(
    () => ({
      totalMessages: filteredPayloads.length,
      lastUpdated:
        filteredPayloads.length > 0
          ? new Date(filteredPayloads[0].timestamp).toLocaleString()
          : "N/A",
    }),
    [filteredPayloads],
  );

  // ---- Handlers ----

  const handleCopyJson = useCallback((data: unknown, id: string) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedId(id);
    toast.success("JSON copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleRefresh = useCallback(() => {
    mutateAnalytics();
    toast.success("Refreshing data...");
  }, [mutateAnalytics]);

  const handleExportData = useCallback(
    (format: "json" | "csv") => {
      if (!device) return;
      if (format === "json") {
        const dataStr = JSON.stringify(filteredPayloads, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${device.name}-data-${Date.now()}.json`;
        link.click();
        toast.success("Data exported as JSON");
      } else {
        const headers = ["Timestamp", ...dataFields.map((f) => fieldMappingsMap[f]?.displayLabel || f)];
        const csvRows = [headers.join(",")];
        filteredPayloads.forEach((payload) => {
          const row = [new Date(payload.timestamp).toLocaleString(), ...dataFields.map((f) => String(payload.data[f] ?? ""))];
          csvRows.push(row.join(","));
        });
        const csvStr = csvRows.join("\n");
        const dataBlob = new Blob([csvStr], { type: "text/csv" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${device.name}-data-${Date.now()}.csv`;
        link.click();
        toast.success("Data exported as CSV");
      }
    },
    [device, filteredPayloads, dataFields, fieldMappingsMap],
  );

  const handleSort = useCallback(
    (field: string) => {
      if (sortField === field) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("desc");
      }
    },
    [sortField],
  );

  // ---- Loading / Error states ----

  if (authLoading || deviceLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Loading device...</span>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Not Authenticated</h3>
            <p className="text-sm text-gray-600 mb-4">Please log in to view device analytics.</p>
            <Button onClick={() => router.push("/login")} className="w-full">Log In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (deviceError || !device) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Device Not Found</h3>
            <p className="text-sm text-gray-600 mb-4">
              {deviceError?.message || "The device doesn\u2019t exist or you don\u2019t have access to it."}
            </p>
            <div className="text-xs text-gray-500 mb-4 font-mono bg-gray-100 p-3 rounded text-left">
              <p>Workspace: {workspaceSlug || "undefined"}</p>
              <p>Device ID: {deviceId || "undefined"}</p>
            </div>
            <Button onClick={() => router.push(`/${workspaceSlug}`)} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasData = allPayloads.length > 0;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/${workspaceSlug}`)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="h-6 w-px bg-gray-300 hidden sm:block" />
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{device.name}</h1>
                  <Badge variant={device.status === "online" ? "default" : "secondary"}>
                    {device.status}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  {device.type} &middot; {workspaceSlug}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => router.push(`/${workspaceSlug}/device/${deviceId}/edit`)}
                className="gap-2 flex-1 sm:flex-none"
                size="sm"
              >
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExportData("csv")}
                className="gap-2 flex-1 sm:flex-none"
                size="sm"
                disabled={!hasData}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">CSV</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExportData("json")}
                className="gap-2 flex-1 sm:flex-none"
                size="sm"
                disabled={!hasData}
              >
                <FileJson className="w-4 h-4" />
                <span className="hidden sm:inline">JSON</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <Card className="border border-gray-200">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="text-sm sm:text-lg font-bold text-gray-900 capitalize">{device.status}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Database className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Records</p>
                    <p className="text-sm sm:text-lg font-bold text-gray-900">
                      {analyticsLoading ? "..." : stats.totalMessages}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Seen</p>
                    <p className="text-xs sm:text-sm font-bold text-gray-900">
                      {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleTimeString() : "Never"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Fields</p>
                    <p className="text-sm sm:text-lg font-bold text-gray-900">
                      {device.fieldMappings?.length ?? 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 col-span-2 sm:col-span-1">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Wifi className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="text-sm sm:text-lg font-bold text-gray-900 capitalize">{device.type}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Tabs */}
          <Tabs defaultValue="table" className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2">
              <TabsList className="bg-transparent p-0 border-0 h-auto gap-2 w-full grid grid-cols-4">
                <TabsTrigger
                  value="table"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white rounded-xl px-2 sm:px-4 py-2 sm:py-3 gap-1 sm:gap-2"
                >
                  <Table className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Data Table</span>
                  <span className="sm:hidden text-xs">Table</span>
                </TabsTrigger>
                <TabsTrigger
                  value="charts"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-xl px-2 sm:px-4 py-2 sm:py-3 gap-1 sm:gap-2"
                >
                  <LineChart className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Charts</span>
                  <span className="sm:hidden text-xs">Charts</span>
                </TabsTrigger>
                <TabsTrigger
                  value="data-fields"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white rounded-xl px-2 sm:px-4 py-2 sm:py-3 gap-1 sm:gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Fields</span>
                  <span className="sm:hidden text-xs">Fields</span>
                </TabsTrigger>
                <TabsTrigger
                  value="health"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white rounded-xl px-2 sm:px-4 py-2 sm:py-3 gap-1 sm:gap-2"
                >
                  <Activity className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Health</span>
                  <span className="sm:hidden text-xs">Health</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ============================================================ */}
            {/* Data Table Tab */}
            {/* ============================================================ */}
            <TabsContent value="table" className="space-y-4 sm:space-y-6">
              {/* Filters Bar */}
              <Card className="border border-gray-200">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="sm:col-span-2 lg:col-span-1">
                      <label className="text-xs font-semibold text-gray-700 mb-2 block">Time Range</label>
                      <Select
                        value={timeRange}
                        onValueChange={(value) => {
                          setTimeRange(value as TimeRange);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1h">Last 1 Hour</SelectItem>
                          <SelectItem value="6h">Last 6 Hours</SelectItem>
                          <SelectItem value="24h">Last 24 Hours</SelectItem>
                          <SelectItem value="7d">Last 7 Days</SelectItem>
                          <SelectItem value="30d">Last 30 Days</SelectItem>
                          <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-gray-700 mb-2 block">Search</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="pl-9 pr-9"
                        />
                        {searchQuery && (
                          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-2 block">Rows</label>
                      <Select
                        value={String(pageSize)}
                        onValueChange={(value) => {
                          setPageSize(Number(value));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {timeRange === "custom" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-2 block">Start Date</label>
                        <Input type="datetime-local" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-full" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700 mb-2 block">End Date</label>
                        <Input type="datetime-local" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-full" />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Clock className="w-3 h-3" />
                      {timeRange === "custom" ? "Custom" : timeRange}
                    </Badge>
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Database className="w-3 h-3" />
                      {filteredPayloads.length}
                    </Badge>
                    {searchQuery && (
                      <Badge variant="outline" className="gap-1 text-xs max-w-[150px] truncate">
                        <Search className="w-3 h-3 flex-shrink-0" />
                        &quot;{searchQuery}&quot;
                      </Badge>
                    )}
                    {analyticsValidating && (
                      <Badge variant="outline" className="gap-1 text-xs text-blue-600 border-blue-200">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Loading
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Data Display */}
              <Card className="border border-gray-200">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg sm:text-xl">Device Data Records</CardTitle>
                      <CardDescription className="mt-1 text-xs sm:text-sm">
                        {analyticsLoading
                          ? "Loading..."
                          : `Showing ${paginatedPayloads.length} of ${filteredPayloads.length} records`}
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={analyticsValidating} className="gap-2 w-full sm:w-auto">
                      <RefreshCw className={`w-4 h-4 ${analyticsValidating ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-0 sm:px-6">
                  {analyticsLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" />
                      <span className="text-sm text-gray-600">Loading data...</span>
                    </div>
                  ) : analyticsError ? (
                    <div className="text-center py-16">
                      <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                      <p className="text-sm text-red-600">{analyticsError.message}</p>
                      <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-3">
                        Retry
                      </Button>
                    </div>
                  ) : !hasData ? (
                    <div className="text-center py-16">
                      <Database className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <h4 className="font-semibold text-gray-900 mb-1">No data yet</h4>
                      <p className="text-sm text-gray-500">This device hasn&apos;t sent any data yet. Send data via the ingest API to see it here.</p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table */}
                      <div className="hidden lg:block overflow-x-auto px-6 sm:px-0">
                        <div className="min-w-full inline-block align-middle">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                                <th className="text-left p-3 text-xs font-bold text-gray-700 uppercase tracking-wider">
                                  <button onClick={() => handleSort("timestamp")} className="flex items-center gap-2 hover:text-blue-600 transition-colors whitespace-nowrap">
                                    Time
                                    {sortField === "timestamp" && (sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                                  </button>
                                </th>
                                {dataFields.map((field) => {
                                  const mapping = fieldMappingsMap[field];
                                  return (
                                    <th key={field} className="text-left p-3 text-xs font-bold text-gray-700 uppercase tracking-wider">
                                      <button onClick={() => handleSort(field)} className="flex items-center gap-2 hover:text-blue-600 transition-colors whitespace-nowrap">
                                        <Database className="w-3.5 h-3.5 text-gray-600" />
                                        <span>{mapping?.displayLabel || field}</span>
                                        {mapping?.unit && <span className="text-gray-400 font-normal normal-case">({mapping.unit})</span>}
                                        {sortField === field && (sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                                      </button>
                                    </th>
                                  );
                                })}
                                <th className="text-left p-3 text-xs font-bold text-gray-700 uppercase tracking-wider w-20" />
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedPayloads.map((payload, index) => (
                                <tr
                                  key={payload.id}
                                  className={`border-b border-gray-200 hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                                >
                                  <td className="p-3 text-xs text-gray-900 font-mono whitespace-nowrap">
                                    <div className="flex flex-col">
                                      <span className="font-semibold">
                                        {new Date(payload.timestamp).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
                                      </span>
                                      <span className="text-gray-500">
                                        {new Date(payload.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                      </span>
                                    </div>
                                  </td>
                                  {dataFields.map((field) => {
                                    const value = payload.data[field];
                                    return (
                                      <td key={field} className="p-3 text-sm">
                                        {typeof value === "number" ? (
                                          <span className="font-semibold text-gray-900">{value.toFixed(2)}</span>
                                        ) : typeof value === "boolean" ? (
                                          <Badge variant={value ? "default" : "secondary"} className="text-xs">{String(value)}</Badge>
                                        ) : value !== null && value !== undefined ? (
                                          <Badge variant="outline" className="text-xs">{String(value)}</Badge>
                                        ) : (
                                          <span className="text-gray-400">—</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                  <td className="p-3">
                                    <div className="flex items-center gap-1">
                                      <Button variant="ghost" size="sm" onClick={() => handleCopyJson(payload.data, payload.id)} className="h-7 w-7 p-0" title="Copy">
                                        {copiedId === payload.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => setShowRawJson(showRawJson === payload.id ? null : payload.id)} className="h-7 w-7 p-0" title="View">
                                        {showRawJson === payload.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Mobile Card View */}
                      <div className="lg:hidden space-y-3 px-4 sm:px-0">
                        {paginatedPayloads.map((payload) => {
                          const isExpanded = showRawJson === payload.id;
                          return (
                            <Card key={payload.id} className="border border-gray-200 bg-white shadow-sm">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-200">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                      <span className="text-xs font-semibold text-gray-900 truncate">
                                        {new Date(payload.timestamp).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
                                      </span>
                                    </div>
                                    <span className="text-xs text-gray-500 font-mono ml-5 block">
                                      {new Date(payload.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <Button variant="ghost" size="sm" onClick={() => handleCopyJson(payload.data, payload.id)} className="h-8 w-8 p-0">
                                      {copiedId === payload.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setShowRawJson(isExpanded ? null : payload.id)} className="h-8 w-8 p-0">
                                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </Button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  {dataFields.map((field) => {
                                    const value = payload.data[field];
                                    const mapping = fieldMappingsMap[field];
                                    return (
                                      <div key={field} className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-1.5 mb-1">
                                          <Database className="w-3 h-3 flex-shrink-0 text-gray-600" />
                                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">
                                            {mapping?.displayLabel || field}
                                          </span>
                                        </div>
                                        <div className="truncate">
                                          {typeof value === "number" ? (
                                            <span className="text-sm font-bold text-gray-900">{value.toFixed(2)}{mapping?.unit ? ` ${mapping.unit}` : ""}</span>
                                          ) : typeof value === "boolean" ? (
                                            <Badge variant={value ? "default" : "secondary"} className="text-xs">{String(value)}</Badge>
                                          ) : (
                                            <Badge variant="outline" className="text-xs">{String(value ?? "—")}</Badge>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {isExpanded && (
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
                                      <pre className="text-green-400 text-xs font-mono">{JSON.stringify(payload.data, null, 2)}</pre>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      {/* Desktop JSON Viewer */}
                      {showRawJson && paginatedPayloads.find((p) => p.id === showRawJson) && (
                        <div className="hidden lg:block mt-4 p-4 bg-gray-900 rounded-lg mx-6 sm:mx-0">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="bg-gray-800 text-green-400 border-green-600">Raw JSON</Badge>
                            <Button variant="ghost" size="sm" onClick={() => setShowRawJson(null)} className="text-gray-400 hover:text-white h-6 w-6 p-0">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <ScrollArea className="h-64">
                            <pre className="text-green-400 text-xs font-mono">
                              {JSON.stringify(paginatedPayloads.find((p) => p.id === showRawJson)?.data, null, 2)}
                            </pre>
                          </ScrollArea>
                        </div>
                      )}

                      {/* Pagination */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-6 border-t border-gray-200 px-6 sm:px-0">
                        <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                          {filteredPayloads.length === 0
                            ? "0 records"
                            : `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredPayloads.length)} of ${filteredPayloads.length}`}
                        </div>
                        {/* Mobile Pagination */}
                        <div className="flex sm:hidden items-center gap-2 w-full justify-center">
                          <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1} className="flex-1 max-w-[100px]">
                            Prev
                          </Button>
                          <div className="px-3 py-1.5 bg-blue-100 rounded-md text-sm font-semibold text-blue-900 min-w-[70px] text-center">
                            {currentPage}/{totalPages}
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="flex-1 max-w-[100px]">
                            Next
                          </Button>
                        </div>
                        {/* Desktop Pagination */}
                        <div className="hidden sm:flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>First</Button>
                          <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>Previous</Button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum: number;
                              if (totalPages <= 5) pageNum = i + 1;
                              else if (currentPage <= 3) pageNum = i + 1;
                              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                              else pageNum = currentPage - 2 + i;
                              return (
                                <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(pageNum)} className="w-8 h-8 p-0">
                                  {pageNum}
                                </Button>
                              );
                            })}
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>Next</Button>
                          <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>Last</Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============================================================ */}
            {/* Charts Tab */}
            {/* ============================================================ */}
            <TabsContent value="charts" className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-gray-900">Time Series Data</h3>
                <div className="flex items-center gap-2">
                  <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">Last 1 Hour</SelectItem>
                      <SelectItem value="6h">Last 6 Hours</SelectItem>
                      <SelectItem value="24h">Last 24 Hours</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={handleRefresh} disabled={analyticsValidating}>
                    <RefreshCw className={`w-4 h-4 ${analyticsValidating ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {analyticsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" />
                  <span className="text-sm text-gray-600">Loading charts...</span>
                </div>
              ) : !hasData ? (
                <Card className="border border-gray-200">
                  <CardContent className="py-16 text-center">
                    <Database className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No data available for charts.</p>
                  </CardContent>
                </Card>
              ) : numericFields.length === 0 ? (
                <Card className="border border-gray-200">
                  <CardContent className="py-16 text-center">
                    <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No numeric fields found. Charts require numeric data.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Individual area chart per numeric field */}
                  {numericFields.map((field, idx) => {
                    const mapping = fieldMappingsMap[field];
                    const color = getFieldColor(idx);
                    const gradientId = `color-${field}`;
                    return (
                      <Card key={field} className="border border-gray-200">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                            {mapping?.displayLabel || field}
                            {mapping?.unit && <span className="text-sm font-normal text-gray-500">({mapping.unit})</span>}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={chartData}>
                              <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <Tooltip />
                              <Area type="monotone" dataKey={field} stroke={color} fillOpacity={1} fill={`url(#${gradientId})`} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Combined chart if multiple numeric fields */}
                  {numericFields.length > 1 && (
                    <Card className="border border-gray-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                          <BarChart3 className="w-5 h-5 text-purple-600" />
                          Combined View
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <ReLineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend />
                            {numericFields.map((field, idx) => (
                              <Line
                                key={field}
                                type="monotone"
                                dataKey={field}
                                name={fieldMappingsMap[field]?.displayLabel || field}
                                stroke={getFieldColor(idx)}
                                strokeWidth={2}
                                dot={false}
                              />
                            ))}
                          </ReLineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            {/* ============================================================ */}
            {/* Data Fields Tab */}
            {/* ============================================================ */}
            <TabsContent value="data-fields" className="space-y-6">
              <Card className="border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Data Schema &amp; Statistics</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Analysis of all data fields ({filteredPayloads.length} records)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                      <span className="text-sm text-gray-600">Loading...</span>
                    </div>
                  ) : fieldStats.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No field data available.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {fieldStats.map((stat, idx) => (
                        <Card key={stat.field} className="border border-gray-200 bg-gradient-to-br from-white to-gray-50/50">
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                                  style={{ backgroundColor: `${getFieldColor(idx)}20` }}
                                >
                                  <Database className="w-5 h-5" style={{ color: getFieldColor(idx) }} />
                                </div>
                                <div>
                                  <h4 className="font-bold text-gray-900 text-sm sm:text-base">{stat.label}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">{stat.type}</Badge>
                                    {stat.unit && <span className="text-xs text-gray-500">({stat.unit})</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500 mb-1">Current</p>
                                <p className="text-lg sm:text-xl font-bold text-blue-600">{stat.current}</p>
                              </div>
                            </div>

                            {stat.type === "numeric" && (
                              <div className="grid grid-cols-3 gap-3 mt-4">
                                <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                                  <p className="text-xs text-gray-500 mb-1">Min</p>
                                  <p className="text-sm font-bold text-gray-900">{stat.min}</p>
                                </div>
                                <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                                  <p className="text-xs text-gray-500 mb-1">Avg</p>
                                  <p className="text-sm font-bold text-gray-900">{stat.avg}</p>
                                </div>
                                <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                                  <p className="text-xs text-gray-500 mb-1">Max</p>
                                  <p className="text-sm font-bold text-gray-900">{stat.max}</p>
                                </div>
                              </div>
                            )}

                            {stat.type !== "numeric" && (
                              <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                                <p className="text-xs text-gray-500 mb-1">Unique Values</p>
                                <p className="text-sm font-bold text-gray-900">{stat.uniqueValues}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============================================================ */}
            {/* Health Tab */}
            {/* ============================================================ */}
            <TabsContent value="health" className="space-y-6">
              <Card className={`border-2 ${device.status === "online" ? "border-green-200 bg-gradient-to-br from-green-50 to-white" : "border-yellow-200 bg-gradient-to-br from-yellow-50 to-white"}`}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg ${device.status === "online" ? "bg-gradient-to-br from-green-400 to-green-600" : "bg-gradient-to-br from-yellow-400 to-yellow-600"}`}>
                        <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-2xl font-bold text-gray-900">
                          {device.status === "online" ? "Device is Healthy" : "Device is Offline"}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          Last seen: {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : "Never"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <Badge className={`px-4 py-1.5 justify-center ${device.status === "online" ? "bg-green-600 text-white" : "bg-yellow-600 text-white"}`}>
                        <Activity className="w-3.5 h-3.5 mr-1.5" />
                        {device.status === "online" ? "Online" : "Offline"}
                      </Badge>
                      <Badge variant="outline" className="bg-white px-4 py-1.5 justify-center">
                        <Database className="w-3.5 h-3.5 mr-1.5" />
                        {stats.totalMessages} records
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Device Info */}
              <Card className="border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Device Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: "Device ID", value: device.deviceId },
                      { label: "Type", value: device.type },
                      { label: "Manufacturer", value: device.manufacturer },
                      { label: "Model", value: device.model },
                      { label: "Firmware", value: device.firmwareVersion },
                      { label: "Location", value: device.location },
                      { label: "Created", value: new Date(device.createdAt).toLocaleString() },
                      { label: "Updated", value: new Date(device.updatedAt).toLocaleString() },
                    ]
                      .filter((item) => item.value)
                      .map((item) => (
                        <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                          <p className="text-sm font-semibold text-gray-900 break-all">{item.value}</p>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Field Mappings */}
              {device.fieldMappings && device.fieldMappings.length > 0 && (
                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Field Mappings</CardTitle>
                    <CardDescription>Configured data field definitions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {device.fieldMappings.map((fm, idx) => (
                        <div key={fm.sourceField} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getFieldColor(idx) }} />
                            <span className="font-semibold text-sm text-gray-900">{fm.displayLabel}</span>
                          </div>
                          <div className="space-y-1 text-xs text-gray-600">
                            <div className="flex justify-between">
                              <span>Key:</span>
                              <span className="font-mono">{fm.sourceField}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Type:</span>
                              <Badge variant="outline" className="text-[10px] h-5">{fm.dataType}</Badge>
                            </div>
                            {fm.unit && (
                              <div className="flex justify-between">
                                <span>Unit:</span>
                                <span>{fm.unit}</span>
                              </div>
                            )}
                            {fm.min !== undefined && (
                              <div className="flex justify-between">
                                <span>Range:</span>
                                <span>{fm.min} &ndash; {fm.max ?? "..."}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
