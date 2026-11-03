import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET() {
  try {
    const session = await requireParticipantSession()
    if (!session.ok) return session.response

    const rows = await query(
      "SELECT referral_code, referral_earnings FROM participants WHERE id = $1 AND LOWER(email) = $2",
      [session.participantId, session.email.toLowerCase().trim()],
    )
    const participant = rows[0]
    if (!participant) return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 })

    const referralCode = String(participant.referral_code || "")
    const referredUsers = referralCode ? await query(
      "SELECT username, created_at FROM participants WHERE referred_by = $1 ORDER BY created_at DESC",
      [referralCode],
    ) : []

    return NextResponse.json({
      success: true,
      referralCode,
      referralCount: referredUsers.length,
      referralEarnings: Number(participant.referral_earnings) || 0,
      referredUsers,
      referralLink: referralCode ? `https://elitefund.sbs/register?ref=${encodeURIComponent(referralCode)}` : "",
    }, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    console.error("[v0] Referrals API error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch referral data" }, { status: 500 })
  }
}
