import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const email = request.nextUrl.searchParams.get("email")
    if (!email) return NextResponse.json({ matched: false, error: "email required" }, { status: 400 })

    const contribs = await query(
      `SELECT id, amount, status, created_at, matched_at, matched_payout_id, participant_id
       FROM payment_submissions
       WHERE participant_email = $1 AND status IN ('in_process','proof_submitted') AND matched_payout_id IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    )
    const contribution = (contribs as any[])[0]

    if (!contribution) {
      const pending = await query(
        `SELECT id, created_at FROM payment_submissions
         WHERE participant_email = $1 AND status IN ('pending','request_pending') AND matched_payout_id IS NULL
         ORDER BY created_at DESC LIMIT 1`,
        [email]
      ) as any[]
      return NextResponse.json({ matched: false, pending: pending.length > 0, pendingCreatedAt: pending[0]?.created_at ?? null })
    }

    const payoutRows = await query(
      `SELECT pr.id, pr.amount, pr.status, pr.wallet_address, pr.payout_method,
              pr.serial_number, pr.participant_id, pr.participant_email,
              p.full_name, p.mobile_number, p.bep20_address,
              p.wallet_address AS p_wallet_address
       FROM payout_requests pr
       LEFT JOIN participants p ON p.email = pr.participant_email
       WHERE pr.id = $1`,
      [contribution.matched_payout_id]
    ) as any[]
    const payoutRow = payoutRows[0]
    if (!payoutRow) return NextResponse.json({ matched: false, error: "payout row not found" }, { status: 404 })

    const walletAddress = payoutRow.bep20_address || payoutRow.wallet_address || payoutRow.p_wallet_address || null

    return NextResponse.json({
      matched: true,
      contribution: {
        id: contribution.id,
        amount: contribution.amount,
        status: contribution.status,
        created_at: contribution.created_at,
        matched_at: contribution.matched_at,
      },
      payout: {
        id: payoutRow.id,
        serial_number: payoutRow.serial_number,
        amount: payoutRow.amount,
        status: payoutRow.status,
        payout_method: payoutRow.payout_method,
        wallet_address: walletAddress,
        participant_email: payoutRow.participant_email,
        participant_name: payoutRow.full_name || payoutRow.participant_email,
        mobile_number: payoutRow.mobile_number || null,
      },
    })
  } catch (err: any) {
    console.error("[matched-api] unexpected error:", err)
    return NextResponse.json({ matched: false, error: String(err) }, { status: 500 })
  }
}
