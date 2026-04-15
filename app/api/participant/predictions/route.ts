import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireParticipantSession } from "@/lib/auth-middleware"

// Always use service role to bypass RLS for balance reads/writes
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST - Create new prediction
export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    const {
      participant_email,
      crypto_pair,
      prediction_type,
      amount,
      entry_price,
      target_price,
      leverage,
      status,
      balance_source, // "wallet" (default) | "referral"
    } = body

    if (!participant_email || !crypto_pair || !prediction_type || !amount || !entry_price) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const useReferralBalance = balance_source === "referral"

    // Use service role to bypass RLS — gets real balance values always
    const supabase = getServiceClient()

    // Get participant with both balance fields (bonus_balance = referral earnings per DB schema)
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id, account_balance, bonus_balance")
      .eq("email", participant_email)
      .single()

    if (participantError || !participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      )
    }

    // bonus_balance holds referral earnings (confirmed by DB schema — no referral_earnings column)
    const availableBalance = useReferralBalance
      ? Number(participant.bonus_balance ?? 0)
      : Number(participant.account_balance ?? 0)

    // Check if participant has sufficient balance in the chosen source
    if (availableBalance < Number(amount)) {
      return NextResponse.json(
        { error: useReferralBalance ? "Insufficient referral earnings balance" : "Insufficient wallet balance" },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    // Create prediction
    const { data: prediction, error: predictionError } = await supabase
      .from("predictions")
      .insert({
        participant_id: participant.id,
        participant_email,
        crypto_pair,
        prediction_type,
        amount: Number(amount),
        entry_price: Number(entry_price),
        target_price: target_price ? Number(target_price) : null,
        leverage: leverage || 1,
        status: status || "pending",
        profit_loss: 0,
        result: null,
        created_at: now,
        closed_at: null
      })
      .select()
      .single()

    if (predictionError) {
      console.error("[v0] Bet placement error:", predictionError.message)
      return NextResponse.json(
        { error: predictionError.message || "Failed to create prediction" },
        { status: 500 }
      )
    }

    // Deduct bet amount from the correct balance field
    // bonus_balance = referral earnings per DB schema (no referral_earnings column exists)
    const balanceField = useReferralBalance ? "bonus_balance" : "account_balance"
    const newBalance = availableBalance - Number(amount)

    await supabase
      .from("participants")
      .update({ [balanceField]: newBalance })
      .eq("id", participant.id)

    // Log transaction
    await supabase
      .from("transactions")
      .insert({
        participant_id: participant.id,
        participant_email,
        type: useReferralBalance ? "referral_earning" : "prediction_bet",
        amount: -Number(amount),
        description: `Placed ${prediction_type} trade on ${crypto_pair} using ${useReferralBalance ? "referral earnings" : "wallet balance"}`,
        reference_id: prediction.id,
        status: "completed",
        balance_before: availableBalance,
        balance_after: newBalance,
      })

    return NextResponse.json({
      success: true,
      prediction,
      new_balance: newBalance,
      balance_source: useReferralBalance ? "referral" : "wallet",
    })

  } catch (error) {
    console.error("Prediction API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET - Fetch predictions for a participant
export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { searchParams } = new URL(request.url)
    const participant_email = searchParams.get("participant_email")
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    if (!participant_email) {
      return NextResponse.json(
        { error: "participant_email is required" },
        { status: 400 }
      )
    }

    const supabase = getServiceClient()

    const { data: predictions, error } = await supabase
      .from("predictions")
      .select("*")
      .eq("participant_email", participant_email)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching predictions:", error)
      return NextResponse.json(
        { error: "Failed to fetch predictions" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      predictions
    })

  } catch (error) {
    console.error("Prediction API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
