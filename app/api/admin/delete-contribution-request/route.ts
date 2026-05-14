import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { getPool, query, execute } from "@/lib/db"

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const { contributionRequestId } = await request.json()
    if (!contributionRequestId) {
      return NextResponse.json({ success: false, error: "Contribution request ID required" }, { status: 400 })
    }

    const db = getPool()!

    // Get contribution request details
    const contRes = await db.query(
      `SELECT id, participant_email, amount, status FROM payment_submissions WHERE id = $1`,
      [contributionRequestId]
    )
    if (!contRes.rows.length) {
      return NextResponse.json({ success: false, error: "Contribution request not found" }, { status: 404 })
    }

    const contribution = contRes.rows[0]

    // Delete the contribution request
    await execute("DELETE FROM payment_submissions WHERE id = $1", [contributionRequestId])

    // Log the deletion
    await execute(
      `INSERT INTO activity_logs (actor_email, action, details, target_type) 
       VALUES ($1, 'contribution_deleted', $2, 'contribution')`,
      [auth.email, `Deleted contribution request $${contribution.amount} from ${contribution.participant_email}`]
    ).catch(() => {})

    // Notify participant
    await execute(
      `INSERT INTO notifications (user_email, type, title, message, read_status) 
       VALUES ($1, 'info', 'Contribution Request Cancelled', $2, false)`,
      [contribution.participant_email, `Your contribution request of $${contribution.amount} has been cancelled by admin.`]
    ).catch(() => {})

    return NextResponse.json({
      success: true,
      message: `Contribution request for ${contribution.participant_email} has been deleted`,
      deletedContribution: {
        email: contribution.participant_email,
        amount: contribution.amount,
        status: contribution.status,
      },
    })
  } catch (error) {
    console.error("[v0] Error deleting contribution request:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to delete contribution request" },
      { status: 500 }
    )
  }
}
