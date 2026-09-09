import { Member, MembershipPlan, Payment } from '../types';

/**
 * Extracts a UPI transaction or reference number from notes if present.
 * Supports patterns like:
 * - "UPI Txn: 1234567890"
 * - "UPI Ref: 1234567890"
 * - "UPI: 1234567890"
 * - "Txn: 1234567890"
 */
export function extractUpiTransactionNumber(notes?: string): string | undefined {
  if (!notes) return undefined;
  const match = notes.match(/(?:UPI\s*(?:Txn|Ref|Transaction)?(?:\s*(?:No|Number|#))?|Txn\s*(?:No|Number|#)?)\s*[:=-]\s*([A-Za-z0-9_-]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return undefined;
}

/**
 * Resolves the actual membership plan name for a member / payment record.
 * 
 * Rules:
 * 1. Matches member.plan_id with existing plans in `membership_plans`
 * 2. Matches encoded [PLAN_ID:...] or [PLAN:...] in member notes
 * 3. Uses payment.plan_name if it is a genuine plan name (not generic 'Membership Fee', 'Custom', etc.)
 * 4. Matches member.plan_amount against plans table pricing
 * 5. Matches membership duration (months between start date and expiry date) against plan duration_months
 * 6. Returns 'Custom' ONLY if the member genuinely has a custom plan that doesn't match any existing plan.
 */
export function resolveMemberPlanName(
  member?: Partial<Member> | null,
  plans?: MembershipPlan[] | null,
  payment?: Partial<Payment> | null
): string {
  const planList = plans || [];

  // 1. Direct plan_id match
  if (member?.plan_id && planList.length > 0) {
    const byId = planList.find((p) => p.id === member.plan_id);
    if (byId) return byId.name;
  }

  // 2. Encoded notes match in member profile
  if (member?.notes) {
    const idMatch = member.notes.match(/\[PLAN_ID:([a-zA-Z0-9_-]+)\]/);
    if (idMatch && planList.length > 0) {
      const byId = planList.find((p) => p.id === idMatch[1]);
      if (byId) return byId.name;
    }
    const nameMatch = member.notes.match(/\[PLAN:([^\]]+)\]/);
    if (nameMatch) {
      const matchedName = nameMatch[1].trim();
      const byName = planList.find((p) => p.name.toLowerCase() === matchedName.toLowerCase());
      if (byName) return byName.name;
      return matchedName;
    }
  }

  // 3. Payment plan_name if valid and not a generic placeholder
  if (payment?.plan_name) {
    const genericPlaceholders = ['membership fee', 'custom', 'gym membership', 'n/a', ''];
    const pName = payment.plan_name.trim();
    if (!genericPlaceholders.includes(pName.toLowerCase())) {
      const byPlanName = planList.find((p) => p.name.toLowerCase() === pName.toLowerCase());
      if (byPlanName) return byPlanName.name;
      return pName;
    }
  }

  // 4. Match by plan_amount to existing plan prices
  const amount = Number(member?.plan_amount);
  if (amount > 0 && planList.length > 0) {
    const byPrice = planList.find((p) => Math.abs(Number(p.price) - amount) < 1);
    if (byPrice) return byPrice.name;
  }

  // 5. Match by duration (months between start and expiry)
  if (member?.membership_start && member?.membership_expiry && planList.length > 0) {
    const start = new Date(member.membership_start);
    const expiry = new Date(member.membership_expiry);
    if (!isNaN(start.getTime()) && !isNaN(expiry.getTime())) {
      const diffMonths = Math.round(
        (expiry.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)
      );
      // Try exact duration match first
      const byExactDuration = planList.find((p) => p.duration_months === diffMonths);
      if (byExactDuration) return byExactDuration.name;

      // Try close duration match (within 1 month tolerance)
      const byCloseDuration = planList.find(
        (p) => Math.abs(p.duration_months - diffMonths) <= 1
      );
      if (byCloseDuration) return byCloseDuration.name;
    }
  }

  // 6. Only return "Custom" when the member genuinely has a custom plan that doesn't match any plan
  return 'Custom';
}
