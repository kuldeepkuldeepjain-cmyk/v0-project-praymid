-- COMPLETE DATABASE RESET AND RECREATION SCRIPT
-- This script drops and recreates all tables in the correct order

-- Step 1: Drop all tables (in reverse order to respect foreign keys)
DROP TABLE IF EXISTS public.payment_submissions CASCADE;
DROP TABLE IF EXISTS public.gas_approvals CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.participants CASCADE;

-- Drop sequences
DROP SEQUENCE IF EXISTS participant_number_seq CASCADE;

-- Step 2: Create participants table
CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_number INTEGER UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  wallet_address TEXT,
  bep20_address TEXT,
  country TEXT,
  country_code TEXT,
  state TEXT,
  city TEXT,
  postal_code TEXT,
  address TEXT,
  date_of_birth TEXT,
  gender TEXT,
  occupation TEXT,
  income TEXT,
  role TEXT DEFAULT 'participant',
  status TEXT DEFAULT 'active',
  rank TEXT DEFAULT 'bronze',
  activation_fee_paid BOOLEAN DEFAULT FALSE,
  contribution_approved BOOLEAN DEFAULT FALSE,
  account_frozen BOOLEAN DEFAULT FALSE,
  contributed_amount NUMERIC DEFAULT 0,
  wallet_balance NUMERIC DEFAULT 0,
  total_given NUMERIC DEFAULT 0,
  total_received NUMERIC DEFAULT 0,
  pending_requests INTEGER DEFAULT 0,
  completed_transactions INTEGER DEFAULT 0,
  participation_count INTEGER DEFAULT 0,
  risk_score INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activation_deadline TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE SEQUENCE participant_number_seq START WITH 1001;
CREATE INDEX idx_p_email ON public.participants(email);
CREATE INDEX idx_p_username ON public.participants(username);
CREATE INDEX idx_p_phone ON public.participants(phone);
CREATE INDEX idx_p_status ON public.participants(status);

-- Step 3: Create activity_logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor_id TEXT,
  actor_email TEXT,
  target_type TEXT,
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_al_timestamp ON public.activity_logs(timestamp DESC);

-- Step 4: Create support_tickets table
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  participant_username TEXT NOT NULL,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_st_participant ON public.support_tickets(participant_id);
CREATE INDEX idx_st_status ON public.support_tickets(status);

-- Step 5: Create gas_approvals table
CREATE TABLE public.gas_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  amount NUMERIC DEFAULT 100,
  transaction_hash TEXT NOT NULL,
  status TEXT DEFAULT 'approved',
  collected BOOLEAN DEFAULT FALSE,
  collected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ga_participant ON public.gas_approvals(participant_id);
CREATE INDEX idx_ga_status ON public.gas_approvals(status);

-- Step 6: Create payment_submissions table
CREATE TABLE public.payment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_email VARCHAR(255) NOT NULL,
  participant_wallet VARCHAR(255) NOT NULL,
  participant_name VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
  payment_method VARCHAR(20) NOT NULL DEFAULT 'crypto',
  screenshot_url TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  reviewed_by VARCHAR(255),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ps_email ON public.payment_submissions(participant_email);
CREATE INDEX idx_ps_status ON public.payment_submissions(status);
CREATE INDEX idx_ps_created ON public.payment_submissions(created_at DESC);

-- Step 7: Enable RLS on all tables
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gas_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;

-- Step 8: Create permissive policies for all tables
CREATE POLICY "participants_all" ON public.participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "activity_logs_all" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "support_tickets_all" ON public.support_tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "gas_approvals_all" ON public.gas_approvals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "payment_submissions_all" ON public.payment_submissions FOR ALL USING (true) WITH CHECK (true);
