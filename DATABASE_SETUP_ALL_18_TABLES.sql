-- =====================================================================
-- COMPLETE PYRAMID APPLICATION DATABASE SETUP - ALL 18 TABLES
-- PostgreSQL / Supabase
-- Safe to run multiple times - uses IF NOT EXISTS
-- =====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- TABLE 1: participants (51 COLUMNS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  username TEXT,
  full_name TEXT,
  password_hash TEXT,
  wallet_address TEXT,
  referral_code TEXT,
  referred_by TEXT,
  account_balance NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  is_active BOOLEAN DEFAULT FALSE,
  activation_fee_paid BOOLEAN DEFAULT FALSE,
  activation_date TIMESTAMPTZ,
  contribution_approved BOOLEAN DEFAULT FALSE,
  next_contribution_date TIMESTAMPTZ,
  is_frozen BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  password TEXT,
  plain_password TEXT,
  bonus_balance NUMERIC DEFAULT 0,
  total_earnings NUMERIC DEFAULT 0,
  total_referrals INT DEFAULT 0,
  serial_number INT,
  rank TEXT,
  details_completed BOOLEAN DEFAULT FALSE,
  country TEXT,
  state TEXT,
  pin_code TEXT,
  full_address TEXT,
  mobile_number TEXT,
  last_login TIMESTAMPTZ,
  country_code TEXT,
  total_received NUMERIC DEFAULT 0,
  bep20_address TEXT,
  referral_count INT DEFAULT 0,
  referral_earnings NUMERIC DEFAULT 0,
  referral_contribution_rewarded BOOLEAN DEFAULT FALSE,
  queue_position INT,
  queue_start_date TIMESTAMPTZ,
  account_frozen BOOLEAN DEFAULT FALSE,
  activation_deadline TIMESTAMPTZ,
  whatsapp_otp TEXT,
  otp_verified BOOLEAN DEFAULT FALSE,
  otp_verified_at TIMESTAMPTZ,
  otp_verified_by TEXT,
  profile_image TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

-- =====================================================================
-- TABLE 2: topup_requests (14 COLUMNS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  participant_email TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'BEP20',
  transaction_id TEXT,
  screenshot_url TEXT,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by_email TEXT,
  rejection_reason TEXT,
  bep20_address TEXT
);

-- =====================================================================
-- TABLE 3: payment_submissions (17 COLUMNS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS payment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  participant_email TEXT NOT NULL,
  amount NUMERIC DEFAULT 100,
  payment_method TEXT DEFAULT 'BEP20',
  screenshot_url TEXT,
  transaction_id TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  admin_notes TEXT,
  matched_payout_id UUID,
  matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by_email TEXT,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- =====================================================================
-- TABLE 4: payout_requests (21 COLUMNS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  participant_email TEXT NOT NULL,
  amount NUMERIC DEFAULT 180,
  payout_method TEXT DEFAULT 'BEP20',
  wallet_address TEXT,
  status TEXT DEFAULT 'pending',
  transaction_hash TEXT,
  admin_notes TEXT,
  matched_contribution_id UUID,
  matched_at TIMESTAMPTZ,
  redirect_to_email TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  redirect_to_serial TEXT,
  serial_number SERIAL NOT NULL,
  participant_confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  dispute_status TEXT,
  dispute_reason TEXT,
  dispute_raised_at TIMESTAMPTZ
);

-- =====================================================================
-- TABLE 5: transactions (11 COLUMNS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
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

-- =====================================================================
-- TABLE 6: p2p_transactions (8 COLUMNS) ★ MISSING TABLE 1
-- =====================================================================
CREATE TABLE IF NOT EXISTS p2p_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES participants(id),
  receiver_id UUID REFERENCES participants(id),
  sender_email TEXT,
  receiver_email TEXT,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- TABLE 7: wallet_pool (9 COLUMNS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS wallet_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  assigned_to UUID,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  network TEXT DEFAULT 'BEP20',
  balance NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  participant_id UUID REFERENCES participants(id)
);

-- =====================================================================
-- TABLE 8: notifications (8 COLUMNS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES participants(id),
  user_email TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_status BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- TABLE 9: referrals (5 COLUMNS) ★ MISSING TABLE 2
-- =====================================================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_email TEXT NOT NULL,
  referred_email TEXT NOT NULL,
  bonus_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- TABLE 10: gas_approvals (9 COLUMNS) ★ MISSING TABLE 3
-- =====================================================================
CREATE TABLE IF NOT EXISTS gas_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  participant_email TEXT NOT NULL,
  wallet_address TEXT,
  transaction_hash TEXT,
  gas_fee NUMERIC,
  network TEXT DEFAULT 'BSC',
  status TEXT DEFAULT 'pending_collection',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- TABLE 11: activity_logs (8 COLUMNS)
-- =====================================================================
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

-- =====================================================================
-- TABLE 12: audit_logs (5 COLUMNS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  description TEXT,
  actor_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- TABLE 13: invite_logs (7 COLUMNS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS invite_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  contact_hash TEXT,
  contact_type TEXT DEFAULT 'phone',
  participant_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  invite_method TEXT DEFAULT 'app_share'
);

-- =====================================================================
-- TABLE 14: support_tickets (14 COLUMNS) ★ MISSING TABLE 4
-- =====================================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  participant_email TEXT NOT NULL,
  participant_name TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  category TEXT,
  reference_id TEXT,
  admin_response TEXT,
  admin_id TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- TABLE 15: predictions (9 COLUMNS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  participant_email TEXT NOT NULL,
  crypto_pair TEXT NOT NULL,
  prediction_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  result TEXT,
  profit_loss NUMERIC,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- TABLE 16: spin_coupons (8 COLUMNS) ★ MISSING TABLE 5
-- =====================================================================
CREATE TABLE IF NOT EXISTS spin_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  participant_email TEXT,
  coupon_code TEXT,
  prize_label TEXT,
  prize_amount NUMERIC DEFAULT 0,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- TABLE 17: system_settings (5 COLUMNS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type TEXT DEFAULT 'string',
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- TABLE 18: contribution_ledger (14 COLUMNS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS contribution_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  participant_email TEXT NOT NULL,
  payment_id UUID REFERENCES payment_submissions(id),
  payout_id UUID REFERENCES payout_requests(id),
  payment_amount NUMERIC,
  payout_amount NUMERIC,
  match_status TEXT DEFAULT 'pending',
  matched_at TIMESTAMPTZ,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- CREATE INDEXES FOR PERFORMANCE (40+ INDEXES)
-- =====================================================================

-- Participants indexes
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
CREATE INDEX IF NOT EXISTS idx_participants_referral_code ON participants(referral_code);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);
CREATE INDEX IF NOT EXISTS idx_participants_created ON participants(created_at DESC);

-- Topup requests indexes
CREATE INDEX IF NOT EXISTS idx_topup_requests_email ON topup_requests(participant_email);
CREATE INDEX IF NOT EXISTS idx_topup_requests_status ON topup_requests(status);
CREATE INDEX IF NOT EXISTS idx_topup_requests_created ON topup_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topup_requests_participant ON topup_requests(participant_id);

-- Payment submissions indexes
CREATE INDEX IF NOT EXISTS idx_payment_submissions_email ON payment_submissions(participant_email);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_status ON payment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_created ON payment_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_matched ON payment_submissions(matched_payout_id);

-- Payout requests indexes
CREATE INDEX IF NOT EXISTS idx_payout_requests_email ON payout_requests(participant_email);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_serial ON payout_requests(serial_number);
CREATE INDEX IF NOT EXISTS idx_payout_requests_created ON payout_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_requests_participant ON payout_requests(participant_id);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_email ON transactions(participant_email);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_participant ON transactions(participant_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_email);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Referrals indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_email);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_email);

-- Wallet pool indexes
CREATE INDEX IF NOT EXISTS idx_wallet_pool_available ON wallet_pool(is_available);
CREATE INDEX IF NOT EXISTS idx_wallet_pool_address ON wallet_pool(wallet_address);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_email ON activity_logs(actor_email);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

-- P2P transactions indexes
CREATE INDEX IF NOT EXISTS idx_p2p_transactions_sender ON p2p_transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_p2p_transactions_receiver ON p2p_transactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_p2p_transactions_created ON p2p_transactions(created_at DESC);

-- Support tickets indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_email ON support_tickets(participant_email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at DESC);

-- Predictions indexes
CREATE INDEX IF NOT EXISTS idx_predictions_email ON predictions(participant_email);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);

-- Spin coupons indexes
CREATE INDEX IF NOT EXISTS idx_spin_coupons_email ON spin_coupons(participant_email);
CREATE INDEX IF NOT EXISTS idx_spin_coupons_used ON spin_coupons(used);

-- System settings indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- Contribution ledger indexes
CREATE INDEX IF NOT EXISTS idx_contribution_ledger_email ON contribution_ledger(participant_email);
CREATE INDEX IF NOT EXISTS idx_contribution_ledger_payment ON contribution_ledger(payment_id);
CREATE INDEX IF NOT EXISTS idx_contribution_ledger_payout ON contribution_ledger(payout_id);
CREATE INDEX IF NOT EXISTS idx_contribution_ledger_status ON contribution_ledger(match_status);

-- =====================================================================
-- SUMMARY
-- =====================================================================
-- Total Tables: 18
-- Total Columns: 200+
-- Total Indexes: 40+
-- 
-- Tables included:
-- 1. participants (51 columns)
-- 2. topup_requests (14 columns)
-- 3. payment_submissions (17 columns)
-- 4. payout_requests (21 columns)
-- 5. transactions (11 columns)
-- 6. p2p_transactions (8 columns) ★
-- 7. wallet_pool (9 columns)
-- 8. notifications (8 columns)
-- 9. referrals (5 columns) ★
-- 10. gas_approvals (9 columns) ★
-- 11. activity_logs (8 columns)
-- 12. audit_logs (5 columns)
-- 13. invite_logs (7 columns)
-- 14. support_tickets (14 columns) ★
-- 15. predictions (9 columns)
-- 16. spin_coupons (8 columns) ★
-- 17. system_settings (5 columns)
-- 18. contribution_ledger (14 columns)
--
-- ★ = Previously missing tables (now included!)
-- =====================================================================
