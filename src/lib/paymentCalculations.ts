import { Member, Payment } from '../types';

export type PaymentStatus = 'Paid' | 'Partial' | 'Overpaid' | 'Pending' | 'Unpaid';

export interface PaymentCalculationInput {
  originalPlanAmount: number;
  discount: number;
  previousPendingBalance: number;
  currentPayment: number;
}

export interface PaymentCalculationResult {
  originalPlanAmount: number;
  discount: number;
  finalPayableAmount: number;      // Original Plan Amount - Discount
  previousPendingBalance: number;  // Previous Pending Balance
  totalOutstandingAmount: number;  // Final Payable Amount + Previous Pending Balance
  currentPayment: number;          // Current Payment received
  remainingPendingAmount: number;  // If currentPayment < totalOutstanding: totalOutstanding - currentPayment, else 0
  overpaidAmount: number;          // If currentPayment > totalOutstanding: currentPayment - totalOutstanding, else 0
  status: PaymentStatus;
}

/**
 * 100% Accurate Gym Payment Calculation Engine
 * 
 * Rules:
 * 1. Final Payable Amount = Original Plan Amount - Discount
 * 2. Total Outstanding Amount = Final Payable Amount + Previous Pending Balance
 * 3. If Current Payment == Total Outstanding:
 *      Remaining Pending = 0, Overpaid = 0, Status = Paid
 * 4. If Current Payment < Total Outstanding:
 *      Remaining Pending = Total Outstanding - Current Payment, Overpaid = 0, Status = Partial
 * 5. If Current Payment > Total Outstanding:
 *      Remaining Pending = 0, Overpaid = Current Payment - Total Outstanding, Status = Overpaid
 * 6. If Current Payment == 0 and Total Outstanding > 0:
 *      Remaining Pending = Total Outstanding, Overpaid = 0, Status = Pending
 */
export function calculatePaymentBreakdown(input: PaymentCalculationInput): PaymentCalculationResult {
  const originalPlanAmount = Math.max(0, roundTwoDecimals(Number(input.originalPlanAmount) || 0));
  const discount = Math.max(0, roundTwoDecimals(Number(input.discount) || 0));
  const previousPendingBalance = Math.max(0, roundTwoDecimals(Number(input.previousPendingBalance) || 0));
  const currentPayment = Math.max(0, roundTwoDecimals(Number(input.currentPayment) || 0));

  // Step 1: Final Payable Amount = Original Plan Amount - Discount
  const finalPayableAmount = Math.max(0, roundTwoDecimals(originalPlanAmount - discount));

  // Step 2: Total Outstanding Amount = Final Payable Amount + Previous Pending Balance
  const totalOutstandingAmount = roundTwoDecimals(finalPayableAmount + previousPendingBalance);

  let remainingPendingAmount = 0;
  let overpaidAmount = 0;
  let status: PaymentStatus = 'Paid';

  if (currentPayment === 0) {
    if (totalOutstandingAmount > 0) {
      remainingPendingAmount = totalOutstandingAmount;
      overpaidAmount = 0;
      status = 'Pending';
    } else {
      remainingPendingAmount = 0;
      overpaidAmount = 0;
      status = 'Paid';
    }
  } else if (currentPayment === totalOutstandingAmount) {
    remainingPendingAmount = 0;
    overpaidAmount = 0;
    status = 'Paid';
  } else if (currentPayment < totalOutstandingAmount) {
    remainingPendingAmount = roundTwoDecimals(totalOutstandingAmount - currentPayment);
    overpaidAmount = 0;
    status = 'Partial';
  } else {
    // currentPayment > totalOutstandingAmount (Overpayment / Advance Credit)
    remainingPendingAmount = 0;
    overpaidAmount = roundTwoDecimals(currentPayment - totalOutstandingAmount);
    status = 'Overpaid';
  }

  return {
    originalPlanAmount,
    discount,
    finalPayableAmount,
    previousPendingBalance,
    totalOutstandingAmount,
    currentPayment,
    remainingPendingAmount,
    overpaidAmount,
    status,
  };
}

export function roundTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Derives accurate financial totals and balances for a member
 * using the complete payment ledger.
 */
export function getMemberFinancialTotals(member: Member, payments: Payment[]) {
  const memberPayments = payments.filter(
    (p) => p.member_id === member.id || p.member_code === member.member_id
  );

  const totalAmountPaid = roundTwoDecimals(
    memberPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  );
  const totalDiscount = roundTwoDecimals(
    memberPayments.reduce((sum, p) => sum + (Number(p.discount) || 0), 0)
  );

  // Sort payments newest to oldest
  const sorted = [...memberPayments].sort((a, b) => {
    const timeA = new Date(a.payment_date || a.created_at || '').getTime();
    const timeB = new Date(b.payment_date || b.created_at || '').getTime();
    return timeB - timeA;
  });

  const latestPayment = sorted[0] || null;

  // Determine current pending balance
  let remainingPendingAmount = 0;
  let overpaidAmount = 0;

  if (latestPayment) {
    const rawRem = Number(latestPayment.remaining_balance);
    if (rawRem < 0) {
      // Sanitize any legacy negative balance into overpaid credit
      remainingPendingAmount = 0;
      overpaidAmount = Math.abs(rawRem);
    } else {
      remainingPendingAmount = rawRem;
      if (latestPayment.overpaid_amount !== undefined && latestPayment.overpaid_amount !== null) {
        overpaidAmount = Math.max(0, Number(latestPayment.overpaid_amount));
      }
    }
  } else {
    const rawMemberRem = Number(member.remaining_balance || 0);
    if (rawMemberRem < 0) {
      remainingPendingAmount = 0;
      overpaidAmount = Math.abs(rawMemberRem);
    } else {
      remainingPendingAmount = rawMemberRem;
      overpaidAmount = Math.max(0, Number(member.overpaid_balance || 0));
    }
  }

  let status: PaymentStatus = 'Paid';
  if (memberPayments.length === 0) {
    status = remainingPendingAmount > 0 ? 'Pending' : 'Unpaid';
  } else if (latestPayment?.payment_status) {
    status = latestPayment.payment_status as PaymentStatus;
  } else if (overpaidAmount > 0) {
    status = 'Overpaid';
  } else if (remainingPendingAmount > 0) {
    status = 'Partial';
  } else {
    status = 'Paid';
  }

  return {
    memberPayments,
    totalPaymentsCount: memberPayments.length,
    totalAmountPaid,
    totalDiscount,
    latestPayment,
    remainingPendingAmount,
    overpaidAmount,
    status,
  };
}

/**
 * 6 Mandatory Test Cases specified by the user
 * Verifies 100% compliance with business accounting rules
 */
export function runPaymentCalculationTests(): { name: string; passed: boolean; details: any }[] {
  const tests = [
    {
      name: 'Case 1: Exact Payment (Plan 8999, Disc 0, Prev 0, Pay 8999 -> Pending 0, Overpaid 0, Paid)',
      input: { originalPlanAmount: 8999, discount: 0, previousPendingBalance: 0, currentPayment: 8999 },
      expected: { finalPayableAmount: 8999, totalOutstandingAmount: 8999, currentPayment: 8999, remainingPendingAmount: 0, overpaidAmount: 0, status: 'Paid' },
    },
    {
      name: 'Case 2: Partial Payment (Plan 8999, Disc 0, Prev 0, Pay 5000 -> Pending 3999, Overpaid 0, Partial)',
      input: { originalPlanAmount: 8999, discount: 0, previousPendingBalance: 0, currentPayment: 5000 },
      expected: { finalPayableAmount: 8999, totalOutstandingAmount: 8999, currentPayment: 5000, remainingPendingAmount: 3999, overpaidAmount: 0, status: 'Partial' },
    },
    {
      name: 'Case 3: Overpayment [Critical Bug] (Plan 8999, Disc 0, Prev 0, Pay 9004 -> Pending 0, Overpaid 5, Overpaid)',
      input: { originalPlanAmount: 8999, discount: 0, previousPendingBalance: 0, currentPayment: 9004 },
      expected: { finalPayableAmount: 8999, totalOutstandingAmount: 8999, currentPayment: 9004, remainingPendingAmount: 0, overpaidAmount: 5, status: 'Overpaid' },
    },
    {
      name: 'Case 4: Discount Applied (Plan 8999, Disc 500, Prev 0, Pay 8499 -> Pending 0, Overpaid 0, Paid)',
      input: { originalPlanAmount: 8999, discount: 500, previousPendingBalance: 0, currentPayment: 8499 },
      expected: { finalPayableAmount: 8499, totalOutstandingAmount: 8499, currentPayment: 8499, remainingPendingAmount: 0, overpaidAmount: 0, status: 'Paid' },
    },
    {
      name: 'Case 5: Previous Pending Balance Exists (Plan 8999, Disc 0, Prev 1000, Pay 5000 -> Pending 4999, Overpaid 0, Partial)',
      input: { originalPlanAmount: 8999, discount: 0, previousPendingBalance: 1000, currentPayment: 5000 },
      expected: { finalPayableAmount: 8999, totalOutstandingAmount: 9999, currentPayment: 5000, remainingPendingAmount: 4999, overpaidAmount: 0, status: 'Partial' },
    },
    {
      name: 'Case 6: Previous Pending + Overpayment (Plan 8999, Disc 0, Prev 1000, Pay 10000 -> Pending 0, Overpaid 1, Overpaid)',
      input: { originalPlanAmount: 8999, discount: 0, previousPendingBalance: 1000, currentPayment: 10000 },
      expected: { finalPayableAmount: 8999, totalOutstandingAmount: 9999, currentPayment: 10000, remainingPendingAmount: 0, overpaidAmount: 1, status: 'Overpaid' },
    },
  ];

  return tests.map((t) => {
    const result = calculatePaymentBreakdown(t.input);
    const passed =
      result.finalPayableAmount === t.expected.finalPayableAmount &&
      result.totalOutstandingAmount === t.expected.totalOutstandingAmount &&
      result.currentPayment === t.expected.currentPayment &&
      result.remainingPendingAmount === t.expected.remainingPendingAmount &&
      result.overpaidAmount === t.expected.overpaidAmount &&
      result.status === t.expected.status;

    return {
      name: t.name,
      passed,
      details: { input: t.input, expected: t.expected, result },
    };
  });
}

// Automatically run verification on module initialization
const testResults = runPaymentCalculationTests();
const allPassed = testResults.every((t) => t.passed);
if (allPassed) {
  console.info('✅ [PaymentCalculations] All 6 mandatory payment calculation test cases verified successfully.');
} else {
  console.error('❌ [PaymentCalculations] Test cases failed:', testResults.filter((t) => !t.passed));
}
