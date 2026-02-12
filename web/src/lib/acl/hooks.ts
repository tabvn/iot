'use client';

import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';
import { apiGetMyMembership, apiListMembers, type WorkspaceMember } from '@/lib/api';
import type { WorkspaceMembership, MemberRole } from '@/lib/acl';

/**
 * Hook to fetch and manage the current user's workspace membership.
 * Uses the efficient GET /members/me endpoint (single lookup instead of listing all members).
 */
export function useWorkspaceMembership(workspaceSlug: string | null) {
  const { token } = useAuth();

  const { data, error, isLoading, mutate } = useSWR(
    token && workspaceSlug ? `membership-${workspaceSlug}` : null,
    async () => {
      if (!token || !workspaceSlug) {
        return null;
      }

      try {
        const member = await apiGetMyMembership(token, workspaceSlug);

        return {
          workspaceId: '',
          workspaceSlug,
          role: member.role as MemberRole,
          devicePermissions: member.devicePermissions,
        } as WorkspaceMembership;
      } catch (err) {
        console.error('[useWorkspaceMembership] Error fetching membership:', err);
        return null;
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute
    }
  );

  return {
    membership: data ?? null,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook to get all members of a workspace with their roles
 */
export function useWorkspaceMembers(workspaceSlug: string | null) {
  const { token } = useAuth();

  const { data, error, isLoading, mutate } = useSWR(
    token && workspaceSlug ? `members-${workspaceSlug}` : null,
    async () => {
      if (!token || !workspaceSlug) {
        return [];
      }

      try {
        const response = await apiListMembers(token, workspaceSlug);
        return response.members;
      } catch (err) {
        console.error('[useWorkspaceMembers] Error fetching members:', err);
        return [];
      }
    },
    {
      revalidateOnFocus: false,
    }
  );

  return {
    members: data ?? [],
    isLoading,
    error,
    mutate,
  };
}

