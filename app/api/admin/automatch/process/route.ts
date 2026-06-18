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
  return NextResponse.json({ 
    success: false, 
    error: "Auto-match feature has been disabled",
    message: "Payout-contribution automatch is currently disabled. Please use manual matching instead."
  }, { status: 403 })
}

/**
 * GET - Health check / debug info
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "disabled",
    message: "Automatch process has been disabled",
    timestamp: new Date().toISOString(),
  }, { status: 403 })
}
