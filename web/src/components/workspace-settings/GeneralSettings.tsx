"use client";
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Check, CreditCard, Loader2, Terminal, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { apiUpdateWorkspace, type WorkspaceDetail, type WorkspacePlan } from '@/lib/api';
import { mutate } from 'swr';

const generalSettingsSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
});

type GeneralSettingsForm = z.infer<typeof generalSettingsSchema>;

interface GeneralSettingsProps {
  workspace: WorkspaceDetail | undefined;
  workspaceSlug: string;
  token: string | null;
  currentPlan: WorkspacePlan;
  membersCount: number;
}

export function GeneralSettings({
  workspace,
  workspaceSlug,
  token,
  currentPlan,
  membersCount,
}: GeneralSettingsProps) {
  const form = useForm<GeneralSettingsForm>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (workspace) {
      form.reset({
        name: workspace.name || '',
        description: workspace.description || '',
      });
    }
  }, [workspace, form]);

  const handleSave = async (data: GeneralSettingsForm) => {
    if (!token) return;

    try {
      await apiUpdateWorkspace(token, workspaceSlug, {
        name: data.name || undefined,
        description: data.description || undefined,
      });
      toast.success('Workspace settings saved');
      mutate(`workspace-${workspaceSlug}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    }
  };

  return (
    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50 p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          Workspace Information
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">Manage your workspace details and settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 p-4 sm:p-6">
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold">Workspace Name</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder={workspaceSlug}
              className="h-10 sm:h-11"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-sm font-semibold">Workspace Slug</Label>
            <Input id="slug" value={workspaceSlug} disabled className="h-10 sm:h-11 bg-gray-50" />
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Terminal className="w-3 h-3" />
              thebaycity.dev/{workspaceSlug}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="IoT workspace for managing devices and data"
              rows={3}
              className="resize-none"
            />
            {form.formState.errors.description && (
              <p className="text-xs text-red-600">{form.formState.errors.description.message}</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Current Plan</Label>
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span className="capitalize">{currentPlan}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Team Members</Label>
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <Users className="w-4 h-4 text-green-600" />
                {membersCount} member{membersCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg w-full sm:w-auto"
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

