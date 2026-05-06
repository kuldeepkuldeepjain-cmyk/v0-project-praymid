import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { paymentSubmissionId, payoutRequestId, participantEmail } = await request.json()
    if (!paymentSubmissionId || !payoutRequestId || !participantEmail) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const db = getPool()!

    const subRes = await db.query(`SELECT id,status,screenshot_url,transaction_id FROM payment_submissions WHERE id=$1`, [paymentSubmissionId])
    const paymentSubmission = subRes[0]
    if (!paymentSubmission) return NextResponse.json({ success: false, error: "Payment submission not found" }, { status: 404 })

    if (!paymentSubmission.screenshot_url && !paymentSubmission.transaction_id) {
      return NextResponse.json({ success: false, error: "Cannot approve without payment proof" }, { status: 400 })
    }

    const partRes = await db.query(`SELECT id,account_balance FROM participants WHERE email=$1`, [participantEmail])
    const participant = partRes[0]
    if (!participant) return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })

    const newBalance = Number(participant.account_balance || 0) + 150
    const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + 30)

    await db.query(`UPDATE payment_submissions SET status='approved', reviewed_at=NOW() WHERE id=$1`, [paymentSubmissionId])

    await db.query(
      `UPDATE participants SET account_balance=$1, status='active', is_active=true, activation_date=NOW(), next_contribution_date=?WHERE email=$3`,
      [newBalance, nextDate.toISOString(), participantEmail]
    )

    await db.query(`UPDATE payout_requests SET status='completed', processed_at=NOW(), admin_notes='Completed via contribution approval' WHERE id=$1`, [payoutRequestId])

    await db.query(
      `INSERT INTO notifications(user_email,type,title,message,read_status) VALUES($1,'success','Contribution Approved','Your contribution has been approved. $150 has been credited to your account.',false)`,
      [participantEmail]
    )

    await db.query(
      `INSERT INTO activity_logs(actor_email,action,details,target_type) VALUES('admin','contribution_and_payout_approved',$1,'payment_submission')`,
      [`Approved contribution for ${participantEmail}. Credited $150. Payout #${payoutRequestId} completed.`]
    ).catch(() => { })

    return NextResponse.json({ success: true, message: "Contribution approved and payout completed", newBalance })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })
  }
}
