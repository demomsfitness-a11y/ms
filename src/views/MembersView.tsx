import React, { useState } from 'react';
import { Member, MembershipPlan, Payment, AdminAccount } from '../types';
import { hasPermission } from '../lib/permissions';
import {
  Search,
  Plus,
  Filter,
  User,
  Phone,
  Calendar,
  CreditCard,
  Edit2,
  Trash2,
  Eye,
  X,
  AlertTriangle,
  Receipt,
  Clock,
  Sparkles,
  Lock
} from 'lucide-react';

interface Props {
  members: Member[];
  plans: MembershipPlan[];
  payments: Payment[];
  adminEmail: string;
  currentAdmin?: AdminAccount;
  onAddMember: (memberData: Omit<Member, 'id'>) => Promise<void>;
  onUpdateMember: (id: string, updates: Partial<Member>) => Promise<void>;
  onDeleteMember: (id: string, name: string, code: string) => Promise<void>;
  onOpenPaymentForMember: (member: Member) => void;
  onViewReceipt: (payment: Payment) => void;
  initialOpenAdd?: boolean;
  initialMemberData?: Partial<Member> | null;
  onClearInitialMemberData?: () => void;
  onOpenMemberProfile?: (member: Member) => void;
}

export const MembersView: React.FC<Props> = ({
  members,
  plans,
  payments,
  adminEmail,
  currentAdmin,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onOpenPaymentForMember,
  onViewReceipt,
  initialOpenAdd = false,
  initialMemberData,
  onClearInitialMemberData,
  onOpenMemberProfile,
}) => {
  const canCreate = !currentAdmin || hasPermission(currentAdmin, 'members.create');
  const canEdit = !currentAdmin || hasPermission(currentAdmin, 'members.edit');
  const canDelete = !currentAdmin || hasPermission(currentAdmin, 'members.delete');
  const canRecordPayment = !currentAdmin || hasPermission(currentAdmin, 'payments.create');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(initialOpenAdd);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);

  // Form State for Add / Edit
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [address, setAddress] = useState('');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planAmount, setPlanAmount] = useState(999);
  const [discount, setDiscount] = useState(0);
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');
  const [membershipStart, setMembershipStart] = useState(new Date().toISOString().slice(0, 10));
  const [membershipExpiry, setMembershipExpiry] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setMobile('');
    setEmail('');
    setDob('');
    setGender('male');
    setAddress('');
    setJoinDate(new Date().toISOString().slice(0, 10));
    const firstPlan = plans[0];
    if (firstPlan) {
      setSelectedPlanId(firstPlan.id);
      setPlanAmount(firstPlan.price);
      calculateExpiry(new Date().toISOString().slice(0, 10), firstPlan.duration_months);
    }
    setDiscount(0);
    setEmergencyContact('');
    setNotes('');
    setMembershipStart(new Date().toISOString().slice(0, 10));
    setFormError(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (m: Member) => {
    setEditingMember(m);
    setName(m.name);
    setMobile(m.mobile);
    setEmail(m.email || '');
    setDob(m.dob || '');
    setGender((m.gender as any) || 'male');
    setAddress(m.address || '');
    setJoinDate(m.join_date);
    setSelectedPlanId(m.plan_id || '');
    setPlanAmount(m.plan_amount);
    setDiscount(m.discount);
    setEmergencyContact(m.emergency_contact || '');
    setNotes(m.notes || '');
    setMembershipStart(m.membership_start);
    setMembershipExpiry(m.membership_expiry);
    setFormError(null);
  };

  React.useEffect(() => {
    if (initialOpenAdd) {
      openAddModal();
    }
  }, [initialOpenAdd]);

  React.useEffect(() => {
    if (initialMemberData) {
      resetForm();
      if (initialMemberData.name) setName(initialMemberData.name);
      if (initialMemberData.mobile) setMobile(initialMemberData.mobile);
      if (initialMemberData.email) setEmail(initialMemberData.email);
      if (initialMemberData.notes) setNotes(initialMemberData.notes);
      if (initialMemberData.join_date) {
        setJoinDate(initialMemberData.join_date);
        setMembershipStart(initialMemberData.join_date);
      }
      setIsAddModalOpen(true);
      if (onClearInitialMemberData) onClearInitialMemberData();
    }
  }, [initialMemberData, onClearInitialMemberData]);

  const calculateExpiry = (startDate: string, durationMonths: number) => {
    if (!startDate) return;
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + durationMonths);
    setMembershipExpiry(d.toISOString().slice(0, 10));
  };

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setPlanAmount(plan.price);
      calculateExpiry(membershipStart, plan.duration_months);
    }
  };

  const handleStartDateChange = (startDate: string) => {
    setMembershipStart(startDate);
    const plan = plans.find((p) => p.id === selectedPlanId);
    if (plan) {
      calculateExpiry(startDate, plan.duration_months);
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Member name is required.');
      return;
    }
    if (!mobile.trim() || mobile.trim().length < 8) {
      setFormError('A valid mobile number is required.');
      return;
    }
    if (!membershipExpiry) {
      setFormError('Membership expiry date is required.');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date();
      const expDate = new Date(membershipExpiry);
      const isExpired = expDate.getTime() < now.getTime();

      const memberPayload: Omit<Member, 'id'> = {
        member_id: editingMember ? editingMember.member_id : '',
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        dob: dob || undefined,
        gender,
        address: address.trim(),
        join_date: joinDate,
        plan_id: selectedPlanId,
        plan_amount: Number(planAmount),
        discount: Number(discount),
        emergency_contact: emergencyContact.trim(),
        notes: notes.trim(),
        membership_start: membershipStart,
        membership_expiry: membershipExpiry,
        status: isExpired ? 'expired' : 'active',
      };

      if (editingMember) {
        await onUpdateMember(editingMember.id, memberPayload);
        setEditingMember(null);
        setSuccessMessage(`Member "${memberPayload.name}" updated successfully in Supabase!`);
      } else {
        await onAddMember(memberPayload);
        setIsAddModalOpen(false);
        setSuccessMessage(`Member "${memberPayload.name}" saved to Supabase successfully!`);
      }
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Supabase member save error:', err);
      setFormError(err.message || 'Failed to save member to Supabase');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMember) return;
    setSubmitting(true);
    try {
      await onDeleteMember(deletingMember.id, deletingMember.name, deletingMember.member_id);
      setDeletingMember(null);
    } catch (err: any) {
      alert(`Error deleting member: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.member_id.toLowerCase().includes(q) ||
      m.mobile.includes(q) ||
      (m.email && m.email.toLowerCase().includes(q));

    if (!matchesQuery) return false;

    if (statusFilter === 'active') return m.status === 'active';
    if (statusFilter === 'expired') return m.status === 'expired';
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-sm flex items-center justify-between shadow-lg shadow-emerald-950/30 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 font-bold">
              ✓
            </div>
            <div>
              <p className="font-semibold text-white">{successMessage}</p>
              <p className="text-xs text-emerald-400/80">Data synchronized with Supabase database.</p>
            </div>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400 hover:text-white text-xs px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search & Actions Bar */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Member ID, Name, or Mobile..."
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-2xl pl-10 pr-4 py-2.5 text-xs md:text-sm text-white placeholder-neutral-500 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter & Add Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-2xl p-1 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                statusFilter === 'all' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              All ({members.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                statusFilter === 'active' ? 'bg-emerald-600 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('expired')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                statusFilter === 'expired' ? 'bg-red-600 text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Expired
            </button>
          </div>

          {canCreate ? (
            <button
              onClick={openAddModal}
              className="px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-red-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          ) : (
            <div
              title="You do not have permission to add new members (members.create)"
              className="px-4 py-2.5 rounded-2xl bg-neutral-800 text-neutral-500 text-xs font-semibold flex items-center gap-2 cursor-not-allowed border border-neutral-700/50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </div>
          )}
        </div>
      </div>

      {/* Members Directory Table */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-16 text-neutral-500 space-y-3">
            <User className="w-12 h-12 mx-auto text-neutral-700" />
            <p className="text-sm font-medium">No members found matching your search</p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Register Member
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-4 px-5">Member ID</th>
                  <th className="py-4 px-5">Member Name</th>
                  <th className="py-4 px-5">Contact</th>
                  <th className="py-4 px-5">Membership Plan</th>
                  <th className="py-4 px-5">Expiry Date</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80 text-neutral-200">
                {filteredMembers.map((member) => {
                  const plan = plans.find((p) => p.id === member.plan_id);
                  const isExp = new Date(member.membership_expiry).getTime() < Date.now();

                  return (
                    <tr key={member.id} className="hover:bg-neutral-800/40 transition-colors">
                      {/* Member ID */}
                      <td className="py-4 px-5">
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenMemberProfile) {
                              onOpenMemberProfile(member);
                            } else {
                              setViewingMember(member);
                            }
                          }}
                          className="font-mono font-bold text-red-400 hover:text-red-300 hover:underline bg-red-950/50 hover:bg-red-900/60 border border-red-800/40 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="Click to open complete member profile & payment history"
                        >
                          <span>{member.member_id}</span>
                        </button>
                      </td>

                      {/* Name */}
                      <td className="py-4 px-5">
                        <div className="font-semibold text-white text-sm">{member.name}</div>
                        <div className="text-[11px] text-neutral-400 capitalize">
                          {member.gender || 'Not specified'} • Joined {new Date(member.join_date).toLocaleDateString('en-IN')}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-4 px-5">
                        <div className="font-medium text-neutral-300">{member.mobile}</div>
                        {member.email && <div className="text-[11px] text-neutral-500">{member.email}</div>}
                      </td>

                      {/* Plan */}
                      <td className="py-4 px-5">
                        <div className="font-medium text-white">{plan?.name || 'Custom Plan'}</div>
                        <div className="text-[11px] text-neutral-400">
                          ₹{Number(member.plan_amount).toLocaleString('en-IN')}
                        </div>
                      </td>

                      {/* Expiry */}
                      <td className="py-4 px-5">
                        <div className={`font-semibold ${isExp ? 'text-red-400' : 'text-neutral-200'}`}>
                          {new Date(member.membership_expiry).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          member.status === 'active' && !isExp
                            ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/50'
                            : 'bg-red-950/70 text-red-400 border border-red-800/50'
                        }`}>
                          {isExp ? 'Expired' : 'Active'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canRecordPayment && (
                            <button
                              onClick={() => onOpenPaymentForMember(member)}
                              title="Collect Fee / Record Payment"
                              className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/60 transition-colors"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setViewingMember(member)}
                            title="View Full Profile"
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(member)}
                              title="Edit Member"
                              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeletingMember(member)}
                              title="Delete Member"
                              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-950 text-neutral-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT MEMBER */}
      {(isAddModalOpen || editingMember) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-wide">
                    {editingMember ? 'Edit Member Details' : 'Register New Member'}
                  </h2>
                  <p className="text-xs text-neutral-400">
                    {editingMember
                      ? `Editing ${editingMember.member_id}`
                      : 'Member ID will be sequentially auto-generated (e.g. MS-0001)'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingMember(null);
                }}
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 text-red-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Personal details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul@example.com"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-red-500 outline-none"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Relation & Phone"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-red-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, City, Postal Code"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-red-500 outline-none"
                />
              </div>

              {/* Membership Plan & Calculation Box */}
              <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-4">
                <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" /> Membership Plan & Duration
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Select Plan
                    </label>
                    <select
                      value={selectedPlanId}
                      onChange={(e) => handlePlanChange(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-sm text-white focus:border-red-500 outline-none"
                    >
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.duration_months} Mo) - ₹{p.price}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Plan Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={planAmount}
                      onChange={(e) => setPlanAmount(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-sm text-white focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Special Discount (₹)
                    </label>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-sm text-white focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Membership Start Date
                    </label>
                    <input
                      type="date"
                      value={membershipStart}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-sm text-white focus:border-red-500 outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-emerald-400 mb-1">
                      Calculated Membership Expiry Date (Auto calculated)
                    </label>
                    <input
                      type="date"
                      required
                      value={membershipExpiry}
                      onChange={(e) => setMembershipExpiry(e.target.value)}
                      className="w-full bg-emerald-950/30 border border-emerald-800/60 rounded-xl px-3.5 py-2 text-sm text-emerald-300 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Admin Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Medical conditions, fitness goals, locker assignments..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-red-500 outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingMember(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingMember ? 'Update Member' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW MEMBER FULL PROFILE & PAYMENT HISTORY */}
      {viewingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/70">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 font-bold text-lg">
                  {viewingMember.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-white font-display leading-none">
                      {viewingMember.name}
                    </h2>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-red-950/60 border border-red-800/40 text-red-400 font-bold">
                      {viewingMember.member_id}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Joined {new Date(viewingMember.join_date).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingMember(null)}
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Member Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-neutral-950/80 p-4 rounded-2xl border border-neutral-800/80">
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Mobile</span>
                  <span className="font-bold text-white">{viewingMember.mobile}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Email</span>
                  <span className="font-bold text-white truncate block">{viewingMember.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Gender</span>
                  <span className="font-bold text-white capitalize">{viewingMember.gender || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Address</span>
                  <span className="font-bold text-white">{viewingMember.address || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Membership Expiry</span>
                  <span className="font-bold text-red-400">{new Date(viewingMember.membership_expiry).toLocaleDateString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-semibold">Emergency</span>
                  <span className="font-bold text-white">{viewingMember.emergency_contact || 'N/A'}</span>
                </div>
              </div>

              {/* Payment History for this Member */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-red-500" /> Payment & Receipt History
                  </h3>
                  <button
                    onClick={() => {
                      const m = viewingMember;
                      setViewingMember(null);
                      onOpenPaymentForMember(m);
                    }}
                    className="text-xs px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Collect Fee
                  </button>
                </div>

                {payments.filter((p) => p.member_id === viewingMember.id).length === 0 ? (
                  <div className="text-center py-6 text-neutral-500 text-xs bg-neutral-950/40 rounded-xl border border-neutral-800">
                    No payment records yet for this member.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {payments
                      .filter((p) => p.member_id === viewingMember.id)
                      .map((pay) => (
                        <div
                          key={pay.id}
                          className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">₹{Number(pay.amount).toLocaleString('en-IN')}</span>
                              <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-300">
                                {pay.payment_method}
                              </span>
                              <span className="font-mono text-neutral-400 text-[11px]">{pay.receipt_number || pay.payment_id}</span>
                            </div>
                            <p className="text-[11px] text-neutral-500 mt-0.5">
                              {new Date(pay.payment_date).toLocaleDateString('en-IN')} • Due: ₹{Number(pay.remaining_balance).toLocaleString('en-IN')}
                            </p>
                          </div>
                          <button
                            onClick={() => onViewReceipt(pay)}
                            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> View Receipt
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">Delete Member Record?</h3>
              <p className="text-xs text-neutral-400">
                Are you sure you want to delete <strong>{deletingMember.name}</strong> ({deletingMember.member_id})? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition-colors shadow-lg shadow-red-600/20"
              >
                {submitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
