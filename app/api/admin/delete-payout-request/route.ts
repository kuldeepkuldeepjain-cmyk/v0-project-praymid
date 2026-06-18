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

    // Check if payout exists (no is_deleted filter — column may not exist)
    const rows = await query("SELECT id, status FROM payout_requests WHERE id = $1", [payoutRequestId]) as any[]
    if (rows.length === 0) {
      return NextResponse.json({ error: "Payout request not found" }, { status: 404 })
    }

    // Hard delete the payout request
    await execute("DELETE FROM payout_requests WHERE id = $1", [payoutRequestId])

    // Unlink any matched payment submissions
    await execute(
      "UPDATE payment_submissions SET matched_payout_id = NULL, matched_at = NULL WHERE matched_payout_id = $1",
      [payoutRequestId]
    ).catch(() => {})

    // Clean contribution_ledger if linked
    await execute(
      "DELETE FROM contribution_ledger WHERE payout_id = $1",
      [payoutRequestId]
    ).catch(() => {})

    return NextResponse.json({ success: true, message: "Payout request deleted", payoutRequestId })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete payout request" }, { status: 500 })
  }
}
