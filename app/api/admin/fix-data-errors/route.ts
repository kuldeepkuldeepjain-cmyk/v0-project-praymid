import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"

interface FixResult {
  issue: string
  fixed: number
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const db = getPool()!
    const fixes: FixResult[] = []

    // 1. Fix: Add missing closed_at for settled predictions
    const closedAtRes = await db.query(
      `UPDATE predictions 
       SET closed_at = updated_at 
       WHERE status IN ('settled', 'refunded') AND closed_at IS NULL
       RETURNING id`,
      []
    )
    fixes.push({
      issue: "Missing closed_at for settled predictions",
      fixed: closedAtRes.rowCount
    })

    // 2. Fix: Set null results to 'refunded' for refunded predictions
    const resultRes = await db.query(
      `UPDATE predictions 
       SET result = 'refunded' 
       WHERE status = 'refunded' AND result IS NULL
       RETURNING id`,
      []
    )
    fixes.push({
      issue: "Missing result for refunded predictions",
      fixed: resultRes.rowCount
    })

    // 3. Fix: Set null profit_loss to 0 for refunded predictions
    const profitRes = await db.query(
      `UPDATE predictions 
       SET profit_loss = 0 
       WHERE status = 'refunded' AND profit_loss IS NULL
       RETURNING id`,
      []
    )
    fixes.push({
      issue: "Missing profit_loss for refunded predictions",
      fixed: profitRes.rowCount
    })

    // 4. Fix: Update target_price for settled predictions that don't have it
    const targetRes = await db.query(
      `UPDATE predictions 
       SET target_price = entry_price 
       WHERE status IN ('settled', 'refunded') AND target_price IS NULL
       RETURNING id`,
      []
    )
    fixes.push({
      issue: "Missing target_price for settled predictions",
      fixed: targetRes.rowCount
    })

    // 5. Fix: Refund expired pending bets
    const expiredRes = await db.query(
      `UPDATE predictions 
       SET status = 'refunded', result = 'refunded', profit_loss = 0, closed_at = NOW(), target_price = entry_price
       WHERE status = 'pending' AND expiry_timestamp < NOW()
       RETURNING id, participant_email, amount`,
      []
    )
    
    // Refund expired bets to participants
    for (const pred of expiredRes.rows) {
      try {
        await db.query(
          "UPDATE participants SET account_balance = account_balance + $1 WHERE email = $2",
          [pred.amount, pred.participant_email]
        )
      } catch (err) {
        console.error(`[v0] Failed to refund bet ${pred.id}:`, err)
      }
    }

    fixes.push({
      issue: "Expired pending predictions refunded",
      fixed: expiredRes.rowCount
    })

    // 6. Fix: Update any NULL amounts with default
    const amountRes = await db.query(
      `UPDATE predictions 
       SET amount = 10 
       WHERE amount IS NULL
       RETURNING id`,
      []
    )
    fixes.push({
      issue: "NULL amount set to default (10)",
      fixed: amountRes.rowCount
    })

    // 7. Fix: Ensure all predictions have valid participant_email
    const emailRes = await db.query(
      `SELECT COUNT(*) as orphaned 
       FROM predictions p 
       WHERE NOT EXISTS (SELECT 1 FROM participants pt WHERE pt.email = p.participant_email)`,
      []
    )
    fixes.push({
      issue: "Predictions with invalid participant_email (count only)",
      fixed: parseInt(emailRes.rows[0].orphaned) || 0
    })

    return NextResponse.json({
      success: true,
      message: "Database fixes applied",
      fixesApplied: fixes,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("[v0] Error in fix-data-errors:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 })
  }
}
