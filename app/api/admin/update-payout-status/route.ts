import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

const VALID_STATUSES = new Set(["pending", "matched", "approved", "completed", "rejected", "cancelled"])
const TERMINAL_STATUSES = new Set(["completed", "rejected", "cancelled"])

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  const pool = getPool()
  if (!pool) return NextResponse.json({ success: false, error: "No database connection" }, { status: 500 })

  try {
    const { payoutId, status, transactionHash, adminNotes, redirectToEmail, redirectToSerial } = await request.json()
    if (!payoutId || !status || !VALID_STATUSES.has(status)) {
      return NextResponse.json({ success: false, error: "Missing or invalid payout status" }, { status: 400 })
    }

    const client = await pool.connect()
    try {
      await client.query("BEGIN")
      const result = await client.query(
        "SELECT id, participant_email, amount, status, admin_notes, processed_at FROM payout_requests WHERE id = $1 FOR UPDATE",
        [payoutId],
      )
      const payout = result.rows[0]
      if (!payout) {
        await client.query("ROLLBACK")
        return NextResponse.json({ success: false, error: "Payout request not found" }, { status: 404 })
      }
      if (payout.status === status) {
        await client.query("COMMIT")
        return NextResponse.json({ success: true, message: `Payout status is already ${status}` })
      }
      if (TERMINAL_STATUSES.has(payout.status)) {
        await client.query("ROLLBACK")
        return NextResponse.json({ success: false, error: "Completed, rejected, or cancelled payouts cannot be changed" }, { status: 409 })
      }

      const values: unknown[] = [status, adminNotes ?? payout.admin_notes]
      const setClauses = ["status = $1", "admin_notes = $2", "updated_at = NOW()"]
      if (status !== "pending" && !payout.processed_at) setClauses.push("processed_at = NOW()")
      if (transactionHash !== undefined) {
        values.push(transactionHash || null)
        setClauses.push(`transaction_hash = $${values.length}`)
      }
      if (redirectToEmail !== undefined) {
        values.push(redirectToEmail || null)
        setClauses.push(`redirect_to_email = $${values.length}`)
      }
      if (redirectToSerial !== undefined) {
        values.push(redirectToSerial || null)
        setClauses.push(`redirect_to_serial = $${values.length}`)
      }
      values.push(payoutId)
      await client.query(`UPDATE payout_requests SET ${setClauses.join(", ")} WHERE id = $${values.length}`, values)

      if (status === "completed") {
        await client.query(
          "INSERT INTO transactions (participant_email, type, amount, description, reference_id) VALUES ($1, $2, $3, $4, $5)",
          [payout.participant_email, "payout_completed", payout.amount, `Payout completed - $${payout.amount} sent`, String(payoutId)],
        )
        await client.query(
          "INSERT INTO activity_logs (actor_email, action, target_type, details) VALUES ($1, $2, $3, $4)",
          [auth.email, "payout_completed", "payout", `Completed payout of $${payout.amount} to ${payout.participant_email}`],
        )
      }

      if (status === "rejected") {
        const participant = await client.query(
          "SELECT account_balance FROM participants WHERE LOWER(email) = LOWER($1) FOR UPDATE",
          [payout.participant_email],
        )
        if (participant.rows[0]) {
          const refundedBalance = Number(participant.rows[0].account_balance || 0) + Number(payout.amount)
          await client.query("UPDATE participants SET account_balance = $1, updated_at = NOW() WHERE LOWER(email) = LOWER($2)", [refundedBalance, payout.participant_email])
          await client.query(
            "INSERT INTO transactions (participant_email, type, amount, description, reference_id) VALUES ($1, $2, $3, $4, $5)",
            [payout.participant_email, "payout_rejected", payout.amount, `Payout rejected and refunded - $${payout.amount}`, String(payoutId)],
          )
        }
      }

      await client.query("COMMIT")
      return NextResponse.json({ success: true, message: `Payout status updated to ${status}` })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("[v0] Error in update-payout-status:", error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
