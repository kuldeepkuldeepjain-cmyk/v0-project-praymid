# Contribution Auto-Match After 30 Minutes

## Overview
Contributions are automatically matched with payout requests 30 minutes after submission if not manually matched by the admin. This ensures faster processing and reduces manual admin workload.

## How It Works

### 1. Contribution Submission Flow
- Participant submits contribution proof via `/api/participant/submit-payment`
- Contribution is stored in `payment_submissions` table with `status: "pending"`
- **Auto-match scheduler is immediately triggered** with a 30-minute delay

### 2. 30-Minute Delay Processing
- Uses **Upstash QStash** for reliable delayed task scheduling
- Message is queued with 30-second retry policy
- Automatically triggers `/api/admin/auto-match-single-contribution` after delay

### 3. Auto-Match Logic (After 30 Minutes)
When the scheduled task runs:

1. **Verifies contribution status**
   - Checks if contribution exists
   - Checks if already manually matched (skips if true)
   - Checks if contribution is approved (only approved contributions are auto-matched)

2. **Finds matching payout**
   - Queries for oldest pending payout for same participant (FIFO)
   - If no payout found, skips gracefully

3. **Creates the match**
   - Updates `payment_submissions.matched_payout_id`
   - Updates `payout_requests.matched_contribution_id`
   - Changes payout status to `in_process`
   - Records `matched_at` timestamp

4. **Notifications & Logging**
   - Sends success notification to participant
   - Creates activity log entry: `auto_match_contribution_30min`
   - Non-fatal failures don't block the match

## Requirements

### Environment Variables
```
QSTASH_TOKEN=<your-upstash-qstash-token>
NEXT_PUBLIC_APP_URL=<your-app-url>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### Setup Steps

1. **Enable Upstash QStash**
   - Sign up at upstash.com
   - Create QStash project
   - Copy token to environment variables

2. **Configure Webhook**
   - Auto-match endpoint: `https://yourdomain.com/api/admin/auto-match-single-contribution`
   - Already configured in `lib/contribution-scheduler.ts`
   - Automatically called by QStash after 30-minute delay

## API Endpoints

### 1. Schedule Auto-Match (Called internally)
```bash
Function: scheduleContributionAutoMatch(contributionId, participantEmail, delaySeconds)
Location: /lib/contribution-scheduler.ts
Usage: Automatically called when contribution is submitted
Returns: { success: boolean, messageId?: string }
```

### 2. Execute Auto-Match (Webhook)
```bash
POST /api/admin/auto-match-single-contribution
Body: { contributionId, participantEmail, delayedAt }
Returns: {
  success: boolean,
  message: string,
  matched: boolean,
  contributionId: string,
  payoutSerialNumber: number
}
```

## Timeline

### Participant Perspective
- **T+0s**: Submits contribution proof
- **T+30min**: Receives notification that contribution is matched (if payout exists)
- **T+30min+**: Payout enters `in_process` status

### Admin Perspective
- **Before T+30min**: Can manually match if they prefer
- **At T+30min**: System automatically matches if not yet matched
- Can still override/adjust match after auto-match completes

## Error Handling

| Scenario | Behavior | Result |
|----------|----------|--------|
| Contribution not approved yet | Skips matching | Status remains pending, retry later |
| No pending payout exists | Skips matching | Contribution unmatched until payout created |
| Contribution already matched | Skips matching | Returns success with `alreadyMatched: true` |
| Scheduling fails | Logs warning, continues | Manual match still possible |
| QStash fails | Auto-retry up to 3 times | Falls back to daily cron job |

## Monitoring

### Check Scheduled Matches
- View in Upstash dashboard at https://console.upstash.com/qstash
- See message status and retry history

### Check Execution
- **Success**: Contribution has `matched_payout_id` set and `matched_at` timestamp
- **Activity logs**: Search for `auto_match_contribution_30min` action
- **Notifications**: Check `notifications` table for auto-match messages

### Debugging
Enable detailed logs:
```typescript
// Check browser console or server logs for [v0] debug messages
console.log("[v0] Auto-matching contribution...")
```

## Comparison with Daily Cron

| Feature | 30-Min Auto-Match | Daily Cron Job |
|---------|-------------------|-----------------|
| Timing | 30 minutes after approval | Once per day at 2 AM UTC |
| Real-time | Yes, near-instant | No, delayed up to 24 hours |
| Overhead | Per-contribution (lighter with delays) | Batch processing |
| Reliability | QStash retries 3x | Vercel cron with logging |
| Fallback | Daily cron still runs | - |
| Cost | QStash charges per message | Free (Vercel Pro) |

Both systems work together for maximum reliability!

## Troubleshooting

### Contribution not auto-matching after 30 minutes
- Check if contribution is `approved` status
- Check if payout exists in `payout_requests` table
- Verify `QSTASH_TOKEN` is set correctly
- Check Upstash dashboard for failed messages
- Manually match in admin dashboard if needed

### Too many/few matches happening
- Verify FIFO logic is working (check `created_at` order)
- Check `matched_payout_id` field in payment_submissions
- Review activity logs for `auto_match_contribution_30min`

### Integration Disabled?
If auto-match scheduling fails gracefully:
1. Manual matching still works via admin dashboard
2. Daily cron job provides fallback
3. Check environment variables and QStash account status
