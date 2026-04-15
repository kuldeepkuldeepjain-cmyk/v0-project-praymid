-- Create topup_requests table
CREATE TABLE IF NOT EXISTS topup_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID REFERENCES participants(id),
  participant_email TEXT NOT NULL,
  participant_username TEXT,
  amount NUMERIC NOT NULL,
  transaction_hash TEXT UNIQUE,
  wallet_address TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'credited', 'failed')),
  balance_before NUMERIC,
  balance_after NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  credited_at TIMESTAMP WITH TIME ZONE,
  credited_by TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_topup_requests_participant ON topup_requests(participant_email);
CREATE INDEX IF NOT EXISTS idx_topup_requests_status ON topup_requests(status);
CREATE INDEX IF NOT EXISTS idx_topup_requests_tx_hash ON topup_requests(transaction_hash);

-- Enable RLS
ALTER TABLE topup_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "topup_requests_insert" ON topup_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "topup_requests_select_own" ON topup_requests
  FOR SELECT USING (true);

CREATE POLICY "topup_requests_update" ON topup_requests
  FOR UPDATE USING (true);
