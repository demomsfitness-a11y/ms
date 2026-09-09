import React, { useState } from 'react';
import {
  AdminAccount,
  AdminRole,
  AdminStatus,
  PermissionKey,
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  ActivityLog,
} from '../types';
import { isSuperAdmin, getRoleLabel } from '../lib/permissions';
import {
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Clock,
  Key,
  Trash2,
  Edit2,
  Eye,
  AlertTriangle,
  UserCheck,
  UserX,
  X,
  Check,
  RotateCcw,
  Sparkles,
  Crown,
  History,
  Lock,
} from 'lucide-react';

interface Props {
  currentAdmin: AdminAccount;
  admins: AdminAccount[];
  activityLogs: ActivityLog[];
  onAddAdmin: (data: {
    full_name: string;
    email: string;
    role: AdminRole;
    status: AdminStatus;
    permissions?: PermissionKey[];
  }) => Promise<void>;
  onUpdateAdmin: (id: string, updates: Partial<AdminAccount>) => Promise<void>;
  onDeleteAdmin: (id: string, adminId: string, adminName: string) => Promise<void>;
  onOpenMemberProfile?: (memberIdOrCode: string) => void;
}

export const AdminManagementView: React.FC<Props> = ({
  currentAdmin,
  admins,
  activityLogs,
  onAddAdmin,
  onUpdateAdmin,
  onDeleteAdmin,
  onOpenMemberProfile,
}) => {
  const isSuper = isSuperAdmin(currentAdmin);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
  const [viewingAdmin, setViewingAdmin] = useState<AdminAccount | null>(null);
  const [permissionsAdmin, setPermissionsAdmin] = useState<AdminAccount | null>(null);

  // Confirmation dialogs state
  const [confirmDeactivateAdmin, setConfirmDeactivateAdmin] = useState<AdminAccount | null>(null);
  const [confirmDeleteAdmin, setConfirmDeleteAdmin] = useState<AdminAccount | null>(null);

  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Add Admin form fields
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<AdminRole>('admin');
  const [newStatus, setNewStatus] = useState<AdminStatus>('active');
  const [newPermissions, setNewPermissions] = useState<PermissionKey[]>(
    DEFAULT_ROLE_PERMISSIONS.admin
  );

  // Edit Admin form fields
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<AdminRole>('admin');
  const [editStatus, setEditStatus] = useState<AdminStatus>('active');

  // Permissions edit temporary selection
  const [tempPermissions, setTempPermissions] = useState<PermissionKey[]>([]);

  // Open Add modal with defaults
  const handleOpenAddModal = () => {
    setNewFullName('');
    setNewEmail('');
    setNewRole('admin');
    setNewStatus('active');
    setNewPermissions(DEFAULT_ROLE_PERMISSIONS.admin);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleRoleChangeForNew = (role: AdminRole) => {
    setNewRole(role);
    setNewPermissions(DEFAULT_ROLE_PERMISSIONS[role] || []);
  };

  // Submit Add Admin
  const handleSaveNewAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newFullName.trim()) {
      setFormError('Full name is required.');
      return;
    }
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setFormError('A valid email address is required.');
      return;
    }

    setSubmitting(true);
    try {
      await onAddAdmin({
        full_name: newFullName.trim(),
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        status: newStatus,
        permissions: newPermissions,
      });
      setIsAddModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create admin.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit modal
  const handleOpenEditModal = (admin: AdminAccount) => {
    setEditingAdmin(admin);
    setEditFullName(admin.full_name);
    setEditEmail(admin.email);
    setEditRole(admin.role);
    setEditStatus(admin.status);
    setFormError(null);
  };

  // Submit Edit Admin
  const handleSaveEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setFormError(null);

    if (!editFullName.trim()) {
      setFormError('Full name is required.');
      return;
    }

    setSubmitting(true);
    try {
      await onUpdateAdmin(editingAdmin.id, {
        full_name: editFullName.trim(),
        role: editRole,
        status: editStatus,
      });
      setEditingAdmin(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to update admin.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Permissions Modal
  const handleOpenPermissionsModal = (admin: AdminAccount) => {
    setPermissionsAdmin(admin);
    setTempPermissions([...(admin.permissions || [])]);
  };

  const handleTogglePermission = (key: PermissionKey) => {
    setTempPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSavePermissions = async () => {
    if (!permissionsAdmin) return;
    setSubmitting(true);
    try {
      await onUpdateAdmin(permissionsAdmin.id, {
        permissions: tempPermissions,
      });
      setPermissionsAdmin(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active/inactive
  const handleToggleStatus = async (admin: AdminAccount) => {
    if (admin.status === 'active') {
      // Prompt confirmation
      setConfirmDeactivateAdmin(admin);
    } else {
      // Directly activate
      setSubmitting(true);
      try {
        await onUpdateAdmin(admin.id, { status: 'active' });
      } catch (err: any) {
        alert(err.message || 'Failed to activate admin.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!confirmDeactivateAdmin) return;
    setSubmitting(true);
    try {
      await onUpdateAdmin(confirmDeactivateAdmin.id, { status: 'inactive' });
      setConfirmDeactivateAdmin(null);
    } catch (err: any) {
      alert(err.message || 'Failed to deactivate admin.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteAdmin) return;
    setSubmitting(true);
    try {
      await onDeleteAdmin(
        confirmDeleteAdmin.id,
        confirmDeleteAdmin.admin_id,
        confirmDeleteAdmin.full_name
      );
      setConfirmDeleteAdmin(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete admin.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter admins
  const filteredAdmins = admins.filter((a) => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        a.full_name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.admin_id.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (roleFilter !== 'all' && a.role !== roleFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    return true;
  });

  // Calculate statistics
  const totalAdmins = admins.length;
  const activeAdmins = admins.filter((a) => a.status === 'active').length;
  const inactiveAdmins = admins.filter((a) => a.status === 'inactive').length;
  const superAdminsCount = admins.filter((a) => a.role === 'super_admin').length;

  // Group permissions by module for the permissions editor
  const permissionsByModule = ALL_PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, typeof ALL_PERMISSIONS>);

  // Access check guard
  if (!isSuper) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-neutral-900/50 border border-neutral-800 rounded-3xl animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white font-display">
          SUPER ADMIN PRIVILEGES REQUIRED
        </h2>
        <p className="text-sm text-neutral-400 max-w-md mt-2">
          The Admin Management section is strictly restricted to authorized Super Administrators. Your current account ({currentAdmin.email}) is assigned the role of <strong>{getRoleLabel(currentAdmin.role)}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Header */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl md:text-3xl font-bold text-white font-display tracking-tight">
              MULTI-ADMIN MANAGEMENT
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-red-600/20 border border-red-500/30 text-red-400 flex items-center gap-1">
              <Crown className="w-3 h-3 text-red-400" /> Super Admin Exclusive
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Provision staff accounts, configure granular RBAC permissions, and enforce administrative access control.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Admin</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4">
          <span className="text-[11px] text-neutral-400 block font-medium">Total Administrators</span>
          <span className="text-2xl font-bold text-white font-display mt-1 block">{totalAdmins}</span>
          <span className="text-[10px] text-neutral-500 mt-1 block">Registered in database</span>
        </div>

        <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4">
          <span className="text-[11px] text-emerald-400 block font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Active Accounts
          </span>
          <span className="text-2xl font-bold text-white font-display mt-1 block">{activeAdmins}</span>
          <span className="text-[10px] text-neutral-500 mt-1 block">Permitted to sign in</span>
        </div>

        <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4">
          <span className="text-[11px] text-amber-400 block font-medium flex items-center gap-1">
            <UserX className="w-3 h-3" /> Deactivated Accounts
          </span>
          <span className="text-2xl font-bold text-white font-display mt-1 block">{inactiveAdmins}</span>
          <span className="text-[10px] text-neutral-500 mt-1 block">Access locked</span>
        </div>

        <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4">
          <span className="text-[11px] text-red-400 block font-medium flex items-center gap-1">
            <Crown className="w-3 h-3" /> Super Admins
          </span>
          <span className="text-2xl font-bold text-white font-display mt-1 block">{superAdminsCount}</span>
          <span className="text-[10px] text-neutral-500 mt-1 block">Full system governance</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, admin ID..."
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 rounded-xl px-3 py-2 outline-none focus:border-red-500"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 rounded-xl px-3 py-2 outline-none focus:border-red-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-950/80 text-neutral-400 uppercase text-[10px] font-bold border-b border-neutral-800 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Admin ID</th>
                <th className="py-3.5 px-4">Administrator</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Permissions</th>
                <th className="py-3.5 px-4">Last Login</th>
                <th className="py-3.5 px-4">Created</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-500">
                    No administrator accounts match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => {
                  const isCurrent = admin.id === currentAdmin.id || admin.email.toLowerCase() === currentAdmin.email.toLowerCase();
                  const permsCount = admin.permissions?.length || 0;
                  const totalPerms = ALL_PERMISSIONS.length;

                  return (
                    <tr
                      key={admin.id}
                      className={`hover:bg-neutral-800/40 transition-colors ${
                        isCurrent ? 'bg-red-950/10' : ''
                      }`}
                    >
                      {/* Admin ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                        <span className="px-2 py-1 rounded bg-neutral-950 border border-neutral-800 text-[11px] text-red-400 font-mono">
                          {admin.admin_id}
                        </span>
                      </td>

                      {/* Admin Profile */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center font-bold text-white text-xs shrink-0">
                            {admin.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs">{admin.full_name}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 text-[9px] font-bold uppercase">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-neutral-400 block font-mono">
                              {admin.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {admin.role === 'super_admin' ? (
                          <span className="px-2.5 py-1 rounded-full bg-red-950/80 border border-red-800/80 text-red-400 font-bold text-[10px] flex items-center gap-1 w-fit">
                            <Crown className="w-3 h-3 text-red-400" /> Super Admin
                          </span>
                        ) : admin.role === 'admin' ? (
                          <span className="px-2.5 py-1 rounded-full bg-blue-950/80 border border-blue-800/80 text-blue-400 font-bold text-[10px] flex items-center gap-1 w-fit">
                            <ShieldCheck className="w-3 h-3 text-blue-400" /> Admin
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-purple-950/80 border border-purple-800/80 text-purple-400 font-bold text-[10px] flex items-center gap-1 w-fit">
                            <Key className="w-3 h-3 text-purple-400" /> Staff
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {admin.status === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 text-[10px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-400 text-[10px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Permissions */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenPermissionsModal(admin)}
                          title="Click to view and configure granular permissions"
                          className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-[10px] font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <Key className="w-3 h-3 text-red-400" />
                          <span>
                            {admin.role === 'super_admin' ? 'All (Full Access)' : `${permsCount} / ${totalPerms}`}
                          </span>
                        </button>
                      </td>

                      {/* Last Login */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-neutral-400 text-[11px] font-mono">
                        {admin.last_login ? (
                          new Date(admin.last_login).toLocaleString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        ) : (
                          <span className="text-neutral-500 italic">Never</span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-neutral-400 text-[11px] font-mono">
                        {admin.created_at
                          ? new Date(admin.created_at).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details */}
                          <button
                            onClick={() => setViewingAdmin(admin)}
                            title="View Admin Details & Audit Trail"
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => handleOpenEditModal(admin)}
                            title="Edit Admin Account"
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active/Inactive */}
                          <button
                            onClick={() => handleToggleStatus(admin)}
                            disabled={isCurrent && admin.status === 'active'}
                            title={
                              isCurrent && admin.status === 'active'
                                ? 'Self-Protection: Cannot deactivate yourself'
                                : admin.status === 'active'
                                ? 'Deactivate Admin'
                                : 'Activate Admin'
                            }
                            className={`p-1.5 rounded-lg transition-colors ${
                              isCurrent && admin.status === 'active'
                                ? 'opacity-40 cursor-not-allowed bg-neutral-900 text-neutral-600'
                                : admin.status === 'active'
                                ? 'bg-amber-950/60 hover:bg-amber-900/60 text-amber-400 border border-amber-800/40'
                                : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/40'
                            }`}
                          >
                            {admin.status === 'active' ? (
                              <UserX className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Delete Admin */}
                          <button
                            onClick={() => setConfirmDeleteAdmin(admin)}
                            disabled={isCurrent}
                            title={isCurrent ? 'Cannot delete your own account' : 'Delete Admin'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isCurrent
                                ? 'opacity-40 cursor-not-allowed bg-neutral-900 text-neutral-600'
                                : 'bg-neutral-800 hover:bg-red-950 hover:text-red-400 text-neutral-400'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ADD ADMIN MODAL */}
      {/* ============================================================ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base font-display">
                    PROVISION NEW ADMINISTRATOR
                  </h3>
                  <p className="text-xs text-neutral-400">Create an authenticated management profile</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-950/70 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewAdmin} className="space-y-4">
              <div>
                <label className="text-xs text-neutral-300 font-semibold block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-300 font-semibold block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. rahul.sharma@msfitness.com"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-neutral-300 font-semibold block mb-1">
                    Administrative Role *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => handleRoleChangeForNew(e.target.value as AdminRole)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                  >
                    <option value="admin">Admin (Operational)</option>
                    <option value="staff">Staff (Front Desk)</option>
                    <option value="super_admin">Super Admin (Full Access)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-neutral-300 font-semibold block mb-1">
                    Account Status *
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as AdminStatus)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                  >
                    <option value="active">Active (Can Sign In)</option>
                    <option value="inactive">Inactive (Suspended)</option>
                  </select>
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center justify-between text-neutral-300 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-red-400" /> Default Role Permissions
                  </span>
                  <span className="text-red-400 font-mono text-[11px]">
                    {newRole === 'super_admin' ? 'All (28)' : `${newPermissions.length} selected`}
                  </span>
                </div>
                <p className="text-neutral-500 text-[11px] leading-relaxed">
                  {newRole === 'super_admin'
                    ? 'Super Admins possess root authority across all gym modules, admin creation, and financial systems.'
                    : newRole === 'admin'
                    ? 'Standard Admins manage members, process fees, generate receipts, and inspect audit logs.'
                    : 'Staff are restricted to registering members and accepting payments with receipt issuance.'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/20 flex items-center gap-2"
                >
                  {submitting ? 'Creating Admin...' : 'Create Admin Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* EDIT ADMIN MODAL */}
      {/* ============================================================ */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base font-display">
                    EDIT ADMINISTRATOR: {editingAdmin.admin_id}
                  </h3>
                  <p className="text-xs text-neutral-400">{editingAdmin.email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingAdmin(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-950/70 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditAdmin} className="space-y-4">
              <div>
                <label className="text-xs text-neutral-300 font-semibold block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-300 font-semibold block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={editEmail}
                  className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-500 outline-none cursor-not-allowed"
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Email serves as the unique login credential.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-neutral-300 font-semibold block mb-1">
                    Role
                  </label>
                  <select
                    value={editRole}
                    disabled={editingAdmin.id === currentAdmin.id}
                    onChange={(e) => setEditRole(e.target.value as AdminRole)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none disabled:opacity-50"
                  >
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-neutral-300 font-semibold block mb-1">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    disabled={editingAdmin.id === currentAdmin.id}
                    onChange={(e) => setEditStatus(e.target.value as AdminStatus)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none disabled:opacity-50"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {editingAdmin.id === currentAdmin.id && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Self-Protection: You cannot alter your own role or active status.</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/20"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* GRANULAR PERMISSIONS MODAL */}
      {/* ============================================================ */}
      {permissionsAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base font-display">
                    GRANULAR ACCESS PERMISSIONS
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Configuring {permissionsAdmin.full_name} ({permissionsAdmin.admin_id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPermissionsAdmin(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center justify-between gap-2 p-3 bg-neutral-950 rounded-2xl border border-neutral-800 shrink-0">
              <div className="text-xs text-neutral-300">
                Enabled: <strong className="text-red-400 font-mono">{tempPermissions.length}</strong> / {ALL_PERMISSIONS.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTempPermissions(ALL_PERMISSIONS.map((p) => p.key))}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium"
                >
                  Select All
                </button>
                <button
                  onClick={() => setTempPermissions([])}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium"
                >
                  Clear All
                </button>
                <button
                  onClick={() =>
                    setTempPermissions(
                      DEFAULT_ROLE_PERMISSIONS[permissionsAdmin.role] || []
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-red-400 text-xs font-medium flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Defaults
                </button>
              </div>
            </div>

            {/* Permissions by Module Accordions/Grids */}
            <div className="overflow-y-auto space-y-6 flex-1 pr-1">
              {Object.entries(permissionsByModule).map(([moduleName, perms]) => (
                <div key={moduleName} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-300 pb-1 border-b border-neutral-800">
                    <span className="uppercase tracking-wider text-[11px] text-red-400">
                      {moduleName}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {perms.filter((p) => tempPermissions.includes(p.key)).length} / {perms.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {perms.map((perm) => {
                      const isChecked = tempPermissions.includes(perm.key);
                      return (
                        <label
                          key={perm.key}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-red-950/20 border-red-800/40 text-white'
                              : 'bg-neutral-950/40 border-neutral-800/60 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTogglePermission(perm.key)}
                            className="mt-0.5 rounded border-neutral-700 text-red-600 focus:ring-red-500"
                          />
                          <div>
                            <span className="block text-xs font-semibold text-neutral-200">
                              {perm.label}
                            </span>
                            <span className="block text-[10px] text-neutral-500 leading-tight mt-0.5">
                              {perm.description}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800 shrink-0">
              <button
                type="button"
                onClick={() => setPermissionsAdmin(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/20"
              >
                {submitting ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW ADMIN DETAILS MODAL & RECENT ACTIVITY */}
      {/* ============================================================ */}
      {viewingAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white font-bold text-base">
                  {viewingAdmin.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-lg font-display">
                      {viewingAdmin.full_name}
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-red-400 font-mono text-[11px] font-bold">
                      {viewingAdmin.admin_id}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 font-mono">{viewingAdmin.email}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingAdmin(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-6 flex-1 pr-1 text-xs">
              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800/80">
                  <span className="text-neutral-500 block text-[10px]">Role</span>
                  <span className="font-bold text-white uppercase text-[11px] mt-0.5 block">
                    {getRoleLabel(viewingAdmin.role)}
                  </span>
                </div>

                <div className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800/80">
                  <span className="text-neutral-500 block text-[10px]">Status</span>
                  <span
                    className={`font-bold capitalize text-[11px] mt-0.5 block ${
                      viewingAdmin.status === 'active' ? 'text-emerald-400' : 'text-neutral-400'
                    }`}
                  >
                    {viewingAdmin.status}
                  </span>
                </div>

                <div className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800/80">
                  <span className="text-neutral-500 block text-[10px]">Last Login</span>
                  <span className="font-mono text-neutral-300 text-[11px] mt-0.5 block">
                    {viewingAdmin.last_login
                      ? new Date(viewingAdmin.last_login).toLocaleDateString('en-IN')
                      : 'Never'}
                  </span>
                </div>

                <div className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800/80">
                  <span className="text-neutral-500 block text-[10px]">Created Date</span>
                  <span className="font-mono text-neutral-300 text-[11px] mt-0.5 block">
                    {viewingAdmin.created_at
                      ? new Date(viewingAdmin.created_at).toLocaleDateString('en-IN')
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Granted Permissions preview */}
              <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" /> Granted Permissions ({viewingAdmin.permissions?.length || 0})
                  </span>
                  <button
                    onClick={() => {
                      const adm = viewingAdmin;
                      setViewingAdmin(null);
                      handleOpenPermissionsModal(adm);
                    }}
                    className="text-xs text-red-400 hover:text-red-300 underline font-medium"
                  >
                    Edit Permissions
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {viewingAdmin.role === 'super_admin' ? (
                    <span className="px-2.5 py-1 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 font-mono text-[10px]">
                      Root Administrator: All permissions granted unconditionally
                    </span>
                  ) : viewingAdmin.permissions && viewingAdmin.permissions.length > 0 ? (
                    viewingAdmin.permissions.map((p) => (
                      <span
                        key={p}
                        className="px-2 py-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono text-[10px]"
                      >
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="text-neutral-500 text-[11px]">No active permissions assigned.</span>
                  )}
                </div>
              </div>

              {/* Recent Activity Log for this Admin */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-neutral-400" /> Admin Audit Trail
                  </span>
                </div>

                {(() => {
                  const adminLogs = activityLogs
                    .filter(
                      (l) =>
                        l.admin_email.toLowerCase() === viewingAdmin.email.toLowerCase() ||
                        l.admin_id === viewingAdmin.admin_id
                    )
                    .slice(0, 15);

                  if (adminLogs.length === 0) {
                    return (
                      <div className="text-center py-8 bg-neutral-950 rounded-2xl border border-neutral-800 text-neutral-500 text-xs">
                        No recorded activities found for this administrator yet.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {adminLogs.map((log) => (
                        <div
                          key={log.id}
                          className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/80 flex items-start justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{log.action}</span>
                              {log.module && (
                                <span className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 text-[9px] uppercase font-mono">
                                  {log.module}
                                </span>
                              )}
                            </div>
                            <p className="text-neutral-400 text-[11px] mt-0.5 leading-relaxed">
                              {log.description}
                            </p>
                          </div>
                          <span className="text-[10px] text-neutral-500 font-mono shrink-0 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-neutral-800 shrink-0">
              <button
                onClick={() => setViewingAdmin(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CONFIRM DEACTIVATE DIALOG */}
      {/* ============================================================ */}
      {confirmDeactivateAdmin && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-950/70 border border-amber-800/60 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white font-display">
                DEACTIVATE ADMINISTRATOR?
              </h3>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Are you sure you want to deactivate <strong>{confirmDeactivateAdmin.full_name}</strong> ({confirmDeactivateAdmin.email})?
              </p>
              <p className="text-xs text-amber-400/90 mt-2 bg-amber-950/30 p-2.5 rounded-xl border border-amber-800/40">
                Inactive administrators are immediately barred from logging in or performing any administrative mutations.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDeactivateAdmin(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeactivate}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold transition-colors"
              >
                {submitting ? 'Deactivating...' : 'Confirm Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CONFIRM DELETE DIALOG */}
      {/* ============================================================ */}
      {confirmDeleteAdmin && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-950/70 border border-red-800/60 flex items-center justify-center text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white font-display">
                DELETE ADMINISTRATOR?
              </h3>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                This will permanently delete the admin account for <strong>{confirmDeleteAdmin.full_name}</strong> ({confirmDeleteAdmin.admin_id} - {confirmDeleteAdmin.email}).
              </p>
              <p className="text-xs text-red-400/90 mt-2 bg-red-950/30 p-2.5 rounded-xl border border-red-800/40">
                Warning: This action is permanent and cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDeleteAdmin(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
              >
                {submitting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
