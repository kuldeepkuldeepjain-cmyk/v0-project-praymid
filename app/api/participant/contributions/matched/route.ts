import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const email = request.nextUrl.searchParams.get("email")
    if (!email) return NextResponse.json({ matched: false, error: "email required" }, { status: 400 })

    const db = getPool()!
    const { rows: contribs } = await db.query(
      `SELECT id, amount, status, created_at, matched_payout_id, participant_id
       FROM payment_submissions
       WHERE participant_email = ?AND status IN ('in_process','proof_submitted') AND matched_payout_id IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    )
    const contribution = contribs[0]

    if (!contribution) {
      const { rows: pending } = await db.query(
        `SELECT id, created_at FROM payment_submissions
         WHERE participant_email = ?AND status IN ('pending','request_pending') AND matched_payout_id IS NULL
         ORDER BY created_at DESC LIMIT 1`,
        [email]
      )
      return NextResponse.json({ matched: false, pending: pending.length > 0, pendingCreatedAt: pending[0]?.created_at ?? null })
    }

    const { rows: payoutRows } = await db.query(
      "SELECT id, amount, status, wallet_address, participant_id, participant_email FROM payout_requests WHERE id = $1",
      [contribution.matched_payout_id]
    )
    const payoutRow = payoutRows[0]
    if (!payoutRow) return NextResponse.json({ matched: false, error: "payout row not found" }, { status: 404 })

    let recipient: any = null
    if (payoutRow.participant_id) {
      const { rows } = await db.query(
        "SELECT id, full_name, mobile_number, bep20_address, wallet_address, email FROM participants WHERE id = $1",
        [payoutRow.participant_id]
      )
      recipient = rows[0] || null
    }
    if (!recipient && payoutRow.participant_email) {
      const { rows } = await db.query(
        "SELECT id, full_name, mobile_number, bep20_address, wallet_address, email FROM participants WHERE email = $1",
        [payoutRow.participant_email]
      )
      recipient = rows[0] || null
    }

    return NextResponse.json({
      matched: true,
      contribution: { id: contribution.id, amount: contribution.amount, status: contribution.status, created_at: contribution.created_at },
      payout: { id: payoutRow.id, amount: payoutRow.amount, status: payoutRow.status, wallet_address: payoutRow.wallet_address, participant_email: payoutRow.participant_email, participants: recipient },
    })
  } catch (err: any) {
    console.error("[matched-api] unexpected error:", err)
    return NextResponse.json({ matched: false, error: String(err) }, { status: 500 })
  }
}
