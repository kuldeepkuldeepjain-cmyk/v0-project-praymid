-- Create spin_coupons table for free prediction tickets
CREATE TABLE IF NOT EXISTS spin_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  participant_email TEXT NOT NULL,
  coupon_type TEXT NOT NULL DEFAULT 'free_bet',
  amount NUMERIC NOT NULL DEFAULT 5,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  prediction_id UUID REFERENCES predictions(id)
);

-- Enable RLS
ALTER TABLE spin_coupons ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "spin_coupons_select_own" ON spin_coupons
  FOR SELECT USING (true);

CREATE POLICY "spin_coupons_insert" ON spin_coupons
  FOR INSERT WITH CHECK (true);

CREATE POLICY "spin_coupons_update" ON spin_coupons
  FOR UPDATE USING (true);

-- Insert default topup address if not exists
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('topup_address', '', 'Crypto address for wallet top-up deposits')
ON CONFLICT (setting_key) DO NOTHING;
