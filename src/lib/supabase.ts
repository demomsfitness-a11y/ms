import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Supabase project credentials provided by user
export const DEFAULT_SUPABASE_PROJECT_ID = 'zjruoaaxlpxjeejzvmpt';
export const DEFAULT_SUPABASE_URL = 'https://zjruoaaxlpxjeejzvmpt.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_a2m8MA8kVYy2djTw-J_lGQ_5whXLpXp';
export const SUPABASE_DASHBOARD_SQL_URL = `https://supabase.com/dashboard/project/${DEFAULT_SUPABASE_PROJECT_ID}/sql/new`;

// Environment variables or localStorage override
const STORAGE_URL_KEY = 'ms_fitness_supabase_url';
const STORAGE_KEY_KEY = 'ms_fitness_supabase_anon_key';

function isValidUrl(val: any): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed.includes('your-project.supabase.co')) {
    return false;
  }
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

function isValidKey(val: any): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed === 'your-anon-key') {
    return false;
  }
  return trimmed.length > 20;
}

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const metaEnv = (import.meta as any).env || {};
  const envUrl = metaEnv.VITE_SUPABASE_URL;
  const envKey = metaEnv.VITE_SUPABASE_ANON_KEY;

  let localUrl: string | null = null;
  let localKey: string | null = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localUrl = localStorage.getItem(STORAGE_URL_KEY);
      localKey = localStorage.getItem(STORAGE_KEY_KEY);
    }
  } catch (e) {
    console.warn('LocalStorage access warning:', e);
  }

  // Determine URL: custom valid local -> valid env -> default fallback
  let url = DEFAULT_SUPABASE_URL;
  if (isValidUrl(localUrl)) {
    url = localUrl!.trim();
  } else if (isValidUrl(envUrl)) {
    url = envUrl.trim();
  }

  // Determine Anon Key: custom valid local -> valid env -> default fallback
  let anonKey = DEFAULT_SUPABASE_ANON_KEY;
  if (isValidKey(localKey)) {
    anonKey = localKey!.trim();
  } else if (isValidKey(envKey)) {
    anonKey = envKey.trim();
  }

  return { url, anonKey };
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (url && url.trim()) localStorage.setItem(STORAGE_URL_KEY, url.trim());
    if (anonKey && anonKey.trim()) localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  }
  // Re-init client
  initSupabaseClient();
}

export function clearSupabaseCredentials() {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(STORAGE_URL_KEY);
    localStorage.removeItem(STORAGE_KEY_KEY);
  }
  initSupabaseClient();
}

export let supabase: SupabaseClient | null = null;

export function initSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();

  if (url && anonKey && url.startsWith('http')) {
    try {
      supabase = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      return supabase;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      // Fallback to default
      try {
        supabase = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);
        return supabase;
      } catch {
        supabase = null;
        return null;
      }
    }
  }

  try {
    supabase = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);
    return supabase;
  } catch {
    supabase = null;
    return null;
  }
}

// Initial client call
initSupabaseClient();

export function getSupabase(): SupabaseClient | null {
  if (!supabase) {
    return initSupabaseClient();
  }
  return supabase;
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith('http') && anonKey.length > 20);
}

// Complete SQL Schema that the user can copy into Supabase SQL Editor
export const SUPABASE_SETUP_SQL = `-- MS FITNESS GYM ADMIN DATABASE SETUP SCRIPT
-- Project ID: zjruoaaxlpxjeejzvmpt
-- Run this in your Supabase project -> SQL Editor:
-- https://supabase.com/dashboard/project/zjruoaaxlpxjeejzvmpt/sql/new

-- 1. Create MEMBERSHIP PLANS table
CREATE TABLE IF NOT EXISTS public.membership_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans if not present
INSERT INTO public.membership_plans (name, duration_months, price, discount, description, is_active)
SELECT 'Basic', 1, 999, 0, '1 Month Gym Access with locker facility and general trainer guidance', true
WHERE NOT EXISTS (SELECT 1 FROM public.membership_plans WHERE name = 'Basic');

INSERT INTO public.membership_plans (name, duration_months, price, discount, description, is_active)
SELECT 'Standard', 6, 3597, 0, '6 Months Gym Access, diet chart consultation, cardio and weight area access', true
WHERE NOT EXISTS (SELECT 1 FROM public.membership_plans WHERE name = 'Standard');

INSERT INTO public.membership_plans (name, duration_months, price, discount, description, is_active)
SELECT 'Premium', 12, 5994, 0, '12 Months Complete Gym Access, personal fitness plan, steam bath access, and free gym kit', true
WHERE NOT EXISTS (SELECT 1 FROM public.membership_plans WHERE name = 'Premium');

-- 2. Create MEMBERS table
CREATE TABLE IF NOT EXISTS public.members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT DEFAULT '',
  dob DATE,
  gender TEXT DEFAULT 'male',
  address TEXT DEFAULT '',
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  plan_id UUID REFERENCES public.membership_plans(id) ON DELETE SET NULL,
  plan_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  remaining_balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
  emergency_contact TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  membership_start DATE NOT NULL DEFAULT CURRENT_DATE,
  membership_expiry DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all member columns exist if table was created previously without them
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'male';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS emergency_contact TEXT DEFAULT '';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- 3. Create PAYMENTS table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id TEXT UNIQUE NOT NULL,
  receipt_number TEXT UNIQUE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  previous_balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_due NUMERIC(10, 2) NOT NULL DEFAULT 0,
  remaining_balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  upi_transaction_number TEXT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  plan_name TEXT DEFAULT 'Membership Fee',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure plan_name and upi_transaction_number columns exist if table was created previously
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT 'Membership Fee';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS upi_transaction_number TEXT NULL;

-- 4. Create APPOINTMENTS & BOOKINGS table (Stores all appointment booking form submissions)
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT DEFAULT '',
  service_type TEXT NOT NULL DEFAULT 'free_trial',
  appointment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  time_slot TEXT NOT NULL DEFAULT '10:00 AM - 11:00 AM',
  fitness_goal TEXT DEFAULT 'general_fitness',
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create GYM SETTINGS table
CREATE TABLE IF NOT EXISTS public.gym_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_name TEXT NOT NULL DEFAULT 'MS Fitness',
  tagline TEXT NOT NULL DEFAULT 'Stronger Body, Stronger You',
  phone TEXT DEFAULT '+91 98765 43210',
  email TEXT DEFAULT 'contact@msfitness.com',
  address TEXT DEFAULT '123 Powerhouse Street, Fitness District, New Delhi, India',
  upi_id TEXT DEFAULT 'msfitness@upi',
  logo_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial settings row if none exists
INSERT INTO public.gym_settings (gym_name, tagline, phone, email, address, upi_id)
SELECT 'MS Fitness', 'Stronger Body, Stronger You', '+91 98765 43210', 'contact@msfitness.com', '123 Powerhouse Street, Fitness District, New Delhi, India', 'msfitness@upi'
WHERE NOT EXISTS (SELECT 1 FROM public.gym_settings LIMIT 1);

-- 6. Create ACTIVITY LOGS table (Enhanced Audit Trail)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id TEXT,
  admin_name TEXT,
  admin_email TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  action TEXT NOT NULL,
  module TEXT DEFAULT 'General',
  description TEXT NOT NULL,
  target_type TEXT DEFAULT '',
  target_id TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  status TEXT DEFAULT 'success',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure enhanced activity log columns exist if table was created previously
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS admin_id TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS admin_name TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS module TEXT DEFAULT 'General';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT '';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS target_id TEXT DEFAULT '';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS ip_address TEXT DEFAULT '';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success';

-- 7. Create ADMINS table (Multi-Admin Management & Granular RBAC)
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  status TEXT NOT NULL DEFAULT 'active',
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial Super Admin if admins table is empty
INSERT INTO public.admins (admin_id, email, full_name, role, status, permissions)
SELECT 'ADM-0001', 'admin@msfitness.com', 'MS Fitness Super Admin', 'super_admin', 'active', '["*"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.admins LIMIT 1);

-- 8. Indexes for ultra fast queries
CREATE INDEX IF NOT EXISTS idx_members_member_id ON public.members(member_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_expiry ON public.members(membership_expiry);
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON public.payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_upi_txn ON public.payments(upi_transaction_number);
CREATE INDEX IF NOT EXISTS idx_activity_logs_time ON public.activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_email ON public.activity_logs(admin_email);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_mobile ON public.appointments(mobile);
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_id ON public.admins(admin_id);
CREATE INDEX IF NOT EXISTS idx_admins_role ON public.admins(role);
CREATE INDEX IF NOT EXISTS idx_admins_status ON public.admins(status);

-- 9. Enable Row Level Security (RLS)
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 10. Table Grants for Roles
GRANT ALL ON TABLE public.members TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.membership_plans TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.payments TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.appointments TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.gym_settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.activity_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.admins TO anon, authenticated, service_role;

-- 11. RLS Policies (Full CRUD access for admins and visitors)
DROP POLICY IF EXISTS "Allow public access on members" ON public.members;
DROP POLICY IF EXISTS "Admin full access on members" ON public.members;
DROP POLICY IF EXISTS "members_all_access" ON public.members;
CREATE POLICY "members_all_access" ON public.members
  FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on membership_plans" ON public.membership_plans;
DROP POLICY IF EXISTS "Admin full access on membership_plans" ON public.membership_plans;
DROP POLICY IF EXISTS "Allow read plans" ON public.membership_plans;
DROP POLICY IF EXISTS "plans_all_access" ON public.membership_plans;
CREATE POLICY "plans_all_access" ON public.membership_plans
  FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on payments" ON public.payments;
DROP POLICY IF EXISTS "Admin full access on payments" ON public.payments;
DROP POLICY IF EXISTS "payments_all_access" ON public.payments;
CREATE POLICY "payments_all_access" ON public.payments
  FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow anyone to submit appointment booking" ON public.appointments;
DROP POLICY IF EXISTS "Allow reading appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow admin to update or delete appointments" ON public.appointments;
DROP POLICY IF EXISTS "appointments_all_access" ON public.appointments;
CREATE POLICY "appointments_all_access" ON public.appointments
  FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on gym_settings" ON public.gym_settings;
DROP POLICY IF EXISTS "Admin full access on gym_settings" ON public.gym_settings;
DROP POLICY IF EXISTS "settings_all_access" ON public.gym_settings;
CREATE POLICY "settings_all_access" ON public.gym_settings
  FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admin full access on activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "logs_all_access" ON public.activity_logs;
CREATE POLICY "logs_all_access" ON public.activity_logs
  FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admins_all_access" ON public.admins;
CREATE POLICY "admins_all_access" ON public.admins
  FOR ALL TO public USING (true) WITH CHECK (true);
`;

export const SUPABASE_FIX_COLUMNS_SQL = `-- Run this in Supabase SQL Editor to add any missing columns to your existing tables:
-- 1. MEMBERS table columns
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'male';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS emergency_contact TEXT DEFAULT '';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- 2. MEMBERSHIP PLANS table columns
ALTER TABLE public.membership_plans ADD COLUMN IF NOT EXISTS discount NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.membership_plans ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.membership_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 3. GYM SETTINGS table columns (handles both naming conventions)
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS upi_id TEXT DEFAULT '';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS contact_number TEXT DEFAULT '';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS contact_email TEXT DEFAULT '';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT '';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';

-- 4. PAYMENTS table columns
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT 'Membership Fee';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS discount NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS previous_balance NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS total_due NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS upi_transaction_number TEXT NULL;

-- 5. ACTIVITY LOGS table columns
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS admin_id TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS admin_name TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS module TEXT DEFAULT 'General';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT '';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS target_id TEXT DEFAULT '';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS ip_address TEXT DEFAULT '';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success';
`;

// Safe Idempotent SQL Migration for Multi-Admin Management & RBAC
export const SUPABASE_MIGRATION_ADMINS_SQL = `-- Migration: Multi-Admin Management & Granular RBAC Permissions
-- Creates admins table, seeds initial Super Admin, and enhances activity logs
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  status TEXT NOT NULL DEFAULT 'active',
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial Super Admin if admins table is empty
INSERT INTO public.admins (admin_id, email, full_name, role, status, permissions)
SELECT 'ADM-0001', 'admin@msfitness.com', 'MS Fitness Super Admin', 'super_admin', 'active', '["*"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.admins LIMIT 1);

-- Enhance activity_logs table
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS admin_id TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS admin_name TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'admin';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS module TEXT DEFAULT 'General';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT '';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS target_id TEXT DEFAULT '';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS ip_address TEXT DEFAULT '';
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success';

-- Indexes for ultra fast lookups
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_id ON public.admins(admin_id);
CREATE INDEX IF NOT EXISTS idx_admins_role ON public.admins(role);
CREATE INDEX IF NOT EXISTS idx_admins_status ON public.admins(status);

-- Grants & RLS
GRANT ALL ON TABLE public.admins TO anon, authenticated, service_role;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_all_access" ON public.admins;
CREATE POLICY "admins_all_access" ON public.admins
  FOR ALL TO public USING (true) WITH CHECK (true);
`;

// Safe Idempotent SQL Migration for UPI Transaction Numbers
export const SUPABASE_MIGRATION_UPI_SQL = `-- Migration: Add upi_transaction_number to payments table
-- Safe idempotent migration: checks if upi_transaction_number exists before creating it
-- Preserves all existing payment records without modification
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'payments' 
      AND column_name = 'upi_transaction_number'
  ) THEN 
    ALTER TABLE public.payments ADD COLUMN upi_transaction_number TEXT NULL;
  END IF; 
END $$;

-- Direct ALTER TABLE IF NOT EXISTS support
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS upi_transaction_number TEXT NULL;

-- Index for fast lookups by UPI transaction number
CREATE INDEX IF NOT EXISTS idx_payments_upi_txn ON public.payments(upi_transaction_number);
`;
