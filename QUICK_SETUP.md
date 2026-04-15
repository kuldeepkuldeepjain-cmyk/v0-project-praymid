# Quick Environment Setup Guide

## What You Need to Add to Vercel

### Step 1: Get QSTASH_TOKEN
1. Go to https://console.upstash.com
2. Login or create account
3. Go to **QStash** → **API Token**
4. Copy your token

### Step 2: Generate CRON_SECRET
Use any 32+ character random string. Example:
```
sk_live_abc123xyz789def456ghi789jkl012mno345pqr678stu901vwx234yz5678abc
```

Or generate one here: https://generate-random.org/ (use 32+ characters)

### Step 3: Set NEXT_PUBLIC_APP_URL
Your application URL:
- Production: `https://yourdomain.com`
- Development: `http://localhost:3000`

---

## Add to Vercel

1. Go to **Vercel Dashboard** → Your Project
2. Click **Settings** → **Environment Variables**
3. Add each variable:

| Key | Value | Scope |
|-----|-------|-------|
| `QSTASH_TOKEN` | Your token from Upstash | Production, Preview, Development |
| `CRON_SECRET` | Random 32+ char string | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | Your domain URL | Production, Preview, Development |

4. Click **Save**
5. **Redeploy** your project

---

## Verify Setup

After adding variables and redeploying:

Visit: `https://yourdomain.com/api/verify-env`

✅ Should show all variables configured

---

## Features Enabled After Setup

✅ 30-minute auto-match for contributions
✅ Cron job for daily matching
✅ All admin features operational
✅ Mobile OTP verification
✅ Full system health check

---

## Still Need Help?

- Check `/api/verify-env` for detailed status
- Read `ENV_SETUP_REQUIRED.md` for detailed explanations
- Visit `/admin/login` to access admin dashboard
