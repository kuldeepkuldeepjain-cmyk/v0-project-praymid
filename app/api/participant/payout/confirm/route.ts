import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { payoutId, action, disputeReason, participantEmail } = await request.json()

    if (!payoutId || !action || !participantEmail) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    if (!["confirm", "dispute"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify the payout belongs to this participant and is completed
    const { data: payout, error: fetchError } = await supabase
      .from("payout_requests")
      .select("id, status, amount, participant_email, participant_confirmed, dispute_status")
      .eq("id", payoutId)
      .eq("participant_email", participantEmail)
      .single()

    if (fetchError || !payout) {
      return NextResponse.json({ success: false, error: "Payout not found" }, { status: 404 })
    }

    if (payout.status !== "completed") {
      return NextResponse.json(
        { success: false, error: "Can only confirm or dispute completed payouts" },
        { status: 400 }
      )
    }

    // Prevent re-confirming
    if (payout.participant_confirmed === true) {
      return NextResponse.json(
        { success: false, error: "Payout already confirmed", alreadyProcessed: true },
        { status: 400 }
      )
    }

    // Prevent re-disputing
    if (payout.dispute_status === "open") {
      return NextResponse.json(
        { success: false, error: "Dispute already raised for this payout", alreadyProcessed: true },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    if (action === "confirm") {
      // Mark as confirmed by participant
      const { error: updateError } = await supabase
        .from("payout_requests")
        .update({
          participant_confirmed: true,
          confirmed_at: now,
        })
        .eq("id", payoutId)

      if (updateError) throw updateError

      // Notify admin
      await supabase.from("notifications").insert({
        user_email: "admin",
        type: "success",
        title: "Payout Confirmed by Participant",
        message: `Participant ${participantEmail} confirmed receipt of their $${payout.amount} payout (ID: ${payoutId}).`,
        read_status: false,
      })

      return NextResponse.json({
        success: true,
        message: "Payout receipt confirmed. Thank you!",
      })
    }

    if (action === "dispute") {
      if (!disputeReason || disputeReason.trim().length < 10) {
        return NextResponse.json(
          { success: false, error: "Please provide a reason (at least 10 characters)" },
          { status: 400 }
        )
      }

      // Mark dispute on payout
      const { error: updateError } = await supabase
        .from("payout_requests")
        .update({
          participant_confirmed: false,
          dispute_reason: disputeReason.trim(),
          dispute_raised_at: now,
          dispute_status: "open",
        })
        .eq("id", payoutId)

      if (updateError) throw updateError

      // Insert support ticket so admin can see it
      await supabase.from("support_tickets").insert({
        participant_email: participantEmail,
        subject: `Payout Dispute — $${payout.amount} not received`,
        message: disputeReason.trim(),
        status: "open",
        priority: "high",
        category: "payout_dispute",
        reference_id: payoutId,
        created_at: now,
      })

      // Notify admin
      await supabase.from("notifications").insert({
        user_email: "admin",
        type: "error",
        title: "Payout Dispute Raised",
        message: `${participantEmail} has raised a dispute for their $${payout.amount} payout: "${disputeReason.trim()}"`,
        read_status: false,
      })

      return NextResponse.json({
        success: true,
        message: "Dispute raised successfully. Our team will review and contact you shortly.",
      })
    }
  } catch (error: any) {
    console.error("[payout/confirm] Error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
