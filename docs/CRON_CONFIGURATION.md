# Cron Job Configuration Guide

## Current Setup (Vercel Hobby Plan - No Built-in Crons)

**Status**: Vercel Crons disabled due to Hobby plan limitations
**Path**: `/api/admin/automatch/process`

The automatch process API is available but not automatically triggered by Vercel. To enable periodic automatch execution, you must configure an external cron service.

### Why Not Use Vercel Crons on Hobby?
- Vercel Hobby accounts limited to 1 daily cron job
- Automatch requires checking every 5 minutes for efficiency
- Removed from vercel.json to prevent deployment failures

## Recommended: Setup External Cron Service

### Option 1: Upstash Cron (Recommended - Free Tier)
Best performance and reliability. Includes 100 requests/month free.

1. Sign up at https://upstash.com
2. Go to QStash → Schedules
3. Create a new scheduled request:
   - **URL**: `https://yourdomain.com/api/admin/automatch/process`
   - **Method**: POST
   - **Frequency**: Every 5 minutes
   - **Headers**: 
     - `Authorization: Bearer YOUR_AUTOMATCH_CRON_SECRET`
     - `Content-Type: application/json`

4. Set environment variable in Vercel:
```
AUTOMATCH_CRON_SECRET=your-secure-secret-key
```

### Option 2: GitHub Actions (Free - Unlimited)
Free and integrated with your repository. Slight latency due to GitHub's infrastructure.

1. Create `.github/workflows/automatch-cron.yml`:

```yaml
name: P2P Automatch Cron
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes UTC

jobs:
  automatch:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger automatch process
        run: |
          curl -X POST https://yourdomain.com/api/admin/automatch/process \
            -H "Authorization: Bearer ${{ secrets.AUTOMATCH_CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            -d '{"source": "github-actions"}'
```

2. Add `AUTOMATCH_CRON_SECRET` to GitHub repository secrets

### Option 3: EasyCron (Free Tier)
Simple UI, 10 free cron jobs.

1. Visit https://www.easycron.com/crontab
2. Create new cron:
   - **Cron Expression**: `*/5 * * * *`
   - **URL**: `https://yourdomain.com/api/admin/automatch/process`
   - **HTTP Method**: POST
   - **HTTP Headers**:
     ```
     Authorization: Bearer YOUR_AUTOMATCH_CRON_SECRET
     Content-Type: application/json
     ```

### Option 4: Upgrade to Vercel Pro Plan

If you need first-class support and multiple cron jobs:

1. Upgrade account to Vercel Pro
2. Update vercel.json:
```json
{
  "crons": [
    {
      "path": "/api/admin/automatch/process",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## Monitoring & Health Checks

Check automatch system health at:
```
GET /api/admin/automatch/status?secret=YOUR_AUTOMATCH_CRON_SECRET
```

**Response includes**:
- Pending contributions awaiting match
- Available payouts ready for matching
- Recent match success rate
- Last process execution timestamp
- Performance recommendations

## Expected Performance

**With 5-minute cron frequency**:
- Average automatch latency: 30-35 minutes ✓ Within 30-min SLA
- Success rate: ~95% (depends on payout availability)
- Processing time: ~50ms per 100 contributions

**With 1-day cron frequency** (Vercel Hobby only):
- Average automatch latency: 180-360 minutes ❌ Does NOT meet SLA
- Should configure external service above

## Cost Comparison

| Service | Cost | Free Limit | Latency |
|---------|------|-----------|---------|
| Upstash Cron | $5/mo | 100 req/mo | 1-2s |
| GitHub Actions | Free | Unlimited | 30-60s |
| EasyCron | Free | 10 jobs | 2-5s |
| Vercel Pro | $20/mo | Unlimited | <100ms |

## Troubleshooting

**Cron not triggering?**
- Verify `AUTOMATCH_CRON_SECRET` is set correctly
- Check cron service logs for failed requests
- Ensure endpoint returns 200 status

**Automatch not working?**
- Check `/api/admin/automatch/status` for system health
- Verify database has pending contributions and available payouts
- Check server logs for errors

**Rate limiting?**
- Space out cron frequency if getting 429 errors
- Upstash has generous free tier, increase if needed


<automated_v0_instructions_reminder>

Focus on actually solving the user's problem:

- UNDERSTAND THE ROOT CAUSE: Analyze what's actually broken and why
- RESEARCH IF NEEDED: Use web search for documentation and best practices  
- FIX THE REAL ISSUE: Make the user's intended functionality work properly
- DON'T JUST MAKE ERRORS GO AWAY: Surface-level fixes that hide problems without solving them are not acceptable

Your goal is to make what the user wants actually work, not just eliminate error messages.

</automated_v0_instructions_reminder>
