import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    const { userId, amount, transactionHash, walletAddress, timestamp } = body

    // Validate required fields
    if (!userId || !amount || !transactionHash || !walletAddress) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate amount
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount < 10 || parsedAmount > 10000) {
      return NextResponse.json(
        { success: false, message: "Invalid amount. Must be between $10 and $10,000" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if transaction hash already exists (prevent double crediting)
    const { data: existingTx } = await supabase
      .from("topup_requests")
      .select("id")
      .eq("transaction_id", transactionHash)
      .single()

    if (existingTx) {
      return NextResponse.json(
        { success: false, message: "Transaction already processed" },
        { status: 400 }
      )
    }

    // Get participant info
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id, account_balance")
      .eq("username", userId)
      .single()

    if (participantError || !participant) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      )
    }

    // Create topup request record
    const { error: insertError } = await supabase.from("topup_requests").insert({
      participant_id: participant.id,
      participant_email: userId,
      amount: parsedAmount,
      transaction_id: transactionHash,
      payment_method: "crypto",
      status: "pending",
      created_at: new Date(timestamp).toISOString(),
    })

    if (insertError) {
      console.error("Insert error:", insertError)
      return NextResponse.json(
        { success: false, message: "Failed to record top-up request" },
        { status: 500 }
      )
    }

    // Update participant wallet balance
    const newBalance = (participant.account_balance || 0) + parsedAmount

    const { error: updateError } = await supabase
      .from("participants")
      .update({ 
        account_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq("id", participant.id)

    if (updateError) {
      console.error("Update error:", updateError)
      // Mark the topup as failed
      await supabase
        .from("topup_requests")
        .update({ status: "failed" })
        .eq("transaction_id", transactionHash)

      return NextResponse.json(
        { success: false, message: "Failed to credit wallet" },
        { status: 500 }
      )
    }

    // Mark topup as completed
    await supabase
      .from("topup_requests")
      .update({ status: "completed" })
      .eq("transaction_id", transactionHash)

    // Log activity
    await supabase.from("activity_logs").insert({
      actor_id: participant.id,
      actor_email: userId,
      action: "wallet_topup",
      target_type: "wallet",
      details: `Topped up $${parsedAmount} USDT via wallet. New balance: $${newBalance}`,
    })

    return NextResponse.json({
      success: true,
      message: "Top-up successful",
      newBalance,
    })
  } catch (error) {
    console.error("Top-up API error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch topup history
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: topups, error } = await supabase
      .from("topup_requests")
      .select("*")
      .eq("participant_email", userId)
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch top-up history" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      topups,
    })
  } catch (error) {
    console.error("Top-up history API error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
