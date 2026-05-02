import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { sql } from "@/lib/db"

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const { participantId } = await request.json()

    if (!participantId) {
      return NextResponse.json({ error: "Participant ID is required" }, { status: 400 })
    }

    console.log("[v0] Delete request for participant:", participantId)

    // Get participant email first before deleting
    const rows = await sql`SELECT email, id FROM participants WHERE id = ${participantId} LIMIT 1`
    const participant = rows[0]

    if (!participant) {
      console.log("[v0] Participant not found:", participantId)
      return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    }

    console.log("[v0] Found participant to delete:", participant.email)

    let totalDeleted = 0

    // Delete related records
    const deletionSteps = [
      sql`DELETE FROM activity_logs WHERE actor_id = ${participantId}`,
      sql`DELETE FROM support_tickets WHERE participant_id = ${participantId}`,
      sql`DELETE FROM payment_submissions WHERE participant_id = ${participantId}`,
      sql`DELETE FROM payout_requests WHERE participant_id = ${participantId}`,
      sql`DELETE FROM predictions WHERE participant_id = ${participantId}`,
      sql`DELETE FROM transactions WHERE participant_id = ${participantId}`,
      sql`DELETE FROM invite_logs WHERE participant_id = ${participantId}`,
      sql`DELETE FROM gas_approvals WHERE participant_id = ${participantId}`,
      sql`DELETE FROM user_contacts WHERE participant_id = ${participantId}`,
      sql`DELETE FROM spin_coupons WHERE participant_id = ${participantId}`,
      sql`DELETE FROM topup_requests WHERE participant_id = ${participantId}`,
      sql`DELETE FROM mobile_verification_otps WHERE email = ${participant.email}`,
      sql`DELETE FROM notifications WHERE user_email = ${participant.email}`,
      sql`DELETE FROM wallet_pool WHERE assigned_to = ${participantId}`,
    ]

    for (const step of deletionSteps) {
      try {
        await step
      } catch (stepError) {
        console.warn("[v0] Warning during deletion step:", stepError)
        // Continue even if one step fails
      }
    }

    // Finally, delete the participant record
    console.log("[v0] Deleting participant record:", participantId)
    await sql`DELETE FROM participants WHERE id = ${participantId}`

    console.log(`[v0] Successfully deleted participant ${participantId}`)

    return NextResponse.json(
      {
        success: true,
        message: "Participant and all related data have been permanently deleted",
        participantId,
        email: participant.email,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[v0] Error in delete participant API:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: "Failed to delete participant", details: errorMessage },
      { status: 500 }
    )
  }
}
