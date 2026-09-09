import React, { useState, useEffect } from 'react';
import { getSupabaseCredentials, saveSupabaseCredentials, isSupabaseConfigured, getSupabase } from '../lib/supabase';
import { Database, KeyRound, Globe, CheckCircle2, AlertCircle, RefreshCw, X, FileCode } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenSql: () => void;
  onSaved?: () => void;
}

export const SupabaseConfigModal: React.FC<Props> = ({ isOpen, onClose, onOpenSql, onSaved }) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrl(creds.url);
      setAnonKey(creds.anonKey);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !anonKey) {
      setTestResult({ success: false, message: 'Please enter both Supabase URL and Anon Key.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      saveSupabaseCredentials(url, anonKey);
      const client = getSupabase();
      if (!client) {
        throw new Error('Invalid credentials format');
      }

      // Test connection with a lightweight probe
      const { error } = await client.from('membership_plans').select('id').limit(1);

      if (error && error.code !== 'PGRST116') {
        // Table might not be created yet, but connection could be ok
        if (error.message?.includes('relation "public.membership_plans" does not exist')) {
          setTestResult({
            success: true,
            message: 'Connected to Supabase! (Tables need to be created using the SQL script).',
          });
        } else {
          setTestResult({
            success: false,
            message: `Supabase Error: ${error.message || 'Check your URL and API Key'}`,
          });
        }
      } else {
        setTestResult({
          success: true,
          message: 'Connection successful! Supabase is fully configured and ready.',
        });
      }

      if (onSaved) onSaved();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to connect to Supabase. Check credentials.',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-500">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">Supabase Database Connection</h2>
              <p className="text-xs text-neutral-400">Configure your live PostgreSQL cloud database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleTestAndSave} className="p-6 space-y-4">
          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3 text-xs text-neutral-300 flex items-start gap-2.5">
            <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
            <p>
              Supabase provides your cloud database and Email OTP Authentication. Find your <strong>Project URL</strong> and <strong>anon key</strong> in <em>Supabase Dashboard &gt; Project Settings &gt; API</em>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-red-500" /> Project URL
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-red-500" /> Public Anon Key
            </label>
            <textarea
              rows={3}
              required
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-neutral-600 outline-none transition-all resize-none"
            />
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-red-950/40 border-red-800/60 text-red-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              )}
              <div>
                <p className="font-medium">{testResult.message}</p>
                {testResult.success && (
                  <button
                    type="button"
                    onClick={onOpenSql}
                    className="mt-1 text-xs text-white underline hover:text-emerald-200 flex items-center gap-1"
                  >
                    <FileCode className="w-3.5 h-3.5" /> View / Run SQL Migration Script
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={onOpenSql}
              className="text-xs font-medium text-neutral-400 hover:text-red-400 flex items-center gap-1.5 transition-colors"
            >
              <FileCode className="w-4 h-4" /> View SQL Schema
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={testing}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition-colors flex items-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50"
              >
                {testing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {testing ? 'Testing...' : 'Test & Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
