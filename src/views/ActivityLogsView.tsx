import React, { useState, useMemo } from 'react';
import { ActivityLog } from '../types';
import {
  History,
  Search,
  User,
  Clock,
  ShieldCheck,
  Tag,
  Filter,
  Calendar,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ExternalLink,
  Shield,
  Layers,
  CreditCard,
  Receipt,
  Users,
  Key,
  Crown,
} from 'lucide-react';

interface Props {
  logs: ActivityLog[];
  onOpenMemberProfile?: (memberIdOrCode: string) => void;
}

export const ActivityLogsView: React.FC<Props> = ({ logs, onOpenMemberProfile }) => {
  // Filter states
  const [search, setSearch] = useState('');
  const [adminFilter, setAdminFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Distinct admins for filter dropdown
  const distinctAdmins = useMemo(() => {
    const map = new Map<string, { email: string; name?: string }>();
    logs.forEach((l) => {
      if (l.admin_email && !map.has(l.admin_email.toLowerCase())) {
        map.set(l.admin_email.toLowerCase(), {
          email: l.admin_email,
          name: l.admin_name || l.admin_email.split('@')[0],
        });
      }
    });
    return Array.from(map.values());
  }, [logs]);

  // Distinct modules for filter
  const distinctModules = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.module) set.add(l.module);
    });
    return Array.from(set);
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    return logs.filter((l) => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        const matchesSearch =
          l.action.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.admin_email.toLowerCase().includes(q) ||
          (l.admin_name && l.admin_name.toLowerCase().includes(q)) ||
          (l.target_id && l.target_id.toLowerCase().includes(q)) ||
          (l.module && l.module.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // Admin filter
      if (adminFilter !== 'all' && l.admin_email.toLowerCase() !== adminFilter.toLowerCase()) {
        return false;
      }

      // Role filter
      if (roleFilter !== 'all') {
        const r = (l.role || 'admin').toLowerCase();
        if (r !== roleFilter.toLowerCase()) return false;
      }

      // Module filter
      if (moduleFilter !== 'all') {
        if ((l.module || '').toLowerCase() !== moduleFilter.toLowerCase()) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const st = (l.status || 'success').toLowerCase();
        if (st !== statusFilter.toLowerCase()) return false;
      }

      // Date Range filter
      if (dateRangeFilter !== 'all') {
        const logTime = new Date(l.timestamp).getTime();
        if (isNaN(logTime)) return true;
        if (dateRangeFilter === 'today' && now - logTime > oneDay) return false;
        if (dateRangeFilter === '7days' && now - logTime > 7 * oneDay) return false;
        if (dateRangeFilter === '30days' && now - logTime > 30 * oneDay) return false;
      }

      return true;
    });
  }, [logs, search, adminFilter, roleFilter, moduleFilter, statusFilter, dateRangeFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Reset pagination when filter changes
  const handleFilterChange = (setter: (val: any) => void, val: any) => {
    setter(val);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setAdminFilter('all');
    setRoleFilter('all');
    setModuleFilter('all');
    setStatusFilter('all');
    setDateRangeFilter('all');
    setCurrentPage(1);
  };

  // Helper to render description with clickable member IDs
  const renderDescriptionWithLinks = (text: string) => {
    const memberIdPattern = /(MS-\d{3,6})/gi;
    const parts = text.split(memberIdPattern);

    return parts.map((part, i) => {
      if (part.match(memberIdPattern)) {
        return (
          <button
            key={i}
            onClick={() => onOpenMemberProfile && onOpenMemberProfile(part.toUpperCase())}
            title={`View Athlete Profile: ${part.toUpperCase()}`}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-950/80 hover:bg-red-900/80 border border-red-800/60 text-red-300 font-mono font-bold text-xs underline mx-1 transition-colors"
          >
            <span>{part.toUpperCase()}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
          </button>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl md:text-3xl font-bold text-white font-display tracking-tight">
              ADMIN AUDIT TRAIL & ACTIVITY LOGS
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-red-600/20 border border-red-500/30 text-red-400">
              Immutable Records
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time audit log recording athlete registrations, payment processing, plan configuration, and administrative governance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 font-mono flex items-center gap-2">
            <History className="w-4 h-4 text-red-500" />
            <span>Total Events: <strong className="text-white">{logs.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleFilterChange(setSearch, e.target.value)}
              placeholder="Search action, athlete ID, admin..."
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-neutral-500 outline-none transition-colors"
            />
          </div>

          {/* Module Filter */}
          <div>
            <select
              value={moduleFilter}
              onChange={(e) => handleFilterChange(setModuleFilter, e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl px-3 py-2 text-xs text-neutral-300 outline-none"
            >
              <option value="all">All Modules</option>
              <option value="Members">Members</option>
              <option value="Payments">Payments</option>
              <option value="Receipts">Receipts</option>
              <option value="Plans">Plans</option>
              <option value="Admins">Admins</option>
              <option value="Auth">Auth</option>
              <option value="Settings">Settings</option>
              <option value="Appointments">Appointments</option>
            </select>
          </div>

          {/* Admin Filter */}
          <div>
            <select
              value={adminFilter}
              onChange={(e) => handleFilterChange(setAdminFilter, e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl px-3 py-2 text-xs text-neutral-300 outline-none"
            >
              <option value="all">All Administrators</option>
              {distinctAdmins.map((a) => (
                <option key={a.email} value={a.email}>
                  {a.name || a.email}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl px-3 py-2 text-xs text-neutral-300 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="warning">Warning</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <select
              value={dateRangeFilter}
              onChange={(e) => handleFilterChange(setDateRangeFilter, e.target.value as any)}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl px-3 py-2 text-xs text-neutral-300 outline-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Reset */}
        {(search || adminFilter !== 'all' || moduleFilter !== 'all' || statusFilter !== 'all' || dateRangeFilter !== 'all') && (
          <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 text-xs">
            <span className="text-neutral-400">
              Showing <strong>{filteredLogs.length}</strong> matching entries
            </span>
            <button
              onClick={handleResetFilters}
              className="text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold text-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Activity Logs Table */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-950/80 text-neutral-400 uppercase text-[10px] font-bold border-b border-neutral-800 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Administrator</th>
                <th className="py-3.5 px-4">Module</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Audit Description</th>
                <th className="py-3.5 px-4">Target</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-neutral-500">
                    No activity logs recorded matching the selected filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const isPayment = (log.module || '').toLowerCase().includes('payment') || log.action.toLowerCase().includes('payment');
                  const isMember = (log.module || '').toLowerCase().includes('member') || log.action.toLowerCase().includes('member');
                  const isPlan = (log.module || '').toLowerCase().includes('plan') || log.action.toLowerCase().includes('plan');
                  const isReceipt = (log.module || '').toLowerCase().includes('receipt') || log.action.toLowerCase().includes('receipt');
                  const isAdminMod = (log.module || '').toLowerCase().includes('admin') || log.action.toLowerCase().includes('admin');
                  const isAuth = (log.module || '').toLowerCase().includes('auth') || log.action.toLowerCase().includes('login') || log.action.toLowerCase().includes('logout');

                  const status = log.status || 'success';
                  const isTargetMember = log.target_id && log.target_id.toUpperCase().startsWith('MS-');

                  return (
                    <tr key={log.id} className="hover:bg-neutral-800/40 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-neutral-400 font-mono text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-neutral-500" />
                          {new Date(log.timestamp).toLocaleString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* Administrator */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-white text-[10px]">
                            {(log.admin_name || log.admin_email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="block font-semibold text-white text-xs">
                              {log.admin_name || log.admin_email.split('@')[0]}
                            </span>
                            <span className="block text-[10px] text-neutral-500 font-mono">
                              {log.admin_email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Module */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono ${
                            isPayment
                              ? 'bg-emerald-950/60 border border-emerald-800/50 text-emerald-400'
                              : isReceipt
                              ? 'bg-teal-950/60 border border-teal-800/50 text-teal-400'
                              : isMember
                              ? 'bg-red-950/60 border border-red-800/50 text-red-400'
                              : isPlan
                              ? 'bg-blue-950/60 border border-blue-800/50 text-blue-400'
                              : isAdminMod
                              ? 'bg-purple-950/60 border border-purple-800/50 text-purple-400'
                              : isAuth
                              ? 'bg-amber-950/60 border border-amber-800/50 text-amber-400'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {log.module || 'General'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-neutral-200">{log.action}</span>
                      </td>

                      {/* Description (with clickable member links) */}
                      <td className="py-3.5 px-4 max-w-md text-neutral-300 leading-relaxed">
                        {renderDescriptionWithLinks(log.description)}
                      </td>

                      {/* Target */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.target_id ? (
                          isTargetMember ? (
                            <button
                              onClick={() => onOpenMemberProfile && onOpenMemberProfile(log.target_id!)}
                              title={`View profile for athlete ${log.target_id}`}
                              className="px-2 py-1 rounded bg-red-950/80 hover:bg-red-900/80 border border-red-800/60 text-red-300 font-mono font-bold text-[11px] underline flex items-center gap-1 transition-colors"
                            >
                              <span>{log.target_id}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-300 font-mono text-[10px]">
                              {log.target_id}
                            </span>
                          )
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        {status === 'success' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Success
                          </span>
                        ) : status === 'failed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/80 border border-red-800/60 text-red-400 text-[10px] font-semibold">
                            <AlertCircle className="w-3 h-3 text-red-400" /> Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-800/60 text-amber-400 text-[10px] font-semibold">
                            <AlertTriangle className="w-3 h-3 text-amber-400" /> Warning
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredLogs.length > 0 && (
          <div className="p-4 bg-neutral-950/90 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-neutral-900 border border-neutral-800 text-white rounded-lg px-2 py-1 outline-none text-xs"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-neutral-500 font-mono ml-2">
                Showing {Math.min((currentPage - 1) * pageSize + 1, filteredLogs.length)} -{' '}
                {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-mono text-white text-xs bg-neutral-900 border border-neutral-800 rounded-lg">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
