import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

/**
 * POST /api/forex/trade-balance
 *
 * Atomically adjusts the participant's account_balance and writes a
 * transaction ledger entry.
 *
 * Body: { email: string, delta: number, description: string }
 *   delta > 0  → credit (e.g. trade closed, margin returned + profit)
 *   delta < 0  → debit  (e.g. margin locked on trade open)
 *
 * Returns: { success: true, newBalance: number }
 */
export async function POST(req: NextRequest) {
  const auth = await requireParticipantSession(req)
  if (!auth.ok) return auth.response

  try {
    const { email, delta, description } = await req.json()

    if (!email || typeof delta !== "number" || !isFinite(delta)) {
      return NextResponse.json({ success: false, error: "Missing or invalid fields" }, { status: 400 })
    }

    // delta = 0 is valid (breakeven trade — no balance change needed, skip DB write)
    if (delta === 0) {
      const db = getPool()
      const { rows } = await db!.query("SELECT account_balance FROM participants WHERE email = $1", [email])
      const bal = parseFloat(rows[0]?.account_balance) || 0
      return NextResponse.json({ success: true, newBalance: bal })
    }

    // Only allow the authenticated participant to adjust their own balance
    if (auth.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const db = getPool()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 500 })

    // Atomic read-modify-write inside a transaction
    const client = await db.connect()
    try {
      await client.query("BEGIN")

      const { rows } = await client.query(
        "SELECT id, account_balance FROM participants WHERE email = $1 FOR UPDATE",
        [email]
      )
      if (!rows.length) {
        await client.query("ROLLBACK")
        return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
      }

      const participantId: string = rows[0].id
      const currentBalance: number = parseFloat(rows[0].account_balance) || 0
      const newBalance = parseFloat((currentBalance + delta).toFixed(2))

      if (newBalance < 0) {
        await client.query("ROLLBACK")
        return NextResponse.json({
          success: false,
          error: "Insufficient balance",
          currentBalance,
        }, { status: 400 })
      }

      await client.query(
        "UPDATE participants SET account_balance = $1 WHERE id = $2",
        [newBalance, participantId]
      )

      // Write transaction ledger entry
      try {
        await client.query(
          `INSERT INTO transactions
             (participant_id, participant_email, type, amount, description, balance_before, balance_after, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed')`,
          [
            participantId,
            email,
            delta < 0 ? "forex_pnl_loss" : "forex_pnl_profit",
            Math.abs(delta),
            description || (delta < 0 ? "Forex trade loss" : "Forex trade profit"),
            currentBalance,
            newBalance,
          ]
        )
      } catch {
        // Ledger write failure is non-fatal — balance update takes priority
      }

      await client.query("COMMIT")
      return NextResponse.json({ success: true, newBalance })
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    } finally {
      client.release()
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
