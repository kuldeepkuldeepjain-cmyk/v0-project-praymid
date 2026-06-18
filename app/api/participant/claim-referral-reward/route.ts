import { NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })

    const rows = await query(
      "SELECT referral_earnings FROM participants WHERE email = $1",
      [email]
    )

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
    }

    const participant = rows[0]
    const pendingEarnings = Number(participant.referral_earnings) || 0
    if (pendingEarnings <= 0) {
      return NextResponse.json({ success: false, error: "No pending referral earnings to claim" }, { status: 400 })
    }

    const partData = await query("SELECT account_balance FROM participants WHERE email = $1", [email])
    if (!partData || partData.length === 0) {
      return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
    }

    const participant2 = partData[0]
    const newBalance = Number(participant2.account_balance || 0) + pendingEarnings

    await execute("UPDATE participants SET account_balance = $1, referral_earnings = 0 WHERE email = $2", [newBalance, email])

    await execute(
      "INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after) VALUES ($1, 'credit', $2, $3, $4, $5)",
      [email, pendingEarnings, "Referral earnings claimed", Number(participant2.account_balance || 0), newBalance]
    )

    return NextResponse.json({ success: true, amount: pendingEarnings, newBalance })
  } catch (error) {
    console.error("[v0] Claim referral reward error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
