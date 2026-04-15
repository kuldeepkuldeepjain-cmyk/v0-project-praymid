# Auto-Redirect Expired Payouts Setup

## Overview
This cron job automatically redirects pending payouts that haven't been completed within a specified timeout period (default: 24 hours) to the next available participant on a first-come basis.

## API Endpoint
```
GET /api/admin/auto-redirect-expired-payouts
```

## How It Works

1. **Checks Expired Payouts**: Finds all payouts with status `pending` that were created more than `PAYOUT_TIMEOUT_HOURS` ago
2. **Finds Next Participant**: Identifies the next available participant (most recently created, excluding the original recipient)
3. **Transfers Funds**: Updates the new participant's account balance with the payout amount
4. **Updates Status**: Changes payout status to `redirected` with `redirect_to_email` set to the new recipient
5. **Creates Notifications**: Sends notifications to the new participant about the redirected payout
6. **Logs Activity**: Records the redirect action in activity logs for audit trail

## Configuration

### Timeout Setting
Edit the constant in `/app/api/admin/auto-redirect-expired-payouts/route.ts`:
```typescript
const PAYOUT_TIMEOUT_HOURS = 24 // Adjust as needed
```

### Current Behavior
- **Default Timeout**: 24 hours
- **Batch Size**: Processes up to 50 expired payouts per run
- **Selection Strategy**: Next participant is the most recently created one (newest first)
- **Audit Trail**: All redirects are logged in activity_logs table

## Setup Options

### Option 1: Vercel Crons (Recommended)
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/admin/auto-redirect-expired-payouts",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

### Option 2: External Cron Service (EasyCron, Cron-Job.org)
Set up a scheduled HTTP request:
- **URL**: `https://your-domain.com/api/admin/auto-redirect-expired-payouts`
- **Method**: GET
- **Schedule**: Every 15 minutes (or as desired)
- **Headers**: Add any authentication headers if needed

### Option 3: GitHub Actions
Create `.github/workflows/auto-redirect-payouts.yml`:
```yaml
name: Auto-redirect Expired Payouts
on:
  schedule:
    - cron: '*/15 * * * *'

jobs:
  redirect:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger auto-redirect
        run: curl https://your-domain.com/api/admin/auto-redirect-expired-payouts
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Auto-redirect completed. X payouts redirected.",
  "redirectedCount": 5,
  "results": [
    {
      "payoutId": "uuid",
      "originalRecipient": "original@email.com",
      "newRecipient": "new@email.com",
      "amount": 100,
      "status": "success"
    }
  ]
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "message": "Failed to process auto-redirect"
}
```

## Database Changes

### New Status
- `redirected` - Payout has been automatically redirected to another participant

### Updated Fields
- `payout_requests.status` - Changed to `redirected`
- `payout_requests.redirect_to_email` - Email of new recipient
- `payout_requests.processed_at` - Timestamp of redirect
- `payout_requests.admin_notes` - Contains redirect reason

### New Records Created
- `transactions` - Records redirect transaction with type `payout_redirect`
- `activity_logs` - Audit record of redirect action
- `notifications` - Alert to new recipient about redirected payout

## Monitoring

Check redirect activity in:
1. **Dashboard**: View activity logs for `payout_auto_redirected` entries
2. **Database**: Query `payout_requests` where `status = 'redirected'`
3. **Notifications**: Check notification history for redirected payout messages

## Testing

Test the API manually:
```bash
curl https://your-domain.com/api/admin/auto-redirect-expired-payouts
```

Monitor logs for:
```
[v0] Starting auto-redirect of expired payouts...
[v0] Successfully redirected payout {id} to {email}
[v0] Auto-redirect completed. X payouts redirected.
```

## Troubleshooting

### No Participants Found
- Ensure there are multiple participants in the system
- Check that participants table has records other than the original recipient

### Balance Update Fails
- Verify participant records exist in the database
- Check for foreign key constraint issues

### Timeout Adjustments
- Shorter timeout (e.g., 12 hours): Redirect faster, more frequent redirects
- Longer timeout (e.g., 48 hours): Give admins more time to manually process

## Security Notes

- This API should be protected by admin authentication in production
- Consider adding API key validation or IP whitelisting
- Audit all redirect actions for compliance
