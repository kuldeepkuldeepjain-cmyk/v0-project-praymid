import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export { POST } from "./submit/route"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    const topups = await query(
      `SELECT id, amount, transaction_id, payment_method, status, created_at, reviewed_at
       FROM topup_requests WHERE participant_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [auth.participantId],
    )
    return NextResponse.json({ success: true, topups })
  } catch (error) {
    console.error("[topup] GET error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
