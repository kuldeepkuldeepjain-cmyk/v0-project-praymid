import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const db = getPool()!
    const { contributionId, action, reason } = await request.json()
    if (!contributionId || !action) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    const contribRes = await db.query("SELECT * FROM payment_submissions WHERE id = $1", [contributionId])
    if (!contribRes.rows.length) {
      return NextResponse.json({ success: false, error: "Contribution not found" }, { status: 404 })
    }
    const contribution = contribRes[0]

    const allowedStatuses = action === "approve" ? ["proof_submitted"] : ["proof_submitted", "in_process"]
    if (!allowedStatuses.includes(contribution.status)) {
      return NextResponse.json({
        success: false,
        error: `Cannot ${action} a contribution with status "${contribution.status}".`,
        alreadyProcessed: ["approved", "rejected"].includes(contribution.status),
      }, { status: 400 })
    }

    await db.query(
      "UPDATE payment_submissions SET status = $1, reviewed_at = NOW(), rejection_reason = $2 WHERE id = $3",
      [action === "approve" ? "approved" : "rejected", action === "reject" ? (reason || "Rejected by admin") : null, contributionId]
    )

    if (action === "approve") {
      const pRes = await db.query(
        "SELECT id, account_balance, total_earnings, referred_by FROM participants WHERE email = $1",
        [contribution.participant_email]
      )
      const participant = pRes[0]
      if (participant) {
        const currentBalance = Number(participant.account_balance || 0)
        const currentEarnings = Number(participant.total_earnings || 0)
        const creditAmount = Math.round(Number(contribution.amount) * 1.5 * 100) / 100

        await db.query(
          "UPDATE participants SET account_balance = $1, total_earnings = $2, updated_at = NOW() WHERE email = $3",
          [currentBalance + creditAmount, currentEarnings + creditAmount, contribution.participant_email]
        )

        if (contribution.matched_payout_id) {
          await db.query("UPDATE payout_requests SET status = 'completed', processed_at = NOW() WHERE id = $1", [contribution.matched_payout_id])
        }

        await db.query(
          "INSERT INTO transactions (participant_id, participant_email, type, amount, balance_before, balance_after, status, reference_id, description) VALUES ($1,$2,$3,$4,$5,$6,'completed',$7,$8)",
          [participant.id, contribution.participant_email, "p2p_contribution_reward", creditAmount, currentBalance, currentBalance + creditAmount, contributionId, "P2P contribution approved — reward credited"]
        )

        await db.query(
          "INSERT INTO notifications (user_email, type, title, message) VALUES ($1,'success','Contribution Approved',$2)",
          [contribution.participant_email, `Your P2P contribution of $${contribution.amount} has been verified. $${creditAmount} has been credited to your account.`]
        )
      }
    } else {
      await db.query(
        "INSERT INTO notifications (user_email, type, title, message) VALUES ($1,'error','Contribution Rejected',$2)",
        [contribution.participant_email, `Your P2P contribution was rejected. Reason: ${reason || "Invalid payment proof"}. Please try again.`]
      )
      if (contribution.matched_payout_id) {
        await db.query("UPDATE payout_requests SET status = 'pending' WHERE id = $1", [contribution.matched_payout_id])
      }
    }

    await db.query(
      "INSERT INTO activity_logs (actor_email, action, target_type, details) VALUES ($1,$2,'payment_submission',$3)",
      ["admin", action === "approve" ? "p2p_contribution_approved" : "p2p_contribution_rejected", JSON.stringify({ contributionId, reason })]
    )

    return NextResponse.json({
      success: true,
      message: action === "approve" ? "Contribution approved and reward credited." : "Contribution rejected.",
    })
  } catch (err: any) {
    console.error("[p2p-contributions API] error:", err)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
