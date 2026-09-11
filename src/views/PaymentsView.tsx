import React, { useState, useEffect } from 'react';
import { Member, MembershipPlan, Payment, GymSettings, AdminAccount } from '../types';
import { hasPermission } from '../lib/permissions';
import { getMemberLatestBalance } from '../lib/db';
import { calculatePaymentBreakdown, PaymentStatus } from '../lib/paymentCalculations';
import {
  CreditCard,
  Search,
  Receipt,
  Download,
  Eye,
  CheckCircle2,
  Calendar,
  IndianRupee,
  RefreshCw,
  Clock,
  Sparkles,
  User,
  ArrowRight,
  Mail,
  Loader2,
  AlertCircle,
  Shield,
  Phone,
  Check,
  AlertTriangle,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { generateReceiptPdf } from '../lib/pdfReceipt';
import { sendReceiptEmail } from '../lib/emailReceipt';
import { resolveMemberPlanName, extractUpiTransactionNumber } from '../lib/planUtils';

interface Props {
  members: Member[];
  plans: MembershipPlan[];
  payments: Payment[];
  settings: GymSettings;
  adminEmail: string;
  currentAdmin?: AdminAccount;
  onRecordPayment: (paymentData: any) => Promise<Payment>;
  onViewReceipt: (payment: Payment) => void;
  preselectedMember?: Member | null;
  onClearPreselectedMember?: () => void;
  onOpenMemberProfile?: (member: Member | string) => void;
}

export const PaymentsView: React.FC<Props> = ({
  members,
  plans,
  payments,
  settings,
  adminEmail,
  currentAdmin,
  onRecordPayment,
  onViewReceipt,
  preselectedMember,
  onClearPreselectedMember,
  onOpenMemberProfile,
}) => {
  const canRecordPayment = !currentAdmin || hasPermission(currentAdmin, 'payments.create');
  // Member selection
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  // Payment form states
  const [planAmount, setPlanAmount] = useState<number>(0);
  const [previousBalance, setPreviousBalance] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI'>('Cash');
  const [upiTransactionNumber, setUpiTransactionNumber] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>('');
  const [renewMonths, setRenewMonths] = useState<number>(0);

  // Status states
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [amountValidationError, setAmountValidationError] = useState<string | null>(null);
  const [upiValidationError, setUpiValidationError] = useState<string | null>(null);
  const [successPayment, setSuccessPayment] = useState<Payment | null>(null);

  // Email status state
  const [sendingPaymentId, setSendingPaymentId] = useState<string | null>(null);
  const [emailAlert, setEmailAlert] = useState<{
    type: 'success' | 'error';
    message: string;
    paymentId?: string;
  } | null>(null);

  // History search filter
  const [historySearch, setHistorySearch] = useState<string>('');

  // When preselectedMember is provided, auto-select
  useEffect(() => {
    if (preselectedMember) {
      handleSelectMember(preselectedMember);
    }
  }, [preselectedMember]);

  const handleSelectMember = async (m: Member) => {
    setSelectedMemberId(m.id);
    setMemberSearch(`${m.name} (${m.member_id})`);
    setErrorMsg(null);
    setAmountValidationError(null);
    setUpiValidationError(null);
    setSuccessPayment(null);
    setUpiTransactionNumber('');

    // Load member plan info
    const plan = plans.find((p) => p.id === m.plan_id);
    const pAmount = Number(m.plan_amount || plan?.price || 0);
    const pDiscount = Number(m.discount || 0);
    setPlanAmount(pAmount);
    setDiscount(pDiscount);
    setRenewMonths(plan?.duration_months || 1);

    // Fetch the latest remaining balance from previous payments
    setLoadingBalance(true);
    try {
      const prevBal = await getMemberLatestBalance(m.id);
      setPreviousBalance(prevBal);

      // Default amount paid to total payable
      const initialTotalPayable = Math.max(0, pAmount - pDiscount + prevBal);
      setAmountPaid(initialTotalPayable);
    } catch (e) {
      console.warn('Could not fetch previous balance:', e);
      setPreviousBalance(0);
      setAmountPaid(Math.max(0, pAmount - pDiscount));
    } finally {
      setLoadingBalance(false);
    }
  };

  // Central 100% accurate financial calculation engine
  const calculation = calculatePaymentBreakdown({
    originalPlanAmount: planAmount,
    discount: discount,
    previousPendingBalance: previousBalance,
    currentPayment: amountPaid,
  });

  // Derived financial amounts
  const totalPayable = calculation.totalOutstandingAmount;
  const remainingBalance = calculation.remainingPendingAmount;
  const overpaidAmount = calculation.overpaidAmount;

  const handleAmountPaidChange = (valStr: string) => {
    setAmountValidationError(null);
    if (valStr === '') {
      setAmountPaid(0);
      return;
    }
    const val = Number(valStr);
    if (isNaN(val)) {
      setAmountValidationError('Please enter a valid numeric amount.');
      return;
    }
    if (val < 0) {
      setAmountValidationError('Amount paid cannot be negative.');
      setAmountPaid(0);
      return;
    }
    setAmountPaid(val);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setAmountValidationError(null);
    setUpiValidationError(null);

    if (!selectedMemberId) {
      setErrorMsg('Please select a gym member first.');
      return;
    }

    if (amountPaid < 0 || isNaN(amountPaid)) {
      setAmountValidationError('Amount Paid must be a valid positive number.');
      return;
    }

    if (paymentMethod === 'UPI' && !upiTransactionNumber.trim()) {
      setUpiValidationError('UPI Transaction Number is required for UPI payments.');
      return;
    }

    if (amountPaid === 0 && totalPayable > 0) {
      if (
        !confirm(
          'The Amount Paid is ₹0. Do you want to record this transaction with full outstanding remaining balance?'
        )
      ) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const member = members.find((m) => m.id === selectedMemberId);
      const planNameResolved = resolveMemberPlanName(member, plans);
      const cleanUpiTxn = paymentMethod === 'UPI' ? upiTransactionNumber.trim() : undefined;

      const payment = await onRecordPayment({
        member_id: selectedMemberId,
        original_plan_amount: calculation.originalPlanAmount,
        final_payable: calculation.finalPayableAmount,
        amount: calculation.currentPayment,
        discount: calculation.discount,
        previous_balance: calculation.previousPendingBalance,
        total_due: calculation.totalOutstandingAmount,
        remaining_balance: calculation.remainingPendingAmount,
        overpaid_amount: calculation.overpaidAmount,
        payment_status: calculation.status,
        payment_method: paymentMethod,
        transaction_number: cleanUpiTxn,
        upi_transaction_number: cleanUpiTxn,
        payment_date: paymentDate,
        notes: notes.trim(),
        plan_name: planNameResolved,
        renew_months: renewMonths,
      });

      setSuccessPayment(payment);
      if (onClearPreselectedMember) onClearPreselectedMember();
    } catch (err: any) {
      console.error('Supabase payment insert error:', err);
      setErrorMsg(err.message || 'Failed to save payment to Supabase');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadSuccessPdf = () => {
    if (!successPayment) return;
    const member = members.find((m) => m.id === successPayment.member_id);
    const enriched: Payment = {
      ...successPayment,
      plan_name: resolveMemberPlanName(member, plans, successPayment),
      transaction_number:
        successPayment.upi_transaction_number ||
        successPayment.transaction_number ||
        extractUpiTransactionNumber(successPayment.notes),
    };
    generateReceiptPdf(enriched, member, settings, adminEmail);
  };

  const handleSendReceiptEmail = async (p: Payment) => {
    if (sendingPaymentId) return;
    setSendingPaymentId(p.id);
    setEmailAlert(null);

    const member = members.find(
      (m) => m.id === p.member_id || m.member_id === p.member_id || m.member_id === p.member_code
    );

    const enriched: Payment = {
      ...p,
      plan_name: resolveMemberPlanName(member, plans, p),
      transaction_number:
        p.upi_transaction_number || p.transaction_number || extractUpiTransactionNumber(p.notes),
      member_name: member?.name || p.member_name,
      member_code: member?.member_id || p.member_code,
      member_mobile: member?.mobile || p.member_mobile,
      member_email: member?.email || (p as any).member_email,
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
          message:
            result.message ||
            'Customer email address not found. Please update the member profile first.',
          paymentId: p.id,
        });
      }
    } catch (err: any) {
      setEmailAlert({
        type: 'error',
        message: err.message || 'Failed to send receipt email',
        paymentId: p.id,
      });
    } finally {
      setSendingPaymentId(null);
    }
  };

  const resetFormAfterSuccess = () => {
    setSuccessPayment(null);
    setSelectedMemberId('');
    setMemberSearch('');
    setPlanAmount(0);
    setPreviousBalance(0);
    setDiscount(0);
    setAmountPaid(0);
    setUpiTransactionNumber('');
    setNotes('');
    setRenewMonths(0);
    setErrorMsg(null);
    setAmountValidationError(null);
    setUpiValidationError(null);
  };

  // Filtered members for dropdown search
  const searchedMembers = members
    .filter((m) => {
      if (!memberSearch) return false;
      const term = memberSearch.toLowerCase();
      return (
        m.name.toLowerCase().includes(term) ||
        m.member_id.toLowerCase().includes(term) ||
        (m.mobile && m.mobile.includes(term))
      );
    })
    .slice(0, 8);

  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const selectedMemberPlanName = resolveMemberPlanName(selectedMember, plans);

  // Filtered payments archive
  const filteredPayments = payments.filter((p) => {
    if (!historySearch.trim()) return true;
    const term = historySearch.toLowerCase();
    const txn =
      p.upi_transaction_number || p.transaction_number || extractUpiTransactionNumber(p.notes);
    return (
      (p.receipt_number && p.receipt_number.toLowerCase().includes(term)) ||
      (p.payment_id && p.payment_id.toLowerCase().includes(term)) ||
      (p.member_name && p.member_name.toLowerCase().includes(term)) ||
      (p.member_code && p.member_code.toLowerCase().includes(term)) ||
      (p.plan_name && p.plan_name.toLowerCase().includes(term)) ||
      (p.payment_method && p.payment_method.toLowerCase().includes(term)) ||
      (txn && txn.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-8">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide font-display flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-red-600" />
            PAYMENT & RECEIPT SYSTEM
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Professional gym billing, ledger balance carrying, and instant official receipt generation.
          </p>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Organized Payment Form (7 Cols) */}
        <div className="lg:col-span-7 bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-neutral-800">
            <div className="w-10 h-10 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Record Member Fee Payment</h3>
              <p className="text-xs text-neutral-400">
                Complete billing ledger with automated balance calculation
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmitPayment} className="space-y-6">
            {/* SECTION 1: CUSTOMER INFORMATION */}
            <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wider pb-2 border-b border-neutral-800/80">
                <User className="w-4 h-4" /> 1. Customer Information
              </div>

              {/* Member Search Input */}
              <div className="relative">
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Select Gym Member *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      if (selectedMemberId && e.target.value !== selectedMember?.name) {
                        setSelectedMemberId('');
                      }
                    }}
                    placeholder="Search by Name, Member ID (e.g. MS-0001), or Mobile..."
                    className="w-full bg-neutral-900 border border-neutral-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
                  />
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>

                {/* Autocomplete dropdown if searching */}
                {!selectedMemberId && memberSearch && searchedMembers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl z-30 max-h-56 overflow-y-auto divide-y divide-neutral-800">
                    {searchedMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectMember(m)}
                        className="w-full text-left p-3 hover:bg-neutral-900 transition-colors flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{m.name}</span>
                            <span className="font-mono text-red-400 text-[10px] bg-red-950/60 px-1.5 py-0.5 rounded border border-red-900/40">
                              {m.member_id}
                            </span>
                          </div>
                          <span className="text-neutral-400 text-[11px]">{m.mobile}</span>
                        </div>
                        <span className="text-red-400 text-[10px] font-semibold">Select Athlete →</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Customer Card */}
              {selectedMember ? (
                <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider block">
                        Customer Details
                      </span>
                      <div className="font-bold text-white text-sm mt-0.5">{selectedMember.name}</div>
                    </div>

                    {/* Member ID clickable badge */}
                    {onOpenMemberProfile ? (
                      <button
                        type="button"
                        onClick={() => onOpenMemberProfile(selectedMember)}
                        className="font-mono text-xs font-bold text-red-400 bg-red-950/80 hover:bg-red-900/90 border border-red-800/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all"
                        title="Click to open complete member profile & payment history"
                      >
                        <span>{selectedMember.member_id}</span>
                        <ExternalLink className="w-3 h-3 text-red-400" />
                      </button>
                    ) : (
                      <span className="font-mono text-xs font-bold text-red-400 bg-red-950/80 border border-red-800/80 px-2.5 py-1 rounded-lg">
                        {selectedMember.member_id}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-neutral-400 pt-2 border-t border-neutral-800/80 text-[11px]">
                    <div>
                      <span className="text-neutral-500">Mobile: </span>
                      <span className="text-neutral-200 font-mono font-medium">
                        {selectedMember.mobile || 'Not provided'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500">Email: </span>
                      <span className="text-neutral-200">
                        {selectedMember.email || 'Not provided'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-neutral-500 italic">
                  Select an athlete above to view customer information and carried ledger dues.
                </p>
              )}
            </div>

            {/* SECTION 2: MEMBERSHIP */}
            <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wider pb-2 border-b border-neutral-800/80">
                <Shield className="w-4 h-4" /> 2. Membership Details & Ledger
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                    Plan Name
                  </label>
                  <div className="w-full bg-neutral-900 border border-neutral-700/80 rounded-xl px-3 py-2 text-sm text-white font-semibold">
                    {selectedMemberPlanName}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                    Plan Amount (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={planAmount}
                    onChange={(e) => setPlanAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:border-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-red-400 mb-1">
                    Discount (-) (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-red-300 focus:border-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-amber-400 mb-1 flex items-center justify-between">
                    <span>Previous Pending Balance (+) (₹)</span>
                    {loadingBalance && <span className="text-[10px] text-neutral-400">Loading dues...</span>}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={previousBalance}
                    onChange={(e) => setPreviousBalance(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-amber-300 focus:border-red-500 outline-none"
                  />
                </div>
              </div>

              {/* Explicit Financial Breakdown Highlight */}
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-400 pb-2 border-b border-neutral-800/80">
                  <span>Final Payable (Plan - Discount):</span>
                  <span className="font-semibold text-white">
                    ₹{calculation.originalPlanAmount.toLocaleString('en-IN')} - ₹{calculation.discount.toLocaleString('en-IN')} = ₹{calculation.finalPayableAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                      Total Outstanding Due
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      Final Payable (₹{calculation.finalPayableAmount}) + Previous Pending Balance (₹{calculation.previousPendingBalance})
                    </span>
                  </div>
                  <div className="text-2xl font-extrabold text-white font-display">
                    ₹{calculation.totalOutstandingAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: PAYMENT */}
            <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wider pb-2 border-b border-neutral-800/80">
                <CreditCard className="w-4 h-4" /> 3. Payment Execution
              </div>

              {/* Amount Paid Field */}
              <div>
                <label className="block text-xs font-semibold text-emerald-400 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5" /> Amount Paid *
                  </span>
                  <span className="text-[10px] text-neutral-400">Numeric, positive value only</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-emerald-400 text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    required
                    value={amountPaid === 0 ? '' : amountPaid}
                    onChange={(e) => handleAmountPaidChange(e.target.value)}
                    placeholder="0"
                    className={`w-full bg-neutral-900 border ${
                      amountValidationError ? 'border-red-500 ring-1 ring-red-500' : 'border-emerald-800/80'
                    } focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-8 pr-4 py-2.5 text-base font-bold text-emerald-300 outline-none`}
                  />
                </div>
                {amountValidationError && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {amountValidationError}
                  </p>
                )}
              </div>

              {/* Payment Method (Cash, UPI) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Payment Method *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('Cash');
                      setUpiTransactionNumber('');
                      setUpiValidationError(null);
                    }}
                    className={`py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'Cash'
                        ? 'bg-neutral-800 text-white border-2 border-red-500 shadow-md shadow-red-950/40'
                        : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span>💵 Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('UPI');
                      setUpiValidationError(null);
                    }}
                    className={`py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'UPI'
                        ? 'bg-neutral-800 text-white border-2 border-red-500 shadow-md shadow-red-950/40'
                        : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span>📱 UPI</span>
                  </button>
                </div>
              </div>

              {/* UPI Transaction Number (Required if UPI, hidden if Cash) */}
              {paymentMethod === 'UPI' && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                  <label className="block text-xs font-semibold text-blue-400">
                    UPI Transaction Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={upiTransactionNumber}
                    onChange={(e) => {
                      setUpiTransactionNumber(e.target.value);
                      if (e.target.value.trim()) setUpiValidationError(null);
                    }}
                    placeholder="Enter UPI Transaction Number"
                    className={`w-full bg-neutral-900 border ${
                      upiValidationError ? 'border-red-500 ring-1 ring-red-500' : 'border-neutral-700'
                    } focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-3.5 py-2 text-sm text-white font-mono placeholder-neutral-500 outline-none`}
                  />
                  {upiValidationError ? (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {upiValidationError}
                    </p>
                  ) : (
                    <p className="text-[10px] text-neutral-400">
                      Enter the 12-digit UTR or banking reference number.
                    </p>
                  )}
                </div>
              )}

              {/* Live Remaining Balance & Overpayment Calculation Box */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={`p-3.5 rounded-xl border text-xs ${
                    calculation.remainingPendingAmount > 0
                      ? 'bg-red-950/40 border-red-800/60 text-red-300'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold block text-[11px]">
                        Remaining Pending Amount:
                      </span>
                      <span className={`font-bold font-display text-lg ${
                        calculation.remainingPendingAmount > 0 ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        ₹{calculation.remainingPendingAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400 mt-0.5 block">
                      {calculation.remainingPendingAmount > 0
                        ? "Carried forward to member's next bill"
                        : 'Nil - No pending balance'}
                    </span>
                  </div>

                  <div className={`p-3.5 rounded-xl border text-xs ${
                    calculation.overpaidAmount > 0
                      ? 'bg-emerald-950/50 border-emerald-600/70 text-emerald-200'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold block text-[11px]">
                        Overpaid Amount:
                      </span>
                      <span className={`font-bold font-display text-lg ${
                        calculation.overpaidAmount > 0 ? 'text-emerald-400' : 'text-neutral-400'
                      }`}>
                        ₹{calculation.overpaidAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400 mt-0.5 block">
                      {calculation.overpaidAmount > 0
                        ? 'Credited to member advance balance'
                        : 'Nil - Exact or partial payment'}
                    </span>
                  </div>
                </div>

                {/* Status indicator badge */}
                <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
                  <span className="text-neutral-400 text-[11px] font-medium">Payment Status:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
                    calculation.status === 'Paid'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : calculation.status === 'Overpaid'
                      ? 'bg-blue-950 text-blue-300 border border-blue-800'
                      : calculation.status === 'Partial'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}>
                    {calculation.status === 'Overpaid' ? 'Overpaid (Advance Credit)' : calculation.status}
                  </span>
                </div>
              </div>

              {/* Payment Date, Renew Months, and Receipt Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-red-500" /> Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                    Extend Membership (Months)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={renewMonths}
                    onChange={(e) => setRenewMonths(Number(e.target.value))}
                    placeholder="e.g. 1, 3, 6, 12"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                  Receipt Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Advance fee payment, discount approved by admin"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:border-red-500 outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            {canRecordPayment ? (
              <button
                type="submit"
                disabled={submitting || !selectedMemberId}
                className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm tracking-wide transition-all shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Recording Payment in Supabase...</span>
                  </>
                ) : (
                  <>
                    <Receipt className="w-4 h-4" />
                    <span>Confirm & Issue Official Receipt</span>
                  </>
                )}
              </button>
            ) : (
              <div
                title="Your administrator role does not have permission to issue receipts or record payments (payments.create)"
                className="w-full py-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-500 font-semibold text-xs tracking-wide flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <Lock className="w-4 h-4 text-neutral-500" />
                <span>Payment Creation Restricted by Role Permissions</span>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Live Payment Summary & Success Receipt Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {successPayment ? (
            <div className="bg-neutral-900/90 border border-emerald-800/80 rounded-3xl p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-black text-white">Payment Recorded Successfully</h4>
                <p className="text-xs text-emerald-300">
                  Official receipt has been stored in Supabase with all ledger calculations.
                </p>
              </div>

              <div className="bg-neutral-950 rounded-2xl p-4 border border-neutral-800 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Receipt No:</span>
                  <span className="font-mono font-bold text-red-400">
                    {successPayment.receipt_number || successPayment.payment_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Plan Amount:</span>
                  <span className="font-semibold text-white">
                    ₹{Number(successPayment.original_plan_amount ?? successPayment.total_due).toLocaleString('en-IN')}
                  </span>
                </div>
                {Number(successPayment.discount || 0) > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Discount:</span>
                    <span>- ₹{Number(successPayment.discount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-300">
                  <span>Final Payable:</span>
                  <span className="font-semibold text-white">
                    ₹{Number(successPayment.final_payable ?? (Number(successPayment.total_due) - Number(successPayment.previous_balance || 0))).toLocaleString('en-IN')}
                  </span>
                </div>
                {Number(successPayment.previous_balance || 0) > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Previous Balance:</span>
                    <span>+ ₹{Number(successPayment.previous_balance).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-neutral-800 pt-1.5">
                  <span className="text-neutral-300 font-medium">Total Due:</span>
                  <span className="font-bold text-white">
                    ₹{Number(successPayment.total_due).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-300 font-medium">Current Payment:</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    ₹{Number(successPayment.amount).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-300 font-medium">Remaining Pending:</span>
                  <span className={`font-bold ${Number(successPayment.remaining_balance) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    ₹{Number(successPayment.remaining_balance).toLocaleString('en-IN')}
                  </span>
                </div>
                {Number(successPayment.overpaid_amount || 0) > 0 && (
                  <div className="flex justify-between bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-800/40 text-emerald-300">
                    <span className="font-semibold">Overpaid / Advance Credit:</span>
                    <span className="font-bold">
                      + ₹{Number(successPayment.overpaid_amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 border-t border-neutral-850">
                  <span className="text-neutral-400">Status:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-neutral-800 text-white border border-neutral-700">
                    {successPayment.payment_status || 'Paid'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Payment Method:</span>
                  <span className="font-bold text-white uppercase">
                    {successPayment.payment_method}
                  </span>
                </div>
                {successPayment.payment_method === 'UPI' &&
                  (successPayment.upi_transaction_number || successPayment.transaction_number) && (
                    <div className="flex justify-between pt-1 border-t border-neutral-900">
                      <span className="text-neutral-400">UPI Txn No:</span>
                      <span className="font-mono text-red-400 font-bold">
                        {successPayment.upi_transaction_number || successPayment.transaction_number}
                      </span>
                    </div>
                  )}
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => handleSendReceiptEmail(successPayment)}
                  disabled={sendingPaymentId === successPayment.id}
                  className="w-full py-3 rounded-2xl bg-red-950/60 border border-red-800/60 hover:bg-red-900/70 text-red-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md"
                >
                  {sendingPaymentId === successPayment.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                      <span>Sending Receipt Email...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 text-red-400" />
                      <span>Send Official Receipt Email</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadSuccessPdf}
                  className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20"
                >
                  <Download className="w-4 h-4" /> Download Official PDF Receipt
                </button>

                <button
                  onClick={() => onViewReceipt(successPayment)}
                  className="w-full py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Eye className="w-4 h-4" /> View & Print Receipt
                </button>

                <button
                  onClick={resetFormAfterSuccess}
                  className="w-full py-2.5 text-xs text-neutral-400 hover:text-white transition-colors text-center"
                >
                  Record Another Payment
                </button>
              </div>
            </div>
          ) : (
            /* Real-time Receipt Preview Card */
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 md:p-7 space-y-5">
              <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wider">
                <Receipt className="w-4 h-4" /> Live Payment Summary & Preview
              </div>

              <div className="bg-neutral-950 rounded-2xl p-5 border border-neutral-800 text-xs space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <span className="font-bold text-white uppercase text-[11px] font-display">
                    MS FITNESS RECEIPT
                  </span>
                  <span className="font-mono text-neutral-500 text-[10px]">PREVIEW</span>
                </div>

                <div className="space-y-2 text-neutral-300">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Original Plan Amount:</span>
                    <span className="font-semibold text-white">₹{calculation.originalPlanAmount.toLocaleString('en-IN')}</span>
                  </div>
                  {calculation.discount > 0 && (
                    <div className="flex justify-between text-red-400">
                      <span>Discount (-):</span>
                      <span>- ₹{calculation.discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-neutral-300">
                    <span>Final Payable Amount:</span>
                    <span className="font-bold text-white">₹{calculation.finalPayableAmount.toLocaleString('en-IN')}</span>
                  </div>
                  {calculation.previousPendingBalance > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Previous Pending Balance (+):</span>
                      <span>+ ₹{calculation.previousPendingBalance.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-white pt-2 border-t border-neutral-800 text-sm">
                    <span>Total Outstanding Due:</span>
                    <span className="text-red-300">₹{calculation.totalOutstandingAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-800 grid grid-cols-2 gap-2 text-center">
                  <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/40">
                    <span className="text-[10px] text-emerald-400 uppercase font-semibold block">
                      Current Payment
                    </span>
                    <span className="text-base font-bold text-emerald-300 font-display">
                      ₹{calculation.currentPayment.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${
                    calculation.remainingPendingAmount > 0
                      ? 'bg-neutral-900 border-neutral-800'
                      : 'bg-emerald-950/30 border-emerald-900/40'
                  }`}>
                    <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
                      Remaining Pending
                    </span>
                    <span className={`text-base font-bold font-display ${
                      calculation.remainingPendingAmount > 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      ₹{calculation.remainingPendingAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {calculation.overpaidAmount > 0 && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-600/60 text-xs text-emerald-300">
                    <span className="font-semibold">Overpaid Advance Credit:</span>
                    <span className="font-bold text-sm text-emerald-200">
                      + ₹{calculation.overpaidAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
                  <span className="text-neutral-400 text-[10px]">Payment Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    calculation.status === 'Paid'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : calculation.status === 'Overpaid'
                      ? 'bg-blue-950 text-blue-300 border border-blue-800'
                      : calculation.status === 'Partial'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}>
                    {calculation.status === 'Overpaid' ? 'Overpaid (Credit)' : calculation.status}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-[11px] text-neutral-400 leading-relaxed">
                💡 <strong>100% Ledger Precision:</strong> If a member pays more than due (e.g. ₹9,004 for ₹8,999), the remaining pending is ₹0 and the extra ₹5 is stored as Overpaid Advance Credit. If less is paid, remaining pending carries to their next cycle.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* COMPLETE PAYMENT & RECEIPT ARCHIVE */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-white font-display">
              COMPLETE PAYMENT & RECEIPT ARCHIVE
            </h3>
            <p className="text-xs text-neutral-400">
              Complete transaction registry. View details, download PDF, or dispatch email receipts anytime.
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search receipts or Member ID..."
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 outline-none"
            />
          </div>
        </div>

        {/* Email feedback alert */}
        {emailAlert && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
              emailAlert.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-800/80 text-emerald-300'
                : 'bg-rose-950/70 border-rose-800/80 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {emailAlert.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-medium">{emailAlert.message}</span>
            </div>
            <button
              onClick={() => setEmailAlert(null)}
              className="text-[10px] uppercase font-bold tracking-wider opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-xs">
              No payment transactions found matching search criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Receipt No</th>
                  <th className="py-3.5 px-4">Member ID & Name</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Plan</th>
                  <th className="py-3.5 px-4">Total Due</th>
                  <th className="py-3.5 px-4">Amount Paid</th>
                  <th className="py-3.5 px-4">Remaining Due</th>
                  <th className="py-3.5 px-4">Overpaid Credit</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Method / UPI Txn</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80 text-neutral-200">
                {filteredPayments.map((p) => {
                  const member = members.find(
                    (m) =>
                      m.id === p.member_id ||
                      m.member_id === p.member_id ||
                      m.member_id === p.member_code
                  );
                  const isSendingThis = sendingPaymentId === p.id;
                  const txnNum =
                    p.upi_transaction_number ||
                    p.transaction_number ||
                    extractUpiTransactionNumber(p.notes);
                  const planResolved = resolveMemberPlanName(member, plans, p);
                  const isUpi = p.payment_method === 'UPI';
                  const overpaid = Number(p.overpaid_amount || 0);
                  const remDue = Number(p.remaining_balance || 0);
                  const status = p.payment_status || (remDue === 0 ? (overpaid > 0 ? 'Overpaid' : 'Paid') : (Number(p.amount) > 0 ? 'Partial' : 'Pending'));

                  return (
                    <tr key={p.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-red-400 text-xs bg-neutral-950 px-2 py-1 rounded border border-neutral-800">
                          {p.receipt_number || p.payment_id}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">
                          {p.member_name || member?.name || 'Member'}
                        </div>
                        {/* Clickable Member ID to open profile */}
                        {onOpenMemberProfile && (member || p.member_code) ? (
                          <button
                            type="button"
                            onClick={() => onOpenMemberProfile(member || p.member_code || p.member_id)}
                            className="text-[11px] font-mono text-red-400 hover:text-red-300 hover:underline flex items-center gap-1 mt-0.5"
                            title="Click to view full Member Profile"
                          >
                            <span>{p.member_code || member?.member_id || 'View Profile'}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          </button>
                        ) : (
                          <div className="text-[10px] text-neutral-400 font-mono">
                            {p.member_code || member?.member_id}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-300 whitespace-nowrap">
                        {new Date(p.payment_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-white whitespace-nowrap">
                        {planResolved}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-300 font-mono">
                        ₹{Number(p.total_due).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400 font-mono">
                        ₹{Number(p.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-semibold font-mono">
                        <span className={remDue > 0 ? 'text-red-400' : 'text-emerald-400'}>
                          ₹{remDue.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold font-mono">
                        {overpaid > 0 ? (
                          <span className="text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
                            +₹{overpaid.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-neutral-500">₹0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            status === 'Paid'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                              : status === 'Overpaid'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800/50'
                              : status === 'Partial'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800/50'
                              : 'bg-red-950 text-red-300 border border-red-800/50'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isUpi
                              ? 'bg-blue-950/80 text-blue-400 border border-blue-800/40'
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
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => {
                              const enriched: Payment = {
                                ...p,
                                plan_name: planResolved,
                                transaction_number: txnNum,
                                upi_transaction_number: txnNum,
                              };
                              onViewReceipt(enriched);
                            }}
                            title="View & Print Official Receipt"
                            className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-medium flex items-center gap-1.5 transition-colors text-[11px]"
                          >
                            <Eye className="w-3.5 h-3.5 text-neutral-300" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => {
                              const enriched: Payment = {
                                ...p,
                                plan_name: planResolved,
                                transaction_number: txnNum,
                                upi_transaction_number: txnNum,
                              };
                              generateReceiptPdf(enriched, member, settings, adminEmail);
                            }}
                            title="Download PDF Receipt"
                            className="p-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSendReceiptEmail(p)}
                            disabled={isSendingThis || !!sendingPaymentId}
                            title={
                              isSendingThis
                                ? 'Sending Receipt...'
                                : `Send PDF Receipt Email to ${member?.email || 'customer'}`
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-red-950/50 border border-red-800/50 hover:bg-red-900/60 text-red-300 hover:text-white font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isSendingThis ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                                <span className="text-[11px]">Sending...</span>
                              </>
                            ) : (
                              <>
                                <Mail className="w-3.5 h-3.5 text-red-400" />
                                <span className="text-[11px] hidden lg:inline">Send Email</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
