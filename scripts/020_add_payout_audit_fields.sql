-- Preserve the account balance around each payout request for auditability.
ALTER TABLE payout_requests
  ADD COLUMN IF NOT EXISTS wallet_balance_before NUMERIC,
  ADD COLUMN IF NOT EXISTS wallet_balance_after NUMERIC,
  ADD COLUMN IF NOT EXISTS redirect_to_serial TEXT;

CREATE INDEX IF NOT EXISTS idx_payout_requests_created_at
  ON payout_requests(created_at DESC);
