-- Add redirect_to_serial column to payout_requests table
-- This allows admin to pre-assign payouts to users by serial number
-- even before those users create accounts

ALTER TABLE payout_requests
ADD COLUMN IF NOT EXISTS redirect_to_serial VARCHAR(20);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payout_requests_redirect_serial 
ON payout_requests(redirect_to_serial) 
WHERE redirect_to_serial IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN payout_requests.redirect_to_serial IS 'Serial number of the user who should see this payout address on their contribution page. Can be set before the user exists.';
