import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAppUrl } from "@/lib/utils"
import { requireParticipantSession } from "@/lib/auth-middleware"

// GET endpoint to fetch user's referral data
export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get user's referral code and stats
    const { data: userData, error: userError } = await supabase
      .from("participants")
      .select("referral_code, referral_count, referral_earnings, username")
      .eq("email", email)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Get list of referred users
    const { data: referredUsers, error: referredError } = await supabase
      .from("participants")
      .select("username, email, created_at, is_active, account_balance")
      .eq("referred_by", userData.referral_code)
      .order("created_at", { ascending: false })

    if (referredError) {
      console.error("[v0] Error fetching referred users:", referredError)
    }

    return NextResponse.json({
      success: true,
      referralCode: userData.referral_code,
      referralCount: userData.referral_count || 0,
      referralEarnings: userData.referral_earnings || 0,
      referredUsers: referredUsers || [],
      referralLink: `${getAppUrl(request)}/participant/register?ref=${userData.referral_code}`,
    })
  } catch (error) {
    console.error("[v0] Referrals API error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch referral data" }, { status: 500 })
  }
}
