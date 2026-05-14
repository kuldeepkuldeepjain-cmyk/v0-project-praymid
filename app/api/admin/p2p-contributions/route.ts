import { type NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
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

    const contribRows = await query("SELECT * FROM payment_submissions WHERE id = $1", [contributionId]) as any[]
    if (contribRows.length === 0) {
      return NextResponse.json({ success: false, error: "Contribution not found" }, { status: 404 })
    }
    const contribution = contribRows[0]

    const allowedStatuses = action === "approve"
      ? ["proof_submitted", "in_process", "pending"]
      : ["proof_submitted", "in_process", "pending"]
    if (!allowedStatuses.includes(contribution.status)) {
      return NextResponse.json({
        success: false,
        error: `Cannot ${action} a contribution with status "${contribution.status}".`,
        alreadyProcessed: ["approved", "rejected"].includes(contribution.status),
      }, { status: 400 })
    }

    await execute(
      "UPDATE payment_submissions SET status = $1, reviewed_at = NOW(), rejection_reason = $2 WHERE id = $3",
      [action === "approve" ? "approved" : "rejected", action === "reject" ? (reason || "Rejected by admin") : null, contributionId]
    )

    if (action === "approve") {
      const pRows = await query(
        "SELECT id, account_balance, total_earnings, next_contribution_date FROM participants WHERE email = $1",
        [contribution.participant_email]
      ) as any[]
      const participant = pRows[0]
      if (participant) {
        // Check cooldown before approving
        if (participant.next_contribution_date) {
          const cooldownUntil = new Date(participant.next_contribution_date)
          if (cooldownUntil > new Date()) {
            const daysLeft = Math.ceil((cooldownUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            console.log(`[v0] Cannot approve P2P contribution for ${contribution.participant_email}: cooldown active, ${daysLeft} days remaining`)
            return NextResponse.json({
              success: false,
              error: `Participant is on cooldown. Next contribution available in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
              cooldown: true,
              days_remaining: daysLeft,
            }, { status: 429 })
          }
        }

        const currentBalance = Number(participant.account_balance || 0)
        const currentEarnings = Number(participant.total_earnings || 0)
        const creditAmount = Math.round(Number(contribution.amount) * 1.5 * 100) / 100

        // Calculate next contribution date (30 days from now)
        const nextContributionDate = new Date()
        nextContributionDate.setDate(nextContributionDate.getDate() + 30)

        await execute(
          "UPDATE participants SET account_balance = $1, total_earnings = $2, next_contribution_date = $3 WHERE email = $4",
          [currentBalance + creditAmount, currentEarnings + creditAmount, nextContributionDate.toISOString(), contribution.participant_email]
        )

        if (contribution.matched_payout_id) {
          await execute("UPDATE payout_requests SET status = 'completed', processed_at = NOW() WHERE id = $1", [contribution.matched_payout_id])
        }

        await execute(
          "INSERT INTO transactions (participant_id, participant_email, type, amount, balance_before, balance_after, status, reference_id, description) VALUES ($1,$2,$3,$4,$5,$6,'completed',$7,$8)",
          [participant.id, contribution.participant_email, "p2p_contribution_reward", creditAmount, currentBalance, currentBalance + creditAmount, contributionId, "P2P contribution approved — reward credited"]
        )

        const notifDate = nextContributionDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        await execute(
          "INSERT INTO notifications (user_email, type, title, message) VALUES ($1,'success','Contribution Approved',$2)",
          [contribution.participant_email, `Your P2P contribution of $${contribution.amount} has been verified. $${creditAmount} has been credited to your account. Your next contribution will be available on ${notifDate}.`]
        )
      }
    } else {
      await execute(
        "INSERT INTO notifications (user_email, type, title, message) VALUES ($1,'error','Contribution Rejected',$2)",
        [contribution.participant_email, `Your P2P contribution was rejected. Reason: ${reason || "Invalid payment proof"}. Please try again.`]
      )
      if (contribution.matched_payout_id) {
        await execute("UPDATE payout_requests SET status = 'pending' WHERE id = $1", [contribution.matched_payout_id])
      }
    }

    await execute(
      "INSERT INTO activity_logs (actor_email, action, target_type, details) VALUES ($1,$2,'payment_submission',$3)",
      ["admin", action === "approve" ? "p2p_contribution_approved" : "p2p_contribution_rejected", JSON.stringify({ contributionId, reason })]
    )

    return NextResponse.json({
      success: true,
      message: action === "approve" ? "Contribution approved and reward credited." : "Contribution rejected.",
    })
  } catch (err: any) {
    console.error("[p2p-contributions] error:", err)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
