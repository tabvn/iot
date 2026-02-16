/**
 * Route Protection Configuration
 *
 * Defines which permissions are required for each route pattern.
 * Routes are matched using glob-like patterns.
 */

import type { Permission, MemberRole } from './permissions';

// ============================================================================
// Types
// ============================================================================

export interface RouteConfig {
  /** Route pattern (supports :param for dynamic segments) */
  pattern: string;
  /** Required permission (if any) */
  permission?: Permission;
  /** Required permissions (all must be satisfied) */
  permissions?: Permission[];
  /** Any of these permissions (at least one must be satisfied) */
  anyPermissions?: Permission[];
  /** Minimum role required */
  minRole?: MemberRole;
  /** Exact role required */
  role?: MemberRole;
  /** Redirect path when access denied */
  redirectTo?: string;
  /** Custom access message */
  accessDeniedMessage?: string;
}

// ============================================================================
// Route Configurations
// ============================================================================

/**
 * Protected routes within workspace context
 * Pattern format: /[workspace]/...
 */
export const WORKSPACE_ROUTES: RouteConfig[] = [
  // Dashboard - all members can view
  {
    pattern: '/:workspace',
    permission: 'workspace:view',
  },

  // Devices - list and add
  {
    pattern: '/:workspace/devices/add',
    permission: 'devices:create',
    accessDeniedMessage: 'You need permission to create devices',
  },

  // Device detail (singular /device/:deviceId)
  {
    pattern: '/:workspace/device/:deviceId',
    permission: 'devices:view',
  },
  {
    pattern: '/:workspace/device/:deviceId/edit',
    permission: 'devices:edit',
    accessDeniedMessage: 'You need permission to edit devices',
  },
  {
    pattern: '/:workspace/device/:deviceId/analytics',
    permission: 'devices:view_data',
  },

  // Automations
  {
    pattern: '/:workspace/automations',
    permission: 'automations:view',
  },
  {
    pattern: '/:workspace/automations/create',
    permission: 'automations:create',
    accessDeniedMessage: 'You need permission to create automations',
  },
  {
    pattern: '/:workspace/automations/:automationId/edit',
    permission: 'automations:edit',
    accessDeniedMessage: 'You need permission to edit automations',
  },
  {
    pattern: '/:workspace/automations/:automationId/logs',
    permission: 'automations:view_logs',
  },

  // API docs page
  {
    pattern: '/:workspace/api',
    permission: 'workspace:view',
  },

  // Settings - requires admin
  {
    pattern: '/:workspace/settings',
    minRole: 'admin',
    accessDeniedMessage: 'Only administrators can access workspace settings',
  },
  {
    pattern: '/:workspace/settings/members',
    permission: 'members:view',
  },
  {
    pattern: '/:workspace/settings/plan',
    permission: 'workspace:manage_billing',
    accessDeniedMessage: 'Only workspace owner can manage billing',
  },
  {
    pattern: '/:workspace/settings/api',
    permission: 'api_keys:view',
  },
  {
    pattern: '/:workspace/settings/api-integration',
    permission: 'api_keys:view',
  },
  {
    pattern: '/:workspace/notifications',
    permission: 'notifications:manage_settings',
  },
  {
    pattern: '/:workspace/settings/advanced',
    minRole: 'admin',
    accessDeniedMessage: 'Only administrators can access advanced settings',
  },
  {
    pattern: '/:workspace/advance',
    minRole: 'admin',
    accessDeniedMessage: 'Only administrators can access advanced settings',
  },
];

// ============================================================================
// Route Matching Utilities
// ============================================================================

/**
 * Convert route pattern to regex for matching
 */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    // Escape special regex chars except : for params
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    // Convert :param to named capture group
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '(?<$1>[^/]+)');

  return new RegExp(`^${escaped}$`);
}

/**
 * Find the route config that matches the given path
 */
export function findRouteConfig(pathname: string): RouteConfig | null {
  for (const config of WORKSPACE_ROUTES) {
    const regex = patternToRegex(config.pattern);
    if (regex.test(pathname)) {
      return config;
    }
  }
  return null;
}

/**
 * Extract parameters from a path using a route pattern
 */
export function extractRouteParams(
  pattern: string,
  pathname: string
): Record<string, string> | null {
  const regex = patternToRegex(pattern);
  const match = pathname.match(regex);

  if (!match?.groups) {
    return null;
  }

  return match.groups;
}

/**
 * Check if a pathname matches a route pattern
 */
export function matchesRoute(pattern: string, pathname: string): boolean {
  const regex = patternToRegex(pattern);
  return regex.test(pathname);
}

// ============================================================================
// Navigation Guards
// ============================================================================

/**
 * Routes that don't require authentication
 */
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/pricing',
  '/privacy',
  '/terms',
  '/contact',
];

/**
 * Routes that require authentication but not workspace context
 */
export const AUTH_ROUTES = [
  '/dashboard',
  '/developer',
  '/account',
];

/**
 * Check if a route is public (no auth required)
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Check if a route requires only authentication (no workspace)
 */
export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Check if a route is a workspace route
 */
export function isWorkspaceRoute(pathname: string): boolean {
  const pathParts = pathname.split('/').filter(Boolean);
  if (pathParts.length === 0) return false;

  const firstSegment = pathParts[0];
  return !isPublicRoute(`/${firstSegment}`) && !isAuthRoute(`/${firstSegment}`);
}

