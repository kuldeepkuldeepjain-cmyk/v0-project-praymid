import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { payoutId, action, disputeReason, participantEmail } = await request.json()
    if (!payoutId || !action || !participantEmail) return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    if (!["confirm", "dispute"].includes(action)) return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })

    const rows = await sql`SELECT id, status, amount, participant_email, participant_confirmed, dispute_status FROM payout_requests WHERE id = ${payoutId} AND participant_email = ${participantEmail} LIMIT 1`
    const payout = rows[0]
    if (!payout) return NextResponse.json({ success: false, error: "Payout not found" }, { status: 404 })
    if (payout.status !== "completed") return NextResponse.json({ success: false, error: "Can only confirm or dispute completed payouts" }, { status: 400 })
    if (payout.participant_confirmed === true) return NextResponse.json({ success: false, error: "Payout already confirmed", alreadyProcessed: true }, { status: 400 })
    if (payout.dispute_status === "open") return NextResponse.json({ success: false, error: "Dispute already raised", alreadyProcessed: true }, { status: 400 })

    const now = new Date().toISOString()

    if (action === "confirm") {
      await sql`UPDATE payout_requests SET participant_confirmed = true, confirmed_at = ${now} WHERE id = ${payoutId}`
      await sql`INSERT INTO notifications (user_email, type, title, message) VALUES ('admin', 'success', 'Payout Confirmed by Participant', ${`Participant ${participantEmail} confirmed receipt of $${payout.amount} payout.`})`
      return NextResponse.json({ success: true, message: "Payout receipt confirmed. Thank you!" })
    }

    if (action === "dispute") {
      if (!disputeReason || disputeReason.trim().length < 10) return NextResponse.json({ success: false, error: "Please provide a reason (at least 10 characters)" }, { status: 400 })
      await sql`UPDATE payout_requests SET participant_confirmed = false, dispute_reason = ${disputeReason.trim()}, dispute_raised_at = ${now}, dispute_status = 'open' WHERE id = ${payoutId}`
      await sql`INSERT INTO support_tickets (participant_email, subject, message, status, priority, category, reference_id) VALUES (${participantEmail}, ${`Payout Dispute — $${payout.amount} not received`}, ${disputeReason.trim()}, 'open', 'high', 'payout_dispute', ${payoutId})`
      await sql`INSERT INTO notifications (user_email, type, title, message) VALUES ('admin', 'error', 'Payout Dispute Raised', ${`${participantEmail} raised a dispute for $${payout.amount} payout.`})`
      return NextResponse.json({ success: true, message: "Dispute raised. Our team will review and contact you shortly." })
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}
