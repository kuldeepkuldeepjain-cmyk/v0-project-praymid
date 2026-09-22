-- Complete the prediction trade contract used by the participant API and settlement worker.
-- All columns are nullable so existing prediction rows remain valid.

ALTER TABLE predictions ADD COLUMN IF NOT EXISTS entry_price NUMERIC;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS expiry_at TIMESTAMPTZ;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS timeframe_seconds INTEGER;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS balance_source TEXT;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS target_price NUMERIC;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

UPDATE predictions
SET expiry_at = created_at + (INTERVAL '1 second' * COALESCE(timeframe_seconds, 60))
WHERE expiry_at IS NULL AND created_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_predictions_expiry_at_pending
ON predictions(expiry_at)
WHERE status = 'pending';
