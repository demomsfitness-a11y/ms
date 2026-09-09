import React, { useState } from 'react';
import { Member, MembershipPlan } from '../types';
import {
  ClockAlert,
  Calendar,
  CreditCard,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  MessageCircle,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Send
} from 'lucide-react';
import {
  getExpiringMembersWithin15Days,
  openWhatsAppReminder,
  formatIndianMobileForWhatsApp,
  calculateDaysRemaining
} from '../lib/whatsappReminder';

interface Props {
  members: Member[];
  plans: MembershipPlan[];
  onRenewMember: (member: Member) => void;
}

type ExpiryCategory = '15days' | 'all' | 'expired' | '7days' | '30days' | 'active';

export const ExpiryView: React.FC<Props> = ({ members, plans, onRenewMember }) => {
  const [selectedCategory, setSelectedCategory] = useState<ExpiryCategory>('15days');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastMessagedMemberId, setLastMessagedMemberId] = useState<string | null>(null);

  // 1. Members strictly expiring within the next 15 days (0 <= daysRemaining <= 15)
  // Sorted by nearest expiry date first
  const expiringWithin15Days = getExpiringMembersWithin15Days(members, plans);

  // Breakdown for status indicators
  const urgentCount = expiringWithin15Days.filter((m) => m.daysRemaining >= 3 && m.daysRemaining <= 7).length;
  const verySoonCount = expiringWithin15Days.filter((m) => m.daysRemaining >= 0 && m.daysRemaining <= 2).length;
  const soonCount = expiringWithin15Days.filter((m) => m.daysRemaining >= 8 && m.daysRemaining <= 15).length;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // 2. Compute full list for all filter categories
  const planMap = new Map(plans.map((p) => [p.id, p.name]));
  const allMembersWithExpiry = members.map((m) => {
    const expDate = new Date(m.membership_expiry);
    expDate.setHours(0, 0, 0, 0);

    const diffDays = calculateDaysRemaining(m.membership_expiry);

    let category: 'expired' | '15days' | '7days' | '30days' | 'active';
    let statusLabel = 'Active';
    let badgeColor = 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40';

    if (diffDays < 0) {
      category = 'expired';
      statusLabel = `Expired (${Math.abs(diffDays)}d ago)`;
      badgeColor = 'bg-red-950/60 text-red-400 border-red-800/40';
    } else if (diffDays <= 2) {
      category = '7days';
      statusLabel = 'Expires Very Soon';
      badgeColor = 'bg-rose-950/70 text-rose-400 border-rose-800/60';
    } else if (diffDays <= 7) {
      category = '7days';
      statusLabel = 'Urgent';
      badgeColor = 'bg-orange-950/70 text-orange-400 border-orange-800/60';
    } else if (diffDays <= 15) {
      category = '15days';
      statusLabel = 'Expiring Soon';
      badgeColor = 'bg-amber-950/70 text-amber-400 border-amber-800/60';
    } else if (diffDays <= 30) {
      category = '30days';
      statusLabel = `In ${diffDays} days`;
      badgeColor = 'bg-yellow-950/50 text-yellow-400 border-yellow-800/40';
    } else {
      category = 'active';
      statusLabel = `${diffDays} days left`;
      badgeColor = 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40';
    }

    return {
      ...m,
      diffDays,
      category,
      statusLabel,
      badgeColor,
      planName: planMap.get(m.plan_id) || 'Gym Membership',
      formattedExpiryDate: new Date(m.membership_expiry).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      formattedWhatsAppMobile: formatIndianMobileForWhatsApp(m.mobile),
    };
  });

  // Overall counts
  const counts = {
    expiring15: expiringWithin15Days.length,
    expired: allMembersWithExpiry.filter((m) => m.diffDays < 0).length,
    sevenDays: allMembersWithExpiry.filter((m) => m.diffDays >= 0 && m.diffDays <= 7).length,
    thirtyDays: allMembersWithExpiry.filter((m) => m.diffDays >= 0 && m.diffDays <= 30).length,
    active: allMembersWithExpiry.filter((m) => m.diffDays > 30).length,
    total: allMembersWithExpiry.length,
  };

  const handleSendWhatsApp = (member: Member, daysRemaining: number) => {
    setLastMessagedMemberId(member.id);
    openWhatsAppReminder(member, daysRemaining);
  };

  // Filter based on active tab & search
  const filteredList = (selectedCategory === '15days' ? expiringWithin15Days : allMembersWithExpiry).filter((m) => {
    if (selectedCategory === 'expired' && m.diffDays >= 0) return false;
    if (selectedCategory === '7days' && (m.diffDays < 0 || m.diffDays > 7)) return false;
    if (selectedCategory === '30days' && (m.diffDays < 0 || m.diffDays > 30)) return false;
    if (selectedCategory === 'active' && m.diffDays <= 30) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.member_id.toLowerCase().includes(q) ||
        m.mobile.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wider mb-1">
            <ClockAlert className="w-4 h-4" /> Renewal Management & WhatsApp Alerts
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white font-display">
            MEMBERSHIP EXPIRY & RENEWALS
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-xl">
            Identify members whose plans expire in the next 15 days, send pre-filled WhatsApp reminders with +91 country formatting, and collect renewal fees instantly.
          </p>
        </div>

        {/* Highlight badge */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 flex items-center gap-4 self-start md:self-auto">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Expiring within 15 days</span>
            <span className="text-xl font-black text-amber-400 font-display">
              {expiringWithin15Days.length} Members
            </span>
          </div>
        </div>
      </div>

      {/* DEDICATED SECTION: Membership Expiring Soon */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl shadow-black/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="text-xl md:text-2xl font-bold text-white font-display">
                MEMBERSHIP EXPIRING SOON
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Active memberships expiring between today and the next 15 days (Expiry Date ≥ Today & ≤ Today + 15 days). Sorted by nearest expiry date first.
            </p>
          </div>

          {/* Quick status breakdown badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>0-2 Days (Expires Very Soon): <strong>{verySoonCount}</strong></span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-orange-950/60 border border-orange-800/60 text-orange-300 text-xs flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span>3-7 Days (Urgent): <strong>{urgentCount}</strong></span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-300 text-xs flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>8-15 Days (Expiring Soon): <strong>{soonCount}</strong></span>
            </div>
          </div>
        </div>

        {/* View Selection Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCategory('15days')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedCategory === '15days'
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-neutral-800 text-neutral-300 hover:text-white'
              }`}
            >
              <ClockAlert className="w-3.5 h-3.5" />
              <span>Expiring Soon (15 Days)</span>
              <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-[10px] font-black ml-1">
                {counts.expiring15}
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('7days')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === '7days'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                  : 'bg-neutral-800 text-neutral-300 hover:text-white'
              }`}
            >
              Within 7 Days ({counts.sevenDays})
            </button>

            <button
              onClick={() => setSelectedCategory('expired')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === 'expired'
                  ? 'bg-red-950 text-red-300 border border-red-800'
                  : 'bg-neutral-800 text-neutral-300 hover:text-white'
              }`}
            >
              Already Expired ({counts.expired})
            </button>

            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === 'all'
                  ? 'bg-neutral-200 text-black'
                  : 'bg-neutral-800 text-neutral-300 hover:text-white'
              }`}
            >
              All Members ({counts.total})
            </button>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member, ID, phone..."
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 outline-none"
            />
          </div>
        </div>

        {/* Expiring Members Table */}
        <div className="overflow-x-auto">
          {filteredList.length === 0 ? (
            <div className="text-center py-16 bg-neutral-950/60 rounded-2xl border border-neutral-800/80 p-8 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Members In This Expiry Window</h4>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                {selectedCategory === '15days'
                  ? 'There are currently no gym members expiring within the next 15 days. All active members are in good standing!'
                  : 'No member records matched the selected filter or search query.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/90 border-b border-neutral-800 text-neutral-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Member ID</th>
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-4">Mobile Number</th>
                  <th className="py-3.5 px-4">Membership Plan</th>
                  <th className="py-3.5 px-4">Expiry Date</th>
                  <th className="py-3.5 px-4">Days Remaining</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80 text-neutral-200">
                {filteredList.map((m: any) => {
                  const days = m.daysRemaining !== undefined ? m.daysRemaining : m.diffDays;
                  const isExpiring15 = days >= 0 && days <= 15;

                  // Compute status indicator
                  let statusTag = 'Expiring Soon';
                  let tagClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';

                  if (days < 0) {
                    statusTag = 'Expired';
                    tagClass = 'bg-red-500/15 text-red-400 border-red-500/30';
                  } else if (days <= 2) {
                    statusTag = 'Expires Very Soon';
                    tagClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold';
                  } else if (days <= 7) {
                    statusTag = 'Urgent';
                    tagClass = 'bg-orange-500/15 text-orange-400 border-orange-500/30 font-bold';
                  } else if (days <= 15) {
                    statusTag = 'Expiring Soon';
                    tagClass = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
                  } else {
                    statusTag = 'Active';
                    tagClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                  }

                  const formattedExp = m.formattedExpiryDate || new Date(m.membership_expiry).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <tr key={m.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-red-400 bg-red-950/50 border border-red-800/40 px-2 py-0.5 rounded">
                          {m.member_id}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {m.name}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-300 font-mono">
                        {m.mobile ? (
                          <span className="flex items-center gap-1">
                            <span className="text-neutral-500">+91</span>
                            <span>{m.mobile.replace(/^\+?91/, '')}</span>
                          </span>
                        ) : (
                          <span className="text-neutral-500 italic">No mobile</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-neutral-200">
                        {m.planName || m.plan_name || 'Gym Membership'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-neutral-200">
                        {formattedExp}
                      </td>
                      <td className="py-3.5 px-4 font-bold">
                        {days < 0 ? (
                          <span className="text-red-400 font-mono">{Math.abs(days)} days ago</span>
                        ) : days === 0 ? (
                          <span className="text-rose-400 font-mono">Expires Today!</span>
                        ) : (
                          <span className={`font-mono ${days <= 2 ? 'text-rose-400' : days <= 7 ? 'text-orange-400' : 'text-amber-400'}`}>
                            {days} {days === 1 ? 'day' : 'days'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${tagClass}`}>
                          {statusTag}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Dedicated WhatsApp Reminder Button */}
                          <button
                            onClick={() => handleSendWhatsApp(m, days)}
                            title={`Send pre-filled WhatsApp reminder to ${m.name}`}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-white" />
                            <span>Send WhatsApp</span>
                          </button>

                          {/* Instant Fee Renewal Button */}
                          <button
                            onClick={() => onRenewMember(m)}
                            title="Open fee collection modal"
                            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-neutral-700"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-red-500" />
                            <span>Renew</span>
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
