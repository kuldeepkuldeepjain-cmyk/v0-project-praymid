export type Payment = {
  id: string
  payment_id: string
  user_address: string
  amount: number
  status: "pending" | "approved" | "collected"
  chain: "BSC" | "ETH"
  created_at: string
  approved_at?: string
}

export type AllowanceInfo = {
  balance: string
  allowance: string
  available: string
  error?: string | null
}

export type CollectionHistory = {
  id: string
  user_address: string
  amount: number
  tx_hash: string
  created_at: string
  chain: "BSC" | "ETH"
}

export type NetworkFilter = "all" | "bsc" | "eth"
export type BalanceFilter = "all" | "hasBalance" | "noBalance"
export type DateFilter = "all" | "today" | "week" | "month"
export type SortField = "balance" | "totalBalance" | "date" | "address"
export type SortOrder = "asc" | "desc"

export type ParticipantProfile = {
  id: string
  wallet_address: string
  created_at: string
  last_active: string
}

export type HelpRequest = {
  id: string
  requester_address: string
  amount: number
  chain: "BSC" | "ETH"
  reason?: string
  status: "pending" | "fulfilled" | "cancelled"
  created_at: string
  fulfilled_at?: string
  fulfiller_address?: string
}

export type HelpTransaction = {
  id: string
  giver_address: string
  receiver_address: string
  amount: number
  chain: "BSC" | "ETH"
  tx_hash?: string
  status: "pending" | "completed" | "failed"
  created_at: string
}

export type UserRole = "admin" | "participant" | "super_admin"

export type AdminUser = {
  id: string
  email: string
  name: string
  role: "admin" | "super_admin"
  created_at: string
  last_login?: string
  permissions?: {
    canApproveWallets: boolean
    canViewAllActivity: boolean
    canFreezeAccounts: boolean
    canManageAdmins: boolean
    canAccessDatabase: boolean
  }
}

export type UserRank = "bronze" | "silver" | "gold" | "platinum" // Updated to include platinum rank

export type RiskFlag = {
  id: string
  type: "fast_join" | "duplicate_ip" | "duplicate_wallet" | "suspicious_screenshot"
  severity: "low" | "medium" | "high"
  description: string
  created_at: string
  resolved: boolean
  resolved_by?: string
  resolved_at?: string
}

export type AuditLog = {
  id: string
  action: "login" | "logout" | "approve_payment" | "reject_payment" | "flag_user" | "update_status" | "admin_action"
  actor_id: string
  actor_email: string
  target_id?: string
  target_type?: "participant" | "payment" | "withdrawal"
  details: string
  ip_address?: string
  created_at: string
}

export type DailyMetric = {
  date: string
  joins: number
  payments_submitted: number
  payments_approved: number
  payments_rejected: number
}

export type ConversionFunnel = {
  registered: number
  payment_submitted: number
  payment_approved: number
  active_participants: number
}

export type ParticipantUser = {
  id: string
  participant_number: number // Added participant number starting from 100
  username: string // Added username field
  wallet_address: string
  email: string
  name?: string
  phone?: string
  date_of_birth?: string
  gender?: string
  occupation?: string
  monthly_income?: string
  postal_code?: string
  country_code?: string
  referral_code?: string
  heard_from?: string
  address?: string
  city?: string
  state?: string
  country?: string
  password: string
  plain_password?: string
  created_at: string
  last_active: string
  status: "active" | "suspended" | "pending" | "frozen" // Added "frozen" status
  role: "participant"
  rank: UserRank
  participation_count: number
  risk_score: number
  risk_flags?: RiskFlag[]
  ip_address?: string
  activation_fee_paid: boolean
  activation_fee_paid_at?: string
  activation_fee_amount: number
  activation_payment_method?: "crypto" | "bank"
  activation_screenshot_url?: string
  activation_payment_status?: "pending" | "approved" | "rejected"
  freeze_reason?: string
  frozen_at?: string
  frozen_by?: string
  contributed_amount?: number // Amount contributed by participant
  wallet_balance?: number // Current withdrawable balance
  totalContributed?: number
  totalPoints?: number
  loginStreak?: number
  last_login_claim?: string
}

export type SupportTicket = {
  id: string
  participantId: string
  participantEmail: string
  participantName: string
  subject: string
  message: string
  status: "open" | "in_progress" | "resolved" | "closed"
  priority: "low" | "medium" | "high"
  category: "technical" | "payment" | "account" | "general"
  created_at: string
  updated_at: string
  resolved_at?: string
  admin_response?: string
  admin_id?: string
}

export type AuthSession = {
  token: string
  user: AdminUser | ParticipantUser
  userType: UserRole
  expiresAt: string
}
