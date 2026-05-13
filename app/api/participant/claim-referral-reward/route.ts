import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })

    const db = getPool()!
    const { rows } = await db.query(
      "SELECT referral_earnings FROM participants WHERE email = $1",
      [email]
    )

    const participant = rows[0]
    if (!participant) return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })

    const pendingEarnings = Number(participant.referral_earnings) || 0
    if (pendingEarnings <= 0) {
      return NextResponse.json({ success: false, error: "No pending referral earnings to claim" }, { status: 400 })
    }

    const { rows: partData } = await db.query("SELECT account_balance FROM participants WHERE email = $1", [email])
    const participant2 = partData[0]
    const newBalance = Number(participant2.account_balance || 0) + pendingEarnings

    await db.query("UPDATE participants SET account_balance = $1, referral_earnings = 0 WHERE email = $2", [newBalance, email])

    await db.query(
      "INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after) VALUES ($1, 'credit', $2, $3, $4, $5)",
      [email, pendingEarnings, "Referral earnings claimed", Number(participant2.account_balance || 0), newBalance]
    )

    return NextResponse.json({ success: true, amount: pendingEarnings, newBalance })
  } catch (error) {
    console.error("[v0] Claim referral reward error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
