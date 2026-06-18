import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request, true)
  if (!auth.ok) return auth.response

  try {
    const db = getPool()!

    const allRes = await db.query("SELECT id, email FROM participants")
    const participants = allRes.rows
    if (!participants.length) {
      return NextResponse.json({ success: true, message: "No participants to delete", deletedParticipants: 0 })
    }

    const ids = participants.map((p: any) => p.id)
    const ph = ids.map((_: any, i: number) => `$${i + 1}`).join(",")

    const byId = [
      "transactions", "payment_submissions", "payout_requests", "predictions",
      "topup_requests", "contribution_ledger", "gas_approvals",
      "invite_logs", "spin_coupons", "support_tickets",
    ]
    for (const table of byId) {
      await db.query(`DELETE FROM ${table} WHERE participant_id IN (${ph})`, ids).catch(() => {})
    }

    // wallet_pool uses assigned_to column
    await db.query(`UPDATE wallet_pool SET assigned_to = NULL WHERE assigned_to IN (${ph})`, ids).catch(() => {})

    // Clear shared tables with no participant_id FK
    await db.query("DELETE FROM notifications").catch(() => {})
    await db.query("DELETE FROM activity_logs").catch(() => {})

    const deleted = await db.query("DELETE FROM participants RETURNING id")

    return NextResponse.json({
      success: true,
      message: "All participants and related data permanently deleted",
      deletedParticipants: deleted.rowCount,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
