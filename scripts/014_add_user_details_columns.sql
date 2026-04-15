-- Add user detail fields to participants table
-- These fields are mandatory before user can access the dashboard

ALTER TABLE participants
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS full_address TEXT,
ADD COLUMN IF NOT EXISTS details_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS details_submitted_at TIMESTAMP;

-- Update existing users to have details_completed as false
UPDATE participants 
SET details_completed = FALSE 
WHERE details_completed IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_participants_details_completed ON participants(details_completed);

COMMENT ON COLUMN participants.full_name IS 'User full name (mandatory)';
COMMENT ON COLUMN participants.full_address IS 'User full address (mandatory)';
COMMENT ON COLUMN participants.details_completed IS 'Whether user has completed mandatory details';
COMMENT ON COLUMN participants.details_submitted_at IS 'Timestamp when user submitted details';
