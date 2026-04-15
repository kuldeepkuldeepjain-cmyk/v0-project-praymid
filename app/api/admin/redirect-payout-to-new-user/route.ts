import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { payoutId, amount, adminNotes } = await request.json()

    console.log("[v0] Redirecting payout to new user:", { payoutId, amount })

    const supabase = await createClient()

    // Get the next newest participant (highest participant_number or most recent created_at)
    const { data: newParticipant, error: participantError } = await supabase
      .from("participants")
      .select("id, participant_number, username, full_name, email, account_balance")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (participantError || !newParticipant) {
      console.error("[v0] Error finding new participant:", participantError)
      return NextResponse.json(
        { success: false, error: "No new participant found to redirect payout" },
        { status: 404 }
      )
    }

    console.log("[v0] Redirecting to participant:", newParticipant.full_name)

    // Update the new participant's wallet balance
    const newBalance = Number(newParticipant.account_balance) + Number(amount)
    
    const { error: updateError } = await supabase
      .from("participants")
      .update({ 
        account_balance: newBalance,
      })
      .eq("id", newParticipant.id)

    if (updateError) {
      console.error("[v0] Error updating participant balance:", updateError)
      throw updateError
    }

    // Create transaction record
    const { error: txError } = await supabase
      .from("transactions")
      .insert({
        participant_email: newParticipant.email,
        type: "contribution_redirect",
        amount: amount,
        balance_before: newParticipant.account_balance,
        balance_after: newBalance,
        description: `Redirected payout from request #${payoutId} for contribution`,
        reference_id: `REDIRECT_${payoutId}`,
      })

    if (txError) {
      console.error("[v0] Error creating transaction:", txError)
    }

    // Update payout request status to completed with redirect note
    const { error: payoutUpdateError } = await supabase
      .from("payout_requests")
      .update({
        status: "completed",
        admin_notes: adminNotes + ` | Redirected to ${newParticipant.name} (#${newParticipant.participant_number})`,
        processed_at: new Date().toISOString(),
      })
      .eq("id", payoutId)

    if (payoutUpdateError) {
      console.error("[v0] Error updating payout request:", payoutUpdateError)
      throw payoutUpdateError
    }

    // Create audit log
    const { error: auditError } = await supabase
      .from("payout_audit_log")
      .insert({
        payout_id: payoutId,
        action: "redirect_to_new_user",
        old_status: "pending",
        new_status: "completed",
        changes: {
          redirected_to: newParticipant.name,
          redirected_to_id: newParticipant.id,
          amount: amount,
        },
      })

    if (auditError) {
      console.error("[v0] Error creating audit log:", auditError)
    }

    // Send notification to new participant
    const { error: notifError } = await supabase
      .from("notifications")
      .insert({
        user_email: newParticipant.email,
        type: "contribution_received",
        title: "Contribution Funds Received",
        message: `You have received $${amount} in contribution funds. Your new balance is $${newBalance.toFixed(2)}`,
      })

    if (notifError) {
      console.error("[v0] Error sending notification:", notifError)
    }

    return NextResponse.json({
      success: true,
      message: `Payout successfully redirected to ${newParticipant.name}`,
      recipientName: newParticipant.name,
      recipientEmail: newParticipant.email,
      newBalance: newBalance,
    })
  } catch (error) {
    console.error("[v0] Error redirecting payout:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to redirect payout" 
      },
      { status: 500 }
    )
  }
}
