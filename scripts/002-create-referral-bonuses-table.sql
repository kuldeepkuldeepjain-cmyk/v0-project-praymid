-- Create referral_bonuses table to track one-time referral bonuses
-- This ensures each referred user only gives $5 bonus to referrer once

CREATE TABLE IF NOT EXISTS referral_bonuses (
  id SERIAL PRIMARY KEY,
  referred_email VARCHAR(255) NOT NULL,
  referrer_id INTEGER NOT NULL,
  bonus_amount DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
  given_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(referred_email, referrer_id),
  FOREIGN KEY (referrer_id) REFERENCES participants(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referred_email ON referral_bonuses(referred_email);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referrer_id ON referral_bonuses(referrer_id);
