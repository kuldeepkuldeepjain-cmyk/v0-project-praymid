ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS challenge_plan_key TEXT,
  ADD COLUMN IF NOT EXISTS challenge_status TEXT DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS challenge_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS challenge_passed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS challenge_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS challenge_peak_equity NUMERIC,
  ADD COLUMN IF NOT EXISTS challenge_day_start_equity NUMERIC,
  ADD COLUMN IF NOT EXISTS challenge_day_start_date DATE,
  ADD COLUMN IF NOT EXISTS challenge_trading_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS challenge_last_trading_date DATE,
  DROP CONSTRAINT IF EXISTS participants_account_type_check,
  ADD CONSTRAINT participants_account_type_check
    CHECK (account_type IN ('normal', 'funded', 'challenge'));
