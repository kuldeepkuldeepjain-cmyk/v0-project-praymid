import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const email = request.nextUrl.searchParams.get("email")
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 })

    const [contribution] = await sql`
      SELECT id, amount, status, created_at, matched_at, matched_payout_id, participant_email
      FROM payment_submissions
      WHERE participant_email = ${email}
        AND status = 'in_process'
        AND matched_payout_id IS NOT NULL
      ORDER BY matched_at DESC NULLS LAST
      LIMIT 1
    `

    if (!contribution) return NextResponse.json({ matched: false })

    const [payout] = await sql`
      SELECT pr.id, pr.participant_email, pr.amount, pr.payout_method, pr.status, pr.created_at,
             p.full_name, p.username
      FROM payout_requests pr
      LEFT JOIN participants p ON p.email = pr.participant_email
      WHERE pr.id = ${contribution.matched_payout_id}
    `

    if (!payout) return NextResponse.json({ matched: false, error: "Payout not found" }, { status: 500 })

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
        id: payout.id,
        participant_email: payout.participant_email,
        participant_name: payout.full_name || payout.username || "Unknown",
        amount: payout.amount,
        payout_method: payout.payout_method,
        status: payout.status,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message, matched: false }, { status: 500 })
  }
}
