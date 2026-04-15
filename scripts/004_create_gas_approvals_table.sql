-- Drop existing table if exists
DROP TABLE IF EXISTS public.gas_approvals CASCADE;

-- Create gas approvals table
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

-- Create indexes
CREATE INDEX idx_gas_approvals_participant ON public.gas_approvals(participant_id);
CREATE INDEX idx_gas_approvals_status ON public.gas_approvals(status);

-- Enable Row Level Security
ALTER TABLE public.gas_approvals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "gas_approvals_select_all" ON public.gas_approvals FOR SELECT USING (true);
CREATE POLICY "gas_approvals_insert_all" ON public.gas_approvals FOR INSERT WITH CHECK (true);
CREATE POLICY "gas_approvals_update_all" ON public.gas_approvals FOR UPDATE USING (true);
