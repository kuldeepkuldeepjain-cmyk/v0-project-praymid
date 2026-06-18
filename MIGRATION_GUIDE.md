# Migration Guide: Unclaimed Bonus Feature

## Quick Start

### 1. Run the Database Migration

```bash
# Using psql directly
psql $DATABASE_URL < scripts/006_add_unclaimed_bonus.sql

# Or if you have connection string:
psql -h your-neon-host.neon.tech -U postgres -d flowchain < scripts/006_add_unclaimed_bonus.sql
```

### 2. Deployment

```bash
# Build the Next.js application
pnpm build

# Deploy to Vercel (if using Vercel)
vercel deploy

# Or deploy locally
pnpm start
```

## What the Migration Does

1. **Adds three new columns** to the `participants` table:
   - `unclaimed_bonus` (NUMERIC) - Default 0
   - `bonus_claimed` (BOOLEAN) - Default FALSE
   - `bonus_claimed_at` (TIMESTAMP) - Default NULL

2. **Creates two indexes** for performance:
   - `idx_participants_unclaimed_bonus` - Fast filtering of users with unclaimed bonuses
   - `idx_participants_bonus_claimed` - Track bonus claim status

3. **Updates existing users** (optional):
   - Sets `unclaimed_bonus = 50` for users who haven't contributed yet
   - Sets `bonus_claimed = FALSE` for those users

## Rollback (if needed)

If you need to revert the migration:

```sql
-- Drop the indexes
DROP INDEX IF EXISTS idx_participants_unclaimed_bonus;
DROP INDEX IF EXISTS idx_participants_bonus_claimed;

-- Remove the columns
ALTER TABLE participants
  DROP COLUMN IF EXISTS unclaimed_bonus,
  DROP COLUMN IF EXISTS bonus_claimed,
  DROP COLUMN IF EXISTS bonus_claimed_at;
```

## API Endpoints

### New Endpoint: Claim Bonus

**POST** `/api/participant/claim-bonus`

```bash
curl -X POST http://localhost:3000/api/participant/claim-bonus \
  -H "Content-Type: application/json" \
  -d '{"email": "participant@example.com"}'
```

**Response**:
```json
{
  "success": true,
  "message": "Welcome bonus of $50 has been added to your account!",
  "bonus_claimed": true,
  "bonus_amount": 50,
  "new_balance": 250.00,
  "claimed_at": "2024-01-15T10:30:00Z"
}
```

### Updated Endpoint: Get User Data

**GET** `/api/participant/me?email=participant@example.com`

Now includes:
```json
{
  "unclaimed_bonus": 50,
  "bonus_claimed": false,
  "bonus_claimed_at": null
}
```

### Updated Endpoint: Registration

**POST** `/api/participant/register`

Response now includes:
```json
{
  "unclaimed_bonus": 50,
  "bonus_claimed": false,
  "message": "Registration successful!... Welcome bonus: $50 (claim by making your first contribution)."
}
```

## Frontend Updates

The participant dashboard now displays:

1. **Unclaimed Bonus Card** (if bonus > 0 and not claimed):
   - Yellow gradient background
   - Animated star icon
   - Display amount: $50.00
   - Button: "Start Contributing" → links to `/participant/dashboard/contribute`

2. **Automatic Updates**:
   - Card disappears after bonus is claimed
   - Balance updates to include the $50
   - Transaction logged for audit trail

## Verification Steps

1. **Create test account**:
   ```bash
   # Register at http://localhost:3000/participant/register
   # Email: testuser@example.com
   # Password: TestPassword123!
   ```

2. **Check dashboard**:
   - Navigate to participant dashboard
   - Should see "Unclaimed Welcome Bonus: $50.00"
   - See "Start Contributing" button

3. **Make contribution**:
   - Click "Start Contributing"
   - Submit payment proof
   - (Admin: Confirm payment in admin panel)

4. **Verify bonus claim**:
   - Dashboard refreshes
   - Balance increases by $50
   - Unclaimed bonus card disappears
   - Transaction recorded in ledger

## Database Verification

```sql
-- Check if migration ran successfully
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'participants' 
  AND column_name IN ('unclaimed_bonus', 'bonus_claimed', 'bonus_claimed_at');

-- Should return 3 rows

-- Check indexes were created
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'participants' 
  AND indexname LIKE '%bonus%';

-- Should return 2 rows

-- Check if existing users got the bonus
SELECT COUNT(*) as users_with_unclaimed_bonus
FROM participants
WHERE unclaimed_bonus > 0 AND bonus_claimed = FALSE;
```

## Troubleshooting

### Column already exists error
If you get "column already exists" error, it means the migration was already run. That's fine - just verify the columns exist using the SQL verification above.

### Bonus not showing on dashboard
- Clear browser cache: `Ctrl+Shift+Delete` (Chrome) or `Cmd+Shift+Delete` (Mac)
- Re-login to participant account
- Check browser console for errors

### Balance not updating after claiming
- Refresh the page
- Check server logs for errors
- Verify admin confirmed the payment in payment_submissions table

### API returns 400 error
Common causes:
- Email doesn't exist in database
- Bonus already claimed for this user
- Bonus amount is 0

## Support

For issues or questions, check:
1. Application logs: `pnpm dev` output
2. Database logs: Check Neon console
3. Network tab: Check API response status and error messages
4. Browser console: Check JavaScript errors

## Performance Considerations

- Indexes on `unclaimed_bonus` and `bonus_claimed` ensure fast queries
- Migration is minimal (~50 rows if updating existing users)
- No breaking changes to existing API responses

## Timeline

**Phase 1** (Current):
- ✅ Database migration
- ✅ Registration grants $50
- ✅ Dashboard displays unclaimed bonus
- ✅ API endpoints created

**Phase 2** (Future):
- Configurable bonus amount
- Bonus expiration logic
- Enhanced analytics
- Email notifications

---

**Last Updated**: January 2025
**Version**: 1.0
