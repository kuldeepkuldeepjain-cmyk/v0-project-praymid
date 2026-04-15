import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/admin/automatch/status
 * 
 * Monitoring endpoint for automatch system health
 * Returns statistics on pending contributions, available payouts, and recent matches
 * 
 * Query params:
 * - token: Authorization token (must match AUTOMATCH_CRON_SECRET)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const token = request.nextUrl.searchParams.get("token")
    const cronSecret = process.env.AUTOMATCH_CRON_SECRET

    if (!cronSecret || token !== cronSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    const now = new Date()
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)

    // 1. Count pending contributions eligible for automatch
    const { data: pendingCount } = await supabase
      .from("payment_submissions")
      .select("id", { count: "exact" })
      .eq("status", "pending")
      .lte("created_at", thirtyMinutesAgo.toISOString())

    // 2. Count contributions in progress (recently matched)
    const { data: inProgressCount } = await supabase
      .from("payment_submissions")
      .select("id", { count: "exact" })
      .eq("status", "in_process")
      .gte("matched_at", new Date(now.getTime() - 5 * 60 * 1000).toISOString())

    // 3. Count available payouts
    const { data: availablePayouts } = await supabase
      .from("payout_requests")
      .select("id", { count: "exact" })
      .eq("status", "request_pending")

    // 4. Get recent matches (last 10)
    const { data: recentMatches } = await supabase
      .from("payment_submissions")
      .select(
        "id, amount, matched_at, matched_payout_id, participant_email"
      )
      .eq("status", "in_process")
      .order("matched_at", { ascending: false })
      .limit(10)

    // 5. Calculate efficiency metrics
    const totalContributions = (pendingCount?.length || 0) + (inProgressCount?.length || 0)
    const matchRate = totalContributions > 0 ? (inProgressCount?.length || 0) / totalContributions : 0
    const availablePayoutCount = availablePayouts?.length || 0

    return NextResponse.json({
      status: "ok",
      timestamp: now.toISOString(),
      metrics: {
        pendingEligible: pendingCount?.length || 0,
        recentlyMatched: inProgressCount?.length || 0,
        availablePayouts: availablePayoutCount,
        matchRate: Math.round(matchRate * 100),
        system_health: availablePayoutCount > 0 ? "healthy" : "warning",
      },
      recentMatches: recentMatches?.map((m) => ({
        contributionId: m.id,
        amount: m.amount,
        matchedAt: m.matched_at,
        participantEmail: m.participant_email,
      })) || [],
      recommendations: [
        ...(availablePayoutCount === 0 ? ["No payouts available - contributions will wait for next cycle"] : []),
        ...(pendingCount && pendingCount.length > 20 ? ["High volume of pending contributions - consider increasing match frequency"] : []),
      ],
    })
  } catch (error) {
    console.error("[v0] Automatch status error:", error)
    return NextResponse.json(
      { error: "Failed to retrieve automatch status", details: String(error) },
      { status: 500 }
    )
  }
}
