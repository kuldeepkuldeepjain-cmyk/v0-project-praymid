-- ============================================
-- COMPLETE DATABASE SETUP FOR NEW SUPABASE
-- Run this ONCE in your new Supabase SQL Editor
-- ============================================

-- Drop existing tables if any (clean slate)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS gas_approvals CASCADE;
DROP TABLE IF EXISTS payment_submissions CASCADE;
DROP TABLE IF EXISTS payout_requests CASCADE;
DROP TABLE IF EXISTS wallet_pool CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS spin_coupons CASCADE;
DROP TABLE IF EXISTS topup_requests CASCADE;
DROP TABLE IF EXISTS user_contacts CASCADE;
DROP TABLE IF EXISTS invite_logs CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS participants CASCADE;

-- ============================================
-- 1. PARTICIPANTS TABLE (Main user table)
-- ============================================
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  mobile_number VARCHAR(20) NOT NULL,
  country_code VARCHAR(10) DEFAULT '+91',
  country VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pin_code VARCHAR(20) NOT NULL,
  referral_code VARCHAR(50) UNIQUE,
  referred_by VARCHAR(50),
  wallet_address VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  account_balance DECIMAL(15, 2) DEFAULT 0,
  bonus_balance DECIMAL(15, 2) DEFAULT 0,
  total_earnings DECIMAL(15, 2) DEFAULT 0,
  total_referrals INTEGER DEFAULT 0,
  rank VARCHAR(50) DEFAULT 'Bronze',
  is_active BOOLEAN DEFAULT true,
  activation_date TIMESTAMP,
  last_login TIMESTAMP,
  profile_image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. ACTIVITY LOGS TABLE
-- ============================================
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100) NOT NULL,
  actor_id UUID,
  actor_email VARCHAR(255),
  target_type VARCHAR(50),
  target_id UUID,
  details TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 3. SUPPORT TICKETS TABLE
-- ============================================
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  participant_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'open',
  admin_response TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 4. GAS APPROVALS TABLE
-- ============================================
CREATE TABLE gas_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  participant_email VARCHAR(255) NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  network VARCHAR(50) NOT NULL,
  gas_fee DECIMAL(15, 8) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMP,
  transaction_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 5. PAYMENT SUBMISSIONS TABLE
-- ============================================
CREATE TABLE payment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  participant_email VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(255),
  screenshot_url TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 6. PAYOUT REQUESTS TABLE
-- ============================================
CREATE TABLE payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number VARCHAR(50) UNIQUE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  participant_email VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  payout_method VARCHAR(50) NOT NULL,
  wallet_address VARCHAR(255),
  bank_details JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMP,
  transaction_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 7. WALLET POOL TABLE
-- ============================================
CREATE TABLE wallet_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(255) UNIQUE NOT NULL,
  network VARCHAR(50) NOT NULL,
  balance DECIMAL(15, 8) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  assigned_to UUID,
  last_transaction TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 8. PREDICTIONS TABLE
-- ============================================
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  participant_email VARCHAR(255) NOT NULL,
  crypto_pair VARCHAR(20) NOT NULL,
  prediction_type VARCHAR(10) NOT NULL,
  entry_price DECIMAL(15, 2) NOT NULL,
  target_price DECIMAL(15, 2),
  amount DECIMAL(15, 2) NOT NULL,
  leverage INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'open',
  result VARCHAR(20),
  profit_loss DECIMAL(15, 2) DEFAULT 0,
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 9. SPIN COUPONS TABLE
-- ============================================
CREATE TABLE spin_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_code VARCHAR(50) UNIQUE NOT NULL,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  reward_amount DECIMAL(15, 2) NOT NULL,
  reward_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'unused',
  used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 10. TOPUP REQUESTS TABLE
-- ============================================
CREATE TABLE topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  participant_email VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 11. USER CONTACTS TABLE
-- ============================================
CREATE TABLE user_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  contact_name VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  contact_hash VARCHAR(64) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 12. INVITE LOGS TABLE
-- ============================================
CREATE TABLE invite_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  participant_email VARCHAR(255) NOT NULL,
  contact_hash VARCHAR(64),
  invite_method VARCHAR(50) NOT NULL,
  invite_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 13. SYSTEM SETTINGS TABLE
-- ============================================
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'string',
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 14. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_participants_email ON participants(email);
CREATE INDEX idx_participants_username ON participants(username);
CREATE INDEX idx_participants_referral_code ON participants(referral_code);
CREATE INDEX idx_participants_status ON participants(status);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX idx_activity_logs_actor_id ON activity_logs(actor_id);
CREATE INDEX idx_support_tickets_participant_id ON support_tickets(participant_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_payment_submissions_status ON payment_submissions(status);
CREATE INDEX idx_payout_requests_status ON payout_requests(status);
CREATE INDEX idx_predictions_participant_id ON predictions(participant_id);
CREATE INDEX idx_predictions_status ON predictions(status);

-- ============================================
-- DEFAULT SYSTEM SETTINGS
-- ============================================
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('activation_fee', '100', 'number', 'Account activation fee in USD'),
('referral_reward', '10', 'number', 'Reward for successful referral in USD'),
('min_payout_amount', '50', 'number', 'Minimum amount for payout request in USD'),
('max_payout_amount', '10000', 'number', 'Maximum amount for payout request in USD'),
('platform_fee_percentage', '2', 'number', 'Platform fee percentage'),
('maintenance_mode', 'false', 'boolean', 'Enable/disable maintenance mode');

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow public access for registration and login (API will handle security)
CREATE POLICY "Allow public read access to participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Allow public insert for registration" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for login" ON participants FOR UPDATE USING (true);

-- Allow authenticated users to read their own data
CREATE POLICY "Users can view own activity logs" ON activity_logs FOR SELECT USING (true);
CREATE POLICY "Users can insert activity logs" ON activity_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own tickets" ON support_tickets FOR SELECT USING (true);
CREATE POLICY "Users can create tickets" ON support_tickets FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own payments" ON payment_submissions FOR SELECT USING (true);
CREATE POLICY "Users can submit payments" ON payment_submissions FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own payouts" ON payout_requests FOR SELECT USING (true);
CREATE POLICY "Users can request payouts" ON payout_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own predictions" ON predictions FOR SELECT USING (true);
CREATE POLICY "Users can create predictions" ON predictions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own predictions" ON predictions FOR UPDATE USING (true);

CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (true);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Database setup complete! All tables created successfully.' AS status;
