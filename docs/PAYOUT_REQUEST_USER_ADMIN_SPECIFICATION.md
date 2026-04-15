# Payout Request Feature Specification
**Version:** 1.0  
**Last Updated:** January 2026  
**Application:** FlowChain Platform

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [User Journey - Creating Payout Request](#user-journey---creating-payout-request)
3. [Wallet Address Display - User View](#wallet-address-display---user-view)
4. [Admin Dashboard - Wallet Address Access](#admin-dashboard---wallet-address-access)
5. [Admin Guidelines - Using Addresses for New Users](#admin-guidelines---using-addresses-for-new-users)
6. [Technical Implementation](#technical-implementation)
7. [Security & Compliance](#security--compliance)
8. [Testing Requirements](#testing-requirements)

---

## Executive Summary

### Purpose
This specification outlines the complete payout request workflow in the FlowChain platform, focusing on:
- User experience when requesting payouts
- Wallet address management and display
- Administrative oversight and wallet address utilization
- Security and compliance requirements

### Key Components
1. **User Interface:** Participant dashboard payout request form
2. **Admin Interface:** Payout management dashboard with wallet address tracking
3. **Database:** `payout_requests` table with wallet address storage
4. **API Endpoints:** `/api/participant/request-payout`, `/api/admin/update-payout-status`
5. **Wallet Pool:** System for managing and reusing verified wallet addresses

---

## User Journey - Creating Payout Request

### 1.1 Access Point
**Location:** `/participant/dashboard/payout`

**Prerequisites:**
- User must be authenticated as a participant
- User must have minimum balance of $100 in wallet
- User must have valid BEP20 wallet address

### 1.2 Step-by-Step Process

#### Step 1: View Payout Page
```
User navigates to: Participant Dashboard → Payout
```

**Page Elements Displayed:**
1. **Current Wallet Balance** (large, prominent display)
2. **Queue Position** (visual progress bar showing position in payout queue)
3. **Fixed Payout Amount** ($100 per request - displayed in information card)
4. **Payout History** (table of previous requests with status tracking)
5. **Request Payout Button** (enabled only when balance ≥ $100)

**Visual Feedback:**
- Balance displayed in large green gradient text (42px font)
- Queue position shown with animated progress bar
- Info card explaining queue mechanism with green border accent

#### Step 2: Initiate Payout Request
**Trigger:** User clicks "Request $100 Payout" button

**System Validation:**
```javascript
// Pre-submission checks
1. Verify wallet balance ≥ $100
2. Check if user is authenticated
3. Validate no pending requests (optional business rule)
```

**Action:** Opens modal dialog for BEP20 address confirmation

#### Step 3: Enter/Confirm BEP20 Wallet Address

**Modal Dialog Contents:**

```
┌─────────────────────────────────────┐
│   Confirm Payout Address            │
├─────────────────────────────────────┤
│                                     │
│  [Label] BEP20 Wallet Address       │
│  [Input Field] 0x...                │
│  [Helper Text] Binance Smart Chain  │
│                                     │
│  ⚠ Important Notes:                 │
│  • Double-check your address        │
│  • Incorrect address = lost funds   │
│  • Must be BEP20/BSC compatible     │
│                                     │
│  [Cancel] [Confirm Payout]          │
└─────────────────────────────────────┘
```

**Input Field Specifications:**
- **Field Type:** Text input
- **Placeholder:** "0x..."
- **Validation Rules:**
  - Must start with "0x"
  - Must be exactly 42 characters long
  - Hexadecimal characters only (0-9, a-f, A-F)
  - Real-time validation feedback

**Pre-fill Behavior:**
- If user has previously saved BEP20 address in profile, it auto-fills
- User can edit or confirm the address
- Address is stored in `participants.bep20_address` for future use

**Validation Messages:**
```javascript
// Error messages displayed to user
{
  empty: "Please enter your BEP20 wallet address",
  invalid_format: "Invalid address format. Must start with 0x and be 42 characters",
  invalid_chars: "Address contains invalid characters. Use 0-9 and A-F only"
}
```

#### Step 4: Submit Payout Request

**User Action:** Clicks "Confirm Payout" button

**Client-Side Actions:**
1. Disable button (show loading spinner)
2. Send POST request to `/api/participant/request-payout`
3. Wait for server response

**Request Payload:**
```json
{
  "email": "user@example.com",
  "amount": 100,
  "bep20_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

**Server-Side Processing:**
1. Authenticate user session
2. Fetch participant's current wallet balance
3. Verify sufficient funds (balance ≥ $100)
4. Calculate new balance (current_balance - $100)
5. Deduct $100 from user's wallet_balance in `participants` table
6. Create new record in `payout_requests` table with auto-generated serial number
7. Log activity in `activity_logs` table
8. Return success response with new balance

**Database Record Created:**
```sql
INSERT INTO payout_requests (
  serial_number,          -- Auto-generated: FLCN26001, FLCN26003, etc.
  participant_email,
  participant_name,
  participant_username,
  bep20_address,
  amount,
  wallet_balance_before,
  wallet_balance_after,
  status,                 -- 'pending'
  requested_at,
  request_year,
  sequence_number
) VALUES (...)
```

#### Step 5: Confirmation & Feedback

**Success Response:**
```
✓ Payout Requested!
You'll be notified when the payout is successfully sent to your address

Serial Number: FLCN26005
Amount: $100.00
Wallet Address: 0x742d...bEb (truncated display)
New Balance: $X.XX
```

**UI Updates:**
1. Close modal dialog
2. Display success toast notification (green, 5-second duration)
3. Refresh payout history table (show new request at top)
4. Update wallet balance display
5. Update localStorage with new balance

**Failed Response Scenarios:**
```javascript
{
  insufficient_balance: "Insufficient balance. Need $100 to request payout",
  invalid_address: "Invalid BEP20 address format",
  system_error: "Request failed. Please try again"
}
```

### 1.3 Post-Submission Experience

**User Can:**
1. View payout request in history table immediately
2. Track status changes in real-time (via Supabase real-time subscription)
3. See horizontal status tracker with visual stages:
   - **Requested** (Clock icon - blue)
   - **Processing** (Spinning loader - purple)
   - **Approved** (Checkmark - green)
   - **Sent** (Trending up - emerald)

**Real-Time Updates:**
- WebSocket connection to Supabase
- Automatically updates payout status without page refresh
- Shows toast notifications for status changes:
  - "Payout Completed!" (green) when status = 'completed'
  - "Payout Rejected" (red) when status = 'rejected'

---

## Wallet Address Display - User View

### 2.1 In Payout Request Dialog (Pre-Submission)
**Location:** Modal dialog when user clicks "Request Payout"

**Display Format:**
```
BEP20 Wallet Address
┌─────────────────────────────────────────────┐
│ 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb  │
└─────────────────────────────────────────────┘
        Binance Smart Chain (BEP20)
```

**Features:**
- Full address shown in input field
- Monospace font for readability
- Copy button next to input (optional enhancement)
- Address persists from user profile if previously saved

### 2.2 In Payout History Table (Post-Submission)

**Location:** `/participant/dashboard/payout` - History section

**Table Columns:**
1. Serial Number (e.g., FLCN26005)
2. Amount ($100.00)
3. Wallet Address (truncated)
4. Status (badge with color coding)
5. Date Requested
6. Actions (View Details button)

**Wallet Address Display:**
- **Truncated Format:** `0x742d...f0bEb`
- **Method:** Show first 6 characters + "..." + last 5 characters
- **Styling:** Monospace font, light gray background badge

**Example Row:**
```
FLCN26005 | $100.00 | 0x742d...f0bEb | [Pending] | Jan 22, 2026 | [View]
```

### 2.3 In Detailed View (When User Clicks "View Details")

**Modal Dialog Contents:**
```
┌───────────────────────────────────────────┐
│   Payout Request Details                  │
├───────────────────────────────────────────┤
│                                           │
│  Serial Number: FLCN26005                 │
│  Amount: $100.00                          │
│  Status: Processing                       │
│  Requested: Jan 22, 2026 10:30 AM        │
│                                           │
│  Payout Receiving Address:                │
│  ┌────────────────────────────────────┐  │
│  │ 0x742d35Cc6634C0532925a3b844Bc9e│  │
│  │ 7595f0bEb                          │  │
│  └────────────────────────────────────┘  │
│  [Copy Address] button                    │
│                                           │
│  Status Tracker:                          │
│  [Requested] ━━ [Processing] ━━ [Send]   │
│     ✓           ● (current)              │
│                                           │
│  Transaction Hash:                        │
│  (Shown when status = 'completed')       │
│  ┌────────────────────────────────────┐  │
│  │ 0xabc123...def789                  │  │
│  └────────────────────────────────────┘  │
│                                           │
│  [Close]                                  │
└───────────────────────────────────────────┘
```

**Features:**
- Full wallet address displayed (no truncation)
- Copy to clipboard button
- Clear visual separation with rounded container
- Transaction hash displayed only when payout is completed
- Status tracker shows current progress

### 2.4 Data Persistence

**Storage Locations:**
1. **payout_requests.bep20_address** - Individual request record
2. **participants.bep20_address** - User profile (saved for future use)

**Update Behavior:**
- When user enters address in payout dialog, it updates:
  - `payout_requests.bep20_address` for this specific request
  - `participants.bep20_address` in user profile (optional implementation)
- Future payout requests auto-fill with saved address
- User can change address for each new request

---

## Admin Dashboard - Wallet Address Access

### 3.1 Access Location
**URL:** `/admin/dashboard`  
**Navigation:** Admin Dashboard → Database (Payout Management)

**Required Permissions:**
- User must be authenticated as admin
- Admin role verified via localStorage `admin_token`
- Email must match admin email in database

### 3.2 Payout Management Interface

**Layout Structure:**
```
┌────────────────────────────────────────────────────┐
│  Payout Management Dashboard                       │
├────────────────────────────────────────────────────┤
│  [Search: Serial #, name, email, address...]       │
│  [Filter: Status ▼] [Export CSV]                   │
├────────────────────────────────────────────────────┤
│  Payout Requests Table                             │
│  ┌──────────────────────────────────────────────┐ │
│  │ Serial# │ User │ Amount │ Wallet │ Status   │ │
│  ├──────────────────────────────────────────────┤ │
│  │ FLCN26005 │ User │ $100 │ 0x7..bEb │ Pending│ │
│  │ FLCN26003 │ Jane │ $100 │ 0x8..f2A │ Process│ │
│  │ FLCN26001 │ John │ $100 │ 0x9..3dC │ Complete││
│  └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

### 3.3 Wallet Address Display in Table

**Column: "Wallet Address"**
- **Display Format:** Truncated - `0x742d...f0bEb`
- **Font:** Monospace
- **Styling:** Badge with gradient background (orange to rose)
- **Truncation Method:** First 5 chars + "..." + last 4 chars

**Column: "Serial Number"**
- **Display Format:** Full serial number (e.g., FLCN26005)
- **Font:** Monospace, bold
- **Styling:** Badge with gradient background
- **Purpose:** Unique identifier for tracking

**Searchable Fields:**
The search bar allows admins to search by:
- Serial number (FLCN26005)
- Participant name
- Participant email
- Participant username
- **BEP20 wallet address** (full or partial)

**Example Search Queries:**
```
"0x742d" → Finds all payouts with this address prefix
"FLCN26005" → Finds specific payout by serial number
"john@example.com" → Finds all payouts for this user
```

### 3.4 Detailed Payout View (Admin)

**Access:** Click on payout row or "Actions" → "View Details"

**Modal Dialog for Admins:**
```
┌─────────────────────────────────────────────────┐
│   Payout Request #FLCN26005                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  USER INFORMATION                               │
│  ─────────────────────────────────────────────  │
│  Name: John Doe                                 │
│  Username: @johndoe                             │
│  Email: john@example.com                        │
│  Serial Number: FLCN26005                       │
│                                                 │
│  PAYOUT DETAILS                                 │
│  ─────────────────────────────────────────────  │
│  Amount: $100.00                                │
│  Status: Pending                                │
│  Requested: Jan 22, 2026 10:30 AM              │
│  Sequence: 5th request of 2026                  │
│                                                 │
│  WALLET INFORMATION                             │
│  ─────────────────────────────────────────────  │
│  BEP20 Receiving Address:                       │
│  ┌───────────────────────────────────────────┐ │
│  │ 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb│ │
│  └───────────────────────────────────────────┘ │
│  [Copy Address] [Add to Wallet Pool]           │
│                                                 │
│  Wallet Balance Before: $250.00                 │
│  Wallet Balance After: $150.00                  │
│                                                 │
│  ADMIN ACTIONS                                  │
│  ─────────────────────────────────────────────  │
│  Transaction Hash: (admin enters after sending) │
│  ┌───────────────────────────────────────────┐ │
│  │ [Enter tx hash]                           │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Admin Notes:                                   │
│  ┌───────────────────────────────────────────┐ │
│  │ [Text area for notes]                     │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  [Approve] [Reject] [Mark as Sent] [Close]     │
└─────────────────────────────────────────────────┘
```

**Key Admin Features:**

1. **Full Wallet Address Display**
   - Complete 42-character address shown (no truncation)
   - Monospace font in bordered container
   - Copy to clipboard button
   - "Add to Wallet Pool" button (explained in section 5)

2. **User Context Information**
   - Full name, username, email
   - Links to user profile in admin panel
   - Account status and verification level

3. **Financial Context**
   - Balance before payout request
   - Balance after deduction
   - Helps verify legitimacy of request

4. **Action Buttons**
   - **Approve**: Changes status to 'approved'
   - **Reject**: Returns funds to user, changes status to 'rejected'
   - **Mark as Sent**: Requires transaction hash input, changes status to 'completed'

### 3.5 Admin Permission Levels

**Role-Based Access Control (RBAC):**

| Action | Regular Admin | Super Admin |
|--------|--------------|-------------|
| View payout requests | ✓ | ✓ |
| View wallet addresses | ✓ | ✓ |
| Copy wallet addresses | ✓ | ✓ |
| Add to wallet pool | ✓ | ✓ |
| Approve requests | ✓ | ✓ |
| Reject requests | ✓ | ✓ |
| Mark as sent | ✓ | ✓ |
| Edit transaction hash | ✓ | ✓ |
| Delete requests | ✗ | ✓ |
| View audit logs | ✗ | ✓ |

**Authentication Verification:**
```typescript
// Admin authentication check
const adminToken = localStorage.getItem('admin_token')
const adminEmail = localStorage.getItem('admin_email')

if (!adminToken || !adminEmail) {
  // Redirect to admin login
  router.push('/admin/login')
}
```

**Database-Level Security:**
- Row Level Security (RLS) on `payout_requests` table
- Only users with admin role can query payout data
- All admin actions logged in `payout_audit_logs`

---

## Admin Guidelines - Using Addresses for New Users

### 5.1 Wallet Pool System

**Purpose:**
The wallet pool system allows admins to:
1. Collect verified BEP20 addresses from payout requests
2. Store them in a centralized pool (`wallet_pool` table)
3. Reuse these addresses as "contributing addresses" for new users
4. Track usage and contribution amounts per address

**Business Logic:**
When users join the platform, they need to "receive contributions" from 2 other users. The wallet pool provides verified, legitimate wallet addresses that can be used as contributing sources.

### 5.2 Adding Address to Wallet Pool

**Manual Method (from Payout Management):**

**Step 1:** Admin views payout request details
**Step 2:** Clicks "Add to Wallet Pool" button next to wallet address
**Step 3:** System checks if address already exists in pool
**Step 4:** If new, creates record in `wallet_pool` table

**Dialog Confirmation:**
```
┌───────────────────────────────────────┐
│   Add Address to Wallet Pool          │
├───────────────────────────────────────┤
│  Address: 0x742d...f0bEb              │
│  Owner: John Doe (@johndoe)           │
│  Email: john@example.com              │
│                                       │
│  This address will be available for   │
│  assignment to new users as a         │
│  contributing wallet address.         │
│                                       │
│  [Cancel] [Add to Pool]               │
└───────────────────────────────────────┘
```

**Database Record Created:**
```sql
INSERT INTO wallet_pool (
  participant_id,
  participant_email,
  participant_username,
  bep20_address,
  is_active,              -- true
  times_used,             -- 0 initially
  contribution_amount,     -- 0.00 initially
  added_at,
  last_used_at
) VALUES (...)
```

**Automatic Method (on Payout Completion):**
- When admin marks payout as "completed"
- System can automatically add address to pool (configurable)
- Only adds addresses of verified users (activation_fee_paid = true)

### 5.3 Using Wallet Pool for New Users

**Scenario:** New user signs up and needs contributing addresses

**Admin Process:**

**Step 1: Access Wallet Pool**
- Navigate to: Admin Dashboard → Management → Database
- View: "Wallet Pool" tab or section

**Step 2: Select Available Addresses**
- Filter addresses by:
  - `is_active = true`
  - `times_used < max_usage_limit` (e.g., 50)
  - Sufficient `contribution_amount` remaining

**Wallet Pool Table View:**
```
┌────────────────────────────────────────────────────────┐
│  Wallet Pool Management                                │
├────────────────────────────────────────────────────────┤
│  [Filter: Active Only ✓] [Sort: Times Used ↓]         │
├────────────────────────────────────────────────────────┤
│  Address      │ Owner │ Times Used │ Active │ Actions │
│  ─────────────────────────────────────────────────────│
│  0x7..bEb     │ John  │ 3/50       │ ✓     │ [Assign]│
│  0x8..f2A     │ Jane  │ 1/50       │ ✓     │ [Assign]│
│  0x9..3dC     │ Bob   │ 0/50       │ ✓     │ [Assign]│
└────────────────────────────────────────────────────────┘
```

**Step 3: Assign to New User**

**Option A: Manual Assignment**
1. Click "Assign" button next to wallet address
2. Enter new user's email or ID
3. System updates:
   - New user's profile: sets this address as "contributing_address_1"
   - Wallet pool: increments `times_used` counter
   - Wallet pool: updates `last_used_at` timestamp

**Assignment Dialog:**
```
┌───────────────────────────────────────┐
│   Assign Contributing Address         │
├───────────────────────────────────────┤
│  Address: 0x742d...f0bEb              │
│  Current Times Used: 3/50             │
│                                       │
│  New User Email:                      │
│  ┌─────────────────────────────────┐ │
│  │ newuser@example.com             │ │
│  └─────────────────────────────────┘ │
│                                       │
│  Position: ● Address 1  ○ Address 2  │
│                                       │
│  [Cancel] [Assign Address]            │
└───────────────────────────────────────┘
```

**Option B: Automated Assignment (Recommended)**
- System automatically assigns 2 available addresses to each new user
- Selection algorithm:
  1. Filter: `is_active = true` AND `times_used < max_limit`
  2. Sort: Order by `times_used ASC` (least used first)
  3. Select: Top 2 addresses
  4. Assign: Update user profile and wallet pool records

**Automated Assignment Code Flow:**
```typescript
async function assignContributingAddresses(newUserId: string) {
  // Get 2 least-used active addresses from pool
  const addresses = await supabase
    .from('wallet_pool')
    .select('*')
    .eq('is_active', true)
    .lt('times_used', 50)
    .order('times_used', { ascending: true })
    .limit(2)

  if (addresses.data && addresses.data.length >= 2) {
    // Assign to new user
    await supabase.from('participants').update({
      contributing_address_1: addresses.data[0].bep20_address,
      contributing_address_2: addresses.data[1].bep20_address
    }).eq('id', newUserId)

    // Update usage counters
    for (const addr of addresses.data) {
      await supabase.from('wallet_pool')
        .update({
          times_used: addr.times_used + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', addr.id)
    }
  }
}
```

### 5.4 Monitoring Wallet Pool Health

**Admin Dashboard Metrics:**

```
┌───────────────────────────────────────────┐
│  Wallet Pool Statistics                   │
├───────────────────────────────────────────┤
│  Total Addresses: 150                     │
│  Active Addresses: 142                    │
│  Inactive Addresses: 8                    │
│  Average Usage: 12.5 times/address        │
│  Addresses Near Limit: 3 (>45 uses)       │
│                                           │
│  Health Status: ● Healthy                 │
│  Recommended Action: Add 20 more addresses│
└───────────────────────────────────────────┘
```

**Alert Thresholds:**
- **Yellow Alert:** < 30 active addresses available
- **Red Alert:** < 10 active addresses available
- **Action Required:** Incentivize more users to request payouts

**Best Practices:**
1. Maintain minimum 50 active addresses in pool
2. Retire addresses after 50 uses (set `is_active = false`)
3. Monitor for suspicious patterns (same address used excessively)
4. Verify address owners are legitimate users
5. Rotate addresses regularly to distribute usage

### 5.5 Address Lifecycle Management

**Stages:**

1. **Collection**
   - User requests payout with BEP20 address
   - Admin completes payout successfully
   - Address added to wallet pool

2. **Verification**
   - Confirm address received payout successfully
   - Verify user is legitimate (not bot/fraud)
   - Mark as active in pool

3. **Active Usage**
   - Address assigned to new users as contributor
   - Usage counter incremented each assignment
   - Last used timestamp updated

4. **Retirement**
   - After 50 assignments OR
   - If address flagged for issues
   - Set `is_active = false`
   - Keep record for audit trail

5. **Archive**
   - After 12 months inactive
   - Move to archive table (optional)
   - Maintain for compliance

**Retirement Criteria:**
```sql
-- Auto-retire addresses that meet criteria
UPDATE wallet_pool
SET is_active = false
WHERE times_used >= 50
  OR last_used_at < NOW() - INTERVAL '6 months'
  OR participant_id IN (SELECT id FROM participants WHERE account_frozen = true)
```

---

## Technical Implementation

### 6.1 Database Schema

**payout_requests Table:**
```sql
CREATE TABLE payout_requests (
  id SERIAL PRIMARY KEY,
  serial_number VARCHAR(12) UNIQUE NOT NULL,  -- FLCN26001
  sequence_number INTEGER,                     -- 1, 3, 5, 7...
  request_year INTEGER,                        -- 2026
  
  participant_id UUID REFERENCES participants(id),
  participant_email VARCHAR(255) NOT NULL,
  participant_name VARCHAR(255),
  participant_username VARCHAR(255),
  
  bep20_address VARCHAR(42) NOT NULL,          -- Critical field
  amount NUMERIC(10, 2) NOT NULL DEFAULT 100,
  
  wallet_balance_before NUMERIC(10, 2),
  wallet_balance_after NUMERIC(10, 2),
  
  status VARCHAR(20) DEFAULT 'pending',
  -- Status values: 'pending', 'approved', 'processing', 'completed', 'rejected'
  
  requested_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  processing_started_at TIMESTAMP,
  completed_at TIMESTAMP,
  processed_at TIMESTAMP,
  
  processing_admin_id UUID,
  transaction_hash VARCHAR(66),                -- Blockchain tx hash
  admin_notes TEXT,
  rejection_reason TEXT,
  
  priority VARCHAR(10) DEFAULT 'normal',       -- 'low', 'normal', 'high'
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_payout_serial ON payout_requests(serial_number);
CREATE INDEX idx_payout_email ON payout_requests(participant_email);
CREATE INDEX idx_payout_status ON payout_requests(status);
CREATE INDEX idx_payout_address ON payout_requests(bep20_address);
```

**wallet_pool Table:**
```sql
CREATE TABLE wallet_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  participant_id UUID REFERENCES participants(id),
  participant_email VARCHAR(255),
  participant_username VARCHAR(255),
  
  bep20_address VARCHAR(42) UNIQUE NOT NULL,
  erc20_address VARCHAR(42),                   -- Optional for multi-chain
  
  is_active BOOLEAN DEFAULT true,
  times_used INTEGER DEFAULT 0,
  contribution_amount NUMERIC(10, 2) DEFAULT 0,
  
  added_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_bep20 UNIQUE (bep20_address)
);

-- Indexes
CREATE INDEX idx_wallet_active ON wallet_pool(is_active);
CREATE INDEX idx_wallet_times_used ON wallet_pool(times_used);
CREATE INDEX idx_wallet_address ON wallet_pool(bep20_address);
```

**payout_audit_logs Table:**
```sql
CREATE TABLE payout_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  payout_id INTEGER REFERENCES payout_requests(id),
  serial_number VARCHAR(12),
  
  admin_id UUID,
  admin_email VARCHAR(255),
  
  action VARCHAR(50),                          -- 'approved', 'rejected', 'completed'
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  changes JSONB,                               -- All field changes
  
  ip_address INET,
  user_agent TEXT,
  
  timestamp TIMESTAMP DEFAULT NOW()
);
```

### 6.2 API Endpoints

**User Endpoint - Request Payout:**
```typescript
POST /api/participant/request-payout

// Request Body
{
  "email": "user@example.com",
  "amount": 100,
  "bep20_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}

// Response - Success
{
  "success": true,
  "message": "Payout request submitted successfully",
  "requestId": 42,
  "serialNumber": "FLCN26005",
  "newBalance": 150.00
}

// Response - Error
{
  "success": false,
  "error": "Insufficient balance. Available: $50, Requested: $100"
}
```

**Admin Endpoint - Update Payout Status:**
```typescript
POST /api/admin/update-payout-status

// Request Body
{
  "requestId": 42,
  "action": "approve" | "reject" | "complete",
  "transactionHash": "0xabc123...",           // Required for 'complete'
  "adminNotes": "Sent to wallet successfully",
  "rejectionReason": "Invalid wallet address" // Required for 'reject'
}

// Response - Success
{
  "success": true,
  "message": "Payout status updated to completed",
  "payout": { /* updated payout object */ }
}
```

**Admin Endpoint - Add to Wallet Pool:**
```typescript
POST /api/admin/wallet-pool/add

// Request Body
{
  "payoutRequestId": 42,
  "bep20Address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "participantId": "uuid",
  "participantEmail": "user@example.com"
}

// Response
{
  "success": true,
  "message": "Address added to wallet pool",
  "poolEntry": { /* wallet_pool record */ }
}
```

### 6.3 Business Logic Functions

**Serial Number Generation (Database Trigger):**
```sql
-- Trigger function to generate serial numbers
CREATE OR REPLACE FUNCTION generate_payout_serial()
RETURNS TRIGGER AS $$
DECLARE
  year_suffix TEXT;
  sequence INT;
  new_serial TEXT;
BEGIN
  -- Get current year (last 2 digits)
  year_suffix := SUBSTRING(EXTRACT(YEAR FROM NEW.requested_at)::TEXT FROM 3 FOR 2);
  
  -- Get highest sequence and add 2 (odd numbers only)
  SELECT COALESCE(MAX(sequence_number), -1) + 2
  INTO sequence
  FROM payout_requests
  WHERE request_year = EXTRACT(YEAR FROM NEW.requested_at);
  
  -- Generate serial: FLCN + YY + sequence (001, 003, 005...)
  new_serial := 'FLCN' || year_suffix || LPAD(sequence::TEXT, 3, '0');
  
  NEW.serial_number := new_serial;
  NEW.sequence_number := sequence;
  NEW.request_year := EXTRACT(YEAR FROM NEW.requested_at);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
CREATE TRIGGER set_payout_serial
  BEFORE INSERT ON payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION generate_payout_serial();
```

**BEP20 Address Validation (TypeScript):**
```typescript
export function validateBEP20Address(address: string): {
  valid: boolean;
  error?: string;
} {
  // Check if address is provided
  if (!address || address.trim().length === 0) {
    return { valid: false, error: "Address is required" };
  }

  // Check format: must start with 0x
  if (!address.startsWith("0x")) {
    return { valid: false, error: "Address must start with 0x" };
  }

  // Check length: must be exactly 42 characters
  if (address.length !== 42) {
    return { valid: false, error: "Address must be 42 characters long" };
  }

  // Check characters: only hexadecimal (0-9, a-f, A-F)
  const hexRegex = /^0x[0-9a-fA-F]{40}$/;
  if (!hexRegex.test(address)) {
    return { valid: false, error: "Address contains invalid characters" };
  }

  return { valid: true };
}
```

**Wallet Pool Assignment (TypeScript):**
```typescript
export async function assignContributingAddresses(
  newUserId: string
): Promise<{ success: boolean; addresses?: string[] }> {
  const supabase = createClient();

  // Get 2 least-used active addresses
  const { data: addresses, error } = await supabase
    .from("wallet_pool")
    .select("*")
    .eq("is_active", true)
    .lt("times_used", 50)
    .order("times_used", { ascending: true })
    .limit(2);

  if (error || !addresses || addresses.length < 2) {
    console.error("[v0] Insufficient addresses in pool:", error);
    return { success: false };
  }

  // Update new user's profile
  const { error: updateError } = await supabase
    .from("participants")
    .update({
      contributing_address_1: addresses[0].bep20_address,
      contributing_address_2: addresses[1].bep20_address,
    })
    .eq("id", newUserId);

  if (updateError) {
    return { success: false };
  }

  // Update wallet pool usage counters
  for (const addr of addresses) {
    await supabase
      .from("wallet_pool")
      .update({
        times_used: addr.times_used + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", addr.id);
  }

  return {
    success: true,
    addresses: [addresses[0].bep20_address, addresses[1].bep20_address],
  };
}
```

---

## Security & Compliance

### 7.1 Data Protection

**Wallet Address Storage:**
- Stored as plain text (addresses are public by nature on blockchain)
- However, association with user identity is sensitive
- Database access restricted to authenticated admins only

**Personal Identifiable Information (PII):**
```
Sensitive Fields in payout_requests:
- participant_email (PII)
- participant_name (PII)
- bep20_address (public, but links to identity)

Protection Measures:
- Row Level Security (RLS) enabled
- Admin authentication required
- Activity logging for all access
- Data encryption at rest
```

### 7.2 Access Control

**Database Row Level Security (RLS):**
```sql
-- Only admins can view payout requests
CREATE POLICY "Admins can view all payouts"
ON payout_requests FOR SELECT
USING (
  auth.role() = 'admin' OR
  auth.uid() IN (SELECT id FROM admins)
);

-- Users can only view their own payouts
CREATE POLICY "Users can view own payouts"
ON payout_requests FOR SELECT
USING (participant_email = auth.email());

-- Only admins can update payout status
CREATE POLICY "Admins can update payouts"
ON payout_requests FOR UPDATE
USING (auth.role() = 'admin');
```

**API Route Protection:**
```typescript
// Middleware for admin routes
export async function adminAuthMiddleware(request: NextRequest) {
  const adminToken = request.cookies.get('admin_token')?.value;
  
  if (!adminToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Verify admin token against database
  const supabase = createClient();
  const { data, error } = await supabase
    .from("admins")
    .select("*")
    .eq("token", adminToken)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Invalid admin token" },
      { status: 403 }
    );
  }

  return null; // Authorized
}
```

### 7.3 Audit Logging

**All Admin Actions Logged:**
```typescript
async function logPayoutAction(
  payoutId: number,
  adminEmail: string,
  action: string,
  oldStatus: string,
  newStatus: string,
  changes: any
) {
  const supabase = createClient();
  
  await supabase.from("payout_audit_logs").insert({
    payout_id: payoutId,
    admin_email: adminEmail,
    action: action,
    old_status: oldStatus,
    new_status: newStatus,
    changes: changes,
    ip_address: getClientIp(),
    user_agent: getUserAgent(),
    timestamp: new Date().toISOString()
  });
}
```

**Logged Actions:**
- Payout approval
- Payout rejection
- Status changes
- Wallet address copied
- Address added to wallet pool
- Transaction hash entry
- Admin notes addition

### 7.4 Fraud Prevention

**Red Flags to Monitor:**
```typescript
// Suspicious pattern detection
async function detectSuspiciousPatterns() {
  // 1. Same wallet address used by multiple users
  const duplicateAddresses = await supabase.rpc(
    'find_duplicate_payout_addresses'
  );

  // 2. Excessive payout requests from single user
  const excessiveRequests = await supabase
    .from('payout_requests')
    .select('participant_email, COUNT(*)')
    .gte('requested_at', 'NOW() - INTERVAL "24 hours"')
    .group('participant_email')
    .having('COUNT(*) > 5');

  // 3. Newly registered users requesting immediate payouts
  const suspiciousNewUsers = await supabase
    .from('participants')
    .select('email, created_at, wallet_balance')
    .gte('created_at', 'NOW() - INTERVAL "1 hour"')
    .gte('wallet_balance', 100);

  return {
    duplicateAddresses,
    excessiveRequests,
    suspiciousNewUsers
  };
}
```

**Admin Alerts:**
- Flag payouts from accounts created < 24 hours ago
- Flag payouts with wallet addresses already in system
- Flag users requesting multiple payouts within 24 hours
- Require additional verification for flagged requests

### 7.5 Compliance Considerations

**Anti-Money Laundering (AML):**
- Track total payout amount per user per month
- Flag users exceeding $1000/month threshold
- Maintain audit trail for regulatory compliance
- Store transaction hashes for blockchain verification

**Know Your Customer (KYC):**
- Consider implementing KYC verification for high-volume users
- Store verification documents securely (separate from payout system)
- Link KYC status to payout approval workflow

**Data Retention:**
```
Retention Policy:
- Active payouts: Indefinite
- Completed payouts: 7 years (compliance requirement)
- Audit logs: 7 years
- Wallet pool records: 7 years
- User can request data deletion (GDPR) after account closure
```

---

## Testing Requirements

### 8.1 User Flow Testing

**Test Cases - Payout Request:**
1. **TC-PR-001:** User with sufficient balance requests payout
   - Expected: Success, balance deducted, request created

2. **TC-PR-002:** User with insufficient balance requests payout
   - Expected: Error message, no balance change

3. **TC-PR-003:** User enters invalid BEP20 address format
   - Expected: Validation error, request not submitted

4. **TC-PR-004:** User cancels payout dialog
   - Expected: No changes, dialog closes

5. **TC-PR-005:** User with pending payout requests another
   - Expected: Success (or business rule to prevent)

6. **TC-PR-006:** Pre-filled address displays correctly
   - Expected: Address from profile auto-fills input

### 8.2 Admin Flow Testing

**Test Cases - Payout Management:**
1. **TC-PM-001:** Admin views payout requests table
   - Expected: All pending/processing payouts displayed

2. **TC-PM-002:** Admin searches by wallet address
   - Expected: Filtered results match search query

3. **TC-PM-003:** Admin approves payout request
   - Expected: Status changes to 'approved', audit log created

4. **TC-PM-004:** Admin rejects payout request
   - Expected: Status 'rejected', funds returned to user

5. **TC-PM-005:** Admin marks payout as sent without tx hash
   - Expected: Error, requires transaction hash

6. **TC-PM-006:** Admin adds address to wallet pool
   - Expected: Record created in wallet_pool table

7. **TC-PM-007:** Admin adds duplicate address to pool
   - Expected: Error or merge with existing record

### 8.3 Integration Testing

**Database Transactions:**
```sql
-- Test: Payout request should deduct balance atomically
BEGIN;
  SELECT wallet_balance FROM participants WHERE email = 'test@example.com';
  -- Should be $200

  INSERT INTO payout_requests (participant_email, amount, ...) VALUES (...);
  
  SELECT wallet_balance FROM participants WHERE email = 'test@example.com';
  -- Should be $100

  SELECT * FROM payout_requests WHERE participant_email = 'test@example.com';
  -- Should have 1 record with status 'pending'
COMMIT;
```

**Real-Time Updates:**
- Test Supabase WebSocket subscription
- Verify user receives notification when status changes
- Confirm toast notifications appear correctly

**API Endpoint Testing:**
```bash
# Test payout request endpoint
curl -X POST http://localhost:3000/api/participant/request-payout \
  -H "Content-Type: application/json" \
  -d '{ \
    "email": "test@example.com", \
    "amount": 100, \
    "bep20_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" \
  }'

# Expected: 200 OK with success message
```

### 8.4 Security Testing

**Penetration Testing:**
1. Attempt to request payout without authentication
2. Attempt to modify another user's payout request
3. SQL injection test on wallet address input
4. XSS test on admin notes field
5. CSRF test on payout submission form

**Access Control Testing:**
1. Non-admin user attempts to access admin dashboard
2. Admin attempts to view user's private data
3. Expired admin token should fail authentication

---

## Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| BEP20 | Binance Smart Chain token standard (similar to Ethereum's ERC20) |
| Payout Request | User's request to withdraw funds from wallet to external address |
| Serial Number | Unique identifier for payout requests (format: FLCN{YY}{SEQ}) |
| Wallet Pool | Database of verified wallet addresses for system use |
| Contributing Address | Wallet address assigned to new users as funding source |
| Transaction Hash | Blockchain transaction identifier (proof of transfer) |
| RLS | Row Level Security - database-level access control |

### B. Support & Maintenance

**For Developers:**
- Code repository: [Internal GitLab/GitHub]
- API documentation: `/docs/api`
- Database schema: `/docs/database-schema.sql`

**For Administrators:**
- Admin manual: `/docs/admin-manual.pdf`
- Training videos: [Internal training portal]
- Support contact: admin-support@flowchain.com

**For Users:**
- FAQ: [User help center]
- Live chat support: [In-app chat]
- Email support: support@flowchain.com

### C. Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Jan 2026 | Initial specification | Development Team |

---

**END OF SPECIFICATION**
