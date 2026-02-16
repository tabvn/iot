"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import {
  Plus, Zap, Trash2, Clock,
  Activity, Settings, Wifi,
  Webhook, Mail, Database, ArrowRight,
  GitBranch, Link2, Sparkles, Info, GripVertical, Loader2,
  AlertTriangle, Shuffle, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  apiListDevices,
  apiGetDevice,
  apiCreateAutomation,
  apiUpdateAutomation,
  type DeviceDetail,
  type CreateAutomationPayload,
  type UpdateAutomationPayload,
  type AutomationTriggerConfig,
  type AutomationActionConfig,
  type DeviceDataTriggerConfig,
  type DeviceStatusTriggerConfig,
  type ScheduleTriggerConfig,
  type Automation,
} from "@/lib/api";

// Types
interface RuleTrigger {
  id: string;
  type: "device_data" | "device_status" | "schedule";
  deviceId?: string;
  deviceName?: string;
  field?: string;
  condition?: string;
  value?: number | string | boolean;
  status?: "online" | "offline";
  cron?: string;
}

interface TriggerGroup {
  id: string;
  triggers: RuleTrigger[];
  logicOperator: "AND" | "OR";
}

interface RuleAction {
  id: string;
  type: "send_webhook" | "send_email" | "update_device" | "delay" | "log";
  webhookUrl?: string;
  method?: "GET" | "POST" | "PUT";
  recipient?: string;
  subject?: string;
  message?: string;
  targetDeviceId?: string;
  targetDeviceName?: string;
  targetField?: string;
  targetValue?: string | number | boolean;
  delaySeconds?: number;
}

// Trigger Templates
const TRIGGER_TYPES = [
  {
    value: "device_data",
    label: "Device Data",
    icon: Database,
    description: "When device field meets condition",
    color: "from-cyan-500 to-blue-500",
  },
  {
    value: "device_status",
    label: "Device Status",
    icon: Wifi,
    description: "When device goes online/offline",
    color: "from-green-500 to-emerald-500",
  },
  {
    value: "schedule",
    label: "Schedule",
    icon: Clock,
    description: "At specific times (cron)",
    color: "from-indigo-500 to-blue-500",
  },
];

const ACTION_TYPES = [
  {
    value: "send_webhook",
    label: "Call Webhook",
    icon: Webhook,
    description: "POST to external URL",
    color: "from-purple-500 to-indigo-500",
  },
  {
    value: "send_email",
    label: "Send Email",
    icon: Mail,
    description: "Email notification",
    color: "from-green-500 to-teal-500",
  },
  {
    value: "update_device",
    label: "Update Device",
    icon: Settings,
    description: "Set device field value",
    color: "from-blue-500 to-cyan-500",
  },
  {
    value: "delay",
    label: "Add Delay",
    icon: Clock,
    description: "Wait before next action",
    color: "from-gray-500 to-slate-500",
  },
  {
    value: "log",
    label: "Log Event",
    icon: Database,
    description: "Record to event log",
    color: "from-yellow-500 to-orange-500",
  },
];

const CONDITION_OPERATORS = [
  { value: "equals", label: "Equals (=)", symbol: "=" },
  { value: "not_equals", label: "Not Equals (!=)", symbol: "!=" },
  { value: "greater_than", label: "Greater Than (>)", symbol: ">" },
  { value: "greater_than_or_equal", label: "Greater or Equal (>=)", symbol: ">=" },
  { value: "less_than", label: "Less Than (<)", symbol: "<" },
  { value: "less_than_or_equal", label: "Less or Equal (<=)", symbol: "<=" },
];

// SWR fetchers
async function devicesFetcher([, token, workspaceSlug]: [string, string, string]) {
  return apiListDevices(token, workspaceSlug);
}

async function createAutomationFetcher(
  _key: string,
  { arg }: { arg: { token: string; workspaceSlug: string; payload: CreateAutomationPayload } }
) {
  return apiCreateAutomation(arg.token, arg.workspaceSlug, arg.payload);
}

async function updateAutomationFetcher(
  _key: string,
  { arg }: { arg: { token: string; workspaceSlug: string; automationId: string; payload: UpdateAutomationPayload } }
) {
  return apiUpdateAutomation(arg.token, arg.workspaceSlug, arg.automationId, arg.payload);
}

export interface AutomationFormProps {
  workspaceSlug: string;
  mode: "create" | "edit";
  automationId?: string;
  initialData?: Automation;
}

export function AutomationForm({ workspaceSlug, mode, automationId, initialData }: AutomationFormProps) {
  const router = useRouter();
  const { token } = useAuth();

  // Fetch devices list
  const { data: devicesData, isLoading: devicesLoading } = useSWR(
    token && workspaceSlug ? ["devices", token, workspaceSlug] : null,
    devicesFetcher
  );
  const devices = devicesData?.devices ?? [];

  // Cache for device details (with field mappings)
  const [deviceDetailsCache, setDeviceDetailsCache] = useState<Record<string, DeviceDetail>>({});
  const [loadingDeviceIds, setLoadingDeviceIds] = useState<Set<string>>(new Set());

  // Fetch device details when needed
  const fetchDeviceDetails = useCallback(async (deviceId: string) => {
    if (!token || !workspaceSlug || deviceDetailsCache[deviceId] || loadingDeviceIds.has(deviceId)) {
      return;
    }
    setLoadingDeviceIds((prev) => new Set(prev).add(deviceId));
    try {
      const details = await apiGetDevice(token, workspaceSlug, deviceId);
      setDeviceDetailsCache((prev) => ({ ...prev, [deviceId]: details }));
    } catch (error) {
      console.error("Failed to fetch device details:", error);
    } finally {
      setLoadingDeviceIds((prev) => {
        const next = new Set(prev);
        next.delete(deviceId);
        return next;
      });
    }
  }, [token, workspaceSlug, deviceDetailsCache, loadingDeviceIds]);

  // Create mutation
  const { trigger: triggerCreate, isMutating: isCreating } = useSWRMutation(
    "create-automation",
    createAutomationFetcher
  );

  // Update mutation
  const { trigger: triggerUpdate, isMutating: isUpdating } = useSWRMutation(
    "update-automation",
    updateAutomationFetcher
  );

  const isMutating = isCreating || isUpdating;

  // Initialize form state from initialData for edit mode
  const [ruleName, setRuleName] = useState(initialData?.name || "");
  const [ruleDescription, setRuleDescription] = useState(initialData?.description || "");
  const [triggerGroups, setTriggerGroups] = useState<TriggerGroup[]>(() => {
    if (initialData && initialData.triggerConfig) {
      return parseInitialTriggers(initialData);
    }
    return [{ id: "group-1", triggers: [], logicOperator: "AND" }];
  });
  const [groupsLogicOperator, setGroupsLogicOperator] = useState<"AND" | "OR">("OR");
  const [actions, setActions] = useState<RuleAction[]>(() => {
    if (initialData?.actions) {
      return parseInitialActions(initialData.actions);
    }
    return [];
  });
  const [showTriggerTypeSelector, setShowTriggerTypeSelector] = useState<string | null>(null);
  const [showActionTypeSelector, setShowActionTypeSelector] = useState(false);

  // Parse initial triggers from Automation
  function parseInitialTriggers(automation: Automation): TriggerGroup[] {
    const config = automation.triggerConfig;
    const triggers: RuleTrigger[] = [];

    if (config.type === "device_data") {
      const dataConfig = config as DeviceDataTriggerConfig;
      for (const cond of dataConfig.conditions) {
        triggers.push({
          id: `trigger-${Date.now()}-${Math.random()}`,
          type: "device_data",
          deviceId: dataConfig.deviceId,
          field: cond.field,
          condition: cond.operator,
          value: cond.value as string | number | boolean,
        });
      }
      return [{
        id: "group-1",
        triggers,
        logicOperator: dataConfig.logic || "AND",
      }];
    }

    if (config.type === "device_status") {
      const statusConfig = config as DeviceStatusTriggerConfig;
      triggers.push({
        id: `trigger-${Date.now()}`,
        type: "device_status",
        deviceId: statusConfig.deviceId,
        status: statusConfig.status,
      });
      return [{ id: "group-1", triggers, logicOperator: "AND" }];
    }

    if (config.type === "schedule") {
      const schedConfig = config as ScheduleTriggerConfig;
      triggers.push({
        id: `trigger-${Date.now()}`,
        type: "schedule",
        cron: schedConfig.cron,
      });
      return [{ id: "group-1", triggers, logicOperator: "AND" }];
    }

    return [{ id: "group-1", triggers: [], logicOperator: "AND" }];
  }

  // Parse initial actions from Automation
  function parseInitialActions(actionConfigs: AutomationActionConfig[]): RuleAction[] {
    return actionConfigs.map((ac, idx): RuleAction => {
      const base: RuleAction = {
        id: `action-${Date.now()}-${idx}`,
        type: ac.type as RuleAction["type"],
      };

      if (ac.type === "send_webhook") {
        return { ...base, webhookUrl: ac.url, method: ac.method as "GET" | "POST" | "PUT" || "POST" };
      }
      if (ac.type === "send_email") {
        return { ...base, recipient: ac.to, subject: ac.subject, message: ac.body };
      }
      if (ac.type === "update_device") {
        return {
          ...base,
          targetDeviceId: ac.targetDeviceId,
          targetField: ac.field,
          targetValue: ac.value as string | number | boolean,
        };
      }
      if (ac.type === "delay") {
        return { ...base, delaySeconds: ac.delaySeconds };
      }
      if (ac.type === "log") {
        return { ...base, message: ac.message };
      }
      return base;
    });
  }

  // Load device details for initial data
  useEffect(() => {
    if (initialData && token) {
      // Collect all device IDs that need to be fetched
      const deviceIds = new Set<string>();

      if (initialData.triggerConfig?.type === "device_data" || initialData.triggerConfig?.type === "device_status") {
        const config = initialData.triggerConfig as DeviceDataTriggerConfig | DeviceStatusTriggerConfig;
        if (config.deviceId) deviceIds.add(config.deviceId);
      }

      for (const action of initialData.actions ?? []) {
        if (action.type === "update_device" && action.targetDeviceId) {
          deviceIds.add(action.targetDeviceId);
        }
      }

      // Fetch all device details
      for (const deviceId of deviceIds) {
        fetchDeviceDetails(deviceId);
      }
    }
  }, [initialData, token, fetchDeviceDetails]);

  // Get field mappings for a device
  const getFieldMappings = useCallback((deviceId: string | undefined) => {
    if (!deviceId) return [];
    const details = deviceDetailsCache[deviceId];
    return details?.fieldMappings ?? [];
  }, [deviceDetailsCache]);

  // Detect potential infinite loops
  const getMonitoredFields = useCallback(() => {
    const monitored: Array<{ deviceId: string; field: string; deviceName?: string }> = [];
    for (const group of triggerGroups) {
      for (const trigger of group.triggers) {
        if (trigger.type === "device_data" && trigger.deviceId && trigger.field) {
          monitored.push({
            deviceId: trigger.deviceId,
            field: trigger.field,
            deviceName: trigger.deviceName,
          });
        }
      }
    }
    return monitored;
  }, [triggerGroups]);

  const checkActionLoop = useCallback((action: RuleAction): { hasLoop: boolean; message: string } | null => {
    if (action.type !== "update_device" || !action.targetDeviceId || !action.targetField) {
      return null;
    }

    const monitored = getMonitoredFields();
    const conflict = monitored.find(
      (m) => m.deviceId === action.targetDeviceId && m.field === action.targetField
    );

    if (conflict) {
      const deviceName = conflict.deviceName || "this device";
      return {
        hasLoop: true,
        message: `Warning: This action updates "${action.targetField}" on ${deviceName}, which is also being monitored by a trigger. This may cause an infinite loop.`,
      };
    }

    return null;
  }, [getMonitoredFields]);

  const getLoopWarnings = useCallback(() => {
    const warnings: string[] = [];
    for (const action of actions) {
      const loopCheck = checkActionLoop(action);
      if (loopCheck?.hasLoop) {
        warnings.push(loopCheck.message);
      }
    }
    return warnings;
  }, [actions, checkActionLoop]);

  // Trigger Group Management
  const addTriggerGroup = () => {
    const newGroup: TriggerGroup = {
      id: `group-${Date.now()}`,
      triggers: [],
      logicOperator: "AND",
    };
    setTriggerGroups([...triggerGroups, newGroup]);
  };

  const removeTriggerGroup = (groupId: string) => {
    if (triggerGroups.length <= 1) return;
    setTriggerGroups(triggerGroups.filter((g) => g.id !== groupId));
  };

  const updateGroupOperator = (groupId: string, operator: "AND" | "OR") => {
    setTriggerGroups(triggerGroups.map((g) => (g.id === groupId ? { ...g, logicOperator: operator } : g)));
  };

  // Trigger Management
  const addTrigger = (groupId: string, type: string) => {
    const newTrigger: RuleTrigger = {
      id: `trigger-${Date.now()}`,
      type: type as RuleTrigger["type"],
      condition: type === "device_data" ? "greater_than" : undefined,
      status: type === "device_status" ? "offline" : undefined,
    };
    setTriggerGroups(triggerGroups.map((g) =>
      g.id === groupId ? { ...g, triggers: [...g.triggers, newTrigger] } : g
    ));
    setShowTriggerTypeSelector(null);
  };

  const removeTrigger = (groupId: string, triggerId: string) => {
    setTriggerGroups(triggerGroups.map((g) =>
      g.id === groupId ? { ...g, triggers: g.triggers.filter((t) => t.id !== triggerId) } : g
    ));
  };

  const updateTrigger = (groupId: string, triggerId: string, updates: Partial<RuleTrigger>) => {
    setTriggerGroups(triggerGroups.map((g) =>
      g.id === groupId
        ? { ...g, triggers: g.triggers.map((t) => (t.id === triggerId ? { ...t, ...updates } : t)) }
        : g
    ));

    if (updates.deviceId && !deviceDetailsCache[updates.deviceId]) {
      fetchDeviceDetails(updates.deviceId);
    }
  };

  // Action Management
  const addAction = (type: string) => {
    const newAction: RuleAction = {
      id: `action-${Date.now()}`,
      type: type as RuleAction["type"],
    };
    setActions([...actions, newAction]);
    setShowActionTypeSelector(false);
  };

  const removeAction = (actionId: string) => {
    setActions(actions.filter((a) => a.id !== actionId));
  };

  const updateAction = (actionId: string, updates: Partial<RuleAction>) => {
    setActions(actions.map((a) => (a.id === actionId ? { ...a, ...updates } : a)));

    if (updates.targetDeviceId && !deviceDetailsCache[updates.targetDeviceId]) {
      fetchDeviceDetails(updates.targetDeviceId);
    }
  };

  const moveAction = (index: number, direction: "up" | "down") => {
    const newActions = [...actions];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < actions.length) {
      [newActions[index], newActions[newIndex]] = [newActions[newIndex], newActions[index]];
      setActions(newActions);
    }
  };

  // Build API payload from form data
  const buildTriggerConfig = useCallback((): { config: AutomationTriggerConfig; type: string } | null => {
    const activeGroup = triggerGroups.find((g) => g.triggers.length > 0);
    if (!activeGroup) return null;

    const firstTrigger = activeGroup.triggers[0];

    if (firstTrigger.type === "device_data") {
      const allConditions: { field: string; operator: string; value: unknown }[] = [];

      for (const group of triggerGroups) {
        for (const t of group.triggers) {
          if (t.type === "device_data" && t.deviceId && t.field && t.condition) {
            allConditions.push({
              field: t.field,
              operator: t.condition,
              value: t.value,
            });
          }
        }
      }

      if (allConditions.length === 0) return null;

      const config: DeviceDataTriggerConfig = {
        type: "device_data",
        deviceId: firstTrigger.deviceId!,
        logic: activeGroup.logicOperator,
        conditions: allConditions.map((c) => ({
          field: c.field,
          operator: c.operator as DeviceDataTriggerConfig["conditions"][0]["operator"],
          value: c.value,
        })),
      };
      return { config, type: "device_data" };
    }

    if (firstTrigger.type === "device_status") {
      if (!firstTrigger.deviceId || !firstTrigger.status) return null;
      const config: DeviceStatusTriggerConfig = {
        type: "device_status",
        deviceId: firstTrigger.deviceId,
        status: firstTrigger.status,
      };
      return { config, type: "device_status" };
    }

    if (firstTrigger.type === "schedule") {
      if (!firstTrigger.cron) return null;
      const config: ScheduleTriggerConfig = {
        type: "schedule",
        cron: firstTrigger.cron,
      };
      return { config, type: "schedule" };
    }

    return null;
  }, [triggerGroups]);

  const buildActions = useCallback((): AutomationActionConfig[] => {
    return actions
      .map((a): AutomationActionConfig | null => {
        if (a.type === "send_webhook" && a.webhookUrl) {
          return {
            type: "send_webhook",
            url: a.webhookUrl,
            method: a.method || "POST",
          };
        }
        if (a.type === "send_email" && a.recipient && a.subject) {
          return {
            type: "send_email",
            to: a.recipient,
            subject: a.subject,
            body: a.message || "",
          };
        }
        if (a.type === "update_device" && a.targetDeviceId && a.targetField) {
          return {
            type: "update_device",
            targetDeviceId: a.targetDeviceId,
            field: a.targetField,
            value: a.targetValue,
          };
        }
        if (a.type === "delay" && a.delaySeconds) {
          return {
            type: "delay",
            delaySeconds: a.delaySeconds,
          };
        }
        if (a.type === "log" && a.message) {
          return {
            type: "log",
            message: a.message,
          };
        }
        return null;
      })
      .filter((a): a is AutomationActionConfig => a !== null);
  }, [actions]);

  // Save Rule
  const handleSaveRule = async () => {
    if (!token) {
      toast.error("Not authenticated");
      return;
    }

    if (!ruleName.trim()) {
      toast.error("Please enter a rule name");
      return;
    }

    const hasTriggers = triggerGroups.some((g) => g.triggers.length > 0);
    if (!hasTriggers) {
      toast.error("Please add at least one trigger");
      return;
    }

    if (actions.length === 0) {
      toast.error("Please add at least one action");
      return;
    }

    const triggerResult = buildTriggerConfig();
    if (!triggerResult) {
      toast.error("Please complete trigger configuration");
      return;
    }

    const actionConfigs = buildActions();
    if (actionConfigs.length === 0) {
      toast.error("Please complete action configuration");
      return;
    }

    try {
      if (mode === "create") {
        const payload: CreateAutomationPayload = {
          name: ruleName.trim(),
          description: ruleDescription.trim() || undefined,
          triggerType: triggerResult.type as CreateAutomationPayload["triggerType"],
          triggerConfig: triggerResult.config,
          actions: actionConfigs,
        };
        await triggerCreate({ token, workspaceSlug, payload });
        toast.success("Automation created successfully!");
      } else {
        const payload: UpdateAutomationPayload = {
          name: ruleName.trim(),
          description: ruleDescription.trim() || undefined,
          triggerType: triggerResult.type as UpdateAutomationPayload["triggerType"],
          triggerConfig: triggerResult.config,
          actions: actionConfigs,
        };
        await triggerUpdate({ token, workspaceSlug, automationId: automationId!, payload });
        toast.success("Automation updated successfully!");
      }
      router.push(`/${workspaceSlug}/automations`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${mode} automation`);
    }
  };

  // Render Trigger Card
  const renderTriggerCard = (groupId: string, trigger: RuleTrigger) => {
    const triggerType = TRIGGER_TYPES.find((t) => t.value === trigger.type);
    const Icon = triggerType?.icon || Activity;
    const fieldMappings = getFieldMappings(trigger.deviceId);
    const isLoadingFields = trigger.deviceId ? loadingDeviceIds.has(trigger.deviceId) : false;

    return (
      <Card key={trigger.id} className="border-2 border-gray-200 hover:border-blue-300 transition-all">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${triggerType?.color} flex items-center justify-center shadow-md`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-semibold">
                  {triggerType?.label}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTrigger(groupId, trigger.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Device Data Trigger */}
              {trigger.type === "device_data" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Device</Label>
                      <Select
                        value={trigger.deviceId || ""}
                        onValueChange={(value) => {
                          const device = devices.find((d) => d.deviceId === value);
                          updateTrigger(groupId, trigger.id, {
                            deviceId: value,
                            deviceName: device?.name,
                            field: "",
                          });
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select device" />
                        </SelectTrigger>
                        <SelectContent>
                          {devices.map((device) => (
                            <SelectItem key={device.deviceId} value={device.deviceId}>
                              {device.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Field</Label>
                      {isLoadingFields ? (
                        <div className="h-9 flex items-center gap-2 px-3 border rounded-md bg-gray-50">
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          <span className="text-xs text-gray-500">Loading fields...</span>
                        </div>
                      ) : fieldMappings.length > 0 ? (
                        <Select
                          value={trigger.field || ""}
                          onValueChange={(value) => updateTrigger(groupId, trigger.id, { field: value })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldMappings.map((fm) => (
                              <SelectItem key={fm.sourceField} value={fm.sourceField}>
                                {fm.displayLabel}
                                <span className="ml-2 text-[10px] text-gray-500 uppercase">
                                  ({fm.dataType})
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          placeholder={trigger.deviceId ? "No field mappings - enter field key" : "Select device first"}
                          value={trigger.field || ""}
                          onChange={(e) => updateTrigger(groupId, trigger.id, { field: e.target.value })}
                          className="h-9 font-mono text-sm"
                          disabled={!trigger.deviceId}
                        />
                      )}
                    </div>
                  </div>
                  {(() => {
                    const selectedFieldMapping = fieldMappings.find((fm) => fm.sourceField === trigger.field);
                    const fieldType = selectedFieldMapping?.dataType || "number";
                    const isBooleanField = fieldType === "boolean";
                    const isNumberField = fieldType === "number";

                    const booleanConditions = [
                      { value: "equals", label: "Is", symbol: "=" },
                      { value: "not_equals", label: "Is Not", symbol: "!=" },
                    ];

                    return (
                      <>
                        <div className={`grid gap-3 ${isBooleanField ? "grid-cols-1" : "grid-cols-2"}`}>
                          {!isBooleanField && (
                            <div className="space-y-2">
                              <Label className="text-xs">Condition</Label>
                              <Select
                                value={trigger.condition || ""}
                                onValueChange={(value) => updateTrigger(groupId, trigger.id, { condition: value })}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CONDITION_OPERATORS.map((op) => (
                                    <SelectItem key={op.value} value={op.value}>
                                      {op.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label className="text-xs">Value</Label>
                            {isBooleanField ? (
                              <div className="flex items-center gap-4 h-9">
                                <div className="flex items-center gap-3 p-2 border rounded-lg bg-gray-50 flex-1">
                                  <span className={`text-sm font-medium ${trigger.value === false ? "text-gray-900" : "text-gray-400"}`}>
                                    Off
                                  </span>
                                  <Switch
                                    checked={trigger.value === true}
                                    onCheckedChange={(checked) => {
                                      updateTrigger(groupId, trigger.id, {
                                        value: checked,
                                        condition: "equals",
                                      });
                                    }}
                                  />
                                  <span className={`text-sm font-medium ${trigger.value === true ? "text-gray-900" : "text-gray-400"}`}>
                                    On
                                  </span>
                                </div>
                                <Select
                                  value={trigger.condition || "equals"}
                                  onValueChange={(value) => updateTrigger(groupId, trigger.id, { condition: value })}
                                >
                                  <SelectTrigger className="h-9 w-28">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {booleanConditions.map((op) => (
                                      <SelectItem key={op.value} value={op.value}>
                                        {op.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : isNumberField ? (
                              <Input
                                type="number"
                                placeholder="e.g., 30"
                                value={trigger.value as number ?? ""}
                                onChange={(e) => updateTrigger(groupId, trigger.id, { value: parseFloat(e.target.value) })}
                                className="h-9"
                              />
                            ) : (
                              <Input
                                type="text"
                                placeholder="Enter value"
                                value={trigger.value?.toString() || ""}
                                onChange={(e) => updateTrigger(groupId, trigger.id, { value: e.target.value })}
                                className="h-9"
                              />
                            )}
                          </div>
                        </div>
                        {trigger.deviceId && trigger.field && trigger.condition && (
                          <div className="p-2 bg-cyan-50 border border-cyan-200 rounded-lg">
                            <p className="text-xs text-cyan-900">
                              <span className="font-semibold">Preview:</span> When{" "}
                              <span className="font-mono bg-cyan-100 px-1 py-0.5 rounded">{trigger.field}</span>{" "}
                              {isBooleanField
                                ? `${trigger.condition === "not_equals" ? "is not" : "is"} `
                                : `${CONDITION_OPERATORS.find((c) => c.value === trigger.condition)?.symbol || ""} `}
                              <span className="font-semibold">
                                {isBooleanField
                                  ? trigger.value === true
                                    ? "ON (true)"
                                    : "OFF (false)"
                                  : String(trigger.value)}
                              </span>
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Device Status Trigger */}
              {trigger.type === "device_status" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Device</Label>
                      <Select
                        value={trigger.deviceId || ""}
                        onValueChange={(value) => {
                          const device = devices.find((d) => d.deviceId === value);
                          updateTrigger(groupId, trigger.id, { deviceId: value, deviceName: device?.name });
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select device" />
                        </SelectTrigger>
                        <SelectContent>
                          {devices.map((device) => (
                            <SelectItem key={device.deviceId} value={device.deviceId}>
                              {device.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Status Change</Label>
                      <Select
                        value={trigger.status || ""}
                        onValueChange={(value) => updateTrigger(groupId, trigger.id, { status: value as "online" | "offline" })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="online">Goes Online</SelectItem>
                          <SelectItem value="offline">Goes Offline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule Trigger */}
              {trigger.type === "schedule" && (
                <div className="space-y-2">
                  <Label className="text-xs">Cron Expression</Label>
                  <Input
                    placeholder="e.g., 0 9 * * * (every day at 9am)"
                    value={trigger.cron || ""}
                    onChange={(e) => updateTrigger(groupId, trigger.id, { cron: e.target.value })}
                    className="h-9 font-mono"
                  />
                  <p className="text-xs text-gray-500">
                    Format: minute hour day month weekday (e.g., &quot;0 9 * * 1-5&quot; = weekdays at 9am)
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render Action Card
  const renderActionCard = (action: RuleAction, index: number) => {
    const actionType = ACTION_TYPES.find((a) => a.value === action.type);
    const Icon = actionType?.icon || Zap;
    const targetFieldMappings = getFieldMappings(action.targetDeviceId);
    const isLoadingTargetFields = action.targetDeviceId ? loadingDeviceIds.has(action.targetDeviceId) : false;

    return (
      <Card key={action.id} className="border-2 border-gray-200 hover:border-purple-300 transition-all">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${actionType?.color} flex items-center justify-center shadow-md`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveAction(index, "up")}
                  disabled={index === 0}
                  className="h-6 w-6 p-0"
                >
                  <ChevronUp className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveAction(index, "down")}
                  disabled={index === actions.length - 1}
                  className="h-6 w-6 p-0"
                >
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-semibold">
                  {actionType?.label}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAction(action.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Webhook Action */}
              {action.type === "send_webhook" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Webhook URL</Label>
                    <Input
                      placeholder="https://api.example.com/webhook"
                      value={action.webhookUrl || ""}
                      onChange={(e) => updateAction(action.id, { webhookUrl: e.target.value })}
                      className="h-9 font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Method</Label>
                    <Select
                      value={action.method || "POST"}
                      onValueChange={(value) => updateAction(action.id, { method: value as "GET" | "POST" | "PUT" })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Email Action */}
              {action.type === "send_email" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Recipient Email</Label>
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      value={action.recipient || ""}
                      onChange={(e) => updateAction(action.id, { recipient: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Subject</Label>
                    <Input
                      placeholder="Alert: Temperature exceeded"
                      value={action.subject || ""}
                      onChange={(e) => updateAction(action.id, { subject: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Message</Label>
                    <Textarea
                      placeholder="Email body..."
                      value={action.message || ""}
                      onChange={(e) => updateAction(action.id, { message: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Update Device Action */}
              {action.type === "update_device" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Target Device</Label>
                      <Select
                        value={action.targetDeviceId || ""}
                        onValueChange={(value) => {
                          const device = devices.find((d) => d.deviceId === value);
                          updateAction(action.id, {
                            targetDeviceId: value,
                            targetDeviceName: device?.name,
                            targetField: "",
                          });
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select device" />
                        </SelectTrigger>
                        <SelectContent>
                          {devices.map((device) => (
                            <SelectItem key={device.deviceId} value={device.deviceId}>
                              {device.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Field</Label>
                      {isLoadingTargetFields ? (
                        <div className="h-9 flex items-center gap-2 px-3 border rounded-md bg-gray-50">
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          <span className="text-xs text-gray-500">Loading fields...</span>
                        </div>
                      ) : targetFieldMappings.length > 0 ? (
                        <Select
                          value={action.targetField || ""}
                          onValueChange={(value) => updateAction(action.id, { targetField: value })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {targetFieldMappings.map((fm) => (
                              <SelectItem key={fm.sourceField} value={fm.sourceField}>
                                {fm.displayLabel}
                                <span className="ml-2 text-[10px] text-gray-500 uppercase">
                                  ({fm.dataType})
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          placeholder={action.targetDeviceId ? "Enter field key" : "Select device first"}
                          value={action.targetField || ""}
                          onChange={(e) => updateAction(action.id, { targetField: e.target.value })}
                          className="h-9 font-mono text-sm"
                          disabled={!action.targetDeviceId}
                        />
                      )}
                    </div>
                  </div>
                  {(() => {
                    const selectedTargetField = targetFieldMappings.find((fm) => fm.sourceField === action.targetField);
                    const targetFieldType = selectedTargetField?.dataType || "string";
                    const isTargetBoolean = targetFieldType === "boolean";
                    const isTargetNumber = targetFieldType === "number";

                    return (
                      <div className="space-y-2">
                        <Label className="text-xs">Value</Label>
                        {isTargetBoolean ? (
                          <div className="flex items-center gap-3 h-9 p-2 border rounded-lg bg-gray-50">
                            <span className={`text-sm font-medium ${action.targetValue === false ? "text-gray-900" : "text-gray-400"}`}>
                              Off
                            </span>
                            <Switch
                              checked={action.targetValue === true}
                              onCheckedChange={(checked) => {
                                updateAction(action.id, { targetValue: checked });
                              }}
                            />
                            <span className={`text-sm font-medium ${action.targetValue === true ? "text-gray-900" : "text-gray-400"}`}>
                              On
                            </span>
                            <span className="ml-auto text-xs text-gray-500">
                              ({action.targetValue === true ? "true" : "false"})
                            </span>
                          </div>
                        ) : isTargetNumber ? (
                          <Input
                            type="number"
                            placeholder="Enter number value"
                            value={action.targetValue as number ?? ""}
                            onChange={(e) => updateAction(action.id, { targetValue: parseFloat(e.target.value) })}
                            className="h-9"
                          />
                        ) : (
                          <Input
                            placeholder="Value to set"
                            value={action.targetValue?.toString() || ""}
                            onChange={(e) => updateAction(action.id, { targetValue: e.target.value })}
                            className="h-9"
                          />
                        )}
                      </div>
                    );
                  })()}
                  {/* Loop Warning */}
                  {(() => {
                    const loopCheck = checkActionLoop(action);
                    if (loopCheck?.hasLoop) {
                      return (
                        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-amber-800">Potential Infinite Loop</p>
                            <p className="text-xs text-amber-700 mt-1">
                              This action updates a field that is being monitored by a trigger.
                              This may cause the rule to trigger itself repeatedly.
                            </p>
                            <p className="text-xs text-amber-600 mt-2 font-medium">
                              Tip: Consider using a different field, or add conditions to prevent re-triggering.
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {/* Delay Action */}
              {action.type === "delay" && (
                <div className="space-y-2">
                  <Label className="text-xs">Delay Duration (seconds)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 10"
                    value={action.delaySeconds || ""}
                    onChange={(e) => updateAction(action.id, { delaySeconds: parseInt(e.target.value) })}
                    className="h-9"
                  />
                </div>
              )}

              {/* Log Action */}
              {action.type === "log" && (
                <div className="space-y-2">
                  <Label className="text-xs">Log Message</Label>
                  <Input
                    placeholder="Log entry message..."
                    value={action.message || ""}
                    onChange={(e) => updateAction(action.id, { message: e.target.value })}
                    className="h-9"
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (devicesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-sm text-gray-600">Loading devices...</span>
        </div>
      </div>
    );
  }

  const totalTriggers = triggerGroups.reduce((sum, g) => sum + g.triggers.length, 0);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveRule();
  };

  return (
    <form id="automation-form" onSubmit={handleFormSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Rule Info & Preview */}
      <div className="space-y-6">
        {/* Basic Info */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-600" />
              Rule Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Rule Name *</Label>
              <Input
                id="rule-name"
                placeholder="e.g., Temperature Alert System"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-description">Description</Label>
              <Textarea
                id="rule-description"
                placeholder="What does this rule do?"
                value={ruleDescription}
                onChange={(e) => setRuleDescription(e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Visual Preview */}
        <Card className="border-2 border-purple-200 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Rule Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-2">Name</p>
              <p className="font-semibold text-gray-900">
                {ruleName || <span className="text-gray-400">Not set</span>}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-gray-500 mb-2">Trigger Groups</p>
              <p className="text-sm font-semibold text-gray-900">
                {totalTriggers} trigger(s) in {triggerGroups.length} group(s)
              </p>
              {triggerGroups.length > 1 && (
                <p className="text-xs text-gray-500 mt-1">
                  Groups connected with{" "}
                  <Badge variant="outline" className="ml-1">
                    {groupsLogicOperator}
                  </Badge>
                </p>
              )}
            </div>
            <Separator />
            <div>
              <p className="text-xs text-gray-500 mb-2">Actions</p>
              <p className="text-sm font-semibold text-gray-900">{actions.length} action(s) configured</p>
            </div>
            {/* Loop Warnings in Summary */}
            {(() => {
              const warnings = getLoopWarnings();
              if (warnings.length > 0) {
                return (
                  <>
                    <Separator />
                    <div className="p-3 bg-amber-100 border border-amber-300 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <p className="text-xs font-bold text-amber-800">
                          {warnings.length} Loop Warning{warnings.length > 1 ? "s" : ""}
                        </p>
                      </div>
                      <p className="text-xs text-amber-700">
                        Some actions may cause infinite loops. Review the warnings in the Actions section.
                      </p>
                    </div>
                  </>
                );
              }
              return null;
            })()}
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="border border-blue-200 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="w-5 h-5 text-blue-600" />
              Logic Operators
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">AND</h4>
              <p className="text-xs text-gray-600">All conditions must be true to trigger</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">OR</h4>
              <p className="text-xs text-gray-600">Any condition can trigger the rule</p>
            </div>
            <Separator />
            <div className="text-xs text-gray-600">
              <p className="font-semibold mb-1">Example:</p>
              <code className="bg-gray-900 text-green-400 p-2 rounded block text-xs">
                {`(Temp > 30 AND Humidity > 70)`}
                <br />
                OR
                <br />
                {`(Motion Detected)`}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Save Button (Mobile) */}
        <div className="lg:hidden">
          <Button
            onClick={handleSaveRule}
            disabled={isMutating}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2 shadow-md"
          >
            {isMutating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {mode === "create" ? "Create Rule" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Right Column - Triggers & Actions */}
      <div className="lg:col-span-2 space-y-6">
        {/* Triggers Section */}
        <Card className="border-2 border-blue-200 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-blue-600" />
                  Trigger Conditions
                </CardTitle>
                <CardDescription className="mt-1">Define when this rule should activate</CardDescription>
              </div>
              <Button
                onClick={addTriggerGroup}
                variant="outline"
                size="sm"
                className="gap-2 border-blue-300 hover:bg-blue-100"
              >
                <Plus className="w-4 h-4" />
                Add Group
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {triggerGroups.map((group, groupIndex) => (
                <div key={group.id}>
                  {/* Group Separator with Operator */}
                  {groupIndex > 0 && (
                    <div className="flex items-center gap-3 my-6">
                      <Separator className="flex-1" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setGroupsLogicOperator(groupsLogicOperator === "AND" ? "OR" : "AND")}
                        className="gap-2 font-bold border-2 border-purple-300 bg-purple-50 hover:bg-purple-100"
                      >
                        <Shuffle className="w-4 h-4" />
                        {groupsLogicOperator}
                      </Button>
                      <Separator className="flex-1" />
                    </div>
                  )}

                  {/* Trigger Group Card */}
                  <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50/50 rounded-2xl border-2 border-dashed border-blue-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-sm font-bold">
                          Group {groupIndex + 1}
                        </Badge>
                        {group.triggers.length > 1 && (
                          <>
                            <span className="text-gray-400">&#x2022;</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateGroupOperator(group.id, group.logicOperator === "AND" ? "OR" : "AND")
                              }
                              className="h-7 px-2 text-xs font-bold border-blue-300"
                            >
                              <Link2 className="w-3 h-3 mr-1" />
                              {group.logicOperator}
                            </Button>
                          </>
                        )}
                      </div>
                      {triggerGroups.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTriggerGroup(group.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {group.triggers.map((trigger, triggerIndex) => (
                        <div key={trigger.id}>
                          {triggerIndex > 0 && (
                            <div className="flex items-center gap-2 my-2 ml-12">
                              <div className="w-full h-px bg-gradient-to-r from-blue-300 via-blue-400 to-blue-300" />
                              <Badge className="bg-blue-500 text-white font-bold text-xs px-2">
                                {group.logicOperator}
                              </Badge>
                              <div className="w-full h-px bg-gradient-to-r from-blue-300 via-blue-400 to-blue-300" />
                            </div>
                          )}
                          {renderTriggerCard(group.id, trigger)}
                        </div>
                      ))}

                      {/* Add Trigger Button */}
                      {showTriggerTypeSelector === group.id ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                          {TRIGGER_TYPES.map((type) => {
                            const TypeIcon = type.icon;
                            return (
                              <button
                                key={type.value}
                                onClick={() => addTrigger(group.id, type.value)}
                                className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
                              >
                                <div
                                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}
                                >
                                  <TypeIcon className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-sm font-semibold text-gray-900">{type.label}</div>
                                <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <Button
                          onClick={() => setShowTriggerTypeSelector(group.id)}
                          variant="outline"
                          className="w-full gap-2 border-dashed border-2 border-blue-300 hover:bg-blue-50"
                        >
                          <Plus className="w-4 h-4" />
                          Add Trigger to Group {groupIndex + 1}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions Section */}
        <Card className="border-2 border-purple-200 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                Actions
              </CardTitle>
              <CardDescription className="mt-1">
                What should happen when triggered (executed in order)
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {actions.map((action, index) => (
                <div key={action.id}>
                  {index > 0 && (
                    <div className="flex items-center justify-center my-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-px bg-purple-300" />
                        <ArrowRight className="w-4 h-4 text-purple-500" />
                        <div className="w-8 h-px bg-purple-300" />
                      </div>
                    </div>
                  )}
                  {renderActionCard(action, index)}
                </div>
              ))}

              {/* Add Action Button */}
              {showActionTypeSelector ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ACTION_TYPES.map((type) => {
                    const TypeIcon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => addAction(type.value)}
                        className="p-4 border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all text-left group"
                      >
                        <div
                          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}
                        >
                          <TypeIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-sm font-semibold text-gray-900">{type.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Button
                  onClick={() => setShowActionTypeSelector(true)}
                  variant="outline"
                  className="w-full gap-2 border-dashed border-2 border-purple-300 hover:bg-purple-50"
                >
                  <Plus className="w-4 h-4" />
                  Add Action
                </Button>
              )}

              {actions.length === 0 && !showActionTypeSelector && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                  <Zap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 mb-4">No actions configured yet</p>
                  <Button onClick={() => setShowActionTypeSelector(true)} variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Your First Action
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mutating overlay */}
      {isMutating && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3 shadow-xl">
            <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            <span className="text-sm font-medium">{mode === "create" ? "Creating" : "Updating"} automation...</span>
          </div>
        </div>
      )}
    </form>
  );
}
