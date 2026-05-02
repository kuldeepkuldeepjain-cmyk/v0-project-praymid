import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { contributionId, action, reason } = await request.json()

    if (!contributionId || !action) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    const [contribution] = await sql`SELECT * FROM payment_submissions WHERE id = ${contributionId}`
    if (!contribution) return NextResponse.json({ success: false, error: "Contribution not found" }, { status: 404 })

    const allowedStatuses = action === "approve" ? ["proof_submitted", "pending"] : ["proof_submitted", "in_process", "pending"]
    if (!allowedStatuses.includes(contribution.status)) {
      return NextResponse.json({
        success: false,
        error: `Cannot ${action} a contribution with status "${contribution.status}".`,
        alreadyProcessed: ["approved", "rejected"].includes(contribution.status),
      }, { status: 400 })
    }

    if (action === "approve") {
      await sql`UPDATE payment_submissions SET status='approved', reviewed_at=NOW(), rejection_reason=NULL WHERE id=${contributionId}`

      const [participant] = await sql`SELECT * FROM participants WHERE email=${contribution.participant_email}`
      const currentBalance = Number(participant?.account_balance || 0)
      const currentEarnings = Number(participant?.total_earnings || 0)
      const creditAmount = Math.round(Number(contribution.amount) * 1.8 * 100) / 100

      await sql`
        UPDATE participants SET
          account_balance = ${currentBalance + creditAmount},
          total_earnings = ${currentEarnings + creditAmount},
          next_contribution_date = NOW() + INTERVAL '30 days'
        WHERE email = ${contribution.participant_email}
      `

      if (contribution.matched_payout_id) {
        await sql`UPDATE payout_requests SET status='completed', processed_at=NOW() WHERE id=${contribution.matched_payout_id}`
      }

      await sql`
        INSERT INTO transactions (participant_id, participant_email, type, amount, balance_before, balance_after, status, reference_id, description)
        VALUES (${contribution.participant_id}, ${contribution.participant_email}, 'p2p_contribution_reward',
          ${creditAmount}, ${currentBalance}, ${currentBalance + creditAmount}, 'completed', ${contributionId},
          'P2P contribution approved — reward credited')
      `

      // Referral reward — $5 to referrer on first completed cycle only
      if (participant?.referred_by && !participant?.referral_contribution_rewarded) {
        const [referrer] = await sql`SELECT * FROM participants WHERE referral_code=${participant.referred_by}`
        if (referrer) {
          const rBal = Number(referrer.account_balance || 0)
          const rEarn = Number(referrer.total_earnings || 0)
          await sql`UPDATE participants SET account_balance=${rBal + 5}, total_earnings=${rEarn + 5} WHERE id=${referrer.id}`
          await sql`UPDATE participants SET referral_contribution_rewarded=true WHERE email=${contribution.participant_email}`
          await sql`
            INSERT INTO transactions (participant_id, participant_email, type, amount, balance_before, balance_after, status, reference_id, description)
            VALUES (${referrer.id}, ${referrer.email}, 'referral_reward', 5, ${rBal}, ${rBal + 5}, 'completed', ${contributionId},
              ${'Referral reward — ' + contribution.participant_email + ' completed first contribution cycle'})
          `
          await sql`
            INSERT INTO notifications (user_email, type, title, message)
            VALUES (${referrer.email}, 'success', 'Referral Reward Earned',
              ${'Your referral (' + contribution.participant_email + ') completed their first contribution cycle. $5 credited.'})
          `
        }
      }

      await sql`
        INSERT INTO notifications (user_email, type, title, message)
        VALUES (${contribution.participant_email}, 'success', 'Contribution Approved',
          ${'Your P2P contribution of $' + contribution.amount + ' was verified. $' + creditAmount + ' has been credited to your account.'})
      `
    } else {
      await sql`
        UPDATE payment_submissions SET status='rejected', reviewed_at=NOW(), rejection_reason=${reason || "Rejected by admin"}
        WHERE id=${contributionId}
      `
      if (contribution.matched_payout_id) {
        await sql`UPDATE payout_requests SET matched_contribution_id=NULL, status='pending' WHERE id=${contribution.matched_payout_id}`
      }
      await sql`
        INSERT INTO notifications (user_email, type, title, message)
        VALUES (${contribution.participant_email}, 'error', 'Contribution Rejected',
          ${'Your P2P contribution was rejected. Reason: ' + (reason || "Invalid payment proof") + '. Please try again.'})
      `
    }

    await sql`
      INSERT INTO activity_logs (actor_email, action, target_type, details)
      VALUES ('admin', ${action === "approve" ? "p2p_contribution_approved" : "p2p_contribution_rejected"},
        'payment_submission', ${JSON.stringify({ contributionId, reason })})
    `

    return NextResponse.json({
      success: true,
      message: action === "approve"
        ? "Contribution approved. Reward credited to contributor."
        : "Contribution rejected. Payout unlinked and made available again.",
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
