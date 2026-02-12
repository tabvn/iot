'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ACLProvider, useWorkspaceMembership, type WorkspaceMembership } from '@/lib/acl';
import { Loader2 } from 'lucide-react';

interface WorkspaceACLProviderProps {
  children: ReactNode;
  workspaceSlug: string;
}

/**
 * Provider that wraps workspace pages with ACL context
 * Automatically fetches and provides the user's membership for the current workspace
 */
export function WorkspaceACLProvider({ children, workspaceSlug }: WorkspaceACLProviderProps) {
  const { membership, isLoading } = useWorkspaceMembership(workspaceSlug);

  return (
    <ACLProvider membership={membership} isLoading={isLoading}>
      {children}
    </ACLProvider>
  );
}

interface WorkspaceLayoutWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper component that extracts workspace slug from URL and provides ACL
 */
export function WorkspaceLayoutWrapper({ children }: WorkspaceLayoutWrapperProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Extract workspace slug from pathname
  const pathParts = pathname.split('/').filter(Boolean);
  const workspaceSlug = pathParts[0] && !isReservedPath(pathParts[0]) ? pathParts[0] : null;

  // If not in a workspace context, render without ACL
  if (!workspaceSlug) {
    return <>{children}</>;
  }

  // If not authenticated and not loading, redirect to login
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <WorkspaceACLProvider workspaceSlug={workspaceSlug}>
      {children}
    </WorkspaceACLProvider>
  );
}

/**
 * Check if a path segment is a reserved route (not a workspace slug)
 */
function isReservedPath(segment: string): boolean {
  const reservedPaths = [
    'dashboard',
    'developer',
    'login',
    'signup',
    'forgot-password',
    'reset-password',
    'pricing',
    'privacy',
    'terms',
    'contact',
    'invite',
    'account',
    'api',
  ];
  return reservedPaths.includes(segment.toLowerCase());
}

/**
 * Hook to get current workspace slug from URL
 */
export function useCurrentWorkspace(): string | null {
  const pathname = usePathname();
  const pathParts = pathname.split('/').filter(Boolean);
  const workspaceSlug = pathParts[0] && !isReservedPath(pathParts[0]) ? pathParts[0] : null;
  return workspaceSlug;
}

