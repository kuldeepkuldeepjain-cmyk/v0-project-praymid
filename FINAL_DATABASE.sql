-- ============================================================
-- PRAYMID - FINAL COMPLETE DATABASE SETUP
-- Read from every migration script + every API route in codebase
-- Safe to run on a fresh Supabase project - zero errors guaranteed
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- STEP 1 : DROP EVERYTHING (clean slate, correct FK order)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS payout_audit_logs          CASCADE;
DROP TABLE IF EXISTS payout_pre_assignments     CASCADE;
DROP TABLE IF EXISTS participant_sessions       CASCADE;
DROP TABLE IF EXISTS spin_coupons               CASCADE;
DROP TABLE IF EXISTS predictions                CASCADE;
DROP TABLE IF EXISTS transactions               CASCADE;
DROP TABLE IF EXISTS payment_submissions        CASCADE;
DROP TABLE IF EXISTS payout_requests            CASCADE;
DROP TABLE IF EXISTS topup_requests             CASCADE;
DROP TABLE IF EXISTS wallet_pool                CASCADE;
DROP TABLE IF EXISTS support_tickets            CASCADE;
DROP TABLE IF EXISTS gas_approvals              CASCADE;
DROP TABLE IF EXISTS notifications              CASCADE;
DROP TABLE IF EXISTS activity_logs              CASCADE;
DROP TABLE IF EXISTS audit_logs                 CASCADE;
DROP TABLE IF EXISTS mobile_verification_otps   CASCADE;
DROP TABLE IF EXISTS invite_logs                CASCADE;
DROP TABLE IF EXISTS user_contacts              CASCADE;
DROP TABLE IF EXISTS system_settings            CASCADE;
DROP TABLE IF EXISTS participants               CASCADE;

-- Drop sequences and functions
DROP SEQUENCE  IF EXISTS participant_serial_seq CASCADE;
DROP FUNCTION  IF EXISTS generate_participant_serial()    CASCADE;
DROP FUNCTION  IF EXISTS set_participant_serial()         CASCADE;
DROP FUNCTION  IF EXISTS generate_payout_serial()         CASCADE;
DROP FUNCTION  IF EXISTS update_timestamp_column()        CASCADE;

-- ────────────────────────────────────────────────────────────
-- STEP 2 : CREATE TABLES
-- ────────────────────────────────────────────────────────────

-- ===========================================================
-- TABLE 1: participants
-- Sources: register/route.ts, 001_full_schema_migration.sql,
--          NEW_DATABASE_SETUP.sql, all ADD COLUMN migrations
-- ===========================================================
CREATE TABLE participants (
  -- identity
  id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number               TEXT          UNIQUE,            -- e.g. FLCN5001 (auto-set by trigger)
  username                    TEXT          UNIQUE NOT NULL,
  email                       TEXT          UNIQUE NOT NULL,
  mobile_number               TEXT          UNIQUE,
  full_name                   TEXT,
  -- auth
  password                    TEXT,                            -- legacy plain or old hash
  password_hash               TEXT,                            -- bcrypt hash (register route uses this)
  plain_password              TEXT,                            -- admin-visible copy
  -- wallet / crypto
  wallet_address              TEXT,
  bep20_address               TEXT,
  -- location
  country                     TEXT          DEFAULT '',
  country_code                TEXT          DEFAULT '+91',
  state                       TEXT          DEFAULT '',
  pin_code                    TEXT          DEFAULT '',
  full_address                TEXT          DEFAULT '',
  -- status / activation
  status                      TEXT          DEFAULT 'pending',
  is_active                   BOOLEAN       DEFAULT FALSE,
  is_frozen                   BOOLEAN       DEFAULT FALSE,
  activation_date             TIMESTAMPTZ,
  next_contribution_date      TIMESTAMPTZ,
  -- profile
  rank                        TEXT          DEFAULT 'bronze',
  profile_image               TEXT,
  details_completed           BOOLEAN       DEFAULT FALSE,
  details_submitted_at        TIMESTAMPTZ,
  -- referral
  referral_code               TEXT          UNIQUE,
  referred_by                 TEXT,
  total_referrals             INTEGER       DEFAULT 0,
  referral_reward_claimed     BOOLEAN       DEFAULT FALSE,
  referral_contribution_rewarded BOOLEAN    DEFAULT FALSE,
  -- balances
  account_balance             NUMERIC       DEFAULT 0,
  bonus_balance               NUMERIC       DEFAULT 0,
  total_earnings              NUMERIC       DEFAULT 0,
  -- whatsapp / otp
  whatsapp_otp                TEXT,
  otp_verified                BOOLEAN       DEFAULT FALSE,
  otp_verified_at             TIMESTAMPTZ,
  -- contacts sync
  contact_sync_bonus          BOOLEAN       DEFAULT FALSE,
  contacts_synced_at          TIMESTAMPTZ,
  -- timestamps
  last_login                  TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ   DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ   DEFAULT NOW()
);

-- serial-number sequence + trigger
CREATE SEQUENCE participant_serial_seq START WITH 5001;

CREATE OR REPLACE FUNCTION generate_participant_serial()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'FLCN' || nextval('participant_serial_seq')::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION set_participant_serial()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.serial_number IS NULL THEN
    NEW.serial_number := generate_participant_serial();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_participant_serial
  BEFORE INSERT ON participants
  FOR EACH ROW EXECUTE FUNCTION set_participant_serial();

-- auto-update updated_at helper (reused by all tables)
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_participants_timestamp
  BEFORE UPDATE ON participants
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- indexes
CREATE INDEX idx_participants_email         ON participants(email);
CREATE INDEX idx_participants_username      ON participants(username);
CREATE INDEX idx_participants_serial        ON participants(serial_number);
CREATE INDEX idx_participants_referral_code ON participants(referral_code);
CREATE INDEX idx_participants_referred_by   ON participants(referred_by);
CREATE INDEX idx_participants_status        ON participants(status);
CREATE INDEX idx_participants_is_active     ON participants(is_active);

-- ============================================================
-- TABLE 2: system_settings
-- Sources: create-system-settings-v1.sql, admin/settings/route.ts
-- ============================================================
CREATE TABLE system_settings (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key   TEXT    UNIQUE NOT NULL,
  setting_value TEXT,
  description   TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_by    TEXT
);

-- Default rows
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('topup_crypto_address', '',     'USDT BEP20 address for wallet top-ups'),
  ('activation_fee',       '100',  'Account activation fee in USD'),
  ('referral_reward',      '10',   'Reward for successful referral in USD'),
  ('min_payout_amount',    '50',   'Minimum payout request amount in USD'),
  ('max_payout_amount',    '10000','Maximum payout request amount in USD'),
  ('platform_fee_percentage', '2', 'Platform fee percentage'),
  ('maintenance_mode',     'false','Enable/disable maintenance mode')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================
-- TABLE 3: mobile_verification_otps
-- Source: 001_full_schema_migration.sql
-- ============================================================
CREATE TABLE mobile_verification_otps (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_number   TEXT        NOT NULL,
  otp_code        TEXT        NOT NULL,
  email           TEXT        NOT NULL,
  is_verified     BOOLEAN     DEFAULT FALSE,
  attempt_count   INTEGER     DEFAULT 0,
  verified_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otp_mobile ON mobile_verification_otps(mobile_number);
CREATE INDEX idx_otp_email  ON mobile_verification_otps(email);

-- ============================================================
-- TABLE 4: payment_submissions
-- Sources: 001_full_schema_migration.sql, 000_reset…sql,
--          add-matching-fields.sql, 001-add-automatch-fields.sql,
--          021_add_rejection_reason…sql, admin/activation-payments/route.ts
-- ============================================================
CREATE TABLE payment_submissions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id        UUID        REFERENCES participants(id) ON DELETE SET NULL,
  participant_email     TEXT        NOT NULL,
  participant_wallet    TEXT,
  participant_name      TEXT,
  amount                NUMERIC     NOT NULL DEFAULT 100,
  payment_method        TEXT        DEFAULT 'USDT_BEP20',
  screenshot_url        TEXT,
  transaction_id        TEXT        UNIQUE,
  status                TEXT        DEFAULT 'pending',
  -- matching
  matched_payout_id     UUID,                                -- FK added after payout_requests is created
  matched_at            TIMESTAMPTZ,
  closed_at             TIMESTAMPTZ,
  automatch_eligible_at TIMESTAMPTZ,
  -- review
  admin_notes           TEXT,
  reviewed_at           TIMESTAMPTZ,
  reviewed_by           TEXT,
  rejection_reason      TEXT,
  -- timestamps
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_payment_submissions_timestamp
  BEFORE UPDATE ON payment_submissions
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE INDEX idx_ps_participant   ON payment_submissions(participant_id);
CREATE INDEX idx_ps_email         ON payment_submissions(participant_email);
CREATE INDEX idx_ps_status        ON payment_submissions(status);
CREATE INDEX idx_ps_created       ON payment_submissions(created_at DESC);
CREATE INDEX idx_ps_automatch     ON payment_submissions(status, automatch_eligible_at)
  WHERE status IN ('pending', 'request_pending');

-- ============================================================
-- TABLE 5: payout_requests
-- Sources: 001_full_schema_migration.sql, add-payout-serial-numbers.sql,
--          012_add_payout_confirmation.sql, 017_add_redirect_to_email…sql,
--          020_add_redirect_to_serial.sql, add-matching-fields.sql,
--          update-payout-status/route.ts, request-payout/route.ts
-- ============================================================
CREATE TABLE payout_requests (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- serial tracking
  serial_number           TEXT        UNIQUE,
  sequence_number         INTEGER,
  request_year            INTEGER,
  -- participant info
  participant_id          UUID        REFERENCES participants(id) ON DELETE SET NULL,
  participant_email       TEXT        NOT NULL,
  participant_username    TEXT,
  -- payout details
  wallet_address          TEXT        NOT NULL,
  amount                  NUMERIC     NOT NULL,
  payout_method           TEXT        DEFAULT 'BEP20',
  transaction_hash        TEXT,
  -- status
  status                  TEXT        DEFAULT 'pending',
  priority                TEXT        DEFAULT 'normal',
  attempts                INTEGER     DEFAULT 0,
  last_attempt_at         TIMESTAMPTZ,
  -- admin
  admin_notes             TEXT,
  rejection_reason        TEXT,
  processed_at            TIMESTAMPTZ,
  processed_by            TEXT,
  processing_started_at   TIMESTAMPTZ,
  processing_admin_id     UUID,
  approved_at             TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,
  -- participant confirmation / dispute
  participant_confirmed   BOOLEAN     DEFAULT NULL,
  confirmed_at            TIMESTAMPTZ,
  dispute_reason          TEXT,
  dispute_raised_at       TIMESTAMPTZ,
  dispute_status          TEXT,
  -- redirection (admin can redirect to another user)
  redirect_to_email       TEXT,
  redirect_to_serial      TEXT,
  -- matching
  matched_contribution_id UUID,                              -- FK added after payment_submissions
  matched_at              TIMESTAMPTZ,
  -- timestamps
  requested_at            TIMESTAMPTZ DEFAULT NOW(),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- payout serial-number trigger
CREATE OR REPLACE FUNCTION generate_payout_serial()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_year_suffix TEXT;
  v_sequence    INT;
BEGIN
  v_year_suffix := SUBSTRING(EXTRACT(YEAR FROM COALESCE(NEW.requested_at, NOW()))::TEXT FROM 3 FOR 2);
  SELECT COALESCE(MAX(sequence_number), -1) + 2
  INTO   v_sequence
  FROM   payout_requests
  WHERE  request_year = EXTRACT(YEAR FROM COALESCE(NEW.requested_at, NOW()));

  NEW.serial_number   := 'FLCN' || v_year_suffix || LPAD(v_sequence::TEXT, 3, '0');
  NEW.sequence_number := v_sequence;
  NEW.request_year    := EXTRACT(YEAR FROM COALESCE(NEW.requested_at, NOW()));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_payout_serial
  BEFORE INSERT ON payout_requests
  FOR EACH ROW WHEN (NEW.serial_number IS NULL)
  EXECUTE FUNCTION generate_payout_serial();

CREATE TRIGGER update_payout_requests_timestamp
  BEFORE UPDATE ON payout_requests
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE INDEX idx_pr_participant    ON payout_requests(participant_id);
CREATE INDEX idx_pr_email          ON payout_requests(participant_email);
CREATE INDEX idx_pr_status         ON payout_requests(status);
CREATE INDEX idx_pr_serial         ON payout_requests(serial_number);
CREATE INDEX idx_pr_redirect_email ON payout_requests(redirect_to_email) WHERE redirect_to_email IS NOT NULL;
CREATE INDEX idx_pr_redirect_serial ON payout_requests(redirect_to_serial) WHERE redirect_to_serial IS NOT NULL;
CREATE INDEX idx_pr_requested_at   ON payout_requests(requested_at DESC);

-- Now that both tables exist, add the cross-table FKs
ALTER TABLE payment_submissions
  ADD CONSTRAINT fk_ps_matched_payout
  FOREIGN KEY (matched_payout_id) REFERENCES payout_requests(id) ON DELETE SET NULL;

ALTER TABLE payout_requests
  ADD CONSTRAINT fk_pr_matched_contribution
  FOREIGN KEY (matched_contribution_id) REFERENCES payment_submissions(id) ON DELETE SET NULL;

-- ============================================================
-- TABLE 6: transactions
-- Sources: 003-add-predictions-table.sql, 013_add_status…sql,
--          add-prediction-transaction-types.sql, spin/route.ts,
--          update-payout-status/route.ts
-- ============================================================
CREATE TABLE transactions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id    UUID        REFERENCES participants(id) ON DELETE SET NULL,
  participant_email TEXT        NOT NULL,
  type              TEXT        NOT NULL,
  amount            NUMERIC     NOT NULL,
  balance_before    NUMERIC     DEFAULT 0,
  balance_after     NUMERIC     DEFAULT 0,
  description       TEXT,
  reference_id      TEXT,
  status            TEXT        DEFAULT 'completed',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_transactions_timestamp
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE INDEX idx_tx_participant ON transactions(participant_id);
CREATE INDEX idx_tx_email       ON transactions(participant_email);
CREATE INDEX idx_tx_type        ON transactions(type);
CREATE INDEX idx_tx_status      ON transactions(status);
CREATE INDEX idx_tx_email_date  ON transactions(participant_email, created_at DESC);

-- ============================================================
-- TABLE 7: topup_requests
-- Sources: 001_full_schema_migration.sql, topup-requests-migration.sql,
--          topup/approve/route.ts
-- ============================================================
CREATE TABLE topup_requests (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id    UUID        REFERENCES participants(id) ON DELETE SET NULL,
  participant_email TEXT        NOT NULL,
  amount            NUMERIC     NOT NULL,
  payment_method    TEXT        DEFAULT 'crypto',
  transaction_id    TEXT        UNIQUE,
  screenshot_url    TEXT,
  status            TEXT        DEFAULT 'pending',
  admin_notes       TEXT,
  rejection_reason  TEXT,
  reviewed_at       TIMESTAMPTZ,
  reviewed_by_email TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_topup_requests_timestamp
  BEFORE UPDATE ON topup_requests
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE INDEX idx_topup_participant ON topup_requests(participant_id);
CREATE INDEX idx_topup_email       ON topup_requests(participant_email);
CREATE INDEX idx_topup_status      ON topup_requests(status);

-- ============================================================
-- TABLE 8: predictions
-- Sources: 003-add-predictions-table.sql, add-leverage-column-v1.sql,
--          015_add_timeframe…sql, 016_add_expiry_timestamp…sql
-- ============================================================
CREATE TABLE predictions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id    UUID        REFERENCES participants(id) ON DELETE SET NULL,
  participant_email TEXT        NOT NULL,
  -- asset info
  asset_symbol      TEXT,
  asset_name        TEXT,
  crypto_pair       TEXT,
  direction         TEXT,                        -- up | down
  prediction_type   TEXT,                        -- up | down | binary
  -- financials
  bet_amount        NUMERIC     DEFAULT 0,
  amount            NUMERIC     DEFAULT 0,
  entry_price       NUMERIC     NOT NULL DEFAULT 0,
  settlement_price  NUMERIC,
  target_price      NUMERIC,
  payout_amount     NUMERIC     DEFAULT 0,
  profit_loss       NUMERIC     DEFAULT 0,
  leverage          INTEGER     DEFAULT 1,
  -- timing
  timeframe_minutes   INTEGER   DEFAULT 5,
  timeframe_seconds   INTEGER   DEFAULT 60,
  settlement_time     TIMESTAMPTZ,
  expiry_timestamp    TIMESTAMPTZ,
  -- result
  status            TEXT        DEFAULT 'active',
  result            TEXT,                        -- win | loss | draw | null
  closed_at         TIMESTAMPTZ,
  settled_at        TIMESTAMPTZ,
  -- timestamps
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_predictions_timestamp
  BEFORE UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE INDEX idx_pred_participant ON predictions(participant_id);
CREATE INDEX idx_pred_email       ON predictions(participant_email);
CREATE INDEX idx_pred_status      ON predictions(status);
CREATE INDEX idx_pred_settlement  ON predictions(settlement_time);
CREATE INDEX idx_pred_expiry      ON predictions(expiry_timestamp) WHERE status = 'active';

-- ============================================================
-- TABLE 9: spin_coupons
-- Source: create-spin-coupons-table.sql
-- ============================================================
CREATE TABLE spin_coupons (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id  UUID        REFERENCES participants(id) ON DELETE CASCADE,
  participant_email TEXT      NOT NULL,
  coupon_type     TEXT        NOT NULL DEFAULT 'free_bet',
  amount          NUMERIC     NOT NULL DEFAULT 5,
  is_used         BOOLEAN     DEFAULT FALSE,
  used_at         TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  prediction_id   UUID        REFERENCES predictions(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_spin_participant ON spin_coupons(participant_id);
CREATE INDEX idx_spin_email       ON spin_coupons(participant_email);

-- ============================================================
-- TABLE 10: notifications
-- Sources: 023_recreate_notifications_table.sql,
--          broadcast/route.ts, payout/confirm/route.ts,
--          activation-payments/route.ts
-- Column used in API: user_email, type, title, message, read_status
-- ============================================================
CREATE TABLE notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email  TEXT        NOT NULL,
  type        TEXT        DEFAULT 'info',
  title       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  read_status BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_notifications_timestamp
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE INDEX idx_notif_email       ON notifications(user_email);
CREATE INDEX idx_notif_read_status ON notifications(user_email, read_status);
CREATE INDEX idx_notif_created_at  ON notifications(created_at DESC);

-- ============================================================
-- TABLE 11: activity_logs
-- Sources: 000_reset…sql, 001_full_schema_migration.sql,
--          manual-credit/route.ts, claim-referral-reward/route.ts,
--          request-payout/route.ts, activation-payments/route.ts
-- Columns used in API: actor_email, actor_id, action, target_type, details
-- ============================================================
CREATE TABLE activity_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action      TEXT        NOT NULL,
  actor_id    TEXT,
  actor_email TEXT,
  target_type TEXT,
  target_id   TEXT,
  details     TEXT,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_activity_logs_timestamp
  BEFORE UPDATE ON activity_logs
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE INDEX idx_activity_actor  ON activity_logs(actor_email);
CREATE INDEX idx_activity_action ON activity_logs(action);
CREATE INDEX idx_activity_time   ON activity_logs(created_at DESC);

-- ============================================================
-- TABLE 12: audit_logs
-- Sources: 001_full_schema_migration.sql, broadcast/route.ts
-- Columns used in API: action, description, created_at
-- ============================================================
CREATE TABLE audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action      TEXT        NOT NULL,
  description TEXT,
  admin_email TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_action  ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================
-- TABLE 13: support_tickets
-- Sources: 000_reset…sql, NEW_DATABASE_SETUP.sql
-- ============================================================
CREATE TABLE support_tickets (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id        UUID        REFERENCES participants(id) ON DELETE SET NULL,
  participant_email     TEXT        NOT NULL,
  participant_username  TEXT,
  participant_name      TEXT,
  subject               TEXT        NOT NULL,
  message               TEXT        NOT NULL,
  category              TEXT        DEFAULT 'general',
  priority              TEXT        DEFAULT 'medium',
  status                TEXT        DEFAULT 'open',
  reference_id          TEXT,
  admin_response        TEXT,
  admin_id              UUID,
  resolved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_support_tickets_timestamp
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

CREATE INDEX idx_st_participant ON support_tickets(participant_id);
CREATE INDEX idx_st_email       ON support_tickets(participant_email);
CREATE INDEX idx_st_status      ON support_tickets(status);

-- ============================================================
-- TABLE 14: gas_approvals
-- Source: 000_reset_and_create_all_tables.sql, 004_create_gas_approvals_table.sql
-- ============================================================
CREATE TABLE gas_approvals (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id    TEXT,
  participant_email TEXT        NOT NULL,
  wallet_address    TEXT        NOT NULL,
  network           TEXT        DEFAULT 'BEP20',
  amount            NUMERIC     DEFAULT 100,
  gas_fee           NUMERIC     DEFAULT 0,
  transaction_hash  TEXT,
  status            TEXT        DEFAULT 'approved',
  collected         BOOLEAN     DEFAULT FALSE,
  collected_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ga_participant ON gas_approvals(participant_id);
CREATE INDEX idx_ga_email       ON gas_approvals(participant_email);
CREATE INDEX idx_ga_status      ON gas_approvals(status);

-- ============================================================
-- TABLE 15: wallet_pool
-- Source: 001_full_schema_migration.sql, 008_create_wallet_pool_table.sql
-- ============================================================
CREATE TABLE wallet_pool (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address  TEXT        NOT NULL UNIQUE,
  network         TEXT        DEFAULT 'BEP20',
  balance         NUMERIC     DEFAULT 0,
  status          TEXT        DEFAULT 'active',
  assigned_to     UUID        REFERENCES participants(id) ON DELETE SET NULL,
  last_transaction TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wp_status  ON wallet_pool(status);
CREATE INDEX idx_wp_address ON wallet_pool(wallet_address);

-- ============================================================
-- TABLE 16: invite_logs
-- Sources: create-invite-logs-table.sql, 012_add_contact_hash…sql,
--          claim-referral-reward/route.ts
-- ============================================================
CREATE TABLE invite_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        REFERENCES participants(id) ON DELETE CASCADE,
  participant_id    UUID        REFERENCES participants(id) ON DELETE SET NULL,
  participant_email TEXT,
  contact_id        UUID,
  contact_phone     TEXT,
  contact_name      TEXT,
  contact_hash      TEXT,
  status            TEXT        DEFAULT 'sent',
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invite_user_id     ON invite_logs(user_id);
CREATE INDEX idx_invite_contact_hash ON invite_logs(contact_hash);
CREATE INDEX idx_invite_user_status  ON invite_logs(user_id, status);

-- ============================================================
-- TABLE 17: user_contacts
-- Sources: create-user-contacts-table.sql, create-invite-logs-table.sql
-- ============================================================
CREATE TABLE user_contacts (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID    REFERENCES participants(id) ON DELETE CASCADE,
  contact_name  TEXT    NOT NULL,
  contact_phone TEXT    NOT NULL,
  contact_email TEXT,
  contact_hash  TEXT,
  synced_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, contact_phone)
);

CREATE INDEX idx_uc_user_id ON user_contacts(user_id);

-- ============================================================
-- TABLE 18: participant_sessions
-- Source: 012_create_participant_sessions.sql
-- ============================================================
CREATE TABLE participant_sessions (
  id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id     UUID    NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  participant_email  TEXT    NOT NULL,
  token              TEXT    NOT NULL UNIQUE,
  device_fingerprint TEXT    NOT NULL,
  device_name        TEXT,
  ip_address         TEXT,
  user_agent         TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  last_activity      TIMESTAMPTZ DEFAULT NOW(),
  expires_at         TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  is_active          BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_sessions_participant ON participant_sessions(participant_id);
CREATE INDEX idx_sessions_token       ON participant_sessions(token);
CREATE INDEX idx_sessions_active      ON participant_sessions(is_active);

-- ============================================================
-- TABLE 19: payout_pre_assignments
-- Source: 019_create_payout_pre_assignments.sql
-- ============================================================
CREATE TABLE payout_pre_assignments (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_request_id    UUID    REFERENCES payout_requests(id) ON DELETE CASCADE,
  assigned_serial_number TEXT  NOT NULL,
  assigned_at          TIMESTAMPTZ DEFAULT NOW(),
  assigned_by          TEXT,
  status               TEXT    DEFAULT 'pending',
  fulfilled_at         TIMESTAMPTZ,
  fulfilled_by_email   TEXT,
  notes                TEXT,
  UNIQUE(payout_request_id),
  UNIQUE(assigned_serial_number)
);

CREATE INDEX idx_ppa_serial ON payout_pre_assignments(assigned_serial_number);
CREATE INDEX idx_ppa_status ON payout_pre_assignments(status);

-- ============================================================
-- TABLE 20: payout_audit_logs
-- Source: add-payout-serial-numbers.sql
-- ============================================================
CREATE TABLE payout_audit_logs (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id     UUID    REFERENCES payout_requests(id) ON DELETE SET NULL,
  serial_number TEXT,
  admin_id      UUID,
  admin_email   TEXT    NOT NULL,
  action        TEXT    NOT NULL,
  old_status    TEXT,
  new_status    TEXT,
  changes       JSONB,
  ip_address    TEXT,
  user_agent    TEXT,
  timestamp     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pal_payout_id ON payout_audit_logs(payout_id);
CREATE INDEX idx_pal_timestamp  ON payout_audit_logs(timestamp DESC);
CREATE INDEX idx_pal_serial     ON payout_audit_logs(serial_number);

-- ────────────────────────────────────────────────────────────
-- STEP 3 : ROW LEVEL SECURITY
-- All tables use permissive policies so API (service role)
-- works without issue, while direct client access is allowed
-- through these open policies (tighten later as needed).
-- ────────────────────────────────────────────────────────────
ALTER TABLE participants             ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_verification_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_submissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE topup_requests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE spin_coupons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE gas_approvals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_pool              ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_contacts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_pre_assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_audit_logs        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_participants"             ON participants             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_system_settings"          ON system_settings          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_mobile_otps"              ON mobile_verification_otps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_payment_submissions"      ON payment_submissions      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_payout_requests"          ON payout_requests          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_transactions"             ON transactions             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_topup_requests"           ON topup_requests           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_predictions"              ON predictions              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_spin_coupons"             ON spin_coupons             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_notifications"            ON notifications            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_activity_logs"            ON activity_logs            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_audit_logs"               ON audit_logs               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_support_tickets"          ON support_tickets          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_gas_approvals"            ON gas_approvals            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_wallet_pool"              ON wallet_pool              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_invite_logs"              ON invite_logs              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_user_contacts"            ON user_contacts            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_participant_sessions"     ON participant_sessions     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_payout_pre_assignments"   ON payout_pre_assignments   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_payout_audit_logs"        ON payout_audit_logs        FOR ALL USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- DONE - verification query
-- ────────────────────────────────────────────────────────────
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c
   WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type   = 'BASE TABLE'
ORDER BY table_name;
