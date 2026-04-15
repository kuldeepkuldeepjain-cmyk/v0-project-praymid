-- Add predictions table for real prediction market
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  participant_email TEXT NOT NULL,
  asset_symbol TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('up', 'down')),
  bet_amount NUMERIC NOT NULL DEFAULT 0,
  entry_price NUMERIC NOT NULL,
  settlement_price NUMERIC,
  timeframe_minutes INTEGER NOT NULL DEFAULT 5,
  settlement_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'draw')),
  payout_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  settled_at TIMESTAMP WITH TIME ZONE
);

-- Add RLS policies
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "predictions_select_own" ON predictions
  FOR SELECT USING (true);

CREATE POLICY "predictions_insert_own" ON predictions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "predictions_update_own" ON predictions
  FOR UPDATE USING (true);

-- Add transactions table for complete audit trail
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  participant_email TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('contribution_sent', 'contribution_received', 'referral_earning', 'prediction_bet', 'prediction_win', 'prediction_loss', 'deposit', 'withdrawal')),
  amount NUMERIC NOT NULL,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select_own" ON transactions
  FOR SELECT USING (true);

CREATE POLICY "transactions_insert" ON transactions
  FOR INSERT WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_predictions_participant ON predictions(participant_email);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);
CREATE INDEX IF NOT EXISTS idx_predictions_settlement ON predictions(settlement_time);
CREATE INDEX IF NOT EXISTS idx_transactions_participant ON transactions(participant_email);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
