import { NextRequest, NextResponse } from "next/server"
import { withTransaction } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    const emailKey = String(email || "").trim().toLowerCase()
    if (!emailKey) return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })

    const result = await withTransaction(async (client) => {
      const rows = await client.query<any>(
        "SELECT email, account_balance, referral_earnings FROM participants WHERE LOWER(email) = $1 FOR UPDATE",
        [emailKey]
      )
      if (!rows.rows.length) return { error: "Participant not found", status: 404 as const }

      const participant = rows.rows[0]
      const pendingEarnings = Number(participant.referral_earnings) || 0
      if (pendingEarnings <= 0) return { error: "No pending referral earnings to claim", status: 400 as const }

      const balanceBefore = Number(participant.account_balance) || 0
      const newBalance = balanceBefore + pendingEarnings
      await client.query(
        "UPDATE participants SET account_balance = $1, referral_earnings = 0 WHERE LOWER(email) = $2",
        [newBalance, emailKey]
      )
      await client.query(
        "INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after) VALUES ($1, 'credit', $2, $3, $4, $5)",
        [participant.email, pendingEarnings, "Referral earnings claimed", balanceBefore, newBalance]
      )
      return { amount: pendingEarnings, newBalance }
    })

    if ("error" in result) return NextResponse.json({ success: false, error: result.error }, { status: result.status })
    return NextResponse.json({ success: true, amount: result.amount, newBalance: result.newBalance })
  } catch (error) {
    console.error("[v0] Claim referral reward error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
