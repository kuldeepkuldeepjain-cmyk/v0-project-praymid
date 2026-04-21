import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { paymentSubmissionId, payoutRequestId, participantEmail } = await request.json()

    if (!paymentSubmissionId || !payoutRequestId || !participantEmail) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Fetch payment submission to verify it has payment proof
    const { data: paymentSubmission, error: fetchSubmissionError } = await supabase
      .from("payment_submissions")
      .select("id, status, screenshot_url, transaction_id")
      .eq("id", paymentSubmissionId)
      .single()

    if (fetchSubmissionError || !paymentSubmission) {
      return NextResponse.json({ success: false, error: "Payment submission not found" }, { status: 404 })
    }

    // 2. Verify payment proof exists (either screenshot or transaction ID)
    if (!paymentSubmission.screenshot_url && !paymentSubmission.transaction_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot approve contribution without payment proof. Contributor must submit either a transaction ID or screenshot.",
        },
        { status: 400 }
      )
    }

    // 3. Fetch current account balance
    const { data: participant, error: fetchError } = await supabase
      .from("participants")
      .select("id, account_balance")
      .eq("email", participantEmail)
      .single()

    if (fetchError || !participant) {
      return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
    }

    const newBalance = Number(participant.account_balance || 0) + 50
    
    // Set next contribution date to 30 days from now
    const nextContributionDate = new Date()
    nextContributionDate.setDate(nextContributionDate.getDate() + 30)

    // 4. Approve the payment submission
    const { error: submissionError } = await supabase
      .from("payment_submissions")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", paymentSubmissionId)

    if (submissionError) {
      return NextResponse.json({ success: false, error: "Failed to approve submission: " + submissionError.message }, { status: 500 })
    }

    // 5. Credit $50 to participant + mark contribution_approved + set 30-day cooldown
    const { error: participantError } = await supabase
      .from("participants")
      .update({
        account_balance: newBalance,
        contribution_approved: true,
        status: "active",
        is_active: true,
        activation_date: new Date().toISOString(),
        next_contribution_date: nextContributionDate.toISOString(),
      })
      .eq("email", participantEmail)

    if (participantError) {
      // Rollback submission status
      await supabase
        .from("payment_submissions")
        .update({ status: "pending" })
        .eq("id", paymentSubmissionId)
      return NextResponse.json({ success: false, error: "Failed to credit participant: " + participantError.message }, { status: 500 })
    }

    // 6. Mark payout request as completed
    const { error: payoutError } = await supabase
      .from("payout_requests")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
        admin_notes: "Completed via contribution approval",
      })
      .eq("id", payoutRequestId)

    if (payoutError) {
      console.error("Payout update error (non-fatal):", payoutError.message)
    }

    // 7. Send notification to participant
    await supabase.from("notifications").insert({
      user_email: participantEmail,
      type: "success",
      title: "Contribution Approved",
      message: `Your contribution has been approved. $50 has been credited to your account. Your payout request has been completed. Next contribution available after 30 days.`,
      read_status: false,
    })

    // 8. Log activity
    await supabase.from("activity_logs").insert({
      actor_email: "admin",
      action: "contribution_and_payout_approved",
      details: `Approved contribution for ${participantEmail}. Payment proof verified (${paymentSubmission.screenshot_url ? "screenshot" : "transaction ID"}). Credited $50. Payout request #${payoutRequestId} completed.`,
      target_type: "payment_submission",
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: "Contribution approved and payout completed",
      newBalance,
    })
  } catch (error) {
    console.error("Approve-contribution-payout error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
