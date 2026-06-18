import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    if (!email) return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })

    const rows = await query(
      "SELECT referral_code, total_referrals, referral_earnings, referral_count, username FROM participants WHERE email = $1",
      [email.toLowerCase().trim()]
    )
    const userData = rows[0]
    if (!userData) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })

    const referredUsers = await query(
      `SELECT username, email, created_at, is_active, account_balance
       FROM participants WHERE referred_by = $1 ORDER BY created_at DESC`,
      [userData.referral_code]
    )

    return NextResponse.json({
      success: true,
      referralCode: userData.referral_code,
      referralCount: Number(userData.referral_count || userData.total_referrals || 0),
      referralEarnings: Number(userData.referral_earnings) || 0,
      referredUsers: referredUsers || [],
      referralLink: `https://flowchain.club/register?ref=${userData.referral_code}`,
    })
  } catch (error) {
    console.error("[v0] Referrals API error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch referral data" }, { status: 500 })
  }
}
