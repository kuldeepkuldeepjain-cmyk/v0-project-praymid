-- Add contact_hash column to invite_logs for SHA-256 phone number matching
ALTER TABLE invite_logs ADD COLUMN IF NOT EXISTS contact_hash TEXT;

-- Create index for fast lookups during registration
CREATE INDEX IF NOT EXISTS idx_invite_logs_contact_hash ON invite_logs(contact_hash);

-- Add composite index for efficient status updates
CREATE INDEX IF NOT EXISTS idx_invite_logs_user_status ON invite_logs(user_id, status);

COMMIT;
