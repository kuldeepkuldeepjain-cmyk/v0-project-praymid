import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const { email, amount } = await request.json()

    if (!email || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid email or amount" }, { status: 400 })
    }

    const [participant] = await sql`SELECT id, username, account_balance FROM participants WHERE email = ${email} LIMIT 1`
    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 })

    const newBalance = Number(participant.account_balance || 0) + Number(amount)

    await sql`UPDATE participants SET account_balance = ${newBalance}, updated_at = NOW() WHERE email = ${email}`
    await sql`
      INSERT INTO activity_logs (action, actor_id, actor_email, target_type, target_id, details)
      VALUES ('manual_credit', ${participant.id}, 'admin@system.com', 'wallet', ${participant.id},
        ${'Manual credit of $' + amount + ' to ' + email + ' (New balance: $' + newBalance + ')'})
    `

    return NextResponse.json({ success: true, message: `$${amount} credited to ${email}`, newBalance })
  } catch (error) {
    return NextResponse.json({ error: "Failed to process credit" }, { status: 500 })
  }
}
