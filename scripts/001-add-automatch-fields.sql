-- Add automatch fields to payment_submissions table
-- automatch_eligible_at: When the contribution becomes eligible for automatch (30 minutes after submission)
-- matched_at: When the contribution was actually matched with a payout
-- matched_payout_id: Foreign key to the payout_request that was matched

ALTER TABLE payment_submissions
ADD COLUMN IF NOT EXISTS automatch_eligible_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS matched_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS matched_payout_id UUID REFERENCES payout_requests(id);

-- Create index for efficient automatch queries
CREATE INDEX IF NOT EXISTS idx_payment_submissions_automatch 
ON payment_submissions(status, automatch_eligible_at)
WHERE status IN ('pending', 'request_pending');

-- Add matched_contribution_id foreign key to payout_requests if not exists
ALTER TABLE payout_requests
ADD COLUMN IF NOT EXISTS matched_contribution_id UUID REFERENCES payment_submissions(id);

-- Create index for efficient payout-to-contribution lookups
CREATE INDEX IF NOT EXISTS idx_payout_requests_matched_contribution
ON payout_requests(matched_contribution_id);
