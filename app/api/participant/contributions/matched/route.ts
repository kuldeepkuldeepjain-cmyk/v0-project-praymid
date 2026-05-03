import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const email = request.nextUrl.searchParams.get("email")
    if (!email) return NextResponse.json({ matched: false, error: "email required" }, { status: 400 })

    const contributions = await sql`
      SELECT id, amount, status, created_at, matched_payout_id, participant_id
      FROM payment_submissions
      WHERE participant_email = ${email}
        AND status IN ('in_process','proof_submitted')
        AND matched_payout_id IS NOT NULL
      ORDER BY created_at DESC LIMIT 1
    `
    const contribution = contributions[0]

    if (!contribution) {
      const pending = await sql`
        SELECT id, created_at FROM payment_submissions
        WHERE participant_email = ${email}
          AND status IN ('pending','request_pending')
          AND matched_payout_id IS NULL
        ORDER BY created_at DESC LIMIT 1
      `
      return NextResponse.json({ matched: false, pending: pending.length > 0, pendingCreatedAt: pending[0]?.created_at ?? null })
    }

    const payouts = await sql`
      SELECT id, amount, status, wallet_address, participant_id, participant_email, serial_number
      FROM payout_requests WHERE id = ${contribution.matched_payout_id} LIMIT 1
    `
    const payout = payouts[0]
    if (!payout) return NextResponse.json({ matched: false, error: "payout row not found" }, { status: 404 })

    let recipient: any = null
    if (payout.participant_id) {
      const rows = await sql`SELECT id, full_name, mobile_number, bep20_address, wallet_address, email FROM participants WHERE id = ${payout.participant_id} LIMIT 1`
      recipient = rows[0] || null
    }
    if (!recipient && payout.participant_email) {
      const rows = await sql`SELECT id, full_name, mobile_number, bep20_address, wallet_address, email FROM participants WHERE email = ${payout.participant_email} LIMIT 1`
      recipient = rows[0] || null
    }

    return NextResponse.json({
      matched: true,
      contribution: { id: contribution.id, amount: contribution.amount, status: contribution.status, created_at: contribution.created_at },
      payout: { ...payout, participants: recipient },
    })
  } catch (err: any) {
    return NextResponse.json({ matched: false, error: String(err) }, { status: 500 })
  }
}
