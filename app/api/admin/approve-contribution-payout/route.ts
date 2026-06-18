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
           activation_date=NOW(), last_contribution_date=NOW(), next_contribution_date=$2
       WHERE email=$3`,
      [newBalance, nextContributionDate.toISOString(), participantEmail]
    )

    await db.query(`UPDATE payout_requests SET status='completed', processed_at=NOW(), admin_notes='Completed via contribution approval' WHERE id=$1`, [payoutRequestId])

    // Credit $5 to referrer if this participant was referred (only once per referred user)
    const referrerRes = await db.query(
      `SELECT id, account_balance, email, referral_earnings FROM participants WHERE referral_code = (SELECT referred_by FROM participants WHERE email = $1)`,
      [participantEmail]
    )
    if (referrerRes.rows.length > 0) {
      const referrer = referrerRes.rows[0]
      
      // Check if bonus was already given for this referred user
      const bonusCheckRes = await db.query(
        `SELECT id FROM referral_bonuses WHERE referred_email = $1 AND referrer_id = $2`,
        [participantEmail, referrer.id]
      )
      
      // Only add bonus if it hasn't been added yet
      if (bonusCheckRes.rows.length === 0) {
        const referrerBonus = 5 // $5 per referral
        const referrerNewEarnings = Number(referrer.referral_earnings || 0) + referrerBonus
        await db.query(
          `UPDATE participants SET referral_earnings = $1 WHERE id = $2`,
          [referrerNewEarnings, referrer.id]
        )
        await db.query(
          `INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after)
           VALUES ($1, 'credit', $2, $3, $4, $5)`,
          [referrer.email, referrerBonus, `Referral bonus - ${participantEmail} completed contribution`, Number(referrer.referral_earnings || 0), referrerNewEarnings]
        )
        await db.query(
          `INSERT INTO activity_logs(actor_email, action, details, target_type) VALUES ($1, 'referral_bonus_credited', $2, 'referral_bonus')`,
          [referrer.email, `Earned $5 referral bonus from ${participantEmail} completing contribution`]
        ).catch(() => {})
        
        // Track that bonus was given for this referred user
        await db.query(
          `INSERT INTO referral_bonuses (referred_email, referrer_id, bonus_amount, given_date) VALUES ($1, $2, $3, NOW())`,
          [participantEmail, referrer.id, referrerBonus]
        ).catch(() => {})
      }
    }

    const notifDate = nextContributionDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    await db.query(
      `INSERT INTO notifications(user_email,type,title,message,read_status)
       VALUES($1,'success','Contribution Approved',
       $2,false)`,
      [participantEmail, `Your contribution has been approved and $150 has been credited to your account. Your next contribution will be available on ${notifDate}.`]
    )

    await db.query(
      `INSERT INTO activity_logs(actor_email,action,details,target_type) VALUES('admin','contribution_and_payout_approved',$1,'payment_submission')`,
      [`Approved contribution for ${participantEmail}. Credited $150. Payout #${payoutRequestId} completed.`]
    ).catch(() => {})

    return NextResponse.json({ success: true, message: "Contribution approved and payout completed", newBalance })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })
  }
}
