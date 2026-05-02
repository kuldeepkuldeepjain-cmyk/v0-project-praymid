import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getAppUrl } from "@/lib/utils"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
    }

    const [user] = await sql`
      SELECT referral_code, referral_count, referral_earnings, username
      FROM participants WHERE email = ${email} LIMIT 1
    `

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    const referredUsers = await sql`
      SELECT username, email, created_at, is_active, account_balance
      FROM participants
      WHERE referred_by = ${user.referral_code}
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      success: true,
      referralCode: user.referral_code,
      referralCount: user.referral_count || 0,
      referralEarnings: user.referral_earnings || 0,
      referredUsers: referredUsers || [],
      referralLink: `${getAppUrl(request)}/participant/register?ref=${user.referral_code}`,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch referral data" }, { status: 500 })
  }
}
