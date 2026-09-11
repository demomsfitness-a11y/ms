import React, { useState, useEffect, useRef } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { validateEmail, sendSupabaseEmailOtp, verifySupabaseEmailOtp, signOutSupabase } from '../lib/auth';
import { fetchAdminByEmail, updateAdminLastLogin, logActivity } from '../lib/db';
import { AdminAccount } from '../types';
import {
  Dumbbell,
  Mail,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Database,
  CheckCircle2,
  Clock,
  RotateCcw,
  FileCode,
} from 'lucide-react';

interface Props {
  onLoginSuccess: (admin: AdminAccount) => void;
  onOpenConfig: () => void;
  onOpenSql: () => void;
  onOpenBooking?: () => void;
}

export const LoginView: React.FC<Props> = ({
  onLoginSuccess,
  onOpenConfig,
  onOpenSql,
}) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');

  // Loading states matching prompt specifications
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Status and feedback messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // 30-second Resend countdown timer
  const [resendCountdown, setResendCountdown] = useState<number>(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isConfigured = isSupabaseConfigured();

  // Manage 30-second countdown when in OTP verification step
  useEffect(() => {
    if (step === 'otp') {
      if (timerRef.current) clearInterval(timerRef.current);
      setResendCountdown(30);
      timerRef.current = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step]);

  // Step 1: Send Real Email OTP through Supabase Authentication
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    // Strict email validation
    const validation = validateEmail(email);
    if (!validation.valid) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    const cleanEmail = validation.normalized;

    // Check blocked accounts
    if (cleanEmail === 'admin@msfitness.com') {
      const err = 'Access Denied: The account "admin@msfitness.com" has been permanently blocked by the Super Administrator.';
      setErrorMsg(err);
      await logActivity('Blocked Login Attempt', `Blocked account attempted sign-in: admin@msfitness.com`, 'admin@msfitness.com', {
        module: 'Auth',
        status: 'failed',
      });
      return;
    }

    setIsSendingOtp(true);

    try {
      // Trigger real Supabase Email OTP
      await sendSupabaseEmailOtp(cleanEmail);

      // Transition to OTP verification step
      setStep('otp');
      setOtp('');
      setInfoMsg('OTP sent successfully. Check your email.');
    } catch (err: any) {
      console.error('Send OTP failed:', err);
      const message = err.message || 'Unable to send OTP. Please try again.';
      setErrorMsg(message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Resend OTP handler with 30-second countdown reset
  const handleResendOtp = async () => {
    if (resendCountdown > 0 || isSendingOtp || isVerifyingOtp) return;

    setErrorMsg(null);
    setInfoMsg(null);

    const validation = validateEmail(email);
    if (!validation.valid) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsSendingOtp(true);

    try {
      await sendSupabaseEmailOtp(validation.normalized);
      setInfoMsg('OTP sent successfully. Check your email.');

      // Reset 30s countdown
      setResendCountdown(30);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Resend OTP error:', err);
      setErrorMsg(err.message || 'Unable to send OTP. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 2: Verify Real OTP through Supabase Authentication & Check Admin Authorization
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validation = validateEmail(email);
    if (!validation.valid) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    const cleanOtp = otp.replace(/\s+/g, '').trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setIsVerifyingOtp(true);

    try {
      // 1. Real Supabase verification (Strict: NO hardcoded "123456", "000000", or bypasses)
      const { session, user } = await verifySupabaseEmailOtp(validation.normalized, cleanOtp);

      const authenticatedEmail = (user?.email || session?.user?.email || validation.normalized).toLowerCase().trim();

      // 2. Admin Authorization Requirement: Check existing Admin/Staff Users table
      const adminRecord = await fetchAdminByEmail(authenticatedEmail);

      if (!adminRecord) {
        // Supabase authenticated, but email is NOT in authorized admin table
        await signOutSupabase();
        await logActivity(
          'Unauthorized Admin Login Attempt',
          `Unauthorized sign-in attempt from ${authenticatedEmail}`,
          authenticatedEmail,
          {
            module: 'Auth',
            status: 'failed',
          }
        );
        setErrorMsg('You are not authorized to access the MS Fitness Admin Panel.');
        setIsVerifyingOtp(false);
        return;
      }

      if (adminRecord.status === 'inactive') {
        await signOutSupabase();
        await logActivity(
          'Unauthorized Admin Login Attempt',
          `Deactivated administrator account attempted login: ${authenticatedEmail}`,
          authenticatedEmail,
          {
            module: 'Auth',
            status: 'failed',
          }
        );
        setErrorMsg('You are not authorized to access the MS Fitness Admin Panel.');
        setIsVerifyingOtp(false);
        return;
      }

      // 3. Authorized Admin/Staff access granted!
      localStorage.setItem('ms_fitness_admin_session', adminRecord.email);
      localStorage.setItem('msf_admin_email', adminRecord.email);
      localStorage.setItem('msf_current_admin', JSON.stringify(adminRecord));
      await updateAdminLastLogin(adminRecord.email);

      await logActivity(
        'Admin Login',
        `Admin login successful: ${adminRecord.full_name} (${adminRecord.role})`,
        adminRecord,
        {
          module: 'Auth',
          status: 'success',
          target_type: 'admin',
          target_id: adminRecord.admin_id,
        }
      );

      onLoginSuccess(adminRecord);
    } catch (err: any) {
      console.error('Verify OTP failure:', err);
      setErrorMsg(err.message || 'Invalid OTP. Please check the code and try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-neutral-900/90 border border-neutral-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl shadow-red-600/30">
            <Dumbbell className="w-9 h-9" />
          </div>

          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-wider font-display leading-none">
              MS FITNESS
            </h1>
            <p className="text-xs font-bold text-red-500 tracking-widest uppercase mt-1">
              STRONGER BODY, STRONGER YOU
            </p>
          </div>

          <div className="pt-2">
            <h2 className="text-base font-bold text-white tracking-wide">
              Admin Staff Login
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Secure administrative access to MS Fitness management portal
            </p>
          </div>
        </div>

        {/* Supabase status notice banner if unconfigured */}
        {!isConfigured && (
          <div className="mb-6 p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-amber-400" /> Supabase Config
              </span>
              <button
                type="button"
                onClick={onOpenConfig}
                className="text-amber-400 hover:text-white underline text-[11px]"
              >
                Configure
              </button>
            </div>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              Verify your Supabase project credentials to ensure real email OTP delivery.
            </p>
          </div>
        )}

        {/* Error notification */}
        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-2xl bg-red-950/60 border border-red-800/70 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Info notification */}
        {infoMsg && (
          <div className="mb-6 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{infoMsg}</p>
          </div>
        )}

        {/* STEP 1: Enter Admin Email Address */}
        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-2 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-red-500" /> Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter admin email"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-2xl px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none transition-all"
                autoFocus
              />
              <p className="text-[11px] text-neutral-500 mt-1.5">
                A one-time verification code (OTP) will be sent to this email via Supabase Auth.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSendingOtp}
              className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm tracking-wide transition-all shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSendingOtp ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending OTP...</span>
                </>
              ) : (
                <>
                  <span>Send OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* STEP 2: Enter 6-digit OTP Verification Code */
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white flex items-center justify-center gap-1.5">
                <KeyRound className="w-4 h-4 text-red-500" /> Verify Admin Email
              </h3>
              <p className="text-xs text-neutral-400">
                We've sent a 6-digit verification code to:
              </p>
              <p className="text-xs font-semibold text-white font-mono bg-neutral-950 py-1.5 px-3 rounded-lg inline-block border border-neutral-800">
                {email}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-neutral-300">
                  Enter OTP
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setErrorMsg(null);
                    setInfoMsg(null);
                  }}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                >
                  Change email
                </button>
              </div>

              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="_ _ _ _ _ _"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-2xl px-4 py-3.5 text-center text-2xl tracking-[0.4em] font-mono text-white placeholder-neutral-700 outline-none transition-all"
                autoFocus
              />
              <p className="text-[11px] text-neutral-500 mt-1.5 text-center">
                Enter the 6-digit code received in your inbox or spam folder.
              </p>
            </div>

            {/* Verify OTP Button */}
            <button
              type="submit"
              disabled={isVerifyingOtp || isSendingOtp}
              className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm tracking-wide transition-all shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isVerifyingOtp ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying OTP...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify OTP</span>
                </>
              )}
            </button>

            {/* Resend OTP Section with 30s Countdown */}
            <div className="pt-2 text-center space-y-1">
              <p className="text-xs text-neutral-400">Didn't receive the code?</p>
              {resendCountdown > 0 ? (
                <div className="inline-flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-950/60 px-3.5 py-1.5 rounded-xl border border-neutral-800/80">
                  <Clock className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Resend OTP in <strong>{resendCountdown}</strong> seconds</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isSendingOtp || isVerifyingOtp}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:underline transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isSendingOtp ? 'Sending OTP...' : 'Resend OTP'}</span>
                </button>
              )}
            </div>
          </form>
        )}

        {/* Database & Supabase Quick Actions */}
        <div className="mt-8 pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
          <button
            type="button"
            onClick={onOpenConfig}
            className="hover:text-red-400 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" /> Supabase Config
          </button>
          <button
            type="button"
            onClick={onOpenSql}
            className="hover:text-red-400 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5" /> SQL & Email OTP Setup
          </button>
        </div>
      </div>
    </div>
  );
};
