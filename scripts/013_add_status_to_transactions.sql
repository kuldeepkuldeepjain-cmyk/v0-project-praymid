-- Add status column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));

-- Add index for transaction status queries
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Add composite index for efficient email + date queries
CREATE INDEX IF NOT EXISTS idx_transactions_email_date ON transactions(participant_email, created_at DESC);

COMMIT;
