import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { email, amount, bep20_address } = await request.json()

    if (!email || !amount || !bep20_address) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get participant's current account balance
    const { data: participant, error: fetchError } = await supabase
      .from("participants")
      .select("id, account_balance, username, email")
      .eq("email", email)
      .single()

    if (fetchError || !participant) {
      console.error("Error fetching participant:", fetchError)
      return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
    }

    // Check if account balance is sufficient
    if (participant.account_balance < amount) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient balance. Available: $${participant.account_balance}, Requested: $${amount}`,
        },
        { status: 400 },
      )
    }

    // Calculate new balance
    const newBalance = participant.account_balance - amount

    // Deduct amount from account balance AND save BEP20 address to participant profile
    const { error: updateError } = await supabase
      .from("participants")
      .update({ 
        account_balance: newBalance,
        bep20_address: bep20_address,  // Save BEP20 address for future use
      })
      .eq("email", email)

    if (updateError) {
      console.error("Error updating wallet balance:", updateError)
      return NextResponse.json({ success: false, error: "Failed to update wallet balance" }, { status: 500 })
    }

    // Create payout request record
    const { data: payoutRequest, error: insertError } = await supabase
      .from("payout_requests")
      .insert({
        participant_id: participant.id,
        participant_email: email,
        wallet_address: bep20_address,
        amount: amount,
        status: "pending",
        payout_method: "BEP20",
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error creating payout request:", insertError)
      // Rollback account balance update
      await supabase.from("participants").update({ account_balance: participant.account_balance }).eq("email", email)
      return NextResponse.json({ success: false, error: "Failed to create payout request" }, { status: 500 })
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      actor_email: email,
      action: "payout_requested",
      details: `Requested payout of $${amount} to ${bep20_address}`,
      target_type: "payout_request",
    })

    return NextResponse.json({
      success: true,
      message: "Payout request submitted successfully",
      newBalance: newBalance,
      requestId: payoutRequest.id,
    })
  } catch (error) {
    console.error("Payout request error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
