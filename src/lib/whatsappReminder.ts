import { Member, MembershipPlan } from '../types';

export interface ExpiringMemberItem extends Member {
  daysRemaining: number;
  statusCategory: 'expiring_soon' | 'urgent' | 'expires_very_soon';
  statusLabel: string;
  badgeClass: string;
  planName: string;
  formattedExpiryDate: string;
  formattedWhatsAppMobile: string;
}

/**
 * Properly formats an Indian mobile number with the +91 country code for WhatsApp wa.me links.
 * Handles:
 * - 10-digit mobile numbers: "9876543210" -> "919876543210"
 * - Leading 0: "09876543210" -> "919876543210"
 * - Existing +91: "+91 98765 43210" -> "919876543210"
 * - Cleaned digits only
 */
export function formatIndianMobileForWhatsApp(mobile: string | undefined): string {
  if (!mobile) return '';
  let digits = mobile.replace(/\D/g, '');

  // If 11 digits starting with 0, remove 0
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // If 10 digits, add country code 91
  if (digits.length === 10) {
    digits = '91' + digits;
  }

  return digits;
}

/**
 * Calculates days remaining from today (00:00:00) to expiry date.
 */
export function calculateDaysRemaining(expiryDateStr: string | undefined): number {
  if (!expiryDateStr) return -999;
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const expDate = new Date(expiryDateStr);
  expDate.setHours(0, 0, 0, 0);

  const diffMs = expDate.getTime() - now.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Filter members whose membership expires within the next 15 days:
 * Expiry Date >= Today AND Expiry Date <= Today + 15 days (0 <= daysRemaining <= 15)
 * Sorted by nearest expiry date first (ascending days remaining).
 */
export function getExpiringMembersWithin15Days(
  members: Member[],
  plans: MembershipPlan[] = []
): ExpiringMemberItem[] {
  const planMap = new Map(plans.map((p) => [p.id, p.name]));

  const result: ExpiringMemberItem[] = [];

  for (const m of members) {
    // Only active memberships (or not marked deleted/inactive)
    if (m.status === 'inactive') continue;

    const daysRemaining = calculateDaysRemaining(m.membership_expiry);

    // Rule: Expiry Date >= Today AND Expiry Date <= Today + 15 days
    if (daysRemaining >= 0 && daysRemaining <= 15) {
      let statusCategory: 'expiring_soon' | 'urgent' | 'expires_very_soon';
      let statusLabel = '';
      let badgeClass = '';

      if (daysRemaining >= 8 && daysRemaining <= 15) {
        statusCategory = 'expiring_soon';
        statusLabel = 'Expiring Soon';
        badgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      } else if (daysRemaining >= 3 && daysRemaining <= 7) {
        statusCategory = 'urgent';
        statusLabel = 'Urgent';
        badgeClass = 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      } else {
        // 2 to 0 days remaining
        statusCategory = 'expires_very_soon';
        statusLabel = 'Expires Very Soon';
        badgeClass = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      }

      const formattedExpiryDate = new Date(m.membership_expiry).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      result.push({
        ...m,
        daysRemaining,
        statusCategory,
        statusLabel,
        badgeClass,
        planName: planMap.get(m.plan_id) || 'Gym Membership',
        formattedExpiryDate,
        formattedWhatsAppMobile: formatIndianMobileForWhatsApp(m.mobile),
      });
    }
  }

  // Sort by nearest expiry date first (0, 1, 2, ... 15)
  return result.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Calculates counts for Dashboard Expiry summary:
 * - Expiring in 15 Days: count
 * - Expiring in 7 Days: count
 * - Expiring in 3 Days: count
 */
export function getDashboardExpiryCounts(members: Member[]): {
  expiringIn15Days: number;
  expiringIn7Days: number;
  expiringIn3Days: number;
} {
  let count15 = 0;
  let count7 = 0;
  let count3 = 0;

  for (const m of members) {
    if (m.status === 'inactive') continue;
    const days = calculateDaysRemaining(m.membership_expiry);
    if (days >= 0 && days <= 15) {
      count15++;
      if (days <= 7) {
        count7++;
        if (days <= 3) {
          count3++;
        }
      }
    }
  }

  return {
    expiringIn15Days: count15,
    expiringIn7Days: count7,
    expiringIn3Days: count3,
  };
}

/**
 * Constructs the personalized WhatsApp reminder message as specified in requirements:
 *
 * Hello [Customer Name] 👋
 *
 * Your MS Fitness membership is expiring on [Expiry Date].
 *
 * You have [Days Remaining] days remaining on your current membership.
 *
 * To continue your fitness journey without interruption, please renew your membership.
 *
 * Thank you for choosing MS Fitness 💪
 *
 * Stronger Body, Stronger You
 */
export function buildWhatsAppExpiryMessage(
  customerName: string,
  formattedExpiryDate: string,
  daysRemaining: number
): string {
  const daysText = daysRemaining === 1 ? '1 day' : `${daysRemaining} days`;

  return (
    `Hello ${customerName} 👋\n\n` +
    `Your MS Fitness membership is expiring on *${formattedExpiryDate}*.\n\n` +
    `You have *${daysText}* remaining on your current membership.\n\n` +
    `To continue your fitness journey without interruption, please renew your membership.\n\n` +
    `Thank you for choosing *MS Fitness* 💪\n\n` +
    `*Stronger Body, Stronger You*`
  );
}

/**
 * Opens WhatsApp in a new tab with the prefilled message for the customer's mobile number.
 */
export function openWhatsAppReminder(member: Member, daysRemaining: number): boolean {
  const phone = formatIndianMobileForWhatsApp(member.mobile);
  if (!phone) {
    alert('Member does not have a valid mobile number on file.');
    return false;
  }

  const formattedExpiry = new Date(member.membership_expiry).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const message = buildWhatsAppExpiryMessage(member.name, formattedExpiry, daysRemaining);
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  return true;
}
