import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")
    const cronSecret = process.env.AUTOMATCH_CRON_SECRET
    if (!cronSecret || token !== cronSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const now = new Date()
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()

    const [pending, inProgress, availablePayouts, recentMatches] = await Promise.all([
      sql`SELECT COUNT(*)::int AS count FROM payment_submissions WHERE status = 'pending' AND created_at <= ${thirtyMinutesAgo}`,
      sql`SELECT COUNT(*)::int AS count FROM payment_submissions WHERE status = 'in_process' AND matched_at >= ${fiveMinutesAgo}`,
      sql`SELECT COUNT(*)::int AS count FROM payout_requests WHERE status = 'request_pending'`,
      sql`SELECT id, amount, matched_at, matched_payout_id, participant_email FROM payment_submissions WHERE status = 'in_process' ORDER BY matched_at DESC LIMIT 10`,
    ])

    const pendingCount = pending[0]?.count || 0
    const inProgressCount = inProgress[0]?.count || 0
    const availablePayoutCount = availablePayouts[0]?.count || 0
    const total = pendingCount + inProgressCount
    const matchRate = total > 0 ? Math.round((inProgressCount / total) * 100) : 0

    return NextResponse.json({
      status: "ok",
      timestamp: now.toISOString(),
      metrics: { pendingEligible: pendingCount, recentlyMatched: inProgressCount, availablePayouts: availablePayoutCount, matchRate, system_health: availablePayoutCount > 0 ? "healthy" : "warning" },
      recentMatches: recentMatches.map((m: any) => ({ contributionId: m.id, amount: m.amount, matchedAt: m.matched_at, participantEmail: m.participant_email })),
      recommendations: [
        ...(availablePayoutCount === 0 ? ["No payouts available - contributions will wait"] : []),
        ...(pendingCount > 20 ? ["High volume of pending contributions"] : []),
      ],
    })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to retrieve automatch status", details: String(error) }, { status: 500 })
  }
}
