import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"
import { getFundedBaseAmount, getFundedMinimumBalance } from "@/lib/funded-account"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const participantId = typeof body.participantId === "string" ? body.participantId.trim() : ""
    const amount = Number(body.amount)

    if (!participantId) {
      return NextResponse.json({ success: false, error: "Participant ID required" }, { status: 400 })
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
      return NextResponse.json({ success: false, error: "Enter a valid fund amount between $0.01 and $1,000,000" }, { status: 400 })
    }

    const roundedAmount = Math.round(amount * 100) / 100
    const db = getPool()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 500 })

    const client = await db.connect()
    try {
      await client.query("BEGIN")

      const { rows } = await client.query(
        `SELECT id, email, account_type, account_balance, funded_amount, funded_initial_balance,
                funded_breach_status, status, is_active
         FROM participants WHERE id = $1 FOR UPDATE`,
        [participantId],
      )
      const participant = rows[0]
      if (!participant) {
        await client.query("ROLLBACK")
        return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
      }
      if (participant.account_type !== "funded") {
        await client.query("ROLLBACK")
        return NextResponse.json({ success: false, error: "Only funded accounts can be reactivated with this action" }, { status: 400 })
      }
      if (participant.funded_breach_status !== "breached") {
        await client.query("ROLLBACK")
        return NextResponse.json({ success: false, error: "This funded account has no breach to reactivate" }, { status: 409 })
      }

      const balanceBefore = Number(participant.account_balance) || 0
      const balanceAfter = Math.round((balanceBefore + roundedAmount) * 100) / 100
      const initialBalance = Number(participant.funded_initial_balance) || Number(participant.funded_amount) || 0
      const fundedBase = getFundedBaseAmount(balanceAfter, initialBalance)
      const minimumBalance = getFundedMinimumBalance(fundedBase)

      if (!initialBalance || balanceAfter < minimumBalance) {
        await client.query("ROLLBACK")
        const required = Math.max(0, minimumBalance - balanceBefore)
        return NextResponse.json({
          success: false,
          error: `Add at least $${required.toFixed(2)} to restore the account above its 2% drawdown floor`,
          requiredAmount: required,
          minimumBalance,
          balanceAfter,
        }, { status: 400 })
      }

      await client.query(
        `UPDATE participants
         SET account_balance = $1,
             status = 'active',
             is_active = TRUE,
             account_frozen = FALSE,
             is_frozen = FALSE,
             funded_breach_status = 'clear',
             funded_breach_at = NULL,
             funded_breach_balance = NULL,
             funded_breach_equity = NULL,
             updated_at = NOW()
         WHERE id = $2`,
        [balanceAfter, participantId],
      )

      await client.query(
        `INSERT INTO transactions
           (participant_id, participant_email, type, amount, description, balance_before, balance_after, status)
         VALUES ($1, $2, 'admin_funded_reactivation', $3, $4, $5, $6, 'completed')`,
        [
          participantId,
          participant.email,
          roundedAmount,
          `Admin ${auth.email} added funds and reactivated funded account`,
          balanceBefore,
          balanceAfter,
        ],
      )

      await client.query(
        `INSERT INTO audit_logs (action, description, admin_email)
         VALUES ($1, $2, $3)`,
        [
          "REACTIVATE_FUNDED_ACCOUNT",
          `Admin ${auth.email} added $${roundedAmount.toFixed(2)} and reactivated funded account ${participant.email}`,
          auth.email,
        ],
      )

      await client.query("COMMIT")
      return NextResponse.json({
        success: true,
        message: `Funded account reactivated with $${roundedAmount.toFixed(2)} added`,
        participantId,
        newBalance: balanceAfter,
        newStatus: "active",
        newIsActive: true,
        fundedBreachStatus: "clear",
      })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("[v0] Funded account reactivation failed:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to reactivate funded account" },
      { status: 500 },
    )
  }
}
