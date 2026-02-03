"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Zap, Trash2, Bell, Clock, Thermometer,
  Droplet, Power, Activity, Settings, Wifi,
  Webhook, Mail, Database, ArrowRight,
  GitBranch, Save, X, ChevronDown, ChevronUp,
  Shuffle, Link2, Sparkles, Info, GripVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { mockWorkspaces } from "@/data/mockData";

// Types
interface RuleTrigger {
  id: string;
  type: 'device_data_stream' | 'device_sensor' | 'device_state' | 'schedule' | 'webhook' | 'device_event';
  deviceId?: string;
  deviceName?: string;
  sensorField?: string;
  condition?: string;
  value?: number | string | boolean;
  value2?: number | string;
  schedule?: string;
  eventType?: string;
  jsonPath?: string;
  dataFilter?: 'all' | 'changed_only';
}

interface TriggerGroup {
  id: string;
  triggers: RuleTrigger[];
  logicOperator: 'AND' | 'OR';
}

interface RuleAction {
  id: string;
  type: 'device_control' | 'notification' | 'webhook' | 'email' | 'delay' | 'log';
  deviceId?: string;
  deviceName?: string;
  command?: string;
  value?: any;
  message?: string;
  webhookUrl?: string;
  recipient?: string;
  delaySeconds?: number;
}

// Trigger Templates
const TRIGGER_TYPES = [
  {
    value: 'device_data_stream',
    label: 'Device Data Stream',
    icon: Database,
    description: 'Listen to real-time device data',
    color: 'from-cyan-500 to-blue-500'
  },
  {
    value: 'device_sensor',
    label: 'Device Sensor Value',
    icon: Thermometer,
    description: 'When sensor value meets condition',
    color: 'from-red-500 to-orange-500'
  },
  {
    value: 'device_state',
    label: 'Device Status',
    icon: Wifi,
    description: 'When device goes online/offline',
    color: 'from-green-500 to-emerald-500'
  },
  {
    value: 'device_event',
    label: 'Device Event',
    icon: Activity,
    description: 'On specific device events',
    color: 'from-purple-500 to-pink-500'
  },
  {
    value: 'schedule',
    label: 'Time Schedule',
    icon: Clock,
    description: 'At specific times/dates',
    color: 'from-indigo-500 to-blue-500'
  },
  {
    value: 'webhook',
    label: 'Webhook Trigger',
    icon: Webhook,
    description: 'From external webhook call',
    color: 'from-pink-500 to-rose-500'
  },
];

const ACTION_TYPES = [
  {
    value: 'device_control',
    label: 'Control Device',
    icon: Zap,
    description: 'Turn on/off or control device',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    value: 'notification',
    label: 'Send Notification',
    icon: Bell,
    description: 'Push notification to users',
    color: 'from-orange-500 to-amber-500'
  },
  {
    value: 'webhook',
    label: 'Call Webhook',
    icon: Webhook,
    description: 'POST to external URL',
    color: 'from-purple-500 to-indigo-500'
  },
  {
    value: 'email',
    label: 'Send Email',
    icon: Mail,
    description: 'Email notification',
    color: 'from-green-500 to-teal-500'
  },
  {
    value: 'delay',
    label: 'Add Delay',
    icon: Clock,
    description: 'Wait before next action',
    color: 'from-gray-500 to-slate-500'
  },
  {
    value: 'log',
    label: 'Log Event',
    icon: Database,
    description: 'Record to event log',
    color: 'from-yellow-500 to-orange-500'
  },
];

const SENSOR_CONDITIONS = [
  { value: 'equals', label: 'Equals (=)', symbol: '=' },
  { value: 'not_equals', label: 'Not Equals (!=)', symbol: '!=' },
  { value: 'greater_than', label: 'Greater Than (>)', symbol: '>' },
  { value: 'greater_or_equal', label: 'Greater or Equal (>=)', symbol: '>=' },
  { value: 'less_than', label: 'Less Than (<)', symbol: '<' },
  { value: 'less_or_equal', label: 'Less or Equal (<=)', symbol: '<=' },
  { value: 'between', label: 'Between', symbol: '<>' },
  { value: 'changed', label: 'Value Changed', symbol: '~' },
];

const DEVICE_STATE_CONDITIONS = [
  { value: 'online', label: 'Comes Online' },
  { value: 'offline', label: 'Goes Offline' },
  { value: 'state_changed', label: 'Status Changed' },
];

export function CreateRulePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params?.workspace as string;
  const workspace = mockWorkspaces.find(w => w.slug === workspaceSlug || w.id === workspaceSlug);

  const getDeviceForTrigger = (trigger: RuleTrigger) =>
    workspace?.devices.find(d => d.id === trigger.deviceId);

  const getFieldMappingsForTrigger = (trigger: RuleTrigger) => {
    const device = getDeviceForTrigger(trigger);
    return device?.fieldMappings ?? [];
  };

  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [triggerGroups, setTriggerGroups] = useState<TriggerGroup[]>([
    {
      id: 'group-1',
      triggers: [],
      logicOperator: 'AND'
    }
  ]);
  const [groupsLogicOperator, setGroupsLogicOperator] = useState<'AND' | 'OR'>('OR');
  const [actions, setActions] = useState<RuleAction[]>([]);
  const [showTriggerTypeSelector, setShowTriggerTypeSelector] = useState<string | null>(null);
  const [showActionTypeSelector, setShowActionTypeSelector] = useState(false);

  if (!workspace) {
    return <div className="text-center py-12"><p className="text-gray-600">Workspace not found</p></div>;
  }

  // Trigger Group Management
  const addTriggerGroup = () => {
    const newGroup: TriggerGroup = {
      id: `group-${Date.now()}`,
      triggers: [],
      logicOperator: 'AND'
    };
    setTriggerGroups([...triggerGroups, newGroup]);
  };

  const removeTriggerGroup = (groupId: string) => {
    setTriggerGroups(triggerGroups.filter(g => g.id !== groupId));
  };

  const updateGroupOperator = (groupId: string, operator: 'AND' | 'OR') => {
    setTriggerGroups(triggerGroups.map(g =>
      g.id === groupId ? { ...g, logicOperator: operator } : g
    ));
  };

  // Trigger Management
  const addTrigger = (groupId: string, type: string) => {
    const newTrigger: RuleTrigger = {
      id: `trigger-${Date.now()}`,
      type: type as RuleTrigger['type'],
      condition: type === 'device_sensor' ? 'greater_than' : 'online',
    };
    setTriggerGroups(triggerGroups.map(g =>
      g.id === groupId ? { ...g, triggers: [...g.triggers, newTrigger] } : g
    ));
    setShowTriggerTypeSelector(null);
  };

  const removeTrigger = (groupId: string, triggerId: string) => {
    setTriggerGroups(triggerGroups.map(g =>
      g.id === groupId ? { ...g, triggers: g.triggers.filter(t => t.id !== triggerId) } : g
    ));
  };

  const updateTrigger = (groupId: string, triggerId: string, updates: Partial<RuleTrigger>) => {
    setTriggerGroups(triggerGroups.map(g =>
      g.id === groupId ? {
        ...g,
        triggers: g.triggers.map(t => t.id === triggerId ? { ...t, ...updates } : t)
      } : g
    ));
  };

  // Action Management
  const addAction = (type: string) => {
    const newAction: RuleAction = {
      id: `action-${Date.now()}`,
      type: type as RuleAction['type'],
    };
    setActions([...actions, newAction]);
    setShowActionTypeSelector(false);
  };

  const removeAction = (actionId: string) => {
    setActions(actions.filter(a => a.id !== actionId));
  };

  const updateAction = (actionId: string, updates: Partial<RuleAction>) => {
    setActions(actions.map(a => a.id === actionId ? { ...a, ...updates } : a));
  };

  const moveAction = (index: number, direction: 'up' | 'down') => {
    const newActions = [...actions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < actions.length) {
      [newActions[index], newActions[newIndex]] = [newActions[newIndex], newActions[index]];
      setActions(newActions);
    }
  };

  // Save Rule
  const handleSaveRule = () => {
    if (!ruleName) {
      toast.error('Please enter a rule name');
      return;
    }

    const hasValidTriggers = triggerGroups.some(g => g.triggers.length > 0);
    if (!hasValidTriggers) {
      toast.error('Please add at least one trigger');
      return;
    }

    if (actions.length === 0) {
      toast.error('Please add at least one action');
      return;
    }

    toast.success('Rule created successfully!');
    router.push(`/${workspaceSlug}/automations`);
  };

  // Render Trigger Card
  const renderTriggerCard = (groupId: string, trigger: RuleTrigger) => {
    const triggerType = TRIGGER_TYPES.find(t => t.value === trigger.type);
    const Icon = triggerType?.icon || Activity;

    return (
      <Card key={trigger.id} className="border-2 border-gray-200 hover:border-blue-300 transition-all">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${triggerType?.color} flex items-center justify-center shadow-md`}>
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

              {/* Device Data Stream Trigger */}
              {trigger.type === 'device_data_stream' && (
                <div className="space-y-3">
                  <div className="p-3 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-200">
                    <p className="text-xs font-semibold text-cyan-900 mb-1">
                      Real-Time Data Listener
                    </p>
                    <p className="text-xs text-cyan-700">
                      This trigger activates when device sends data matching your condition.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Device</Label>
                      <Select
                        value={trigger.deviceId || ''}
                        onValueChange={(value) => {
                          const device = workspace.devices.find(d => d.id === value);
                          updateTrigger(groupId, trigger.id, {
                            deviceId: value,
                            deviceName: device?.name,
                            sensorField: '',
                          });
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select device" />
                        </SelectTrigger>
                        <SelectContent>
                          {workspace.devices.map(device => (
                            <SelectItem key={device.id} value={device.id}>
                              {device.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Listen Mode</Label>
                      <Select
                        value={trigger.dataFilter || 'all'}
                        onValueChange={(value: 'all' | 'changed_only') =>
                          updateTrigger(groupId, trigger.id, { dataFilter: value })
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Every Data Push</SelectItem>
                          <SelectItem value="changed_only">Only When Value Changes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {trigger.deviceId && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Field</Label>
                          <Select
                            value={trigger.sensorField || ''}
                            onValueChange={(value) => updateTrigger(groupId, trigger.id, { sensorField: value })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              {getFieldMappingsForTrigger(trigger).length === 0 && (
                                <SelectItem value="__no_fields__" disabled>
                                  No fields configured for this device
                                </SelectItem>
                              )}
                              {getFieldMappingsForTrigger(trigger).map((field) => (
                                <SelectItem key={field.fieldKey} value={field.fieldKey}>
                                  {field.label}
                                  <span className="ml-1 text-[10px] uppercase text-gray-500">
                                    • {field.type || 'numeric'}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Condition</Label>
                          <Select
                            value={trigger.condition || ''}
                            onValueChange={(value) => updateTrigger(groupId, trigger.id, { condition: value })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SENSOR_CONDITIONS.map(cond => (
                                <SelectItem key={cond.value} value={cond.value}>
                                  {cond.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Value</Label>
                          <Input
                            type="number"
                            placeholder="e.g., 30"
                            value={trigger.value as number || ''}
                            onChange={(e) => updateTrigger(groupId, trigger.id, { value: parseFloat(e.target.value) })}
                            className="h-9"
                          />
                        </div>
                      </div>

                      {trigger.sensorField && trigger.condition && (
                        <div className="p-2 bg-cyan-50 border border-cyan-200 rounded-lg">
                          <p className="text-xs text-cyan-900">
                            <span className="font-semibold">Preview:</span> When{' '}
                            <span className="font-mono bg-cyan-100 px-1 py-0.5 rounded">
                              {trigger.sensorField}
                            </span>
                            {' '}{SENSOR_CONDITIONS.find(c => c.value === trigger.condition)?.symbol || ''}{' '}
                            <span className="font-semibold">{trigger.value}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Device Sensor Trigger */}
              {trigger.type === 'device_sensor' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Device</Label>
                      <Select
                        value={trigger.deviceId || ''}
                        onValueChange={(value) => {
                          const device = workspace.devices.find(d => d.id === value);
                          updateTrigger(groupId, trigger.id, {
                            deviceId: value,
                            deviceName: device?.name,
                            sensorField: '',
                          });
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select device" />
                        </SelectTrigger>
                        <SelectContent>
                          {workspace.devices.map(device => (
                            <SelectItem key={device.id} value={device.id}>
                              {device.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Sensor Field</Label>
                      <Select
                        value={trigger.sensorField || ''}
                        onValueChange={(value) => updateTrigger(groupId, trigger.id, { sensorField: value })}
                        disabled={!trigger.deviceId}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={trigger.deviceId ? 'Select field' : 'Select device first'} />
                        </SelectTrigger>
                        <SelectContent>
                          {getFieldMappingsForTrigger(trigger).length === 0 && (
                            <SelectItem value="__no_fields__" disabled>
                              No fields configured for this device
                            </SelectItem>
                          )}
                          {getFieldMappingsForTrigger(trigger).map((field) => (
                            <SelectItem key={field.fieldKey} value={field.fieldKey}>
                              {field.label}
                              <span className="ml-1 text-[10px] uppercase text-gray-500">
                                • {field.type || 'numeric'}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Condition</Label>
                      <Select
                        value={trigger.condition || ''}
                        onValueChange={(value) => updateTrigger(groupId, trigger.id, { condition: value })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SENSOR_CONDITIONS.map(cond => (
                            <SelectItem key={cond.value} value={cond.value}>
                              {cond.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Value</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 30"
                        value={trigger.value as number || ''}
                        onChange={(e) => updateTrigger(groupId, trigger.id, { value: parseFloat(e.target.value) })}
                        className="h-9"
                      />
                    </div>
                  </div>
                  {trigger.deviceId && trigger.sensorField && (
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <span className="font-semibold">Preview:</span> When{' '}
                        <span className="font-mono bg-blue-100 px-1 py-0.5 rounded">
                          {trigger.sensorField}
                        </span>
                        {' '}{SENSOR_CONDITIONS.find(c => c.value === trigger.condition)?.symbol || ''}{' '}
                        <span className="font-semibold">{trigger.value}</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Device State Trigger */}
              {trigger.type === 'device_state' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Device</Label>
                      <Select
                        value={trigger.deviceId || ''}
                        onValueChange={(value) => {
                          const device = workspace.devices.find(d => d.id === value);
                          updateTrigger(groupId, trigger.id, {
                            deviceId: value,
                            deviceName: device?.name
                          });
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select device" />
                        </SelectTrigger>
                        <SelectContent>
                          {workspace.devices.map(device => (
                            <SelectItem key={device.id} value={device.id}>
                              {device.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">State Condition</Label>
                      <Select
                        value={trigger.condition || ''}
                        onValueChange={(value) => updateTrigger(groupId, trigger.id, { condition: value })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEVICE_STATE_CONDITIONS.map(cond => (
                            <SelectItem key={cond.value} value={cond.value}>
                              {cond.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule Trigger */}
              {trigger.type === 'schedule' && (
                <div className="space-y-2">
                  <Label className="text-xs">Schedule</Label>
                  <Input
                    placeholder="e.g., 09:00 daily, Every Monday at 10:00"
                    value={trigger.schedule || ''}
                    onChange={(e) => updateTrigger(groupId, trigger.id, { schedule: e.target.value })}
                    className="h-9"
                  />
                  <p className="text-xs text-gray-500">Format: HH:MM daily, Every [Day] at HH:MM, or Cron expression</p>
                </div>
              )}

              {/* Webhook Trigger */}
              {trigger.type === 'webhook' && (
                <div className="space-y-2">
                  <Label className="text-xs">Webhook Name/Path</Label>
                  <Input
                    placeholder="e.g., my-trigger"
                    value={trigger.eventType || ''}
                    onChange={(e) => updateTrigger(groupId, trigger.id, { eventType: e.target.value })}
                    className="h-9 font-mono"
                  />
                  <p className="text-xs text-gray-500">
                    Will create: <code className="bg-gray-100 px-1 py-0.5 rounded">/webhook/{trigger.eventType || 'name'}</code>
                  </p>
                </div>
              )}

              {/* Device Event Trigger */}
              {trigger.type === 'device_event' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Device</Label>
                      <Select
                        value={trigger.deviceId || ''}
                        onValueChange={(value) => {
                          const device = workspace.devices.find(d => d.id === value);
                          updateTrigger(groupId, trigger.id, {
                            deviceId: value,
                            deviceName: device?.name
                          });
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select device" />
                        </SelectTrigger>
                        <SelectContent>
                          {workspace.devices.map(device => (
                            <SelectItem key={device.id} value={device.id}>
                              {device.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Event Type</Label>
                      <Input
                        placeholder="e.g., motion_detected"
                        value={trigger.eventType || ''}
                        onChange={(e) => updateTrigger(groupId, trigger.id, { eventType: e.target.value })}
                        className="h-9"
                      />
                    </div>
                  </div>
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
    const actionType = ACTION_TYPES.find(a => a.value === action.type);
    const Icon = actionType?.icon || Zap;

    return (
      <Card key={action.id} className="border-2 border-gray-200 hover:border-purple-300 transition-all">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${actionType?.color} flex items-center justify-center shadow-md`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveAction(index, 'up')}
                  disabled={index === 0}
                  className="h-6 w-6 p-0"
                >
                  <ChevronUp className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveAction(index, 'down')}
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

              {/* Device Control Action */}
              {action.type === 'device_control' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Device</Label>
                    <Select
                      value={action.deviceId || ''}
                      onValueChange={(value) => {
                        const device = workspace.devices.find(d => d.id === value);
                        updateAction(action.id, {
                          deviceId: value,
                          deviceName: device?.name,
                          command: '',
                          value: undefined,
                        });
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select device" />
                      </SelectTrigger>
                      <SelectContent>
                        {workspace.devices.filter(d => d.controllable).map(device => (
                          <SelectItem key={device.id} value={device.id}>
                            {device.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {action.deviceId && (
                    <div className="space-y-2">
                      <Label className="text-xs">Command</Label>
                      <Select
                        value={action.command || ''}
                        onValueChange={(value) => updateAction(action.id, { command: value })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on">Turn ON</SelectItem>
                          <SelectItem value="off">Turn OFF</SelectItem>
                          <SelectItem value="toggle">Toggle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Notification Action */}
              {action.type === 'notification' && (
                <div className="space-y-2">
                  <Label className="text-xs">Message</Label>
                  <Textarea
                    placeholder="Notification message..."
                    value={action.message || ''}
                    onChange={(e) => updateAction(action.id, { message: e.target.value })}
                    rows={3}
                  />
                </div>
              )}

              {/* Webhook Action */}
              {action.type === 'webhook' && (
                <div className="space-y-2">
                  <Label className="text-xs">Webhook URL</Label>
                  <Input
                    placeholder="https://api.example.com/webhook"
                    value={action.webhookUrl || ''}
                    onChange={(e) => updateAction(action.id, { webhookUrl: e.target.value })}
                    className="h-9 font-mono text-sm"
                  />
                </div>
              )}

              {/* Email Action */}
              {action.type === 'email' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Recipient Email</Label>
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      value={action.recipient || ''}
                      onChange={(e) => updateAction(action.id, { recipient: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Message</Label>
                    <Textarea
                      placeholder="Email message..."
                      value={action.message || ''}
                      onChange={(e) => updateAction(action.id, { message: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Delay Action */}
              {action.type === 'delay' && (
                <div className="space-y-2">
                  <Label className="text-xs">Delay Duration (seconds)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 10"
                    value={action.delaySeconds || ''}
                    onChange={(e) => updateAction(action.id, { delaySeconds: parseInt(e.target.value) })}
                    className="h-9"
                  />
                </div>
              )}

              {/* Log Action */}
              {action.type === 'log' && (
                <div className="space-y-2">
                  <Label className="text-xs">Log Message</Label>
                  <Input
                    placeholder="Log entry message..."
                    value={action.message || ''}
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
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Create Automation Rule</h1>
                <p className="text-sm text-gray-500 mt-0.5">{workspace.name}</p>
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
                onClick={handleSaveRule}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2 shadow-md"
              >
                <Save className="w-4 h-4" />
                Save Rule
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    {triggerGroups.reduce((sum, g) => sum + g.triggers.length, 0)} trigger(s) in {triggerGroups.length} group(s)
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Groups connected with <Badge variant="outline" className="ml-1">{groupsLogicOperator}</Badge>
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-gray-500 mb-2">Actions</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {actions.length} action(s) configured
                  </p>
                </div>
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
                  <p className="text-xs text-gray-600">
                    All conditions must be true to trigger
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">OR</h4>
                  <p className="text-xs text-gray-600">
                    Any condition can trigger the rule
                  </p>
                </div>
                <Separator />
                <div className="text-xs text-gray-600">
                  <p className="font-semibold mb-1">Example:</p>
                  <code className="bg-gray-900 text-green-400 p-2 rounded block text-xs">
                    {`(Temp > 30 AND Humidity > 70)`}<br/>
                    OR<br/>
                    {`(Motion Detected)`}
                  </code>
                </div>
              </CardContent>
            </Card>
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
                    <CardDescription className="mt-1">
                      Define when this rule should activate
                    </CardDescription>
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
                            onClick={() => setGroupsLogicOperator(groupsLogicOperator === 'AND' ? 'OR' : 'AND')}
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
                                <span className="text-gray-400">•</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateGroupOperator(group.id, group.logicOperator === 'AND' ? 'OR' : 'AND')}
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
                                  <div className="w-full h-px bg-gradient-to-r from-blue-300 via-blue-400 to-blue-300"></div>
                                  <Badge className="bg-blue-500 text-white font-bold text-xs px-2">
                                    {group.logicOperator}
                                  </Badge>
                                  <div className="w-full h-px bg-gradient-to-r from-blue-300 via-blue-400 to-blue-300"></div>
                                </div>
                              )}
                              {renderTriggerCard(group.id, trigger)}
                            </div>
                          ))}

                          {/* Add Trigger Button */}
                          {showTriggerTypeSelector === group.id ? (
                            <div className="grid grid-cols-2 gap-3 mt-3">
                              {TRIGGER_TYPES.map(type => {
                                const TypeIcon = type.icon;
                                return (
                                  <button
                                    key={type.value}
                                    onClick={() => addTrigger(group.id, type.value)}
                                    className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
                                  >
                                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-purple-600" />
                      Actions
                    </CardTitle>
                    <CardDescription className="mt-1">
                      What should happen when triggered (executed in order)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {actions.map((action, index) => (
                    <div key={action.id}>
                      {index > 0 && (
                        <div className="flex items-center justify-center my-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-px bg-purple-300"></div>
                            <ArrowRight className="w-4 h-4 text-purple-500" />
                            <div className="w-8 h-px bg-purple-300"></div>
                          </div>
                        </div>
                      )}
                      {renderActionCard(action, index)}
                    </div>
                  ))}

                  {/* Add Action Button */}
                  {showActionTypeSelector ? (
                    <div className="grid grid-cols-2 gap-3">
                      {ACTION_TYPES.map(type => {
                        const TypeIcon = type.icon;
                        return (
                          <button
                            key={type.value}
                            onClick={() => addAction(type.value)}
                            className="p-4 border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all text-left group"
                          >
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
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
                      <Button
                        onClick={() => setShowActionTypeSelector(true)}
                        variant="outline"
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Your First Action
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
