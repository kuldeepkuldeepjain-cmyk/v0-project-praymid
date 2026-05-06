import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { paymentId, amount, email } = await request.json()
    const db = getPool()!

    const pRes = await db.query("SELECT id, email, username, account_balance FROM participants ORDER BY created_at DESC LIMIT 1")
    if (!pRes.rows.length) {
      return NextResponse.json({ success: false, error: "No participants available to redirect to" }, { status: 404 })
    }
    const next = pRes[0]
    const newBalance = Number(next.account_balance || 0) + Number(amount)

    await db.query("UPDATE participants SET account_balance = $1, updated_at = NOW() WHERE id = $2", [newBalance, next.id])
    await db.query(
      "INSERT INTO transactions (participant_email, type, amount, description) VALUES ($1,'contribution_redirect',$2,$3)",
      [next.email, Number(amount), `Redirected activation payment from ${email}`]
    )
    await db.query(
      "UPDATE payment_submissions SET status = 'approved', reviewed_at = NOW() WHERE id = $1",
      [paymentId]
    )
    await db.query(
      "INSERT INTO notifications (user_email, type, title, message) VALUES ($1,'success','Contribution Funds Received',$2)",
      [next.email, `You received $${amount} in redirected activation funds.`]
    )

    return NextResponse.json({ success: true, message: `Activation payment redirected to ${next.username}`, recipientEmail: next.email, amount })
  } catch (error) {
    console.error("[v0] Error in redirect activation API:", error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })
  }
}
