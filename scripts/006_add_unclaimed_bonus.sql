-- ============================================================================
-- Migration: Add Unclaimed Bonus System
-- Description: Add unclaimed_bonus column to participants table
-- When a participant registers, they get $50 unclaimed bonus
-- Bonus is claimed when participant contributes (makes their first contribution)
-- ============================================================================

-- Add unclaimed_bonus column to participants table
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS unclaimed_bonus NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_claimed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bonus_claimed_at TIMESTAMP WITH TIME ZONE;

-- Create index for bonus tracking
CREATE INDEX IF NOT EXISTS idx_participants_unclaimed_bonus ON participants(unclaimed_bonus, bonus_claimed);
CREATE INDEX IF NOT EXISTS idx_participants_bonus_claimed ON participants(bonus_claimed);

-- Update existing participants to have $50 unclaimed bonus (only if they haven't contributed yet)
-- Check if they have made any payment submissions (contributions)
UPDATE participants
  SET unclaimed_bonus = 50,
      bonus_claimed = FALSE
  WHERE unclaimed_bonus = 0 
    AND id NOT IN (
      SELECT DISTINCT participant_id 
      FROM payment_submissions 
      WHERE participant_id IS NOT NULL 
        AND status IN ('approved', 'matched', 'completed')
    );

-- Add comment on column for documentation
COMMENT ON COLUMN participants.unclaimed_bonus IS 'Welcome bonus of $50 given to new participants. Claimed when they make their first contribution.';
COMMENT ON COLUMN participants.bonus_claimed IS 'Track whether the participant has claimed their welcome bonus.';
COMMENT ON COLUMN participants.bonus_claimed_at IS 'Timestamp when the participant claimed their welcome bonus.';
