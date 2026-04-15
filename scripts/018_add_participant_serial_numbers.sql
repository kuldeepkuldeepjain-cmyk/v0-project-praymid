-- Add serial_number column to participants table
-- Serial numbers start from FLCN5001 and auto-increment

-- Add the column if it doesn't exist
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS serial_number TEXT UNIQUE;

-- Create a sequence starting from 5001
CREATE SEQUENCE IF NOT EXISTS participant_serial_seq START WITH 5001;

-- Create a function to generate serial numbers
CREATE OR REPLACE FUNCTION generate_participant_serial()
RETURNS TEXT AS $$
BEGIN
  RETURN 'FLCN' || nextval('participant_serial_seq')::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Update existing participants without serial numbers
UPDATE participants 
SET serial_number = generate_participant_serial()
WHERE serial_number IS NULL;

-- Create a trigger to auto-generate serial numbers for new participants
CREATE OR REPLACE FUNCTION set_participant_serial()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_participant_serial();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_participant_serial ON participants;
CREATE TRIGGER trigger_set_participant_serial
  BEFORE INSERT ON participants
  FOR EACH ROW
  EXECUTE FUNCTION set_participant_serial();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_participants_serial_number ON participants(serial_number);
