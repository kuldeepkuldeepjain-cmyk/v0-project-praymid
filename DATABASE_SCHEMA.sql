-- ==========================================
-- PRAYMID PROJECT — COMPLETE DATABASE SCHEMA
-- PostgreSQL 14+
-- Copy and paste this entire file into your SQL editor
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. PARTICIPANTS (Main user table)
-- ==========================================
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  username TEXT UNIQUE,
  full_name TEXT,
  password_hash TEXT,
  password TEXT,
  plain_password TEXT,
  wallet_address TEXT,
  bep20_address TEXT,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  account_balance NUMERIC DEFAULT 0,
  bonus_balance NUMERIC DEFAULT 0,
  total_earnings NUMERIC DEFAULT 0,
  total_received NUMERIC DEFAULT 0,
  total_referrals INT DEFAULT 0,
  referral_count INT DEFAULT 0,
  referral_earnings NUMERIC DEFAULT 0,
  referral_contribution_rewarded BOOLEAN DEFAULT FALSE,
  serial_number INT,
  rank TEXT,
  status TEXT DEFAULT 'pending',
  is_active BOOLEAN DEFAULT FALSE,
  is_frozen BOOLEAN DEFAULT FALSE,
  account_frozen BOOLEAN DEFAULT FALSE,
  activation_fee_paid BOOLEAN DEFAULT FALSE,
  activation_date TIMESTAMPTZ,
  activation_deadline TIMESTAMPTZ,
  contribution_approved BOOLEAN DEFAULT FALSE,
  next_contribution_date TIMESTAMPTZ,
  queue_position INT,
  queue_start_date TIMESTAMPTZ,
  details_completed BOOLEAN DEFAULT FALSE,
  country TEXT,
  country_code TEXT,
  state TEXT,
  pin_code TEXT,
  full_address TEXT,
  mobile_number TEXT,
  whatsapp_otp TEXT,
  otp_verified BOOLEAN NOT NULL DEFAULT FALSE,
  otp_verified_at TIMESTAMPTZ,
  otp_verified_by TEXT,
  profile_image TEXT,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
CREATE INDEX IF NOT EXISTS idx_participants_referral_code ON participants(referral_code);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);
CREATE INDEX IF NOT EXISTS idx_participants_username ON participants(username);

-- ==========================================
-- 2. TOPUP_REQUESTS (Wallet top-up requests)
-- ==========================================
CREATE TABLE IF NOT EXISTS topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  participant_email TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'BEP20',
  transaction_id TEXT,
  screenshot_url TEXT,
  bep20_address TEXT,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_topup_requests_email ON topup_requests(participant_email);
CREATE INDEX IF NOT EXISTS idx_topup_requests_status ON topup_requests(status);
CREATE INDEX IF NOT EXISTS idx_topup_requests_created ON topup_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topup_requests_not_deleted ON topup_requests(id) WHERE is_deleted = FALSE;

-- ==========================================
-- 3. PAYMENT_SUBMISSIONS (Contribution submissions)
-- ==========================================
CREATE TABLE IF NOT EXISTS payment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  participant_email TEXT NOT NULL,
  amount NUMERIC DEFAULT 100,
  payment_method TEXT DEFAULT 'BEP20',
  screenshot_url TEXT,
  transaction_id TEXT,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by_email TEXT,
  matched_payout_id UUID,
  matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_submissions_email ON payment_submissions(participant_email);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_status ON payment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_matched ON payment_submissions(matched_payout_id);

-- ==========================================
-- 4. PAYOUT_REQUESTS (Withdrawal requests)
-- ==========================================
CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  participant_email TEXT NOT NULL,
  amount NUMERIC DEFAULT 180,
  payout_method TEXT DEFAULT 'BEP20',
  wallet_address TEXT,
  status TEXT DEFAULT 'pending',
  transaction_hash TEXT,
  admin_notes TEXT,
  matched_contribution_id UUID,
  matched_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  processed_by TEXT,
  participant_confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  dispute_status TEXT,
  dispute_reason TEXT,
  dispute_raised_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_email ON payout_requests(participant_email);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_created ON payout_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_requests_not_deleted ON payout_requests(id) WHERE is_deleted = FALSE;

-- Add foreign key for payment_submissions
ALTER TABLE payment_submissions
DROP CONSTRAINT IF NOT EXISTS payment_submissions_matched_payout_id_fkey;

ALTER TABLE payment_submissions
ADD CONSTRAINT payment_submissions_matched_payout_id_fkey
  FOREIGN KEY (matched_payout_id) REFERENCES payout_requests(id) ON DELETE SET NULL;

-- ==========================================
-- 5. TRANSACTIONS (Account ledger)
-- ==========================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  participant_email TEXT NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  reference_id TEXT,
  balance_before NUMERIC,
  balance_after NUMERIC,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_email ON transactions(participant_email);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);

-- ==========================================
-- 6. P2P_TRANSACTIONS (Peer-to-peer transfers)
-- ==========================================
CREATE TABLE IF NOT EXISTS p2p_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  sender_email TEXT,
  receiver_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  receiver_email TEXT,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_p2p_sender ON p2p_transactions(sender_email);
CREATE INDEX IF NOT EXISTS idx_p2p_receiver ON p2p_transactions(receiver_email);

-- ==========================================
-- 7. WALLET_POOL (BEP20 wallet assignments)
-- ==========================================
CREATE TABLE IF NOT EXISTS wallet_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  wallet_address TEXT NOT NULL,
  network TEXT DEFAULT 'BEP20',
  balance NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_pool_available ON wallet_pool(status);
CREATE INDEX IF NOT EXISTS idx_wallet_pool_participant ON wallet_pool(participant_id);

-- ==========================================
-- 8. NOTIFICATIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_status BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_email ON notifications(user_email);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_status);

-- ==========================================
-- 9. ACTIVITY_LOGS (User activity tracking)
-- ==========================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON activity_logs(actor_email);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

-- ==========================================
-- 10. AUDIT_LOGS (Admin action logs)
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  description TEXT,
  admin_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ==========================================
-- 11. INVITE_LOGS (Referral invite tracking)
-- ==========================================
CREATE TABLE IF NOT EXISTS invite_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  contact_phone TEXT,
  contact_name TEXT,
  contact_hash TEXT,
  participant_email TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_logs_user ON invite_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_invite_logs_participant ON invite_logs(participant_id);

-- ==========================================
-- 12. PREDICTIONS (Crypto prediction game)
-- ==========================================
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  participant_email TEXT NOT NULL,
  crypto_pair TEXT NOT NULL,
  prediction_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  entry_price NUMERIC,
  target_price NUMERIC,
  leverage INT DEFAULT 1,
  result TEXT,
  profit_loss NUMERIC,
  status TEXT DEFAULT 'pending',
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_participant ON predictions(participant_id);
CREATE INDEX IF NOT EXISTS idx_predictions_email ON predictions(participant_email);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);

-- ==========================================
-- 13. SUPPORT_TICKETS
-- ==========================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  participant_email TEXT NOT NULL,
  participant_name TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT,
  reference_id TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  admin_id TEXT,
  admin_response TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_email ON support_tickets(participant_email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- ==========================================
-- 14. REFERRALS
-- ==========================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_email TEXT NOT NULL,
  referred_email TEXT NOT NULL,
  bonus_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_email);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_email);

-- ==========================================
-- 15. GAS_APPROVALS (Gas fee tracking)
-- ==========================================
CREATE TABLE IF NOT EXISTS gas_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  participant_email TEXT NOT NULL,
  wallet_address TEXT,
  transaction_hash TEXT,
  gas_fee NUMERIC,
  network TEXT DEFAULT 'BSC',
  status TEXT DEFAULT 'pending_collection',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gas_approvals_email ON gas_approvals(participant_email);

-- ==========================================
-- 16. MOBILE_VERIFICATION_OTPS
-- ==========================================
CREATE TABLE IF NOT EXISTS mobile_verification_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  email TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  attempt_count INT DEFAULT 0,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobile_verification_otps_mobile ON mobile_verification_otps(mobile_number);
CREATE INDEX IF NOT EXISTS idx_mobile_verification_otps_email ON mobile_verification_otps(email);

-- ==========================================
-- 17. SYSTEM_SETTINGS
-- ==========================================
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type TEXT DEFAULT 'string',
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- ==========================================
-- INITIAL DATA
-- ==========================================

-- Insert admin settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description)
VALUES 
  ('topup_bep20_address', '0x0000000000000000000000000000000000000000', 'string', 'Admin BEP20 address for top-ups'),
  ('contribution_amount', '100', 'number', 'Default contribution amount'),
  ('payout_amount', '180', 'number', 'Default payout amount')
ON CONFLICT (setting_key) DO NOTHING;

-- ==========================================
-- SCHEMA VERSION (for tracking migrations)
-- ==========================================
INSERT INTO system_settings (setting_key, setting_value, setting_type, description)
VALUES ('schema_version', '1.0.0', 'version', 'Current database schema version')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = '1.0.0';

-- ==========================================
-- GRANTS (if using separate user)
-- ==========================================
-- Uncomment and modify if needed:
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO praymid_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO praymid_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO praymid_user;

-- ==========================================
-- VERIFICATION
-- ==========================================
-- Run this to verify all tables are created:
-- SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;
-- You should see 17 tables listed above.

-- ==========================================
-- END OF SCHEMA
-- ==========================================
