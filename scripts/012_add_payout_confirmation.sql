-- Add payout confirmation and dispute columns to payout_requests
ALTER TABLE payout_requests
  ADD COLUMN IF NOT EXISTS participant_confirmed boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamp without time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dispute_reason text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dispute_raised_at timestamp without time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dispute_status character varying DEFAULT NULL;
