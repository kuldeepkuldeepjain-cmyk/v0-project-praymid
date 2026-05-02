import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const { payoutId, amount, adminNotes } = await request.json()

    const [newParticipant] = await sql`
      SELECT id, serial_number, username, full_name, email, account_balance
      FROM participants
      ORDER BY created_at DESC
      LIMIT 1
    `
    if (!newParticipant) {
      return NextResponse.json({ success: false, error: "No new participant found to redirect payout" }, { status: 404 })
    }

    const newBalance = Number(newParticipant.account_balance) + Number(amount)
    const recipientName = newParticipant.full_name || newParticipant.username || newParticipant.email

    await sql`UPDATE participants SET account_balance = ${newBalance} WHERE id = ${newParticipant.id}`

    await sql`
      INSERT INTO transactions (participant_email, type, amount, balance_before, balance_after, description, reference_id)
      VALUES (${newParticipant.email}, 'contribution_redirect', ${amount},
        ${newParticipant.account_balance}, ${newBalance},
        ${'Redirected payout from request #' + payoutId + ' for contribution'},
        ${'REDIRECT_' + payoutId})
    `.catch(() => {})

    await sql`
      UPDATE payout_requests SET
        status = 'completed',
        admin_notes = ${(adminNotes || "") + " | Redirected to " + recipientName},
        processed_at = NOW()
      WHERE id = ${payoutId}
    `

    await sql`
      INSERT INTO notifications (user_email, type, title, message, read_status)
      VALUES (${newParticipant.email}, 'info', 'Contribution Funds Received',
        ${'You have received $' + amount + ' in contribution funds. Your new balance is $' + newBalance.toFixed(2)}, false)
    `.catch(() => {})

    return NextResponse.json({
      success: true,
      message: `Payout successfully redirected to ${recipientName}`,
      recipientName,
      recipientEmail: newParticipant.email,
      newBalance,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to redirect payout" },
      { status: 500 },
    )
  }
}
