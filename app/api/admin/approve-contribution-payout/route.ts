import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const { paymentSubmissionId, payoutRequestId, participantEmail } = await request.json()

    if (!paymentSubmissionId || !payoutRequestId || !participantEmail) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const [submission] = await sql`
      SELECT id, status, screenshot_url, transaction_id
      FROM payment_submissions WHERE id = ${paymentSubmissionId} LIMIT 1
    `
    if (!submission) return NextResponse.json({ success: false, error: "Payment submission not found" }, { status: 404 })

    if (!submission.screenshot_url && !submission.transaction_id) {
      return NextResponse.json(
        { success: false, error: "Cannot approve without payment proof (screenshot or transaction ID required)" },
        { status: 400 },
      )
    }

    const [participant] = await sql`SELECT id, account_balance FROM participants WHERE email = ${participantEmail} LIMIT 1`
    if (!participant) return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })

    const newBalance = Number(participant.account_balance || 0) + 180
    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + 30)

    await sql`UPDATE payment_submissions SET status = 'approved', reviewed_at = NOW() WHERE id = ${paymentSubmissionId}`

    await sql`
      UPDATE participants SET
        account_balance = ${newBalance},
        contribution_approved = true,
        status = 'active',
        is_active = true,
        activation_date = NOW(),
        next_contribution_date = ${nextDate.toISOString()}
      WHERE email = ${participantEmail}
    `

    await sql`
      UPDATE payout_requests SET status = 'completed', processed_at = NOW(), admin_notes = 'Completed via contribution approval'
      WHERE id = ${payoutRequestId}
    `

    await sql`
      INSERT INTO notifications (user_email, type, title, message, read_status)
      VALUES (${participantEmail}, 'success', 'Contribution Approved',
        'Your contribution has been approved. $180 has been credited to your account. Next contribution available after 30 days.', false)
    `

    await sql`
      INSERT INTO activity_logs (actor_email, action, details, target_type)
      VALUES ('admin', 'contribution_and_payout_approved',
        ${'Approved contribution for ' + participantEmail + '. Credited $180. Payout #' + payoutRequestId + ' completed.'}, 'payment_submission')
    `.catch(() => {})

    return NextResponse.json({ success: true, message: "Contribution approved and payout completed", newBalance })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
