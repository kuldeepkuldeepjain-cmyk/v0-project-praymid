-- Create payment_submissions table to store all payment proofs
DROP TABLE IF EXISTS payment_submissions CASCADE;

CREATE TABLE payment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_email VARCHAR(255) NOT NULL,
  participant_wallet VARCHAR(255) NOT NULL,
  participant_name VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
  payment_method VARCHAR(20) NOT NULL DEFAULT 'bep20',
  -- Changed screenshot_url to screenshot_data to store base64 image data
  screenshot_data TEXT NOT NULL,
  -- Added transaction_hash field to store blockchain transaction hash
  transaction_hash VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  reviewed_by VARCHAR(255),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_payment_submissions_email ON payment_submissions(participant_email);
CREATE INDEX idx_payment_submissions_status ON payment_submissions(status);
CREATE INDEX idx_payment_submissions_created ON payment_submissions(created_at DESC);
-- Added index for transaction hash lookups
CREATE INDEX idx_payment_submissions_txhash ON payment_submissions(transaction_hash);

-- Row Level Security
ALTER TABLE payment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on payment_submissions" ON payment_submissions
FOR ALL USING (true);
