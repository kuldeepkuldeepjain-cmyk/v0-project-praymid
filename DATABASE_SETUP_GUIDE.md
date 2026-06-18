# DATABASE SETUP GUIDE - PYRAMID APPLICATION

## Your New Supabase Database Connection

**Database Host:** db.hcvmiblkklcrkwthraxw.supabase.co  
**Database Port:** 5432  
**Database Name:** postgres  
**Username:** postgres  
**Password:** Arpit@881150

**Full Connection String:**
```
postgresql://postgres:Arpit@881150@db.hcvmiblkklcrkwthraxw.supabase.co:5432/postgres
```

---

## STEP 1: Execute Database Setup SQL

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire contents of `DATABASE_SETUP.sql` file from this project
6. Paste it into the SQL editor
7. Click **Run** or press `Ctrl+Enter`
8. Wait for all tables to be created successfully

---

## STEP 2: Verify All Tables Created

After running the SQL script, verify these 13 tables exist:
- ✓ participants
- ✓ predictions
- ✓ payment_submissions
- ✓ payout_requests
- ✓ contribution_ledger
- ✓ topup_requests
- ✓ transactions
- ✓ activity_logs
- ✓ invite_logs
- ✓ mobile_verification_otps
- ✓ notifications
- ✓ wallet_pool
- ✓ admin_users

---

## STEP 3: Update Environment Variables

### In Vercel Project Settings:
Add these environment variables to your Vercel project:

```
DATABASE_URL=postgresql://postgres:Arpit@881150@db.hcvmiblkklcrkwthraxw.supabase.co:5432/postgres
POSTGRES_URL=postgresql://postgres:Arpit@881150@db.hcvmiblkklcrkwthraxw.supabase.co:5432/postgres
POSTGRES_URL_NON_POOLING=postgresql://postgres:Arpit@881150@db.hcvmiblkklcrkwthraxw.supabase.co:5432/postgres
```

### In .env.local (for local development):
Create a `.env.local` file in the project root:

```
DATABASE_URL=postgresql://postgres:Arpit@881150@db.hcvmiblkklcrkwthraxw.supabase.co:5432/postgres
POSTGRES_URL=postgresql://postgres:Arpit@881150@db.hcvmiblkklcrkwthraxw.supabase.co:5432/postgres
POSTGRES_URL_NON_POOLING=postgresql://postgres:Arpit@881150@db.hcvmiblkklcrkwthraxw.supabase.co:5432/postgres
```

### On VPS:
Set these environment variables in your VPS deployment:

```bash
export DATABASE_URL=postgresql://postgres:Arpit@881150@db.hcvmiblkklcrkwthraxw.supabase.co:5432/postgres
export POSTGRES_URL=postgresql://postgres:Arpit@881150@db.hcvmiblkklcrkwthraxw.supabase.co:5432/postgres
export POSTGRES_URL_NON_POOLING=postgresql://postgres:Arpit@881150@db.hcvmiblkklcrkwthraxw.supabase.co:5432/postgres
```

Or add to your `.env` file if using PM2/Docker.

---

## STEP 4: Verify Connection

Run this test command to verify the connection works:

```bash
npm run build && npm start
```

The application should connect to your Supabase database successfully.

---

## TABLE SCHEMA DETAILS

### PARTICIPANTS
- Stores all user accounts
- Fields: id, email, password, full_name, mobile, wallet, balance, status, referral info, etc.
- Key for joining with other tables

### PREDICTIONS
- Trading/prediction history
- Tracks profit/loss and results
- Linked to participant via `participant_id`

### PAYMENT_SUBMISSIONS
- Payment requests from participants
- Tracks status: pending, approved, rejected
- Linked to participants

### PAYOUT_REQUESTS
- Payout requests from participants
- Status tracking for processing
- Matched with payments via `match_status`

### CONTRIBUTION_LEDGER
- Tracks payment-payout matches
- Links payment and payout transactions
- Ensures 1:1 correspondence

### TOPUP_REQUESTS
- Balance top-up requests
- Status tracking: pending, completed
- Finance audit trail

### TRANSACTIONS
- Complete financial transaction history
- Type: payment_bet, topup, withdrawal, etc.
- Full audit trail

### ACTIVITY_LOGS
- Admin and participant actions
- Security and compliance audit trail
- Linked to actor_id (participant who performed action)

### SUPPORTING TABLES
- invite_logs: Referral tracking
- mobile_verification_otps: OTP verification
- notifications: User notifications
- wallet_pool: Available wallets for assignment
- admin_users: Admin credentials

---

## KEY FEATURES

✓ **Soft Deletes:** All tables have `is_deleted` flag for safe data removal  
✓ **Audit Trail:** `created_at` and `updated_at` timestamps on all tables  
✓ **Foreign Keys:** Proper referential integrity with CASCADE delete  
✓ **Indexes:** Performance optimization for common queries  
✓ **Data Types:** BIGSERIAL for ID (scalable), DECIMAL for money, TIMESTAMP WITH TIME ZONE for dates  

---

## NEXT STEPS

1. ✓ Execute DATABASE_SETUP.sql in Supabase SQL Editor
2. ✓ Verify all 13 tables are created
3. ✓ Update environment variables
4. ✓ Download project and upload to VPS
5. ✓ Set environment variables on VPS
6. ✓ Run application and test connections

---

## TROUBLESHOOTING

### Connection Refused
- Check firewall rules on Supabase dashboard
- Verify IP whitelisting is enabled
- Confirm password is correct

### Tables Not Found
- Run DATABASE_SETUP.sql again
- Check SQL errors in Supabase console
- Ensure you're in the correct project/database

### Authentication Errors
- Verify environment variable values
- Check for typos in connection string
- Confirm database credentials

### Application Won't Start
- Check `npm run build` succeeds
- Verify DATABASE_URL is set
- Check logs for specific errors

---

**Setup Complete!** Your database is now ready for production use.
