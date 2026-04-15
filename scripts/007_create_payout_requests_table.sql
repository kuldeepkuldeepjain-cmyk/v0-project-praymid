-- Create payout_requests table to track all payout requests
CREATE TABLE IF NOT EXISTS payout_requests (
  id SERIAL PRIMARY KEY,
  participant_email VARCHAR(255) NOT NULL,
  participant_name VARCHAR(255),
  bep20_address VARCHAR(255) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  wallet_balance_before NUMERIC(10, 2) NOT NULL,
  wallet_balance_after NUMERIC(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  transaction_hash VARCHAR(255),
  admin_notes TEXT,
  FOREIGN KEY (participant_email) REFERENCES participants(email) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payout_requests_email ON payout_requests(participant_email);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
