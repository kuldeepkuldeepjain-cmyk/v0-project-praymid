import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request, true)
  if (!auth.ok) return auth.response

  try {
    const db = getPool()!

    const allRes = await db.query(`SELECT id, email FROM participants`)
    const participants = allRes.rows
    if (!participants.length) return NextResponse.json({ success: true, message: "No participants to delete", deletedCount: 0 })

    const ids = participants.map((p: any) => p.id)
    const placeholders = ids.map((_: any, i: number) => `$${i + 1}`).join(",")

    const tables = [
      { table: "transactions", col: "participant_id" },
      { table: "payment_submissions", col: "participant_id" },
      { table: "payout_requests", col: "participant_id" },
      { table: "predictions", col: "participant_id" },
      { table: "topup_requests", col: "participant_id" },
      { table: "wallet_pool", col: "assigned_to" },
    ]

    for (const { table, col } of tables) {
      await db.query(`DELETE FROM ${table} WHERE ${col} IN (${placeholders})`, ids).catch(() => {})
    }

    await db.query(`DELETE FROM notifications`).catch(() => {})
    await db.query(`DELETE FROM activity_logs`).catch(() => {})

    const deleted = await db.query(`DELETE FROM participants RETURNING id`)

    return NextResponse.json({ success: true, message: `Deleted all participants`, deletedParticipants: deleted.rowCount })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
