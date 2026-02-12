'use client';

import React, { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useACL } from './context';
import { findRouteConfig, type RouteConfig } from './routes';
import { Loader2, ShieldAlert } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface RouteGuardProps {
  children: ReactNode;
  /** Custom loading component */
  loading?: ReactNode;
  /** Custom access denied component */
  accessDenied?: ReactNode;
}

// ============================================================================
// Default Components
// ============================================================================

const DefaultLoading = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <span className="text-sm text-gray-500">Loading...</span>
    </div>
  </div>
);

interface AccessDeniedProps {
  message?: string;
  redirectTo?: string;
}

const DefaultAccessDenied = ({ message, redirectTo }: AccessDeniedProps) => {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Access Denied</h2>
        <p className="text-gray-600 mb-6">
          {message || "You don't have permission to access this page. Please contact your workspace administrator if you believe this is an error."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Go Back
          </button>
          {redirectTo && (
            <button
              onClick={() => router.push(redirectTo)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Route Guard Component
// ============================================================================

/**
 * Guard component that checks route-level permissions
 * Uses the route configuration to determine required permissions
 */
export function RouteGuard({ children, loading, accessDenied }: RouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { can, canAll, canAny, isAtLeast, isRole, isLoading, role } = useACL();

  // Find route config for current path
  const routeConfig = findRouteConfig(pathname);

  // If loading ACL, show loading state
  if (isLoading) {
    return <>{loading ?? <DefaultLoading />}</>;
  }

  // If no route config found, allow access (route not protected)
  if (!routeConfig) {
    return <>{children}</>;
  }

  // Check permissions based on route config
  let hasAccess = true;

  if (routeConfig.permission) {
    hasAccess = hasAccess && can(routeConfig.permission);
  }

  if (routeConfig.permissions) {
    hasAccess = hasAccess && canAll(routeConfig.permissions);
  }

  if (routeConfig.anyPermissions) {
    hasAccess = hasAccess && canAny(routeConfig.anyPermissions);
  }

  if (routeConfig.minRole) {
    hasAccess = hasAccess && isAtLeast(routeConfig.minRole);
  }

  if (routeConfig.role) {
    hasAccess = hasAccess && isRole(routeConfig.role);
  }

  // If no role at all (not a member), deny access
  if (!role) {
    hasAccess = false;
  }

  // Handle access denied
  if (!hasAccess) {
    // If redirect is configured, redirect
    if (routeConfig.redirectTo) {
      router.replace(routeConfig.redirectTo);
      return <>{loading ?? <DefaultLoading />}</>;
    }

    // Otherwise show access denied
    return (
      <>
        {accessDenied ?? (
          <DefaultAccessDenied
            message={routeConfig.accessDeniedMessage}
            redirectTo={routeConfig.redirectTo}
          />
        )}
      </>
    );
  }

  return <>{children}</>;
}

// ============================================================================
// Hook for Route Access Check
// ============================================================================

/**
 * Hook to check if user has access to a specific route
 */
export function useRouteAccess(routePath: string): {
  hasAccess: boolean;
  isLoading: boolean;
  config: RouteConfig | null;
} {
  const { can, canAll, canAny, isAtLeast, isRole, isLoading, role } = useACL();

  const config = findRouteConfig(routePath);

  if (isLoading) {
    return { hasAccess: false, isLoading: true, config };
  }

  if (!config) {
    return { hasAccess: true, isLoading: false, config: null };
  }

  let hasAccess = !!role;

  if (config.permission) {
    hasAccess = hasAccess && can(config.permission);
  }

  if (config.permissions) {
    hasAccess = hasAccess && canAll(config.permissions);
  }

  if (config.anyPermissions) {
    hasAccess = hasAccess && canAny(config.anyPermissions);
  }

  if (config.minRole) {
    hasAccess = hasAccess && isAtLeast(config.minRole);
  }

  if (config.role) {
    hasAccess = hasAccess && isRole(config.role);
  }

  return { hasAccess, isLoading: false, config };
}

/**
 * Hook to filter navigation items based on permissions
 */
export function useFilteredNavigation<T extends { href: string; permission?: string }>(
  items: T[]
): T[] {
  const { can, isLoading } = useACL();

  if (isLoading) {
    return [];
  }

  return items.filter(item => {
    if (!item.permission) return true;
    return can(item.permission as any);
  });
}

