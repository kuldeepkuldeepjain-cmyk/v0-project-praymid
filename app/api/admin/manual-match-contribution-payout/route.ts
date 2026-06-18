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

    // Set contribution to 'in_process' and link matched_payout_id
    // so the contributor sees the payout details on their contribute page
    await db.query(
      `UPDATE payment_submissions 
       SET status = 'in_process', matched_payout_id = $1, matched_at = NOW(), reviewed_at = NOW()
       WHERE id = $2`,
      [payoutId, contributionId]
    )

    // Set payout to 'in_process' linked to this contribution
    await db.query(
      `UPDATE payout_requests 
       SET status = 'in_process', matched_contribution_id = $1, matched_at = NOW(),
       admin_notes = $2
       WHERE id = $3`,
      [contributionId, `Manually matched with contribution #${contributionId} from ${contribution.participant_email}`, payoutId]
    )

    // Notify contributor to send funds
    const payoutRecipientRows = await db.query(
      `SELECT full_name, mobile_number, bep20_address, wallet_address FROM participants WHERE email = $1`,
      [payout.participant_email]
    )
    const payoutRecipient = payoutRecipientRows.rows[0]

    await db.query(
      `INSERT INTO notifications (user_email, type, title, message)
       VALUES ($1, 'success', 'Contribution Matched — Send Payment', $2)`,
      [contribution.participant_email,
        `Your contribution has been matched! Please send $${payout.amount} to ${payoutRecipient?.full_name || payout.participant_email}. Wallet: ${payoutRecipient?.bep20_address || payoutRecipient?.wallet_address || payout.wallet_address || "See contribute page"}. Mobile: ${payoutRecipient?.mobile_number || "—"}.`]
    ).catch(() => {})

    // Notify payout requester that payment is coming
    await db.query(
      `INSERT INTO notifications (user_email, type, title, message)
       VALUES ($1, 'info', 'Payout In Process', $2)`,
      [payout.participant_email,
        `Your payout request #${payout.serial_number} of $${payout.amount} has been matched with a contributor. Payment is being processed.`]
    ).catch(() => {})

    // Activity log
    await db.query(
      `INSERT INTO activity_logs (actor_email, action, details, target_type)
       VALUES ('admin', 'manual_match_contribution_payout', $1, 'payment_submission')`,
      [`Matched contribution #${contributionId} (${contribution.participant_email}) → payout #${payoutId} (${payout.participant_email})`]
    ).catch(() => {})

    return NextResponse.json({
      success: true,
      message: `Contribution matched with payout #${payout.serial_number}. Contributor will see payout details on their contribute page.`,
      contributionEmail: contribution.participant_email,
      payoutEmail: payout.participant_email,
      payoutRecipient: {
        name: payoutRecipient?.full_name || payout.participant_email,
        mobile: payoutRecipient?.mobile_number || null,
        wallet: payoutRecipient?.bep20_address || payoutRecipient?.wallet_address || payout.wallet_address || null,
      }
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })
  }
}
