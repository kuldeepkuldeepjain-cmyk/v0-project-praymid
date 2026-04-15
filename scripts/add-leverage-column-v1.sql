-- Add leverage column to predictions table
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS leverage INTEGER DEFAULT 1;
