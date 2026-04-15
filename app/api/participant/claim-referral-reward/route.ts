import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireParticipantSession } from "@/lib/auth-middleware"

const REFERRAL_TARGET = 50
const REWARD_AMOUNT = 20

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { email, userId } = await request.json()

    if (!email || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    console.log("[v0] Checking referral reward eligibility for", email)

    const supabase = await createClient()

    // Check if already claimed
    const { data: participant } = await supabase
      .from("participants")
      .select("account_balance")
      .eq("email", email)
      .single()

    if (!participant) {
      return NextResponse.json(
        { success: false, error: "Participant not found" },
        { status: 404 }
      )
    }

    // Count joined invites
    const { data: invites, error: inviteError } = await supabase
      .from("invite_logs")
      .select("*")
      .eq("participant_id", userId)
      .eq("invite_method", "app_share")

    if (inviteError) {
      console.error("[v0] Error fetching invite logs:", inviteError)
      return NextResponse.json(
        { success: false, error: inviteError.message },
        { status: 500 }
      )
    }

    const joinedCount = invites?.length || 0
    console.log("[v0] Joined count:", joinedCount)

    if (joinedCount < REFERRAL_TARGET) {
      return NextResponse.json(
        { success: false, error: `Only ${joinedCount}/${REFERRAL_TARGET} referrals joined` },
        { status: 400 }
      )
    }

    // Credit wallet
    const newBalance = participant.account_balance + REWARD_AMOUNT

    const { error: updateError } = await supabase
      .from("participants")
      .update({
        account_balance: newBalance,
      })
      .eq("email", email)

    if (updateError) {
      console.error("[v0] Error updating wallet:", updateError)
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    // Log transaction
    await supabase.from("transactions").insert({
      participant_email: email,
      type: "credit",
      amount: REWARD_AMOUNT,
      description: `Referral reward - ${REFERRAL_TARGET} friends joined`,
      balance_before: participant.account_balance,
      balance_after: newBalance,
      reference_id: `ref-reward-${userId}`,
    })

    // Log activity
    await supabase.from("activity_logs").insert({
      actor_email: email,
      actor_id: userId,
      action: "referral_reward_claimed",
      details: `Claimed $${REWARD_AMOUNT} referral reward for ${REFERRAL_TARGET} successful referrals`,
      target_type: "referral_reward",
    })

    console.log("[v0] Referral reward credited:", REWARD_AMOUNT, "USDT")

    return NextResponse.json({
      success: true,
      amount: REWARD_AMOUNT,
      newBalance,
    })
  } catch (error) {
    console.error("[v0] Claim reward error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
