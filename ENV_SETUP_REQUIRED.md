# Environment Variables Setup

## Required Environment Variables

Add these to your Vercel project Settings → Environment Variables:

### Critical Variables (Required)

#### 1. **QSTASH_TOKEN**
- **Purpose**: Enable 30-minute automatic contribution matching after submission
- **Source**: [Upstash Console](https://console.upstash.com/)
- **Steps**: 
  1. Go to Upstash QStash section
  2. Copy your API token
  3. Add to Vercel as `QSTASH_TOKEN`
- **Status**: REQUIRED for auto-match feature

#### 2. **NEXT_PUBLIC_APP_URL**
- **Purpose**: Base URL for your application (used for callbacks and redirects)
- **Examples**: 
  - Production: `https://yourdomain.com`
  - Development: `http://localhost:3000`
- **Status**: REQUIRED for auto-match scheduler

#### 3. **CRON_SECRET**
- **Purpose**: Authenticates daily payout-contribution matching cron job
- **Generate**: Use `openssl rand -hex 32` or any 32+ character random string
- **Status**: REQUIRED for daily cron automation

### Optional Variables (for SMS/OTP features)

#### 4. **OTP_API_KEY**
- **Purpose**: API key for SMS OTP service
- **Status**: Optional - only if using mobile verification

#### 5. **OTP_SENDER_ID**
- **Purpose**: Sender ID for OTP messages
- **Status**: Optional - only if using mobile verification

#### 6. **OTP_TEMPLATE_ID**
- **Purpose**: Template ID for OTP message format
- **Status**: Optional - only if using mobile verification

### Already Configured (Supabase)

These are pre-configured from Supabase integration:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `SUPABASE_JWT_SECRET`

---

## How to Add to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click **Settings** → **Environment Variables**
4. Click **Add New** for each variable:
   - Key: Variable name (e.g., `QSTASH_TOKEN`)
   - Value: Your actual value
   - Select environments: Production/Preview/Development
5. Click **Save**
6. **Redeploy** your project for changes to take effect

---

## Quick Setup Checklist

- [ ] Generate `CRON_SECRET` (32+ random characters)
- [ ] Get `QSTASH_TOKEN` from Upstash
- [ ] Set `NEXT_PUBLIC_APP_URL` to your domain
- [ ] Add all three to Vercel
- [ ] Redeploy project
- [ ] Test: Visit `/api/health` to verify configuration

---

## Verification

Check that variables are properly set:

```bash
# Visit this endpoint to verify
https://yourdomain.com/api/health
```

Should return:
```json
{
  "status": "healthy",
  "environment": {
    "nodeEnv": "production",
    "hasSupabaseUrl": true,
    "hasSupabaseKey": true
  }
}
```

---

## Support

If you encounter issues:
1. Verify all variables are set in Vercel Settings
2. Wait 30-60 seconds after saving for deployment
3. Check browser console for errors
4. Visit `/admin/dashboard` to test features
5. Check logs in Vercel Deployments tab
