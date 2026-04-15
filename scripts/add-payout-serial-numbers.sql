-- Migration: Add Serial Numbers to Payout Requests
-- Date: January 2026
-- Purpose: Add unique serial number tracking to payout requests

-- Step 1: Add new columns one by one
DO $$ 
BEGIN
  -- Add columns only if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payout_requests' AND column_name='serial_number') THEN
    ALTER TABLE payout_requests ADD COLUMN serial_number VARCHAR(20) UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payout_requests' AND column_name='sequence_number') THEN
    ALTER TABLE payout_requests ADD COLUMN sequence_number INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payout_requests' AND column_name='request_year') THEN
    ALTER TABLE payout_requests ADD COLUMN request_year INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payout_requests' AND column_name='priority') THEN
    ALTER TABLE payout_requests ADD COLUMN priority VARCHAR(20) DEFAULT 'normal';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payout_requests' AND column_name='processing_started_at') THEN
    ALTER TABLE payout_requests ADD COLUMN processing_started_at TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payout_requests' AND column_name='approved_at') THEN
    ALTER TABLE payout_requests ADD COLUMN approved_at TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payout_requests' AND column_name='completed_at') THEN
    ALTER TABLE payout_requests ADD COLUMN completed_at TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payout_requests' AND column_name='processing_admin_id') THEN
    ALTER TABLE payout_requests ADD COLUMN processing_admin_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payout_requests' AND column_name='rejection_reason') THEN
    ALTER TABLE payout_requests ADD COLUMN rejection_reason TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payout_requests' AND column_name='attempts') THEN
    ALTER TABLE payout_requests ADD COLUMN attempts INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payout_requests' AND column_name='last_attempt_at') THEN
    ALTER TABLE payout_requests ADD COLUMN last_attempt_at TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payout_requests' AND column_name='participant_username') THEN
    ALTER TABLE payout_requests ADD COLUMN participant_username VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payout_requests' AND column_name='participant_id') THEN
    ALTER TABLE payout_requests ADD COLUMN participant_id UUID;
  END IF;
END $$;

-- Step 2: Create function to generate serial numbers (increment by 2 for odd numbers only)
CREATE OR REPLACE FUNCTION generate_payout_serial()
RETURNS TRIGGER AS $$
DECLARE
  year_suffix TEXT;
  sequence INT;
  new_serial TEXT;
BEGIN
  -- Get current year (last 2 digits)
  year_suffix := SUBSTRING(EXTRACT(YEAR FROM NEW.requested_at)::TEXT FROM 3 FOR 2);
  
  -- Get the highest sequence number for this year and add 2 (to maintain odd numbers)
  -- If no records exist, start with 1
  SELECT COALESCE(MAX(sequence_number), -1) + 2 
  INTO sequence
  FROM payout_requests
  WHERE request_year = EXTRACT(YEAR FROM NEW.requested_at);
  
  -- Generate serial number: FLCN + YY + sequence padded to 3 digits
  new_serial := 'FLCN' || year_suffix || LPAD(sequence::TEXT, 3, '0');
  
  -- Set the values
  NEW.serial_number := new_serial;
  NEW.sequence_number := sequence;
  NEW.request_year := EXTRACT(YEAR FROM NEW.requested_at);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to auto-generate serial numbers
DROP TRIGGER IF EXISTS trg_generate_payout_serial ON payout_requests;
CREATE TRIGGER trg_generate_payout_serial
  BEFORE INSERT ON payout_requests
  FOR EACH ROW
  WHEN (NEW.serial_number IS NULL)
  EXECUTE FUNCTION generate_payout_serial();

-- Step 4: Update existing records with serial numbers (odd numbers only: 1, 3, 5, 7, etc.)
DO $$
DECLARE
  rec RECORD;
  year_suffix TEXT;
  sequence INT := 1; -- Start with 1 (first odd number)
  prev_year INT := 0;
BEGIN
  -- First, clear existing serial numbers to regenerate them
  UPDATE payout_requests SET serial_number = NULL, sequence_number = NULL, request_year = NULL;
  
  FOR rec IN 
    SELECT id, requested_at 
    FROM payout_requests 
    ORDER BY requested_at ASC
  LOOP
    -- Reset sequence to 1 if year changes
    IF EXTRACT(YEAR FROM rec.requested_at) <> prev_year THEN
      sequence := 1;
      prev_year := EXTRACT(YEAR FROM rec.requested_at);
    END IF;
    
    year_suffix := SUBSTRING(EXTRACT(YEAR FROM rec.requested_at)::TEXT FROM 3 FOR 2);
    
    UPDATE payout_requests
    SET 
      serial_number = 'FLCN' || year_suffix || LPAD(sequence::TEXT, 3, '0'),
      sequence_number = sequence,
      request_year = EXTRACT(YEAR FROM rec.requested_at)
    WHERE id = rec.id;
    
    -- Increment by 2 to get next odd number
    sequence := sequence + 2;
  END LOOP;
END $$;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payout_serial_number ON payout_requests(serial_number);
CREATE INDEX IF NOT EXISTS idx_payout_participant_email ON payout_requests(participant_email);
CREATE INDEX IF NOT EXISTS idx_payout_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_request_year ON payout_requests(request_year);
CREATE INDEX IF NOT EXISTS idx_payout_requested_at ON payout_requests(requested_at DESC);

-- Step 6: Create audit log table
CREATE TABLE IF NOT EXISTS payout_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id INTEGER,
  serial_number VARCHAR(20),
  admin_id UUID,
  admin_email VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_payout_id ON payout_audit_logs(payout_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON payout_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_serial ON payout_audit_logs(serial_number);

-- Step 7: Verification query
SELECT 
  'Migration Complete' as status,
  COUNT(*) as total_payouts,
  COUNT(DISTINCT serial_number) as unique_serials,
  MIN(serial_number) as first_serial,
  MAX(serial_number) as last_serial
FROM payout_requests;
