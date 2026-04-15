# 📊 CONTRIBUTION AND PAYOUT FLOW DOCUMENTATION
## Complete End-to-End Process for Admin and User

---

## 🎯 OVERVIEW

This document explains the complete flow of contributions (deposits) and payouts (withdrawals) in the FlowChain platform from both USER and ADMIN perspectives.

---

# 🔵 CONTRIBUTION FLOW (Deposit/Activation Payment)

## USER SIDE - Contribution Journey

### Step 1: Access Contribution Page
**Location:** `/participant/dashboard/contribute`

**User Actions:**
1. User logs into participant dashboard
2. Navigates to "Contribute" section
3. Sees their current wallet balance: `$X.XX`

**What User Sees:**
```
┌─────────────────────────────────────┐
│  💰 Your Wallet Balance: $0.00      │
│  📋 Required Contribution: $100     │
│  ⚡ Activation Fee: FIXED $100      │
└─────────────────────────────────────┘
```

---

### Step 2: Get Recipient Wallet Address
**System Action:** Auto-fetches next wallet from pool

**Technical Flow:**
```sql
-- System queries wallet_pool table
SELECT bep20_address, erc20_address 
FROM wallet_pool 
WHERE is_active = true 
ORDER BY added_at ASC 
LIMIT 1
```

**What User Sees:**
```
┌────────────────────────────────────────────────┐
│  📨 Send Payment To:                           │
│  ┌──────────────────────────────────────────┐ │
│  │ 0x742d35Cc6634C0532925a3b844Bc9e7595f88f52│ │
│  │ [Copy Address] 📋                        │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ⚠️ Send EXACTLY $100 USDT to this address    │
│  🌐 Network: BEP20 (Binance Smart Chain)      │
└────────────────────────────────────────────────┘
```

---

### Step 3: User Makes Payment
**User Actions:**
1. Opens their crypto wallet (Trust Wallet, MetaMask, etc.)
2. Copies the displayed wallet address
3. Sends EXACTLY $100 USDT (BEP20 or ERC20)
4. Gets transaction hash from blockchain

**Important Notes:**
- Amount must be EXACTLY $100
- Must use correct network (BEP20 or ERC20)
- Transaction is recorded on blockchain

---

### Step 4: Submit Proof of Payment
**User Actions:**
1. Returns to contribution page
2. Enters transaction hash from blockchain
3. Uploads screenshot of transaction
4. Clicks "Submit Payment Proof"

**Form Fields:**
```
┌─────────────────────────────────────────────┐
│  📝 Payment Submission Form                 │
│  ┌───────────────────────────────────────┐ │
│  │ Transaction Hash*                     │ │
│  │ [0x123abc...]                        │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  📸 Upload Screenshot*                      │
│  [Choose File] or [Take Photo]             │
│  ├── payment_screenshot.png (Selected)     │
│  │                                          │
│  │ [Submit Payment Proof] 🚀               │
│  └─────────────────────────────────────────│
└─────────────────────────────────────────────┘
```

---

### Step 5: Submission Recorded
**System Actions:**
```javascript
// API: /api/participant/submit-payment
POST {
  participant_email: "user@example.com",
  participant_name: "John Doe",
  participant_wallet: "0x...",
  amount: 100,
  payment_method: "bep20",
  transaction_hash: "0x123abc...",
  screenshot_data: "base64_image_data",
  status: "pending"
}

// Database: payment_submissions table
INSERT INTO payment_submissions (
  participant_email,
  amount,
  transaction_hash,
  screenshot_data,
  status,
  created_at
) VALUES (...)
```

**What User Sees:**
```
✅ Payment Submitted Successfully!

┌─────────────────────────────────────┐
│  🎉 Your payment proof has been     │
│     submitted for review            │
│                                     │
│  ⏱️  Status: Pending Review         │
│  📧  You'll be notified via email   │
│  ⏰  Review Time: 2-24 hours        │
└─────────────────────────────────────┘
```

---

## ADMIN SIDE - Contribution Management

### Step 1: View Pending Contributions
**Location:** `/admin/dashboard` → Contributions Tab

**Admin Dashboard View:**
```
┌──────────────────────────────────────────────────────────────┐
│  🔔 Activation Payments Panel                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  📊 Statistics:                                              │
│  ├─ Pending: 5                                              │
│  ├─ Approved Today: 12                                      │
│  ├─ Rejected Today: 1                                       │
│  └─ Total Collected: $1,300                                 │
│                                                              │
│  🔍 [Search by name, email, wallet...]                      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐│
│  │ User     │ Amount │ Wallet  │ Hash   │ Screenshot │ Action││
│  ├────────────────────────────────────────────────────────┤│
│  │ John Doe │ $100   │ 0x742d..│ 0x9f.. │ [View 👁️] │ [✓][✗]││
│  │ Pending  │ BEP20  │         │        │            │        ││
│  ├────────────────────────────────────────────────────────┤│
│  │ Jane Sm..│ $100   │ 0x832a..│ 0x7e.. │ [View 👁️] │ [✓][✗]││
│  │ Pending  │ ERC20  │         │        │            │        ││
│  └────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

---

### Step 2: Review Payment Details
**Admin Actions:**
1. Clicks "View 👁️" button to see screenshot
2. Reviews transaction details
3. Verifies transaction hash on blockchain explorer

**Payment Review Modal:**
```
┌─────────────────────────────────────────────────┐
│  📋 Payment Review Details                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  👤 User: John Doe (@johndoe)                   │
│  📧 Email: john@example.com                     │
│  💰 Amount: $100.00                             │
│  🌐 Network: BEP20                              │
│  📍 Recipient: 0x742d35Cc6634...                │
│  🔗 TX Hash: 0x9f8e7d6c5b4a3...                 │
│  📅 Submitted: 2026-01-22 14:30 UTC             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  📸 Payment Screenshot:                         │
│  ┌───────────────────────────────────────────┐ │
│  │ [Screenshot showing transaction details]  │ │
│  │ Transaction: $100 USDT                   │ │
│  │ Status: Confirmed ✓                      │ │
│  │ Network: BSC                             │ │
│  └───────────────────────────────────────────┘ │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  ✅ [Approve Payment]    ❌ [Reject Payment]    │
└─────────────────────────────────────────────────┘
```

---

### Step 3: Approve or Reject Payment
**Admin Decision: APPROVE**

**System Actions:**
```javascript
// API: /api/admin/activation-payments
POST {
  paymentId: "123",
  action: "approve"
}

// System executes:
1. Update payment_submissions.status = 'approved'
2. Update participants.activation_fee_paid = true
3. Update participants.contribution_approved = true
4. Add wallet to wallet_pool (for future contributors)
5. Send notification to user
6. Create activity log entry
```

**Database Updates:**
```sql
-- Update payment status
UPDATE payment_submissions 
SET status = 'approved', 
    reviewed_by = 'admin@flowchain.com',
    reviewed_at = NOW()
WHERE id = '123';

-- Update participant status
UPDATE participants 
SET activation_fee_paid = true,
    contribution_approved = true,
    status = 'active'
WHERE email = 'john@example.com';

-- Add wallet to pool for future use
INSERT INTO wallet_pool (
  participant_email,
  bep20_address,
  contribution_amount,
  is_active
) VALUES (
  'john@example.com',
  '0x742d35Cc6634...',
  100.00,
  true
);

-- Create activity log
INSERT INTO activity_logs (
  actor_email,
  action,
  target_type,
  details
) VALUES (
  'admin@flowchain.com',
  'approve_contribution',
  'payment_submission',
  'Approved $100 contribution from john@example.com'
);
```

**Admin Decision: REJECT**

**Rejection Modal:**
```
┌─────────────────────────────────────────────────┐
│  ❌ Reject Payment                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  📝 Rejection Reason:*                          │
│  ┌───────────────────────────────────────────┐ │
│  │ [✓] Incorrect amount                      │ │
│  │ [ ] Invalid transaction hash              │ │
│  │ [ ] Screenshot doesn't match              │ │
│  │ [ ] Wrong network used                    │ │
│  │ [ ] Duplicate submission                  │ │
│  │ [ ] Other (specify below)                 │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Additional Notes:                              │
│  ┌───────────────────────────────────────────┐ │
│  │ Please send exactly $100...               │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  [Cancel]              [Submit Rejection ❌]   │
└─────────────────────────────────────────────────┘
```

---

### Step 4: User Gets Notified
**Approved Notification:**
```
📧 Email to User:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From: FlowChain Admin <admin@flowchain.com>
To: john@example.com
Subject: ✅ Your Contribution Has Been Approved!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hello John Doe,

Great news! Your activation payment of $100 has been 
successfully verified and approved.

✅ Payment Status: APPROVED
💰 Amount: $100.00 USDT
🔗 Transaction: 0x9f8e7d6c...
📅 Approved: 2026-01-22 15:45 UTC

Your account is now ACTIVE and you can:
- Start earning rewards
- Request payouts
- Refer new users
- Access all platform features

Welcome to FlowChain! 🎉

[Go to Dashboard →]
```

---

---

# 🔴 PAYOUT FLOW (Withdrawal)

## USER SIDE - Payout Request Journey

### Step 1: Check Wallet Balance
**Location:** `/participant/dashboard/payout`

**Eligibility Check:**
```
User must have:
✓ Activated account (contribution approved)
✓ Wallet balance ≥ $100
✓ No pending payout requests
✓ Valid BEP20 wallet address
```

**What User Sees:**
```
┌─────────────────────────────────────────────┐
│  💰 Wallet Overview                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  Current Balance: $250.00                   │
│  Available to Withdraw: $200.00             │
│  Pending Payouts: $0.00                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  📊 Payout Statistics:                      │
│  ├─ Total Withdrawn: $300.00               │
│  ├─ Successful Payouts: 3                  │
│  └─ Last Payout: 5 days ago                │
│                                             │
│  🎯 Fixed Payout Amount: $100              │
│  ⏱️  Processing Time: 24-48 hours          │
└─────────────────────────────────────────────┘
```

---

### Step 2: Initiate Payout Request
**User Actions:**
1. Clicks "Request Payout" button
2. Enters/Confirms BEP20 wallet address
3. Confirms $100 withdrawal

**Payout Request Form:**
```
┌─────────────────────────────────────────────────┐
│  💸 Request Payout                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  💰 Withdrawal Amount: $100.00 (Fixed)          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  📍 Your BEP20 Wallet Address:*                 │
│  ┌───────────────────────────────────────────┐ │
│  │ 0x8F4d7C3e2B9a1C6D5E8F7A0B9C2D4E6F8A1B3C │ │
│  │ [✓] Saved in Profile                     │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ⚠️  Important Notices:                         │
│  ├─ Funds will be sent to the address above    │
│  ├─ Double-check your wallet address           │
│  ├─ Processing time: 24-48 hours               │
│  ├─ You cannot change address after submission │
│  └─ Network: BEP20 (Binance Smart Chain)       │
│                                                 │
│  [ ] I confirm this wallet address is correct  │
│                                                 │
│  [Cancel]            [Submit Request 🚀]       │
└─────────────────────────────────────────────────┘
```

---

### Step 3: Request Submitted
**System Actions:**
```javascript
// API: /api/participant/request-payout
POST {
  participant_email: "john@example.com",
  participant_name: "John Doe",
  amount: 100,
  bep20_address: "0x8F4d7C3e...",
  wallet_balance_before: 250
}

// System executes:
1. Validate user has sufficient balance
2. Check for pending requests
3. Deduct $100 from wallet balance
4. Generate unique serial number (FLCN26001, FLCN26003, etc.)
5. Create payout request with status = 'pending'
6. Send confirmation notification
```

**Database Insert:**
```sql
-- Create payout request
INSERT INTO payout_requests (
  serial_number,
  participant_email,
  participant_name,
  amount,
  bep20_address,
  status,
  wallet_balance_before,
  wallet_balance_after,
  requested_at,
  sequence_number,
  request_year
) VALUES (
  'FLCN26005',           -- Auto-generated (odd numbers)
  'john@example.com',
  'John Doe',
  100.00,
  '0x8F4d7C3e...',
  'pending',
  250.00,
  150.00,                -- Balance after deduction
  NOW(),
  5,                     -- Sequence number
  2026                   -- Current year
);

-- Deduct from wallet balance
UPDATE participants 
SET wallet_balance = wallet_balance - 100,
    pending_requests = pending_requests + 1
WHERE email = 'john@example.com';

-- Create transaction record
INSERT INTO transactions (
  participant_email,
  type,
  amount,
  description,
  balance_before,
  balance_after,
  reference_id
) VALUES (
  'john@example.com',
  'payout_request',
  -100.00,
  'Payout request FLCN26005',
  250.00,
  150.00,
  'FLCN26005'
);
```

**Success Screen:**
```
✅ Payout Request Submitted!

┌─────────────────────────────────────────────┐
│  🎉 Your withdrawal request is being        │
│     processed                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  📋 Request Details:                        │
│  ├─ Serial Number: FLCN26005               │
│  ├─ Amount: $100.00                        │
│  ├─ Destination: 0x8F4d7C3e...             │
│  ├─ Status: Pending Review                 │
│  └─ Submitted: 2026-01-22 16:20 UTC        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  ⏱️  Processing Timeline:                   │
│  1. [●] Request Submitted                   │
│  2. [○] Admin Review (0-12 hours)          │
│  3. [○] Processing (12-24 hours)           │
│  4. [○] Blockchain Transfer (24-48 hours)  │
│  5. [○] Completed                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  💰 Updated Wallet Balance: $150.00         │
│  📧 You'll receive email updates            │
└─────────────────────────────────────────────┘

[View Payout History]  [Back to Dashboard]
```

---

### Step 4: Track Payout Status
**User's Payout History View:**
```
┌────────────────────────────────────────────────────────┐
│  📊 Payout Request History                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  🔍 [Search by serial number, status...]              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  ┌──────────────────────────────────────────────────┐│
│  │ Serial     │ Amount │ Status    │ Date     │ TX  ││
│  ├──────────────────────────────────────────────────┤│
│  │ FLCN26005  │ $100   │ [⏱️ Pending]│ 2 hours │ -  ││
│  │            │        │ Review     │ ago     │     ││
│  ├──────────────────────────────────────────────────┤│
│  │ FLCN26001  │ $100   │ [✅ Completed]│5 days│0x7f││
│  │            │        │            │ ago     │     ││
│  ├──────────────────────────────────────────────────┤│
│  │ FLCN25999  │ $100   │ [✅ Completed]│12 days│0x9a││
│  │            │        │            │ ago     │     ││
│  └──────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────┘
```

---

## ADMIN SIDE - Payout Management

### Step 1: View Payout Requests
**Location:** `/admin/dashboard` → Database Tab (Payout Management)

**Admin Dashboard View:**
```
┌────────────────────────────────────────────────────────────────┐
│  💰 Payout Management System                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  📊 Statistics:                                                │
│  ├─ Pending Requests: 15                                      │
│  ├─ In Processing: 3                                          │
│  ├─ Completed Today: 8                                        │
│  ├─ Total Paid Today: $800                                    │
│  └─ Average Processing Time: 18 hours                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  🔍 [Search by serial #, name, email, address...]            │
│  📅 [All Status ▼] [All Time ▼] [Export CSV]                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  ┌──────────────────────────────────────────────────────────┐│
│  │Serial# │User     │Amount│Wallet   │Status  │Requested│Actions││
│  ├──────────────────────────────────────────────────────────┤│
│  │FLCN26005│John Doe │$100 │0x8F4d7..│[⏱️ Pending]│2h ago│[Start]││
│  │         │@johndoe │     │         │         │      │  ⚙️  ││
│  ├──────────────────────────────────────────────────────────┤│
│  │FLCN26003│Jane Sm..│$100 │0x3A2f8..│[🔄 Processing]│8h│[Complete]││
│  │         │@janes   │     │         │         │      │  ✅  ││
│  ├──────────────────────────────────────────────────────────┤│
│  │FLCN26001│Bob Lee  │$100 │0x9D1c4..│[✅ Completed]│1d ago│[View]││
│  │         │@boblee  │     │         │         │      │  👁️  ││
│  └──────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────┘
```

---

### Step 2: Process Payout Request

**Admin Action Flow:**
```
Pending → Processing → Approved → Confirmed → Completed
   ⏱️        🔄          ✅         📤          ✓
```

**Step 2A: Start Processing**
**Admin clicks "Start" button**

**System Actions:**
```javascript
// API: /api/admin/process-payout
POST {
  payoutId: 123,
  action: "start_processing"
}

// Updates:
UPDATE payout_requests 
SET status = 'processing',
    processing_started_at = NOW(),
    processing_admin_id = 'admin_uuid'
WHERE id = 123;
```

---

**Step 2B: Send Blockchain Transaction**
**Admin manually sends USDT via blockchain**

**Admin Blockchain Actions:**
1. Opens admin crypto wallet
2. Sends $100 USDT to user's BEP20 address
3. Copies transaction hash from blockchain
4. Returns to admin panel

---

**Step 2C: Mark as Approved**
**Admin enters transaction details**

**Approval Modal:**
```
┌─────────────────────────────────────────────────┐
│  ✅ Approve Payout - FLCN26005                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  👤 User: John Doe (@johndoe)                   │
│  📧 Email: john@example.com                     │
│  💰 Amount: $100.00                             │
│  📍 Destination: 0x8F4d7C3e2B9a1C6D...          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  🔗 Blockchain Transaction Hash:*               │
│  ┌───────────────────────────────────────────┐ │
│  │ 0x7f9e8d7c6b5a4d3e2f1a0b9c8d7e6f5a4b3c2d1│ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  📝 Admin Notes (optional):                     │
│  ┌───────────────────────────────────────────┐ │
│  │ Sent via Binance. TX confirmed on BSCScan│ │
│  └───────────────────────────────────────────┘ │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  [Cancel]              [Approve Payout ✅]     │
└─────────────────────────────────────────────────┘
```

**System Actions:**
```sql
-- Update payout status to approved
UPDATE payout_requests 
SET status = 'approved',
    transaction_hash = '0x7f9e8d7c...',
    admin_notes = 'Sent via Binance...',
    approved_at = NOW()
WHERE id = 123;

-- Log admin action
INSERT INTO payout_audit_logs (
  payout_id,
  serial_number,
  admin_email,
  action,
  old_status,
  new_status,
  changes
) VALUES (
  123,
  'FLCN26005',
  'admin@flowchain.com',
  'approve_payout',
  'processing',
  'approved',
  '{"transaction_hash": "0x7f9e8d7c..."}'
);
```

---

**Step 2D: Mark as Completed**
**After blockchain confirmation (usually automatic or admin clicks Confirm)**

```sql
-- Final status update
UPDATE payout_requests 
SET status = 'completed',
    completed_at = NOW(),
    processed_at = NOW()
WHERE id = 123;

-- Update participant stats
UPDATE participants 
SET pending_requests = pending_requests - 1,
    total_received = total_received + 100
WHERE email = 'john@example.com';

-- Send completion notification
INSERT INTO notifications (
  user_email,
  type,
  title,
  message
) VALUES (
  'john@example.com',
  'payout_completed',
  'Payout Completed!',
  'Your payout of $100 has been sent. TX: 0x7f9e8d7c...'
);
```

---

### Step 3: User Receives Notification

**Email Notification:**
```
📧 Email to User:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From: FlowChain Admin <admin@flowchain.com>
To: john@example.com
Subject: ✅ Payout Completed - FLCN26005
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hello John Doe,

Great news! Your payout has been successfully processed 
and sent to your wallet.

✅ Payout Status: COMPLETED
💰 Amount: $100.00 USDT
📋 Serial #: FLCN26005
📍 Sent To: 0x8F4d7C3e2B9a1C6D...
🔗 Transaction Hash: 0x7f9e8d7c6b5a4d3e2f1a0b9c8d7e6f5a
🌐 Network: BEP20 (Binance Smart Chain)
⏱️  Processing Time: 18 hours
📅 Completed: 2026-01-23 10:45 UTC

You can verify the transaction on BSCScan:
https://bscscan.com/tx/0x7f9e8d7c...

Your funds should appear in your wallet shortly.

Current Wallet Balance: $150.00

[View Transaction] [Request Another Payout]
```

---

## 🎯 WALLET POOL SYSTEM

### How Contributor Addresses Become Payout Addresses

**The Cycle:**
```
1. New User (Alice) wants to contribute $100
   ↓
2. System assigns her Bob's wallet (from pool)
   ↓
3. Alice sends $100 to Bob's wallet
   ↓
4. Admin approves Alice's contribution
   ↓
5. Alice's wallet is added to wallet_pool
   ↓
6. Next user (Charlie) gets Alice's wallet
   ↓
7. Cycle continues...
```

**Database Flow:**
```sql
-- Step 1: Bob contributed, his wallet is in pool
INSERT INTO wallet_pool (
  participant_email: 'bob@example.com',
  bep20_address: '0x742d35Cc...',
  is_active: true,
  contribution_amount: 100
)

-- Step 2: Alice requests to contribute
-- System queries oldest active wallet
SELECT bep20_address FROM wallet_pool
WHERE is_active = true
ORDER BY added_at ASC
LIMIT 1
-- Returns: Bob's wallet (0x742d35Cc...)

-- Step 3: Alice sends $100 to Bob's wallet
-- Admin approves Alice's contribution

-- Step 4: Alice's wallet added to pool
INSERT INTO wallet_pool (
  participant_email: 'alice@example.com',
  bep20_address: '0x8F4d7C3e...',
  is_active: true,
  contribution_amount: 100
)

-- Step 5: Update Bob's wallet usage stats
UPDATE wallet_pool
SET times_used = times_used + 1,
    last_used_at = NOW()
WHERE bep20_address = '0x742d35Cc...'
```

---

## 📊 COMPLETE DATA FLOW SUMMARY

### CONTRIBUTION (Deposit) Summary

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│    USER     │────────▶│   SYSTEM     │────────▶│   ADMIN     │
└─────────────┘         └──────────────┘         └─────────────┘
      │                         │                        │
      │ 1. Access Contribute    │                        │
      │────────────────────────▶│                        │
      │                         │                        │
      │ 2. Get Wallet Address   │                        │
      │◀────────────────────────│                        │
      │                         │                        │
      │ 3. Send $100 USDT       │                        │
      │    (via blockchain)     │                        │
      │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─▶│                        │
      │                         │                        │
      │ 4. Submit Proof         │                        │
      │────────────────────────▶│                        │
      │                         │ 5. Review Request      │
      │                         │───────────────────────▶│
      │                         │                        │
      │                         │ 6. Approve/Reject      │
      │                         │◀───────────────────────│
      │                         │                        │
      │ 7. Get Notification     │                        │
      │◀────────────────────────│                        │
      │                         │                        │
      │ 8. Account Activated    │                        │
      │◀────────────────────────│                        │
```

### PAYOUT (Withdrawal) Summary

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│    USER     │────────▶│   SYSTEM     │────────▶│   ADMIN     │
└─────────────┘         └──────────────┘         └─────────────┘
      │                         │                        │
      │ 1. Request Payout       │                        │
      │────────────────────────▶│                        │
      │                         │                        │
      │                         │ 2. Create Request      │
      │                         │    (Serial: FLCN26XXX) │
      │                         │                        │
      │                         │ 3. Deduct Balance      │
      │                         │                        │
      │ 4. Get Confirmation     │                        │
      │◀────────────────────────│                        │
      │                         │                        │
      │                         │ 5. Review Request      │
      │                         │───────────────────────▶│
      │                         │                        │
      │                         │ 6. Send Blockchain TX  │
      │                         │◀─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
      │                         │                        │
      │                         │ 7. Approve with TX Hash│
      │                         │◀───────────────────────│
      │                         │                        │
      │                         │ 8. Mark as Completed   │
      │                         │◀───────────────────────│
      │                         │                        │
      │ 9. Receive Notification │                        │
      │◀────────────────────────│                        │
      │                         │                        │
      │ 10. Funds in Wallet     │                        │
      │◀─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                        │
```

---

## 🔐 SECURITY & VALIDATION

### Contribution Validations
```
✓ Valid participant account
✓ No pending submissions
✓ Correct payment amount ($100)
✓ Valid blockchain transaction hash
✓ Screenshot uploaded
✓ BEP20/ERC20 network correct
✓ Wallet address format valid
```

### Payout Validations
```
✓ User account activated
✓ Sufficient wallet balance (≥ $100)
✓ No pending payout requests
✓ Valid BEP20 wallet address
✓ Correct address format
✓ Account not frozen
✓ Request within limits
```

---

## 📈 KEY METRICS TRACKED

### Contribution Metrics
- Total contributions submitted
- Pending reviews
- Approved/Rejected counts
- Average review time
- Total collected amount
- Approval rate

### Payout Metrics
- Total payout requests
- Pending/Processing/Completed counts
- Average processing time
- Total paid amount
- Success rate
- Failed transactions

---

## 🎓 IMPORTANT NOTES

### For Users:
1. **Contributions are ONE-TIME** - You only contribute once ($100) to activate
2. **Payouts are FIXED** - You can only withdraw in $100 increments
3. **Wallet addresses are PERMANENT** - Cannot change after submission
4. **Processing takes time** - Be patient (24-48 hours typical)
5. **Check your wallet** - Ensure you have the correct BEP20 address

### For Admins:
1. **Verify transactions** - Always check blockchain explorer
2. **Double-check addresses** - One mistake = lost funds
3. **Document everything** - Add admin notes for audit trail
4. **Process promptly** - Users are waiting for their funds
5. **Monitor wallet pool** - Ensure sufficient addresses available

---

## 🔄 STATUS LIFECYCLE

### Contribution Statuses:
```
pending → approved → (user activated)
        ↘ rejected → (user can resubmit)
```

### Payout Statuses:
```
pending → processing → approved → confirmed → completed
        ↘ rejected → (funds returned to user wallet)
```

---

## END OF DOCUMENTATION

**Last Updated:** 2026-01-22
**Document Version:** 1.0
**Maintained by:** FlowChain Technical Team

For questions or issues, contact: admin@flowchain.com
