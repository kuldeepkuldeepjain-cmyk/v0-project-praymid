import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email")
    if (!email) {
      return NextResponse.json({ success: false, error: "Email required" }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Sum all spin wheel wins from transactions table
    const spinRows = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM transactions
       WHERE LOWER(participant_email) = $1
         AND type = 'spin_win'
         AND status = 'completed'`,
      [normalizedEmail]
    ) as any[]
    const totalSpinWins = Number(spinRows?.[0]?.total) || 0

    // Sum all prediction wins (profit_loss > 0, result = 'win' or status = 'won')
    const predRows = await query(
      `SELECT COALESCE(SUM(profit_loss), 0) AS total
       FROM predictions
       WHERE LOWER(participant_email) = $1
         AND profit_loss > 0
         AND (result = 'win' OR status = 'won')`,
      [normalizedEmail]
    ) as any[]
    const totalPredWins = Number(predRows?.[0]?.total) || 0

    const totalWinnings = totalSpinWins + totalPredWins
    const eligible = totalWinnings >= 100

    return NextResponse.json({
      success: true,
      eligible,
      totalWinnings,
      totalSpinWins,
      totalPredWins,
      requiredAmount: 100,
      remaining: eligible ? 0 : Math.max(0, 100 - totalWinnings),
    })
  } catch (err) {
    console.error("[direct-payout-eligibility] error:", err)
    return NextResponse.json({ success: false, error: "Failed to check eligibility" }, { status: 500 })
  }
}
