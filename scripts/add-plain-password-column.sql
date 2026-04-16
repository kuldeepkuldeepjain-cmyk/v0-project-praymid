-- Add plain_password column to participants table so admins can view original passwords
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS plain_password character varying;
