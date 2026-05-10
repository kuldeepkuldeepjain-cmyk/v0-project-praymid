import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { getPool } from "@/lib/db"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { contributionId, payoutId } = await request.json()
    if (!contributionId || !payoutId) {
      return NextResponse.json({ error: "Missing contributionId or payoutId" }, { status: 400 })
    }
    const db = getPool()!

    // Verify contribution exists
    const contribRes = await db.query(
      "SELECT id, status, matched_payout_id, participant_email FROM payment_submissions WHERE id = $1",
      [contributionId]
    )
    if (!contribRes.rows.length) {
      return NextResponse.json({ error: "Contribution not found", success: false }, { status: 404 })
    }
    const contribution = contribRes.rows[0]

    if (contribution.matched_payout_id) {
      return NextResponse.json({ success: false, error: "Contribution already matched with a payout" }, { status: 400 })
    }

    // Verify payout exists and is pending
    const payoutRes = await db.query(
      "SELECT id, participant_email, amount, status FROM payout_requests WHERE id = $1",
      [payoutId]
    )
    if (!payoutRes.rows.length) {
      return NextResponse.json({ error: "Payout request not found", success: false }, { status: 404 })
    }
    const payout = payoutRes.rows[0]
    if (!["pending", "matched"].includes(payout.status)) {
      return NextResponse.json({ error: `Payout is already ${payout.status}`, success: false }, { status: 400 })
    }

    // Match: link contribution → payout, update both statuses
    await db.query(
      "UPDATE payment_submissions SET matched_payout_id = $1, status = 'in_process', matched_at = NOW() WHERE id = $2",
      [payoutId, contributionId]
    )
    await db.query(
      "UPDATE payout_requests SET status = 'matched', matched_at = NOW() WHERE id = $1",
      [payoutId]
    )

    // Notify contributor
    await db.query(
      "INSERT INTO notifications (user_email, type, title, message) VALUES ($1,'info','Contribution Matched',$2)",
      [contribution.participant_email, `Your $${payout.amount} contribution has been matched with a payout request. Please send the funds and submit proof.`]
    ).catch(() => {})

    // Notify payout requester
    await db.query(
      "INSERT INTO notifications (user_email, type, title, message) VALUES ($1,'info','Payout Being Processed',$2)",
      [payout.participant_email, `Your payout request of $${payout.amount} has been matched. A contributor will send you the funds shortly.`]
    ).catch(() => {})

    await db.query(
      "INSERT INTO activity_logs (actor_email, action, details, target_type) VALUES ('admin','manual_match_contribution',$1,'payment_submission')",
      [JSON.stringify({ contributionId, payoutId })]
    ).catch(() => {})

    return NextResponse.json({
      success: true,
      message: "Contribution matched with payout successfully",
      contributionId,
      payoutId,
    })
  } catch (error: any) {
    console.error("[auto-match-single-contribution] error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
