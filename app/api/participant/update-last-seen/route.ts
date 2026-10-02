import { NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    // The signed participant session is the source of truth; do not trust a
    // client-supplied email for activity ownership.
    await execute("UPDATE participants SET last_seen = NOW() WHERE LOWER(email) = LOWER($1)", [auth.email])
    await execute(
      `UPDATE participant_sessions
       SET last_activity = NOW()
       WHERE LOWER(participant_email) = LOWER($1)
         AND participant_id = $2
         AND is_active = TRUE`,
      [auth.email, auth.participantId],
    )

    return NextResponse.json({ success: true, message: "Activity updated" })
  } catch (error: any) {
    console.error("[v0] Update last seen error:", error.message || error)
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}
