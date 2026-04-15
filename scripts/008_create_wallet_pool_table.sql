-- Create wallet pool table to store approved participant payment addresses
DROP TABLE IF EXISTS public.wallet_pool CASCADE;

CREATE TABLE public.wallet_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
  participant_email TEXT NOT NULL,
  participant_username TEXT NOT NULL,
  bep20_address TEXT,
  erc20_address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  contribution_amount NUMERIC DEFAULT 100,
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_wallet_pool_participant_id ON public.wallet_pool(participant_id);
CREATE INDEX idx_wallet_pool_participant_email ON public.wallet_pool(participant_email);
CREATE INDEX idx_wallet_pool_is_active ON public.wallet_pool(is_active);
CREATE INDEX idx_wallet_pool_bep20 ON public.wallet_pool(bep20_address) WHERE bep20_address IS NOT NULL;
CREATE INDEX idx_wallet_pool_erc20 ON public.wallet_pool(erc20_address) WHERE erc20_address IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.wallet_pool ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "wallet_pool_select_all" ON public.wallet_pool FOR SELECT USING (true);
CREATE POLICY "wallet_pool_insert_all" ON public.wallet_pool FOR INSERT WITH CHECK (true);
CREATE POLICY "wallet_pool_update_all" ON public.wallet_pool FOR UPDATE USING (true);
