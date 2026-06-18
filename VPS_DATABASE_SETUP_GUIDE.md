# Complete VPS PostgreSQL Setup Guide for Praymid
# Ubuntu 22.04 — Beginner Friendly Step by Step

---

## WHAT YOU NEED BEFORE STARTING
- Your VPS IP address (example: 123.456.789.0)
- Your VPS root password or SSH key
- A terminal app:
  - Windows: Download and install "MobaXterm" (free) from mobaxterm.mobatek.net
  - Mac/Linux: Use the built-in Terminal app

---

## PART 1 — CONNECT TO YOUR VPS

### Step 1 — Open your terminal

On Windows (MobaXterm):
1. Open MobaXterm
2. Click "Session" button at top left
3. Click "SSH"
4. In "Remote host" box type your VPS IP (example: 123.456.789.0)
5. Check "Specify username" and type: root
6. Click OK
7. Type your password when asked (you won't see it typing, that's normal)
8. Press Enter

On Mac/Linux:
1. Open Terminal
2. Type exactly:
   ssh root@YOUR_VPS_IP
   (replace YOUR_VPS_IP with your actual IP)
3. Press Enter
4. Type "yes" if asked about fingerprint
5. Type your password and press Enter

You are now connected when you see something like: root@ubuntu:~#

---

## PART 2 — UPDATE YOUR SERVER

### Step 2 — Update packages

Copy and paste this command, then press Enter:

    sudo apt update && sudo apt upgrade -y

Wait for it to finish (may take 2-5 minutes). You will see a lot of text scrolling — that is normal.

---

## PART 3 — INSTALL POSTGRESQL

### Step 3 — Install PostgreSQL

Copy and paste this command, press Enter:

    sudo apt install -y postgresql postgresql-contrib

Wait for it to finish.

### Step 4 — Start and enable PostgreSQL

Run these two commands one by one:

    sudo systemctl start postgresql

    sudo systemctl enable postgresql

### Step 5 — Verify it is running

Run:

    sudo systemctl status postgresql

You should see "active (running)" in green. Press Q to exit.

---

## PART 4 — CREATE YOUR DATABASE AND USER

### Step 6 — Switch to the postgres user

Run:

    sudo -u postgres psql

Your prompt will change to: postgres=#

That means you are now inside PostgreSQL.

### Step 7 — Create your database user

Copy and paste this (change YourStrongPassword123! to your own password — write it down!):

    CREATE USER praymid_user WITH PASSWORD 'YourStrongPassword123!';

Press Enter. You should see: CREATE ROLE

### Step 8 — Create your database

    CREATE DATABASE praymid_db OWNER praymid_user;

Press Enter. You should see: CREATE DATABASE

### Step 9 — Grant permissions

    GRANT ALL PRIVILEGES ON DATABASE praymid_db TO praymid_user;

Press Enter. You should see: GRANT

### Step 10 — Exit PostgreSQL

    \q

Press Enter. Your prompt goes back to root@ubuntu:~#

---

## PART 5 — ALLOW REMOTE CONNECTIONS

(This lets your app on Vercel connect to your VPS database)

### Step 11 — Edit postgresql.conf

Run:

    sudo nano /etc/postgresql/14/main/postgresql.conf

- Use the arrow keys to scroll down
- Find the line that says: #listen_addresses = 'localhost'
- Change it to: listen_addresses = '*'
  (remove the # and change localhost to *)
- Press CTRL+X to exit
- Press Y to save
- Press Enter to confirm

### Step 12 — Edit pg_hba.conf

Run:

    sudo nano /etc/postgresql/14/main/pg_hba.conf

- Scroll all the way to the bottom using arrow keys
- Add this NEW line at the very bottom:

    host    all             all             0.0.0.0/0            md5

- Press CTRL+X to exit
- Press Y to save
- Press Enter to confirm

### Step 13 — Restart PostgreSQL

    sudo systemctl restart postgresql

### Step 14 — Open firewall port

Run these two commands:

    sudo ufw allow 5432/tcp

    sudo ufw reload

---

## PART 6 — CREATE ALL 12 TABLES

### Step 15 — Connect to your database

    psql -U praymid_user -d praymid_db -h localhost

Type your password when asked. You should see: praymid_db=>

### Step 16 — Copy and paste the ENTIRE SQL below

Copy everything between the lines and paste it into the terminal, then press Enter:

========== START COPYING FROM HERE ==========

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS participants (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number     SERIAL      UNIQUE,
  full_name         TEXT        NOT NULL,
  username          TEXT        UNIQUE NOT NULL,
  email             TEXT        UNIQUE NOT NULL,
  mobile_number     TEXT        UNIQUE,
  password          TEXT        NOT NULL,
  plain_password    TEXT,
  wallet_address    TEXT,
  bep20_address     TEXT,
  country           TEXT        DEFAULT '',
  country_code      TEXT        DEFAULT '',
  state             TEXT        DEFAULT '',
  pin_code          TEXT        DEFAULT '',
  full_address      TEXT        DEFAULT '',
  status            TEXT        DEFAULT 'active',
  rank              TEXT        DEFAULT 'bronze',
  referral_code     TEXT        UNIQUE,
  referred_by       TEXT,
  total_referrals   INTEGER     DEFAULT 0,
  total_earnings    NUMERIC     DEFAULT 0,
  account_balance   NUMERIC     DEFAULT 0,
  bonus_balance     NUMERIC     DEFAULT 0,
  is_active         BOOLEAN     DEFAULT TRUE,
  is_frozen         BOOLEAN     DEFAULT FALSE,
  details_completed BOOLEAN     DEFAULT FALSE,
  activation_date   TIMESTAMPTZ,
  last_login        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mobile_verification_otps (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_number TEXT        NOT NULL,
  otp_code      TEXT        NOT NULL,
  email         TEXT        NOT NULL,
  is_verified   BOOLEAN     DEFAULT FALSE,
  attempt_count INTEGER     DEFAULT 0,
  verified_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_otp_mobile ON mobile_verification_otps(mobile_number);

CREATE TABLE IF NOT EXISTS payment_submissions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id    UUID        REFERENCES participants(id) ON DELETE SET NULL,
  participant_email TEXT        NOT NULL,
  amount            NUMERIC     NOT NULL DEFAULT 100,
  payment_method    TEXT        DEFAULT 'USDT_BEP20',
  screenshot_url    TEXT,
  transaction_id    TEXT        UNIQUE,
  status            TEXT        DEFAULT 'pending',
  matched_payout_id UUID,
  matched_at        TIMESTAMPTZ,
  admin_notes       TEXT,
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       TEXT,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ps_participant ON payment_submissions(participant_id);
CREATE INDEX IF NOT EXISTS idx_ps_email       ON payment_submissions(participant_email);
CREATE INDEX IF NOT EXISTS idx_ps_status      ON payment_submissions(status);

CREATE TABLE IF NOT EXISTS payout_requests (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id    UUID        REFERENCES participants(id) ON DELETE SET NULL,
  participant_email TEXT        NOT NULL,
  wallet_address    TEXT        NOT NULL,
  amount            NUMERIC     NOT NULL,
  payout_method     TEXT        DEFAULT 'BEP20',
  status            TEXT        DEFAULT 'pending',
  transaction_hash  TEXT,
  admin_notes       TEXT,
  processed_at      TIMESTAMPTZ,
  processed_by      TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pr_participant ON payout_requests(participant_id);
CREATE INDEX IF NOT EXISTS idx_pr_email       ON payout_requests(participant_email);
CREATE INDEX IF NOT EXISTS idx_pr_status      ON payout_requests(status);

ALTER TABLE payment_submissions
  ADD CONSTRAINT fk_ps_matched_payout
  FOREIGN KEY (matched_payout_id) REFERENCES payout_requests(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS transactions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id    UUID        REFERENCES participants(id) ON DELETE SET NULL,
  participant_email TEXT,
  type              TEXT        NOT NULL,
  amount            NUMERIC     NOT NULL,
  description       TEXT,
  reference_id      UUID,
  status            TEXT        DEFAULT 'completed',
  balance_before    NUMERIC,
  balance_after     NUMERIC,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tx_participant ON transactions(participant_id);
CREATE INDEX IF NOT EXISTS idx_tx_type        ON transactions(type);

CREATE TABLE IF NOT EXISTS predictions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id    UUID        REFERENCES participants(id) ON DELETE SET NULL,
  participant_email TEXT        NOT NULL,
  crypto_pair       TEXT        NOT NULL,
  prediction_type   TEXT        NOT NULL,
  amount            NUMERIC     NOT NULL,
  entry_price       NUMERIC     NOT NULL,
  target_price      NUMERIC,
  leverage          INTEGER     DEFAULT 1,
  profit_loss       NUMERIC     DEFAULT 0,
  result            TEXT,
  status            TEXT        DEFAULT 'pending',
  closed_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pred_participant ON predictions(participant_id);
CREATE INDEX IF NOT EXISTS idx_pred_email       ON predictions(participant_email);
CREATE INDEX IF NOT EXISTS idx_pred_status      ON predictions(status);

CREATE TABLE IF NOT EXISTS topup_requests (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id    UUID        REFERENCES participants(id) ON DELETE SET NULL,
  participant_email TEXT        NOT NULL,
  amount            NUMERIC     NOT NULL,
  payment_method    TEXT        DEFAULT 'crypto',
  transaction_id    TEXT        UNIQUE,
  status            TEXT        DEFAULT 'pending',
  admin_notes       TEXT,
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_topup_participant ON topup_requests(participant_id);
CREATE INDEX IF NOT EXISTS idx_topup_email       ON topup_requests(participant_email);

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email  TEXT        NOT NULL,
  type        TEXT        DEFAULT 'info',
  title       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  read_status BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_email ON notifications(user_email);

CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action      TEXT        NOT NULL,
  actor_id    TEXT,
  actor_email TEXT,
  target_type TEXT,
  details     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_actor  ON activity_logs(actor_email);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_logs(action);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action      TEXT        NOT NULL,
  description TEXT,
  admin_email TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_pool (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_to    UUID        REFERENCES participants(id) ON DELETE SET NULL,
  wallet_address TEXT        NOT NULL,
  network        TEXT        DEFAULT 'BEP20',
  balance        NUMERIC     DEFAULT 0,
  status         TEXT        DEFAULT 'active',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invite_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT        NOT NULL,
  participant_id    UUID        REFERENCES participants(id) ON DELETE SET NULL,
  contact_phone     TEXT,
  contact_name      TEXT,
  contact_hash      TEXT,
  participant_email TEXT,
  status            TEXT        DEFAULT 'sent',
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invite_user ON invite_logs(user_id);

========== STOP COPYING HERE ==========

You should see many "CREATE TABLE" and "CREATE INDEX" messages.

### Step 17 — Verify all tables were created

    \dt

You should see a list of 12 tables:
- activity_logs
- audit_logs
- invite_logs
- mobile_verification_otps
- notifications
- participants
- payment_submissions
- payout_requests
- predictions
- topup_requests
- transactions
- wallet_pool

### Step 18 — Exit psql

    \q

---

## PART 7 — ADD THE CONNECTION STRING TO V0

### Step 19 — Build your connection string

Your POSTGRES_URL will be:

    postgresql://praymid_user:YourStrongPassword123!@YOUR_VPS_IP:5432/praymid_db

Replace:
- YourStrongPassword123! with the password you chose in Step 7
- YOUR_VPS_IP with your actual VPS IP address

Example:
    postgresql://praymid_user:MyPass456!@123.456.789.0:5432/praymid_db

### Step 20 — Add to v0 Settings

1. Click Settings (gear icon, top right of v0)
2. Click "Vars" tab
3. Add these environment variables:

   Key: POSTGRES_URL
   Value: postgresql://praymid_user:YourPassword@YOUR_VPS_IP:5432/praymid_db

   Key: POSTGRES_URL_NON_POOLING
   Value: (same value as POSTGRES_URL)

4. Remove or update these old Supabase keys if they exist:
   - NEXT_PUBLIC_SUPABASE_URL → set to your VPS URL or remove
   - NEXT_PUBLIC_SUPABASE_ANON_KEY → remove
   - SUPABASE_SERVICE_ROLE_KEY → remove

5. Click Save

---

## PART 8 — SECURITY HARDENING (RECOMMENDED)

### Step 21 — Create a firewall rule to allow only Vercel

Instead of allowing all IPs (0.0.0.0/0) you can restrict to specific IPs.
But for simplicity with Vercel serverless (dynamic IPs), keep 0.0.0.0/0 for now
and use a strong password.

### Step 22 — Install SSL for the connection (optional but recommended)

    sudo apt install -y certbot

---

## QUICK REFERENCE — USEFUL COMMANDS

Check PostgreSQL is running:
    sudo systemctl status postgresql

Connect to database:
    psql -U praymid_user -d praymid_db -h localhost

List all tables:
    \dt

See table structure:
    \d participants

Exit psql:
    \q

Restart PostgreSQL:
    sudo systemctl restart postgresql

View PostgreSQL logs:
    sudo tail -f /var/log/postgresql/postgresql-14-main.log

---

## TROUBLESHOOTING

Problem: "Connection refused"
Fix: Run: sudo systemctl restart postgresql

Problem: "Password authentication failed"
Fix: Make sure you used the exact password from Step 7

Problem: "pg_hba.conf" error
Fix: Check you added the line correctly in Step 12 and restarted in Step 13

Problem: Cannot connect remotely
Fix: Check ufw status with: sudo ufw status
     Make sure port 5432 shows as ALLOW

---

## SUMMARY OF WHAT YOU BUILT

Tables created: 12
- participants       — all user accounts
- mobile_verification_otps — OTP codes for phone verification
- payment_submissions — user payment proofs
- payout_requests    — user withdrawal requests
- transactions       — full transaction history
- predictions        — crypto prediction trades
- topup_requests     — balance top-up requests
- notifications      — in-app notifications
- activity_logs      — user activity tracking
- audit_logs         — admin action logs
- wallet_pool        — crypto wallet assignments
- invite_logs        — referral invite tracking

Once you complete all steps, tell v0 and the app will be connected to your VPS database.
