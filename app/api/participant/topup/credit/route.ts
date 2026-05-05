import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

const COMPANY_WALLET_ADDRESS = process.env.COMPANY_WALLET_ADDRESS || "0x77704a0FBD161F3f615e1D550bB0EE50a469B938"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { userId, amount, transactionHash } = await request.json()
    if (!userId || !amount || !transactionHash) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }
    const db = getPool()!

    const dupCheck = await db.query("SELECT id FROM topup_requests WHERE transaction_id = $1", [transactionHash])
    if (dupCheck.rows.length > 0) return NextResponse.json({ success: false, message: "Transaction already processed" }, { status: 400 })

    const pRes = await db.query("SELECT id, account_balance, email FROM participants WHERE username = $1 OR email = $1", [userId])
    const participant = pRes.rows[0]
    if (!participant) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })

    const newBalance = Number(participant.account_balance || 0) + Number(amount)
    await db.query("UPDATE participants SET account_balance=$1 WHERE id=$2", [newBalance, participant.id])
    await db.query(
      "INSERT INTO topup_requests (participant_id, participant_email, amount, payment_method, transaction_id, status) VALUES ($1,$2,$3,'crypto',$4,'completed')",
      [participant.id, participant.email || userId, Number(amount), transactionHash]
    ).catch(() => {})

    return NextResponse.json({ success: true, newBalance, message: `$${amount} USDT added to your wallet` })
  } catch (error) {
    console.error("[v0] Top-up credit error:", error)
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 })
  }
}
