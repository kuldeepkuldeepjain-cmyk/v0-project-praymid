-- Drop existing objects completely
DROP TABLE IF EXISTS public.participants CASCADE;
DROP SEQUENCE IF EXISTS participant_number_seq CASCADE;
DROP INDEX IF EXISTS idx_participants_email CASCADE;
DROP INDEX IF EXISTS idx_participants_username CASCADE;
DROP INDEX IF EXISTS idx_participants_phone CASCADE;
DROP INDEX IF EXISTS idx_participants_status CASCADE;
DROP INDEX IF EXISTS idx_participants_activation_deadline CASCADE;
DROP INDEX IF EXISTS idx_participants_contribution_approved CASCADE;

-- Create participants table
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
  activation_deadline TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  -- Adding referral system fields
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT REFERENCES public.participants(referral_code),
  referral_count INTEGER DEFAULT 0,
  referral_earnings NUMERIC DEFAULT 0
);

-- Create sequence for participant numbers
CREATE SEQUENCE participant_number_seq START WITH 1001;

-- Create indexes after table creation
CREATE INDEX idx_participants_email ON public.participants(email);
CREATE INDEX idx_participants_username ON public.participants(username);
CREATE INDEX idx_participants_phone ON public.participants(phone);
CREATE INDEX idx_participants_status ON public.participants(status);
CREATE INDEX idx_participants_activation_deadline ON public.participants(activation_deadline);
CREATE INDEX idx_participants_contribution_approved ON public.participants(contribution_approved);
-- Adding indexes for referral system
CREATE INDEX idx_participants_referral_code ON public.participants(referral_code);
CREATE INDEX idx_participants_referred_by ON public.participants(referred_by);

-- Enable Row Level Security
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "participants_select_all" ON public.participants FOR SELECT USING (true);
CREATE POLICY "participants_insert_all" ON public.participants FOR INSERT WITH CHECK (true);
CREATE POLICY "participants_update_all" ON public.participants FOR UPDATE USING (true);
