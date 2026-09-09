import React from 'react';
import { LogOut, User, Database, Plus, CreditCard, Menu, ShieldCheck, CalendarCheck, Crown } from 'lucide-react';
import { isSupabaseConfigured, DEFAULT_SUPABASE_PROJECT_ID } from '../lib/supabase';
import { AdminAccount } from '../types';
import { getRoleLabel, isSuperAdmin } from '../lib/permissions';

interface Props {
  title: string;
  adminEmail: string;
  currentAdmin?: AdminAccount;
  onLogout: () => void;
  onOpenConfig: () => void;
  onOpenSql?: () => void;
  isSchemaPending?: boolean;
  onOpenAddMember?: () => void;
  onOpenPayment?: () => void;
  onOpenBooking?: () => void;
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<Props> = ({
  title,
  adminEmail,
  currentAdmin,
  onLogout,
  onOpenConfig,
  onOpenSql,
  isSchemaPending,
  onOpenAddMember,
  onOpenPayment,
  onOpenBooking,
  onToggleMobileSidebar,
}) => {
  const isDbConfigured = isSupabaseConfigured();

  return (
    <header className="h-20 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800/80 sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between no-print">
      {/* Left: Mobile toggle & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide font-display leading-none">
            {title}
          </h1>
          <p className="text-[11px] text-neutral-400 font-medium hidden sm:block">
            MS Fitness Admin Portal
          </p>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Quick action buttons */}
        {isSchemaPending && onOpenSql && (
          <button
            onClick={onOpenSql}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 text-xs font-semibold transition-all shadow-sm animate-pulse"
            title="Database tables missing in Supabase. Click to copy SQL setup script."
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span>Setup DB Tables</span>
          </button>
        )}

        {onOpenBooking && (
          <button
            onClick={onOpenBooking}
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs font-semibold border border-neutral-800 transition-colors shadow-sm"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-red-500" /> Book Appointment
          </button>
        )}

        {onOpenPayment && (
          <button
            onClick={onOpenPayment}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs font-semibold border border-neutral-800 transition-colors shadow-sm"
          >
            <CreditCard className="w-3.5 h-3.5 text-red-500" /> Collect Fee
          </button>
        )}

        {onOpenAddMember && (
          <button
            onClick={onOpenAddMember}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all shadow-lg shadow-red-600/20"
          >
            <Plus className="w-3.5 h-3.5" /> Add Member
          </button>
        )}

        {/* Supabase Status Pill */}
        <button
          onClick={onOpenConfig}
          title={isDbConfigured ? `Connected to Supabase (${DEFAULT_SUPABASE_PROJECT_ID})` : 'Click to configure Supabase'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
            isDbConfigured
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/40'
              : 'bg-amber-950/40 text-amber-400 border-amber-800/60 hover:bg-amber-900/40'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">{isDbConfigured ? 'Supabase Connected' : 'Configure Supabase'}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${isDbConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        </button>

        {/* Admin profile & logout */}
        <div className="flex items-center gap-2 bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-1.5 pl-3">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
              isSuperAdmin(currentAdmin)
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                : 'bg-red-600/20 border border-red-500/30 text-red-400'
            }`}>
              {isSuperAdmin(currentAdmin) ? (
                <Crown className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <User className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="hidden md:block text-left">
              <span className="block text-xs font-bold text-white leading-tight max-w-[140px] truncate">
                {currentAdmin?.full_name || adminEmail.split('@')[0]}
              </span>
              <span className="text-[10px] text-neutral-400 leading-none flex items-center gap-0.5">
                <ShieldCheck className="w-2.5 h-2.5 text-red-400" />{' '}
                {currentAdmin ? getRoleLabel(currentAdmin.role) : 'Admin'}
              </span>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Sign Out"
            className="p-2 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
