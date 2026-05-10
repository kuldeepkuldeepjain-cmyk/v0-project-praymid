import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { query, execute } from "@/lib/db"

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { payoutRequestId } = await request.json()
    if (!payoutRequestId) {
      return NextResponse.json({ error: "Payout Request ID is required" }, { status: 400 })
    }

    // Check if payout exists
    const rows = await query("SELECT id, status FROM payout_requests WHERE id = $1 AND is_deleted = FALSE", [payoutRequestId]) as any[]
    if (rows.length === 0) {
      return NextResponse.json({ error: "Payout request not found or already deleted" }, { status: 404 })
    }

    // Soft delete: mark as deleted instead of hard delete (prevents FK constraint issues)
    await execute(
      "UPDATE payout_requests SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1",
      [payoutRequestId]
    )

    // Also mark the contribution ledger entry as deleted
    await execute(
      "UPDATE contribution_ledger SET is_deleted = TRUE WHERE payout_id = $1",
      [payoutRequestId]
    )

    // Unlink any matched payment submissions
    await execute("UPDATE payment_submissions SET matched_payout_id = NULL, matched_at = NULL WHERE matched_payout_id = $1", [payoutRequestId])

    return NextResponse.json({ success: true, message: "Payout request deleted", payoutRequestId })
  } catch (error) {
    console.error("[delete-payout-request] Error:", error)
    return NextResponse.json({ error: "Failed to delete payout request" }, { status: 500 })
  }
}
