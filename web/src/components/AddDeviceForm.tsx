"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import useSWRMutation from "swr/mutation";
import {
  Plus, Trash2, Cpu, Database, Code, Info, CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { apiCreateDevice, type CreateDevicePayload } from "@/lib/api";
import { DeviceType } from "@/types/models";
import { DEVICE_TYPES, DATA_TYPES } from "@/types/constants";

// ============================================================================
// Enums for form field mapping data types (matches backend)
// ============================================================================

export enum FieldMappingDataType {
  NUMBER = "number",
  STRING = "string",
  BOOLEAN = "boolean",
  JSON = "json",
}

// ============================================================================
// Zod Schema
// ============================================================================

const fieldMappingSchema = z.object({
  sourceField: z.string().min(1, "Source field key is required"),
  displayLabel: z.string().min(1, "Display label is required"),
  dataType: z.nativeEnum(FieldMappingDataType),
  unit: z.string().optional(),
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
  precision: z.coerce.number().int().min(0).optional(),
});

const addDeviceSchema = z.object({
  name: z.string().min(1, "Device name is required"),
  type: z.nativeEnum(DeviceType, { errorMap: () => ({ message: "Device type is required" }) }),
  description: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  firmwareVersion: z.string().optional(),
  location: z.string().optional(),
  fieldMappings: z.array(fieldMappingSchema).optional(),
});

type AddDeviceFormValues = z.infer<typeof addDeviceSchema>;

// ============================================================================
// SWR mutation fetcher
// ============================================================================

async function createDeviceFetcher(
  _key: string,
  { arg }: { arg: { token: string; workspaceSlug: string; payload: CreateDevicePayload } },
) {
  return apiCreateDevice(arg.token, arg.workspaceSlug, arg.payload);
}

// ============================================================================
// Component
// ============================================================================

export function AddDeviceForm({ workspaceSlug }: { workspaceSlug: string }) {
  const router = useRouter();
  const { token } = useAuth();

  const { trigger, isMutating } = useSWRMutation("create-device", createDeviceFetcher);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AddDeviceFormValues>({
    resolver: zodResolver(addDeviceSchema),
    defaultValues: {
      name: "",
      type: undefined,
      description: "",
      manufacturer: "",
      model: "",
      firmwareVersion: "",
      location: "",
      fieldMappings: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "fieldMappings",
  });

  const watchedValues = watch();

  const onSubmit = async (values: AddDeviceFormValues) => {
    if (!token) {
      toast.error("Authentication token not found.");
      return;
    }

    // Map form values to API payload with proper field mapping
    const payload: CreateDevicePayload = {
      name: values.name,
      type: values.type,
      ...(values.description && { description: values.description }),
      ...(values.manufacturer && { manufacturer: values.manufacturer }),
      ...(values.model && { model: values.model }),
      ...(values.firmwareVersion && { firmwareVersion: values.firmwareVersion }),
      ...(values.location && { location: values.location }),
      ...(values.fieldMappings && values.fieldMappings.length > 0 && {
        fieldMappings: values.fieldMappings.map((fm) => ({
          sourceField: fm.sourceField,
          displayLabel: fm.displayLabel,
          dataType: fm.dataType as "number" | "string" | "boolean" | "json",
          ...(fm.unit && { unit: fm.unit }),
          ...(fm.min !== undefined && { min: fm.min }),
          ...(fm.max !== undefined && { max: fm.max }),
          ...(fm.precision !== undefined && { precision: fm.precision }),
        })),
      }),
    };

    try {
      await trigger({ token, workspaceSlug, payload });
      toast.success("Device created successfully!");
      router.push(`/${workspaceSlug}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create device.";
      toast.error(message);
    }
  };

  return (
    <form id="add-device-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                    {...register("name")}
                    className="h-11"
                  />
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device-type" className="text-sm font-semibold">
                    Device Type *
                  </Label>
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <SelectTrigger id="device-type" className="h-11">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEVICE_TYPES.map((dt) => (
                            <SelectItem key={dt.value} value={dt.value}>
                              {dt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Optional description of the device..."
                  {...register("description")}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manufacturer" className="text-sm font-semibold">
                    Manufacturer
                  </Label>
                  <Input
                    id="manufacturer"
                    placeholder="e.g., Raspberry Pi"
                    {...register("manufacturer")}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model" className="text-sm font-semibold">
                    Model
                  </Label>
                  <Input
                    id="model"
                    placeholder="e.g., Pi 4 Model B"
                    {...register("model")}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firmware" className="text-sm font-semibold">
                    Firmware Version
                  </Label>
                  <Input
                    id="firmware"
                    placeholder="e.g., v1.2.3"
                    {...register("firmwareVersion")}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-semibold">
                    Location
                  </Label>
                  <Input
                    id="location"
                    placeholder="e.g., Server Room"
                    {...register("location")}
                    className="h-11"
                  />
                </div>
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
              {fields.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Code className="w-8 h-8 text-gray-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">No field mappings yet</h4>
                  <p className="text-sm text-gray-600 mb-4 max-w-sm mx-auto">
                    Add field mappings to define how your device data should be parsed and displayed.
                  </p>
                  <Button
                    type="button"
                    onClick={() => append({ sourceField: "", displayLabel: "", dataType: FieldMappingDataType.NUMBER, unit: "" })}
                    variant="outline"
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add First Field
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => {
                    const fieldDataType = watchedValues.fieldMappings?.[index]?.dataType;
                    const isNumeric = fieldDataType === FieldMappingDataType.NUMBER;
                    const showUnit = isNumeric || fieldDataType === FieldMappingDataType.STRING;

                    return (
                      <Card key={field.id} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 space-y-4">
                              <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold text-gray-700">
                                    Field Key *
                                  </Label>
                                  <Input
                                    placeholder="e.g., temp"
                                    {...register(`fieldMappings.${index}.sourceField`)}
                                    className="h-9 font-mono text-sm"
                                  />
                                  {errors.fieldMappings?.[index]?.sourceField && (
                                    <p className="text-xs text-red-500">{errors.fieldMappings[index].sourceField.message}</p>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold text-gray-700">
                                    Display Label *
                                  </Label>
                                  <Input
                                    placeholder="e.g., Temperature"
                                    {...register(`fieldMappings.${index}.displayLabel`)}
                                    className="h-9"
                                  />
                                  {errors.fieldMappings?.[index]?.displayLabel && (
                                    <p className="text-xs text-red-500">{errors.fieldMappings[index].displayLabel.message}</p>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold text-gray-700">
                                    Data Type *
                                  </Label>
                                  <Controller
                                    control={control}
                                    name={`fieldMappings.${index}.dataType`}
                                    render={({ field: f }) => (
                                      <Select onValueChange={f.onChange} value={f.value}>
                                        <SelectTrigger className="h-9">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {DATA_TYPES.filter((dt) => dt.value !== "array").map((dt) => (
                                            <SelectItem key={dt.value} value={dt.value}>
                                              {dt.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  />
                                </div>
                              </div>

                              {/* Conditional fields based on data type */}
                              {(showUnit || isNumeric) && (
                                <div className={`grid gap-4 ${isNumeric ? "grid-cols-4" : "grid-cols-1"}`}>
                                  {showUnit && (
                                    <div className="space-y-2">
                                      <Label className="text-xs font-semibold text-gray-700">
                                        Unit
                                      </Label>
                                      <Input
                                        placeholder={isNumeric ? "e.g., °C, %, kW" : "e.g., bytes, chars"}
                                        {...register(`fieldMappings.${index}.unit`)}
                                        className="h-9"
                                      />
                                    </div>
                                  )}
                                  {isNumeric && (
                                    <>
                                      <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-gray-700">
                                          Min
                                        </Label>
                                        <Input
                                          type="number"
                                          placeholder="0"
                                          {...register(`fieldMappings.${index}.min`)}
                                          className="h-9"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-gray-700">
                                          Max
                                        </Label>
                                        <Input
                                          type="number"
                                          placeholder="100"
                                          {...register(`fieldMappings.${index}.max`)}
                                          className="h-9"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-gray-700">
                                          Precision
                                        </Label>
                                        <Input
                                          type="number"
                                          placeholder="2"
                                          {...register(`fieldMappings.${index}.precision`)}
                                          className="h-9"
                                        />
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  <Button
                    type="button"
                    onClick={() => append({ sourceField: "", displayLabel: "", dataType: FieldMappingDataType.NUMBER, unit: "" })}
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
                <p className="text-xs text-gray-500 mb-1">Device Name</p>
                <p className="font-semibold text-gray-900">
                  {watchedValues.name || <span className="text-gray-400">Not set</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Device Type</p>
                <p className="font-semibold text-gray-900">
                  {watchedValues.type
                    ? DEVICE_TYPES.find((dt) => dt.value === watchedValues.type)?.label ?? watchedValues.type
                    : <span className="text-gray-400">Not set</span>}
                </p>
              </div>
              {watchedValues.location && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Location</p>
                  <p className="text-sm font-semibold text-gray-900">{watchedValues.location}</p>
                </div>
              )}
              {watchedValues.manufacturer && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Manufacturer</p>
                  <p className="text-sm font-semibold text-gray-900">{watchedValues.manufacturer}</p>
                </div>
              )}
              <Separator />
              <div>
                <p className="text-xs text-gray-500 mb-2">Field Mappings</p>
                {(!watchedValues.fieldMappings || watchedValues.fieldMappings.length === 0) ? (
                  <p className="text-sm text-gray-400">No fields defined</p>
                ) : (
                  <div className="space-y-2">
                    {watchedValues.fieldMappings.map((fm, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Code className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="font-mono text-xs text-gray-600 truncate">
                            {fm.sourceField || "?"}
                          </span>
                          <span className="text-gray-400">&rarr;</span>
                          <span className="text-xs font-semibold text-gray-900 truncate">
                            {fm.displayLabel || "?"}
                          </span>
                          {fm.unit && (
                            <span className="text-xs text-gray-500">({fm.unit})</span>
                          )}
                          {fm.dataType === FieldMappingDataType.NUMBER && (fm.min !== undefined || fm.max !== undefined) && (
                            <span className="text-[10px] text-gray-400">
                              [{fm.min ?? "..."}&ndash;{fm.max ?? "..."}]
                            </span>
                          )}
                          <span className="ml-auto px-2 py-0.5 rounded-full bg-gray-200 text-[10px] uppercase tracking-wide text-gray-700 shrink-0">
                            {fm.dataType}
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
                <h4 className="font-semibold text-gray-900 mb-1">Data Types</h4>
                <ul className="text-xs text-gray-600 space-y-1 list-disc pl-3.5">
                  <li><strong>Number</strong> &mdash; unit, min/max range, precision</li>
                  <li><strong>String</strong> &mdash; optional unit</li>
                  <li><strong>Boolean</strong> &mdash; true / false toggle</li>
                  <li><strong>JSON</strong> &mdash; nested object or array</li>
                </ul>
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

      {/* Submit button (hidden, triggered by page header button via form="add-device-form") */}
      {isMutating && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3 shadow-xl">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-sm font-medium">Creating device...</span>
          </div>
        </div>
      )}
    </form>
  );
}
