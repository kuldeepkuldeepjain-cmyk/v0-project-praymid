import { NextRequest, NextResponse } from "next/server"
import { withTransaction } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { getFundedBaseAmount, getFundedMinimumBalance } from "@/lib/funded-account"

export async function POST(req: NextRequest) {
  const auth = await requireParticipantSession(req)
  if (!auth.ok) return auth.response

  try {
    const { email, equity } = await req.json()
    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ success: false, error: "Missing email" }, { status: 400 })
    }
    if (auth.email.toLowerCase() !== email.trim().toLowerCase()) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    return await withTransaction(async (client) => {
      const { rows: [account] } = await client.query(
        `SELECT id, account_type, account_balance, funded_amount, funded_initial_balance, funded_breach_status
         FROM participants WHERE id = $1 FOR UPDATE`,
        [auth.participantId],
      )
      if (!account) return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
      if (account.account_type !== "funded") {
        return NextResponse.json({ success: false, error: "No funded plan is active for this account." }, { status: 409 })
      }

      const balanceBefore = Number(account.account_balance) || 0
      const alreadyBreached = account.funded_breach_status === "breached"
      const initialBalance = Number(account.funded_initial_balance) || getFundedBaseAmount(balanceBefore, account.funded_amount)
      const breachFloor = getFundedMinimumBalance(initialBalance)
      const reportedEquity = typeof equity === "number" && Number.isFinite(equity) ? equity : null
      if (!alreadyBreached && (reportedEquity === null || reportedEquity > breachFloor)) {
        return NextResponse.json({ success: false, error: "The maximum drawdown limit has not been reached." }, { status: 409 })
      }

      await client.query(
        `UPDATE participants SET account_balance = 0, funded_breach_status = 'breached',
           funded_breach_at = COALESCE(funded_breach_at, NOW()),
           funded_breach_balance = 0,
           funded_breach_equity = COALESCE(funded_breach_equity, $2::numeric),
           updated_at = NOW()
         WHERE id = $1`,
        [account.id, reportedEquity],
      )
      await client.query(
        `UPDATE forex_trades SET status = 'cancelled', close_reason = 'manual', updated_at = NOW()
         WHERE LOWER(participant_email) = LOWER($1) AND status = 'pending'`,
        [auth.email],
      )
      if (balanceBefore !== 0) {
        await client.query(
          `INSERT INTO transactions
             (participant_id, participant_email, type, amount, description, balance_before, balance_after, status)
           VALUES ($1, $2, 'funded_drawdown_reset', $3, 'Funded balance reset to $0.00 after maximum drawdown breach', $4, 0, 'completed')`,
          [account.id, auth.email, Math.max(0, balanceBefore), balanceBefore],
        )
      }
      return NextResponse.json({ success: true, breached: true, newBalance: 0 })
    })
  } catch (error) {
    console.error("[funded-breach] Could not record funded plan breach", error)
    return NextResponse.json({ success: false, error: "Could not record funded plan breach" }, { status: 500 })
  }
}
