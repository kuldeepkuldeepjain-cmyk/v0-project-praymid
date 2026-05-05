import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { email, amount, bep20_address } = await request.json()
    if (!email || !amount || !bep20_address) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }
    const db = getPool()!
    const { rows } = await db.query(
      "SELECT id, account_balance, username, email FROM participants WHERE email = $1", [email]
    )
    const participant = rows[0]
    if (!participant) return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
    if (participant.account_balance < amount) {
      return NextResponse.json({
        success: false,
        error: `Insufficient balance. Available: $${participant.account_balance}, Requested: $${amount}`,
      }, { status: 400 })
    }

    const newBalance = participant.account_balance - amount
    await db.query("UPDATE participants SET account_balance = $1, bep20_address = $2 WHERE email = $3",
      [newBalance, bep20_address, email])

    const { rows: payoutRows } = await db.query(
      "INSERT INTO payout_requests (participant_id, participant_email, wallet_address, amount, status, payout_method) VALUES ($1,$2,$3,$4,'pending','BEP20') RETURNING *",
      [participant.id, email, bep20_address, amount]
    )
    const payoutRequest = payoutRows[0]

    await db.query(
      "INSERT INTO activity_logs (actor_email, action, details, target_type) VALUES ($1,'payout_requested',$2,'payout_request')",
      [email, `Requested payout of $${amount} to ${bep20_address}`]
    )

    return NextResponse.json({ success: true, message: "Payout request submitted successfully", newBalance, requestId: payoutRequest.id })
  } catch (error) {
    console.error("Payout request error:", error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })
  }
}
