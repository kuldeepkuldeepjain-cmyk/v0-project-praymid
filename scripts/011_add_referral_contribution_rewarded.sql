-- Track whether the referrer has already been paid $5 for this participant's
-- first completed contribution cycle. Prevents double-paying on re-submissions.
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS referral_contribution_rewarded BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN participants.referral_contribution_rewarded IS
  'Set to TRUE once the participant completes their first approved P2P contribution cycle, triggering the $5 referral credit to their referrer.';
