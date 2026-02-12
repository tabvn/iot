'use client';

import React, { createContext, useContext, useMemo, useCallback, ReactNode } from 'react';
import {
  type MemberRole,
  type Permission,
  roleHasPermission,
  roleHasAllPermissions,
  roleHasAnyPermission,
  getRolePermissions,
  hasHigherOrEqualRole,
  ROLE_INFO,
} from './permissions';

// ============================================================================
// Types
// ============================================================================

export interface WorkspaceMembership {
  workspaceId: string;
  workspaceSlug: string;
  role: MemberRole;
  devicePermissions?: Record<string, string[]>;
}

export interface ACLContextValue {
  /** Current user's role in the active workspace */
  role: MemberRole | null;

  /** Current workspace membership info */
  membership: WorkspaceMembership | null;

  /** Whether ACL is loading */
  isLoading: boolean;

  /** Check if user has a specific permission */
  can: (permission: Permission) => boolean;

  /** Check if user has all specified permissions */
  canAll: (permissions: Permission[]) => boolean;

  /** Check if user has any of the specified permissions */
  canAny: (permissions: Permission[]) => boolean;

  /** Check if user's role is at least the specified role */
  isAtLeast: (role: MemberRole) => boolean;

  /** Check if user is exactly the specified role */
  isRole: (role: MemberRole) => boolean;

  /** Check if user is the owner */
  isOwner: boolean;

  /** Check if user is admin or higher */
  isAdmin: boolean;

  /** Check if user is editor or higher */
  isEditor: boolean;

  /** Get all permissions for current role */
  permissions: Permission[];

  /** Get role display info */
  roleInfo: typeof ROLE_INFO[MemberRole] | null;
}

// ============================================================================
// Context
// ============================================================================

const ACLContext = createContext<ACLContextValue | undefined>(undefined);

// ============================================================================
// Provider Props
// ============================================================================

interface ACLProviderProps {
  children: ReactNode;
  membership: WorkspaceMembership | null;
  isLoading?: boolean;
}

// ============================================================================
// Provider Component
// ============================================================================

export function ACLProvider({ children, membership, isLoading = false }: ACLProviderProps) {
  const role = membership?.role ?? null;

  const can = useCallback(
    (permission: Permission): boolean => {
      if (!role) return false;
      return roleHasPermission(role, permission);
    },
    [role]
  );

  const canAll = useCallback(
    (permissions: Permission[]): boolean => {
      if (!role) return false;
      return roleHasAllPermissions(role, permissions);
    },
    [role]
  );

  const canAny = useCallback(
    (permissions: Permission[]): boolean => {
      if (!role) return false;
      return roleHasAnyPermission(role, permissions);
    },
    [role]
  );

  const isAtLeast = useCallback(
    (targetRole: MemberRole): boolean => {
      if (!role) return false;
      return hasHigherOrEqualRole(role, targetRole);
    },
    [role]
  );

  const isRole = useCallback(
    (targetRole: MemberRole): boolean => {
      return role === targetRole;
    },
    [role]
  );

  const value = useMemo<ACLContextValue>(
    () => ({
      role,
      membership,
      isLoading,
      can,
      canAll,
      canAny,
      isAtLeast,
      isRole,
      isOwner: role === 'owner',
      isAdmin: role ? hasHigherOrEqualRole(role, 'admin') : false,
      isEditor: role ? hasHigherOrEqualRole(role, 'editor') : false,
      permissions: role ? getRolePermissions(role) : [],
      roleInfo: role ? ROLE_INFO[role] : null,
    }),
    [role, membership, isLoading, can, canAll, canAny, isAtLeast, isRole]
  );

  return <ACLContext.Provider value={value}>{children}</ACLContext.Provider>;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Main hook to access ACL context
 */
export function useACL(): ACLContextValue {
  const context = useContext(ACLContext);
  if (context === undefined) {
    throw new Error('useACL must be used within an ACLProvider');
  }
  return context;
}

/**
 * Hook to check a single permission
 */
export function usePermission(permission: Permission): boolean {
  const { can } = useACL();
  return can(permission);
}

/**
 * Hook to check multiple permissions (all required)
 */
export function usePermissions(permissions: Permission[]): boolean {
  const { canAll } = useACL();
  return canAll(permissions);
}

/**
 * Hook to check if user has any of the permissions
 */
export function useAnyPermission(permissions: Permission[]): boolean {
  const { canAny } = useACL();
  return canAny(permissions);
}

/**
 * Hook to check role level
 */
export function useRole(): {
  role: MemberRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isViewer: boolean;
  isAtLeast: (role: MemberRole) => boolean;
} {
  const { role, isOwner, isAdmin, isEditor, isAtLeast } = useACL();
  return {
    role,
    isOwner,
    isAdmin,
    isEditor,
    isViewer: role === 'viewer',
    isAtLeast,
  };
}

// ============================================================================
// Export Types
// ============================================================================

export type { MemberRole, Permission } from './permissions';

