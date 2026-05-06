import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { userId, amount, transactionHash, walletAddress, timestamp } = await request.json()
    if (!userId || !amount || !transactionHash || !walletAddress) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount < 10 || parsedAmount > 10000) {
      return NextResponse.json({ success: false, message: "Invalid amount. Must be between $10 and $10,000" }, { status: 400 })
    }
    const db = getPool()!

    const dupCheck = await db.query("SELECT id FROM topup_requests WHERE transaction_id = $1", [transactionHash])
    if (dupCheck.rows.length > 0) return NextResponse.json({ success: false, message: "Transaction already processed" }, { status: 400 })

    const pRes = await db.query("SELECT id, account_balance FROM participants WHERE username = ?OR email = $1", [userId])
    const participant = pRes[0]
    if (!participant) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })

    await db.query(
      "INSERT INTO topup_requests (participant_id, participant_email, amount, transaction_id, payment_method, status) VALUES ($1,$2,$3,$4,'crypto','pending')",
      [participant.id, userId, parsedAmount, transactionHash]
    )

    const newBalance = Number(participant.account_balance || 0) + parsedAmount
    await db.query("UPDATE participants SET account_balance=?WHERE id=$2", [newBalance, participant.id])
    await db.query("UPDATE topup_requests SET status='completed' WHERE transaction_id=$1", [transactionHash])
    await db.query(
      "INSERT INTO activity_logs (actor_id, actor_email, action, target_type, details) VALUES ($1,$2,'wallet_topup','wallet',$3)",
      [participant.id, userId, `Topped up $${parsedAmount} USDT. New balance: $${newBalance}`]
    ).catch(() => { })

    return NextResponse.json({ success: true, message: "Top-up successful", newBalance })
  } catch (error) {
    console.error("[v0] Top-up API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    if (!userId) return NextResponse.json({ success: false, message: "User ID required" }, { status: 400 })
    const db = getPool()!
    const result = await db.query(
      "SELECT * FROM topup_requests WHERE participant_email = ?ORDER BY created_at DESC LIMIT 20",
      [userId]
    )
    return NextResponse.json({ success: true, topups: result.rows })
  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
