import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { queryOne } from "@/lib/db"
import { setParticipantSession } from "@/lib/session"

export async function POST(request: NextRequest) {
  try {
    const { email, mobile_number, pin } = await request.json()
    const identifier = String(email || mobile_number || "").trim().toLowerCase()
    const value = String(pin || "")
    if (!identifier || !/^\d{4,6}$/.test(value)) return NextResponse.json({ success: false, error: "Email/mobile and a valid PIN are required" }, { status: 400 })

    await queryOne("SELECT 1 FROM participants LIMIT 1")
    const participant = email
      ? await queryOne<any>("SELECT id, email, pin_hash, username, full_name, wallet_address, bep20_address, status, is_active, account_balance, bonus_balance, created_at FROM participants WHERE LOWER(email) = $1 LIMIT 1", [identifier])
      : await queryOne<any>("SELECT id, email, pin_hash, username, full_name, wallet_address, bep20_address, status, is_active, account_balance, bonus_balance, created_at FROM participants WHERE mobile_number = $1 OR regexp_replace(COALESCE(mobile_number, ''), '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g') LIMIT 1", [String(mobile_number).trim()])

    if (!participant?.pin_hash || !(await bcrypt.compare(value, participant.pin_hash))) return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    if (participant.is_active === false || participant.status === "suspended" || participant.status === "frozen") return NextResponse.json({ success: false, error: "Account is unavailable" }, { status: 403 })

    await setParticipantSession({ participantId: participant.id, email: participant.email, role: "participant", sessionId: crypto.randomUUID(), lastActivityAt: Date.now() })
    return NextResponse.json({ success: true, participantId: participant.id, email: participant.email, username: participant.username || participant.email.split("@")[0], name: participant.full_name || participant.username || "", walletAddress: participant.wallet_address || participant.bep20_address || "", bep20_address: participant.bep20_address || participant.wallet_address || "", account_balance: Number(participant.account_balance) || 0, wallet_balance: Number(participant.account_balance) || 0, bonus_balance: Number(participant.bonus_balance) || 0, status: participant.status || "active", is_active: participant.is_active !== false, pinConfigured: true, created_at: participant.created_at })
  } catch {
    return NextResponse.json({ success: false, error: "PIN login failed" }, { status: 500 })
  }
}
