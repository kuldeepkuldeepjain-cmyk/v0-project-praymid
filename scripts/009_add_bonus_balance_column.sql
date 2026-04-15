-- Add bonus_balance column to participants table
ALTER TABLE participants ADD COLUMN IF NOT EXISTS bonus_balance NUMERIC DEFAULT 0;

-- Update existing participants to have 0 bonus balance
UPDATE participants SET bonus_balance = 0 WHERE bonus_balance IS NULL;
