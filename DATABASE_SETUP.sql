-- ============================================================
-- COMPLETE DATABASE SETUP FOR PYRAMID APPLICATION
-- Execute this SQL script in your Supabase SQL Editor
-- ============================================================

-- 1. PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS participants (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100),
  full_name VARCHAR(255),
  plain_password VARCHAR(255),
  password VARCHAR(255),
  mobile_number VARCHAR(20),
  country_code VARCHAR(5),
  country VARCHAR(100),
  state VARCHAR(100),
  pin_code VARCHAR(10),
  full_address TEXT,
  wallet_address VARCHAR(100),
  bep20_address VARCHAR(100),
  account_balance DECIMAL(15, 2) DEFAULT 0,
  bonus_balance DECIMAL(15, 2) DEFAULT 0,
  total_earnings DECIMAL(15, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  status VARCHAR(50) DEFAULT 'active',
  referral_code VARCHAR(50) UNIQUE,
  referred_by VARCHAR(255),
  referral_count INT DEFAULT 0,
  referral_earnings DECIMAL(15, 2) DEFAULT 0,
  total_referrals INT DEFAULT 0,
  whatsapp_otp VARCHAR(10),
  otp_verified BOOLEAN DEFAULT FALSE,
  otp_verified_at TIMESTAMP WITH TIME ZONE,
  rank VARCHAR(50),
  serial_number VARCHAR(50),
  last_login TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. PREDICTIONS TABLE
CREATE TABLE IF NOT EXISTS predictions (
  id BIGSERIAL PRIMARY KEY,
  participant_id BIGINT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  prediction_type VARCHAR(50),
  result VARCHAR(50),
  profit_loss DECIMAL(15, 2) DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. PAYMENT SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS payment_submissions (
  id BIGSERIAL PRIMARY KEY,
  participant_id BIGINT REFERENCES participants(id) ON DELETE CASCADE,
  participant_email VARCHAR(255),
  amount DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  matched_payout_id VARCHAR(100),
  matched_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. PAYOUT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS payout_requests (
  id BIGSERIAL PRIMARY KEY,
  participant_id BIGINT REFERENCES participants(id) ON DELETE CASCADE,
  participant_email VARCHAR(255),
  amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. CONTRIBUTION LEDGER TABLE
CREATE TABLE IF NOT EXISTS contribution_ledger (
  id BIGSERIAL PRIMARY KEY,
  participant_id BIGINT REFERENCES participants(id) ON DELETE CASCADE,
  participant_email VARCHAR(255),
  payment_id VARCHAR(100),
  payout_id VARCHAR(100),
  payment_amount DECIMAL(15, 2),
  payout_amount DECIMAL(15, 2),
  match_status VARCHAR(50) DEFAULT 'pending',
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TOPUP REQUESTS TABLE
CREATE TABLE IF NOT EXISTS topup_requests (
  id BIGSERIAL PRIMARY KEY,
  participant_id BIGINT REFERENCES participants(id) ON DELETE CASCADE,
  participant_email VARCHAR(255),
  amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  participant_id BIGINT REFERENCES participants(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  type VARCHAR(50),
  description TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id BIGINT REFERENCES participants(id) ON DELETE CASCADE,
  action VARCHAR(100),
  description TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. INVITE LOGS TABLE
CREATE TABLE IF NOT EXISTS invite_logs (
  id BIGSERIAL PRIMARY KEY,
  participant_id BIGINT REFERENCES participants(id) ON DELETE CASCADE,
  invited_email VARCHAR(255),
  status VARCHAR(50),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. MOBILE VERIFICATION OTPS TABLE
CREATE TABLE IF NOT EXISTS mobile_verification_otps (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255),
  otp VARCHAR(10),
  is_used BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- 11. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_email VARCHAR(255),
  title VARCHAR(255),
  message TEXT,
  type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. WALLET POOL TABLE
CREATE TABLE IF NOT EXISTS wallet_pool (
  id BIGSERIAL PRIMARY KEY,
  wallet_address VARCHAR(100) UNIQUE NOT NULL,
  assigned_to BIGINT REFERENCES participants(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. ADMIN USERS TABLE
CREATE TABLE IF NOT EXISTS admin_users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);
CREATE INDEX IF NOT EXISTS idx_participants_created_at ON participants(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_is_deleted ON participants(is_deleted);
CREATE INDEX IF NOT EXISTS idx_predictions_participant_id ON predictions(participant_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_is_deleted ON predictions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_payments_participant_email ON payment_submissions(participant_email);
CREATE INDEX IF NOT EXISTS idx_payments_is_deleted ON payment_submissions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payouts_participant_email ON payout_requests(participant_email);
CREATE INDEX IF NOT EXISTS idx_payouts_is_deleted ON payout_requests(is_deleted);
CREATE INDEX IF NOT EXISTS idx_topups_status ON topup_requests(status);
CREATE INDEX IF NOT EXISTS idx_topups_is_deleted ON topup_requests(is_deleted);
CREATE INDEX IF NOT EXISTS idx_transactions_participant_id ON transactions(participant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_is_deleted ON transactions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_id ON activity_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_is_deleted ON activity_logs(is_deleted);
CREATE INDEX IF NOT EXISTS idx_contribution_ledger_participant_email ON contribution_ledger(participant_email);
CREATE INDEX IF NOT EXISTS idx_contribution_ledger_is_deleted ON contribution_ledger(is_deleted);
CREATE INDEX IF NOT EXISTS idx_wallet_pool_assigned_to ON wallet_pool(assigned_to);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- ============================================================
-- SEED DATA (OPTIONAL - Remove if you don't want sample data)
-- ============================================================

-- Insert sample admin user
INSERT INTO admin_users (email, password_hash, full_name, role, is_active) 
VALUES ('admin@pyramid.com', '$2b$10$admin_hash_placeholder', 'Admin User', 'admin', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Insert sample participants
INSERT INTO participants (email, full_name, plain_password, mobile_number, status, is_active)
VALUES 
('prince@example.com', 'Prince Jat', 'password123', '9876543210', 'active', TRUE),
('kuldeep@example.com', 'Kuldeep Jain', 'password123', '9876543210', 'active', TRUE),
('arpit@example.com', 'Arpit Jain', 'password123', '9876543210', 'pending', TRUE)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- COMPLETED SUCCESSFULLY
-- ============================================================
