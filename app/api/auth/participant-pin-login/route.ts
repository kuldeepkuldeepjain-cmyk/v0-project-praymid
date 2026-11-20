import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { queryOne } from "@/lib/db"
import { startParticipantLogin } from "@/lib/session"
import { enforceRateLimit, getActiveRestriction, getSecurityContext } from "@/lib/security"

export async function POST(request: NextRequest) {
  try {
    const { email, mobile_number, pin } = await request.json()
    const identifier = String(email || mobile_number || "").trim().toLowerCase()
    const value = String(pin || "")
    if (!identifier || !/^\d{4,6}$/.test(value)) return NextResponse.json({ success: false, error: "Email/mobile and a valid PIN are required" }, { status: 400 })

    const context = getSecurityContext(request)
    const rate = await enforceRateLimit("login", identifier)
    if (!rate.allowed) return NextResponse.json({ success: false, error: "Too many login attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter || 60) } })

    const participant = await queryOne<{ id: string; email: string; [column: string]: any }>(
      `SELECT id, email, pin_hash, username, full_name, wallet_address, bep20_address, status, is_active,
              is_deleted, otp_verified, account_frozen, is_frozen, account_balance, bonus_balance, created_at,
              account_type, funded_breach_status
       FROM participants WHERE ${email ? "LOWER(TRIM(email)) = $1" : "mobile_number = $1 OR regexp_replace(COALESCE(mobile_number, ''), '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')"}
       LIMIT 1`,
      [identifier],
    )

    if (!participant?.pin_hash || !(await bcrypt.compare(value, participant.pin_hash))) return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    if (participant.is_deleted || participant.is_frozen || participant.account_frozen || participant.is_active === false || participant.otp_verified === false || participant.status !== "active" || await getActiveRestriction(participant.email, "login")) {
      return NextResponse.json({ success: false, error: "Account is unavailable" }, { status: 403 })
    }

    await startParticipantLogin(participant, context)
    return NextResponse.json({ success: true, participantId: participant.id, email: participant.email, username: participant.username || participant.email.split("@")[0], name: participant.full_name || participant.username || "", walletAddress: participant.wallet_address || participant.bep20_address || "", bep20_address: participant.bep20_address || participant.wallet_address || "", account_balance: Number(participant.account_balance) || 0, wallet_balance: Number(participant.account_balance) || 0, bonus_balance: Number(participant.bonus_balance) || 0, status: participant.status || "active", is_active: participant.is_active !== false, pinConfigured: true, created_at: participant.created_at, account_type: participant.account_type || "standard", funded_breach_status: participant.funded_breach_status || "clear" })
  } catch {
    return NextResponse.json({ success: false, error: "PIN login failed" }, { status: 500 })
  }
}
