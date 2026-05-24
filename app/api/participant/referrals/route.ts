import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { getAppUrl } from "@/lib/utils"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    if (!email) return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })

    const db = getPool()!
    const { rows } = await db.query(
      "SELECT referral_code, total_referrals, referral_earnings FROM participants WHERE email = $1", [email]
    )
    const userData = rows[0]
    if (!userData) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })

    const { rows: referredUsers } = await db.query(
      `SELECT username, email, created_at, is_active, account_balance,
              CASE WHEN EXISTS (SELECT 1 FROM referral_bonuses rb WHERE rb.referred_email = participants.email) 
                   THEN true ELSE false END AS bonus_given
       FROM participants WHERE referred_by = $1 ORDER BY created_at DESC`,
      [userData.referral_code]
    )

    return NextResponse.json({
      success: true,
      referralCode: userData.referral_code,
      referralCount: userData.total_referrals || 0,
      referralEarnings: Number(userData.referral_earnings) || 0,
      referredUsers: referredUsers || [],
      referralLink: `https://flowchain.club/register?ref=${userData.referral_code}`,
    })
  } catch (error) {
    console.error("[v0] Referrals API error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch referral data" }, { status: 500 })
  }
}
