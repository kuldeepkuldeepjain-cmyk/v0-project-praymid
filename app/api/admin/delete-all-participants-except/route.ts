import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request, true)
  if (!auth.ok) return auth.response

  try {
    const PROTECTED_EMAIL = "kuldeepkuldeepjain@gmail.com"

    const [protectedParticipant] = await sql`SELECT id, email FROM participants WHERE email = ${PROTECTED_EMAIL} LIMIT 1`
    if (!protectedParticipant) {
      return NextResponse.json({ error: "Protected participant not found" }, { status: 404 })
    }

    const allParticipants = await sql`SELECT id, email FROM participants`
    const toDelete = allParticipants.filter((p: any) => p.email !== PROTECTED_EMAIL)

    if (toDelete.length === 0) {
      return NextResponse.json({ success: true, message: "No participants to delete", deletedCount: 0 })
    }

    const idsToDelete = toDelete.map((p: any) => p.id)

    // Delete related records in order (respecting foreign keys)
    const deletionTables = [
      { table: "transactions", col: "participant_id" },
      { table: "payment_submissions", col: "participant_id" },
      { table: "payout_requests", col: "participant_id" },
      { table: "predictions", col: "participant_id" },
      { table: "topup_requests", col: "participant_id" },
      { table: "wallet_pool", col: "assigned_to" },
      { table: "notifications", col: "user_id" },
      { table: "activity_logs", col: "actor_id" },
    ]

    for (const { table, col } of deletionTables) {
      for (const id of idsToDelete) {
        await sql`DELETE FROM ${sql(table)} WHERE ${sql(col)} = ${id}`.catch(() => {})
      }
    }

    // Delete p2p_transactions (two FK columns)
    for (const id of idsToDelete) {
      await sql`DELETE FROM p2p_transactions WHERE sender_id = ${id} OR receiver_id = ${id}`.catch(() => {})
    }

    await sql`DELETE FROM participants WHERE email != ${PROTECTED_EMAIL}`

    return NextResponse.json({
      success: true,
      message: `Deleted all participants except ${PROTECTED_EMAIL}`,
      deletedParticipants: toDelete.length,
      protectedEmail: PROTECTED_EMAIL,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 },
    )
  }
}
