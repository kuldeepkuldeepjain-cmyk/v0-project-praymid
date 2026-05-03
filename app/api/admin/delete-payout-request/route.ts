import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { sql } from "@/lib/db"

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { payoutRequestId } = await request.json()

    if (!payoutRequestId) {
      return NextResponse.json({ error: "Payout Request ID is required" }, { status: 400 })
    }

    // Get payout request details first
    const rows = await sql`
      SELECT id, serial_number, amount, participant_email, status
      FROM payout_requests
      WHERE id = ${payoutRequestId}
      LIMIT 1
    `
    const payoutRequest = rows[0]

    if (!payoutRequest) {
      return NextResponse.json({ error: "Payout request not found" }, { status: 404 })
    }

    // STEP 1: Unlink this payout from any matched payment submissions
    await sql`
      UPDATE payment_submissions
      SET matched_payout_id = NULL, matched_at = NULL
      WHERE matched_payout_id = ${payoutRequestId}
    `

    // STEP 2: Delete the payout request
    await sql`DELETE FROM payout_requests WHERE id = ${payoutRequestId}`

    return NextResponse.json(
      {
        success: true,
        message: "Payout request has been permanently deleted",
        payoutRequestId,
        serialNumber: payoutRequest.serial_number,
        amount: payoutRequest.amount,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error in delete payout request API:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: "Failed to delete payout request", details: errorMessage },
      { status: 500 }
    )
  }
}
