import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { getPool } from "@/lib/db"

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const { participantId } = await request.json()
    if (!participantId) {
      return NextResponse.json({ error: "Participant ID is required" }, { status: 400 })
    }

    const db = getPool()!

    const res = await db.query("SELECT id, email FROM participants WHERE id = $1", [participantId])
    if (!res.rows.length) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    }
    const { email } = res.rows[0]

    // Hard delete from ALL related tables
    const relatedTables = [
      { table: "transactions",        col: "participant_id" },
      { table: "transactions",        col: "participant_email", isEmail: true },
      { table: "payment_submissions", col: "participant_id" },
      { table: "payout_requests",     col: "participant_id" },
      { table: "predictions",         col: "participant_id" },
      { table: "topup_requests",      col: "participant_id" },
      { table: "contribution_ledger", col: "participant_id" },
      { table: "gas_approvals",       col: "participant_id" },
      { table: "invite_logs",         col: "participant_id" },
      { table: "spin_coupons",        col: "participant_id" },
      { table: "support_tickets",     col: "participant_id" },
      { table: "wallet_pool",         col: "assigned_to" },
    ]

    for (const { table, col, isEmail } of relatedTables) {
      const val = isEmail ? email : participantId
      await db.query(`DELETE FROM ${table} WHERE ${col} = $1`, [val]).catch(() => {})
    }

    // Hard delete the participant itself
    await db.query("DELETE FROM participants WHERE id = $1", [participantId])

    return NextResponse.json({
      success: true,
      message: `Participant ${email} and all related data permanently deleted`,
      participantId,
      email,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete participant", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
