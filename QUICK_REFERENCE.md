# Unclaimed Bonus Feature - Quick Reference

## 🎯 What It Does

New participants get **$50 welcome bonus** when they register. The bonus is **unclaimed** until they make their first contribution, then it's **automatically claimed** and added to their balance.

## 📋 Implementation Summary

| Item | Details |
|------|---------|
| **Database Columns** | `unclaimed_bonus`, `bonus_claimed`, `bonus_claimed_at` |
| **New API** | `POST /api/participant/claim-bonus` |
| **Updated APIs** | `/participant/register`, `/participant/me`, `/participant/submit-payment` |
| **UI Component** | Yellow bonus card on dashboard (auto-hidden when claimed) |
| **Auto-Claim Trigger** | When admin confirms first payment submission |
| **Build Status** | ✅ PASSED - Ready for production |

## 🚀 Quick Start

```bash
# 1. Run migration
psql $DATABASE_URL < scripts/006_add_unclaimed_bonus.sql

# 2. Build
pnpm build

# 3. Deploy
vercel deploy  # or your deployment method
```

## 📊 Database Schema

```sql
ALTER TABLE participants ADD COLUMN unclaimed_bonus NUMERIC DEFAULT 0;
ALTER TABLE participants ADD COLUMN bonus_claimed BOOLEAN DEFAULT FALSE;
ALTER TABLE participants ADD COLUMN bonus_claimed_at TIMESTAMP WITH TIME ZONE;
```

## 🔗 File Locations

### New Files
- `scripts/006_add_unclaimed_bonus.sql` - Migration
- `app/api/participant/claim-bonus/route.ts` - Claim endpoint

### Modified Files
- `app/api/participant/register/route.ts` - Grant bonus
- `app/api/participant/submit-payment/route.ts` - Auto-claim
- `app/api/participant/me/route.ts` - Return bonus info
- `app/participant/dashboard/page.tsx` - Display card

## 💻 API Examples

### Register (Returns bonus info)
```json
POST /api/participant/register
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  ...
}

Response:
{
  "success": true,
  "unclaimed_bonus": 50,
  "bonus_claimed": false,
  "account_balance": 0,
  ...
}
```

### Get User Data (Returns bonus status)
```json
GET /api/participant/me?email=john@example.com

Response:
{
  "unclaimed_bonus": 50,
  "bonus_claimed": false,
  "bonus_claimed_at": null,
  "account_balance": 0,
  ...
}
```

### Manual Claim (if needed)
```json
POST /api/participant/claim-bonus
{
  "email": "john@example.com"
}

Response:
{
  "success": true,
  "bonus_claimed": true,
  "bonus_amount": 50,
  "new_balance": 250.00,
  "claimed_at": "2024-01-15T10:30:00Z"
}
```

## 🎨 UI Display

**Before Claim** (on Dashboard):
```
┌─────────────────────────────────┐
│ 💰 Wallet Balance       $0.00   │
│ 🎁 Referral Earnings    $0.00   │
│                                 │
│ ⭐ UNCLAIMED WELCOME BONUS      │
│ ┌─────────────────────────────┐ │
│ │ 💛 $50.00                   │ │
│ │ Claim by making your first  │ │
│ │ contribution                │ │
│ │ [Start Contributing] →       │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**After Claim**:
```
┌─────────────────────────────────┐
│ 💰 Wallet Balance      $250.00   │
│ 🎁 Referral Earnings    $0.00   │
│                                 │
│ ✓ Welcome Bonus Claimed!        │
└─────────────────────────────────┘
```

## 🔄 Workflow

```
User Registers
    ↓
unclaimed_bonus = 50
bonus_claimed = false
    ↓
Dashboard shows yellow card
    ↓
User contributes
    ↓
Admin approves
    ↓
AUTOMATIC:
  unclaimed_bonus = 0
  bonus_claimed = true
  bonus_claimed_at = NOW()
  account_balance += 50
  transaction logged
    ↓
Dashboard card disappears
Balance updated to $250
```

## ✅ Verification

```sql
-- Check columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'participants' 
AND column_name IN ('unclaimed_bonus', 'bonus_claimed', 'bonus_claimed_at');

-- Check indexes created
SELECT indexname FROM pg_indexes 
WHERE tablename = 'participants' AND indexname LIKE '%bonus%';

-- Check existing data
SELECT COUNT(*) FROM participants 
WHERE unclaimed_bonus > 0 AND bonus_claimed = FALSE;
```

## 🧪 Testing

```bash
# 1. Register test account
curl -X POST http://localhost:3000/api/participant/register \
  -d '{"email":"test@example.com","firstName":"Test","lastName":"User",...}'

# 2. Check bonus
curl http://localhost:3000/api/participant/me?email=test@example.com

# 3. Dashboard should show yellow card

# 4. Submit payment proof
# (Use UI or API)

# 5. Admin approves in admin panel

# 6. Verify bonus claimed
curl http://localhost:3000/api/participant/me?email=test@example.com
# Should show bonus_claimed: true, unclaimed_bonus: 0
```

## 📚 Full Documentation

For complete details, see:
- `UNCLAIMED_BONUS_FEATURE.md` - Technical implementation
- `MIGRATION_GUIDE.md` - Deployment guide
- `IMPLEMENTATION_STATUS.md` - Deployment status
- `FEATURE_SUMMARY.txt` - Visual overview

## 🎯 Key Points

✅ $50 granted instantly on registration
✅ Unclaimed until first contribution
✅ Auto-claimed when payment confirmed
✅ UI card guides users to contribute
✅ Audit trail in transactions table
✅ Idempotent (can't claim twice)
✅ Backward compatible
✅ Production ready

---

**Version**: 1.0 | **Status**: ✅ Production Ready
