import { type NextRequest, NextResponse } from "next/server"
import { getPool, query } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { getFundedBaseAmount, getFundedPayoutAmount } from "@/lib/funded-account"
import { getActiveRestriction, getSecurityContext, recordSecurityEvent } from "@/lib/security"

const SUPPORTED_METHODS = ["BEP20", "TRC20", "ERC20", "DIRECT"] as const

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    const email = auth.email.toLowerCase().trim()
    const payouts = await query(
      `SELECT id, amount, status, wallet_address, created_at,
              payout_method, transaction_hash, admin_notes,
              matched_contribution_id, matched_at, processed_at,
              wallet_balance_before, wallet_balance_after
       FROM payout_requests
       WHERE LOWER(participant_email) = $1
       ORDER BY created_at DESC`,
      [email],
    )

    return NextResponse.json({ success: true, payouts })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch payout history" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const email = auth.email.toLowerCase().trim()
    const restriction = await getActiveRestriction(email, "withdrawal")
    if (restriction) {
      await recordSecurityEvent({ eventType: "withdrawal_blocked_restriction", actorType: "participant", actorEmail: email, request, riskScore: 100, metadata: { restrictionType: restriction.restrictionType } })
      return NextResponse.json({ success: false, error: "Withdrawals are temporarily held while your account is under security review." }, { status: 403 })
    }
    const amount = Number(body.amount)
    const walletAddress = String(body.bep20_address || body.wallet_address || "").trim()
    const method = String(body.payout_method || "BEP20").toUpperCase()

    if (!Number.isFinite(amount) || amount < 50 || !walletAddress) {
      return NextResponse.json({ success: false, error: "Withdrawals require a minimum amount of $50 and a valid wallet address" }, { status: 400 })
    }
    if (!SUPPORTED_METHODS.includes(method as (typeof SUPPORTED_METHODS)[number])) {
      return NextResponse.json({ success: false, error: "Unsupported payout network" }, { status: 400 })
    }

    if (method !== "DIRECT") {
      const isEvmAddress = /^(0x)[a-fA-F0-9]{40}$/.test(walletAddress)
      const isTronAddress = /^T[a-zA-Z0-9]{33}$/.test(walletAddress)
      if (method === "TRC20" ? !isTronAddress : !isEvmAddress) {
        return NextResponse.json({ success: false, error: `Invalid ${method} wallet address` }, { status: 400 })
      }
    }

    const participantRows = await query(
      `SELECT id, email, account_balance, funded_amount, account_type,
              funded_breach_status, account_frozen, is_frozen, status
       FROM participants WHERE LOWER(email) = $1 LIMIT 1`,
      [email],
    ) as any[]
    const participant = participantRows[0]
    if (!participant) return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })

    const currentBalance = Number(participant.account_balance) || 0
    if (participant.account_frozen || participant.is_frozen || participant.status === "frozen") {
      return NextResponse.json({ success: false, error: "Payouts are disabled for this account" }, { status: 403 })
    }
    if (participant.account_type === "funded" && participant.funded_breach_status === "breached") {
      return NextResponse.json({ success: false, error: "Funded account breached the fixed 2% drawdown rule. Payouts are disabled until the account is reactivated." }, { status: 403 })
    }
    if (participant.account_type === "funded") {
      const fundedBaseAmount = getFundedBaseAmount(currentBalance, participant.funded_amount)
      const maximumPayout = getFundedPayoutAmount(currentBalance, participant.funded_amount)
      if (currentBalance <= fundedBaseAmount || maximumPayout <= 0) {
        return NextResponse.json({ success: false, error: `Funded payouts are available only on profits above the $${fundedBaseAmount.toFixed(2)} funded amount.` }, { status: 400 })
      }
      if (amount > maximumPayout) {
        return NextResponse.json({ success: false, error: `The maximum funded-account payout is 80% of excess profit: $${maximumPayout.toFixed(2)}.` }, { status: 400 })
      }
    }
    if (currentBalance < amount) {
      return NextResponse.json({ success: false, error: `Insufficient balance. Available: $${currentBalance.toFixed(2)}, Requested: $${amount.toFixed(2)}` }, { status: 400 })
    }

    const pool = getPool()
    if (!pool) throw new Error("No database connection")
    const client = await pool.connect()
    const newBalance = currentBalance - amount
    let payoutId: string

    try {
      await client.query("BEGIN")
      const locked = await client.query(
        "SELECT account_balance FROM participants WHERE id = $1 FOR UPDATE",
        [participant.id],
      )
      const lockedBalance = Number(locked.rows[0]?.account_balance) || 0
      if (lockedBalance < amount) {
        throw new Error("INSUFFICIENT_BALANCE")
      }
      const lockedNewBalance = lockedBalance - amount
      await client.query(
        "UPDATE participants SET account_balance = $1, wallet_address = $2, updated_at = NOW() WHERE id = $3",
        [lockedNewBalance, walletAddress, participant.id],
      )
      const inserted = await client.query(
        `INSERT INTO payout_requests
          (participant_id, participant_email, wallet_address, amount, status,
           payout_method, wallet_balance_before, wallet_balance_after)
         VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7)
         RETURNING id`,
        [participant.id, email, walletAddress, amount, method, lockedBalance, lockedNewBalance],
      )
      payoutId = inserted.rows[0].id
      await client.query(
        `INSERT INTO withdrawal_security_holds (payout_request_id, participant_email, reason_code, risk_score)
         SELECT $1, $2, 'standard_manual_review', CASE WHEN EXISTS (
           SELECT 1 FROM participant_security_profiles WHERE LOWER(participant_email) = LOWER($2) AND risk_score >= 70
         ) THEN 70 ELSE 0 END
         WHERE EXISTS (
           SELECT 1 FROM participant_security_profiles WHERE LOWER(participant_email) = LOWER($2) AND risk_score >= 70
         )
         ON CONFLICT (payout_request_id) DO NOTHING`,
        [payoutId, email],
      )
      await client.query(
        "INSERT INTO activity_logs (actor_email, action, details, target_type) VALUES ($1, 'payout_requested', $2, 'payout_request')",
        [email, `Requested payout of $${amount.toFixed(2)} to ${walletAddress}`],
      )
      await client.query("COMMIT")
    } catch (error) {
      await client.query("ROLLBACK")
      if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json({ success: false, error: "Balance changed while submitting. Please try again." }, { status: 409 })
      }
      throw error
    } finally {
      client.release()
    }

    return NextResponse.json({ success: true, message: "Payout request submitted successfully", newBalance, requestId: payoutId })
  } catch (error) {
    console.error("[v0] Error creating payout request:", error)
    return NextResponse.json({ success: false, error: "Unable to submit payout request. Please try again." }, { status: 500 })
  }
}
