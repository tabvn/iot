"use client";
import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Settings, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminGuard } from '@/lib/acl';
import {
  apiListMembers,
  apiListInvitations,
  apiGetPlan,
  apiGetBilling,
  apiListWorkspaceApiKeys,
  apiGetWorkspaceByAlias,
  type WorkspacePlan,
  type BillingInvoice,
  type WorkspaceApiKey,
  type WorkspaceInvitation,
} from '@/lib/api';
import { GeneralSettings } from './GeneralSettings';
import { MembersSettings } from './MembersSettings';
import { ApiIntegrationSettings } from './ApiIntegrationSettings';
import { BillingSettings } from './BillingSettings';
import { AdvancedSettings } from './AdvancedSettings';
import { SettingsNavigation } from './SettingsNavigation';

interface WorkspaceSettingsProps {
  initialTab?: string;
}

// SWR fetcher functions
const createFetcher = (token: string, workspaceSlug: string) => ({
  workspace: async () => {
    return apiGetWorkspaceByAlias(workspaceSlug);
  },
  members: async () => {
    const res = await apiListMembers(token, workspaceSlug);
    return res.members;
  },
  invitations: async (): Promise<WorkspaceInvitation[]> => {
    const res = await apiListInvitations(token, workspaceSlug);
    return res.invitations.filter((inv) => inv.status === 'pending');
  },
  plan: async () => {
    const res = await apiGetPlan(token, workspaceSlug);
    return res.plan || 'starter';
  },
  billing: async () => {
    const res = await apiGetBilling(token, workspaceSlug);
    return res.invoices;
  },
  apiKeys: async () => {
    const res = await apiListWorkspaceApiKeys(token, workspaceSlug);
    return res.keys.filter((k) => !k.revokedAt);
  },
});

export function WorkspaceSettings({ initialTab }: WorkspaceSettingsProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const workspaceSlug = params?.workspace as string;
  const { token } = useAuth();

  // Determine active section based on route
  const tabFromUrl = searchParams.get('tab') || initialTab || 'general';
  const activeSection = initialTab || tabFromUrl || 'general';

  // SWR hooks
  const fetchers = token && workspaceSlug ? createFetcher(token, workspaceSlug) : null;

  const { data: workspace, isLoading: workspaceLoading } = useSWR(
    workspaceSlug ? `workspace-${workspaceSlug}` : null,
    fetchers?.workspace ?? null,
    { revalidateOnFocus: false }
  );

  const { data: members = [], isLoading: membersLoading } = useSWR(
    token && workspaceSlug ? `members-${workspaceSlug}` : null,
    fetchers?.members ?? null,
    { revalidateOnFocus: false }
  );

  const { data: pendingInvitations = [], isLoading: invitationsLoading } = useSWR<WorkspaceInvitation[]>(
    token && workspaceSlug ? `invitations-${workspaceSlug}` : null,
    fetchers?.invitations ?? null,
    { revalidateOnFocus: false }
  );

  const { data: currentPlan = 'starter', isLoading: planLoading } = useSWR<WorkspacePlan>(
    token && workspaceSlug ? `plan-${workspaceSlug}` : null,
    fetchers?.plan ?? null,
    { revalidateOnFocus: false }
  );

  const { data: invoices = [], isLoading: billingLoading } = useSWR<BillingInvoice[]>(
    token && workspaceSlug ? `billing-${workspaceSlug}` : null,
    fetchers?.billing ?? null,
    { revalidateOnFocus: false }
  );

  const { data: apiKeys = [], isLoading: keysLoading } = useSWR<WorkspaceApiKey[]>(
    token && workspaceSlug ? `apiKeys-${workspaceSlug}` : null,
    fetchers?.apiKeys ?? null,
    { revalidateOnFocus: false }
  );

  const loading =
    workspaceLoading ||
    membersLoading ||
    invitationsLoading ||
    planLoading ||
    billingLoading ||
    keysLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <AdminGuard
      fallback={
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Admin Access Required</h2>
            <p className="text-gray-600">
              You need administrator privileges to access workspace settings.
              Please contact your workspace owner for access.
            </p>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-linear-to-br from-gray-50 via-blue-50/30 to-purple-50/30 p-3 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Workspace Settings
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">{workspaceSlug}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <SettingsNavigation workspaceSlug={workspaceSlug} activeSection={activeSection} />

          {/* Content */}
          <div className="space-y-6">
            {activeSection === 'general' && (
              <GeneralSettings
                workspace={workspace}
                workspaceSlug={workspaceSlug}
                token={token}
                currentPlan={currentPlan}
                membersCount={members.length}
              />
            )}

            {activeSection === 'members' && (
              <MembersSettings
                members={members}
                invitations={pendingInvitations}
                token={token}
                workspaceSlug={workspaceSlug}
              />
            )}

            {activeSection === 'api' && (
              <ApiIntegrationSettings
                apiKeys={apiKeys}
                token={token}
                workspaceSlug={workspaceSlug}
              />
            )}

            {activeSection === 'billing' && (
              <BillingSettings
                currentPlan={currentPlan}
                invoices={invoices}
                token={token}
                workspaceSlug={workspaceSlug}
              />
            )}

            {activeSection === 'advanced' && (
              <AdvancedSettings token={token} workspaceSlug={workspaceSlug} />
            )}
          </div>
        </div>
      </div>
    </AdminGuard>
    );
}



