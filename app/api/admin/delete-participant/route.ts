import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { getPool } from "@/lib/db"

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json().catch(() => null)
    const participantId = body?.participantId
    const clearParticipation = body?.clearParticipation === true
    if (typeof participantId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(participantId)) {
      return NextResponse.json({ error: "A valid participant ID is required" }, { status: 400 })
    }

    const db = getPool()
    if (!db) {
      return NextResponse.json({ error: "Database is unavailable. Please retry shortly." }, { status: 503 })
    }

    const client = await db.connect()
    let deletedRelatedRecords = 0
    let email = ""
    try {
      await client.query("BEGIN")
      await client.query("SET LOCAL statement_timeout = '15s'")
      await client.query("SET LOCAL lock_timeout = '5s'")

      // Lock the participant row so concurrent admin actions cannot partially delete it.
      const res = await client.query("SELECT id, email FROM participants WHERE id = $1 FOR UPDATE", [participantId])
      if (!res.rows.length) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Participant not found" }, { status: 404 })
      }
      email = String(res.rows[0].email)

      // Discover every real foreign-key dependency instead of maintaining a
      // fragile table list that can miss newly added participation tables.
      const foreignKeys = await client.query(
        `SELECT child_ns.nspname AS schema_name, child.relname AS table_name, child_col.attname AS column_name, parent_col.attname AS parent_column, constraint_row.confdeltype AS delete_action, child_col.attnotnull AS is_not_null
         FROM pg_constraint constraint_row
         JOIN pg_class parent ON parent.oid = constraint_row.confrelid
         JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
         JOIN pg_class child ON child.oid = constraint_row.conrelid
         JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
         JOIN pg_attribute child_col ON child_col.attrelid = child.oid
           AND child_col.attnum = constraint_row.conkey[1]
         JOIN pg_attribute parent_col ON parent_col.attrelid = parent.oid
           AND parent_col.attnum = constraint_row.confkey[1]
         WHERE constraint_row.contype = 'f'
           AND parent_ns.nspname = 'public'
           AND parent.relname = 'participants'
           AND array_length(constraint_row.conkey, 1) = 1
           AND child_ns.nspname = 'public'
           AND child.relname <> 'participants'
           AND constraint_row.confdeltype IN ('a', 'r', 'n', 'd')`,
      )

      let clearedRecords = 0

      // Clear legacy email-owned records before resolving FK dependencies. Some
      // older tables reference participant-owned rows indirectly, so removing
      // them first prevents the dependency pass from stalling.
      const emailTables = [
        "forex_trades", "transactions", "payment_submissions", "payout_requests",
        "predictions", "topup_requests", "contribution_ledger", "gas_approvals",
        "invite_logs", "spin_coupons", "support_tickets",
      ]
      for (const table of emailTables) {
        try {
          const result = await client.query(
            `DELETE FROM "${table}" WHERE LOWER(participant_email::text) = LOWER($1::text)`,
            [email],
          )
          clearedRecords += result.rowCount ?? 0
        } catch (tableError: any) {
          if (tableError?.code !== "42P01" && tableError?.code !== "42703" && tableError?.code !== "42P10") throw tableError
        }
      }

      const identifier = (value: string) => `"${String(value).replaceAll('"', '""')}"`
      const parentValues = new Map<string, unknown>([["id", participantId], ["email", email]])
      let pendingForeignKeys = [...foreignKeys.rows]
      while (pendingForeignKeys.length > 0) {
        const nextPending: typeof pendingForeignKeys = []
        let deletedThisPass = 0
        for (const row of pendingForeignKeys) {
          try {
            const parentColumn = String(row.parent_column)
            if (!parentValues.has(parentColumn)) {
              const parentResult = await client.query(
                `SELECT ${identifier(parentColumn)} AS value FROM "public"."participants" WHERE id = $1`,
                [participantId],
              )
              parentValues.set(parentColumn, parentResult.rows[0]?.value ?? null)
            }
            const parentValue = parentValues.get(parentColumn)
            if (parentValue == null) continue

            const tableName = `${identifier(row.schema_name)}.${identifier(row.table_name)}`
            const columnName = identifier(row.column_name)
            const statement = row.delete_action === "n" && !row.is_not_null
              ? `UPDATE ${tableName} SET ${columnName} = NULL WHERE ${columnName} = $1`
              : `DELETE FROM ${tableName} WHERE ${columnName} = $1`
            const result = await client.query(statement, [parentValue])
            const deleted = result.rowCount ?? 0
            clearedRecords += deleted
            deletedThisPass += deleted
          } catch (dependencyError: any) {
            if (dependencyError?.code === "23503") {
              nextPending.push(row)
            } else {
              throw dependencyError
            }
          }
        }
        if (nextPending.length === 0) break
        if (deletedThisPass === 0) {
          throw new Error("Participant dependencies could not be cleared")
        }
        pendingForeignKeys = nextPending
      }

      deletedRelatedRecords = clearedRecords
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
      deletedRelatedRecords,
    })
  } catch (error) {
    console.error("[v0] Admin participant deletion failed:", error)
    const databaseError = error as { code?: string; constraint?: string; detail?: string; table?: string }
    if (databaseError.code === "23503") {
      return NextResponse.json(
        { error: `Participant data is still linked by ${databaseError.constraint || databaseError.table || "another record"}. Clear participation first, then retry deletion.` },
        { status: 409 },
      )
    }
    const message = error instanceof Error ? error.message : "Unable to complete this account action"
    const retryMessage = databaseError.code
      ? `Participant deletion failed with database error ${databaseError.code}. The transaction was rolled back; refresh and retry.`
      : "Unable to complete this account action. The transaction was rolled back; refresh and retry."
    return NextResponse.json(
      { error: message.includes("dependencies") ? "Some participation records are still linked. Refresh the participant list and retry." : retryMessage },
      { status: databaseError.code === "55P03" || databaseError.code === "57014" ? 503 : 500 },
    )
  }
}
