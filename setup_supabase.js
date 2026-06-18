const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Arpit@881150@db.hcvmiblkklcrkwthraxw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const setupSQL = `
-- 1. PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS participants (
  id SERIAL PRIMARY KEY,
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
  otp_verified_at TIMESTAMP,
  rank VARCHAR(50),
  serial_number VARCHAR(50),
  last_login TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. PREDICTIONS TABLE
CREATE TABLE IF NOT EXISTS predictions (
  id SERIAL PRIMARY KEY,
  participant_id INT NOT NULL REFERENCES participants(id),
  amount DECIMAL(15, 2) NOT NULL,
  prediction_type VARCHAR(50),
  result VARCHAR(50),
  profit_loss DECIMAL(15, 2) DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. PAYMENT SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS payment_submissions (
  id SERIAL PRIMARY KEY,
  participant_id INT REFERENCES participants(id),
  participant_email VARCHAR(255),
  amount DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  matched_payout_id VARCHAR(100),
  matched_at TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. PAYOUT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS payout_requests (
  id SERIAL PRIMARY KEY,
  participant_id INT REFERENCES participants(id),
  participant_email VARCHAR(255),
  amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. CONTRIBUTION LEDGER TABLE
CREATE TABLE IF NOT EXISTS contribution_ledger (
  id SERIAL PRIMARY KEY,
  participant_id INT REFERENCES participants(id),
  participant_email VARCHAR(255),
  payment_id VARCHAR(100),
  payout_id VARCHAR(100),
  payment_amount DECIMAL(15, 2),
  payout_amount DECIMAL(15, 2),
  match_status VARCHAR(50) DEFAULT 'pending',
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. TOPUP REQUESTS TABLE
CREATE TABLE IF NOT EXISTS topup_requests (
  id SERIAL PRIMARY KEY,
  participant_id INT REFERENCES participants(id),
  participant_email VARCHAR(255),
  amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  participant_id INT REFERENCES participants(id),
  amount DECIMAL(15, 2) NOT NULL,
  type VARCHAR(50),
  description TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  actor_id INT REFERENCES participants(id),
  action VARCHAR(100),
  description TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. INVITE LOGS TABLE
CREATE TABLE IF NOT EXISTS invite_logs (
  id SERIAL PRIMARY KEY,
  participant_id INT REFERENCES participants(id),
  invited_email VARCHAR(255),
  status VARCHAR(50),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. MOBILE VERIFICATION OTPS TABLE
CREATE TABLE IF NOT EXISTS mobile_verification_otps (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255),
  otp VARCHAR(10),
  is_used BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- 11. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255),
  title VARCHAR(255),
  message TEXT,
  type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. WALLET POOL TABLE
CREATE TABLE IF NOT EXISTS wallet_pool (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(100) UNIQUE NOT NULL,
  assigned_to INT REFERENCES participants(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. ADMIN USERS TABLE
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);
CREATE INDEX IF NOT EXISTS idx_participants_created_at ON participants(created_at);
CREATE INDEX IF NOT EXISTS idx_predictions_participant_id ON predictions(participant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_topups_status ON topup_requests(status);
CREATE INDEX IF NOT EXISTS idx_transactions_participant_id ON transactions(participant_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_id ON activity_logs(actor_id);
`;

(async () => {
  try {
    console.log('[v0] ============ SUPABASE DATABASE SETUP ============\n');
    console.log('[v0] Connecting to Supabase...');
    
    // Split by semicolon and execute each statement
    const statements = setupSQL.split(';').filter(s => s.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement.length > 0) {
        console.log('[v0] Executing statement ' + (i + 1) + '/' + statements.length + '...');
        await pool.query(statement);
      }
    }
    
    console.log('\n[v0] ✓ ALL TABLES CREATED SUCCESSFULLY');
    
    // Get table list
    console.log('\n[v0] ============ CREATED TABLES ============\n');
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    tables.rows.forEach((row, idx) => {
      console.log((idx + 1) + '. ' + row.table_name);
    });
    
    console.log('\n[v0] Total tables: ' + tables.rows.length);
    
    console.log('\n[v0] ============ DATABASE SETUP COMPLETE ============\n');
    
    pool.end();
  } catch (error) {
    console.error('[v0] Error:', error.message);
    console.error('[v0] Stack:', error.stack);
    process.exit(1);
  }
})();
