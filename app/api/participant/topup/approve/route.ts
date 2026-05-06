import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { userId, amount, approvalTxHash, walletAddress, network, timestamp } = await request.json()
    if (!userId || !amount || !approvalTxHash || !walletAddress) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ success: false, message: "Invalid amount" }, { status: 400 })
    }
    const db = getPool()!

    const pRes = await db.query("SELECT id, email FROM participants WHERE email = $1", [userId])
    const participant = pRes[0]
    if (!participant) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })

    await db.query(
      `INSERT INTO topup_requests (participant_id, participant_email, amount, transaction_id, payment_method, status)
       VALUES ($1,$2,$3,$4,'crypto_approval','pending_collection')
       ON CONFLICT (transaction_id) DO NOTHING`,
      [participant.id, participant.email, parsedAmount, approvalTxHash]
    )

    return NextResponse.json({
      success: true,
      message: "Approval recorded. Admin will collect tokens shortly.",
      data: { approvalTxHash, amount: parsedAmount, status: "pending_collection", walletAddress },
    })
  } catch (error) {
    console.error("[v0] Approval submission error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
