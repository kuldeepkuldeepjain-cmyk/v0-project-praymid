-- Keep participant blotter reads and live-trade updates index-backed.
CREATE INDEX IF NOT EXISTS idx_forex_trades_participant_updated
  ON forex_trades (participant_email, updated_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_forex_trades_participant_status
  ON forex_trades (participant_email, status);

CREATE INDEX IF NOT EXISTS idx_forex_trades_open_id_participant
  ON forex_trades (id, participant_email)
  WHERE status = 'open';
