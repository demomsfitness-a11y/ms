import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Layers,
  CreditCard,
  ClockAlert,
  BarChart3,
  History,
  Settings,
  Dumbbell,
  X,
  LogOut,
  ChevronRight,
  Database,
  ShieldCheck,
  ShieldAlert,
  Crown,
  UserCog,
  Key,
} from 'lucide-react';
import { AdminAccount } from '../types';
import { hasPermission, isSuperAdmin, getRoleLabel } from '../lib/permissions';

export type TabType =
  | 'dashboard'
  | 'appointments'
  | 'members'
  | 'plans'
  | 'payments'
  | 'expiry'
  | 'reports'
  | 'activity'
  | 'admins'
  | 'settings';

interface Props {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  adminEmail: string;
  currentAdmin?: AdminAccount;
  onLogout: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onOpenSql: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  adminEmail,
  currentAdmin,
  onLogout,
  isMobileOpen,
  setIsMobileOpen,
  onOpenSql,
}) => {
  const isSuper = isSuperAdmin(currentAdmin);

  const menuItems: {
    id: TabType;
    label: string;
    icon: React.FC<{ className?: string }>;
    requiredPermission?: any;
    superAdminOnly?: boolean;
    badge?: string;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, requiredPermission: 'dashboard.view' },
    { id: 'appointments', label: 'Appointments', icon: CalendarCheck, requiredPermission: 'appointments.view' },
    { id: 'members', label: 'Members', icon: Users, requiredPermission: 'members.view' },
    { id: 'plans', label: 'Membership Plans', icon: Layers, requiredPermission: 'plans.view' },
    { id: 'payments', label: 'Payments', icon: CreditCard, requiredPermission: 'payments.view' },
    { id: 'expiry', label: 'Expiry Management', icon: ClockAlert, requiredPermission: 'members.view' },
    { id: 'reports', label: 'Reports', icon: BarChart3, requiredPermission: 'dashboard.view' },
    { id: 'activity', label: 'Activity Logs', icon: History, requiredPermission: 'activity_logs.view' },
    {
      id: 'admins',
      label: 'Admin Management',
      icon: UserCog,
      superAdminOnly: true,
      badge: 'Super Admin',
    },
    { id: 'settings', label: 'Settings', icon: Settings, requiredPermission: 'settings.view' },
  ];

  const handleSelect = (tab: TabType) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  const filteredMenuItems = menuItems.filter((item) => {
    if (item.superAdminOnly) {
      return isSuper || hasPermission(currentAdmin, 'admins.view');
    }
    if (item.requiredPermission) {
      return hasPermission(currentAdmin, item.requiredPermission);
    }
    return true;
  });

  const roleLabel = currentAdmin ? getRoleLabel(currentAdmin.role) : 'Administrator';

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden animate-in fade-in"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-neutral-950 border-r border-neutral-800/80 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } no-print`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-neutral-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-extrabold text-white tracking-wider font-display leading-none">
                  MS FITNESS
                </span>
                <span className="px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-red-500 font-semibold tracking-wider uppercase mt-0.5">
                Stronger Body, Stronger You
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 px-4 py-6 overflow-y-auto space-y-1.5">
          <div className="px-3 pb-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center justify-between">
            <span>Main Management</span>
            {isSuper && (
              <span className="text-[9px] text-red-400 font-mono font-bold flex items-center gap-1">
                <Crown className="w-2.5 h-2.5" /> ROOT
              </span>
            )}
          </div>

          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                  isActive
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/25'
                    : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : 'text-neutral-500 group-hover:text-red-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.badge && !isActive && (
                    <span className="px-1.5 py-0.5 rounded bg-red-950/60 border border-red-800/60 text-red-400 text-[9px] font-bold tracking-wider uppercase">
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-4 h-4 text-white/80" />}
                </div>
              </button>
            );
          })}

          <div className="pt-6 px-3 pb-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            Database Tools
          </div>

          <button
            onClick={onOpenSql}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900/80 transition-all group"
          >
            <Database className="w-4 h-4 text-neutral-500 group-hover:text-red-400" />
            <span>SQL Setup Script</span>
          </button>
        </div>

        {/* Authenticated Admin Card Footer */}
        <div className="p-4 border-t border-neutral-800/80 bg-neutral-950/90">
          <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-3 flex items-center justify-between gap-2">
            <div className="min-w-0 pr-1 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="block text-xs font-bold text-white truncate">
                  {currentAdmin?.full_name || adminEmail.split('@')[0]}
                </span>
                {currentAdmin?.admin_id && (
                  <span className="px-1.5 py-0.2 rounded bg-neutral-950 text-red-400 text-[9px] font-mono font-bold">
                    {currentAdmin.admin_id}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    currentAdmin?.role === 'super_admin'
                      ? 'text-red-400'
                      : currentAdmin?.role === 'admin'
                      ? 'text-blue-400'
                      : 'text-purple-400'
                  }`}
                >
                  {currentAdmin?.role === 'super_admin' && <Crown className="w-2.5 h-2.5" />}
                  {roleLabel}
                </span>
                <span className="text-[10px] text-neutral-600">•</span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Logout session"
              className="p-2 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
