import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { payoutId, status, transactionHash, adminNotes, redirectToEmail, redirectToSerial } = await request.json()
    if (!payoutId || !status) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }
    const db = getPool()!
    const res = await db.query("SELECT * FROM payout_requests WHERE id = $1", [payoutId])
    if (!res.rows.length) {
      return NextResponse.json({ success: false, error: "Payout request not found" }, { status: 404 })
    }
    const payout = res.rows[0]

    // Build update
    const setClauses: string[] = ["status = $1", "admin_notes = $2", "updated_at = NOW()"]
    const params: any[] = [status, adminNotes || payout.admin_notes]
    if (status !== "pending" && !payout.processed_at) { setClauses.push(`processed_at = NOW()`) }
    if (transactionHash) { setClauses.push(`transaction_hash = $${params.length + 1}`); params.push(transactionHash) }
    params.push(payoutId)
    await db.query(`UPDATE payout_requests SET ${setClauses.join(", ")} WHERE id = $${params.length}`, params)

    if (status === "completed") {
      const pRes = await db.query("SELECT account_balance, total_earnings FROM participants WHERE email = $1", [payout.participant_email])
      if (pRes.rows.length) {
        await db.query(
          "INSERT INTO transactions (participant_email, type, amount, description, reference_id) VALUES ($1,$2,$3,$4,$5)",
          [payout.participant_email, "payout_completed", payout.amount, `Payout completed - $${payout.amount} sent`, String(payoutId)]
        )
        await db.query(
          "INSERT INTO activity_logs (actor_email, action, target_type, details) VALUES ($1,$2,$3,$4)",
          ["admin", "payout_completed", "payout", `Completed payout of $${payout.amount} to ${payout.participant_email}`]
        )
      }
    }

    if (status === "rejected") {
      const pRes = await db.query("SELECT account_balance FROM participants WHERE email = $1", [payout.participant_email])
      if (pRes.rows.length) {
        const refundedBalance = Number(pRes.rows[0].account_balance || 0) + Number(payout.amount)
        await db.query("UPDATE participants SET account_balance = $1, updated_at = NOW() WHERE email = $2", [refundedBalance, payout.participant_email])
        await db.query(
          "INSERT INTO transactions (participant_email, type, amount, description, reference_id) VALUES ($1,$2,$3,$4,$5)",
          [payout.participant_email, "payout_rejected", payout.amount, `Payout rejected and refunded - $${payout.amount}`, String(payoutId)]
        )
      }
    }

    return NextResponse.json({ success: true, message: `Payout status updated to ${status}` })
  } catch (error) {
    console.error("[v0] Error in update-payout-status:", error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
