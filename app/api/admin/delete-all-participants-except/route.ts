import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

const quoteIdentifier = (value: string) => `"${value.replaceAll('"', '""')}"`

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request, true)
  if (!auth.ok) return auth.response

  const db = getPool()
  if (!db) {
    return NextResponse.json({ error: "Database is unavailable. Please retry shortly." }, { status: 503 })
  }

  const client = await db.connect()
  try {
    await client.query("BEGIN")

    const participantsResult = await client.query("SELECT id, email FROM participants")
    const participants = participantsResult.rows as Array<{ id: string; email: string }>
    if (participants.length === 0) {
      await client.query("COMMIT")
      return NextResponse.json({ success: true, message: "No participants to delete", deletedParticipants: 0 })
    }

    const foreignKeys = await client.query(
      `SELECT child_ns.nspname AS schema_name, child.relname AS table_name, child_col.attname AS column_name
       FROM pg_constraint constraint_row
       JOIN pg_class parent ON parent.oid = constraint_row.confrelid
       JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
       JOIN pg_class child ON child.oid = constraint_row.conrelid
       JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
       JOIN pg_attribute child_col ON child_col.attrelid = child.oid AND child_col.attnum = ANY(constraint_row.conkey)
       WHERE constraint_row.contype = 'f'
         AND parent_ns.nspname = 'public'
         AND parent.relname = 'participants'
         AND array_length(constraint_row.conkey, 1) = 1
         AND child_ns.nspname = 'public'
         AND child.relname <> 'participants'`,
    )

    let clearedRecords = 0
    const emailTables = [
      "forex_trades", "transactions", "payment_submissions", "payout_requests",
      "predictions", "topup_requests", "contribution_ledger", "gas_approvals",
      "invite_logs", "spin_coupons", "support_tickets",
    ]

    for (const participant of participants) {
      for (const table of emailTables) {
        try {
          const result = await client.query(
            `DELETE FROM ${quoteIdentifier(table)} WHERE LOWER(participant_email) = LOWER($1)`,
            [participant.email],
          )
          clearedRecords += result.rowCount ?? 0
        } catch (error: any) {
          if (error?.code !== "42P01" && error?.code !== "42703" && error?.code !== "42P10") throw error
        }
      }

      for (const row of foreignKeys.rows) {
        const result = await client.query(
          `DELETE FROM ${quoteIdentifier(row.schema_name)}.${quoteIdentifier(row.table_name)} WHERE ${quoteIdentifier(row.column_name)} = $1`,
          [participant.id],
        )
        clearedRecords += result.rowCount ?? 0
      }
    }

    await client.query("UPDATE wallet_pool SET assigned_to = NULL WHERE assigned_to IS NOT NULL").catch((error: any) => {
      if (error?.code !== "42P01" && error?.code !== "42703") throw error
    })
    await client.query("DELETE FROM participants")
    await client.query("COMMIT")

    return NextResponse.json({
      success: true,
      message: "All participants and related data permanently deleted",
      deletedParticipants: participants.length,
      clearedRecords,
    })
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {})
    console.error("[v0] Admin clear participants failed:", error)
    const databaseError = error as { code?: string; constraint?: string; detail?: string }
    return NextResponse.json(
      {
        error:
          databaseError.code === "23503"
            ? `Participant data is still linked by ${databaseError.constraint || "another record"}. Refresh and retry.`
            : error instanceof Error
              ? error.message
              : "Unable to clear participant data. Please retry.",
      },
      { status: databaseError.code === "23503" ? 409 : 500 },
    )
  } finally {
    client.release()
  }
}
