import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    const { userId, userEmail, amount, transactionHash, screenshotBase64, note } = body

    // Validate required fields
    if (!userId || !userEmail || !amount || !transactionHash || !screenshotBase64) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate amount
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount < 5) {
      return NextResponse.json(
        { success: false, message: "Invalid amount. Minimum is $5" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if transaction hash already exists (prevent duplicates)
    const { data: existingTx } = await supabase
      .from("topup_requests")
      .select("id")
      .eq("transaction_id", transactionHash)
      .maybeSingle()

    if (existingTx) {
      return NextResponse.json(
        { success: false, message: "This transaction has already been submitted" },
        { status: 400 }
      )
    }

    // Get participant info — look up by email
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle()

    if (participantError || !participant) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      )
    }

    // Create topup request record — transaction_id is the DB column name
    const { error: insertError } = await supabase.from("topup_requests").insert({
      participant_id: participant.id,
      participant_email: userEmail,
      amount: parsedAmount,
      transaction_id: transactionHash,
      screenshot_url: screenshotBase64,
      admin_notes: note || null,
      payment_method: "crypto",
      status: "pending",
    })

    if (insertError) {
      console.error("Insert error:", insertError)
      return NextResponse.json(
        { success: false, message: "Failed to submit request" },
        { status: 500 }
      )
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      actor_id: participant.id,
      actor_email: userEmail,
      action: "topup_requested",
      target_type: "wallet",
      details: `Submitted $${parsedAmount} USDT top-up request (tx: ${transactionHash.slice(0, 12)}...)`,
    })

    return NextResponse.json({
      success: true,
      message: "Top-up request submitted successfully",
    })
  } catch (error) {
    console.error("Top-up submit API error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
