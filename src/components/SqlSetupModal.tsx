import React, { useState } from 'react';
import {
  SUPABASE_SETUP_SQL,
  SUPABASE_FIX_COLUMNS_SQL,
  SUPABASE_MIGRATION_UPI_SQL,
  SUPABASE_MIGRATION_ADMINS_SQL,
  SUPABASE_DASHBOARD_SQL_URL,
  SUPABASE_EMAIL_TEMPLATES_DASHBOARD_URL,
  SUPABASE_OTP_EMAIL_SUBJECT,
  SUPABASE_OTP_EMAIL_BODY,
  DEFAULT_SUPABASE_PROJECT_ID,
} from '../lib/supabase';
import {
  Database,
  Copy,
  Check,
  ExternalLink,
  X,
  ShieldAlert,
  Wrench,
  CreditCard,
  UserCog,
  MailCheck,
  Sparkles,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'otp' | 'admins' | 'upi' | 'fix' | 'full';
}

export const SqlSetupModal: React.FC<Props> = ({ isOpen, onClose, initialTab = 'otp' }) => {
  const [activeTab, setActiveTab] = useState<'otp' | 'admins' | 'upi' | 'fix' | 'full'>(initialTab);
  const [copied, setCopied] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  if (!isOpen) return null;

  const currentSql =
    activeTab === 'admins'
      ? SUPABASE_MIGRATION_ADMINS_SQL
      : activeTab === 'upi'
      ? SUPABASE_MIGRATION_UPI_SQL
      : activeTab === 'fix'
      ? SUPABASE_FIX_COLUMNS_SQL
      : SUPABASE_SETUP_SQL;

  const handleCopySql = () => {
    navigator.clipboard.writeText(currentSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopySubject = () => {
    navigator.clipboard.writeText(SUPABASE_OTP_EMAIL_SUBJECT);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2500);
  };

  const handleCopyBody = () => {
    navigator.clipboard.writeText(SUPABASE_OTP_EMAIL_BODY);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2500);
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
              <h2 className="text-xl font-bold text-white tracking-wide">
                Supabase Setup & Email OTP Configuration
              </h2>
              <p className="text-xs text-neutral-400">
                Project ID:{' '}
                <span className="text-emerald-400 font-mono font-semibold">{DEFAULT_SUPABASE_PROJECT_ID}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-neutral-800 pb-3 flex-wrap">
            <button
              onClick={() => setActiveTab('otp')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'otp'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <MailCheck className="w-3.5 h-3.5" />
              Email OTP Template (Fix Magic Link)
            </button>
            <button
              onClick={() => setActiveTab('admins')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'admins'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <UserCog className="w-3.5 h-3.5" />
              Admins & RBAC
            </button>
            <button
              onClick={() => setActiveTab('upi')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'upi'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              UPI Column
            </button>
            <button
              onClick={() => setActiveTab('fix')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'fix'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              Missing Columns
            </button>
            <button
              onClick={() => setActiveTab('full')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'full'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Full Schema & RLS
            </button>
          </div>

          {/* TAB 1: EMAIL OTP TEMPLATE (Fix Magic Link) */}
          {activeTab === 'otp' ? (
            <div className="space-y-4">
              <div className="bg-amber-950/40 rounded-xl p-4 border border-amber-800/60 text-xs text-amber-200 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  Why Supabase sends a "Sign in" Magic Link by default:
                </div>
                <p className="leading-relaxed text-neutral-300">
                  Supabase Auth&apos;s default email template uses <code className="text-amber-400 font-mono bg-neutral-950 px-1.5 py-0.5 rounded">&lbrace;&lbrace; .ConfirmationURL &rbrace;&rbrace;</code> instead of <code className="text-red-400 font-mono bg-neutral-950 px-1.5 py-0.5 rounded">&lbrace;&lbrace; .Token &rbrace;&rbrace;</code>. 
                  To have Supabase email a <strong>real 6-digit OTP</strong> code (e.g. <span className="font-mono text-red-400 font-bold">483721</span>) directly to your admin inbox, update the <strong>Magic Link</strong> email template in your Supabase Dashboard.
                </p>
                <div className="pt-1">
                  <a
                    href={SUPABASE_EMAIL_TEMPLATES_DASHBOARD_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors shadow-sm"
                  >
                    <span>Open Supabase Email Templates Dashboard</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Step by step guide */}
              <div className="bg-neutral-950/80 rounded-xl p-4 border border-neutral-800 text-xs space-y-3">
                <p className="font-bold text-white flex items-center gap-1.5 text-sm">
                  <Sparkles className="w-4 h-4 text-red-500" />
                  3 Quick Steps in Supabase Dashboard:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-neutral-300 ml-1">
                  <li>
                    Click the link above to open{' '}
                    <span className="font-mono text-white">Authentication &gt; Email Templates</span>, then select the{' '}
                    <strong className="text-white">Magic Link</strong> template.
                  </li>
                  <li>
                    Replace the <strong>Subject</strong> with the code below.
                  </li>
                  <li>
                    Replace the <strong>Message Body (HTML)</strong> with the code below and click{' '}
                    <strong className="text-white">Save Changes</strong>.
                  </li>
                </ol>
              </div>

              {/* Subject Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
                  <span>Template Subject:</span>
                  <button
                    type="button"
                    onClick={handleCopySubject}
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 font-medium cursor-pointer"
                  >
                    {copiedSubject ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSubject ? 'Copied!' : 'Copy Subject'}</span>
                  </button>
                </div>
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 font-mono text-xs text-white select-all">
                  {SUPABASE_OTP_EMAIL_SUBJECT}
                </div>
              </div>

              {/* Body Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
                  <span>Template Message Body (HTML):</span>
                  <button
                    type="button"
                    onClick={handleCopyBody}
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 font-medium cursor-pointer"
                  >
                    {copiedBody ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedBody ? 'Copied HTML!' : 'Copy HTML Body'}</span>
                  </button>
                </div>
                <pre className="bg-neutral-950 text-neutral-200 p-4 rounded-xl text-xs font-mono max-h-52 overflow-y-auto border border-neutral-800 select-all">
                  {SUPABASE_OTP_EMAIL_BODY}
                </pre>
              </div>
            </div>
          ) : (
            /* TAB 2-5: SQL CODE VIEW */
            <div className="space-y-4">
              <div className="bg-neutral-950/80 rounded-xl p-4 border border-neutral-800 text-sm text-neutral-300 space-y-2.5">
                <div className="flex items-center gap-2 text-red-400 font-semibold text-xs tracking-wider uppercase">
                  <ShieldAlert className="w-4 h-4" /> Supabase SQL Instructions:
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
                  <span>
                    {activeTab === 'admins'
                      ? 'Admins & Staff RBAC Migration'
                      : activeTab === 'upi'
                      ? 'UPI Transaction Number Migration'
                      : activeTab === 'fix'
                      ? 'SQL Column Migration'
                      : 'Full PostgreSQL Schema'}
                  </span>
                  <button
                    onClick={handleCopySql}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs transition-colors shadow-sm cursor-pointer"
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
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between gap-3">
          <a
            href={
              activeTab === 'otp'
                ? SUPABASE_EMAIL_TEMPLATES_DASHBOARD_URL
                : SUPABASE_DASHBOARD_SQL_URL
            }
            target="_blank"
            rel="noreferrer"
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-red-500" />
            <span>
              {activeTab === 'otp'
                ? 'Open Email Templates in Supabase'
                : 'Open project in Supabase'}
            </span>
          </a>

          <div className="flex items-center gap-2">
            {activeTab === 'otp' ? (
              <button
                onClick={handleCopyBody}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                {copiedBody ? 'Copied HTML Body!' : 'Copy OTP HTML Body'}
              </button>
            ) : (
              <button
                onClick={handleCopySql}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                {copied ? 'Copied!' : 'Copy SQL Script'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
