import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { userId, amount, transactionHash } = await request.json()
    if (!userId || !amount || !transactionHash) return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })

    const existing = await sql`SELECT id FROM topup_requests WHERE transaction_id = ${transactionHash} LIMIT 1`
    if (existing.length > 0) return NextResponse.json({ success: false, message: "Transaction already processed" }, { status: 400 })

    const rows = await sql`SELECT id, account_balance, email FROM participants WHERE username = ${userId} OR email = ${userId} LIMIT 1`
    const participant = rows[0]
    if (!participant) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })

    const newBalance = Number(participant.account_balance || 0) + Number(amount)
    await sql`UPDATE participants SET account_balance = ${newBalance}, updated_at = NOW() WHERE id = ${participant.id}`
    await sql`INSERT INTO topup_requests (participant_id, participant_email, amount, payment_method, transaction_id, status) VALUES (${participant.id}, ${participant.email}, ${Number(amount)}, 'crypto', ${transactionHash}, 'completed')`
    await sql`INSERT INTO activity_logs (actor_id, actor_email, action, target_type, details) VALUES (${participant.id}, ${participant.email}, 'wallet_topup', 'wallet', ${`Topped up $${amount} USDT. New balance: $${newBalance}`})`

    return NextResponse.json({ success: true, newBalance, message: `$${amount} USDT added to your wallet` })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 })
  }
}
