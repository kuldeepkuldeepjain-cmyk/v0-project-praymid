import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

// POST: Manually match a contribution with a payout
export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { contributionId, payoutId } = await request.json()
    if (!contributionId || !payoutId) {
      return NextResponse.json({ success: false, error: "contributionId and payoutId are required" }, { status: 400 })
    }

    const db = getPool()!

    // Verify contribution
    const contribRes = await db.query(
      `SELECT id, participant_email, amount, status, screenshot_url, transaction_id FROM payment_submissions WHERE id = $1`,
      [contributionId]
    )
    if (!contribRes.rows.length) {
      return NextResponse.json({ success: false, error: "Contribution not found" }, { status: 404 })
    }
    const contribution = contribRes.rows[0]
    if (contribution.status === "approved") {
      return NextResponse.json({ success: false, error: "Contribution is already approved" }, { status: 400 })
    }

    // Verify payout
    const payoutRes = await db.query(
      `SELECT id, participant_email, amount, status, wallet_address, serial_number FROM payout_requests WHERE id = $1`,
      [payoutId]
    )
    if (!payoutRes.rows.length) {
      return NextResponse.json({ success: false, error: "Payout request not found" }, { status: 404 })
    }
    const payout = payoutRes.rows[0]
    if (payout.status === "completed") {
      return NextResponse.json({ success: false, error: "Payout is already completed" }, { status: 400 })
    }

    // Approve contribution — credit participant balance
    const partRes = await db.query(
      `SELECT id, account_balance FROM participants WHERE email = $1`,
      [contribution.participant_email]
    )
    const participant = partRes.rows[0]
    if (!participant) {
      return NextResponse.json({ success: false, error: "Contribution participant not found" }, { status: 404 })
    }

    const newBalance = Number(participant.account_balance || 0) + 150
    const nextContributionDate = new Date()
    nextContributionDate.setDate(nextContributionDate.getDate() + 30)

    await db.query(
      `UPDATE payment_submissions SET status = 'approved', reviewed_at = NOW() WHERE id = $1`,
      [contributionId]
    )
    await db.query(
      `UPDATE participants SET account_balance = $1, status = 'active', is_active = true,
       activation_date = COALESCE(activation_date, NOW()), last_contribution_date = NOW(),
       next_contribution_date = $2 WHERE email = $3`,
      [newBalance, nextContributionDate.toISOString(), contribution.participant_email]
    )

    // Complete payout
    await db.query(
      `UPDATE payout_requests SET status = 'completed', processed_at = NOW(),
       admin_notes = $1 WHERE id = $2`,
      [`Manually matched with contribution #${contributionId} from ${contribution.participant_email}`, payoutId]
    )

    // Transactions
    await db.query(
      `INSERT INTO transactions (participant_email, participant_id, type, amount, balance_before, balance_after, status, description)
       VALUES ($1, $2, 'contribution_reward', 150, $3, $4, 'completed', 'Manual match: contribution approved, $150 credited')`,
      [contribution.participant_email, participant.id, participant.account_balance, newBalance]
    ).catch(() => {})

    // Notifications
    await db.query(
      `INSERT INTO notifications (user_email, type, title, message) VALUES ($1, 'success', 'Contribution Approved', $2)`,
      [contribution.participant_email, `Your contribution has been approved and $150 credited. Next contribution available on ${nextContributionDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}.`]
    ).catch(() => {})

    await db.query(
      `INSERT INTO notifications (user_email, type, title, message) VALUES ($1, 'success', 'Payout Completed', $2)`,
      [payout.participant_email, `Your payout request #${payout.serial_number} of $${payout.amount} has been completed.`]
    ).catch(() => {})

    // Activity log
    await db.query(
      `INSERT INTO activity_logs (actor_email, action, details, target_type) VALUES ('admin', 'manual_match_contribution_payout', $1, 'payment_submission')`,
      [`Manually matched contribution #${contributionId} (${contribution.participant_email}) with payout #${payoutId} (${payout.participant_email})`]
    ).catch(() => {})

    return NextResponse.json({
      success: true,
      message: `Contribution approved and payout #${payout.serial_number} completed`,
      contributionEmail: contribution.participant_email,
      payoutEmail: payout.participant_email,
      newBalance,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })
  }
}
