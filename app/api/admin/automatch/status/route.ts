import { NextRequest, NextResponse } from "next/server"
import { getServiceClient } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")
    const cronSecret = process.env.AUTOMATCH_CRON_SECRET
    if (!cronSecret || token !== cronSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const db = getServiceClient()
    const now = new Date()
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

    const [pendingRes, inProgressRes, availableRes, recentRes] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM payment_submissions WHERE status='pending' AND created_at<=$1`, [thirtyMinutesAgo.toISOString()]),
      db.query(`SELECT COUNT(*) FROM payment_submissions WHERE status='in_process' AND matched_at>=$1`, [fiveMinutesAgo.toISOString()]),
      db.query(`SELECT COUNT(*) FROM payout_requests WHERE status='request_pending'`),
      db.query(`SELECT id,amount,matched_at,matched_payout_id,participant_email FROM payment_submissions WHERE status='in_process' ORDER BY matched_at DESC LIMIT 10`),
    ])

    const pendingCount = parseInt(pendingRes.rows[0].count)
    const inProgressCount = parseInt(inProgressRes.rows[0].count)
    const availablePayoutCount = parseInt(availableRes.rows[0].count)
    const total = pendingCount + inProgressCount
    const matchRate = total > 0 ? inProgressCount / total : 0

    return NextResponse.json({
      status: "ok",
      timestamp: now.toISOString(),
      metrics: { pendingEligible: pendingCount, recentlyMatched: inProgressCount, availablePayouts: availablePayoutCount, matchRate: Math.round(matchRate * 100), system_health: availablePayoutCount > 0 ? "healthy" : "warning" },
      recentMatches: recentRes.rows.map((m: any) => ({ contributionId: m.id, amount: m.amount, matchedAt: m.matched_at, participantEmail: m.participant_email })),
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to retrieve automatch status", details: String(error) }, { status: 500 })
  }
}
