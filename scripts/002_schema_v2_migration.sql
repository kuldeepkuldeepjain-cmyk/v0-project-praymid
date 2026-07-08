-- ============================================================
-- Praymid Schema V2 Migration
-- This is the NEW restructured schema for the v2 database
-- Run this in your NEW Neon database connection
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. PARTICIPANTS (V2 - restructured)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS participants_v2 (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number       SERIAL      UNIQUE,
  full_name           TEXT        NOT NULL,
  username            TEXT        UNIQUE NOT NULL,
  email               TEXT        UNIQUE NOT NULL,
  mobile_number       TEXT        UNIQUE,
  password            TEXT        NOT NULL,
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
  bonus_balance       NUMERIC     DEFAULT 0,
  is_active           BOOLEAN     DEFAULT TRUE,
  is_frozen           BOOLEAN     DEFAULT FALSE,
  details_completed   BOOLEAN     DEFAULT FALSE,
  activation_date     TIMESTAMPTZ,
  last_login          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participants_v2_email ON participants_v2(email);
CREATE INDEX IF NOT EXISTS idx_participants_v2_username ON participants_v2(username);

-- ──────────────────────────────────────────────
-- 2. MOBILE VERIFICATION OTPs (V2)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mobile_verification_otps_v2 (
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

CREATE INDEX IF NOT EXISTS idx_otp_mobile_v2 ON mobile_verification_otps_v2(mobile_number);

-- ──────────────────────────────────────────────
-- 3. PAYMENT SUBMISSIONS (V2)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_submissions_v2 (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id      UUID        REFERENCES participants_v2(id) ON DELETE SET NULL,
  participant_email   TEXT        NOT NULL,
  amount              NUMERIC     NOT NULL DEFAULT 100,
  payment_method      TEXT        DEFAULT 'USDT_BEP20',
  screenshot_url      TEXT,
  transaction_id      TEXT        UNIQUE,
  status              TEXT        DEFAULT 'pending',
  matched_payout_id   UUID,
  matched_at          TIMESTAMPTZ,
  admin_notes         TEXT,
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         TEXT,
  rejection_reason    TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ps_v2_participant ON payment_submissions_v2(participant_id);
CREATE INDEX IF NOT EXISTS idx_ps_v2_email ON payment_submissions_v2(participant_email);
CREATE INDEX IF NOT EXISTS idx_ps_v2_status ON payment_submissions_v2(status);

-- ──────────────────────────────────────────────
-- 4. PAYOUT REQUESTS (V2)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payout_requests_v2 (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id      UUID        REFERENCES participants_v2(id) ON DELETE SET NULL,
  participant_email   TEXT        NOT NULL,
  wallet_address      TEXT        NOT NULL,
  amount              NUMERIC     NOT NULL,
  payout_method       TEXT        DEFAULT 'BEP20',
  status              TEXT        DEFAULT 'pending',
  transaction_hash    TEXT,
  admin_notes         TEXT,
  processed_at        TIMESTAMPTZ,
  processed_by        TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pr_v2_participant ON payout_requests_v2(participant_id);
CREATE INDEX IF NOT EXISTS idx_pr_v2_email ON payout_requests_v2(participant_email);
CREATE INDEX IF NOT EXISTS idx_pr_v2_status ON payout_requests_v2(status);

-- Add FK from payment_submissions_v2 → payout_requests_v2
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_ps_v2_matched_payout'
  ) THEN
    ALTER TABLE payment_submissions_v2
      ADD CONSTRAINT fk_ps_v2_matched_payout
      FOREIGN KEY (matched_payout_id) REFERENCES payout_requests_v2(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ──────────────────────────────────────────────
-- 5. TRANSACTIONS (V2)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions_v2 (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id      UUID        REFERENCES participants_v2(id) ON DELETE SET NULL,
  participant_email   TEXT,
  type                TEXT        NOT NULL,
  amount              NUMERIC     NOT NULL,
  description         TEXT,
  reference_id        UUID,
  status              TEXT        DEFAULT 'completed',
  balance_before      NUMERIC,
  balance_after       NUMERIC,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_v2_participant ON transactions_v2(participant_id);
CREATE INDEX IF NOT EXISTS idx_tx_v2_type ON transactions_v2(type);

-- ──────────────────────────────────────────────
-- 6. PREDICTIONS (V2)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions_v2 (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id      UUID        REFERENCES participants_v2(id) ON DELETE SET NULL,
  participant_email   TEXT        NOT NULL,
  crypto_pair         TEXT        NOT NULL,
  prediction_type     TEXT        NOT NULL,
  amount              NUMERIC     NOT NULL,
  entry_price         NUMERIC     NOT NULL,
  target_price        NUMERIC,
  leverage            INTEGER     DEFAULT 1,
  profit_loss         NUMERIC     DEFAULT 0,
  result              TEXT,
  status              TEXT        DEFAULT 'pending',
  closed_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pred_v2_participant ON predictions_v2(participant_id);
CREATE INDEX IF NOT EXISTS idx_pred_v2_email ON predictions_v2(participant_email);
CREATE INDEX IF NOT EXISTS idx_pred_v2_status ON predictions_v2(status);

-- ──────────────────────────────────────────────
-- 7. TOPUP REQUESTS (V2)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS topup_requests_v2 (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id      UUID        REFERENCES participants_v2(id) ON DELETE SET NULL,
  participant_email   TEXT        NOT NULL,
  amount              NUMERIC     NOT NULL,
  payment_method      TEXT        DEFAULT 'crypto',
  transaction_id      TEXT        UNIQUE,
  status              TEXT        DEFAULT 'pending',
  admin_notes         TEXT,
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topup_v2_participant ON topup_requests_v2(participant_id);
CREATE INDEX IF NOT EXISTS idx_topup_v2_email ON topup_requests_v2(participant_email);

-- ──────────────────────────────────────────────
-- 8. NOTIFICATIONS (V2)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications_v2 (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email  TEXT        NOT NULL,
  type        TEXT        DEFAULT 'info',
  title       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  read_status BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_v2_email ON notifications_v2(user_email);

-- ──────────────────────────────────────────────
-- 9. ACTIVITY LOGS (V2)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs_v2 (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action      TEXT        NOT NULL,
  actor_id    TEXT,
  actor_email TEXT,
  target_type TEXT,
  details     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_v2_actor ON activity_logs_v2(actor_email);

-- ──────────────────────────────────────────────
-- 10. AUDIT LOGS (V2)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs_v2 (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action      TEXT        NOT NULL,
  description TEXT,
  admin_email TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 11. WALLET POOL (V2)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_pool_v2 (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_to     UUID        REFERENCES participants_v2(id) ON DELETE SET NULL,
  wallet_address  TEXT        NOT NULL,
  network         TEXT        DEFAULT 'BEP20',
  balance         NUMERIC     DEFAULT 0,
  status          TEXT        DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 12. INVITE LOGS (V2)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invite_logs_v2 (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT        NOT NULL,
  participant_id      UUID        REFERENCES participants_v2(id) ON DELETE SET NULL,
  contact_phone       TEXT,
  contact_name        TEXT,
  contact_hash        TEXT,
  participant_email   TEXT,
  status              TEXT        DEFAULT 'sent',
  sent_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_v2_user ON invite_logs_v2(user_id);

-- ══════════════════════════════════════════════
-- V2 SCHEMA SETUP COMPLETE
-- ══════════════════════════════════════════════
-- All tables are empty and ready for v2 business logic
-- Use the db-router.ts file to route requests to v1 or v2 database
