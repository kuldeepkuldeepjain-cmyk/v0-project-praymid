# Automated Payout-Contribution Matching Setup Guide

## Overview
This system automatically matches pending payouts with approved contributions if no manual matching occurs within 30 minutes. The process runs every 5 minutes using a scheduled cron job.

## Current Status
✅ **System is now configured and ready to use**

### What's Been Set Up:
1. **vercel.json** - Cron schedule configuration (every 5 minutes)
2. **Auto-Match API** - Enhanced `/api/admin/auto-match-payout-contribution` endpoint
3. **Comprehensive Logging** - Detailed logging for debugging and monitoring

## Required Configuration

### 1. Set CRON_SECRET Environment Variable
Add this to your Vercel project's environment variables:

```
CRON_SECRET=your-secure-random-secret-here-min-32-characters
```

**How to add in Vercel:**
1. Go to Vercel Dashboard → Project Settings
2. Navigate to "Environment Variables"
3. Add key: `CRON_SECRET`
4. Value: Generate a secure random string (32+ characters)
5. Add under Production, Preview, and Development environments

**Generate a secure secret:**
```bash
openssl rand -base64 32
# or online: https://www.random.org/strings/
```

## How It Works

### Matching Flow:
1. **Cron triggers every 5 minutes** → Calls `/api/admin/auto-match-payout-contribution`
2. **Vercel validates** → Checks `x-vercel-cron` header automatically
3. **Query contributions** → Finds approved contributions older than 30 minutes that aren't matched
4. **Find payouts** → For each contribution, finds the oldest pending payout for that participant (FIFO)
5. **Create match** → Links contribution to payout, updates both records, sets payout status to `in_process`
6. **Notify user** → Sends notification to participant about successful matching
7. **Log activity** → Records the auto-match action for audit trail

### Status Updates:
- **Payment Submission** → `matched_payout_id` set, `matched_at` timestamp recorded
- **Payout Request** → `matched_contribution_id` set, `matched_at` timestamp recorded, status → `in_process`

## API Endpoint Details

**URL:** `/api/admin/auto-match-payout-contribution`  
**Method:** POST  
**Authentication:** 
- Vercel Cron: Automatic `x-vercel-cron: true` header
- Manual calls: `Authorization: Bearer {CRON_SECRET}`

### Response Example (Success):
```json
{
  "success": true,
  "message": "Auto-matched 3 contributions with payouts",
  "matchedCount": 3,
  "totalProcessed": 5,
  "results": [
    {
      "contribution_id": "uuid-1",
      "payout_id": "uuid-2",
      "payout_serial": "P123456",
      "status": "success"
    },
    {
      "contribution_id": "uuid-3",
      "status": "skipped",
      "reason": "No pending payout found"
    },
    {
      "contribution_id": "uuid-4",
      "payout_id": "uuid-5",
      "status": "failed",
      "error": "Error message"
    }
  ],
  "timestamp": "2024-03-20T10:30:00.000Z"
}
```

## Testing the Cron Job

### Option 1: Using curl (Manual Test)
```bash
curl -X POST https://your-domain.com/api/admin/auto-match-payout-contribution \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Option 2: Check Vercel Cron Status
1. Go to Vercel Dashboard → Your Project
2. Navigate to "Deployments" → "Crons"
3. View execution history and logs

### Option 3: Monitor Logs
Check your database logs and Vercel function logs for `[v0]` prefixed messages:
- `[v0] Auto-match payout-contribution cron triggered`
- `[v0] Found X unmatched contributions`
- `[v0] Successfully matched contribution X with payout`

## Matching Logic (FIFO - First In, First Out)

The system uses FIFO (First In, First Out) to ensure fair processing:

1. **Contributions are processed** in order of `reviewed_at` (oldest first)
2. **Payouts are matched** with the oldest pending payout for that participant
3. **This ensures** older requests get processed first, preventing stale matches

Example:
```
Contribution A (reviewed 2 hours ago) ← matched first
Contribution B (reviewed 1.5 hours ago)
Contribution C (reviewed 1 hour ago)

For same participant:
Payout 1 (created 3 days ago) ← matched first
Payout 2 (created 2 days ago)
Payout 3 (created 1 day ago)
```

## Skip Scenarios

The system will skip a contribution if:
- ❌ No pending payout exists for that participant
- ❌ Contribution is already matched (has `matched_payout_id`)
- ❌ Contribution is not in `approved` status
- ❌ Contribution was approved less than 30 minutes ago

## Notifications & Logging

### Participant Notification
When a match is created, the participant receives:
- **Type:** Success
- **Title:** "Payout Matched"
- **Message:** "Your contribution has been automatically matched with payout request #XXXXX. Processing in progress."

### Activity Log
Each successful match is logged as:
- **Action:** `auto_match_payout_contribution`
- **Actor:** `system`
- **Details:** `Auto-matched contribution {id} with payout #{serial_number}`
- **Target Type:** `payment_submission`

## Monitoring & Troubleshooting

### Check if Cron is Running
1. **Vercel Dashboard** → Project → Settings → Crons
2. Look for `/api/admin/auto-match-payout-contribution`
3. Check execution history

### Common Issues

#### Issue: "Unauthorized" errors
**Solution:** Ensure `CRON_SECRET` is set in Vercel environment variables

#### Issue: No matches being created
**Possible causes:**
- No approved contributions older than 30 minutes
- No pending payouts for participants with old contributions
- Contributions already manually matched

#### Issue: Cron not triggering
**Check:**
1. `vercel.json` exists in project root
2. Cron schedule in `vercel.json` is valid
3. Project deployed to Vercel
4. Check Vercel deployment logs

### Debug Logging
All operations log with `[v0]` prefix for easy filtering. Check:
- Vercel Function Logs
- Supabase Activity Logs
- Database `activity_logs` table

## Configuration Recap

✅ **What's already done:**
- [x] `vercel.json` created with cron schedule (every 5 minutes)
- [x] Auto-match API enhanced with logging and Vercel support
- [x] Payout status update to `in_process` when matched
- [x] Participant notifications
- [x] Activity logging

⏳ **What you need to do:**
- [ ] Set `CRON_SECRET` in Vercel environment variables
- [ ] Deploy to Vercel (crons only work in production)
- [ ] Monitor logs to confirm matches are working

## Security Notes

- ✅ CRON_SECRET prevents unauthorized API calls
- ✅ Vercel auto-validates with `x-vercel-cron` header in production
- ✅ All auto-matches are logged for audit trail
- ✅ Rollback logic ensures data consistency on errors
- ✅ FIFO processing prevents race conditions

## Next Steps

1. **Set CRON_SECRET** in Vercel environment variables
2. **Deploy** your project to Vercel
3. **Monitor logs** in Vercel dashboard for successful matches
4. **Test manually** (optional) using the curl command above
5. **Verify** matches appear in database within 30 minutes of approval

---

**Questions?** Check the database schema or monitor the activity logs for detailed match history.
