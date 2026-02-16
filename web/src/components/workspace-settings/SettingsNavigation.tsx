"use client";
import React from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings as SettingsIcon,
  Users,
  CreditCard,
  Key,
  AlertTriangle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useACL, type Permission } from '@/lib/acl';

interface SettingsNavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
  ownerOnly?: boolean;
}

interface SettingsNavigationProps {
  workspaceSlug: string;
  activeSection: string;
}

const settingsNavItems: SettingsNavItem[] = [
  { id: 'general', label: 'General', href: '', icon: SettingsIcon, permission: 'workspace:manage_settings' },
  { id: 'members', label: 'Members', href: '/members', icon: Users, permission: 'members:view' },
  { id: 'billing', label: 'Plan & Billing', href: '/plan', icon: CreditCard, permission: 'workspace:manage_billing', ownerOnly: true },
  { id: 'api', label: 'API Integration', href: '/api', icon: Key, permission: 'api_keys:view' },
  { id: 'advanced', label: 'Advanced', href: '/advanced', icon: AlertTriangle, permission: 'workspace:manage_settings' },
];

export function SettingsNavigation({
  workspaceSlug,
  activeSection,
}: SettingsNavigationProps) {
  const router = useRouter();
  const { can, isOwner } = useACL();
  const baseSettingsUrl = `/${workspaceSlug}/settings`;

  // Filter items based on permissions
  const visibleItems = settingsNavItems.filter((item) => {
    if (item.ownerOnly && !isOwner) return false;
    if (item.permission && !can(item.permission)) return false;
    return true;
  });

  const items = visibleItems.map((item) => ({
    ...item,
    href: baseSettingsUrl + item.href,
  }));

  return (
    <>
      {/* Mobile Navigation */}
      <div className="lg:hidden mb-4">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="px-3 py-3 space-y-2">
            <div className="text-xs font-semibold text-gray-500 flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-500" />
              <span>Workspace settings</span>
            </div>
            <Select
              value={activeSection}
              onValueChange={(value) => {
                const item = items.find((i) => i.id === value);
                if (item) router.push(item.href);
              }}
            >
              <SelectTrigger className="w-full h-10 text-sm">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SelectItem key={item.id} value={item.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-500" />
                        <span>{item.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden lg:block mb-6">
        <Card className="border border-gray-200 shadow-sm bg-white/80 backdrop-blur-sm">
          <CardContent className="px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Settings className="w-4 h-4 text-gray-500" />
              <span className="font-semibold text-gray-800">Workspace settings</span>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {items.map((item) => {
                const isActive = item.id === activeSection;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
