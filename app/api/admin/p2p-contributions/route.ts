import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const supabase = await createClient()
    const { contributionId, action, reason } = await request.json()

    if (!contributionId || !action) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    // Fetch the contribution with its matched payout
    const { data: contribution, error: fetchError } = await supabase
      .from("payment_submissions")
      .select("*")
      .eq("id", contributionId)
      .single()

    if (fetchError || !contribution) {
      return NextResponse.json({ success: false, error: "Contribution not found" }, { status: 404 })
    }

    // Only allow action on proof_submitted status (or in_process for reject)
    const allowedStatuses = action === "approve"
      ? ["proof_submitted"]
      : ["proof_submitted", "in_process"]

    if (!allowedStatuses.includes(contribution.status)) {
      return NextResponse.json({
        success: false,
        error: `Cannot ${action} a contribution with status "${contribution.status}".`,
        alreadyProcessed: ["approved", "rejected"].includes(contribution.status),
      }, { status: 400 })
    }

    // Atomically update the contribution status
    const { error: updateError } = await supabase
      .from("payment_submissions")
      .update({
        status: action === "approve" ? "approved" : "rejected",
        reviewed_at: new Date().toISOString(),
        rejection_reason: action === "reject" ? (reason || "Rejected by admin") : null,
      })
      .eq("id", contributionId)
      .in("status", allowedStatuses)

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    if (action === "approve") {
      // 1. Fetch contributor record (need referred_by + referral_contribution_rewarded flag)
      const { data: participant } = await supabase
        .from("participants")
        .select("id, account_balance, total_earnings, referred_by, referral_contribution_rewarded")
        .eq("email", contribution.participant_email)
        .single()

      const currentBalance = Number(participant?.account_balance || 0)
      const currentEarnings = Number(participant?.total_earnings || 0)
      // Reward is always 0.5× the contributed amount (works for all plans)
      const creditAmount = Math.round(Number(contribution.amount) * 0.5 * 100) / 100

      // 2. Credit contributor +$50 and set next_contribution_date
      await supabase
        .from("participants")
        .update({
          account_balance: currentBalance + creditAmount,
          total_earnings: currentEarnings + creditAmount,
          next_contribution_date: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .eq("email", contribution.participant_email)

      // 3. Mark the matched payout as completed
      if (contribution.matched_payout_id) {
        await supabase
          .from("payout_requests")
          .update({ status: "completed", processed_at: new Date().toISOString() })
          .eq("id", contribution.matched_payout_id)
      }

      // 4. Record contributor transaction
      await supabase.from("transactions").insert({
        participant_id: contribution.participant_id,
        participant_email: contribution.participant_email,
        type: "p2p_contribution_reward",
        amount: creditAmount,
        balance_before: currentBalance,
        balance_after: currentBalance + creditAmount,
        status: "completed",
        reference_id: contributionId,
        description: "P2P contribution approved — reward credited",
      })

      // 5. Referral reward — $5 to referrer, but ONLY on first completed contribution cycle
      // Guard: referral_contribution_rewarded must still be false (prevents double-pay)
      if (participant?.referred_by && !participant?.referral_contribution_rewarded) {
        const { data: referrer } = await supabase
          .from("participants")
          .select("id, account_balance, total_earnings, email")
          .eq("referral_code", participant.referred_by)
          .maybeSingle()

        if (referrer) {
          const referrerBalance = Number(referrer.account_balance || 0)
          const referrerEarnings = Number(referrer.total_earnings || 0)
          const referralBonus = 5

          // Credit referrer +$5
          await supabase
            .from("participants")
            .update({
              account_balance: referrerBalance + referralBonus,
              total_earnings: referrerEarnings + referralBonus,
            })
            .eq("id", referrer.id)

          // Flip the flag so this referrer can never be double-paid for this participant
          await supabase
            .from("participants")
            .update({ referral_contribution_rewarded: true })
            .eq("email", contribution.participant_email)

          // Transaction record for referrer
          await supabase.from("transactions").insert({
            participant_id: referrer.id,
            participant_email: referrer.email,
            type: "referral_reward",
            amount: referralBonus,
            balance_before: referrerBalance,
            balance_after: referrerBalance + referralBonus,
            status: "completed",
            reference_id: contributionId,
            description: `Referral reward — ${contribution.participant_email} completed their first contribution cycle`,
          })

          // Notify referrer
          await supabase.from("notifications").insert({
            user_email: referrer.email,
            type: "success",
            title: "Referral Reward Earned",
            message: `Your referral (${contribution.participant_email}) has successfully completed their first contribution cycle. $${referralBonus} has been credited to your account.`,
            read_status: false,
          })
        }
      }

      // 6. Notify contributor
      await supabase.from("notifications").insert({
        user_email: contribution.participant_email,
        type: "success",
        title: "Contribution Approved",
        message: `Your P2P contribution of $${contribution.amount} has been verified. $${creditAmount} has been credited to your account.`,
        read_status: false,
      })
    } else {
      // Notify contributor of rejection
      await supabase.from("notifications").insert({
        user_email: contribution.participant_email,
        type: "error",
        title: "Contribution Rejected",
        message: `Your P2P contribution was rejected. Reason: ${reason || "Invalid payment proof"}. Please try again.`,
        read_status: false,
      })

      // Unlink the matched payout so it becomes available again
      if (contribution.matched_payout_id) {
        await supabase
          .from("payout_requests")
          .update({ matched_contribution_id: null, status: "pending" })
          .eq("id", contribution.matched_payout_id)
      }
    }

    // Audit log
    await supabase.from("activity_logs").insert({
      actor_email: "admin",
      action: action === "approve" ? "p2p_contribution_approved" : "p2p_contribution_rejected",
      target_type: "payment_submission",
      details: JSON.stringify({ contributionId, reason }),
    })

    return NextResponse.json({
      success: true,
      message: action === "approve"
        ? "Contribution approved. $180 credited to contributor."
        : "Contribution rejected. Payout unlinked and made available again.",
    })
  } catch (err: any) {
    console.error("[p2p-contributions API] error:", err)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
