-- Add redirect_to_email column to payout_requests table
-- This column stores which user should see this payout address on their contribution page

ALTER TABLE payout_requests 
ADD COLUMN IF NOT EXISTS redirect_to_email TEXT;

-- Add index for faster lookups when finding redirected payouts for a specific user
CREATE INDEX IF NOT EXISTS idx_payout_requests_redirect_to_email 
ON payout_requests(redirect_to_email) 
WHERE redirect_to_email IS NOT NULL;

-- Add comment to column
COMMENT ON COLUMN payout_requests.redirect_to_email IS 'Email of participant who should contribute to this payout address';
