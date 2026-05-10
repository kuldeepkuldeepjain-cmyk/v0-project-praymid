-- ============================================================================
-- FLOWCHAIN - COMPLETE PRODUCTION DATABASE SCHEMA
-- For PostgreSQL / Supabase
-- Generated for immediate production use
-- Database Name: flowchain
-- ============================================================================

-- ============================================================================
-- PART 1: DROP ALL TABLES (CLEAN SLATE)
-- ============================================================================
DROP TABLE IF EXISTS spin_coupons CASCADE;
DROP TABLE IF EXISTS user_contacts CASCADE;
DROP TABLE IF EXISTS invite_logs CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS topup_requests CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS wallet_pool CASCADE;
DROP TABLE IF EXISTS payout_requests CASCADE;
DROP TABLE IF EXISTS payment_submissions CASCADE;
DROP TABLE IF EXISTS mobile_verification_otps CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS gas_approvals CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS participant_sessions CASCADE;
DROP TABLE IF EXISTS payout_pre_assignments CASCADE;

DROP SEQUENCE IF EXISTS participant_serial_seq CASCADE;
DROP FUNCTION IF EXISTS generate_participant_serial() CASCADE;
DROP FUNCTION IF EXISTS set_participant_serial() CASCADE;
DROP TRIGGER IF EXISTS trigger_set_participant_serial CASCADE;

-- ============================================================================
-- PART 2: CREATE ALL TABLES WITH COMPLETE COLUMNS
-- ============================================================================

-- TABLE 1: PARTICIPANTS (Main User Table)
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number TEXT UNIQUE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  mobile_number TEXT UNIQUE,
  password TEXT NOT NULL,
  plain_password TEXT,
  wallet_address TEXT,
  bep20_address TEXT,
  country TEXT DEFAULT '',
  country_code TEXT DEFAULT '',
  state TEXT DEFAULT '',
  pin_code TEXT DEFAULT '',
  full_address TEXT DEFAULT '',
  full_name TEXT,
  status TEXT DEFAULT 'pending',
  rank TEXT DEFAULT 'bronze',
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  total_referrals INTEGER DEFAULT 0,
  total_earnings NUMERIC DEFAULT 0,
  account_balance NUMERIC DEFAULT 0,
  bonus_balance NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_frozen BOOLEAN DEFAULT FALSE,
  details_completed BOOLEAN DEFAULT FALSE,
  details_submitted_at TIMESTAMP WITH TIME ZONE,
  activation_date TIMESTAMP WITH TIME ZONE,
  activation_deadline TIMESTAMP WITH TIME ZONE,
  last_login TIMESTAMP WITH TIME ZONE,
  profile_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Serial number sequence and function
CREATE SEQUENCE participant_serial_seq START WITH 5001;

CREATE OR REPLACE FUNCTION generate_participant_serial()
RETURNS TEXT AS $$
BEGIN
  RETURN 'FLCN' || nextval('participant_serial_seq')::TEXT;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_participant_serial()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_participant_serial();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_participant_serial
  BEFORE INSERT ON participants
  FOR EACH ROW
  EXECUTE FUNCTION set_participant_serial();

CREATE INDEX idx_participants_email ON participants(email);
CREATE INDEX idx_participants_username ON participants(username);
CREATE INDEX idx_participants_mobile ON participants(mobile_number);
CREATE INDEX idx_participants_status ON participants(status);
CREATE INDEX idx_participants_referral_code ON participants(referral_code);
CREATE INDEX idx_participants_serial_number ON participants(serial_number);
CREATE INDEX idx_participants_details_completed ON participants(details_completed);

-- TABLE 2: MOBILE VERIFICATION OTPs
CREATE TABLE mobile_verification_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  email TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  attempt_count INTEGER DEFAULT 0,
  verified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_otp_mobile ON mobile_verification_otps(mobile_number);

-- TABLE 3: PAYMENT SUBMISSIONS (Activation/Contribution Payments)
CREATE TABLE payment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  participant_email TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 100,
  payment_method TEXT DEFAULT 'USDT_BEP20',
  screenshot_url TEXT,
  transaction_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  matched_payout_id UUID,
  matched_contribution_id UUID,
  matched_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ps_participant ON payment_submissions(participant_id);
CREATE INDEX idx_ps_email ON payment_submissions(participant_email);
CREATE INDEX idx_ps_status ON payment_submissions(status);
CREATE INDEX idx_payment_submissions_automatch ON payment_submissions(status, created_at);

-- TABLE 4: PAYOUT REQUESTS
CREATE TABLE payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number TEXT UNIQUE,
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  participant_email TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payout_method TEXT DEFAULT 'BEP20',
  status TEXT DEFAULT 'pending',
  transaction_hash TEXT,
  matched_contribution_id UUID REFERENCES payment_submissions(id),
  matched_at TIMESTAMP WITH TIME ZONE,
  redirect_to_email TEXT,
  redirect_to_serial TEXT,
  admin_notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pr_participant ON payout_requests(participant_id);
CREATE INDEX idx_pr_email ON payout_requests(participant_email);
CREATE INDEX idx_pr_status ON payout_requests(status);
CREATE INDEX idx_payout_requests_redirect_to_email ON payout_requests(redirect_to_email);
CREATE INDEX idx_payout_requests_redirect_serial ON payout_requests(redirect_to_serial);
CREATE INDEX idx_payout_requests_matched_contribution ON payout_requests(matched_contribution_id);

-- Add foreign key constraint from payment_submissions to payout_requests
ALTER TABLE payment_submissions
  ADD CONSTRAINT fk_ps_matched_payout
  FOREIGN KEY (matched_payout_id) REFERENCES payout_requests(id) ON DELETE SET NULL;

-- TABLE 5: TRANSACTIONS (Financial Ledger)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  participant_email TEXT,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  reference_id UUID,
  status TEXT DEFAULT 'completed',
  balance_before NUMERIC,
  balance_after NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tx_participant ON transactions(participant_id);
CREATE INDEX idx_tx_type ON transactions(type);

-- TABLE 6: PREDICTIONS (Crypto Trading)
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  participant_email TEXT NOT NULL,
  crypto_pair TEXT NOT NULL,
  prediction_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  entry_price NUMERIC NOT NULL,
  target_price NUMERIC,
  leverage INTEGER DEFAULT 1,
  profit_loss NUMERIC DEFAULT 0,
  result TEXT,
  status TEXT DEFAULT 'pending',
  timeframe TEXT,
  expiry_timestamp TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pred_participant ON predictions(participant_id);
CREATE INDEX idx_pred_email ON predictions(participant_email);
CREATE INDEX idx_pred_status ON predictions(status);

-- TABLE 7: TOPUP REQUESTS
CREATE TABLE topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  participant_email TEXT NOT NULL,
  participant_username TEXT,
  amount NUMERIC NOT NULL,
  transaction_hash TEXT UNIQUE,
  wallet_address TEXT NOT NULL,
  bep20_address TEXT,
  status TEXT DEFAULT 'pending',
  balance_before NUMERIC,
  balance_after NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  credited_at TIMESTAMP WITH TIME ZONE,
  credited_by TEXT
);

CREATE INDEX idx_topup_participant ON topup_requests(participant_id);
CREATE INDEX idx_topup_email ON topup_requests(participant_email);
CREATE INDEX idx_topup_status ON topup_requests(status);
CREATE INDEX idx_topup_tx_hash ON topup_requests(transaction_hash);

-- TABLE 8: NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read_status BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notif_email ON notifications(user_email);
CREATE INDEX idx_notif_status ON notifications(user_email, read_status);
CREATE INDEX idx_notif_created ON notifications(created_at DESC);

-- TABLE 9: ACTIVITY LOGS
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor_id TEXT,
  actor_email TEXT,
  target_type TEXT,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_actor ON activity_logs(actor_email);
CREATE INDEX idx_activity_action ON activity_logs(action);

-- TABLE 10: AUDIT LOGS
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  description TEXT,
  admin_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 11: WALLET POOL
CREATE TABLE wallet_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_to UUID REFERENCES participants(id) ON DELETE SET NULL,
  wallet_address TEXT NOT NULL,
  network TEXT DEFAULT 'BEP20',
  balance NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 12: INVITE LOGS
CREATE TABLE invite_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  contact_id UUID,
  contact_phone TEXT,
  contact_name TEXT,
  contact_hash TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invite_logs_user_id ON invite_logs(user_id);
CREATE INDEX idx_invite_logs_status ON invite_logs(status);

-- TABLE 13: USER CONTACTS
CREATE TABLE user_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, contact_phone)
);

CREATE INDEX idx_user_contacts_user_id ON user_contacts(user_id);

-- TABLE 14: SPIN COUPONS
CREATE TABLE spin_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  participant_email TEXT NOT NULL,
  coupon_type TEXT NOT NULL DEFAULT 'free_bet',
  amount NUMERIC NOT NULL DEFAULT 5,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  prediction_id UUID REFERENCES predictions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 15: SUPPORT TICKETS
CREATE TABLE support_tickets (
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

CREATE INDEX idx_support_tickets_participant ON support_tickets(participant_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);

-- TABLE 16: GAS APPROVALS
CREATE TABLE gas_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  amount NUMERIC DEFAULT 100,
  transaction_hash TEXT NOT NULL,
  network TEXT DEFAULT 'BSC',
  status TEXT DEFAULT 'approved',
  collected BOOLEAN DEFAULT FALSE,
  collected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ga_participant ON gas_approvals(participant_id);
CREATE INDEX idx_ga_status ON gas_approvals(status);

-- TABLE 17: SYSTEM SETTINGS
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'string',
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE 18: PARTICIPANT SESSIONS
CREATE TABLE participant_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- TABLE 19: PAYOUT PRE ASSIGNMENTS
CREATE TABLE payout_pre_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number TEXT,
  wallet_address TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PART 3: DEFAULT SYSTEM SETTINGS
-- ============================================================================
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
  ('activation_fee', '100', 'number', 'Account activation fee amount'),
  ('referral_reward', '10', 'number', 'Reward amount for successful referral'),
  ('min_payout_amount', '50', 'number', 'Minimum payout request amount'),
  ('max_payout_amount', '10000', 'number', 'Maximum payout request amount'),
  ('platform_fee_percentage', '2', 'number', 'Platform transaction fee percentage'),
  ('maintenance_mode', 'false', 'boolean', 'System maintenance mode'),
  ('topup_address', '', 'string', 'Crypto address for wallet top-up deposits')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- PART 4: ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_verification_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE topup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE spin_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE gas_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_sessions ENABLE ROW LEVEL SECURITY;

-- Deny direct client access (service role bypasses RLS for server-side)
CREATE POLICY "deny_all" ON participants FOR ALL USING (false);
CREATE POLICY "deny_all" ON mobile_verification_otps FOR ALL USING (false);
CREATE POLICY "deny_all" ON payment_submissions FOR ALL USING (false);
CREATE POLICY "deny_all" ON payout_requests FOR ALL USING (false);
CREATE POLICY "deny_all" ON transactions FOR ALL USING (false);
CREATE POLICY "deny_all" ON predictions FOR ALL USING (false);
CREATE POLICY "deny_all" ON topup_requests FOR ALL USING (false);
CREATE POLICY "deny_all" ON notifications FOR ALL USING (false);
CREATE POLICY "deny_all" ON activity_logs FOR ALL USING (false);
CREATE POLICY "deny_all" ON audit_logs FOR ALL USING (false);
CREATE POLICY "deny_all" ON wallet_pool FOR ALL USING (false);
CREATE POLICY "deny_all" ON invite_logs FOR ALL USING (false);
CREATE POLICY "deny_all" ON user_contacts FOR ALL USING (false);
CREATE POLICY "deny_all" ON spin_coupons FOR ALL USING (false);
CREATE POLICY "deny_all" ON support_tickets FOR ALL USING (false);
CREATE POLICY "deny_all" ON gas_approvals FOR ALL USING (false);
CREATE POLICY "deny_all" ON participant_sessions FOR ALL USING (false);

-- ============================================================================
-- PART 5: VERIFICATION
-- ============================================================================
SELECT 'DATABASE SETUP COMPLETE' AS status;
SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'public';
