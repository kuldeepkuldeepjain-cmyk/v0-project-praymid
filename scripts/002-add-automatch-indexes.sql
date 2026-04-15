-- Add performance indexes for automatch queries
-- These indexes optimize the matching process and status lookups

-- Index for finding pending contributions older than 30 minutes
CREATE INDEX IF NOT EXISTS idx_payment_submissions_pending_created 
  ON payment_submissions(created_at, status) 
  WHERE status = 'pending'
  AND matched_payout_id IS NULL;

-- Index for finding available payouts
CREATE INDEX IF NOT EXISTS idx_payout_requests_pending_created 
  ON payout_requests(created_at, status) 
  WHERE status = 'request_pending'
  AND matched_contribution_id IS NULL;

-- Index for checking contribution status by email
CREATE INDEX IF NOT EXISTS idx_payment_submissions_email_status 
  ON payment_submissions(participant_email, status, matched_at DESC);

-- Index for checking payout status by email
CREATE INDEX IF NOT EXISTS idx_payout_requests_email_status 
  ON payout_requests(participant_email, status, matched_at DESC);

-- Index for finding matched pairs quickly
CREATE INDEX IF NOT EXISTS idx_payment_submissions_matched_payout 
  ON payment_submissions(matched_payout_id) 
  WHERE matched_payout_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payout_requests_matched_contribution 
  ON payout_requests(matched_contribution_id) 
  WHERE matched_contribution_id IS NOT NULL;

-- Composite index for automatch eligibility checks
CREATE INDEX IF NOT EXISTS idx_payment_submissions_automatch_check 
  ON payment_submissions(status, created_at, matched_payout_id);

CREATE INDEX IF NOT EXISTS idx_payout_requests_automatch_check 
  ON payout_requests(status, created_at, matched_contribution_id);

-- Analyze tables to update statistics
ANALYZE payment_submissions;
ANALYZE payout_requests;
