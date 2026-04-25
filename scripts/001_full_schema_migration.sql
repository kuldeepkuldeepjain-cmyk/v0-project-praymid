-- ============================================================
-- Praymid Full Schema Migration
-- Run this in your NEW Supabase project's SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. PARTICIPANTS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS participants (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number       SERIAL      UNIQUE,
  full_name           TEXT        NOT NULL,
  username            TEXT        UNIQUE NOT NULL,
  email               TEXT        UNIQUE NOT NULL,
  mobile_number       TEXT        UNIQUE,
  password            TEXT        NOT NULL,
  plain_password      TEXT,                        -- admin-visible copy
  wallet_address      TEXT,
  bep20_address       TEXT,
  country             TEXT        DEFAULT '',
  country_code        TEXT        DEFAULT '',
  state               TEXT        DEFAULT '',
  pin_code            TEXT        DEFAULT '',
  full_address        TEXT        DEFAULT '',
  status              TEXT        DEFAULT 'active',
  rank                TEXT        DEFAULT 'bronze',
  referral_code       TEXT        UNIQUE,
  referred_by         TEXT,
  total_referrals     INTEGER     DEFAULT 0,
  total_earnings      NUMERIC     DEFAULT 0,
  account_balance     NUMERIC     DEFAULT 0,
  bonus_balance       NUMERIC     DEFAULT 0,      -- also used for referral earnings
  is_active           BOOLEAN     DEFAULT TRUE,
  is_frozen           BOOLEAN     DEFAULT FALSE,
  details_completed   BOOLEAN     DEFAULT FALSE,
  activation_date     TIMESTAMPTZ,
  last_login          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 2. MOBILE VERIFICATION OTPs
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mobile_verification_otps (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_number   TEXT        NOT NULL,
  otp_code        TEXT        NOT NULL,
  email           TEXT        NOT NULL,
  is_verified     BOOLEAN     DEFAULT FALSE,
  attempt_count   INTEGER     DEFAULT 0,
  verified_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_mobile ON mobile_verification_otps(mobile_number);

-- ──────────────────────────────────────────────
-- 3. PAYMENT SUBMISSIONS  (contributions)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_submissions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id      UUID        REFERENCES participants(id) ON DELETE SET NULL,
  participant_email   TEXT        NOT NULL,
  amount              NUMERIC     NOT NULL DEFAULT 100,
  payment_method      TEXT        DEFAULT 'USDT_BEP20',
  screenshot_url      TEXT,
  transaction_id      TEXT        UNIQUE,
  status              TEXT        DEFAULT 'pending',
  -- statuses: pending | in_process | confirmed | rejected | matched
  matched_payout_id   UUID,
  matched_at          TIMESTAMPTZ,
  admin_notes         TEXT,
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         TEXT,
  rejection_reason    TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ps_participant   ON payment_submissions(participant_id);
CREATE INDEX IF NOT EXISTS idx_ps_email         ON payment_submissions(participant_email);
CREATE INDEX IF NOT EXISTS idx_ps_status        ON payment_submissions(status);

-- ──────────────────────────────────────────────
-- 4. PAYOUT REQUESTS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payout_requests (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id      UUID        REFERENCES participants(id) ON DELETE SET NULL,
  participant_email   TEXT        NOT NULL,
  wallet_address      TEXT        NOT NULL,
  amount              NUMERIC     NOT NULL,
  payout_method       TEXT        DEFAULT 'BEP20',
  status              TEXT        DEFAULT 'pending',
  -- statuses: pending | processing | completed | rejected | expired
  transaction_hash    TEXT,
  admin_notes         TEXT,
  processed_at        TIMESTAMPTZ,
  processed_by        TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pr_participant ON payout_requests(participant_id);
CREATE INDEX IF NOT EXISTS idx_pr_email       ON payout_requests(participant_email);
CREATE INDEX IF NOT EXISTS idx_pr_status      ON payout_requests(status);

-- Add FK from payment_submissions → payout_requests after both exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_ps_matched_payout'
  ) THEN
    ALTER TABLE payment_submissions
      ADD CONSTRAINT fk_ps_matched_payout
      FOREIGN KEY (matched_payout_id) REFERENCES payout_requests(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ──────────────────────────────────────────────
-- 5. TRANSACTIONS  (ledger entries)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id      UUID        REFERENCES participants(id) ON DELETE SET NULL,
  participant_email   TEXT,
  type                TEXT        NOT NULL,
  -- types: deposit | withdrawal | referral_earning | prediction_bet | prediction_win |
  --        prediction_loss | transfer | topup | payout | bonus | manual_credit
  amount              NUMERIC     NOT NULL,
  description         TEXT,
  reference_id        UUID,
  status              TEXT        DEFAULT 'completed',
  balance_before      NUMERIC,
  balance_after       NUMERIC,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_participant ON transactions(participant_id);
CREATE INDEX IF NOT EXISTS idx_tx_type        ON transactions(type);

-- ──────────────────────────────────────────────
-- 6. PREDICTIONS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id      UUID        REFERENCES participants(id) ON DELETE SET NULL,
  participant_email   TEXT        NOT NULL,
  crypto_pair         TEXT        NOT NULL,
  prediction_type     TEXT        NOT NULL,       -- up | down | binary
  amount              NUMERIC     NOT NULL,
  entry_price         NUMERIC     NOT NULL,
  target_price        NUMERIC,
  leverage            INTEGER     DEFAULT 1,
  profit_loss         NUMERIC     DEFAULT 0,
  result              TEXT,                       -- win | loss | null
  status              TEXT        DEFAULT 'pending',
  -- statuses: pending | active | settled | completed | win | loss | expired
  closed_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pred_participant ON predictions(participant_id);
CREATE INDEX IF NOT EXISTS idx_pred_email       ON predictions(participant_email);
CREATE INDEX IF NOT EXISTS idx_pred_status      ON predictions(status);

-- ──────────────────────────────────────────────
-- 7. TOPUP REQUESTS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS topup_requests (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id      UUID        REFERENCES participants(id) ON DELETE SET NULL,
  participant_email   TEXT        NOT NULL,
  amount              NUMERIC     NOT NULL,
  payment_method      TEXT        DEFAULT 'crypto',
  transaction_id      TEXT        UNIQUE,
  status              TEXT        DEFAULT 'pending',
  -- statuses: pending | approved | completed | failed | rejected
  admin_notes         TEXT,
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topup_participant ON topup_requests(participant_id);
CREATE INDEX IF NOT EXISTS idx_topup_email       ON topup_requests(participant_email);

-- ──────────────────────────────────────────────
-- 8. NOTIFICATIONS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email  TEXT        NOT NULL,
  type        TEXT        DEFAULT 'info',       -- info | warning | success | error
  title       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  read_status BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_email ON notifications(user_email);

-- ──────────────────────────────────────────────
-- 9. ACTIVITY LOGS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action      TEXT        NOT NULL,
  actor_id    TEXT,
  actor_email TEXT,
  target_type TEXT,
  details     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_actor ON activity_logs(actor_email);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_logs(action);

-- ──────────────────────────────────────────────
-- 10. AUDIT LOGS  (admin actions)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action      TEXT        NOT NULL,
  description TEXT,
  admin_email TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 11. WALLET POOL
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_pool (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_to     UUID        REFERENCES participants(id) ON DELETE SET NULL,
  wallet_address  TEXT        NOT NULL,
  network         TEXT        DEFAULT 'BEP20',
  balance         NUMERIC     DEFAULT 0,
  status          TEXT        DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 12. INVITE LOGS
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invite_logs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT        NOT NULL,
  participant_id      UUID        REFERENCES participants(id) ON DELETE SET NULL,
  contact_phone       TEXT,
  contact_name        TEXT,
  contact_hash        TEXT,
  participant_email   TEXT,
  status              TEXT        DEFAULT 'sent',
  sent_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_user ON invite_logs(user_id);

-- ──────────────────────────────────────────────
-- 13. LEADERBOARD (materialized view helper)
-- ──────────────────────────────────────────────
-- Not a separate table — leaderboard is computed from participants.
-- If needed as a cached table in future, add here.

-- ──────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────
-- Enable RLS on all tables that hold user data.
-- Service role bypasses RLS, so all server-side routes work fine.
-- These policies protect against direct client access.

ALTER TABLE participants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_verification_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_submissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE topup_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_pool             ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_logs             ENABLE ROW LEVEL SECURITY;

-- Deny all direct client access (service role still bypasses these)
CREATE POLICY "deny_all_participants"             ON participants             FOR ALL USING (false);
CREATE POLICY "deny_all_otps"                    ON mobile_verification_otps FOR ALL USING (false);
CREATE POLICY "deny_all_payment_submissions"     ON payment_submissions      FOR ALL USING (false);
CREATE POLICY "deny_all_payout_requests"         ON payout_requests          FOR ALL USING (false);
CREATE POLICY "deny_all_transactions"            ON transactions             FOR ALL USING (false);
CREATE POLICY "deny_all_predictions"             ON predictions              FOR ALL USING (false);
CREATE POLICY "deny_all_topup_requests"          ON topup_requests           FOR ALL USING (false);
CREATE POLICY "deny_all_notifications"           ON notifications            FOR ALL USING (false);
CREATE POLICY "deny_all_activity_logs"           ON activity_logs            FOR ALL USING (false);
CREATE POLICY "deny_all_audit_logs"              ON audit_logs               FOR ALL USING (false);
CREATE POLICY "deny_all_wallet_pool"             ON wallet_pool              FOR ALL USING (false);
CREATE POLICY "deny_all_invite_logs"             ON invite_logs              FOR ALL USING (false);
