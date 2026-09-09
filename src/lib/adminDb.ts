import { getSupabase, isSupabaseConfigured } from './supabase';
import { AdminAccount, AdminRole, AdminStatus, PermissionKey, ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../types';
import { logActivity, formatSupabaseError, isTableMissingError, setSupabaseSchemaPending } from './db';

export const DEFAULT_INITIAL_ADMINS: Omit<AdminAccount, 'id'>[] = [
  {
    admin_id: 'ADM-0001',
    full_name: 'Manav Singhal',
    email: 'singhalmanav58@gmail.com',
    role: 'super_admin',
    status: 'active',
    permissions: ALL_PERMISSIONS.map((p) => p.key),
    created_at: '2025-01-01T00:00:00.000Z',
  },
  {
    admin_id: 'ADM-0002',
    full_name: 'MS Fitness Super Admin',
    email: 'admin@msfitness.com',
    role: 'super_admin',
    status: 'active',
    permissions: ALL_PERMISSIONS.map((p) => p.key),
    created_at: '2025-01-01T00:00:00.000Z',
  },
];

// Local memory fallback if Supabase table is not yet created
const LOCAL_ADMINS_STORAGE_KEY = 'msf_gym_admins_v1';

function getStoredLocalAdmins(): AdminAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_ADMINS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Error reading local admins:', e);
  }

  const seeded: AdminAccount[] = DEFAULT_INITIAL_ADMINS.map((a, idx) => ({
    ...a,
    id: `admin-local-${idx + 1}`,
  }));
  saveStoredLocalAdmins(seeded);
  return seeded;
}

function saveStoredLocalAdmins(admins: AdminAccount[]) {
  try {
    localStorage.setItem(LOCAL_ADMINS_STORAGE_KEY, JSON.stringify(admins));
  } catch (e) {
    console.warn('Error saving local admins:', e);
  }
}

/**
 * Generates the next sequential Admin ID (e.g. ADM-0003)
 */
export async function generateNextAdminId(): Promise<string> {
  try {
    const admins = await fetchAdmins();
    let maxNum = 0;
    for (const a of admins) {
      const match = a.admin_id?.match(/ADM-(\d+)/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    const nextNum = maxNum + 1;
    return `ADM-${String(nextNum).padStart(4, '0')}`;
  } catch {
    return `ADM-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

/**
 * Fetch all registered admin accounts from Supabase (with fallback to local storage)
 */
export async function fetchAdmins(): Promise<AdminAccount[]> {
  const client = getSupabase();
  if (client && isSupabaseConfigured()) {
    try {
      const { data, error } = await client
        .from('admins')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data) {
        if (data.length === 0) {
          // If the table is empty, auto-seed the default super admins
          console.log('[Supabase] admins table is empty. Bootstrapping default super admins...');
          for (const initial of DEFAULT_INITIAL_ADMINS) {
            try {
              await client.from('admins').insert([initial]);
            } catch (seedErr) {
              console.warn('Notice seeding admin:', seedErr);
            }
          }
          // Query again
          const { data: seededData } = await client
            .from('admins')
            .select('*')
            .order('created_at', { ascending: true });
          if (seededData && seededData.length > 0) {
            return formatAdminsData(seededData);
          }
        }
        return formatAdminsData(data);
      }

      if (error) {
        if (isTableMissingError(error)) {
          console.warn('[Supabase] admins table not found. Operating with local admin accounts.');
          setSupabaseSchemaPending(true);
        } else {
          console.warn('Error querying admins from Supabase:', error.message);
        }
      }
    } catch (err) {
      console.warn('Exception querying admins:', err);
    }
  }

  return getStoredLocalAdmins();
}

function formatAdminsData(rows: any[]): AdminAccount[] {
  return rows.map((r) => {
    let perms: PermissionKey[] = [];
    if (Array.isArray(r.permissions)) {
      perms = r.permissions;
    } else if (typeof r.permissions === 'string') {
      try {
        perms = JSON.parse(r.permissions);
      } catch {
        perms = DEFAULT_ROLE_PERMISSIONS[r.role as AdminRole] || [];
      }
    } else {
      perms = DEFAULT_ROLE_PERMISSIONS[r.role as AdminRole] || [];
    }

    return {
      id: r.id,
      admin_id: r.admin_id || `ADM-${r.id.slice(0, 4).toUpperCase()}`,
      full_name: r.full_name || r.name || 'Admin',
      email: (r.email || '').toLowerCase().trim(),
      role: (r.role || 'admin') as AdminRole,
      status: (r.status || 'active') as AdminStatus,
      permissions: perms,
      last_login: r.last_login,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });
}

export const getAdmins = fetchAdmins;

/**
 * Fetch a single admin by email (case-insensitive)
 */
export async function fetchAdminByEmail(email: string): Promise<AdminAccount | null> {
  const cleanEmail = email.toLowerCase().trim();
  const client = getSupabase();

  if (client && isSupabaseConfigured()) {
    try {
      const { data, error } = await client
        .from('admins')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (!error && data) {
        return formatAdminsData([data])[0];
      }

      // If table doesn't exist or user is super admin default
      if (
        cleanEmail === 'singhalmanav58@gmail.com' ||
        cleanEmail === 'admin@msfitness.com'
      ) {
        const foundLocal = getStoredLocalAdmins().find((a) => a.email.toLowerCase() === cleanEmail);
        if (foundLocal) return foundLocal;

        return {
          id: `super-${Date.now()}`,
          admin_id: 'ADM-0001',
          full_name: cleanEmail.includes('singhal') ? 'Manav Singhal' : 'MS Fitness Super Admin',
          email: cleanEmail,
          role: 'super_admin',
          status: 'active',
          permissions: ALL_PERMISSIONS.map((p) => p.key),
          created_at: new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn('Error fetching admin by email from Supabase:', err);
    }
  }

  // Fallback to local storage
  const localList = getStoredLocalAdmins();
  const localMatch = localList.find((a) => a.email.toLowerCase() === cleanEmail);
  if (localMatch) return localMatch;

  // If default super admin
  if (cleanEmail === 'singhalmanav58@gmail.com' || cleanEmail === 'admin@msfitness.com') {
    return {
      id: 'admin-super-auto',
      admin_id: 'ADM-0001',
      full_name: cleanEmail.includes('singhal') ? 'Manav Singhal' : 'MS Fitness Super Admin',
      email: cleanEmail,
      role: 'super_admin',
      status: 'active',
      permissions: ALL_PERMISSIONS.map((p) => p.key),
      created_at: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Create a new admin (Super Admin authorization strictly enforced)
 */
export async function createAdmin(
  adminData: {
    full_name: string;
    email: string;
    role: AdminRole;
    status: AdminStatus;
    permissions?: PermissionKey[];
  },
  callerAdmin: AdminAccount
): Promise<AdminAccount> {
  if (callerAdmin.role !== 'super_admin') {
    throw new Error('Unauthorized: Only Super Admin can create new admin accounts.');
  }

  const cleanEmail = adminData.email.toLowerCase().trim();
  const existing = await fetchAdminByEmail(cleanEmail);
  if (existing) {
    throw new Error(`An admin account with email "${cleanEmail}" already exists.`);
  }

  const nextAdminId = await generateNextAdminId();
  const permissions =
    adminData.permissions && adminData.permissions.length > 0
      ? adminData.permissions
      : DEFAULT_ROLE_PERMISSIONS[adminData.role] || [];

  const newAdminPayload = {
    admin_id: nextAdminId,
    full_name: adminData.full_name.trim(),
    email: cleanEmail,
    role: adminData.role,
    status: adminData.status,
    permissions,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const client = getSupabase();
  let created: AdminAccount | null = null;

  if (client && isSupabaseConfigured()) {
    try {
      const { data, error } = await client
        .from('admins')
        .insert([newAdminPayload])
        .select()
        .single();

      if (!error && data) {
        created = formatAdminsData([data])[0];
      } else if (error) {
        console.warn('Supabase create admin notice:', error.message);
        if (isTableMissingError(error)) setSupabaseSchemaPending(true);
      }
    } catch (err) {
      console.warn('Supabase create admin failed, persisting locally:', err);
    }
  }

  if (!created) {
    // Local persistence
    const local = getStoredLocalAdmins();
    const newLocal: AdminAccount = {
      id: `admin-local-${Date.now()}`,
      ...newAdminPayload,
    };
    local.push(newLocal);
    saveStoredLocalAdmins(local);
    created = newLocal;
  }

  await logActivity(
    'Create Admin',
    `${callerAdmin.full_name} created new ${adminData.role.replace('_', ' ')} account for ${adminData.full_name} (${cleanEmail})`,
    callerAdmin,
    {
      module: 'Admins',
      target_type: 'admin',
      target_id: created.admin_id,
      status: 'success',
    }
  );

  return created;
}

/**
 * Update an existing admin record (Super Admin authorization strictly enforced)
 */
export async function updateAdmin(
  id: string,
  updates: Partial<AdminAccount>,
  callerAdmin: AdminAccount
): Promise<AdminAccount> {
  if (callerAdmin.role !== 'super_admin') {
    throw new Error('Unauthorized: Only Super Admin can modify admin accounts.');
  }

  // Prevent super admin from accidentally deactivating their own active account
  if (
    (callerAdmin.id === id || callerAdmin.email.toLowerCase() === updates.email?.toLowerCase()) &&
    updates.status === 'inactive'
  ) {
    throw new Error('Self-Protection: You cannot deactivate your own active Super Admin account.');
  }

  // Prevent super admin from accidentally demoting their own role
  if (
    (callerAdmin.id === id || callerAdmin.email.toLowerCase() === updates.email?.toLowerCase()) &&
    updates.role &&
    updates.role !== 'super_admin'
  ) {
    throw new Error('Self-Protection: You cannot change your own role from Super Admin.');
  }

  const payload: any = { ...updates, updated_at: new Date().toISOString() };
  delete payload.id;

  const client = getSupabase();
  let updated: AdminAccount | null = null;

  if (client && isSupabaseConfigured()) {
    try {
      const { data, error } = await client
        .from('admins')
        .update(payload)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!error && data) {
        updated = formatAdminsData([data])[0];
      } else if (error) {
        console.warn('Supabase update admin notice:', error.message);
      }
    } catch (err) {
      console.warn('Supabase update admin error:', err);
    }
  }

  // Local sync
  const local = getStoredLocalAdmins();
  const idx = local.findIndex((a) => a.id === id);
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...updates, updated_at: new Date().toISOString() };
    saveStoredLocalAdmins(local);
    if (!updated) updated = local[idx];
  }

  if (!updated) {
    throw new Error('Could not find admin account to update.');
  }

  let actionName = 'Edit Admin';
  if (updates.status === 'active') actionName = 'Activate Admin';
  else if (updates.status === 'inactive') actionName = 'Deactivate Admin';
  else if (updates.role) actionName = 'Change Role';
  else if (updates.permissions) actionName = 'Change Permissions';

  await logActivity(
    actionName,
    `${callerAdmin.full_name} updated admin ${updated.full_name} (${updated.admin_id})`,
    callerAdmin,
    {
      module: 'Admins',
      target_type: 'admin',
      target_id: updated.admin_id,
      status: 'success',
    }
  );

  return updated;
}

/**
 * Delete an admin record (Super Admin authorization strictly enforced)
 */
export async function deleteAdmin(
  id: string,
  adminId: string,
  adminName: string,
  callerAdmin: AdminAccount
): Promise<boolean> {
  if (callerAdmin.role !== 'super_admin') {
    throw new Error('Unauthorized: Only Super Admin can delete admin accounts.');
  }

  if (callerAdmin.id === id) {
    throw new Error('Self-Protection: You cannot delete your own Super Admin account.');
  }

  const client = getSupabase();
  if (client && isSupabaseConfigured()) {
    try {
      const { error } = await client.from('admins').delete().eq('id', id);
      if (error) {
        console.warn('Supabase delete admin error:', error.message);
      }
    } catch (err) {
      console.warn('Supabase delete admin exception:', err);
    }
  }

  // Local storage cleanup
  const local = getStoredLocalAdmins().filter((a) => a.id !== id);
  saveStoredLocalAdmins(local);

  await logActivity(
    'Delete Admin',
    `${callerAdmin.full_name} permanently deleted admin account ${adminName} (${adminId})`,
    callerAdmin,
    {
      module: 'Admins',
      target_type: 'admin',
      target_id: adminId,
      status: 'warning',
    }
  );

  return true;
}

/**
 * Update last login timestamp for an admin account
 */
export async function updateAdminLastLogin(email: string): Promise<void> {
  const cleanEmail = email.toLowerCase().trim();
  const now = new Date().toISOString();

  const client = getSupabase();
  if (client && isSupabaseConfigured()) {
    try {
      await client
        .from('admins')
        .update({ last_login: now })
        .ilike('email', cleanEmail);
    } catch (e) {
      // Non-blocking
    }
  }

  // Local storage
  const local = getStoredLocalAdmins();
  const found = local.find((a) => a.email.toLowerCase() === cleanEmail);
  if (found) {
    found.last_login = now;
    saveStoredLocalAdmins(local);
  }
}
