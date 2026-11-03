import { NextResponse } from "next/server"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST() {
  const session = await requireParticipantSession()
  if (!session.ok) return session.response

  return NextResponse.json({
    success: false,
    error: "Referral rewards are credited to your wallet automatically when a referral qualifies. No claim is needed.",
  }, { status: 409, headers: { "Cache-Control": "private, no-store" } })
}
