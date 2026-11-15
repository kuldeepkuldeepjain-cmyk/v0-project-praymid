import { NextRequest, NextResponse } from "next/server"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { withTransaction } from "@/lib/db"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    const result = await withTransaction(async (client) => {
      const accountResult = await client.query(
        `SELECT id, email, account_type, account_balance, bonus_balance, account_frozen, is_frozen, status
         FROM participants WHERE id = $1 FOR UPDATE`,
        [auth.participantId],
      )
      const account = accountResult.rows[0]
      if (!account) return { status: 404, message: "Participant not found." }
      if (account.account_type === "funded") return { status: 409, message: "This is already a Funded account." }
      if (account.account_type !== "normal") {
        return { status: 409, message: "Only a Normal account can switch directly to Funded." }
      }
      if (account.account_frozen || account.is_frozen || account.status === "frozen") {
        return { status: 409, message: "Resolve your account restriction before switching to Funded." }
      }
      if (account.account_balance == null || Number(account.account_balance) !== 0 || Number(account.bonus_balance || 0) !== 0) {
        return { status: 409, message: "Your available and bonus balances must both be $0.00 before switching to Funded." }
      }

      const trades = await client.query(
        `SELECT 1 FROM forex_trades WHERE LOWER(participant_email) = LOWER($1) AND status IN ('open', 'pending') LIMIT 1`,
        [account.email],
      )
      const payments = await client.query(
        `SELECT 1 FROM topup_requests WHERE (participant_id = $1 OR LOWER(participant_email) = LOWER($2))
         AND LOWER(status) IN ('pending', 'pending_collection', 'processing') LIMIT 1`,
        [account.id, account.email],
      )
      const payouts = await client.query(
        `SELECT 1 FROM payout_requests WHERE (participant_id = $1 OR LOWER(participant_email) = LOWER($2))
         AND LOWER(status) IN ('pending', 'processing') LIMIT 1`,
        [account.id, account.email],
      )
      if (trades.rowCount || payments.rowCount || payouts.rowCount) {
        return { status: 409, message: "Close open orders and wait for pending deposits or payouts to finish before switching." }
      }

      const updated = await client.query(
        `UPDATE participants SET account_type = 'funded', funded_amount = NULL,
           funded_initial_balance = NULL, funded_breach_status = 'clear',
           challenge_status = NULL, challenge_plan_key = NULL, updated_at = NOW()
         WHERE id = $1 AND account_type = 'normal'
           AND account_balance = 0 AND COALESCE(bonus_balance, 0) = 0
         RETURNING id, account_type, account_balance, bonus_balance, funded_amount,
           funded_initial_balance, funded_breach_status`,
        [account.id],
      )
      if (!updated.rows[0]) return { status: 409, message: "Your account balance changed. Refresh and try again." }
      return { status: 200, participant: updated.rows[0] }
    })

    if ("message" in result) {
      return NextResponse.json({ success: false, message: result.message }, { status: result.status, headers: { "Cache-Control": "private, no-store" } })
    }
    return NextResponse.json({ success: true, participant: result.participant }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    console.error("Funded conversion error:", error)
    return NextResponse.json({ success: false, message: "Unable to switch accounts right now. Please try again." }, { status: 500 })
  }
}
