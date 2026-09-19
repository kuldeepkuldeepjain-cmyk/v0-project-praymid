# Currency Conversion Checklist

## Completed ✅

- [x] `lib/format-utils.ts` - Added `formatRupees()` functions
- [x] `components/dashboard-stats.tsx` - Total Amount in rupees
- [x] `components/collection-history.tsx` - Collection amounts in rupees
- [x] `components/crypto-price-widget.tsx` - Crypto prices in rupees
- [x] `components/admin/all-payouts-panel.tsx` - Payout amounts in rupees

## TODO - High Priority 🔴

These components are visible to users frequently and should be updated first:

- [ ] `components/admin/participants-admin-panel.tsx`
  - Lines with: `${stats.total_balance.toFixed(2)}`
  - Replace with: `{formatRupees(stats.total_balance)}`

- [ ] `components/admin/payout-tracker-panel.tsx`
  - Payout amounts displayed in tables

- [ ] `components/admin/topup-requests-panel.tsx`
  - Line 463: `$${selectedRequest.amount.toFixed(2)} USDT`

- [ ] `components/admin/fee-configuration.tsx`
  - Lines with: `${stats.totalFeesCollected.toLocaleString()}`
  - Lines with: `${stats.feeSavingsDistributed.toLocaleString()}`

- [ ] `components/admin/user-ledger-view.tsx`
  - Multiple balance displays

## TODO - Medium Priority 🟡

- [ ] `components/admin/comprehensive-database-view.tsx`
  - Balance and payout amounts

- [ ] `components/admin/delete-participants-panel.tsx`
  - Account balance amounts

- [ ] `components/admin/all-participants-ledger.tsx`
  - Lines 7-8: USDT amount displays

- [ ] `components/admin/platform-revenue-tracker.tsx`
  - Platform revenue amounts

- [ ] `components/admin/p2p-payout-queue-panel.tsx`
  - Payout queue amounts

- [ ] `components/admin/approved-wallets-panel.tsx`
  - Line 13: `${wallet.approvedAmount}`

## TODO - Lower Priority (Admin-Only) 🟢

- [ ] `components/enhanced-prediction-market.tsx`
  - Prediction amounts

- [ ] `components/active-trade-tracker.tsx`
  - Lines 1-6: Trade amounts and P&L

## TODO - User-Facing Pages 👥

- [ ] `app/participant/dashboard/payout/page.tsx`
  - Payout request amounts

- [ ] `app/participant/dashboard/contribute/page.tsx`
  - Contribution amounts

- [ ] `app/participant/dashboard/page.tsx`
  - Dashboard amounts

- [ ] `app/participant/dashboard/settings/page.tsx`
  - Account settings amounts

- [ ] Any other participant pages with amounts

## How to Convert

### Quick Pattern Guide

```typescript
// Import at top
import { formatRupees } from "@/lib/format-utils"

// Pattern 1: Simple replacement
BEFORE: <div>${amount.toFixed(2)}</div>
AFTER:  <div>{formatRupees(amount)}</div>

// Pattern 2: Template strings
BEFORE: <span>`$${amount}`</span>
AFTER:  <span>`${formatRupees(amount)}`</span>

// Pattern 3: With Math
BEFORE: <div>${Math.abs(value).toFixed(2)}</div>
AFTER:  <div>{formatRupees(Math.abs(value))}</div>

// Pattern 4: toLocaleString
BEFORE: <div>${value.toLocaleString()}</div>
AFTER:  <div>{formatRupees(value)}</div>
```

## Validation

After converting each component, verify:

1. ✓ Import added: `import { formatRupees } from "@/lib/format-utils"`
2. ✓ All `$` followed by amounts are replaced
3. ✓ Format: `₹10,000.00` or `₹100,000`
4. ✓ Amounts are comma-separated for readability
5. ✓ No TypeScript errors in the file

## Testing

After each update:

```bash
# Build to check for TS errors
npm run build

# Or run dev server
npm run dev

# Check that:
# 1. Component renders without errors
# 2. Amounts display with ₹ symbol
# 3. Comma formatting works (e.g., ₹10,000)
# 4. Decimal places show correctly
```

## Quick Statistics

| Category | Files | Status |
|----------|-------|--------|
| Completed | 5 | ✅ Done |
| High Priority | 5 | 🔴 Todo |
| Medium Priority | 5 | 🟡 Todo |
| Low Priority | 3 | 🟢 Todo |
| User Pages | 5+ | 👥 Todo |
| **Total** | **23+** | **In Progress** |

## Estimated Time

- High Priority (5 files): ~15-20 min
- Medium Priority (5 files): ~15-20 min
- Low Priority (3 files): ~10 min
- User Pages (5 files): ~20-30 min
- **Total**: ~1-1.5 hours

## Notes

- Database stores values in USD (dollars)
- `formatRupees()` auto-converts: `USD * 100 = INR`
- Example: DB value `500` → displays as `₹50,000`
- All conversions are automatic, no DB changes needed
- Rollback is simple: revert code changes

---

**Status**: In Progress ⏳
**Last Updated**: Now
**Next**: Update High Priority admin panels
