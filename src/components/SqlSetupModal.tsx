import React, { useState } from 'react';
import {
  SUPABASE_SETUP_SQL,
  SUPABASE_FIX_COLUMNS_SQL,
  SUPABASE_MIGRATION_UPI_SQL,
  SUPABASE_MIGRATION_ADMINS_SQL,
  SUPABASE_DASHBOARD_SQL_URL,
  DEFAULT_SUPABASE_PROJECT_ID,
} from '../lib/supabase';
import { Database, Copy, Check, ExternalLink, X, ShieldAlert, Sparkles, Wrench, CreditCard, UserCog } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SqlSetupModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'admins' | 'upi' | 'fix' | 'full'>('admins');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentSql =
    activeTab === 'admins'
      ? SUPABASE_MIGRATION_ADMINS_SQL
      : activeTab === 'upi'
      ? SUPABASE_MIGRATION_UPI_SQL
      : activeTab === 'fix'
      ? SUPABASE_FIX_COLUMNS_SQL
      : SUPABASE_SETUP_SQL;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Modal Header */}
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">Supabase Database Setup & Migrations</h2>
              <p className="text-xs text-neutral-400">
                SQL migrations for project{' '}
                <span className="text-emerald-400 font-mono font-semibold">{DEFAULT_SUPABASE_PROJECT_ID}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-neutral-800 pb-3 flex-wrap">
            <button
              onClick={() => setActiveTab('admins')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'admins'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <UserCog className="w-3.5 h-3.5" />
              Admins & RBAC Migration
            </button>
            <button
              onClick={() => setActiveTab('upi')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'upi'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              UPI Column Migration
            </button>
            <button
              onClick={() => setActiveTab('fix')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'fix'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              Fix Missing Columns
            </button>
            <button
              onClick={() => setActiveTab('full')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'full'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Full Schema & RLS Policies
            </button>
          </div>

          <div className="bg-neutral-950/80 rounded-xl p-4 border border-neutral-800 text-sm text-neutral-300 space-y-2.5">
            <div className="flex items-center gap-2 text-red-400 font-semibold text-xs tracking-wider uppercase">
              <ShieldAlert className="w-4 h-4" /> Quick Supabase Instructions:
            </div>
            <ol className="list-decimal list-inside space-y-2 text-xs text-neutral-300 ml-1">
              <li>
                Open your Supabase SQL editor:{' '}
                <a
                  href={SUPABASE_DASHBOARD_SQL_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-red-400 hover:underline font-semibold inline-flex items-center gap-1 bg-red-950/40 px-2 py-0.5 rounded border border-red-900/50"
                >
                  Open Supabase SQL Editor ({DEFAULT_SUPABASE_PROJECT_ID}) <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                Click <strong>Copy SQL Code</strong> below and paste it into the query window
              </li>
              <li>
                Click <strong>Run (Ctrl + Enter)</strong> in Supabase.
              </li>
            </ol>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between pb-2 text-xs font-mono text-neutral-400">
              <span>{activeTab === 'fix' ? 'SQL Column Migration' : 'Full PostgreSQL Schema'}</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs transition-colors shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied to Clipboard!' : 'Copy SQL Code'}
              </button>
            </div>
            <pre className="bg-black/90 text-neutral-200 p-4 rounded-xl text-xs font-mono max-h-72 overflow-y-auto border border-neutral-800/80 selection:bg-red-500/30">
              {currentSql}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between gap-3">
          <a
            href={SUPABASE_DASHBOARD_SQL_URL}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-red-500" />
            <span>Open project in Supabase</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition-colors"
            >
              {copied ? 'Copied!' : 'Copy SQL Script'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
