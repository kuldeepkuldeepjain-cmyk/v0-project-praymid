import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const db = getPool()!

    // Get all old pending bets (older than 24 hours or expired)
    const oldBetsRes = await db.query(
      `SELECT id, participant_email, entry_price, crypto_pair, prediction_type, amount, expiry_timestamp 
       FROM predictions 
       WHERE status = 'pending' 
       AND (expiry_timestamp IS NULL OR expiry_timestamp < NOW())
       AND created_at < NOW() - INTERVAL '24 hours'
       LIMIT 1000`,
      []
    )

    const oldBets = oldBetsRes.rows
    if (oldBets.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No old bets found",
        closedCount: 0,
        errors: []
      })
    }

    const errors: any[] = []
    let successCount = 0

    for (const bet of oldBets) {
      try {
        // Check if already settled
        const checkRes = await db.query("SELECT status FROM predictions WHERE id = $1", [bet.id])
        if (checkRes.rows[0]?.status !== "pending") {
          continue
        }

        // Mark as refunded (since it's expired)
        await db.query(
          `UPDATE predictions 
           SET status='refunded', result='refunded', profit_loss=0, target_price=entry_price, closed_at=NOW()
           WHERE id=$1`,
          [bet.id]
        )

        // Refund the amount to participant
        await db.query(
          "UPDATE participants SET account_balance = account_balance + $1 WHERE email=$2",
          [bet.amount, bet.participant_email]
        )

        successCount++
      } catch (err) {
        errors.push({
          betId: bet.id,
          error: err instanceof Error ? err.message : String(err)
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Closed ${successCount} old bets`,
      closedCount: successCount,
      totalAttempted: oldBets.length,
      errors: errors.length > 0 ? errors : []
    })
  } catch (error) {
    console.error("[v0] Error closing old bets:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 })
  }
}
