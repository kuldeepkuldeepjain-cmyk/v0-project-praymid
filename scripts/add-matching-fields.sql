-- Add matching fields to payment_submissions and payout_requests tables

-- Add matched_payout_id to payment_submissions to track which payout it's matched with
ALTER TABLE payment_submissions 
ADD COLUMN IF NOT EXISTS matched_payout_id uuid REFERENCES payout_requests(id);

-- Add matched_contribution_id to payout_requests to track which contribution it's matched with
ALTER TABLE payout_requests 
ADD COLUMN IF NOT EXISTS matched_contribution_id uuid REFERENCES payment_submissions(id);

-- Add matched_at timestamp to track when the match was made
ALTER TABLE payment_submissions 
ADD COLUMN IF NOT EXISTS matched_at timestamp without time zone;

ALTER TABLE payout_requests 
ADD COLUMN IF NOT EXISTS matched_at timestamp without time zone;

-- Add closed_at timestamp to payment_submissions if not exists
ALTER TABLE payment_submissions 
ADD COLUMN IF NOT EXISTS closed_at timestamp without time zone;
