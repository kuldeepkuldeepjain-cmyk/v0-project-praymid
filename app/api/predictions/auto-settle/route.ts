import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { predictionId, finalPrice } = await request.json()

    if (!predictionId || !finalPrice) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get the prediction
    const { data: prediction, error: fetchError } = await supabase
      .from("predictions")
      .select("*")
      .eq("id", predictionId)
      .single()

    if (fetchError || !prediction) {
      console.error("Error fetching prediction:", fetchError)
      return NextResponse.json(
        { success: false, error: "Prediction not found" },
        { status: 404 }
      )
    }

    // Check if already settled
    if (prediction.status !== "pending") {
      return NextResponse.json(
        { success: true, message: "Already settled" },
        { status: 200 }
      )
    }

    // Calculate result using pip-level precision
    // Determine decimal precision based on asset type:
    //   Forex (4–5 decimal places): EURUSD, GBPUSD, AUDUSD, NZDUSD, USDCHF, USDCAD, EURGBP → 5dp
    //   JPY pairs (2 decimal places): USDJPY, EURJPY, GBPJPY → 3dp
    //   Crypto / Commodities: compare at 5 significant decimal places
    const pair: string = prediction.crypto_pair || ""
    const isJpyPair = pair.includes("JPY")
    const isForex = /^(EUR|GBP|USD|AUD|NZD|CAD|CHF|NZ|EU|GB)(USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD)/.test(pair)

    // Use appropriate decimal precision per pair type
    const precision = isJpyPair ? 3 : (isForex ? 5 : 5)
    const scale = Math.pow(10, precision)

    // Round both prices to pip precision before comparing
    const roundedEntry = Math.round(prediction.entry_price * scale) / scale
    const roundedFinal = Math.round(finalPrice * scale) / scale
    const priceDiff = roundedFinal - roundedEntry

    // Minimum pip movement to count as directional (avoids ties settling as loss)
    // 1 pip for forex = 0.0001, sub-pip = 0.00001; we require at least 0.5 pip to count
    const minMovement = isJpyPair ? 0.001 : (isForex ? 0.00005 : 0.00001)

    const predictionType = prediction.prediction_type

    // ── Refund path: no meaningful movement (low liquidity / flat market) ────────
    if (Math.abs(priceDiff) < minMovement) {
      const { error: updateError } = await supabase
        .from("predictions")
        .update({
          target_price: finalPrice,
          status: "refunded",
          result: "refunded",
          profit_loss: 0,
          closed_at: new Date().toISOString(),
        })
        .eq("id", predictionId)

      if (updateError) {
        console.error("Error updating prediction (refund):", updateError)
        return NextResponse.json({ success: false, error: "Failed to settle trade" }, { status: 500 })
      }

      // Credit the original bet amount back to the participant
      const { data: participantRef } = await supabase
        .from("participants")
        .select("account_balance")
        .eq("email", prediction.participant_email)
        .single()

      if (participantRef) {
        await supabase
          .from("participants")
          .update({ account_balance: participantRef.account_balance + prediction.amount })
          .eq("email", prediction.participant_email)
      }

      return NextResponse.json({
        success: true,
        result: "refunded",
        profitLoss: 0,
        payout: prediction.amount,
        isWin: false,
        isRefund: true,
      })
    }

    // ── Normal win / loss settlement ─────────────────────────────────────────────
    const isWin = predictionType === "up" ? priceDiff > 0 : priceDiff < 0

    const profitRate = 0.80 // 80% profit rate
    const payout = isWin ? prediction.amount * (1 + profitRate) : 0
    const profitLoss = isWin ? prediction.amount * profitRate : -prediction.amount
    const result = isWin ? "won" : "lost"

    const { error: updateError } = await supabase
      .from("predictions")
      .update({
        target_price: finalPrice,
        status: result,
        result: result,
        profit_loss: profitLoss,
        closed_at: new Date().toISOString(),
      })
      .eq("id", predictionId)

    if (updateError) {
      console.error("Error updating prediction:", updateError)
      return NextResponse.json({ success: false, error: "Failed to settle trade" }, { status: 500 })
    }

    if (isWin && payout > 0) {
      const { data: participant } = await supabase
        .from("participants")
        .select("account_balance, total_earnings")
        .eq("email", prediction.participant_email)
        .single()

      if (participant) {
        await supabase
          .from("participants")
          .update({
            account_balance: participant.account_balance + payout,
            total_earnings: (participant.total_earnings || 0) + profitLoss,
          })
          .eq("email", prediction.participant_email)
      }
    }

    return NextResponse.json({ success: true, result, profitLoss, payout, isWin, isRefund: false })
  } catch (error) {
    console.error("Error in auto-settle:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
