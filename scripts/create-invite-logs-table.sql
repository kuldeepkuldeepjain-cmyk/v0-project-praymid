-- Create invite_logs table for tracking WhatsApp invites
CREATE TABLE IF NOT EXISTS invite_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  contact_id UUID,
  contact_phone TEXT,
  contact_name TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invite_logs_user_id ON invite_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_invite_logs_status ON invite_logs(status);

-- Create user_contacts table if not exists
CREATE TABLE IF NOT EXISTS user_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, contact_phone)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_contacts_user_id ON user_contacts(user_id);
