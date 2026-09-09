import React, { useState, useRef } from 'react';
import { Member, MembershipPlan, Payment, GymSettings } from '../types';
import { resolveMemberPlanName, extractUpiTransactionNumber } from '../lib/planUtils';
import { generateReceiptPdf } from '../lib/pdfReceipt';
import { sendReceiptEmail } from '../lib/emailReceipt';
import {
  X,
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Shield,
  FileText,
  IndianRupee,
  CreditCard,
  Download,
  Eye,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit,
  PlusCircle,
  History,
  Sparkles,
  Loader2,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  member: Member | null;
  plans: MembershipPlan[];
  payments: Payment[];
  settings: GymSettings;
  adminEmail: string | null;
  onClose: () => void;
  onEditMember?: (member: Member) => void;
  onAddPayment?: (member: Member) => void;
  onViewReceipt?: (payment: Payment) => void;
}

export const MemberProfileModal: React.FC<Props> = ({
  isOpen,
  member,
  plans,
  payments,
  settings,
  adminEmail,
  onClose,
  onEditMember,
  onAddPayment,
  onViewReceipt,
}) => {
  const historyRef = useRef<HTMLDivElement | null>(null);
  const [sendingPaymentId, setSendingPaymentId] = useState<string | null>(null);
  const [emailAlert, setEmailAlert] = useState<{
    type: 'success' | 'error';
    message: string;
    paymentId?: string;
  } | null>(null);

  if (!isOpen || !member) return null;

  // Payments specifically belonging to this member (sorted descending by date / created_at)
  const memberPayments = payments
    .filter(
      (p) =>
        p.member_id === member.id ||
        p.member_id === member.member_id ||
        p.member_code === member.member_id
    )
    .sort((a, b) => {
      const timeA = new Date(a.payment_date || a.created_at || '').getTime();
      const timeB = new Date(b.payment_date || b.created_at || '').getTime();
      return timeB - timeA;
    });

  // Financial statistics
  const totalAmountPaid = memberPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalDiscount = memberPayments.reduce((sum, p) => sum + Number(p.discount || 0), 0);
  const totalPaymentsCount = memberPayments.length;

  const latestPayment = memberPayments[0];
  const currentOutstanding =
    latestPayment !== undefined && latestPayment.remaining_balance !== undefined
      ? Number(latestPayment.remaining_balance)
      : Number(member.remaining_balance || 0);

  // Resolved membership plan name
  const resolvedPlan = resolveMemberPlanName(member, plans, latestPayment);

  // Formatting helpers
  const formatDate = (dStr?: string) => {
    if (!dStr) return 'Not provided';
    const parsed = new Date(dStr);
    if (isNaN(parsed.getTime())) return dStr;
    return parsed.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const finalPayable = Math.max(0, Number(member.plan_amount || 0) - Number(member.discount || 0));

  const handleScrollToHistory = () => {
    if (historyRef.current) {
      historyRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDownloadLatestReceipt = () => {
    if (latestPayment) {
      const enriched: Payment = {
        ...latestPayment,
        plan_name: resolveMemberPlanName(member, plans, latestPayment),
        transaction_number:
          latestPayment.upi_transaction_number ||
          latestPayment.transaction_number ||
          extractUpiTransactionNumber(latestPayment.notes),
      };
      generateReceiptPdf(enriched, member, settings, adminEmail);
    } else {
      alert(`No payments recorded yet for ${member.name}.`);
    }
  };

  const handleSendReceiptEmail = async (p: Payment) => {
    if (sendingPaymentId) return;
    setSendingPaymentId(p.id);
    setEmailAlert(null);

    const enriched: Payment = {
      ...p,
      plan_name: resolveMemberPlanName(member, plans, p),
      transaction_number:
        p.upi_transaction_number || p.transaction_number || extractUpiTransactionNumber(p.notes),
      member_name: member.name,
      member_code: member.member_id,
      member_mobile: member.mobile,
      member_email: member.email,
    };

    try {
      const result = await sendReceiptEmail(enriched, member, settings, adminEmail);
      if (result.success) {
        setEmailAlert({
          type: 'success',
          message: result.message,
          paymentId: p.id,
        });
      } else {
        setEmailAlert({
          type: 'error',
          message: result.message || 'Customer email address not found.',
          paymentId: p.id,
        });
      }
    } catch (err: any) {
      setEmailAlert({
        type: 'error',
        message: err.message || 'Failed to send receipt email.',
        paymentId: p.id,
      });
    } finally {
      setSendingPaymentId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header & Quick Actions Bar */}
        <div className="p-5 md:p-6 border-b border-neutral-800 bg-neutral-950/80 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Return to previous section"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="h-6 w-px bg-neutral-800 mx-1 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl md:text-2xl font-black text-white tracking-wide">
                  {member.name}
                </h2>
                <span className="font-mono text-xs font-bold text-red-400 bg-red-950/60 border border-red-800/60 px-2.5 py-0.5 rounded-full">
                  {member.member_id}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    member.status === 'active'
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                      : member.status === 'expired'
                      ? 'bg-red-950/80 text-red-400 border border-red-800/50'
                      : 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                  }`}
                >
                  {member.status}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Registered Athlete Profile & Complete Financial History
              </p>
            </div>
          </div>

          {/* Quick Actions at top */}
          <div className="flex items-center gap-2 flex-wrap">
            {onEditMember && (
              <button
                onClick={() => {
                  onClose();
                  onEditMember(member);
                }}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Edit className="w-3.5 h-3.5 text-neutral-400" />
                <span>Edit Member</span>
              </button>
            )}

            {onAddPayment && (
              <button
                onClick={() => {
                  onClose();
                  onAddPayment(member);
                }}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-red-600/20"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Payment</span>
              </button>
            )}

            {memberPayments.length > 0 && (
              <>
                <button
                  onClick={handleScrollToHistory}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all"
                >
                  <History className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="hidden sm:inline">View History</span>
                </button>
                <button
                  onClick={handleDownloadLatestReceipt}
                  title="Download Latest Receipt PDF"
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-red-400" />
                  <span className="hidden sm:inline">Latest Receipt</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-5 md:p-8 space-y-8 overflow-y-auto flex-1">
          {/* Email Notification Alert Banner */}
          {emailAlert && (
            <div
              className={`p-4 rounded-2xl flex items-center justify-between text-xs animate-in fade-in duration-200 ${
                emailAlert.type === 'success'
                  ? 'bg-emerald-950/70 border border-emerald-800/80 text-emerald-200'
                  : 'bg-red-950/70 border border-red-800/80 text-red-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {emailAlert.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{emailAlert.message}</span>
              </div>
              <button
                onClick={() => setEmailAlert(null)}
                className="text-neutral-400 hover:text-white ml-2 text-sm"
              >
                ✕
              </button>
            </div>
          )}

          {/* Top Overview: 3 Cards Grid (Personal, Membership, Financial Summary) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. PERSONAL INFORMATION */}
            <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-800/80 text-red-400 font-bold text-xs uppercase tracking-wider">
                <User className="w-4 h-4" /> Personal Information
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-neutral-400 block text-[11px]">Member ID / Roll No.</span>
                  <span className="font-mono text-white font-bold text-sm bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800 inline-block mt-0.5">
                    {member.member_id}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-400 block text-[11px]">Full Name</span>
                  <span className="text-white font-semibold">{member.name || 'Not provided'}</span>
                </div>

                <div>
                  <span className="text-neutral-400 block text-[11px]">Mobile Number</span>
                  <span className="text-neutral-200 font-mono font-medium">
                    {member.mobile || 'Not provided'}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-400 block text-[11px]">Email Address</span>
                  <span className="text-neutral-200 break-all">
                    {member.email || 'Not provided'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Date of Birth</span>
                    <span className="text-neutral-300">{formatDate(member.dob)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Gender</span>
                    <span className="text-neutral-300 capitalize">
                      {member.gender || 'Not provided'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-neutral-400 block text-[11px]">Address</span>
                  <span className="text-neutral-300">{member.address || 'Not provided'}</span>
                </div>

                <div>
                  <span className="text-neutral-400 block text-[11px]">Emergency Contact</span>
                  <span className="text-neutral-300">
                    {member.emergency_contact || 'Not provided'}
                  </span>
                </div>

                {member.notes && (
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Notes</span>
                    <span className="text-neutral-300 text-[11px] italic bg-neutral-900 p-2 rounded-lg block border border-neutral-800 mt-0.5">
                      {member.notes}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. MEMBERSHIP INFORMATION */}
            <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-800/80 text-red-400 font-bold text-xs uppercase tracking-wider">
                <Shield className="w-4 h-4" /> Membership Information
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-neutral-400 block text-[11px]">Current Plan</span>
                  <span className="text-white font-bold text-sm text-red-400 block mt-0.5">
                    {resolvedPlan}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Plan Amount</span>
                    <span className="text-white font-semibold">
                      ₹{Number(member.plan_amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Discount</span>
                    <span className="text-red-400 font-semibold">
                      ₹{Number(member.discount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-neutral-400 block text-[11px]">Final Payable Amount</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    ₹{finalPayable.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-900">
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Start Date</span>
                    <span className="text-neutral-300">{formatDate(member.membership_start)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Expiry Date</span>
                    <span
                      className={`font-semibold ${
                        new Date(member.membership_expiry).getTime() < Date.now()
                          ? 'text-red-400'
                          : 'text-neutral-200'
                      }`}
                    >
                      {formatDate(member.membership_expiry)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Status</span>
                    <span className="capitalize font-bold text-white">{member.status}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Registration Date</span>
                    <span className="text-neutral-300">{formatDate(member.join_date)}</span>
                  </div>
                </div>

                <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 text-[11px]">Due / Carried Balance</span>
                    <span
                      className={`font-bold font-mono text-sm ${
                        currentOutstanding > 0 ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      ₹{currentOutstanding.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. PAYMENT SUMMARY */}
            <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-800/80 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <IndianRupee className="w-4 h-4" /> Payment Summary
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="p-3 bg-neutral-900/90 rounded-xl border border-neutral-800 flex items-center justify-between">
                  <span className="text-neutral-400">Total Amount Paid</span>
                  <span className="text-emerald-400 font-extrabold text-base font-mono">
                    ₹{totalAmountPaid.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-neutral-900 rounded-xl border border-neutral-800">
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                      Total Discount
                    </span>
                    <span className="text-red-400 font-bold text-sm">
                      ₹{totalDiscount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-2.5 bg-neutral-900 rounded-xl border border-neutral-800">
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                      Transactions
                    </span>
                    <span className="text-white font-bold text-sm">
                      {totalPaymentsCount} Records
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-red-950/30 rounded-xl border border-red-900/40 flex items-center justify-between">
                  <span className="text-neutral-300 font-medium">Outstanding Balance</span>
                  <span className="text-red-400 font-extrabold text-base font-mono">
                    ₹{currentOutstanding.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="pt-2 border-t border-neutral-900 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Last Payment Date:</span>
                    <span className="text-white font-medium">
                      {latestPayment ? formatDate(latestPayment.payment_date) : 'No payments yet'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Last Payment Amount:</span>
                    <span className="text-emerald-400 font-bold font-mono">
                      {latestPayment ? `₹${Number(latestPayment.amount).toLocaleString('en-IN')}` : '₹0'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Last Payment Method:</span>
                    <span className="text-neutral-200 font-semibold">
                      {latestPayment ? latestPayment.payment_method : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. COMPLETE PAYMENT HISTORY SECTION */}
          <div ref={historyRef} id="member-payment-history" className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-bold text-white tracking-wide">
                  Payment & Receipt History ({memberPayments.length})
                </h3>
              </div>

              {onAddPayment && (
                <button
                  onClick={() => {
                    onClose();
                    onAddPayment(member);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Record New Payment</span>
                </button>
              )}
            </div>

            {memberPayments.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                <CreditCard className="w-10 h-10 text-neutral-600 mx-auto" />
                <p className="text-neutral-400 text-sm font-semibold">
                  No payment history found for this member.
                </p>
                <p className="text-neutral-600 text-xs">
                  Click "Record New Payment" to create the initial membership payment receipt.
                </p>
              </div>
            ) : (
              <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-neutral-300">
                    <thead className="bg-neutral-900/90 text-neutral-400 font-semibold border-b border-neutral-800 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-3.5">Receipt No</th>
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Plan</th>
                        <th className="py-3 px-3">Plan Amt</th>
                        <th className="py-3 px-3">Disc</th>
                        <th className="py-3 px-3">Prev Bal</th>
                        <th className="py-3 px-3 text-emerald-400">Paid</th>
                        <th className="py-3 px-3 text-red-400">Balance</th>
                        <th className="py-3 px-3">Method / Txn</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {memberPayments.map((p) => {
                        const txnNum =
                          p.upi_transaction_number ||
                          p.transaction_number ||
                          extractUpiTransactionNumber(p.notes);
                        const isUpi = p.payment_method === 'UPI';
                        const pPlan = resolveMemberPlanName(member, plans, p);
                        const isSending = sendingPaymentId === p.id;
                        const isPaidFull = Number(p.remaining_balance) <= 0;

                        return (
                          <tr key={p.id} className="hover:bg-neutral-900/50 transition-colors">
                            <td className="py-3 px-3.5">
                              <span className="font-mono text-white font-bold text-xs bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                                {p.receipt_number || p.payment_id}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-neutral-300 whitespace-nowrap">
                              {formatDate(p.payment_date)}
                            </td>
                            <td className="py-3 px-3 font-medium text-white whitespace-nowrap">
                              {pPlan}
                            </td>
                            <td className="py-3 px-3 font-mono text-neutral-300">
                              ₹{Number(p.total_due + p.discount - p.previous_balance || p.amount).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3 font-mono text-red-400">
                              ₹{Number(p.discount || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3 font-mono text-amber-400">
                              ₹{Number(p.previous_balance || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                              ₹{Number(p.amount).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-red-400 whitespace-nowrap">
                              ₹{Number(p.remaining_balance).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  isUpi
                                    ? 'bg-blue-950/80 text-blue-400 border border-blue-800/50'
                                    : 'bg-neutral-800 text-neutral-300'
                                }`}
                              >
                                {p.payment_method}
                              </span>
                              {isUpi && txnNum && (
                                <div className="text-[10px] font-mono text-red-400 font-semibold mt-1">
                                  Txn: {txnNum}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  isPaidFull
                                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                                    : 'bg-red-950/80 text-red-400 border border-red-800/40'
                                }`}
                              >
                                {isPaidFull ? 'Paid' : 'Balance Due'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {onViewReceipt && (
                                  <button
                                    onClick={() => {
                                      const enriched: Payment = {
                                        ...p,
                                        plan_name: pPlan,
                                        transaction_number: txnNum,
                                        upi_transaction_number: txnNum,
                                      };
                                      onViewReceipt(enriched);
                                    }}
                                    title="View & Print Official Receipt"
                                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    const enriched: Payment = {
                                      ...p,
                                      plan_name: pPlan,
                                      transaction_number: txnNum,
                                      upi_transaction_number: txnNum,
                                    };
                                    generateReceiptPdf(enriched, member, settings, adminEmail);
                                  }}
                                  title="Download PDF Receipt"
                                  className="p-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleSendReceiptEmail(p)}
                                  disabled={isSending || !!sendingPaymentId}
                                  title={
                                    isSending
                                      ? 'Sending Receipt...'
                                      : `Send PDF Receipt Email to ${member.email || 'customer'}`
                                  }
                                  className="p-1.5 rounded-lg bg-red-950/50 border border-red-800/50 hover:bg-red-900/60 text-red-300 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  {isSending ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                                  ) : (
                                    <Mail className="w-3.5 h-3.5 text-red-400" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>MS Fitness Athlete ID: {member.member_id}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
