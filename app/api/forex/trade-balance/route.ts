import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { isFundedDrawdownBreached } from "@/lib/funded-account"

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
        "SELECT id, account_balance, account_type, funded_initial_balance, funded_breach_status, account_frozen, is_frozen FROM participants WHERE email = $1 FOR UPDATE",
        [email]
      )
      if (!rows.length) {
        await client.query("ROLLBACK")
        return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
      }

      const participantId: string = rows[0].id
      const currentBalance: number = parseFloat(rows[0].account_balance) || 0
      const isMarginLock = typeof description === "string" && description.startsWith("Margin locked")
      const alreadyBreached = rows[0].funded_breach_status === "breached"
      if (rows[0].account_type !== "funded" && (rows[0].account_frozen || rows[0].is_frozen) && delta < 0 && isMarginLock) {
        await client.query("ROLLBACK")
        return NextResponse.json({ success: false, error: "Account is frozen" }, { status: 403 })
      }
      // A funded account that already breached the fixed 2% drawdown rule may
      // never open new positions again — there is no recovery after breach.
  if (rows[0].account_type === "funded" && alreadyBreached && delta < 0 && isMarginLock) {
    await client.query("ROLLBACK")
    return NextResponse.json({ success: false, error: "Funded account breached the fixed 2% drawdown rule. Trading activity is disabled until the account is reactivated." }, { status: 403 })
  }

      const newBalance = parseFloat((currentBalance + delta).toFixed(2))
      const fundedInitial = Number(rows[0].funded_initial_balance) || 0
      const committedResult = await client.query(
        `SELECT COALESCE(SUM(margin), 0) AS committed_funds
         FROM forex_trades
         WHERE participant_email = $1 AND status = 'open'`,
        [email]
      )
      const existingCommittedFunds = Number(committedResult.rows[0]?.committed_funds) || 0
      // Locking margin moves cash into an open position; it is still part of
      // total equity and must not trigger a breach by itself.
      const marginBeingCommitted = isMarginLock && delta < 0 ? Math.abs(delta) : 0
      const totalEquity = newBalance + existingCommittedFunds + marginBeingCommitted
      const fundedBreach = !alreadyBreached && isFundedDrawdownBreached(rows[0].account_type, fundedInitial, newBalance, existingCommittedFunds + marginBeingCommitted)

      if (newBalance < 0) {
        await client.query("ROLLBACK")
        return NextResponse.json({
          success: false,
          error: "Insufficient balance",
          currentBalance,
        }, { status: 400 })
      }

      await client.query(
  `UPDATE participants SET account_balance = $1,
     funded_breach_status = CASE WHEN $3 AND COALESCE(funded_breach_status, 'clear') <> 'breached' THEN 'breached' ELSE funded_breach_status END,
     funded_breach_at = CASE WHEN $3 AND COALESCE(funded_breach_status, 'clear') <> 'breached' THEN NOW() ELSE funded_breach_at END,
     funded_breach_balance = CASE WHEN $3 AND COALESCE(funded_breach_status, 'clear') <> 'breached' THEN $1 ELSE funded_breach_balance END,
     funded_breach_equity = CASE WHEN $3 AND COALESCE(funded_breach_status, 'clear') <> 'breached' THEN $4 ELSE funded_breach_equity END
   WHERE id = $2`,
  [newBalance, participantId, fundedBreach, totalEquity]
  )

      if (fundedBreach) {
        // No recovery after breach: cancel every not-yet-triggered pending
        // limit/stop order so no further exposure can be taken on.
        await client.query(
          `UPDATE forex_trades SET status = 'cancelled', close_reason = 'funded_drawdown_breach', updated_at = NOW()
           WHERE participant_email = $1 AND status = 'pending'`,
          [email]
        )
      }

      // The balance and its audit entry must commit together. A failed ledger
      // insert rolls back the balance update instead of silently losing history.
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
