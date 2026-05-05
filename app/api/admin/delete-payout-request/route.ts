import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { getPool } from "@/lib/db"

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { payoutRequestId } = await request.json()
    if (!payoutRequestId) {
      return NextResponse.json({ error: "Payout Request ID is required" }, { status: 400 })
    }
    const db = getPool()!
    const res = await db.query("SELECT id FROM payout_requests WHERE id = $1", [payoutRequestId])
    if (!res.rows.length) {
      return NextResponse.json({ error: "Payout request not found" }, { status: 404 })
    }
    await db.query("UPDATE payment_submissions SET matched_payout_id = NULL, matched_at = NULL WHERE matched_payout_id = $1", [payoutRequestId])
    await db.query("DELETE FROM payout_requests WHERE id = $1", [payoutRequestId])
    return NextResponse.json({ success: true, message: "Payout request permanently deleted", payoutRequestId })
  } catch (error) {
    console.error("[v0] Error deleting payout request:", error)
    return NextResponse.json({ error: "Failed to delete payout request" }, { status: 500 })
  }
}
