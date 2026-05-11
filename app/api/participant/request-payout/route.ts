import { type NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const email = request.nextUrl.searchParams.get("email")
    if (!email) return NextResponse.json({ success: false, error: "email required" }, { status: 400 })
    const payouts = await query(
      `SELECT id, amount, status, wallet_address, created_at, payout_method,
              transaction_hash, admin_notes,
              participant_confirmed, confirmed_at,
              dispute_status, dispute_raised_at
       FROM payout_requests
       WHERE participant_email = $1
       ORDER BY created_at DESC`,
      [email]
    ) as any[]
    return NextResponse.json({ success: true, payouts })
  } catch (error) {
    console.error("Payout history error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { email, amount, bep20_address } = await request.json()
    if (!email || !amount || !bep20_address) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const rows = await query(
      "SELECT id, account_balance FROM participants WHERE email = $1 LIMIT 1",
      [email]
    ) as any[]
    const participant = rows[0]
    if (!participant) return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })

    const currentBalance = Number(participant.account_balance) || 0
    if (currentBalance < amount) {
      return NextResponse.json({
        success: false,
        error: `Insufficient balance. Available: $${currentBalance.toFixed(2)}, Requested: $${amount}`,
      }, { status: 400 })
    }

    const newBalance = currentBalance - amount
    await execute(
      "UPDATE participants SET account_balance = $1, bep20_address = $2 WHERE email = $3",
      [newBalance, bep20_address, email]
    )

    const payoutRows = await query(
      "INSERT INTO payout_requests (participant_id, participant_email, wallet_address, amount, status, payout_method) VALUES ($1,$2,$3,$4,'pending','BEP20') RETURNING id",
      [participant.id, email, bep20_address, amount]
    ) as any[]
    const payoutRequest = payoutRows[0]

    await execute(
      "INSERT INTO activity_logs (actor_email, action, details, target_type) VALUES ($1,'payout_requested',$2,'payout_request')",
      [email, `Requested payout of $${amount} to ${bep20_address}`]
    ).catch(() => {})

    return NextResponse.json({ success: true, message: "Payout request submitted successfully", newBalance, requestId: payoutRequest.id })
  } catch (error) {
    console.error("Payout request error:", error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })
  }
}
