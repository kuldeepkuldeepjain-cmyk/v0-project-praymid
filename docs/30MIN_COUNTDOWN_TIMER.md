# 30-Minute Countdown Timer for P2P Contributions

## Overview
The P2P contribution system now includes a 30-minute countdown timer that starts when participants click **"I Want to Contribute"**. After 30 minutes, the contribution request automatically matches with a payout request below.

## How It Works

### 1. User Initiates Contribution Request
- Participant clicks **"I Want to Contribute"** button on the contribution page
- A `payment_submissions` record is created with `status: "request_pending"` and `created_at` timestamp
- The 30-minute countdown timer immediately starts

### 2. Countdown Timer Display
The timer appears in two places:

#### A. Contribution Page (Participant View)
- **Button State**: Shows "Request Pending" with countdown (MM:SS format) while timer is active
- **Status Card**: Displays a prominent orange card with:
  - Large countdown display (MM:SS)
  - Color-coded countdown:
    - Green: >10 minutes remaining
    - Orange: 5-10 minutes remaining  
    - Red: <1 minute remaining
  - Message: "Auto-Match in Progress"
  - Explanation: "A payout request will be automatically matched when the timer expires"

#### B. Admin P2P Contribution Panel
- **New Column**: "Auto-Match In" shows real-time countdown for each pending contribution
- **Status Indicator**: Shows "Auto-matching..." badge when timer reaches 0
- **Visual Feedback**: Color-coded countdown timer for quick admin visibility

### 3. Auto-Match Process
When the 30-minute timer expires:
1. The system automatically calls the auto-match API endpoint
2. Matching algorithm finds a compatible payout request
3. Contribution and payout are linked together
4. Both participant and payout recipient receive notifications
5. Participant sees payment instructions and payout details

## Technical Implementation

### Frontend Components

#### contribute/page.tsx
```typescript
// State for tracking countdown
const [pendingCountdownSeconds, setPendingCountdownSeconds] = useState<number>(0)

// Effect: Updates countdown every second based on created_at timestamp
useEffect(() => {
  const updateCountdown = () => {
    const createdAt = new Date(contribution.created_at).getTime()
    const now = Date.now()
    const elapsedSeconds = Math.floor((now - createdAt) / 1000)
    const remainingSeconds = Math.max(0, 30 * 60 - elapsedSeconds)
    setPendingCountdownSeconds(remainingSeconds)
  }
  
  updateCountdown()
  const timerInterval = setInterval(updateCountdown, 1000)
  return () => clearInterval(timerInterval)
}, [hasPendingSubmission, participantData?.email])
```

#### p2p-contribution-panel.tsx
```typescript
// State for tracking all contribution timers
const [timers, setTimers] = useState<Record<string, number>>({})

// Effect: Updates timers for all pending contributions
useEffect(() => {
  const timerInterval = setInterval(() => {
    setTimers((prev) => {
      const updated = { ...prev }
      contributions.forEach((contribution) => {
        const createdAt = new Date(contribution.created_at).getTime()
        const now = Date.now()
        const elapsedSeconds = Math.floor((now - createdAt) / 1000)
        const remainingSeconds = Math.max(0, 30 * 60 - elapsedSeconds)
        updated[contribution.id] = remainingSeconds
      })
      return updated
    })
  }, 1000)
  
  return () => clearInterval(timerInterval)
}, [contributions])
```

### Helper Functions

#### formatCountdown()
Converts seconds to MM:SS format
```typescript
const formatCountdown = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}
```

#### getCountdownColor()
Returns color based on remaining time
```typescript
const getCountdownColor = (seconds: number) => {
  if (seconds <= 60) return "text-red-400"      // Last minute
  if (seconds <= 300) return "text-orange-400"  // Last 5 minutes
  if (seconds <= 600) return "text-yellow-400"  // Last 10 minutes
  return "text-green-400"                       // More than 10 minutes
}
```

## Database Schema

### payment_submissions table
```sql
{
  id: UUID PRIMARY KEY,
  participant_id: UUID,
  participant_email: EMAIL,
  participant_name: STRING,
  amount: DECIMAL,
  payment_method: STRING,
  transaction_id: STRING,
  screenshot_url: STRING (nullable),
  status: ENUM ('pending', 'request_pending', 'approved', 'rejected', 'in_process'),
  created_at: TIMESTAMP,  -- Timer starts from this timestamp
  matched_payout_id: UUID (nullable),
  reviewed_at: TIMESTAMP (nullable)
}
```

**Key Field**: `created_at` - The timer calculation is based on this field. No additional columns needed.

## Auto-Match Trigger

### Method 1: Frontend-Initiated
When countdown reaches 0 seconds on frontend, call:
```
POST /api/admin/auto-match-single-contribution
Body: { participant_email, contribution_id }
```

### Method 2: Backend Cron Job (Recommended)
Scheduled job queries for contributions where:
```sql
WHERE status = 'request_pending' 
AND created_at <= NOW() - INTERVAL '30 minutes'
```

Then triggers auto-match for each expired contribution.

## User Experience Flow

### Participant Journey
1. Views contribution page
2. Clicks "I Want to Contribute"
3. Sees countdown card with real-time timer
4. 30 minutes countdown displays
5. At 0:00, contribution auto-matches
6. Receives notification with payout details
7. Can now submit payment proof

### Admin Journey
1. Views P2P Contribution Panel
2. Sees all pending contributions with "Auto-Match In" column
3. Can see countdown for each submission
4. When timer hits 0, sees "Auto-matching..." indicator
5. System automatically calls auto-match API
6. Panel updates with matched status

## Edge Cases & Error Handling

### Timer Resets/Syncs
- Timer recalculates every second from `created_at`
- No state-based tracking = always accurate
- Survives page refresh, network issues, etc.

### Multiple Tabs/Devices
- Each device has independent timer display
- All show same countdown (calculated from server timestamp)
- No sync conflicts

### Auto-Match Failure
- If auto-match API fails when timer expires
- Frontend shows "Auto-matching..." badge
- Admin can manually trigger from panel
- Timer continues to display 0:00 until matched

## Configuration

### Timer Duration
Default: 30 minutes (1800 seconds)

To change: Modify in both files:
- `contribute/page.tsx`: `30 * 60`
- `p2p-contribution-panel.tsx`: `30 * 60`

### Update Frequency
- Participant display: Every 1 second
- Admin panel: Every 1 second
- Database poll: Every 10 seconds

To adjust polling: Change intervals in useEffect hooks

## Testing Checklist

- [ ] Countdown starts immediately after "I Want to Contribute" click
- [ ] Timer shows correct MM:SS format
- [ ] Color changes at 10min, 5min, and 1min marks
- [ ] Countdown syncs across page refreshes
- [ ] Admin panel shows countdown for all pending contributions
- [ ] Timer reaches 0:00 after 30 minutes
- [ ] Auto-match triggers at 0:00 (or via manual API call)
- [ ] "Auto-matching..." badge appears in admin panel
- [ ] Contribution matches with payout
- [ ] Both parties notified

## Future Enhancements

1. **Sound Notification**: Play alert when <1 minute remaining
2. **Email Reminder**: Send when <5 minutes remaining
3. **Configurable Duration**: Admin panel to adjust timer duration
4. **Manual Extension**: Allow admins to extend timer if needed
5. **Analytics**: Track how many auto-match during different time windows
6. **Webhook Notification**: Real-time updates via WebSocket
