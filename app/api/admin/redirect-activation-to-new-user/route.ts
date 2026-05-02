import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { paymentId, amount, email } = await request.json()

    const [nextParticipant] = await sql`
      SELECT id, email, username, account_balance
      FROM participants
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (!nextParticipant) {
      return NextResponse.json({ success: false, error: "No participants available to redirect to" }, { status: 404 })
    }

    const newBalance = Number(nextParticipant.account_balance || 0) + Number(amount)

    await sql`UPDATE participants SET account_balance=${newBalance} WHERE id=${nextParticipant.id}`

    await sql`
      INSERT INTO transactions (participant_email, type, amount, description)
      VALUES (${nextParticipant.email}, 'contribution_redirect', ${Number(amount)},
        ${'Redirected activation payment from ' + email + ' for contribution'})
    `

    if (paymentId) {
      await sql`UPDATE payment_submissions SET status='approved', reviewed_at=NOW() WHERE id=${paymentId}`
    }

    await sql`
      INSERT INTO notifications (user_email, type, title, message)
      VALUES (${nextParticipant.email}, 'success', 'Contribution Funds Received',
        ${'You received $' + amount + ' in contribution funds from a redirected activation payment.'})
    `

    return NextResponse.json({
      success: true,
      message: `Activation payment redirected to ${nextParticipant.username || nextParticipant.email}`,
      recipientName: nextParticipant.username,
      recipientEmail: nextParticipant.email,
      amount,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
