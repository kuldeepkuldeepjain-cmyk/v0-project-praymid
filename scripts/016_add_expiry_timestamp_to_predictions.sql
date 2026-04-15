-- Add expiry_timestamp column to predictions table
-- This allows for duration-based trade settlements

-- Add the expiry_timestamp column
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS expiry_timestamp TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN predictions.expiry_timestamp IS 'The timestamp when the prediction should be automatically settled';

-- Create index for faster queries on pending predictions nearing expiry
CREATE INDEX IF NOT EXISTS idx_predictions_expiry_pending 
ON predictions(expiry_timestamp) 
WHERE status = 'pending';

-- For existing predictions without expiry_timestamp, calculate it from created_at and timeframe_seconds
UPDATE predictions
SET expiry_timestamp = created_at + (INTERVAL '1 second' * COALESCE(timeframe_seconds, 60))
WHERE expiry_timestamp IS NULL AND created_at IS NOT NULL;
