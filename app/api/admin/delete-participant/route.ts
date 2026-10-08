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

    const client = await db.connect()
    try {
      await client.query("BEGIN")

      // Discover every real foreign-key dependency instead of maintaining a
      // fragile table list that can miss newly added participation tables.
      const foreignKeys = await client.query(
        `SELECT child_ns.nspname AS schema_name, child.relname AS table_name, child_col.attname AS column_name
         FROM pg_constraint constraint_row
         JOIN pg_class parent ON parent.oid = constraint_row.confrelid
         JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
         JOIN pg_class child ON child.oid = constraint_row.conrelid
         JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
         JOIN pg_attribute child_col ON child_col.attrelid = child.oid
           AND child_col.attnum = constraint_row.conkey[1]
         WHERE constraint_row.contype = 'f'
           AND parent_ns.nspname = 'public'
           AND parent.relname = 'participants'
           AND array_length(constraint_row.conkey, 1) = 1
           AND child_ns.nspname = 'public'`,
      )

      let clearedRecords = 0
      for (const row of foreignKeys.rows) {
        const identifier = (value: string) => `"${String(value).replaceAll('"', '""')}"`
        const result = await client.query(
          `DELETE FROM ${identifier(row.schema_name)}.${identifier(row.table_name)} WHERE ${identifier(row.column_name)} = $1`,
          [participantId],
        )
        clearedRecords += result.rowCount ?? 0
      }

      // Also remove legacy email-only participation rows that have no FK.
      const emailTables = [
        "forex_trades", "transactions", "payment_submissions", "payout_requests",
        "predictions", "topup_requests", "contribution_ledger", "gas_approvals",
        "invite_logs", "spin_coupons", "support_tickets",
      ]
      for (const table of emailTables) {
        try {
          const result = await client.query(
            `DELETE FROM "${table}" WHERE LOWER(participant_email) = LOWER($1)`,
            [email],
          )
          clearedRecords += result.rowCount ?? 0
        } catch (tableError: any) {
          if (tableError?.code !== "42P01" && tableError?.code !== "42703") throw tableError
        }
      }

      if (clearParticipation) {
        await client.query("COMMIT")
        return NextResponse.json({ success: true, clearedRecords, participantId, email })
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
