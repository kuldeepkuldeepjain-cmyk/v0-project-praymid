import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const db = getPool()!
    const result = await db.query(`
      SELECT ps.*,
             p.username, p.full_name, p.mobile_number, p.wallet_address,
             p.serial_number
      FROM payment_submissions ps
      LEFT JOIN participants p ON p.id = ps.participant_id OR p.email = ps.participant_email
      ORDER BY ps.created_at DESC
    `)
    const payments = result.rows

    const transformedPayments = payments.map((payment: any) => ({
      id: payment.id,
      email: payment.participant_email,
      full_name: payment.full_name || payment.username || payment.participant_email?.split("@")[0] || "Unknown",
      username: payment.username || payment.participant_email?.split("@")[0] || "Unknown",
      mobile_number: payment.mobile_number || null,
      serial_number: payment.serial_number || null,
      wallet: payment.wallet_address || "",
      amount: Number(payment.amount) || 100,
      paymentMethod: payment.payment_method === "BEP20" ? "crypto" : "bank",
      payment_method: payment.payment_method || "BEP20",
      screenshotUrl: payment.screenshot_url || "",
      screenshot_url: payment.screenshot_url || null,
      transactionHash: payment.transaction_id || "",
      transaction_id: payment.transaction_id || "N/A",
      submittedAt: payment.created_at,
      created_at: payment.created_at,
      status: payment.status || "pending",
      matched_payout_id: payment.matched_payout_id || null,
      participants: {
        full_name: payment.full_name || null,
        username: payment.username || null,
        mobile_number: payment.mobile_number || null,
      }
    }))

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const pendingCount = transformedPayments.filter((p: any) => p.status === "pending" || p.status === "request_pending").length
    const approvedToday = transformedPayments.filter((p: any) => p.status === "approved" && new Date(p.submittedAt) >= today).length
    const rejectedToday = transformedPayments.filter((p: any) => p.status === "rejected" && new Date(p.submittedAt) >= today).length
    const totalCollected = transformedPayments.filter((p: any) => p.status === "approved").reduce((sum: number, p: any) => sum + p.amount, 0)

    return NextResponse.json({
      success: true,
      payments: transformedPayments,
      stats: { pending: pendingCount, approved_today: approvedToday, rejected_today: rejectedToday, total_collected: totalCollected },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const db = getPool()!
    const { paymentId, action, reason } = await request.json()

    if (!paymentId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ success: false, error: "Missing or invalid fields" }, { status: 400 })
    }

    const paymentRes = await db.query(`SELECT * FROM payment_submissions WHERE id = $1`, [paymentId])
    const payment = paymentRes.rows[0]
    if (!payment) return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 })

    if (payment.status !== "pending" && payment.status !== "request_pending") {
      return NextResponse.json({ success: false, error: "Payment already processed", alreadyProcessed: true }, { status: 400 })
    }

    const newStatus = action === "approve" ? "approved" : "rejected"
    const updated = await db.query(
      `UPDATE payment_submissions SET status=$1, reviewed_at=NOW(), rejection_reason=$2 WHERE id=$3 AND status IN ('pending','request_pending') RETURNING id`,
      [newStatus, action === "reject" ? (reason || null) : null, paymentId]
    )
    if (updated.rowCount === 0) {
      return NextResponse.json({ success: false, error: "Payment was already processed", alreadyProcessed: true }, { status: 409 })
    }

    if (action === "approve") {
      const partRes = await db.query(`SELECT account_balance FROM participants WHERE email=$1`, [payment.participant_email])
      const currentBalance = Number(partRes.rows[0]?.account_balance || 0)
      const newBalance = currentBalance + 150
      const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + 30)
      await db.query(
        `UPDATE participants SET status='active', is_active=true, activation_date=NOW(), account_balance=$1, next_contribution_date=$2 WHERE email=$3`,
        [newBalance, nextDate.toISOString(), payment.participant_email]
      )
      await db.query(
        `INSERT INTO notifications(user_email,type,title,message,read_status) VALUES($1,'success','Activation Approved','Your contribution has been approved. $150 has been credited to your account.',false)`,
        [payment.participant_email]
      )

      // Credit $5 referral bonus to referrer when funds are added (only once per referred user)
      try {
        const referrerRes = await db.query(
          `SELECT id, email, referral_earnings FROM participants WHERE referral_code = (SELECT referred_by FROM participants WHERE email = $1)`,
          [payment.participant_email]
        )
        if (referrerRes.rows.length > 0) {
          const referrer = referrerRes.rows[0]
          
          // Check if bonus was already given for this referred user
          const bonusCheckRes = await db.query(
            `SELECT id FROM referral_bonuses WHERE referred_email = $1 AND referrer_id = $2`,
            [payment.participant_email, referrer.id]
          )
          
          // Only add bonus if it hasn't been added yet
          if (bonusCheckRes.rows.length === 0) {
            const referralBonus = 5
            const referrerNewEarnings = Number(referrer.referral_earnings || 0) + referralBonus
            await db.query(
              `UPDATE participants SET referral_earnings = $1 WHERE id = $2`,
              [referrerNewEarnings, referrer.id]
            )
            await db.query(
              `INSERT INTO transactions (participant_email, type, amount, description, balance_before, balance_after)
               VALUES ($1, 'referral_bonus', $2, $3, $4, $5)`,
              [referrer.email, referralBonus, `Referral bonus - ${payment.participant_email} funds added`, Number(referrer.referral_earnings || 0), referrerNewEarnings]
            ).catch(() => {})
            await db.query(
              `INSERT INTO activity_logs(actor_email, action, details, target_type) VALUES ($1, 'referral_bonus_credited', $2, 'referral_bonus')`,
              [referrer.email, `Earned $5 referral bonus from ${payment.participant_email} adding funds`]
            ).catch(() => {})
            
            // Track that bonus was given for this referred user
            await db.query(
              `INSERT INTO referral_bonuses (referred_email, referrer_id, bonus_amount, given_date) VALUES ($1, $2, $3, NOW())`,
              [payment.participant_email, referrer.id, referralBonus]
            ).catch(() => {})
          }
        }
      } catch (referralError) {
        // Non-critical - don't fail if referral credit fails
        console.error("Failed to credit referral bonus:", referralError)
      }
    } else {
      const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + 30)
      await db.query(`UPDATE participants SET next_contribution_date=$1 WHERE email=$2`, [nextDate.toISOString(), payment.participant_email])
      await db.query(
        `INSERT INTO notifications(user_email,type,title,message,read_status) VALUES($1,'error','Activation Payment Rejected',$2,false)`,
        [payment.participant_email, (reason || "Your activation payment was rejected") + ". You can try again after 30 days."]
      )
    }

    await db.query(
      `INSERT INTO activity_logs(actor_email,action,target_type,details) VALUES('montyflowchain890@gmail.com',$1,'payment_submission',$2)`,
      [action === "approve" ? "activation_approved" : "activation_rejected", JSON.stringify({ paymentId, reason })]
    )

    return NextResponse.json({ success: true, message: action === "approve" ? "Payment approved, account activated" : "Payment rejected" })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
