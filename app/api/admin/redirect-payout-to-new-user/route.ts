import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { payoutId, amount, adminNotes } = await request.json()
    const db = getPool()!

    const pRes = await db.query("SELECT id, username, full_name, email, account_balance FROM participants ORDER BY created_at DESC LIMIT 1")
    if (!pRes.rows.length) {
      return NextResponse.json({ success: false, error: "No new participant found to redirect payout" }, { status: 404 })
    }
    const next = pRes[0]
    const newBalance = Number(next.account_balance || 0) + Number(amount)

    await db.query("UPDATE participants SET account_balance = $1, updated_at = NOW() WHERE id = $2", [newBalance, next.id])
    await db.query(
      "INSERT INTO transactions (participant_email, type, amount, balance_before, balance_after, description) VALUES ($1,'contribution_redirect',$2,$3,$4,$5)",
      [next.email, amount, next.account_balance, newBalance, `Redirected payout from request #${payoutId}`]
    )
    await db.query(
      "UPDATE payout_requests SET status = 'completed', admin_notes = $1, processed_at = NOW() WHERE id = $2",
      [(adminNotes || "") + ` | Redirected to ${next.full_name}`, payoutId]
    )
    await db.query(
      "INSERT INTO notifications (user_email, type, title, message) VALUES ($1,'success','Contribution Funds Received',$2)",
      [next.email, `You have received $${amount} in contribution funds. Your new balance is $${newBalance.toFixed(2)}`]
    )

    return NextResponse.json({ success: true, message: `Payout successfully redirected to ${next.full_name}`, recipientEmail: next.email, newBalance })
  } catch (error) {
    console.error("[v0] Error redirecting payout:", error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to redirect payout" }, { status: 500 })
  }
}
