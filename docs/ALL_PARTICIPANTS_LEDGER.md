# All Participants Ledger - Admin Dashboard

## Overview

The **All Participants Ledger** is a comprehensive transaction viewing tool in the Admin Dashboard that displays all transactions across all participants in a single unified interface. This replaces the need to search for individual users when viewing ledgers.

## Features

### 1. Unified Transaction View
- View **all transaction types** from all participants in one place:
  - **Transactions**: General deposits, withdrawals, transfers
  - **Contributions**: Payment submissions and contribution records
  - **Payouts**: Payout requests and withdrawals
  - **Predictions**: Prediction entries
  - **Top-ups**: Account top-ups

### 2. Advanced Filtering
- **Filter by Type**: Select specific transaction types (All, Contributions, Payouts, Transactions, Predictions, Top-ups)
- **Filter by Participant**: Search by email or participant name
- **Real-time Filtering**: Filters update results instantly

### 3. Sorting Options
- **Sort by Date**: Newest first (default) or oldest first
- **Sort by Amount**: High to low or low to high
- **Sort by Participant**: Alphabetically by name
- **Flexible Order**: Ascending or descending for all sort methods

### 4. Pagination
- **50 transactions per page** (configurable)
- **Navigation buttons**: Previous/Next with page indicators
- **Total count**: Shows total transactions matching filters

### 5. Data Export
- **Export to CSV**: Download all filtered results as a CSV file
- **Timestamp included**: CSV filename includes download date
- **Complete data**: Includes date, participant, type, description, amount, and status

### 6. Color-Coded Information
- **Transaction Types**: Different colors for each type
  - 🟢 Contributions: Green
  - 🔴 Payouts: Red
  - 🔵 Transactions: Blue
  - 🟣 Predictions: Purple
  - 🟠 Top-ups: Orange
- **Status Badges**: Visual indication of transaction status
  - ✅ Completed/Approved: Green badge
  - ⏳ Pending/Processing: Yellow badge
  - ❌ Rejected/Failed: Red badge

## How to Use

### Step 1: Navigate to All Participants Ledger
1. Go to Admin Dashboard
2. Click **"All Participants Ledger"** in the main menu
3. The ledger will load with all recent transactions

### Step 2: Filter Transactions (Optional)
- **By Type**: Select from dropdown to show only specific transaction types
- **By Participant**: Type email or name to filter to specific participants
- Filters apply automatically

### Step 3: Sort Results (Optional)
- **Sort By**: Choose what to sort by (Date, Amount, Participant)
- **Order**: Choose ascending (oldest first) or descending (newest first)

### Step 4: Browse Results
- View up to 50 transactions per page
- Click **Previous/Next** to navigate pages
- See total transaction count in the top-right corner

### Step 5: Export Data (Optional)
- Click **"Export CSV"** button to download filtered results
- Opens file download dialog with date-stamped filename

## Data Structure

Each ledger entry contains:

| Field | Description |
|-------|-------------|
| **Date** | Transaction timestamp (formatted: MMM DD, YYYY HH:MM) |
| **Participant** | Participant name and email |
| **Type** | Transaction type (contribution, payout, etc.) |
| **Description** | Detailed description of transaction |
| **Amount** | Transaction amount (positive = credit, negative = debit) |
| **Status** | Current status (completed, pending, rejected, etc.) |

## API Endpoint

**Endpoint**: `GET /api/admin/all-ledger`

**Query Parameters**:
- `type` (string): Filter by transaction type (default: "all")
- `participant` (string): Filter by participant email/name (default: "")
- `sortBy` (string): Sort field - "date", "amount", or "participant" (default: "date")
- `order` (string): Sort order - "asc" or "desc" (default: "desc")
- `limit` (number): Records per page (default: 50, max: 100)
- `offset` (number): Pagination offset (default: 0)

**Response Example**:
```json
{
  "success": true,
  "data": [
    {
      "id": "tx-123",
      "participantEmail": "user@example.com",
      "participantName": "John Doe",
      "type": "contribution",
      "amount": 100,
      "status": "approved",
      "date": "2024-03-20T10:30:00Z",
      "description": "Payment Submission"
    }
  ],
  "pagination": {
    "total": 1234,
    "limit": 50,
    "offset": 0,
    "totalPages": 25,
    "hasMore": true
  }
}
```

## Database Tables Queried

The API queries the following tables:
- `transactions` - General transactions
- `payment_submissions` - Contributions
- `payout_requests` - Payouts
- `predictions` - Predictions
- `topup_requests` - Top-ups
- `participants` - Participant info (for name/email)

## Performance Considerations

- **Large result sets**: API fetches all matching records but returns 50 per page
- **Filtering on client-side**: Large datasets are filtered in-memory for speed
- **Caching**: Results are not cached; each query is fresh
- **Pagination**: Recommended to use filters to reduce dataset size

## Troubleshooting

### No transactions showing
- Check that filters aren't too restrictive
- Verify participant emails are spelled correctly
- Try "All Types" filter

### Slow loading
- Use filters to reduce result set
- Sort by participant or amount instead of date
- Check network tab for slow API response

### CSV export not working
- Ensure you have results displayed (not empty)
- Check browser pop-up blockers
- Try different browser if issue persists

## Admin Dashboard Navigation

From **All Participants Ledger**, you can:
- Navigate to **Single User Ledger** for detailed view of one participant
- Go to **Database** for raw data access
- Visit other admin tools from the main menu

## Related Features

- **Single User Ledger** (`UserLedgerView`): Search and view ledger for individual participant
- **Participant Database View**: Manage individual participants
- **Contribution & Payout Panel**: Manage matching and approval

## Component Files

- **Component**: `/components/admin/all-participants-ledger.tsx`
- **API**: `/app/api/admin/all-ledger/route.ts`
- **Dashboard Integration**: `/app/admin/dashboard/page.tsx`

## Changelog

### Version 1.0 (Current)
- Initial release with all transaction types
- Filtering by type and participant
- Sorting by date, amount, or participant
- CSV export functionality
- Pagination support
