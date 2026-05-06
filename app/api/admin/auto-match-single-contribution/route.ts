import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { getPool } from "@/lib/db"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { contributionId, participantEmail } = await request.json()
    if (!contributionId || !participantEmail) {
      return NextResponse.json({ error: "Missing contributionId or participantEmail" }, { status: 400 })
    }
    const db = getPool()!
    const contribRes = await db.query("SELECT id, status, matched_payout_id FROM payment_submissions WHERE id = $1", [contributionId])
    if (!contribRes.rows.length) {
      return NextResponse.json({ error: "Contribution not found", success: false }, { status: 404 })
    }
    const contribution = contribRes[0]
    if (contribution.matched_payout_id) {
      return NextResponse.json({ success: true, message: "Contribution already matched", alreadyMatched: true })
    }
    if (contribution.status !== "approved") {
      return NextResponse.json({ success: true, message: "Contribution not yet approved, skipping auto-match", notApproved: true })
    }

    const payoutRes = await db.query(
      "SELECT id FROM payout_requests WHERE participant_email = $1 AND status = 'pending' AND matched_payout_id IS NULL ORDER BY created_at ASC LIMIT 1",
      [participantEmail]
    )
    if (!payoutRes.rows.length) {
      return NextResponse.json({ success: true, message: "No pending payout found", matched: false })
    }
    const payout = payoutRes[0]

    await db.query("UPDATE payment_submissions SET matched_payout_id = $1, matched_at = NOW() WHERE id = $2", [payout.id, contributionId])
    await db.query("UPDATE payout_requests SET status = 'in_process', matched_at = NOW() WHERE id = $1", [payout.id])
    await db.query(
      "INSERT INTO notifications (user_email, type, title, message) VALUES ($1,'success','Contribution Auto-Matched',$2)",
      [participantEmail, "Your contribution has been automatically matched with a payout request. Processing in progress."]
    )
    await db.query(
      "INSERT INTO activity_logs (actor_email, action, details, target_type) VALUES ('system','auto_match_contribution_30min',$1,'payment_submission')",
      [`Auto-matched contribution ${contributionId} with payout ${payout.id}`]
    )

    return NextResponse.json({ success: true, message: "Contribution auto-matched successfully", matched: true, contributionId, payoutId: payout.id })
  } catch (error) {
    console.error("[v0] Error in auto-match single contribution:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
