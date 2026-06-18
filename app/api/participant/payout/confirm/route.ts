import { getPool } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { payoutId, action, disputeReason, participantEmail } = await request.json()
    if (!payoutId || !action || !participantEmail) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }
    if (!["confirm", "dispute"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }
    const db = getPool()!
    const { rows } = await db.query(
      "SELECT id, status, amount, participant_email, participant_confirmed, dispute_status FROM payout_requests WHERE id = $1 AND participant_email = $2",
      [payoutId, participantEmail]
    )
    const payout = rows[0]
    if (!payout) return NextResponse.json({ success: false, error: "Payout not found" }, { status: 404 })
    if (payout.status !== "completed") return NextResponse.json({ success: false, error: "Can only confirm or dispute completed payouts" }, { status: 400 })
    if (payout.participant_confirmed) return NextResponse.json({ success: false, error: "Payout already confirmed", alreadyProcessed: true }, { status: 400 })
    if (payout.dispute_status === "open") return NextResponse.json({ success: false, error: "Dispute already raised", alreadyProcessed: true }, { status: 400 })

    if (action === "confirm") {
      await db.query("UPDATE payout_requests SET participant_confirmed = true, confirmed_at = NOW() WHERE id = $1", [payoutId])
      await db.query("INSERT INTO notifications (user_email, type, title, message) VALUES ($1,$2,$3,$4)",
        ["admin", "success", "Payout Confirmed by Participant", `Participant ${participantEmail} confirmed receipt of $${payout.amount} payout.`])
      return NextResponse.json({ success: true, message: "Payout receipt confirmed. Thank you!" })
    }

    if (action === "dispute") {
      if (!disputeReason || disputeReason.trim().length < 10) {
        return NextResponse.json({ success: false, error: "Please provide a reason (at least 10 characters)" }, { status: 400 })
      }
      await db.query(
        "UPDATE payout_requests SET participant_confirmed = false, dispute_reason = $1, dispute_raised_at = NOW(), dispute_status = 'open' WHERE id = $2",
        [disputeReason.trim(), payoutId]
      )
      await db.query("INSERT INTO notifications (user_email, type, title, message) VALUES ($1,$2,$3,$4)",
        ["admin", "error", "Payout Dispute Raised", `${participantEmail} raised a dispute for $${payout.amount}: "${disputeReason.trim()}"`])
      return NextResponse.json({ success: true, message: "Dispute raised successfully. Our team will review shortly." })
    }
  } catch (error: any) {
    console.error("[payout/confirm] Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}
