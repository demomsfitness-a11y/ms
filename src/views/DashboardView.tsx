import React from 'react';
import { Member, Payment, DashboardStats, MembershipPlan } from '../types';
import { computeDashboardStats } from '../lib/db';
import { getDashboardExpiryCounts } from '../lib/whatsappReminder';
import {
  Users,
  UserCheck,
  UserX,
  ClockAlert,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Plus,
  Eye,
  FileText
} from 'lucide-react';

interface Props {
  stats?: DashboardStats;
  members?: Member[];
  payments?: Payment[];
  plans?: MembershipPlan[];
  onNavigate: (tab: any) => void;
  onOpenAddMember?: () => void;
  onAddMemberClick?: () => void;
  onOpenPayment?: () => void;
  onPaymentClick?: () => void;
  onViewReceipt: (payment: Payment) => void;
  onViewMember?: (member: Member) => void;
}

export const DashboardView: React.FC<Props> = ({
  stats: propStats,
  members = [],
  payments = [],
  plans = [],
  onNavigate,
  onOpenAddMember,
  onAddMemberClick,
  onOpenPayment,
  onPaymentClick,
  onViewReceipt,
  onViewMember,
}) => {
  const handleAddMember = onOpenAddMember || onAddMemberClick || (() => onNavigate('members'));
  const handlePayment = onOpenPayment || onPaymentClick || (() => onNavigate('payments'));
  const handleViewMember = onViewMember || ((_m: Member) => onNavigate('members'));

  const fallbackStats: DashboardStats = {
    totalMembers: members?.length || 0,
    activeMembers: (members || []).filter((m) => m.status === 'active').length,
    expiredMembers: (members || []).filter((m) => m.status === 'expired').length,
    expiringSoon: 0,
    totalPaymentsCount: payments?.length || 0,
    todayCollection: 0,
    thisMonthCollection: 0,
    totalOutstandingBalance: 0,
  };

  const stats: DashboardStats =
    propStats ||
    (members && payments
      ? computeDashboardStats(members, payments)
      : fallbackStats);

  const recentMembers = (members || []).slice(0, 5);
  const recentPayments = (payments || []).slice(0, 5);

  // Compute 15-day, 7-day, 3-day expiry counts for summary card
  const expiryCounts = getDashboardExpiryCounts(members || []);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner with Quick Actions */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-red-600/5 blur-2xl pointer-events-none" />
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-500/20 text-red-400 text-xs font-bold tracking-widest uppercase mb-2">
            MS FITNESS OVERVIEW
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-wide font-display">
            GYM PERFORMANCE & FINANCIAL DASHBOARD
          </h2>
          <p className="text-xs md:text-sm text-neutral-400 max-w-xl mt-1">
            Real-time synchronization with Supabase database. Track active memberships, revenue collections, and outstanding dues.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={handleAddMember}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-all shadow-lg shadow-red-600/25 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add New Member
          </button>
          <button
            onClick={handlePayment}
            className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs border border-neutral-700 transition-colors flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4 text-red-500" /> Collect Fee
          </button>
        </div>
      </div>

      {/* Requirement 3: Dedicated Dashboard Expiry Summary Card */}
      <div
        onClick={() => onNavigate('expiry')}
        className="bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/50 rounded-3xl p-5 md:p-6 cursor-pointer transition-all hover:bg-neutral-900/95 group shadow-xl shadow-black/20"
        title="Click to view Membership Expiring Soon list"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <ClockAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide font-display flex items-center gap-2">
                <span>MEMBERSHIP EXPIRY</span>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
                  Action Required
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Impending membership renewals & WhatsApp reminder alerts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold group-hover:text-amber-300">
            <span>View Expiring Soon List</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="bg-neutral-950/80 rounded-2xl p-4 border border-amber-950/60 hover:border-amber-700/60 transition-colors">
            <span className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider block">
              Expiring in 15 Days
            </span>
            <div className="text-3xl font-black text-amber-400 font-display mt-1">
              {expiryCounts.expiringIn15Days}
            </div>
            <span className="text-[11px] text-neutral-500 mt-0.5 block">
              Members expiring within 15 days
            </span>
          </div>

          <div className="bg-neutral-950/80 rounded-2xl p-4 border border-orange-950/60 hover:border-orange-700/60 transition-colors">
            <span className="text-[11px] text-orange-400 font-semibold uppercase tracking-wider block">
              Expiring in 7 Days
            </span>
            <div className="text-3xl font-black text-orange-400 font-display mt-1">
              {expiryCounts.expiringIn7Days}
            </div>
            <span className="text-[11px] text-neutral-500 mt-0.5 block">
              Urgent upcoming renewal dues
            </span>
          </div>

          <div className="bg-neutral-950/80 rounded-2xl p-4 border border-rose-950/60 hover:border-rose-700/60 transition-colors">
            <span className="text-[11px] text-rose-400 font-semibold uppercase tracking-wider block">
              Expiring in 3 Days
            </span>
            <div className="text-3xl font-black text-rose-400 font-display mt-1">
              {expiryCounts.expiringIn3Days}
            </div>
            <span className="text-[11px] text-neutral-500 mt-0.5 block">
              Expires very soon (Send WhatsApp)
            </span>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid (8 Key Metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Total Members */}
        <div
          onClick={() => onNavigate('members')}
          className="bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 cursor-pointer transition-all hover:bg-neutral-900 group"
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Members</span>
            <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-300 group-hover:text-white group-hover:bg-neutral-700 transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl md:text-4xl font-bold text-white mt-3 font-display">
            {stats?.totalMembers ?? 0}
          </p>
          <span className="text-[11px] text-neutral-400 flex items-center gap-1 mt-1">
            Enrolled gym athletes
          </span>
        </div>

        {/* Metric 2: Active Members */}
        <div
          onClick={() => onNavigate('members')}
          className="bg-neutral-900/90 border border-neutral-800 hover:border-emerald-800/60 rounded-2xl p-5 cursor-pointer transition-all hover:bg-neutral-900 group"
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase tracking-wider">
            <span>Active Members</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl md:text-4xl font-bold text-emerald-400 mt-3 font-display">
            {stats?.activeMembers ?? 0}
          </p>
          <span className="text-[11px] text-emerald-500/80 mt-1 block">
            Valid membership status
          </span>
        </div>

        {/* Metric 3: Expired Members */}
        <div
          onClick={() => onNavigate('expiry')}
          className="bg-neutral-900/90 border border-neutral-800 hover:border-red-800/60 rounded-2xl p-5 cursor-pointer transition-all hover:bg-neutral-900 group"
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase tracking-wider">
            <span>Expired Members</span>
            <div className="w-8 h-8 rounded-xl bg-red-950/60 border border-red-800/40 flex items-center justify-center text-red-400">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl md:text-4xl font-bold text-red-400 mt-3 font-display">
            {stats?.expiredMembers ?? 0}
          </p>
          <span className="text-[11px] text-red-500/80 mt-1 block">
            Requires renewal
          </span>
        </div>

        {/* Metric 4: Expiring Soon */}
        <div
          onClick={() => onNavigate('expiry')}
          className="bg-neutral-900/90 border border-neutral-800 hover:border-amber-800/60 rounded-2xl p-5 cursor-pointer transition-all hover:bg-neutral-900 group"
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase tracking-wider">
            <span>Expiring Soon</span>
            <div className="w-8 h-8 rounded-xl bg-amber-950/60 border border-amber-800/40 flex items-center justify-center text-amber-400">
              <ClockAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl md:text-4xl font-bold text-amber-400 mt-3 font-display">
            {stats?.expiringSoon ?? 0}
          </p>
          <span className="text-[11px] text-amber-500/80 mt-1 block">
            Within next 30 days
          </span>
        </div>

        {/* Metric 5: Today's Collection */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-neutral-900/90 border border-neutral-800 hover:border-emerald-800/60 rounded-2xl p-5 cursor-pointer transition-all hover:bg-neutral-900"
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase tracking-wider">
            <span>Today's Collection</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl md:text-4xl font-bold text-emerald-400 mt-3 font-display">
            ₹{(stats?.todayCollection ?? 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-neutral-400 mt-1 block">
            Total fee collected today
          </span>
        </div>

        {/* Metric 6: This Month's Collection */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-neutral-900/90 border border-neutral-800 hover:border-emerald-800/60 rounded-2xl p-5 cursor-pointer transition-all hover:bg-neutral-900"
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase tracking-wider">
            <span>This Month</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl md:text-4xl font-bold text-emerald-400 mt-3 font-display">
            ₹{(stats?.thisMonthCollection ?? 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-neutral-400 mt-1 block">
            Current calendar month
          </span>
        </div>

        {/* Metric 7: Outstanding Balance */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-neutral-900/90 border border-neutral-800 hover:border-red-800/60 rounded-2xl p-5 cursor-pointer transition-all hover:bg-neutral-900"
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase tracking-wider">
            <span>Outstanding Dues</span>
            <div className="w-8 h-8 rounded-xl bg-red-950/60 border border-red-800/40 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl md:text-4xl font-bold text-red-400 mt-3 font-display">
            ₹{(stats?.totalOutstandingBalance ?? 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-neutral-400 mt-1 block">
            Remaining balance pending
          </span>
        </div>

        {/* Metric 8: Total Payments Count */}
        <div
          onClick={() => onNavigate('payments')}
          className="bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 cursor-pointer transition-all hover:bg-neutral-900"
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Transactions</span>
            <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-300">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl md:text-4xl font-bold text-white mt-3 font-display">
            {stats?.totalPaymentsCount ?? 0}
          </p>
          <span className="text-[11px] text-neutral-400 mt-1 block">
            Receipts issued in history
          </span>
        </div>
      </div>

      {/* Dual Section: Recent Payments & Recently Registered Members */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Recent Payments */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div>
              <h3 className="text-xl font-bold text-white tracking-wide font-display">
                RECENT FEE PAYMENTS
              </h3>
              <p className="text-xs text-neutral-400">Latest transactions saved to Supabase</p>
            </div>
            <button
              onClick={() => onNavigate('payments')}
              className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentPayments.length === 0 ? (
            <div className="text-center py-10 text-neutral-500 text-xs">
              No payments recorded yet. Click <strong>Collect Fee</strong> to add the first receipt!
            </div>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-3.5 flex items-center justify-between hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-400">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {payment.member_name || 'Member'}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                          {payment.payment_method}
                        </span>
                        {payment.payment_method === 'UPI' && (payment.upi_transaction_number || payment.transaction_number) && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-800/40 text-blue-300">
                            UPI: {payment.upi_transaction_number || payment.transaction_number}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 font-mono">
                        {payment.receipt_number || payment.payment_id} • {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className="text-sm font-bold text-emerald-400 block font-display">
                        ₹{Number(payment.amount).toLocaleString('en-IN')}
                      </span>
                      {Number(payment.remaining_balance) > 0 && (
                        <span className="text-[10px] text-red-400 block">
                          Due: ₹{Number(payment.remaining_balance).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onViewReceipt(payment)}
                      title="View & Download PDF Receipt"
                      className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Recently Registered Members */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div>
              <h3 className="text-xl font-bold text-white tracking-wide font-display">
                NEW MEMBER REGISTRATIONS
              </h3>
              <p className="text-xs text-neutral-400">Recently registered gym athletes</p>
            </div>
            <button
              onClick={() => onNavigate('members')}
              className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentMembers.length === 0 ? (
            <div className="text-center py-10 text-neutral-500 text-xs">
              No members registered yet. Click <strong>Add New Member</strong> to begin!
            </div>
          ) : (
            <div className="space-y-3">
              {recentMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-3.5 flex items-center justify-between hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center font-bold text-white text-sm">
                      {member.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{member.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950/60 border border-red-800/40 text-red-400 font-semibold">
                          {member.member_id}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400">
                        {member.mobile} • Joined {new Date(member.join_date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        member.status === 'active'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                          : 'bg-red-950/60 text-red-400 border border-red-800/40'
                      }`}>
                        {member.status}
                      </span>
                      <p className="text-[10px] text-neutral-400 mt-1">
                        Exp: {new Date(member.membership_expiry).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>

                    <button
                      onClick={() => onViewMember(member)}
                      title="View Member Profile"
                      className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
