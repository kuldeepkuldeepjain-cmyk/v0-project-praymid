import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: "disabled",
    error: "Automatch feature has been disabled",
    message: "Payout-contribution automatch is currently disabled."
  }, { status: 403 })
}
