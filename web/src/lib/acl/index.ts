/**
 * ACL (Access Control List) Module
 *
 * This module provides a comprehensive permission system for the frontend.
 *
 * Features:
 * - Role-based access control (RBAC) with owner, admin, editor, viewer roles
 * - Fine-grained permission checking
 * - React context for accessing permissions throughout the app
 * - Guard components for protecting routes and UI sections
 * - Conditional rendering components (ShowIf, HideIf)
 * - HOC wrappers for class components
 * - TypeScript support with full type safety
 *
 * Usage Examples:
 *
 * 1. Wrap your workspace layout with ACLProvider:
 *    ```tsx
 *    <ACLProvider membership={membershipData}>
 *      {children}
 *    </ACLProvider>
 *    ```
 *
 * 2. Use hooks to check permissions:
 *    ```tsx
 *    const { can, isAdmin } = useACL();
 *    if (can('devices:create')) {
 *      // Show create button
 *    }
 *    ```
 *
 * 3. Use guard components:
 *    ```tsx
 *    <PermissionGuard permission="devices:delete">
 *      <DeleteButton />
 *    </PermissionGuard>
 *
 *    <AdminGuard>
 *      <AdminPanel />
 *    </AdminGuard>
 *    ```
 *
 * 4. Conditional rendering:
 *    ```tsx
 *    <ShowIf permission="automations:create">
 *      <CreateAutomationButton />
 *    </ShowIf>
 *    ```
 *
 * 5. Disable elements:
 *    ```tsx
 *    <DisabledIf permission="devices:edit">
 *      <EditButton />
 *    </DisabledIf>
 *    ```
 */

// Export permissions and types
export {
  type MemberRole,
  type Permission,
  type Resource,
  type Action,
  type PermissionGroup,
  type RoleInfo,
  ROLE_HIERARCHY,
  ROLE_INFO,
  PERMISSION_GROUPS,
  getRoleLevel,
  hasHigherOrEqualRole,
  roleHasPermission,
  roleHasAllPermissions,
  roleHasAnyPermission,
  getRolePermissions,
  getMinimumRoleForPermission,
} from './permissions';

// Export context and hooks
export {
  ACLProvider,
  useACL,
  usePermission,
  usePermissions,
  useAnyPermission,
  useRole,
  type WorkspaceMembership,
  type ACLContextValue,
} from './context';

// Export guards and components
export {
  PermissionGuard,
  PermissionsGuard,
  AnyPermissionGuard,
  RoleGuard,
  ExactRoleGuard,
  ConditionalGuard,
  OwnerGuard,
  AdminGuard,
  EditorGuard,
  withPermission,
  withRole,
  ShowIf,
  HideIf,
  DisabledIf,
} from './guards';

// Export data hooks
export {
  useWorkspaceMembership,
  useWorkspaceMembers,
} from './hooks';

// Export workspace provider
export {
  WorkspaceACLProvider,
  WorkspaceLayoutWrapper,
  useCurrentWorkspace,
} from './workspace-provider';

// Export route configuration and utilities
export {
  type RouteConfig,
  WORKSPACE_ROUTES,
  PUBLIC_ROUTES,
  AUTH_ROUTES,
  findRouteConfig,
  extractRouteParams,
  matchesRoute,
  isPublicRoute,
  isAuthRoute,
  isWorkspaceRoute,
} from './routes';

// Export route guards
export {
  RouteGuard,
  useRouteAccess,
  useFilteredNavigation,
} from './route-guard';




