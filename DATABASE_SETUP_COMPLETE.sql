-- ============================================================
-- COMPLETE PYRAMID APPLICATION DATABASE SCHEMA
-- ALL TABLES, COLUMNS, AND INDEXES
-- ============================================================

-- ============================================================
-- 1. PARTICIPANTS TABLE (USER ACCOUNTS)
-- ============================================================
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
  status VARCHAR(50) DEFAULT 'pending',
  referral_code VARCHAR(50) UNIQUE,
  referred_by VARCHAR(255),
  referral_count INT DEFAULT 0,
  referral_earnings DECIMAL(15, 2) DEFAULT 0,
  total_referrals INT DEFAULT 0,
  whatsapp_otp VARCHAR(10),
  otp_verified BOOLEAN DEFAULT FALSE,
  otp_verified_at TIMESTAMP,
  rank VARCHAR(50),
  serial_number VARCHAR(50),
  last_login TIMESTAMP,
  activation_date TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_participants_email ON participants(email);
CREATE INDEX idx_participants_status ON participants(status);
CREATE INDEX idx_participants_is_active ON participants(is_active);
CREATE INDEX idx_participants_created_at ON participants(created_at);

-- ============================================================
-- 2. PREDICTIONS TABLE (TRADING/PREDICTIONS)
-- ============================================================
CREATE TABLE IF NOT EXISTS predictions (
  id BIGSERIAL PRIMARY KEY,
  participant_id BIGINT REFERENCES participants(id),
  participant_email VARCHAR(255),
  crypto_pair VARCHAR(50),
  prediction_type VARCHAR(50),
  amount DECIMAL(15, 2) NOT NULL,
  entry_price DECIMAL(15, 8),
  exit_price DECIMAL(15, 8),
  result VARCHAR(50),
  profit_loss DECIMAL(15, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_predictions_participant_email ON predictions(participant_email);
CREATE INDEX idx_predictions_status ON predictions(status);
CREATE INDEX idx_predictions_created_at ON predictions(created_at);

-- ============================================================
-- 3. PAYMENT SUBMISSIONS TABLE (ACTIVATION PAYMENTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_submissions (
  id BIGSERIAL PRIMARY KEY,
  participant_id BIGINT REFERENCES participants(id),
  participant_email VARCHAR(255),
  username VARCHAR(100),
  wallet_address VARCHAR(100),
  bep20_address VARCHAR(100),
  amount DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  screenshot_url TEXT,
  transaction_id VARCHAR(255),
  transaction_hash VARCHAR(255),
  admin_notes TEXT,
  matched_payout_id BIGINT,
  matched_at TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_submissions_email ON payment_submissions(participant_email);
CREATE INDEX idx_payment_submissions_status ON payment_submissions(status);
CREATE INDEX idx_payment_submissions_created_at ON payment_submissions(created_at);

-- ============================================================
-- 4. PAYOUT REQUESTS TABLE (WITHDRAWAL REQUESTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS payout_requests (
  id BIGSERIAL PRIMARY KEY,
  serial_number VARCHAR(100) UNIQUE,
  participant_id BIGINT REFERENCES participants(id),
  participant_email VARCHAR(255),
  username VARCHAR(100),
  wallet_address VARCHAR(100),
  bep20_address VARCHAR(100),
  amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(50) DEFAULT 'normal',
  redirect_to_participant_id BIGINT,
  redirect_to_email VARCHAR(255),
  redirect_reason VARCHAR(255),
  redirect_timestamp TIMESTAMP,
  redirect_count INT DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  redirect_at_timestamp TIMESTAMP
);

CREATE INDEX idx_payout_requests_email ON payout_requests(participant_email);
CREATE INDEX idx_payout_requests_status ON payout_requests(status);
CREATE INDEX idx_payout_requests_serial_number ON payout_requests(serial_number);
CREATE INDEX idx_payout_requests_created_at ON payout_requests(created_at);

-- ============================================================
-- 5. CONTRIBUTION LEDGER TABLE (P2P CONTRIBUTIONS)
-- ============================================================
CREATE TABLE IF NOT EXISTS contribution_ledger (
  id BIGSERIAL PRIMARY KEY,
  participant_id BIGINT REFERENCES participants(id),
  participant_email VARCHAR(255),
  payment_id BIGINT,
  payment_submission_id BIGINT,
  payout_id BIGINT,
  payout_request_id BIGINT,
  payment_amount DECIMAL(15, 2),
  payout_amount DECIMAL(15, 2),
  credit_amount DECIMAL(15, 2),
  match_status VARCHAR(50) DEFAULT 'pending',
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contribution_ledger_email ON contribution_ledger(participant_email);
CREATE INDEX idx_contribution_ledger_match_status ON contribution_ledger(match_status);

-- ============================================================
-- 6. TOPUP REQUESTS TABLE (BALANCE TOP-UPS)
-- ============================================================
CREATE TABLE IF NOT EXISTS topup_requests (
  id BIGSERIAL PRIMARY KEY,
  participant_id BIGINT REFERENCES participants(id),
  participant_email VARCHAR(255),
  amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_topup_requests_email ON topup_requests(participant_email);
CREATE INDEX idx_topup_requests_status ON topup_requests(status);

-- ============================================================
-- 7. TRANSACTIONS TABLE (FINANCIAL HISTORY)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  participant_id BIGINT REFERENCES participants(id),
  participant_email VARCHAR(255),
  type VARCHAR(50),
  amount DECIMAL(15, 2) NOT NULL,
  balance_before DECIMAL(15, 2),
  balance_after DECIMAL(15, 2),
  status VARCHAR(50) DEFAULT 'completed',
  description TEXT,
  reference_id VARCHAR(255),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_participant_email ON transactions(participant_email);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- ============================================================
-- 8. ACTIVITY LOGS TABLE (AUDIT TRAIL)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_email VARCHAR(255),
  actor_id BIGINT,
  action VARCHAR(100),
  target_type VARCHAR(100),
  details TEXT,
  description TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_logs_actor_email ON activity_logs(actor_email);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- ============================================================
-- 9. INVITE LOGS TABLE (REFERRAL TRACKING)
-- ============================================================
CREATE TABLE IF NOT EXISTS invite_logs (
  id BIGSERIAL PRIMARY KEY,
  participant_id BIGINT REFERENCES participants(id),
  participant_email VARCHAR(255),
  invited_email VARCHAR(255),
  status VARCHAR(50),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invite_logs_participant_email ON invite_logs(participant_email);
CREATE INDEX idx_invite_logs_invited_email ON invite_logs(invited_email);

-- ============================================================
-- 10. MOBILE VERIFICATION OTPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS mobile_verification_otps (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255),
  otp VARCHAR(10),
  is_used BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX idx_mobile_verification_otps_email ON mobile_verification_otps(email);

-- ============================================================
-- 11. NOTIFICATIONS TABLE (USER NOTIFICATIONS)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_email VARCHAR(255),
  type VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  read_status BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_email ON notifications(user_email);
CREATE INDEX idx_notifications_read_status ON notifications(read_status);

-- ============================================================
-- 12. WALLET POOL TABLE (WALLET MANAGEMENT)
-- ============================================================
CREATE TABLE IF NOT EXISTS wallet_pool (
  id BIGSERIAL PRIMARY KEY,
  wallet_address VARCHAR(100) UNIQUE NOT NULL,
  bep20_address VARCHAR(100),
  assigned_to BIGINT REFERENCES participants(id),
  assigned_to_email VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallet_pool_assigned_to ON wallet_pool(assigned_to);
CREATE INDEX idx_wallet_pool_assigned_to_email ON wallet_pool(assigned_to_email);
CREATE INDEX idx_wallet_pool_is_active ON wallet_pool(is_active);

-- ============================================================
-- 13. AUDIT LOGS TABLE (ADMIN AUDIT TRAIL)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  action VARCHAR(100),
  description TEXT,
  admin_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_admin_email ON audit_logs(admin_email);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- ============================================================
-- 14. ADMIN USERS TABLE (ADMIN CREDENTIALS)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_users_email ON admin_users(email);

-- ============================================================
-- INSERT SAMPLE DATA (OPTIONAL)
-- ============================================================

-- Insert sample admin user
INSERT INTO admin_users (email, password_hash, full_name, role, is_active)
VALUES ('admin@pyramid.com', '$2b$10$admin_hash_here', 'Admin User', 'admin', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- ADD ADDITIONAL CONSTRAINTS IF NEEDED
-- ============================================================

ALTER TABLE participants ADD CONSTRAINT chk_status CHECK (status IN ('pending', 'active', 'suspended', 'deactivated'));
ALTER TABLE predictions ADD CONSTRAINT chk_prediction_status CHECK (status IN ('pending', 'completed', 'cancelled'));
ALTER TABLE payment_submissions ADD CONSTRAINT chk_payment_status CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE payout_requests ADD CONSTRAINT chk_payout_status CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled'));
ALTER TABLE topup_requests ADD CONSTRAINT chk_topup_status CHECK (status IN ('pending', 'approved', 'rejected'));

-- ============================================================
-- DATABASE SETUP COMPLETE
-- 14 TABLES WITH FULL SCHEMA
-- ============================================================
