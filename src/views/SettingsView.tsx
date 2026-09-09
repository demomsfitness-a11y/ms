import React, { useState } from 'react';
import { GymSettings, AdminAccount } from '../types';
import { hasPermission } from '../lib/permissions';
import {
  Settings,
  Dumbbell,
  Phone,
  Mail,
  MapPin,
  QrCode,
  Image,
  Database,
  CheckCircle2,
  Save,
  FileCode,
  RefreshCw,
  Sparkles,
  ExternalLink,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

interface Props {
  settings: GymSettings;
  onUpdateSettings: (updates: Partial<GymSettings>) => Promise<void>;
  onOpenConfig: () => void;
  onOpenSql: () => void;
  adminEmail: string;
  currentAdmin?: AdminAccount;
}

export const SettingsView: React.FC<Props> = ({
  settings,
  onUpdateSettings,
  onOpenConfig,
  onOpenSql,
  adminEmail,
  currentAdmin,
}) => {
  const canManageSettings = !currentAdmin || hasPermission(currentAdmin, 'settings.manage');
  const [gymName, setGymName] = useState(settings.gym_name || 'MS Fitness');
  const [tagline, setTagline] = useState(settings.tagline || 'Stronger Body, Stronger You');
  const [phone, setPhone] = useState(settings.phone || '+91 98765 43210');
  const [email, setEmail] = useState(settings.email || 'contact@msfitness.com');
  const [address, setAddress] = useState(
    settings.address || '123 Powerhouse Street, Fitness District, New Delhi, India'
  );
  const [upiId, setUpiId] = useState(settings.upi_id || 'msfitness@upi');
  const [logoUrl, setLogoUrl] = useState(settings.logo_url || '');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isDbConfigured = isSupabaseConfigured();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    setErrorMsg(null);

    try {
      await onUpdateSettings({
        gym_name: gymName.trim(),
        tagline: tagline.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        upi_id: upiId.trim(),
        logo_url: logoUrl.trim(),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      console.error('Supabase settings update error:', err);
      setErrorMsg(err.message || 'Failed to update gym settings in Supabase');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200 max-w-4xl">
      {/* Header */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white font-display">
            GYM BRANDING & SYSTEM CONFIGURATION
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Official gym identity details automatically displayed on payment receipts and PDF downloads.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Settings Saved!
          </div>
        )}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 md:p-8 space-y-6">
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-950/70 border border-red-800/80 text-red-200 text-xs flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p className="font-semibold text-white">Update Error</p>
              <p className="text-red-300">{errorMsg}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pb-4 border-b border-neutral-800">
          <div className="w-10 h-10 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Brand Profile</h3>
            <p className="text-xs text-neutral-400">Gym name, tagline, address and receipt header details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-red-500" /> Gym Name *
            </label>
            <input
              type="text"
              required
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-2xl px-4 py-2.5 text-sm text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-red-500" /> Brand Tagline *
            </label>
            <input
              type="text"
              required
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-2xl px-4 py-2.5 text-sm text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-red-500" /> Official Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-2xl px-4 py-2.5 text-sm text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-red-500" /> Official Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-2xl px-4 py-2.5 text-sm text-white outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-500" /> Gym Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-2xl px-4 py-2.5 text-sm text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-red-500" /> UPI ID (Printed on receipts)
            </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. msfitness@okicici"
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-2xl px-4 py-2.5 text-sm text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5 text-red-500" /> Custom Logo URL (Optional)
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-2xl px-4 py-2.5 text-sm text-white outline-none"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-800 flex items-center justify-end">
          {canManageSettings ? (
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all shadow-lg shadow-red-600/25 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          ) : (
            <div
              title="You do not have permission to modify gym settings (settings.manage)"
              className="px-6 py-3 rounded-2xl bg-neutral-800 text-neutral-500 font-bold text-xs flex items-center gap-2 cursor-not-allowed border border-neutral-700/50"
            >
              <Lock className="w-4 h-4" />
              <span>Settings Modification Restricted</span>
            </div>
          )}
        </div>
      </form>

      {/* Supabase Cloud Connection Box */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Supabase Cloud Database</h3>
              <p className="text-xs text-neutral-400">PostgreSQL tables, storage, and Row Level Security</p>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
            isDbConfigured
              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/50'
              : 'bg-amber-950/70 text-amber-300 border border-amber-800/50'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isDbConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {isDbConfigured ? 'Connected' : 'Setup Required'}
          </span>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed">
          The MS Fitness Gym Admin system runs strictly on Supabase. You can verify your connection credentials, update your API keys, or copy the SQL database migration script at any time.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={onOpenConfig}
            className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors border border-neutral-700"
          >
            <Database className="w-4 h-4 text-red-500" /> Supabase Connection Manager
          </button>
          <button
            onClick={onOpenSql}
            className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors border border-neutral-700"
          >
            <FileCode className="w-4 h-4 text-red-500" /> View SQL Schema Script
          </button>
        </div>
      </div>
    </div>
  );
};
