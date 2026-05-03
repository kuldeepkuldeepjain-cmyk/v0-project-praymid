import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { contributionId, participantEmail } = await request.json()
    if (!contributionId || !participantEmail) return NextResponse.json({ error: "Missing contributionId or participantEmail" }, { status: 400 })

    const contributions = await sql`SELECT id, status, matched_payout_id, amount FROM payment_submissions WHERE id = ${contributionId} LIMIT 1`
    const contribution = contributions[0]
    if (!contribution) return NextResponse.json({ error: "Contribution not found", success: false }, { status: 404 })
    if (contribution.matched_payout_id) return NextResponse.json({ success: true, message: "Contribution already matched", alreadyMatched: true })
    if (contribution.status !== "approved") return NextResponse.json({ success: true, message: "Contribution not yet approved, skipping", notApproved: true })

    const payouts = await sql`
      SELECT id, serial_number FROM payout_requests
      WHERE participant_email = ${participantEmail} AND status = 'pending' AND matched_contribution_id IS NULL
      ORDER BY created_at ASC LIMIT 1
    `
    if (payouts.length === 0) return NextResponse.json({ success: true, message: "No pending payout found", matched: false })

    const payout = payouts[0]
    const now = new Date().toISOString()

    await sql`UPDATE payment_submissions SET matched_payout_id = ${payout.id}, matched_at = ${now} WHERE id = ${contributionId}`
    await sql`UPDATE payout_requests SET matched_contribution_id = ${contributionId}, matched_at = ${now}, status = 'in_process' WHERE id = ${payout.id}`
    await sql`INSERT INTO notifications (user_email, type, title, message) VALUES (${participantEmail}, 'success', 'Contribution Auto-Matched', ${`Your contribution has been matched with payout #${payout.serial_number}.`})`
    await sql`INSERT INTO activity_logs (actor_email, action, target_type, details) VALUES ('system', 'auto_match_contribution', 'payment_submission', ${`Auto-matched ${contributionId} with payout #${payout.serial_number}`})`

    return NextResponse.json({ success: true, message: "Contribution auto-matched successfully", matched: true, contributionId, payoutSerialNumber: payout.serial_number, payoutId: payout.id })
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
