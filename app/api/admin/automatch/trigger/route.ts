import { NextRequest, NextResponse } from "next/server"
import { processAutomatch } from "@/lib/websocket/automatch-server"
import { requireAdminSession } from "@/lib/auth-middleware"

/**
 * POST /api/admin/automatch/trigger
 * Manually trigger automatch — for admin use and testing.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    console.log("[v0] Manual automatch trigger called")
    const result = await processAutomatch()
    console.log("[v0] Manual automatch result:", result)

    return NextResponse.json({
      success: true,
      matched: result.matched,
      failed: result.failed,
      details: result.details || [],
      message: result.matched > 0
        ? `Matched ${result.matched} contribution(s) with payout(s)`
        : result.note || "No eligible pairs found at this time",
    })
  } catch (error) {
    console.error("[v0] Manual automatch trigger error:", error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
