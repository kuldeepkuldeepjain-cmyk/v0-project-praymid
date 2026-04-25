// Shared in-memory OTP store — used as fallback when Supabase DB is unreachable (e.g. v0 preview sandbox)
// On VPS with real DB connectivity, the Supabase DB is used instead.

interface OTPRecord {
  otp: string
  email: string
  expiresAt: number
  attemptCount: number
  verified: boolean
}

declare global {
  // eslint-disable-next-line no-var
  var __otpMemoryStore: Map<string, OTPRecord> | undefined
}

// Use globalThis to persist across hot reloads in dev
export const otpMemoryStore: Map<string, OTPRecord> =
  globalThis.__otpMemoryStore ?? (globalThis.__otpMemoryStore = new Map())
