import React, { useState } from 'react';
import { Member, MembershipPlan, Payment, GymSettings } from '../types';
import { resolveMemberPlanName, extractUpiTransactionNumber } from '../lib/planUtils';
import {
  Dumbbell,
  LogOut,
  User,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Shield,
  Building,
  TrendingDown,
  Receipt,
  Download,
  Eye,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  member: Member | null;
  plans: MembershipPlan[];
  payments: Payment[];
  settings: GymSettings;
  userEmail: string;
  onLogout: () => void;
  onViewReceipt: (payment: Payment) => void;
  isAdminUser?: boolean;
  onSwitchToAdmin?: () => void;
}

export const MemberDashboardView: React.FC<Props> = ({
  member,
  plans,
  payments,
  settings,
  userEmail,
  onLogout,
  onViewReceipt,
  isAdminUser,
  onSwitchToAdmin,
}) => {
  const [copiedId, setCopiedId] = useState(false);

  // If member is not found in the gym database for this authenticated email
  if (!member) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center items-center p-4 relative">
        <div className="w-full max-w-lg bg-neutral-900/90 border border-neutral-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
          <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl shadow-red-600/30">
            <Dumbbell className="w-9 h-9" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-white font-display">MS FITNESS</h1>
            <p className="text-xs font-bold text-red-500 tracking-widest uppercase mt-0.5">Member Portal</p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-sm space-y-2">
            <div className="flex items-center justify-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>No Registered Membership Profile Found</span>
            </div>
            <p className="text-xs text-amber-300/80 leading-relaxed">
              Your email <strong className="text-white font-mono">{userEmail}</strong> was successfully verified via Supabase Auth OTP, but no active MS Fitness member record is linked to this address yet.
            </p>
            <p className="text-[11px] text-amber-400/90 pt-1">
              Please contact the front desk or administrator to register your membership.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {isAdminUser && onSwitchToAdmin && (
              <button
                type="button"
                onClick={onSwitchToAdmin}
                className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-neutral-700"
              >
                <ShieldCheck className="w-4 h-4 text-red-500" />
                <span>Open Admin Portal</span>
              </button>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout from Session</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filter payments belonging specifically to this member
  const memberPayments = payments
    .filter(
      (p) =>
        p.member_id === member.id ||
        p.member_id === member.member_id ||
        (p as any).member_code === member.member_id
    )
    .sort((a, b) => {
      const timeA = new Date(a.payment_date || a.created_at || '').getTime();
      const timeB = new Date(b.payment_date || b.created_at || '').getTime();
      return timeB - timeA;
    });

  // Calculate canonical financial statistics
  const planAmount = Number(member.plan_amount || 0);
  const discountAmount = Number(member.discount || 0);
  const totalPayable = Math.max(0, planAmount - discountAmount);
  const totalPaid = memberPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // Latest ledger balances
  const latestPayment = memberPayments[0];
  const pendingAmount =
    latestPayment?.remaining_balance !== undefined
      ? Number(latestPayment.remaining_balance)
      : Number(member.remaining_balance || 0);
  const overpaidAmount =
    latestPayment?.overpaid_amount !== undefined
      ? Number(latestPayment.overpaid_amount)
      : Number(member.overpaid_balance || 0);

  // Expiry date calculation & status badge
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiryDate = member.membership_expiry ? new Date(member.membership_expiry) : null;
  if (expiryDate) expiryDate.setHours(0, 0, 0, 0);

  let membershipStatus = member.status || 'active';
  let daysLeft: number | null = null;
  if (expiryDate && !isNaN(expiryDate.getTime())) {
    const diffMs = expiryDate.getTime() - now.getTime();
    daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) {
      membershipStatus = 'expired';
    } else if (daysLeft <= 7) {
      membershipStatus = 'expiring';
    }
  }

  const resolvedPlanName = resolveMemberPlanName(member, plans, latestPayment);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleCopyId = () => {
    if (member.member_id) {
      navigator.clipboard.writeText(member.member_id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans antialiased selection:bg-red-600 selection:text-white pb-16">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800/80 px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center text-white shadow-md shadow-red-600/30">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white tracking-wider font-display text-lg">
                MS FITNESS
              </span>
              <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800/40">
                Member Portal
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 font-medium">Stronger Body, Stronger You</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdminUser && onSwitchToAdmin && (
            <button
              type="button"
              onClick={onSwitchToAdmin}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-neutral-700/80"
              title="Return to Admin Management Panel"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
              <span className="hidden sm:inline">Admin Panel</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] text-neutral-400">{userEmail}</span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-red-600 text-neutral-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all border border-neutral-700 hover:border-red-600 shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 pt-6 space-y-6">
        {/* Welcome Hero & Identity Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white font-display tracking-tight">
                  {member.name}
                </h1>

                {/* Membership Status Badge */}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    membershipStatus === 'active'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                      : membershipStatus === 'expiring'
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                      : 'bg-red-950/80 text-red-300 border border-red-800/60'
                  }`}
                >
                  {membershipStatus === 'active' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {membershipStatus === 'expiring' && <Clock className="w-3.5 h-3.5" />}
                  {membershipStatus === 'expired' && <AlertCircle className="w-3.5 h-3.5" />}
                  <span>
                    {membershipStatus === 'active'
                      ? 'Active Member'
                      : membershipStatus === 'expiring'
                      ? 'Expiring Soon'
                      : 'Membership Expired'}
                  </span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 font-mono transition-colors"
                  title="Copy Member ID"
                >
                  <span className="text-neutral-400">ID:</span>
                  <strong className="text-red-400">{member.member_id}</strong>
                  {copiedId ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-neutral-500" />
                  )}
                </button>

                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{member.email || userEmail}</span>
                </span>

                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{member.mobile || 'N/A'}</span>
                </span>

                {member.gender && (
                  <span className="capitalize px-2 py-0.5 rounded bg-neutral-800/60 text-neutral-400 text-[11px]">
                    {member.gender}
                  </span>
                )}
              </div>
            </div>

            {/* Plan Info Highlight Pill */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4 md:text-right shrink-0">
              <span className="text-[11px] text-neutral-400 block font-medium">Current Membership Plan</span>
              <span className="text-lg font-bold text-white font-display block mt-0.5">
                {resolvedPlanName}
              </span>
              <div className="text-xs mt-1">
                {daysLeft !== null && daysLeft >= 0 ? (
                  <span className={daysLeft <= 7 ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                    {daysLeft === 0 ? 'Expires today' : `${daysLeft} days remaining`}
                  </span>
                ) : daysLeft !== null ? (
                  <span className="text-red-400 font-semibold">Expired {Math.abs(daysLeft)} days ago</span>
                ) : (
                  <span className="text-neutral-400">No expiry set</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Member Details & Dates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Personal & Membership Dates */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-500" /> Membership Schedule
            </h2>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800/80">
                <span className="text-neutral-400 block text-[11px]">Joining Date</span>
                <span className="font-semibold text-white mt-1 block font-mono">
                  {formatDate(member.join_date)}
                </span>
              </div>

              <div className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800/80">
                <span className="text-neutral-400 block text-[11px]">Plan Start Date</span>
                <span className="font-semibold text-white mt-1 block font-mono">
                  {formatDate(member.membership_start || member.join_date)}
                </span>
              </div>

              <div className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800/80 col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Membership Expiry Date</span>
                    <span className="font-bold text-red-400 mt-1 block font-mono text-sm">
                      {formatDate(member.membership_expiry)}
                    </span>
                  </div>
                  {daysLeft !== null && (
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        daysLeft > 7
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                          : daysLeft >= 0
                          ? 'bg-amber-950 text-amber-300 border border-amber-800/50'
                          : 'bg-red-950 text-red-300 border border-red-800/50'
                      }`}
                    >
                      {daysLeft > 0 ? `${daysLeft} Days Left` : daysLeft === 0 ? 'Today' : 'Expired'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {member.address && (
              <div className="pt-2 text-xs text-neutral-400 border-t border-neutral-800/60">
                <span className="text-neutral-500 block text-[11px] mb-0.5">Registered Address:</span>
                <span className="text-neutral-300">{member.address}</span>
              </div>
            )}
            {member.emergency_contact && (
              <div className="text-xs text-neutral-400">
                <span className="text-neutral-500 block text-[11px] mb-0.5">Emergency Contact:</span>
                <span className="text-neutral-300">{member.emergency_contact}</span>
              </div>
            )}
          </div>

          {/* Plan & Features Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-red-500" /> Plan Features & Access
            </h2>

            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-medium">Assigned Package</span>
                <span className="text-xs font-bold text-white">{resolvedPlanName}</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Complete access to cardiovascular training floor, heavy weight compound stations, locker facilities, and certified floor trainer assistance.
              </p>
            </div>

            {/* Gym Center Contacts */}
            <div className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800/60 text-xs space-y-1.5">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                {settings.gym_name || 'MS Fitness Gym'} Reception & Support
              </span>
              <div className="flex items-center justify-between text-neutral-300">
                <span>Helpline / WhatsApp:</span>
                <span className="font-mono text-white">{settings.phone || '+91 98765 43210'}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span>Renewal UPI ID:</span>
                <span className="font-mono text-red-400 font-bold">{settings.upi_id || 'msfitness@upi'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Ledger Breakdown */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-4">
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-red-500" /> Membership Financial Ledger
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Real-time tracking of plan pricing, recorded payments, and ledger balances.
              </p>
            </div>
            <span className="text-xs font-mono text-neutral-400">
              Currency: <strong>INR (₹)</strong>
            </span>
          </div>

          {/* 6 Key Financial Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Plan Amount */}
            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800/80">
              <span className="text-[11px] text-neutral-400 block">Plan Amount</span>
              <span className="text-lg font-bold text-white font-mono mt-1 block">
                ₹{planAmount.toLocaleString('en-IN')}
              </span>
            </div>

            {/* 2. Discount */}
            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800/80">
              <span className="text-[11px] text-neutral-400 block">Discount</span>
              <span className="text-lg font-bold text-emerald-400 font-mono mt-1 block">
                {discountAmount > 0 ? `₹${discountAmount.toLocaleString('en-IN')}` : '₹0'}
              </span>
            </div>

            {/* 3. Total Payable */}
            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800/80">
              <span className="text-[11px] text-neutral-400 block">Total Payable</span>
              <span className="text-lg font-bold text-white font-mono mt-1 block">
                ₹{totalPayable.toLocaleString('en-IN')}
              </span>
            </div>

            {/* 4. Total Paid */}
            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800/80">
              <span className="text-[11px] text-neutral-400 block">Total Paid</span>
              <span className="text-lg font-bold text-emerald-400 font-mono mt-1 block">
                ₹{totalPaid.toLocaleString('en-IN')}
              </span>
            </div>

            {/* 5. Pending Amount */}
            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800/80">
              <span className="text-[11px] text-neutral-400 block">Pending Balance</span>
              <span
                className={`text-lg font-bold font-mono mt-1 block ${
                  pendingAmount > 0 ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                ₹{pendingAmount.toLocaleString('en-IN')}
              </span>
            </div>

            {/* 6. Overpaid Amount */}
            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800/80">
              <span className="text-[11px] text-neutral-400 block">Advance Credit</span>
              <span
                className={`text-lg font-bold font-mono mt-1 block ${
                  overpaidAmount > 0 ? 'text-blue-400' : 'text-neutral-500'
                }`}
              >
                ₹{overpaidAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Payment History & Receipts Table */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-500" /> Payment History & Receipts
            </h2>
            <span className="text-xs text-neutral-400 font-medium">
              {memberPayments.length} {memberPayments.length === 1 ? 'Transaction' : 'Transactions'} Recorded
            </span>
          </div>

          {memberPayments.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-neutral-950/60 border border-neutral-800/60 text-neutral-400 space-y-2">
              <Receipt className="w-8 h-8 text-neutral-600 mx-auto" />
              <p className="text-sm font-semibold text-neutral-300">No payment records found yet.</p>
              <p className="text-xs text-neutral-500">
                When payments are recorded by the gym reception, your official receipts and transaction statements will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-neutral-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950 text-neutral-400 uppercase tracking-wider text-[11px] font-semibold border-b border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Payment Date</th>
                    <th className="py-3 px-4">Mode / Ref</th>
                    <th className="py-3 px-4">Amount Paid</th>
                    <th className="py-3 px-4">Remaining Due</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Official Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80 text-neutral-200">
                  {memberPayments.map((p) => {
                    const upiRef =
                      p.upi_transaction_number ||
                      p.transaction_number ||
                      extractUpiTransactionNumber(p.notes);
                    const remDue = Number(p.remaining_balance || 0);
                    const overpaid = Number(p.overpaid_amount || 0);
                    const status =
                      p.payment_status ||
                      (remDue === 0 ? (overpaid > 0 ? 'Overpaid' : 'Paid') : 'Partial');

                    return (
                      <tr key={p.id} className="hover:bg-neutral-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-red-400">
                          {p.receipt_number || p.payment_id}
                        </td>
                        <td className="py-3.5 px-4 text-neutral-300">
                          {formatDate(p.payment_date)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-neutral-800 text-[10px] font-bold text-neutral-300">
                            {p.payment_method}
                          </span>
                          {upiRef && (
                            <span className="block font-mono text-[10px] text-red-400 mt-0.5">
                              {upiRef}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-400 font-mono">
                          ₹{Number(p.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className={remDue > 0 ? 'text-red-400' : 'text-emerald-400'}>
                            ₹{remDue.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              status === 'Paid'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                                : status === 'Overpaid'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800/50'
                                : 'bg-amber-950 text-amber-300 border border-amber-800/50'
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onViewReceipt(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-red-600 text-neutral-200 hover:text-white text-xs font-semibold transition-all border border-neutral-700/60 hover:border-red-600 shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View & Print</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
