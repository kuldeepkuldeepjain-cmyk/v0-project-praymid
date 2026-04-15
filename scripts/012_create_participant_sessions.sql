-- Create participant_sessions table for single-device login
CREATE TABLE IF NOT EXISTS participant_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  participant_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  is_active BOOLEAN DEFAULT TRUE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_participant_sessions_participant_id ON participant_sessions(participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_sessions_token ON participant_sessions(token);
CREATE INDEX IF NOT EXISTS idx_participant_sessions_is_active ON participant_sessions(is_active);

-- Add participant_sessions_only_one_active policy to ensure only one active session per participant
-- (handled in application code since Supabase RLS doesn't support cross-row constraints)
