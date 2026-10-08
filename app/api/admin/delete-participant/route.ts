import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { getPool } from "@/lib/db"

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const { participantId, clearParticipation = false } = await request.json()
    if (!participantId) {
      return NextResponse.json({ error: "Participant ID is required" }, { status: 400 })
    }

    const db = getPool()!

    // Admin deletion intentionally applies to every account state, including frozen participants.
    const res = await db.query("SELECT id, email FROM participants WHERE id = $1", [participantId])
    if (!res.rows.length) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    }
    const { email } = res.rows[0]

    if (clearParticipation) {
      try {
        const result = await db.query(
          "DELETE FROM forex_trades WHERE participant_id = $1 OR LOWER(participant_email) = LOWER($2)",
          [participantId, email],
        )
        return NextResponse.json({ success: true, clearedTrades: result.rowCount ?? 0, participantId, email })
      } catch (error: any) {
        if (error?.code === "42P01") return NextResponse.json({ success: true, clearedTrades: 0, participantId, email })
        throw error
      }
    }

    const client = await db.connect()
    try {
      await client.query("BEGIN")

      // Remove every dependent participation record before the participant row.
      // Keep this in one transaction so a partial cleanup can never be committed.
      const relatedTables = [
        { table: "forex_trades", col: "participant_id" },
        { table: "forex_trades", col: "participant_email", isEmail: true },
        { table: "transactions", col: "participant_id" },
        { table: "transactions", col: "participant_email", isEmail: true },
        { table: "payment_submissions", col: "participant_id" },
        { table: "payout_requests", col: "participant_id" },
        { table: "predictions", col: "participant_id" },
        { table: "topup_requests", col: "participant_id" },
        { table: "contribution_ledger", col: "participant_id" },
        { table: "gas_approvals", col: "participant_id" },
        { table: "invite_logs", col: "participant_id" },
        { table: "spin_coupons", col: "participant_id" },
        { table: "support_tickets", col: "participant_id" },
        { table: "wallet_pool", col: "assigned_to" },
      ]

      for (const { table, col, isEmail } of relatedTables) {
        const val = isEmail ? email : participantId
        try {
          await client.query(`DELETE FROM ${table} WHERE ${col} = $1`, [val])
        } catch (tableError: any) {
          // Optional legacy tables may not exist in every deployment.
          if (tableError?.code !== "42P01" && tableError?.code !== "42703") throw tableError
        }
      }

      await client.query("DELETE FROM participants WHERE id = $1", [participantId])
      await client.query("COMMIT")
    } catch (transactionError) {
      await client.query("ROLLBACK")
      throw transactionError
    } finally {
      client.release()
    }

    return NextResponse.json({
      success: true,
      message: `Participant ${email} and all related data permanently deleted`,
      participantId,
      email,
    })
  } catch (error) {
    console.error("[v0] Admin participant deletion failed:", error)
    return NextResponse.json(
      { error: "Unable to complete this account action. Please try clearing participation first." },
      { status: 500 }
    )
  }
}
