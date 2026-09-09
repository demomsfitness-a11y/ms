import React, { useState } from 'react';
import { Payment, Member, GymSettings, MembershipPlan } from '../types';
import { generateReceiptPdf } from '../lib/pdfReceipt';
import { sendReceiptEmail } from '../lib/emailReceipt';
import { resolveMemberPlanName, extractUpiTransactionNumber } from '../lib/planUtils';
import { Download, Printer, X, Dumbbell, CheckCircle2, Mail, Loader2, AlertCircle } from 'lucide-react';

interface Props {
  isOpen?: boolean;
  onClose: () => void;
  payment: Payment | null;
  member: Member | undefined;
  plans?: MembershipPlan[];
  settings: GymSettings;
  adminEmail: string;
  onOpenMemberProfile?: (member: Member | string) => void;
}

export const ReceiptModal: React.FC<Props> = ({
  isOpen = true,
  onClose,
  payment,
  member,
  plans,
  settings,
  adminEmail,
  onOpenMemberProfile,
}) => {
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [emailMessage, setEmailMessage] = useState<string>('');

  if ((isOpen !== undefined && !isOpen) || !payment) return null;

  // Ensure member data is reliably resolved even if state member is loading
  const effectiveMember: Member = member || {
    id: payment.member_id,
    member_id: payment.member_code || 'N/A',
    name: payment.member_name || 'Member',
    mobile: payment.member_mobile || 'N/A',
    email: (payment as any).member_email || '',
    gender: 'other',
    join_date: (payment as any).join_date || payment.payment_date,
    plan_amount: Number(payment.total_due || payment.amount),
    discount: Number(payment.discount || 0),
    membership_start: (payment as any).membership_start || (member as any)?.membership_start || payment.payment_date,
    membership_expiry: (payment as any).membership_expiry || (member as any)?.membership_expiry || '',
    status: 'active',
  };

  const effectiveTxnNumber =
    payment.upi_transaction_number ||
    payment.transaction_number ||
    extractUpiTransactionNumber(payment.notes);
  const effectivePlanName = resolveMemberPlanName(effectiveMember, plans, payment);

  const effectivePayment: Payment = {
    ...payment,
    plan_name: effectivePlanName,
    transaction_number: effectiveTxnNumber,
    upi_transaction_number: effectiveTxnNumber,
  };

  const handleDownloadPdf = () => {
    generateReceiptPdf(effectivePayment, effectiveMember, settings, adminEmail);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    if (emailStatus === 'sending') return;

    setEmailStatus('sending');
    setEmailMessage('');

    try {
      const result = await sendReceiptEmail(effectivePayment, effectiveMember, settings, adminEmail);
      if (result.success) {
        setEmailStatus('success');
        setEmailMessage(result.message);
      } else {
        setEmailStatus('error');
        setEmailMessage(result.message || 'Customer email address not found. Please update the member profile first.');
      }
    } catch (err: any) {
      setEmailStatus('error');
      setEmailMessage(err.message || 'Failed to dispatch email receipt.');
    }
  };

  const planAmountCalculated = Number(payment.total_due - (payment.previous_balance || 0) + (payment.discount || 0));
  const memberEmail = effectiveMember.email || (payment as any).member_email;
  const startDateStr = effectiveMember.membership_start || (payment as any).membership_start || payment.payment_date;
  const expiryDateStr = effectiveMember.membership_expiry || (payment as any).membership_expiry;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Action Header bar (no-print) */}
        <div className="p-4 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 bg-neutral-950 no-print">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Official Receipt #{payment.receipt_number || payment.payment_id}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSendEmail}
              disabled={emailStatus === 'sending'}
              className="px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-800/60 hover:bg-red-900/70 text-red-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              title="Send Receipt Email to customer"
            >
              {emailStatus === 'sending' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                  <span>Sending Receipt...</span>
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5 text-red-400" />
                  <span>Send Receipt Email</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Toast Banner for Email (no-print) */}
        {emailStatus !== 'idle' && (
          <div
            className={`px-4 py-2.5 text-xs font-medium flex items-center justify-between gap-2 border-b no-print ${
              emailStatus === 'sending'
                ? 'bg-neutral-900 text-neutral-300 border-neutral-800'
                : emailStatus === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                : 'bg-rose-950/80 text-rose-300 border-rose-800/80'
            }`}
          >
            <div className="flex items-center gap-2">
              {emailStatus === 'sending' && <Loader2 className="w-4 h-4 animate-spin text-neutral-400 shrink-0" />}
              {emailStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {emailStatus === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              <span>
                {emailStatus === 'sending' ? 'Sending Receipt...' : emailMessage}
              </span>
            </div>
            {emailStatus !== 'sending' && (
              <button
                onClick={() => setEmailStatus('idle')}
                className="text-[10px] uppercase opacity-70 hover:opacity-100 font-bold tracking-wider"
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        {/* Printable Receipt Paper */}
        <div className="p-6 md:p-8 bg-neutral-950 text-neutral-100 receipt-printable space-y-6">
          {/* Gym Header */}
          <div className="flex items-start justify-between border-b border-neutral-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
                <Dumbbell className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-wider text-white leading-none font-display">
                  {settings.gym_name || 'MS FITNESS'}
                </h1>
                <p className="text-xs text-red-500 font-semibold tracking-widest uppercase mt-0.5">
                  {settings.tagline || 'Stronger Body, Stronger You'}
                </p>
                <p className="text-[11px] text-neutral-400 mt-1 max-w-xs leading-relaxed">
                  {settings.address}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded-md bg-red-600/10 border border-red-500/20 text-red-400 text-[10px] font-bold tracking-widest uppercase">
                Official Receipt
              </span>
              <p className="text-xs font-mono text-neutral-300 font-bold mt-2">
                {payment.receipt_number}
              </p>
              <p className="text-[11px] text-neutral-400 font-mono">
                {payment.payment_id}
              </p>
              <p className="text-[11px] text-neutral-400 mt-1">
                {new Date(payment.payment_date).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Member Details Box */}
          <div className="bg-neutral-900/80 rounded-2xl p-4 border border-neutral-800 text-xs">
            <div className="text-red-500 font-bold uppercase tracking-wider text-[10px] mb-2.5">
              Member Particulars
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 text-neutral-300">
              <div>
                <span className="text-neutral-500 block text-[10px]">Member Name</span>
                <span className="font-bold text-white text-sm">
                  {effectiveMember.name || payment.member_name || 'Member'}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Member ID</span>
                {onOpenMemberProfile ? (
                  <button
                    type="button"
                    onClick={() => onOpenMemberProfile(effectiveMember)}
                    className="font-mono font-semibold text-red-400 hover:text-red-300 hover:underline flex items-center gap-1 transition-colors"
                    title="View Complete Member Profile"
                  >
                    <span>{effectiveMember.member_id || payment.member_code || 'N/A'}</span>
                    <span className="text-[10px] bg-red-950/80 text-red-400 px-1 py-0.2 rounded border border-red-800/40 no-print">
                      Profile
                    </span>
                  </button>
                ) : (
                  <span className="font-mono font-semibold text-red-400">
                    {effectiveMember.member_id || payment.member_code || 'N/A'}
                  </span>
                )}
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Registered Mobile</span>
                <span className="font-medium text-neutral-200">
                  {effectiveMember.mobile || payment.member_mobile || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Registered Email</span>
                <span className="font-medium text-neutral-200">
                  {memberEmail || (
                    <span className="text-amber-500 italic">Not on file</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Plan Enrolled</span>
                <span className="font-bold text-white">
                  {effectivePlanName}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Payment Mode</span>
                <span className={`font-bold uppercase ${payment.payment_method === 'UPI' ? 'text-blue-400' : 'text-emerald-400'}`}>
                  {payment.payment_method}
                </span>
              </div>
              {payment.payment_method === 'UPI' && effectiveTxnNumber && (
                <div className="col-span-2 sm:col-span-2 bg-neutral-950/80 border border-neutral-800 rounded-xl px-3 py-2 flex items-center justify-between">
                  <span className="text-neutral-400 text-xs font-medium">UPI Transaction Number</span>
                  <span className="font-mono font-bold text-red-400 text-xs tracking-wider">
                    {effectiveTxnNumber}
                  </span>
                </div>
              )}
              <div>
                <span className="text-neutral-500 block text-[10px]">Membership Start Date</span>
                <span className="font-medium text-neutral-200">
                  {startDateStr
                    ? new Date(startDateStr).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px]">Membership Expiry Date</span>
                <span className="font-semibold text-red-400">
                  {expiryDateStr
                    ? new Date(expiryDateStr).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Active / Continuous'}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Breakdown */}
          <div className="space-y-2 text-xs">
            <div className="bg-neutral-900 rounded-xl p-3 flex justify-between items-center text-neutral-300">
              <span>Plan Base Fee</span>
              <span className="font-mono font-semibold text-white">
                ₹{planAmountCalculated.toLocaleString('en-IN')}
              </span>
            </div>

            {Number(payment.discount || 0) > 0 && (
              <div className="bg-neutral-900 rounded-xl p-3 flex justify-between items-center text-red-400">
                <span>Promotional Discount (-)</span>
                <span className="font-mono font-semibold">
                  - ₹{Number(payment.discount).toLocaleString('en-IN')}
                </span>
              </div>
            )}

            {Number(payment.previous_balance || 0) > 0 && (
              <div className="bg-neutral-900 rounded-xl p-3 flex justify-between items-center text-amber-400">
                <span>Previous Carried Dues (+)</span>
                <span className="font-mono font-semibold">
                  + ₹{Number(payment.previous_balance).toLocaleString('en-IN')}
                </span>
              </div>
            )}

            <div className="bg-neutral-900/90 rounded-xl p-3.5 flex justify-between items-center font-bold text-white border border-neutral-800">
              <span className="text-sm">Total Fee Due</span>
              <span className="font-mono text-base">
                ₹{Number(payment.total_due).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Amount Paid & Remaining Balance Highlights */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-2xl p-4 text-center">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                Amount Received
              </span>
              <span className="text-2xl font-black text-emerald-400 font-display mt-0.5 block">
                ₹{Number(payment.amount).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-emerald-500/80">Payment Confirmed</span>
            </div>

            <div
              className={`rounded-2xl p-4 text-center border ${
                Number(payment.remaining_balance) > 0
                  ? 'bg-red-950/40 border-red-800/40 text-red-400'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider block">
                Remaining Balance
              </span>
              <span
                className={`text-2xl font-black font-display mt-0.5 block ${
                  Number(payment.remaining_balance) > 0 ? 'text-red-400' : 'text-neutral-300'
                }`}
              >
                ₹{Number(payment.remaining_balance).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px]">
                {Number(payment.remaining_balance) > 0 ? 'Carries to next cycle' : 'Nil / Fully Paid'}
              </span>
            </div>
          </div>

          {/* Notes if present */}
          {payment.notes && (
            <div className="text-xs text-neutral-400 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800/60">
              <strong className="text-neutral-300">Notes: </strong>
              <span>{payment.notes}</span>
            </div>
          )}

          {/* Footer signature line */}
          <div className="pt-4 border-t border-neutral-800 flex items-end justify-between text-[11px] text-neutral-400">
            <div>
              <p>Admin: {adminEmail || 'admin@msfitness.com'}</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">MS Fitness Management Software</p>
            </div>
            <div className="text-right">
              <div className="w-36 border-b border-neutral-700 pb-1 text-center font-serif italic text-neutral-300 text-xs">
                Authorized Signatory
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">MS Fitness Official Stamp</p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="text-xs text-neutral-400 flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-red-500" />
            <span>
              {memberEmail ? (
                <>Ready to send to <strong className="text-white">{memberEmail}</strong></>
              ) : (
                <span className="text-amber-400">Add member email to dispatch PDF directly</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSendEmail}
              disabled={emailStatus === 'sending'}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 border border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {emailStatus === 'sending' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                  <span>Sending Receipt...</span>
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5 text-red-400" />
                  <span>Send Receipt Email</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 shadow-lg shadow-red-600/20"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
