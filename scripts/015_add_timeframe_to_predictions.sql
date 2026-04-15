-- Add timeframe_seconds column to predictions table
ALTER TABLE predictions 
ADD COLUMN IF NOT EXISTS timeframe_seconds INTEGER DEFAULT 60;

-- Add comment to explain the column
COMMENT ON COLUMN predictions.timeframe_seconds IS 'Duration in seconds for the prediction to remain active before auto-settlement';
