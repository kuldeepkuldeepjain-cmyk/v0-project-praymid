import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const supabase = await createClient()
    const { paymentId, amount, email } = await request.json()

    console.log("[v0] Redirecting activation payment to new user:", { paymentId, amount, email })

    // Get the next newly created participant (most recent)
    const { data: nextParticipant, error: participantError } = await supabase
      .from("participants")
      .select("id, email, username, account_balance")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (participantError || !nextParticipant) {
      console.error("[v0] No participants found:", participantError)
      return NextResponse.json({ success: false, error: "No participants available to redirect to" }, { status: 404 })
    }

    console.log("[v0] Found next participant:", nextParticipant.username)

    // Credit the amount to the new participant's account
    const newBalance = Number(nextParticipant.account_balance || 0) + Number(amount)
    
    const { error: updateError } = await supabase
      .from("participants")
      .update({ account_balance: newBalance })
      .eq("id", nextParticipant.id)

    if (updateError) {
      console.error("[v0] Error updating participant balance:", updateError)
      return NextResponse.json({ success: false, error: "Failed to credit participant" }, { status: 500 })
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from("transactions")
      .insert({
        participant_email: nextParticipant.email,
        type: "contribution_redirect",
        amount: Number(amount),
        description: `Redirected activation payment from ${email} for contribution`,
      })

    if (transactionError) {
      console.error("[v0] Error creating transaction:", transactionError)
    }

    // Mark the original payment as redirected (update payment_submissions)
    const { error: paymentUpdateError } = await supabase
      .from("payment_submissions")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", paymentId)

    if (paymentUpdateError) {
      console.error("[v0] Error updating payment status:", paymentUpdateError)
    }

    // Create notification for the recipient
    const { error: notifError } = await supabase.from("notifications").insert({
      user_email: nextParticipant.email,
      type: "success",
      title: "Contribution Funds Received",
      message: `You received $${amount} in contribution funds from a redirected activation payment. This can be used for making contributions.`,
      read_status: false,
    })
    
    if (notifError) {
      console.error("[v0] Error creating notification:", notifError)
    }

    console.log("[v0] Successfully redirected activation payment to", nextParticipant.username)

    return NextResponse.json({
      success: true,
      message: `Activation payment redirected to ${nextParticipant.username}`,
      recipientName: nextParticipant.username,
      recipientEmail: nextParticipant.email,
      amount: amount,
    })
  } catch (error) {
    console.error("[v0] Error in redirect activation API:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
