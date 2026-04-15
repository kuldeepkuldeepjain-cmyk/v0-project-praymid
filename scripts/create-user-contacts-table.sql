-- Create user_contacts table for storing synced contacts
CREATE TABLE IF NOT EXISTS user_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_contacts_user_id ON user_contacts(user_id);

-- Add contact_sync_bonus column to participants if it doesn't exist
ALTER TABLE participants ADD COLUMN IF NOT EXISTS contact_sync_bonus BOOLEAN DEFAULT FALSE;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS contacts_synced_at TIMESTAMP WITH TIME ZONE;

COMMIT;
