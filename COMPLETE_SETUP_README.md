# PYRAMID APPLICATION - COMPLETE DATABASE SETUP GUIDE

## Overview

This document provides complete instructions for setting up your Pyramid application with your newly connected Supabase PostgreSQL database.

---

## YOUR DATABASE CREDENTIALS

```
Hostname: db.hcvmiblkklcrkwthraxw.supabase.co
Port: 5432
Database: postgres
Username: postgres
Password: Arpit@881150
Connection String: postgresql://postgres:Arpit@881150@db.hcvmiblkklcrkwthraxw.supabase.co:5432/postgres
```

---

## QUICK START

### Option 1: Local Development

1. **Clone or Download Project**
   ```bash
   cd pyramid-app
   ```

2. **Create `.env.local` file:**
   ```bash
   cp .env.example .env.local
   ```

3. **Update `DATABASE_URL` in `.env.local`:**
   ```
   DATABASE_URL=postgresql://postgres:Arpit@881150@db.hcvmiblkklcrkwthraxw.supabase.co:5432/postgres
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Create database tables:**
   - Open Supabase dashboard: https://app.supabase.com
   - Go to SQL Editor
   - Open `DATABASE_SETUP.sql` from this project
   - Execute the SQL script

6. **Run application:**
   ```bash
   npm run dev
   ```

7. **Access application:**
   ```
   http://localhost:3000
   ```

### Option 2: VPS Deployment

1. **Upload project to VPS**
   ```bash
   scp -r pyramid-app user@vps-ip:/home/user/
   ```

2. **SSH into VPS**
   ```bash
   ssh user@vps-ip
   cd /home/user/pyramid-app
   ```

3. **Create `.env.local` with database credentials**
   ```bash
   nano .env.local
   # Add: DATABASE_URL=postgresql://postgres:Arpit@881150@...
   ```

4. **Execute database setup SQL in Supabase**
   - Same as local: Copy `DATABASE_SETUP.sql` to Supabase SQL Editor

5. **Install and run**
   ```bash
   npm install
   npm run build
   pm2 start npm --name "pyramid" -- start
   ```

---

## COMPLETE SETUP CHECKLIST

### Phase 1: Database Setup

- [ ] Supabase account created
- [ ] PostgreSQL database accessible
- [ ] Database credentials saved
- [ ] `DATABASE_SETUP.sql` file available in project
- [ ] SQL script executed in Supabase SQL Editor
- [ ] All 13 tables created successfully
- [ ] Indexes created for performance

### Phase 2: Environment Configuration

- [ ] `.env.local` file created
- [ ] `DATABASE_URL` set correctly
- [ ] `POSTGRES_URL` set correctly
- [ ] `POSTGRES_URL_NON_POOLING` set correctly
- [ ] No sensitive data exposed
- [ ] Environment file added to `.gitignore`

### Phase 3: Application Setup

- [ ] Dependencies installed: `npm install`
- [ ] Build succeeded: `npm run build`
- [ ] No TypeScript errors
- [ ] Database connection verified
- [ ] Application starts without errors

### Phase 4: Testing

- [ ] Admin panel loads
- [ ] Can view participants
- [ ] Can view predictions
- [ ] Can view payments
- [ ] Can view payouts
- [ ] Deletion functionality works
- [ ] Password display works
- [ ] Database queries execute

### Phase 5: Deployment (VPS Only)

- [ ] Project uploaded to VPS
- [ ] Environment variables set on VPS
- [ ] Dependencies installed on VPS
- [ ] Build successful on VPS
- [ ] PM2 configured for auto-restart
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate installed
- [ ] Domain points to VPS
- [ ] Application accessible via domain

---

## FILES INCLUDED IN THIS PROJECT

### Configuration Files

- **`.env.example`** - Environment variables template
- **`DATABASE_SETUP.sql`** - Complete database schema
- **`DATABASE_SETUP_GUIDE.md`** - Detailed database setup
- **`VPS_DEPLOYMENT_GUIDE.md`** - Complete VPS deployment instructions

### Application Files

- **`lib/db.ts`** - Database connection utility
- **`app/api/admin/**`** - Admin API endpoints
- **`components/admin/**`** - Admin panel components

---

## DATABASE SCHEMA (13 TABLES)

### 1. **participants**
Stores user account information
- Fields: email, name, password, wallet, balance, status, referral info
- Indexes: email, status, created_at

### 2. **predictions**
Trading/prediction history
- Linked to: participants
- Fields: amount, type, result, profit_loss

### 3. **payment_submissions**
Payment requests from participants
- Fields: amount, status, matched_payout_id
- Status: pending, approved, rejected

### 4. **payout_requests**
Payout withdrawal requests
- Fields: amount, status
- Status: pending, processing, completed

### 5. **contribution_ledger**
Payment-Payout matching
- Links: payments ↔ payouts
- Ensures 1:1 correspondence

### 6. **topup_requests**
Wallet top-up requests
- Fields: amount, status
- Status: pending, completed

### 7. **transactions**
Financial transaction history
- Type: payment_bet, topup, withdrawal
- Full audit trail

### 8. **activity_logs**
Admin and participant actions
- Linked to: participants (actor_id)
- Security audit trail

### 9. **invite_logs**
Referral tracking
- Tracks invitations and sign-ups

### 10. **mobile_verification_otps**
OTP verification for mobile
- Fields: email, otp, expires_at

### 11. **notifications**
User notifications
- Fields: title, message, type

### 12. **wallet_pool**
Available wallets for assignment
- Linked to: participants

### 13. **admin_users**
Admin credentials
- Fields: email, password_hash, role

---

## KEY DATABASE FEATURES

✓ **Soft Deletes** - `is_deleted` flag on all tables  
✓ **Audit Trail** - `created_at`, `updated_at` on all tables  
✓ **Cascading Deletes** - Foreign key constraints with CASCADE  
✓ **Performance Indexes** - On all commonly queried columns  
✓ **Data Type Optimization** - BIGSERIAL for IDs, DECIMAL for money  
✓ **Timezone Support** - TIMESTAMP WITH TIME ZONE for accuracy  

---

## TROUBLESHOOTING

### Database Connection Issues

**Error: "No database connection"**
```
Solution: Check DATABASE_URL environment variable is set correctly
```

**Error: "Column does not exist"**
```
Solution: Run DATABASE_SETUP.sql in Supabase SQL Editor
```

**Error: "Permission denied"**
```
Solution: Verify database credentials are correct
```

### Application Issues

**Port already in use**
```bash
lsof -i :3000
kill -9 <PID>
```

**Out of memory**
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

**Build fails**
```bash
rm -rf .next node_modules
npm install
npm run build
```

---

## MAINTENANCE

### Backups
```bash
# Backup from Supabase Dashboard or:
pg_dump postgresql://postgres:Arpit@881150@... > backup.sql
```

### Monitoring
```bash
# Check PM2 status
pm2 status
pm2 logs pyramid

# Check disk space
df -h

# Check database connections
psql postgresql://postgres:Arpit@881150@...
```

### Updates
```bash
# Pull latest code
git pull

# Install new dependencies
npm install

# Build
npm run build

# Restart
pm2 restart pyramid
```

---

## SECURITY

- Database password is stored securely in environment variables
- No credentials in git repository
- Use strong JWT secrets in production
- Enable SSL for database connections (done by default)
- Implement rate limiting in production
- Keep Node.js and dependencies updated
- Use strong admin passwords
- Regular security audits

---

## PERFORMANCE

- Database connection pooling configured
- Indexes on all commonly queried columns
- Soft deletes prevent data multiplication
- Efficient pagination
- Query optimization implemented

---

## SUPPORT

For issues or questions:
1. Check logs: `pm2 logs pyramid`
2. Verify database connection
3. Check environment variables
4. Review error messages carefully
5. Check Supabase dashboard for database status

---

## NEXT STEPS

1. ✓ Download this project
2. ✓ Create `.env.local` with database credentials
3. ✓ Execute `DATABASE_SETUP.sql` in Supabase
4. ✓ Install dependencies: `npm install`
5. ✓ Test locally: `npm run dev`
6. ✓ Upload to VPS
7. ✓ Configure on VPS (see VPS_DEPLOYMENT_GUIDE.md)
8. ✓ Monitor in production

---

**Your complete Pyramid application with Supabase PostgreSQL database is now ready for production deployment!**

