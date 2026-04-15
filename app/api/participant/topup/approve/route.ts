import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    const {
      userId,
      amount,
      approvalTxHash,
      walletAddress,
      collectorAddress,
      tokenAddress,
      network,
      timestamp,
    } = body

    // Validation
    if (!userId || !amount || !approvalTxHash || !walletAddress) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      )
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid amount" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get participant info
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id, email")
      .eq("email", userId)
      .single()

    if (participantError || !participant) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      )
    }

    // Store approval details in gas_approvals table for admin DApp to process
    const { error: insertError } = await supabase.from("gas_approvals").insert({
      participant_id: participant.id,
      participant_email: participant.email,
      wallet_address: walletAddress,
      transaction_hash: approvalTxHash,
      gas_fee: parsedAmount,
      network: network || "BSC",
      status: "pending_collection", // Admin DApp will change to "collected" after transfer
      created_at: new Date(timestamp).toISOString(),
    })

    if (insertError) {
      console.error("[v0] Insert error:", insertError)
      return NextResponse.json(
        { success: false, message: "Failed to record approval" },
        { status: 500 }
      )
    }

    // Also create a topup_request record for tracking
    await supabase.from("topup_requests").insert({
      participant_id: participant.id,
      participant_email: participant.email,
      amount: parsedAmount,
      transaction_id: approvalTxHash,
      payment_method: "crypto_approval",
      status: "pending_collection",
    })

    console.log("[v0] Token approval recorded for admin collection:", {
      participant: participant.email,
      amount: parsedAmount,
      approvalTxHash,
      walletAddress,
      collectorAddress,
    })

    return NextResponse.json({
      success: true,
      message: "Approval recorded. Admin will collect tokens shortly.",
      data: {
        approvalTxHash,
        amount: parsedAmount,
        status: "pending_collection",
        collectorAddress,
        tokenAddress,
      },
    })
  } catch (error) {
    console.error("[v0] Approval submission error:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
