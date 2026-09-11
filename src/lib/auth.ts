import { getSupabase, isSupabaseConfigured } from './supabase';
import { Session, User } from '@supabase/supabase-js';

export interface EmailValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

/**
 * Validates and normalizes email address.
 * - Trims unnecessary whitespace.
 * - Converts to lowercase.
 * - Enforces standard email format.
 * - Returns user-friendly validation error if invalid.
 */
export function validateEmail(input: string): EmailValidationResult {
  const normalized = (input || '').trim().toLowerCase();

  if (!normalized) {
    return {
      valid: false,
      normalized: '',
      error: 'Please enter a valid email address.',
    };
  }

  // Standard email validation pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Please enter a valid email address.',
    };
  }

  return {
    valid: true,
    normalized,
  };
}

/**
 * Maps Supabase authentication errors into friendly, non-technical user messages.
 */
export function mapSupabaseAuthError(error: any, context: 'send' | 'verify'): string {
  if (!error) {
    return context === 'send'
      ? 'Unable to send OTP. Please try again.'
      : 'Invalid OTP. Please check the code and try again.';
  }

  const msg = String(error.message || error.error_description || error || '').toLowerCase();
  const status = error.status || error.statusCode;

  // Rate limiting / too many requests
  if (
    msg.includes('rate limit') ||
    msg.includes('too many') ||
    msg.includes('over_email_send_rate_limit') ||
    msg.includes('security purposes') ||
    msg.includes('seconds') ||
    status === 429
  ) {
    return 'Too many OTP requests. Please wait and try again.';
  }

  // Network / connectivity issues
  if (
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('connection') ||
    msg.includes('timeout') ||
    msg.includes('offline')
  ) {
    return 'Connection problem. Please try again.';
  }

  if (context === 'verify') {
    // Expired OTP
    if (msg.includes('expired') || msg.includes('token is expired') || msg.includes('has expired')) {
      return 'OTP expired. Please request a new code.';
    }

    // Already used OTP
    if (msg.includes('already used') || msg.includes('reused') || msg.includes('consumed')) {
      return 'This OTP has already been used. Please request a new code.';
    }

    // Incorrect / invalid OTP
    if (
      msg.includes('invalid') ||
      msg.includes('token') ||
      msg.includes('incorrect') ||
      msg.includes('wrong') ||
      status === 400 ||
      status === 401
    ) {
      return 'Invalid OTP. Please check the code and try again.';
    }

    return 'Invalid OTP. Please check the code and try again.';
  }

  // Context: send
  if (
    msg.includes('smtp') ||
    msg.includes('email') ||
    msg.includes('transport') ||
    msg.includes('provider')
  ) {
    return 'Unable to send OTP. Please try again later.';
  }

  return 'Unable to send OTP. Please try again.';
}

/**
 * Sends a real one-time verification code to the given email using Supabase Auth.
 * Never stores or returns the OTP to the frontend.
 */
export async function sendSupabaseEmailOtp(email: string): Promise<{ success: boolean; message: string }> {
  const validation = validateEmail(email);
  if (!validation.valid) {
    throw new Error(validation.error || 'Please enter a valid email address.');
  }

  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) {
    throw new Error('Supabase project is not configured. Please check Supabase settings.');
  }

  try {
    const { error } = await client.auth.signInWithOtp({
      email: validation.normalized,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.warn('Supabase signInWithOtp error:', error);
      const friendlyMsg = mapSupabaseAuthError(error, 'send');
      throw new Error(friendlyMsg);
    }

    return {
      success: true,
      message: 'OTP sent successfully. Check your email.',
    };
  } catch (err: any) {
    if (err.message && (err.message.startsWith('Please') || err.message.startsWith('Too many') || err.message.startsWith('Connection') || err.message.startsWith('Unable'))) {
      throw err;
    }
    const friendlyMsg = mapSupabaseAuthError(err, 'send');
    throw new Error(friendlyMsg);
  }
}

/**
 * Verifies a real OTP against Supabase Auth.
 * If valid, Supabase creates the authenticated session.
 * Never compares against hardcoded values like 123456 or 000000.
 */
export async function verifySupabaseEmailOtp(
  email: string,
  otpCode: string
): Promise<{ session: Session; user: User }> {
  const validation = validateEmail(email);
  if (!validation.valid) {
    throw new Error(validation.error || 'Please enter a valid email address.');
  }

  const cleanOtp = (otpCode || '').replace(/\s+/g, '').trim();
  if (!cleanOtp || cleanOtp.length < 6) {
    throw new Error('Please enter the complete 6-digit OTP.');
  }

  const client = getSupabase();
  if (!client || !isSupabaseConfigured()) {
    throw new Error('Supabase project is not configured. Please check Supabase settings.');
  }

  try {
    const { data, error } = await client.auth.verifyOtp({
      email: validation.normalized,
      token: cleanOtp,
      type: 'email',
    });

    if (error) {
      console.warn('Supabase verifyOtp error:', error);
      const friendlyMsg = mapSupabaseAuthError(error, 'verify');
      throw new Error(friendlyMsg);
    }

    if (!data?.session || !data?.user) {
      throw new Error('Invalid OTP. Please check the code and try again.');
    }

    return {
      session: data.session,
      user: data.user,
    };
  } catch (err: any) {
    if (
      err.message &&
      (err.message.startsWith('Invalid OTP') ||
        err.message.startsWith('OTP expired') ||
        err.message.startsWith('OTP has already') ||
        err.message.startsWith('Too many') ||
        err.message.startsWith('Connection'))
    ) {
      throw err;
    }
    const friendlyMsg = mapSupabaseAuthError(err, 'verify');
    throw new Error(friendlyMsg);
  }
}

/**
 * Signs out the authenticated user from Supabase and clears auth sessions.
 */
export async function signOutSupabase(): Promise<void> {
  const client = getSupabase();
  if (client) {
    try {
      await client.auth.signOut();
    } catch (err) {
      console.warn('Sign out warning:', err);
    }
  }
}
