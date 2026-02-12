/**
 * ACL Permissions System
 *
 * This module defines all permissions, roles, and their relationships.
 * It follows a hierarchical permission model where higher roles inherit
 * permissions from lower roles.
 */

// ============================================================================
// Types
// ============================================================================

export type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer';

/**
 * All available permissions in the system.
 * Naming convention: resource:action
 */
export type Permission =
  // Workspace permissions
  | 'workspace:view'
  | 'workspace:edit'
  | 'workspace:delete'
  | 'workspace:manage_settings'
  | 'workspace:manage_billing'
  | 'workspace:transfer_ownership'

  // Member permissions
  | 'members:view'
  | 'members:invite'
  | 'members:edit'
  | 'members:remove'

  // Device permissions
  | 'devices:view'
  | 'devices:create'
  | 'devices:edit'
  | 'devices:delete'
  | 'devices:control'
  | 'devices:view_data'
  | 'devices:export_data'

  // Automation permissions
  | 'automations:view'
  | 'automations:create'
  | 'automations:edit'
  | 'automations:delete'
  | 'automations:toggle'
  | 'automations:view_logs'

  // API Key permissions
  | 'api_keys:view'
  | 'api_keys:create'
  | 'api_keys:revoke'

  // Notification permissions
  | 'notifications:view'
  | 'notifications:manage_settings'

  // Analytics permissions
  | 'analytics:view'
  | 'analytics:export';

/**
 * Resource types that can have permissions
 */
export type Resource =
  | 'workspace'
  | 'members'
  | 'devices'
  | 'automations'
  | 'api_keys'
  | 'notifications'
  | 'analytics';

/**
 * Action types that can be performed on resources
 */
export type Action =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'manage'
  | 'control'
  | 'export';

// ============================================================================
// Role Hierarchy
// ============================================================================

/**
 * Role hierarchy from highest to lowest privilege
 * Each role inherits permissions from roles below it
 */
export const ROLE_HIERARCHY: MemberRole[] = ['owner', 'admin', 'editor', 'viewer'];

/**
 * Get the numeric level of a role (higher = more permissions)
 */
export function getRoleLevel(role: MemberRole): number {
  const index = ROLE_HIERARCHY.indexOf(role);
  return ROLE_HIERARCHY.length - 1 - index;
}

/**
 * Check if roleA has higher or equal privilege than roleB
 */
export function hasHigherOrEqualRole(roleA: MemberRole, roleB: MemberRole): boolean {
  return getRoleLevel(roleA) >= getRoleLevel(roleB);
}

// ============================================================================
// Permission Definitions
// ============================================================================

/**
 * Base permissions for each role (not including inherited permissions)
 */
const BASE_ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  owner: [
    'workspace:delete',
    'workspace:manage_billing',
    'workspace:transfer_ownership',
    'members:remove', // Can remove anyone except themselves
    'api_keys:create',
    'api_keys:revoke',
  ],

  admin: [
    'workspace:manage_settings',
    'members:invite',
    'members:edit',
    'devices:delete',
    'automations:delete',
    'notifications:manage_settings',
    'analytics:export',
  ],

  editor: [
    'workspace:edit',
    'devices:create',
    'devices:edit',
    'devices:control',
    'devices:export_data',
    'automations:create',
    'automations:edit',
    'automations:toggle',
  ],

  viewer: [
    'workspace:view',
    'members:view',
    'devices:view',
    'devices:view_data',
    'automations:view',
    'automations:view_logs',
    'api_keys:view',
    'notifications:view',
    'analytics:view',
  ],
};

/**
 * Computed full permissions for each role (including inherited)
 */
const ROLE_PERMISSIONS: Record<MemberRole, Set<Permission>> = (() => {
  const result: Record<MemberRole, Set<Permission>> = {
    owner: new Set(),
    admin: new Set(),
    editor: new Set(),
    viewer: new Set(),
  };

  // Build permissions from bottom up (viewer -> owner)
  for (let i = ROLE_HIERARCHY.length - 1; i >= 0; i--) {
    const role = ROLE_HIERARCHY[i];
    const basePerms = BASE_ROLE_PERMISSIONS[role];

    // Add base permissions
    basePerms.forEach(p => result[role].add(p));

    // Inherit from lower role
    if (i < ROLE_HIERARCHY.length - 1) {
      const lowerRole = ROLE_HIERARCHY[i + 1];
      result[lowerRole].forEach(p => result[role].add(p));
    }
  }

  return result;
})();

// ============================================================================
// Permission Checking Functions
// ============================================================================

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: MemberRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/**
 * Check if a role has all of the specified permissions
 */
export function roleHasAllPermissions(role: MemberRole, permissions: Permission[]): boolean {
  return permissions.every(p => roleHasPermission(role, p));
}

/**
 * Check if a role has any of the specified permissions
 */
export function roleHasAnyPermission(role: MemberRole, permissions: Permission[]): boolean {
  return permissions.some(p => roleHasPermission(role, p));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: MemberRole): Permission[] {
  return Array.from(ROLE_PERMISSIONS[role] ?? []);
}

/**
 * Get the minimum role required for a permission
 */
export function getMinimumRoleForPermission(permission: Permission): MemberRole | null {
  for (let i = ROLE_HIERARCHY.length - 1; i >= 0; i--) {
    const role = ROLE_HIERARCHY[i];
    if (roleHasPermission(role, permission)) {
      return role;
    }
  }
  return null;
}

// ============================================================================
// Permission Groups (for UI display)
// ============================================================================

export interface PermissionGroup {
  name: string;
  description: string;
  permissions: {
    permission: Permission;
    label: string;
    description: string;
  }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    name: 'Workspace',
    description: 'Workspace-level permissions',
    permissions: [
      { permission: 'workspace:view', label: 'View Workspace', description: 'Access the workspace dashboard' },
      { permission: 'workspace:edit', label: 'Edit Workspace', description: 'Modify workspace name and description' },
      { permission: 'workspace:delete', label: 'Delete Workspace', description: 'Permanently delete the workspace' },
      { permission: 'workspace:manage_settings', label: 'Manage Settings', description: 'Configure workspace settings' },
      { permission: 'workspace:manage_billing', label: 'Manage Billing', description: 'View and manage billing information' },
    ],
  },
  {
    name: 'Members',
    description: 'Team member management',
    permissions: [
      { permission: 'members:view', label: 'View Members', description: 'See workspace members' },
      { permission: 'members:invite', label: 'Invite Members', description: 'Send invitations to new members' },
      { permission: 'members:edit', label: 'Edit Members', description: 'Change member roles and permissions' },
      { permission: 'members:remove', label: 'Remove Members', description: 'Remove members from workspace' },
    ],
  },
  {
    name: 'Devices',
    description: 'IoT device management',
    permissions: [
      { permission: 'devices:view', label: 'View Devices', description: 'See device list and details' },
      { permission: 'devices:create', label: 'Create Devices', description: 'Add new devices' },
      { permission: 'devices:edit', label: 'Edit Devices', description: 'Modify device settings' },
      { permission: 'devices:delete', label: 'Delete Devices', description: 'Remove devices permanently' },
      { permission: 'devices:control', label: 'Control Devices', description: 'Send commands to devices' },
      { permission: 'devices:view_data', label: 'View Data', description: 'Access device data and analytics' },
      { permission: 'devices:export_data', label: 'Export Data', description: 'Export device data' },
    ],
  },
  {
    name: 'Automations',
    description: 'Automation rules management',
    permissions: [
      { permission: 'automations:view', label: 'View Automations', description: 'See automation rules' },
      { permission: 'automations:create', label: 'Create Automations', description: 'Create new automation rules' },
      { permission: 'automations:edit', label: 'Edit Automations', description: 'Modify existing automations' },
      { permission: 'automations:delete', label: 'Delete Automations', description: 'Remove automations' },
      { permission: 'automations:toggle', label: 'Toggle Automations', description: 'Enable/disable automations' },
      { permission: 'automations:view_logs', label: 'View Logs', description: 'Access automation execution logs' },
    ],
  },
  {
    name: 'API Keys',
    description: 'API key management',
    permissions: [
      { permission: 'api_keys:view', label: 'View API Keys', description: 'See API key list' },
      { permission: 'api_keys:create', label: 'Create API Keys', description: 'Generate new API keys' },
      { permission: 'api_keys:revoke', label: 'Revoke API Keys', description: 'Revoke existing API keys' },
    ],
  },
];

// ============================================================================
// Role Descriptions
// ============================================================================

export interface RoleInfo {
  role: MemberRole;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}

export const ROLE_INFO: Record<MemberRole, RoleInfo> = {
  owner: {
    role: 'owner',
    label: 'Owner',
    description: 'Full control over the workspace including billing and deletion',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  admin: {
    role: 'admin',
    label: 'Admin',
    description: 'Can manage settings, members, and all resources',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  editor: {
    role: 'editor',
    label: 'Editor',
    description: 'Can create and modify devices and automations',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  viewer: {
    role: 'viewer',
    label: 'Viewer',
    description: 'Read-only access to workspace resources',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
  },
};

