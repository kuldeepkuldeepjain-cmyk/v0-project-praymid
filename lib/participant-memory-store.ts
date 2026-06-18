// Shared in-memory participant store — fallback when Supabase DB is unreachable (e.g. v0 preview sandbox)
// On VPS with real DB connectivity, Supabase is used instead. This store persists across hot reloads via globalThis.

export interface MemoryParticipant {
  id: string
  email: string
  username: string
  full_name: string
  password: string        // bcrypt hash
  plain_password: string
  mobile_number: string
  wallet_address: string
  referral_code: string
  referred_by: string | null
  country: string
  state: string
  pin_code: string
  country_code: string
  account_balance: number
  bonus_balance: number
  total_earnings: number
  total_referrals: number
  status: string
  rank: string
  is_active: boolean
  details_completed: boolean
  created_at: string
}

declare global {
  // eslint-disable-next-line no-var
  var __participantMemoryStore: Map<string, MemoryParticipant> | undefined
}

// Keyed by email (lowercase)
export const participantMemoryStore: Map<string, MemoryParticipant> =
  globalThis.__participantMemoryStore ?? (globalThis.__participantMemoryStore = new Map())
