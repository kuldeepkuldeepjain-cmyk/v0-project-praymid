import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { payoutId, status, transactionHash, adminNotes, redirectToEmail, redirectToSerial } = await request.json()

    if (!payoutId || !status) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()
    
    console.log("[v0] Updating payout status:", { payoutId, status, redirectToEmail, redirectToSerial })

    // Get the payout request details
    const { data: payoutRequest, error: fetchError } = await supabase
      .from("payout_requests")
      .select("*")
      .eq("id", payoutId)
      .single()

    if (fetchError || !payoutRequest) {
      return NextResponse.json({ success: false, error: "Payout request not found" }, { status: 404 })
    }

    const updateData: any = {
      status,
      admin_notes: adminNotes || payoutRequest.admin_notes,
    }

    // Add processed_at timestamp when status changes from pending
    if (status !== "pending" && !payoutRequest.processed_at) {
      updateData.processed_at = new Date().toISOString()
    }

    // Add transaction hash if provided
    if (transactionHash) {
      updateData.transaction_hash = transactionHash
    }

    // Store redirect target (email or serial) for redirected status
    if (status === "redirected") {
      if (redirectToEmail) {
        updateData.redirect_to_email = redirectToEmail
        console.log("[v0] Storing redirect target email:", redirectToEmail)
      }
      if (redirectToSerial) {
        updateData.redirect_to_serial = redirectToSerial
        console.log("[v0] Storing redirect target serial:", redirectToSerial)
      }
    }

    // Update the payout request status
    const { error: updateError } = await supabase
      .from("payout_requests")
      .update(updateData)
      .eq("id", payoutId)

    if (updateError) {
      console.error("[v0] Error updating payout status:", updateError)
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    // If status is "completed" (Confirm Sent), credit user and send notification
    if (status === "completed") {
      // Get participant details
      const { data: participant, error: participantError } = await supabase
        .from("participants")
        .select("total_received, account_balance")
        .eq("email", payoutRequest.participant_email)
        .single()

      if (participant && !participantError) {
        // Update total_received (earnings log)
        const newTotalReceived = (participant.total_received || 0) + Number(payoutRequest.amount)

        await supabase
          .from("participants")
          .update({
            total_received: newTotalReceived,
          })
          .eq("email", payoutRequest.participant_email)

        // Log the transaction
        await supabase.from("transactions").insert({
          participant_email: payoutRequest.participant_email,
          type: "payout_completed",
          amount: payoutRequest.amount,
          description: `Payout completed - $${payoutRequest.amount} sent to ${payoutRequest.wallet_address}`,
          reference_id: String(payoutId),
        })

        // Log activity
        await supabase.from("activity_logs").insert({
          actor_email: "admin",
          action: "payout_completed",
          target_type: "payout",
          details: `Completed payout of $${payoutRequest.amount} to ${payoutRequest.participant_email}${transactionHash ? ` - TX: ${transactionHash}` : ""}`,
        })

        console.log("[v0] Payout completed and credited to user:", payoutRequest.participant_email)
      }
    }

    // If status is "rejected", log it
    if (status === "rejected") {
      // Refund the amount back to wallet
      const { data: participant } = await supabase
        .from("participants")
        .select("account_balance")
        .eq("email", payoutRequest.participant_email)
        .single()

      if (participant) {
        const refundedBalance = (participant.account_balance || 0) + Number(payoutRequest.amount)

        await supabase
          .from("participants")
          .update({ account_balance: refundedBalance })
          .eq("email", payoutRequest.participant_email)

        // Log the transaction
        await supabase.from("transactions").insert({
          participant_email: payoutRequest.participant_email,
          type: "payout_rejected",
          amount: payoutRequest.amount,
          description: `Payout request rejected and refunded - $${payoutRequest.amount}${adminNotes ? ` - Reason: ${adminNotes}` : ""}`,
          reference_id: String(payoutId),
        })

        // Log activity
        await supabase.from("activity_logs").insert({
          actor_email: "admin",
          action: "payout_rejected",
          target_type: "payout",
          details: `Rejected payout request from ${payoutRequest.participant_email} - $${payoutRequest.amount}${adminNotes ? ` - ${adminNotes}` : ""}`,
        })

        console.log("[v0] Payout rejected and refunded to user:", payoutRequest.participant_email)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Payout status updated to ${status}`,
    })
  } catch (error) {
    console.error("[v0] Error in update-payout-status:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
