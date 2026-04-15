-- Add referral_reward_claimed column to participants table
-- This tracks whether the user has claimed the 50 referral reward

ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS referral_reward_claimed BOOLEAN DEFAULT FALSE;

-- Add comment to column
COMMENT ON COLUMN participants.referral_reward_claimed IS 'Whether user has claimed the $20 reward for 50 referrals';
