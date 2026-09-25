import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  const amount = Number(body?.amount)
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : ""

  if (!email || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000 || !reason) {
    return NextResponse.json({ success: false, error: "Email, a positive amount, and a reason are required." }, { status: 400 })
  }

  const db = getPool()
  if (!db) return NextResponse.json({ success: false, error: "Database unavailable" }, { status: 500 })
  const client = await db.connect()

  try {
    await client.query("BEGIN")
    const participantResult = await client.query(
      "SELECT id, email, account_balance FROM participants WHERE LOWER(email) = LOWER($1) AND is_deleted IS NOT TRUE FOR UPDATE",
      [email],
    )
    const participant = participantResult.rows[0]
    if (!participant) {
      await client.query("ROLLBACK")
      return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
    }

    const balanceBefore = Number(participant.account_balance || 0)
    if (amount > balanceBefore) {
      await client.query("ROLLBACK")
      return NextResponse.json({ success: false, error: `Amount exceeds current balance of $${balanceBefore.toFixed(2)}.` }, { status: 400 })
    }

    const balanceAfter = Math.round((balanceBefore - amount) * 100) / 100
    await client.query("UPDATE participants SET account_balance = $1, updated_at = NOW() WHERE id = $2", [balanceAfter, participant.id])
    await client.query(
      "INSERT INTO transactions (participant_id, participant_email, type, amount, description, balance_before, balance_after, status) VALUES ($1, $2, 'debit', $3, $4, $5, $6, 'completed')",
      [participant.id, participant.email, amount, `Admin balance deduction by ${auth.email}: ${reason}`, balanceBefore, balanceAfter],
    )
    await client.query(
      "INSERT INTO activity_logs (actor_id, actor_email, action, target_type, details) VALUES ($1, $2, 'admin_balance_deduction', 'participant', $3)",
      [participant.id, auth.email, `Deducted $${amount.toFixed(2)} from ${participant.email}. Reason: ${reason}`],
    )
    await client.query("COMMIT")
    return NextResponse.json({ success: true, email: participant.email, balanceBefore, balanceAfter, deducted: amount })
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {})
    console.error("[v0] Admin balance deduction failed:", error)
    return NextResponse.json({ success: false, error: "Failed to deduct participant balance." }, { status: 500 })
  } finally {
    client.release()
  }
}
