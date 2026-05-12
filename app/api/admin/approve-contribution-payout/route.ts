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
    const paymentSubmission = subRes.rows[0]
    if (!paymentSubmission) return NextResponse.json({ success: false, error: "Payment submission not found" }, { status: 404 })

    if (!paymentSubmission.screenshot_url && !paymentSubmission.transaction_id) {
      return NextResponse.json({ success: false, error: "Cannot approve without payment proof" }, { status: 400 })
    }

    const partRes = await db.query(`SELECT id,account_balance FROM participants WHERE email=$1`, [participantEmail])
    const participant = partRes.rows[0]
    if (!participant) return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })

    const newBalance = Number(participant.account_balance || 0) + 150
    // 30-day cooldown from NOW
    const nextContributionDate = new Date()
    nextContributionDate.setDate(nextContributionDate.getDate() + 30)

    await db.query(`UPDATE payment_submissions SET status='approved', reviewed_at=NOW() WHERE id=$1`, [paymentSubmissionId])

    await db.query(
      `UPDATE participants
       SET account_balance=$1, status='active', is_active=true,
           activation_date=NOW(), contribution_approved=true, next_contribution_date=$2
       WHERE email=$3`,
      [newBalance, nextContributionDate.toISOString(), participantEmail]
    )

    await db.query(`UPDATE payout_requests SET status='completed', processed_at=NOW(), admin_notes='Completed via contribution approval' WHERE id=$1`, [payoutRequestId])

    const notifDate = nextContributionDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    await db.query(
      `INSERT INTO notifications(user_email,type,title,message,read_status)
       VALUES($1,'success','Contribution Approved',$2,false)`,
      [participantEmail, `Your contribution has been approved and $150 has been credited to your account. Your next contribution will be available on ${notifDate}.`]
    )

    // Credit $5 referral reward to referrer when their referral completes a contribution
    try {
      const refRes = await db.query(
        `SELECT referred_by FROM participants WHERE email = $1`, [participantEmail]
      )
      const referredBy = refRes.rows[0]?.referred_by
      if (referredBy) {
        const referrerRes = await db.query(
          `SELECT email FROM participants WHERE referral_code = $1`, [referredBy]
        )
        const referrerEmail = referrerRes.rows[0]?.email
        if (referrerEmail) {
          await db.query(
            `UPDATE participants
             SET account_balance = account_balance + 5,
                 referral_earnings = referral_earnings + 5,
                 total_referrals = total_referrals + 1
             WHERE referral_code = $1`,
            [referredBy]
          )
          await db.query(
            `INSERT INTO notifications(user_email,type,title,message,read_status)
             VALUES($1,'success','Referral Reward +$5','You earned a $5 referral reward! One of your referrals has completed their contribution.',false)`,
            [referrerEmail]
          )
          await db.query(
            `INSERT INTO activity_logs(actor_email,action,details,target_type) VALUES($1,'referral_reward_credited','$5 referral reward credited for referral contribution completion by ${participantEmail}','wallet')`,
            [referrerEmail]
          ).catch(() => {})
        }
      }
    } catch {}

    await db.query(
      `INSERT INTO activity_logs(actor_email,action,details,target_type) VALUES('admin','contribution_and_payout_approved',$1,'payment_submission')`,
      [`Approved contribution for ${participantEmail}. Credited $150. Payout #${payoutRequestId} completed.`]
    ).catch(() => {})

    return NextResponse.json({ success: true, message: "Contribution approved and payout completed", newBalance })
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
