import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { getPool } from "@/lib/db"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { email, amount } = await request.json()
    if (!email || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid email or amount" }, { status: 400 })
    }
    const db = getPool()!
    const res = await db.query("SELECT id, account_balance FROM participants WHERE email = $1", [email.toLowerCase().trim()])
    if (!res.rows.length) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    }
    const participant = res[0]
    const newBalance = Number(participant.account_balance || 0) + Number(amount)
    await db.query("UPDATE participants SET account_balance = $1, updated_at = NOW() WHERE id = $2", [newBalance, participant.id])
    await db.query(
      "INSERT INTO activity_logs (action, actor_id, actor_email, target_type, details) VALUES ($1,$2,$3,$4,$5)",
      ["manual_credit", participant.id, "admin@system.com", "wallet", `Manual credit of $${amount} to ${email} (New balance: $${newBalance})`]
    )
    return NextResponse.json({ success: true, message: `$${amount} credited to ${email}`, newBalance })
  } catch (error) {
    console.error("[v0] Manual credit error:", error)
    return NextResponse.json({ error: "Failed to process credit" }, { status: 500 })
  }
}
