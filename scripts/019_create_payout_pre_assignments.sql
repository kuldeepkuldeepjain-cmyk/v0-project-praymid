-- Create payout pre-assignments table
-- This allows admins to pre-assign which user serial numbers will fund which payout requests

CREATE TABLE IF NOT EXISTS payout_pre_assignments (
  id SERIAL PRIMARY KEY,
  payout_request_id INTEGER REFERENCES payout_requests(id) ON DELETE CASCADE,
  assigned_serial_number TEXT NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by TEXT,
  status TEXT DEFAULT 'pending',
  fulfilled_at TIMESTAMP,
  fulfilled_by_email TEXT,
  notes TEXT,
  UNIQUE(payout_request_id),
  UNIQUE(assigned_serial_number)
);

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_payout_pre_assignments_serial ON payout_pre_assignments(assigned_serial_number);
CREATE INDEX IF NOT EXISTS idx_payout_pre_assignments_status ON payout_pre_assignments(status);

-- Add comment
COMMENT ON TABLE payout_pre_assignments IS 'Pre-assigns user serial numbers to specific payout requests before users create accounts';
