import React, { useState } from 'react';
import { MembershipPlan, AdminAccount } from '../types';
import { hasPermission } from '../lib/permissions';
import { Layers, Plus, Edit2, Trash2, Check, X, ShieldAlert, Sparkles, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';

interface Props {
  plans: MembershipPlan[];
  onAddPlan: (plan: Omit<MembershipPlan, 'id'>) => Promise<void>;
  onUpdatePlan: (id: string, updates: Partial<MembershipPlan>) => Promise<void>;
  onDeletePlan: (id: string, planName: string) => Promise<void>;
  currentAdmin?: AdminAccount;
}

export const PlansView: React.FC<Props> = ({ plans, onAddPlan, onUpdatePlan, onDeletePlan, currentAdmin }) => {
  const canCreate = !currentAdmin || hasPermission(currentAdmin, 'plans.create');
  const canEdit = !currentAdmin || hasPermission(currentAdmin, 'plans.edit');
  const canDelete = !currentAdmin || hasPermission(currentAdmin, 'plans.delete');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<MembershipPlan | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [durationMonths, setDurationMonths] = useState(1);
  const [price, setPrice] = useState(999);
  const [discount, setDiscount] = useState(0);
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setDurationMonths(1);
    setPrice(999);
    setDiscount(0);
    setDescription('');
    setIsActive(true);
    setFormError(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setDurationMonths(plan.duration_months);
    setPrice(plan.price);
    setDiscount(plan.discount || 0);
    setDescription(plan.description || '');
    setIsActive(plan.is_active);
    setFormError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const payload: Omit<MembershipPlan, 'id'> = {
        name: name.trim(),
        duration_months: Number(durationMonths),
        price: Number(price),
        discount: Number(discount),
        description: description.trim(),
        is_active: isActive,
      };

      if (editingPlan) {
        await onUpdatePlan(editingPlan.id, payload);
        setEditingPlan(null);
        setSuccessMessage(`Plan "${payload.name}" updated successfully in Supabase!`);
      } else {
        await onAddPlan(payload);
        setIsAddModalOpen(false);
        setSuccessMessage(`Plan "${payload.name}" saved to Supabase successfully!`);
      }
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Supabase save plan error:', err);
      setFormError(err.message || 'Failed to save plan to Supabase');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPlan) return;
    setSubmitting(true);
    try {
      await onDeletePlan(deletingPlan.id, deletingPlan.name);
      setDeletingPlan(null);
    } catch (err: any) {
      alert(`Error deleting plan: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

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
              <p className="text-xs text-emerald-400/80">Plan persisted into Supabase membership_plans table.</p>
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

      {/* Header bar */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white font-display">
            GYM MEMBERSHIP TIERS & PACKAGES
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Configure pricing, durations, special benefits, and promotional discounts.
          </p>
        </div>
        {canCreate ? (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-all shadow-lg shadow-red-600/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add New Plan
          </button>
        ) : (
          <div
            title="You do not have permission to add membership plans (plans.create)"
            className="px-4 py-2.5 rounded-2xl bg-neutral-800 text-neutral-500 text-xs font-semibold flex items-center gap-2 cursor-not-allowed border border-neutral-700/50"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Add New Plan</span>
          </div>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isPremium = plan.name.toLowerCase().includes('premium');
          const isStandard = plan.name.toLowerCase().includes('standard');

          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden transition-all ${
                isPremium
                  ? 'bg-gradient-to-b from-neutral-900 via-neutral-900 to-red-950/40 border-2 border-red-600/60 shadow-xl shadow-red-950/20'
                  : 'bg-neutral-900/90 border border-neutral-800'
              }`}
            >
              {isPremium && (
                <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-4 py-1 rounded-bl-2xl shadow-md">
                  BEST VALUE
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isPremium ? 'bg-red-600 text-white' : 'bg-neutral-800 text-neutral-300'
                    }`}>
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white font-display leading-tight">
                        {plan.name}
                      </h3>
                      <span className="text-[11px] text-neutral-400 font-medium">
                        {plan.duration_months} Month{plan.duration_months > 1 ? 's' : ''} Duration
                      </span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    plan.is_active
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="my-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white font-display">
                      ₹{Number(plan.price).toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-neutral-400">
                      / {plan.duration_months === 1 ? 'month' : `${plan.duration_months} months`}
                    </span>
                  </div>
                  {Number(plan.discount) > 0 && (
                    <div className="text-xs text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Special ₹{Number(plan.discount).toLocaleString('en-IN')} discount included
                    </div>
                  )}
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed min-h-[48px]">
                  {plan.description || 'Standard access to training area, locker room, and equipment.'}
                </p>
              </div>

              {/* Bottom Actions */}
              <div className="pt-6 border-t border-neutral-800 flex items-center justify-between mt-6">
                <span className="text-[11px] text-neutral-500 font-mono">
                  ₹{Math.round(plan.price / (plan.duration_months || 1))}/mo
                </span>

                <div className="flex items-center gap-1.5">
                  {canEdit && (
                    <button
                      onClick={() => handleOpenEdit(plan)}
                      title="Edit Plan"
                      className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setDeletingPlan(plan)}
                      title="Delete Plan"
                      className="p-2 rounded-xl bg-neutral-800 hover:bg-red-950 text-neutral-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD / EDIT PLAN MODAL */}
      {(isAddModalOpen || editingPlan) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {editingPlan ? 'Edit Membership Plan' : 'Create Membership Plan'}
                  </h2>
                  <p className="text-xs text-neutral-400">Specify package name, pricing, and duration</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingPlan(null);
                }}
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Plan Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Platinum Annual, Student Special"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-red-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Duration (Months) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-red-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Default Discount (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-red-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Plan Description & Benefits
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Gym access, fitness assessment, diet consultation, locker included..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-red-500 outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 bg-neutral-950 border-neutral-800 focus:ring-red-500"
                />
                <label htmlFor="isActive" className="text-xs text-neutral-300 font-medium">
                  Plan is currently active and available for new members
                </label>
              </div>

              <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingPlan(null);
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
                  {submitting ? 'Saving...' : editingPlan ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE PLAN MODAL */}
      {deletingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">Delete Membership Plan?</h3>
              <p className="text-xs text-neutral-400">
                Are you sure you want to remove <strong>{deletingPlan.name}</strong>? Existing members enrolled under this plan will remain intact.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPlan(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-semibold text-white"
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
