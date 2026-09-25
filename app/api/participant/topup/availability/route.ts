import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    const participants = await query(
      "SELECT id FROM participants WHERE LOWER(email) = $1 LIMIT 1",
      [auth.email.toLowerCase().trim()],
    ) as Array<{ id: string }>

    if (participants.length === 0) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    const requests = await query(
      "SELECT id FROM topup_requests WHERE participant_id = $1 LIMIT 1",
      [participants[0].id],
    ) as Array<{ id: string }>

    return NextResponse.json({
      success: true,
      fundedTierAvailable: requests.length === 0,
    })
  } catch (error) {
    console.error("Top-up availability check failed:", error)
    return NextResponse.json({ success: false, message: "Unable to check funding options" }, { status: 500 })
  }
}
