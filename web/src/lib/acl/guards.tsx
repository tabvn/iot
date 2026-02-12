'use client';

import React, { ReactNode, ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { useACL, type Permission, type MemberRole } from './context';
import { Loader2, ShieldAlert, Lock } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface BaseGuardProps {
  /** Content to show while loading */
  loading?: ReactNode;
  /** Content to show when access denied */
  fallback?: ReactNode;
  /** Redirect path when access denied (if not using fallback) */
  redirectTo?: string;
  /** Children to render when access granted */
  children: ReactNode;
}

interface PermissionGuardProps extends BaseGuardProps {
  /** Required permission */
  permission: Permission;
}

interface PermissionsGuardProps extends BaseGuardProps {
  /** Required permissions (all must be satisfied) */
  permissions: Permission[];
}

interface AnyPermissionGuardProps extends BaseGuardProps {
  /** Permissions (any one must be satisfied) */
  permissions: Permission[];
}

interface RoleGuardProps extends BaseGuardProps {
  /** Minimum required role */
  minRole: MemberRole;
}

interface ExactRoleGuardProps extends BaseGuardProps {
  /** Exact role required */
  role: MemberRole;
}

interface ConditionalGuardProps extends BaseGuardProps {
  /** Custom condition function */
  condition: () => boolean;
}

// ============================================================================
// Default Components
// ============================================================================

const DefaultLoading = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
  </div>
);

const DefaultAccessDenied = () => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
      <ShieldAlert className="w-8 h-8 text-red-600" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
    <p className="text-sm text-gray-600 max-w-sm">
      You don&apos;t have permission to access this content.
      Contact your workspace administrator for access.
    </p>
  </div>
);

// ============================================================================
// Guard Components
// ============================================================================

/**
 * Guard that requires a specific permission
 */
export function PermissionGuard({
  permission,
  loading,
  fallback,
  redirectTo,
  children,
}: PermissionGuardProps) {
  const router = useRouter();
  const { can, isLoading } = useACL();

  if (isLoading) {
    return <>{loading ?? <DefaultLoading />}</>;
  }

  const hasPermission = can(permission);

  if (!hasPermission) {
    if (redirectTo) {
      router.replace(redirectTo);
      return <>{loading ?? <DefaultLoading />}</>;
    }
    return <>{fallback ?? <DefaultAccessDenied />}</>;
  }

  return <>{children}</>;
}

/**
 * Guard that requires all specified permissions
 */
export function PermissionsGuard({
  permissions,
  loading,
  fallback,
  redirectTo,
  children,
}: PermissionsGuardProps) {
  const router = useRouter();
  const { canAll, isLoading } = useACL();

  if (isLoading) {
    return <>{loading ?? <DefaultLoading />}</>;
  }

  const hasPermissions = canAll(permissions);

  if (!hasPermissions) {
    if (redirectTo) {
      router.replace(redirectTo);
      return <>{loading ?? <DefaultLoading />}</>;
    }
    return <>{fallback ?? <DefaultAccessDenied />}</>;
  }

  return <>{children}</>;
}

/**
 * Guard that requires any of the specified permissions
 */
export function AnyPermissionGuard({
  permissions,
  loading,
  fallback,
  redirectTo,
  children,
}: AnyPermissionGuardProps) {
  const router = useRouter();
  const { canAny, isLoading } = useACL();

  if (isLoading) {
    return <>{loading ?? <DefaultLoading />}</>;
  }

  const hasPermission = canAny(permissions);

  if (!hasPermission) {
    if (redirectTo) {
      router.replace(redirectTo);
      return <>{loading ?? <DefaultLoading />}</>;
    }
    return <>{fallback ?? <DefaultAccessDenied />}</>;
  }

  return <>{children}</>;
}

/**
 * Guard that requires a minimum role level
 */
export function RoleGuard({
  minRole,
  loading,
  fallback,
  redirectTo,
  children,
}: RoleGuardProps) {
  const router = useRouter();
  const { isAtLeast, isLoading } = useACL();

  if (isLoading) {
    return <>{loading ?? <DefaultLoading />}</>;
  }

  const hasRole = isAtLeast(minRole);

  if (!hasRole) {
    if (redirectTo) {
      router.replace(redirectTo);
      return <>{loading ?? <DefaultLoading />}</>;
    }
    return <>{fallback ?? <DefaultAccessDenied />}</>;
  }

  return <>{children}</>;
}

/**
 * Guard that requires an exact role
 */
export function ExactRoleGuard({
  role,
  loading,
  fallback,
  redirectTo,
  children,
}: ExactRoleGuardProps) {
  const router = useRouter();
  const { isRole, isLoading } = useACL();

  if (isLoading) {
    return <>{loading ?? <DefaultLoading />}</>;
  }

  const hasRole = isRole(role);

  if (!hasRole) {
    if (redirectTo) {
      router.replace(redirectTo);
      return <>{loading ?? <DefaultLoading />}</>;
    }
    return <>{fallback ?? <DefaultAccessDenied />}</>;
  }

  return <>{children}</>;
}

/**
 * Guard with custom condition
 */
export function ConditionalGuard({
  condition,
  loading,
  fallback,
  redirectTo,
  children,
}: ConditionalGuardProps) {
  const router = useRouter();
  const { isLoading } = useACL();

  if (isLoading) {
    return <>{loading ?? <DefaultLoading />}</>;
  }

  const allowed = condition();

  if (!allowed) {
    if (redirectTo) {
      router.replace(redirectTo);
      return <>{loading ?? <DefaultLoading />}</>;
    }
    return <>{fallback ?? <DefaultAccessDenied />}</>;
  }

  return <>{children}</>;
}

/**
 * Owner-only guard
 */
export function OwnerGuard({ children, ...props }: Omit<RoleGuardProps, 'minRole'>) {
  return <ExactRoleGuard role="owner" {...props}>{children}</ExactRoleGuard>;
}

/**
 * Admin (or higher) guard
 */
export function AdminGuard({ children, ...props }: Omit<RoleGuardProps, 'minRole'>) {
  return <RoleGuard minRole="admin" {...props}>{children}</RoleGuard>;
}

/**
 * Editor (or higher) guard
 */
export function EditorGuard({ children, ...props }: Omit<RoleGuardProps, 'minRole'>) {
  return <RoleGuard minRole="editor" {...props}>{children}</RoleGuard>;
}

// ============================================================================
// HOC Wrappers
// ============================================================================

/**
 * HOC to wrap a component with permission check
 */
export function withPermission<P extends object>(
  Component: ComponentType<P>,
  permission: Permission,
  FallbackComponent?: ComponentType
) {
  const Fallback = FallbackComponent ?? DefaultAccessDenied;

  return function WrappedWithPermission(props: P) {
    const { can, isLoading } = useACL();

    if (isLoading) {
      return <DefaultLoading />;
    }

    if (!can(permission)) {
      return <Fallback />;
    }

    return <Component {...props} />;
  };
}

/**
 * HOC to wrap a component with role check
 */
export function withRole<P extends object>(
  Component: ComponentType<P>,
  minRole: MemberRole,
  FallbackComponent?: ComponentType
) {
  const Fallback = FallbackComponent ?? DefaultAccessDenied;

  return function WrappedWithRole(props: P) {
    const { isAtLeast, isLoading } = useACL();

    if (isLoading) {
      return <DefaultLoading />;
    }

    if (!isAtLeast(minRole)) {
      return <Fallback />;
    }

    return <Component {...props} />;
  };
}

// ============================================================================
// UI Element Guards (for inline conditional rendering)
// ============================================================================

interface ShowIfProps {
  permission?: Permission;
  permissions?: Permission[];
  anyPermissions?: Permission[];
  minRole?: MemberRole;
  role?: MemberRole;
  condition?: () => boolean;
  children: ReactNode;
  /** Alternative content when condition not met */
  otherwise?: ReactNode;
}

/**
 * Conditionally show content based on permissions/role
 * This is a lighter-weight alternative to guard components
 * that doesn't show loading states or access denied messages
 */
export function ShowIf({
  permission,
  permissions,
  anyPermissions,
  minRole,
  role,
  condition,
  children,
  otherwise = null,
}: ShowIfProps) {
  const { can, canAll, canAny, isAtLeast, isRole, isLoading } = useACL();

  // Don't render anything while loading
  if (isLoading) {
    return null;
  }

  let allowed = true;

  if (permission !== undefined) {
    allowed = allowed && can(permission);
  }

  if (permissions !== undefined) {
    allowed = allowed && canAll(permissions);
  }

  if (anyPermissions !== undefined) {
    allowed = allowed && canAny(anyPermissions);
  }

  if (minRole !== undefined) {
    allowed = allowed && isAtLeast(minRole);
  }

  if (role !== undefined) {
    allowed = allowed && isRole(role);
  }

  if (condition !== undefined) {
    allowed = allowed && condition();
  }

  return <>{allowed ? children : otherwise}</>;
}

/**
 * Hide content based on permissions/role (inverse of ShowIf)
 */
export function HideIf(props: ShowIfProps) {
  return (
    <ShowIf {...props} otherwise={props.children}>
      {props.otherwise}
    </ShowIf>
  );
}

// ============================================================================
// Disabled State Components
// ============================================================================

interface DisabledIfProps {
  permission?: Permission;
  permissions?: Permission[];
  minRole?: MemberRole;
  children: ReactNode;
  /** Tooltip to show when disabled */
  tooltip?: string;
}

/**
 * Wrap interactive elements to disable them based on permissions
 * Adds visual styling and optional tooltip
 */
export function DisabledIf({
  permission,
  permissions,
  minRole,
  children,
  tooltip = 'You don\'t have permission for this action',
}: DisabledIfProps) {
  const { can, canAll, isAtLeast } = useACL();

  let disabled = false;

  if (permission !== undefined) {
    disabled = !can(permission);
  }

  if (permissions !== undefined) {
    disabled = disabled || !canAll(permissions);
  }

  if (minRole !== undefined) {
    disabled = disabled || !isAtLeast(minRole);
  }

  if (!disabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative group cursor-not-allowed" title={tooltip}>
      <div className="pointer-events-none opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg flex items-center gap-1">
          <Lock className="w-3 h-3" />
          <span>{tooltip}</span>
        </div>
      </div>
    </div>
  );
}

