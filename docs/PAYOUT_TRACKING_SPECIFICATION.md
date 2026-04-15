# Payout Request Tracking System Specification
## FlowChain Admin Dashboard

### Overview
This specification outlines the implementation of a comprehensive payout request tracking system for the FlowChain crypto prediction platform. The system allows administrators to efficiently manage, track, and process user payout requests with unique serial numbers and detailed tracking information.

---

## 1. Serial Number Format

### Format Structure
**Pattern:** `FLCN{YEAR}{SEQUENCE}`

**Examples:** 
- `FLCN26001` (First request of 2026)
- `FLCN26003` (Second request of 2026)
- `FLCN26005` (Third request of 2026)
- `FLCN26007` (Fourth request of 2026)

### Components
- **Prefix:** `FLCN` (FlowChain identifier)
- **Year:** 2-digit year (e.g., `23` for 2023, `26` for 2026)
- **Sequence:** 3-digit zero-padded ODD sequential number (001, 003, 005, 007...)

### Generation Rules
1. Serial numbers are auto-generated when a payout request is created
2. **Sequence increments by 2** for each new request (only odd numbers: 1, 3, 5, 7, 9...)
3. Sequence counter resets to 001 annually on January 1st
4. Format: `FLCN + YY + SEQ` where:
   - YY = Current year (last 2 digits)
   - SEQ = ODD sequence number for that year (padded to 3 digits)
5. Database stores both the formatted serial and numeric sequence
6. Sequence is incremental (by 2) and unique per year

### Implementation Details
```typescript
// Serial generation algorithm (increments by 2 for odd numbers)
function generatePayoutSerial(year: number, sequence: number): string {
  const yearSuffix = year.toString().slice(-2)
  const paddedSequence = sequence.toString().padStart(3, '0')
  return `FLCN${yearSuffix}${paddedSequence}`
}

// Example sequence progression:
// Request 1: FLCN26001
// Request 2: FLCN26003
// Request 3: FLCN26005
// Request 4: FLCN26007
```

---

## 2. User Details Display

### Required Information
Each payout request displays the following user details:

#### Primary Information
1. **Serial Number** (FLCN23100)
   - Prominently displayed
   - Searchable and filterable
   - Links to detailed view

2. **User Identification**
   - Full Name
   - Username (with @ prefix)
   - Email Address
   - User ID (UUID)

3. **Payout Details**
   - Requested Amount ($)
   - Wallet Balance Before
   - Wallet Balance After
   - Net Deduction

4. **Wallet Information**
   - BEP20 Wallet Address
   - Address validation status
   - Previous successful payouts count

5. **Request Status**
   - Current state (Pending/Processing/Approved/Completed/Rejected)
   - Status timestamps
   - Processing admin
   - Transaction hash (if completed)

#### Secondary Information
6. **Timestamps**
   - Request Created At
   - Last Updated At
   - Processed At (if applicable)
   - Completed At (if applicable)

7. **Contact Information**
   - Primary Phone Number
   - Location (Country, State)
   - Account Age

8. **Financial Summary**
   - Total Lifetime Earnings
   - Total Withdrawn
   - Current Balance
   - Pending Requests

---

## 3. Admin Dashboard Functionality

### 3.1 View Features

#### List View
- **Table Columns:**
  - Serial Number (FLCN...)
  - User Info (Name, Email)
  - Amount
  - Wallet Address (truncated with copy button)
  - Status Badge
  - Request Date
  - Actions

- **Sorting:** By date, amount, status, serial number
- **Filtering:** Status, date range, amount range
- **Search:** Serial number, name, email, wallet address
- **Pagination:** 20 items per page

#### Detail View Modal
- Complete user information
- Full transaction history
- Admin activity log
- Edit capabilities for tracking info

### 3.2 Modification Capabilities

Administrators can modify the following fields:

#### Editable Fields
1. **Status** (with validation rules)
   - Pending → Processing
   - Processing → Approved
   - Approved → Completed
   - Any → Rejected

2. **Transaction Hash**
   - Added when marking as Completed
   - Validates format (0x...)
   - Permanent once set

3. **Admin Notes**
   - Internal tracking notes
   - Rejection reasons
   - Processing comments
   - Audit trail maintained

4. **Payout Tracking Information**
   - Processing Admin ID
   - Processing Timestamp
   - Review Notes
   - Priority Level (Normal/High/Urgent)

#### Non-Editable Fields
- Serial Number
- Requested Amount
- User Email/ID
- Request Date
- Wallet Balances (historical)

### 3.3 Action Workflows

#### 1. Process Request (Pending → Processing)
**Actions:**
- Review user details
- Verify wallet balance
- Add processing notes
- Assign to admin

**Validations:**
- User must have sufficient balance
- No duplicate pending requests
- Valid wallet address

#### 2. Approve Request (Processing → Approved)
**Actions:**
- Final review
- Prepare for blockchain transaction
- Set priority
- Add approval notes

**Validations:**
- Request must be in Processing
- Admin must have approval permissions
- Amount within daily limits

#### 3. Confirm Sent (Approved → Completed)
**Actions:**
- Enter transaction hash
- Confirm blockchain transaction
- Update user earnings
- Send notification to user

**Validations:**
- Valid transaction hash format
- Transaction hash not previously used
- Amount matches request

#### 4. Reject Request (Any → Rejected)
**Actions:**
- Provide rejection reason (required)
- Refund to user wallet
- Send notification
- Log rejection

**Validations:**
- Rejection reason required
- Cannot reject Completed requests
- Must refund balance

---

## 4. Data Security & Integrity

### 4.1 Access Control

#### Role-Based Permissions
```typescript
enum AdminRole {
  SUPER_ADMIN = 'super_admin',     // Full access
  PAYOUT_MANAGER = 'payout_manager', // Process, approve, confirm
  PAYOUT_VIEWER = 'payout_viewer',   // Read-only access
  FINANCE_ADMIN = 'finance_admin'   // Approve and confirm only
}
```

#### Permission Matrix
| Action | Super Admin | Payout Manager | Payout Viewer | Finance Admin |
|--------|------------|----------------|---------------|---------------|
| View | ✓ | ✓ | ✓ | ✓ |
| Process | ✓ | ✓ | ✗ | ✗ |
| Approve | ✓ | ✓ | ✗ | ✓ |
| Confirm | ✓ | ✓ | ✗ | ✓ |
| Reject | ✓ | ✓ | ✗ | ✗ |
| Edit Notes | ✓ | ✓ | ✗ | ✗ |

### 4.2 Data Protection

#### Encryption
- **At Rest:** All sensitive data encrypted in database
- **In Transit:** HTTPS/TLS for all API communications
- **Wallet Addresses:** Encrypted storage, decrypted on display

#### Audit Logging
Every action is logged with:
- Admin ID and email
- Action type
- Timestamp
- IP address
- Changed fields (before/after)
- User affected

```typescript
interface AuditLog {
  id: string
  admin_id: string
  admin_email: string
  action: string
  target_type: 'payout_request'
  target_id: string
  changes: Record<string, {before: any, after: any}>
  ip_address: string
  timestamp: Date
}
```

#### Data Validation
1. **Input Sanitization**
   - XSS prevention
   - SQL injection protection
   - Format validation

2. **Business Logic Validation**
   - Amount limits ($10 - $10,000)
   - Balance sufficiency checks
   - Duplicate prevention
   - Status flow validation

3. **Wallet Address Validation**
   - BEP20 format verification
   - Checksum validation
   - Blacklist checking

### 4.3 Privacy Compliance

#### User Data Handling
- Minimal data exposure principle
- Wallet addresses truncated in list view
- Full addresses only in detail view
- No email sharing in exports

#### GDPR/Privacy Considerations
- Data retention policy: 7 years
- User right to request deletion
- Export capability for user data
- Consent tracking for notifications

---

## 5. Database Schema

### 5.1 Enhanced Payout Requests Table

```sql
CREATE TABLE payout_requests (
  id SERIAL PRIMARY KEY,
  serial_number VARCHAR(20) UNIQUE NOT NULL, -- FLCN26001
  sequence_number INTEGER NOT NULL,          -- 1, 2, 3...
  request_year INTEGER NOT NULL,             -- 2026
  
  -- User Information
  participant_id UUID REFERENCES participants(id),
  participant_name VARCHAR(255) NOT NULL,
  participant_email VARCHAR(255) NOT NULL,
  participant_username VARCHAR(100),
  
  -- Payout Details
  amount DECIMAL(15, 2) NOT NULL,
  bep20_address VARCHAR(42) NOT NULL,
  wallet_balance_before DECIMAL(15, 2) NOT NULL,
  wallet_balance_after DECIMAL(15, 2) NOT NULL,
  
  -- Status & Processing
  status VARCHAR(20) NOT NULL, -- pending, processing, approved, completed, rejected
  priority VARCHAR(20) DEFAULT 'normal', -- normal, high, urgent
  
  -- Timestamps
  requested_at TIMESTAMP DEFAULT NOW(),
  processing_started_at TIMESTAMP,
  approved_at TIMESTAMP,
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Processing Information
  processed_by VARCHAR(255),              -- Admin email
  processing_admin_id UUID,
  transaction_hash VARCHAR(66),           -- Blockchain TX hash
  admin_notes TEXT,
  rejection_reason TEXT,
  
  -- Tracking
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'approved', 'completed', 'rejected')),
  CONSTRAINT valid_amount CHECK (amount >= 10 AND amount <= 10000),
  INDEX idx_serial_number (serial_number),
  INDEX idx_participant_email (participant_email),
  INDEX idx_status (status),
  INDEX idx_requested_at (requested_at DESC)
);
```

### 5.2 Audit Log Table

```sql
CREATE TABLE payout_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id INTEGER REFERENCES payout_requests(id),
  serial_number VARCHAR(20),
  admin_id UUID,
  admin_email VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_payout_id (payout_id),
  INDEX idx_timestamp (timestamp DESC)
);
```

---

## 6. API Endpoints

### 6.1 List Payout Requests
```
GET /api/admin/payout-requests
Query Parameters:
  - status: filter by status
  - search: search serial, email, name
  - page: pagination
  - limit: items per page
  - sortBy: sort field
  - sortOrder: asc/desc
```

### 6.2 Get Single Request
```
GET /api/admin/payout-requests/:serialNumber
Returns: Full payout details with audit history
```

### 6.3 Update Request Status
```
POST /api/admin/payout-requests/:id/update-status
Body: {
  status: string
  transaction_hash?: string
  admin_notes?: string
  priority?: string
}
```

### 6.4 Update Tracking Info
```
PATCH /api/admin/payout-requests/:id/tracking
Body: {
  priority?: string
  admin_notes?: string
  processing_notes?: string
}
```

---

## 7. UI/UX Considerations

### 7.1 Design Principles
- **Clarity:** Clear status indicators and action buttons
- **Efficiency:** Quick access to common actions
- **Safety:** Confirmations for critical actions
- **Feedback:** Real-time updates and notifications

### 7.2 Color Coding
- **Pending:** Amber (⚠️ Awaiting review)
- **Processing:** Cyan (🔄 In progress)
- **Approved:** Blue (✓ Ready to send)
- **Completed:** Green (✓✓ Successfully sent)
- **Rejected:** Red (✗ Declined)

### 7.3 User Flow
1. Admin sees list of requests with serial numbers
2. Clicks serial number to view details
3. Reviews user information and validates
4. Takes action (Process/Approve/Confirm/Reject)
5. Receives confirmation and sees updated status
6. User receives automated notification

---

## 8. Notifications

### 8.1 User Notifications
- Request received confirmation
- Status change updates
- Completion with TX hash
- Rejection with reason

### 8.2 Admin Notifications
- New requests (daily digest)
- High-priority requests (immediate)
- Failed transactions
- Unusual patterns detected

---

## 9. Reporting & Analytics

### 9.1 Dashboard Metrics
- Total requests by status
- Average processing time
- Total payout volume
- Success/rejection rate
- Admin performance metrics

### 9.2 Export Capabilities
- CSV export with all fields
- Date range filtering
- Status filtering
- Excel-compatible format

---

## 10. Testing Requirements

### 10.1 Unit Tests
- Serial number generation
- Status transition validation
- Amount calculations
- Permission checks

### 10.2 Integration Tests
- Full payout workflow
- Database transactions
- API endpoints
- Notification delivery

### 10.3 Security Tests
- Authorization bypass attempts
- SQL injection prevention
- XSS attack prevention
- Rate limiting

---

## 11. Deployment Checklist

- [ ] Database migration for serial numbers
- [ ] Update existing records with serial numbers
- [ ] Deploy new API endpoints
- [ ] Update admin dashboard UI
- [ ] Configure notification templates
- [ ] Set up monitoring and alerts
- [ ] Train admin users
- [ ] Update documentation

---

## Implementation Timeline

**Phase 1 (Week 1):** Database schema updates, serial generation
**Phase 2 (Week 2):** API endpoints and backend logic
**Phase 3 (Week 3):** Admin UI implementation
**Phase 4 (Week 4):** Testing, security audit, deployment

---

## Maintenance & Support

- Regular security audits (quarterly)
- Performance monitoring
- User feedback collection
- Feature enhancements based on usage

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Author:** FlowChain Development Team
