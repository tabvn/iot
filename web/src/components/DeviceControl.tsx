"use client";
import { Power, Lightbulb, Lock, Unlock, Fan, Gauge } from "lucide-react";
import type { Device } from "@/app/types";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface DeviceControlProps {
  device: Device;
  onControlChange: (deviceId: string, control: Device['control']) => void;
}

export function DeviceControl({ device, onControlChange }: DeviceControlProps) {
  if (!device.controllable || !device.control) return null;

  const handleSwitchChange = (checked: boolean) => {
    const newControl = { ...device.control!, state: checked };
    onControlChange(device.id, newControl);
    toast.success(`${device.name} turned ${checked ? 'on' : 'off'}`);
  };

  const handleSliderChange = (value: number[]) => {
    const newControl = { ...device.control!, value: value[0] };
    onControlChange(device.id, newControl);
  };

  const handleColorChange = (color: string) => {
    const newControl = { ...device.control!, color };
    onControlChange(device.id, newControl);
    toast.success(`${device.name} color changed`);
  };

  const handleTemperatureChange = (value: number[]) => {
    const newControl = { ...device.control!, value: value[0] };
    onControlChange(device.id, newControl);
  };

  // Switch Control (Smart Plug, Door Lock, etc.)
  if (device.control.type === 'switch') {
    const isLock = device.type === 'Door Lock';
    return (
      <div className="flex items-center justify-between p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isLock ? 'bg-purple-100' : 'bg-blue-100'}`}>
            {isLock ? (
              device.control.state ? <Lock className="w-4 h-4 text-purple-600" /> : <Unlock className="w-4 h-4 text-purple-600" />
            ) : (
              <Power className="w-4 h-4 text-blue-600" />
            )}
          </div>
          <Label className="text-sm font-semibold">
            {isLock ? (device.control.state ? 'Locked' : 'Unlocked') : (device.control.state ? 'On' : 'Off')}
          </Label>
        </div>
        <Switch
          checked={device.control.state || false}
          onCheckedChange={handleSwitchChange}
        />
      </div>
    );
  }

  // Slider Control (Dimmable Light, Fan Speed, etc.)
  if (device.control.type === 'slider') {
    const isFan = device.type === 'Fan';
    const displayValue = isFan
      ? `Speed ${device.control.value}`
      : `${device.control.value}%`;

    return (
      <div className="space-y-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isFan ? 'bg-cyan-100' : 'bg-amber-100'}`}>
              {isFan ? <Fan className="w-4 h-4 text-cyan-600" /> : <Lightbulb className="w-4 h-4 text-amber-600" />}
            </div>
            <div>
              <Label className="text-sm font-semibold">
                {device.control.state ? 'On' : 'Off'}
              </Label>
              <p className="text-xs text-gray-600">{displayValue}</p>
            </div>
          </div>
          <Switch
            checked={device.control.state || false}
            onCheckedChange={handleSwitchChange}
          />
        </div>
        {device.control.state && (
          <div className="space-y-2">
            <Slider
              value={[device.control.value || 0]}
              onValueChange={handleSliderChange}
              min={device.control.min || 0}
              max={device.control.max || 100}
              step={1}
              className="w-full"
            />
          </div>
        )}
      </div>
    );
  }

  // Color Control (RGB Light)
  if (device.control.type === 'color') {
    return (
      <div className="space-y-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-100">
              <Lightbulb className="w-4 h-4 text-pink-600" />
            </div>
            <div>
              <Label className="text-sm font-semibold">
                {device.control.state ? 'On' : 'Off'}
              </Label>
              <p className="text-xs text-gray-600">{device.control.value}% brightness</p>
            </div>
          </div>
          <Switch
            checked={device.control.state || false}
            onCheckedChange={handleSwitchChange}
          />
        </div>
        {device.control.state && (
          <div className="space-y-3">
            <Slider
              value={[device.control.value || 0]}
              onValueChange={handleSliderChange}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
              <Input
                type="color"
                value={device.control.color || '#ffffff'}
                onChange={(e) => handleColorChange(e.target.value)}
                className="h-10 w-16 cursor-pointer border-2"
              />
              <div className="flex-1">
                <p className="text-xs text-gray-600">Color</p>
                <p className="text-sm font-semibold font-mono">
                  {device.control.color?.toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Temperature Control (Thermostat)
  if (device.control.type === 'temperature') {
    return (
      <div className="space-y-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <Gauge className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <Label className="text-sm font-semibold">Temperature</Label>
              <p className="text-xs text-gray-600">Target: {device.control.value}°C</p>
            </div>
          </div>
        </div>
        <Slider
          value={[device.control.value || 20]}
          onValueChange={handleTemperatureChange}
          min={device.control.min || 16}
          max={device.control.max || 30}
          step={0.5}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-600 px-1">
          <span>{device.control.min}°C</span>
          <span className="font-semibold text-gray-900">{device.control.value}°C</span>
          <span>{device.control.max}°C</span>
        </div>
      </div>
    );
  }

  return null;
}
