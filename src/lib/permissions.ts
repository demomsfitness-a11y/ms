import { AdminAccount, AdminRole, PermissionKey, ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../types';

/**
 * Checks whether an admin has a specific granular permission.
 * Super Admin has all permissions by default.
 */
export function hasPermission(admin: AdminAccount | null | undefined, permission: PermissionKey): boolean {
  if (!admin) return false;
  if (admin.role === 'super_admin') return true;
  if (admin.status !== 'active') return false;
  return Array.isArray(admin.permissions) && admin.permissions.includes(permission);
}

/**
 * Quick check if the logged in user is a Super Admin
 */
export function isSuperAdmin(admin: AdminAccount | null | undefined): boolean {
  return Boolean(admin && admin.role === 'super_admin' && admin.status === 'active');
}

/**
 * Returns human-readable label for a role
 */
export function getRoleLabel(role?: AdminRole | string): string {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    case 'staff':
      return 'Staff';
    default:
      return 'Admin';
  }
}

/**
 * Returns default permissions for a role
 */
export function getDefaultPermissionsForRole(role: AdminRole): PermissionKey[] {
  return DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.admin;
}
