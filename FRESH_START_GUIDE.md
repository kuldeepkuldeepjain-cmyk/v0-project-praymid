# 🎯 Fresh Start Guide - New Supabase Database Setup

This guide will help you set up a brand new Supabase database from scratch with zero errors.

---

## Step 1: Create New Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Choose:
   - **Project Name**: Your app name (e.g., "FlowChain Production")
   - **Database Password**: Create a strong password (SAVE THIS!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine to start
4. Click **"Create new project"**
5. Wait 2-3 minutes for setup to complete

---

## Step 2: Run Database Setup Script

1. In your new Supabase project, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Copy the ENTIRE contents of `scripts/NEW_DATABASE_SETUP.sql`
4. Paste into the SQL Editor
5. Click **"Run"** (or press Ctrl+Enter)
6. You should see: **"Database setup complete! All tables created successfully."**

✅ Your database now has 14 tables with proper relationships and security policies!

---

## Step 3: Get Your Environment Variables

1. In Supabase, go to **Settings** → **API**
2. Copy these 3 values:

```
Project URL: https://xxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (click "Reveal" first)
```

---

## Step 4: Configure v0 Environment Variables

### Option A: In v0 Dashboard (Recommended)
1. Open your v0 project
2. Click the **sidebar** → **"Vars"** tab
3. Add these 3 variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1Ni...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1Ni...
   ```
4. Click **"Save"** for each

### Option B: In Vercel Deployment
1. Go to your Vercel project
2. Settings → Environment Variables
3. Add the same 3 variables above
4. Click **"Save"**
5. Go to Deployments → Click "..." → **"Redeploy"**

---

## Step 5: Verify Everything Works

### Test in v0 Preview:
1. Visit `/test-db` page
2. Run all tests
3. Should see all ✅ green checks

### Test Registration:
1. Go to `/participant/register`
2. Fill out the form with test data:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `Test123!`
   - Fill other required fields
3. Click **"Register"**
4. Should see success message

### Test Login:
1. Go to `/participant/login`
2. Enter:
   - Email: `test@example.com`
   - Password: `Test123!`
3. Click **"Login"**
4. Should redirect to dashboard

### Verify Database:
1. Go to Supabase → **Table Editor**
2. Click **"participants"** table
3. You should see your test user!

---

## Step 6: Deploy to Production

1. Make sure all environment variables are in Vercel (Step 4, Option B)
2. Push your code to GitHub (if connected)
3. Or click **"Publish"** in v0
4. Visit your live site
5. Test registration and login again

---

## 🔧 Troubleshooting

### "Invalid email or password" on first login
- **Cause**: No account exists yet
- **Fix**: Register a new account first at `/participant/register`

### "Unexpected end of JSON input"
- **Cause**: Environment variables not set
- **Fix**: Double-check all 3 variables are in Vercel settings
- **Fix**: Redeploy after adding variables

### Tables not found
- **Cause**: SQL script didn't run completely
- **Fix**: Re-run the entire `NEW_DATABASE_SETUP.sql` script
- **Check**: Go to Supabase → Table Editor, should see 14 tables

### Registration works but login fails
- **Cause**: Password comparison issue (already fixed in your code)
- **Fix**: Delete test user from database, register again
- **Check**: Console logs should show password comparison details

---

## 🎉 You're All Set!

Your app now has:
- ✅ Real Supabase database (not localStorage)
- ✅ Persistent user accounts
- ✅ Admin dashboard with real data
- ✅ Proper authentication
- ✅ 14 database tables for all features
- ✅ Row Level Security enabled
- ✅ Works in both preview and production

### What Works Now:
1. **User Registration** → Saves to `participants` table
2. **User Login** → Authenticates against database
3. **Admin Dashboard** → Fetches real participant data
4. **Predictions** → Stored in `predictions` table
5. **Payouts** → Tracked in `payout_requests` table
6. **Support Tickets** → Saved in `support_tickets` table
7. **Activity Logging** → All actions logged in `activity_logs`

---

## 📊 Database Tables Created

1. **participants** - User accounts
2. **activity_logs** - All system activity
3. **support_tickets** - User support requests
4. **gas_approvals** - Crypto gas fee approvals
5. **payment_submissions** - Payment uploads
6. **payout_requests** - Withdrawal requests
7. **wallet_pool** - Crypto wallet management
8. **predictions** - Trading predictions
9. **spin_coupons** - Spin wheel rewards
10. **topup_requests** - Account top-ups
11. **user_contacts** - Contact lists
12. **invite_logs** - Referral tracking
13. **system_settings** - App configuration
14. **notifications** - User notifications

---

## 🚀 Next Steps

1. **Test all features** in preview
2. **Create your first admin account** (use special credentials)
3. **Test payout flow** from participant → admin approval
4. **Customize system settings** in Supabase
5. **Deploy to production** and share your link!

Need help? Check the console logs - they're very detailed now with `[v0]` prefixes.
