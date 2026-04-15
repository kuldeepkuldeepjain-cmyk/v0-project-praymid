import { NextRequest, NextResponse } from "next/server"
import { processAutomatch } from "@/lib/websocket/automatch-server"

/**
 * Automatch Process API
 * 
 * Triggered by: External cron job (every 5 minutes)
 * Purpose: Find contributions ready for automatch (30 min old) and match with payouts
 * 
 * Request Headers:
 * - Authorization: Bearer {CRON_SECRET}
 */
export async function POST(request: NextRequest) {
  // Validate CRON_SECRET from Authorization header
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.AUTOMATCH_CRON_SECRET

  if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[v0] Unauthorized automatch process request")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log("[v0] Automatch process triggered by cron")

  try {
    const result = await processAutomatch()
    
    return NextResponse.json({
      success: true,
      matched: result.matched,
      timestamp: new Date().toISOString(),
      message: `Successfully matched ${result.matched} contribution(s) with payout(s)`,
    })
  } catch (error) {
    console.error("[v0] Automatch process failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET - Health check / debug info
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.AUTOMATCH_CRON_SECRET

  if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({
    status: "ok",
    message: "Automatch process API is running",
    timestamp: new Date().toISOString(),
  })
}
