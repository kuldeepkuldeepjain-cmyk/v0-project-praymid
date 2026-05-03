import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    const { email, amount, bep20_address } = await request.json()

    if (!email || !amount || !bep20_address) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const [participant] = await sql`
      SELECT id, account_balance, username, email FROM participants WHERE email = ${email} LIMIT 1
    `
    if (!participant) return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })

    if (Number(participant.account_balance) < Number(amount)) {
      return NextResponse.json(
        { success: false, error: `Insufficient balance. Available: $${participant.account_balance}, Requested: $${amount}` },
        { status: 400 },
      )
    }

    const newBalance = Number(participant.account_balance) - Number(amount)

    await sql`
      UPDATE participants SET account_balance = ${newBalance}, bep20_address = ${bep20_address}, updated_at = NOW()
      WHERE email = ${email}
    `

    const [payoutRequest] = await sql`
      INSERT INTO payout_requests (participant_id, participant_email, wallet_address, amount, status, payout_method)
      VALUES (${participant.id}, ${email}, ${bep20_address}, ${amount}, 'pending', 'BEP20')
      RETURNING *
    `

    if (!payoutRequest) {
      await sql`UPDATE participants SET account_balance = ${participant.account_balance} WHERE email = ${email}`
      return NextResponse.json({ success: false, error: "Failed to create payout request" }, { status: 500 })
    }

    await sql`
      INSERT INTO activity_logs (actor_email, action, details, target_type)
      VALUES (${email}, 'payout_requested', ${'Requested payout of $' + amount + ' to ' + bep20_address}, 'payout_request')
    `

    return NextResponse.json({
      success: true,
      message: "Payout request submitted successfully",
      newBalance,
      requestId: payoutRequest.id,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
