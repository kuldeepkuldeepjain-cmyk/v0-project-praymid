import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { userId, amount, transactionHash, walletAddress, timestamp } = await request.json()
    if (!userId || !amount || !transactionHash || !walletAddress) return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount < 10 || parsedAmount > 10000) return NextResponse.json({ success: false, message: "Invalid amount. Must be between $10 and $10,000" }, { status: 400 })

    const existing = await sql`SELECT id FROM topup_requests WHERE transaction_id = ${transactionHash} LIMIT 1`
    if (existing.length > 0) return NextResponse.json({ success: false, message: "Transaction already processed" }, { status: 400 })

    const rows = await sql`SELECT id, account_balance, email FROM participants WHERE username = ${userId} OR email = ${userId} LIMIT 1`
    const participant = rows[0]
    if (!participant) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })

    const newBalance = Number(participant.account_balance || 0) + parsedAmount
    await sql`INSERT INTO topup_requests (participant_id, participant_email, amount, transaction_id, payment_method, status) VALUES (${participant.id}, ${participant.email || userId}, ${parsedAmount}, ${transactionHash}, 'crypto', 'pending')`
    await sql`UPDATE participants SET account_balance = ${newBalance}, updated_at = NOW() WHERE id = ${participant.id}`
    await sql`UPDATE topup_requests SET status = 'completed' WHERE transaction_id = ${transactionHash}`
    await sql`INSERT INTO activity_logs (actor_id, actor_email, action, target_type, details) VALUES (${participant.id}, ${participant.email || userId}, 'wallet_topup', 'wallet', ${`Topped up $${parsedAmount} USDT. New balance: $${newBalance}`})`

    return NextResponse.json({ success: true, message: "Top-up successful", newBalance })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId")
    if (!userId) return NextResponse.json({ success: false, message: "User ID required" }, { status: 400 })
    const topups = await sql`SELECT * FROM topup_requests WHERE participant_email = ${userId} ORDER BY created_at DESC LIMIT 20`
    return NextResponse.json({ success: true, topups })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Failed to fetch top-up history" }, { status: 500 })
  }
}
