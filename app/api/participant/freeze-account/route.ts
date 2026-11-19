import { NextRequest, NextResponse } from "next/server"
import { execute, getPool, query } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { getFundedBaseAmount, getFundedMinimumBalance } from "@/lib/funded-account"

export async function POST(req: NextRequest) {
  const auth = await requireParticipantSession(req)
  if (!auth.ok) return auth.response

  try {
    const { email, equity: requestedEquity } = await req.json()
    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ success: false, error: "Missing email" }, { status: 400 })
    }
    if (auth.email.toLowerCase() !== email.trim().toLowerCase()) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const participants = await query(
      "SELECT id, account_type, account_balance, funded_amount, funded_initial_balance, funded_breach_status FROM participants WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [email.trim()],
    ) as Array<{ id: string; account_type?: string; account_balance?: number; funded_amount?: number; funded_initial_balance?: number; funded_breach_status?: string }>
    const participant = participants[0]
    if (!participant) return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })

    if (participant.account_type === "funded") {
      const db = getPool()
      if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 500 })
      const client = await db.connect()
      try {
        await client.query("BEGIN")
        const accountResult = await client.query(
          `SELECT id, account_balance, funded_amount, funded_initial_balance, funded_breach_status
           FROM participants WHERE id = $1 FOR UPDATE`,
          [participant.id],
        )
        const account = accountResult.rows[0]
        if (!account) throw Object.assign(new Error("Participant not found"), { status: 404 })

        const balanceBefore = Number(account.account_balance) || 0
        const alreadyBreached = account.funded_breach_status === "breached"
        const initialBalance = Number(account.funded_initial_balance) || getFundedBaseAmount(balanceBefore, account.funded_amount)
        const breachFloor = getFundedMinimumBalance(initialBalance)
        const equity = Number(requestedEquity)
        if (!alreadyBreached && (!Number.isFinite(equity) || equity > breachFloor)) {
          throw Object.assign(new Error("The 3% maximum drawdown limit has not been reached."), { status: 409 })
        }

        await client.query(
          `UPDATE participants SET account_balance = 0, account_frozen = TRUE, is_frozen = TRUE,
             status = 'frozen', funded_breach_status = 'breached',
             funded_breach_at = COALESCE(funded_breach_at, NOW()),
             funded_breach_balance = 0,
             funded_breach_equity = CASE WHEN $2::numeric IS NULL THEN funded_breach_equity ELSE $2 END,
             updated_at = NOW()
           WHERE id = $1`,
          [account.id, Number.isFinite(equity) ? equity : null],
        )
        await client.query(
          `UPDATE forex_trades SET status = 'cancelled', close_reason = 'manual', updated_at = NOW()
           WHERE LOWER(participant_email) = LOWER($1) AND status = 'pending'`,
          [email.trim()],
        )
        if (balanceBefore !== 0) {
          await client.query(
            `INSERT INTO transactions
               (participant_id, participant_email, type, amount, description, balance_before, balance_after, status)
             VALUES ($1, $2, 'funded_drawdown_reset', $3, 'Funded balance reset to $0.00 after maximum drawdown breach', $4, 0, 'completed')`,
            [account.id, email.trim(), Math.max(0, balanceBefore), balanceBefore],
          )
        }
        await client.query("COMMIT")
        return NextResponse.json({ success: true, breached: true, newBalance: 0 })
      } catch (error) {
        await client.query("ROLLBACK")
        const status = Number((error as { status?: unknown })?.status)
        if (status >= 400 && status <= 599) {
          return NextResponse.json({ success: false, error: (error as Error).message }, { status })
        }
        throw error
      } finally {
        client.release()
      }
    }

    await execute(
      `UPDATE participants SET account_frozen = true, is_frozen = true, status = $1, updated_at = NOW() WHERE id = $2`,
      ["frozen", participant.id],
    )
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
