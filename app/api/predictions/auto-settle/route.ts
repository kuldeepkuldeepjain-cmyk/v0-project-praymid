import { NextResponse } from "next/server"
import { getPool } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { predictionId, finalPrice } = await request.json()
    if (!predictionId || !finalPrice) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const db = getPool()!

    const predRes = await db.query("SELECT * FROM predictions WHERE id = $1", [predictionId])
    const prediction = predRes.rows[0]
    if (!prediction) {
      return NextResponse.json({ success: false, error: "Prediction not found" }, { status: 404 })
    }

    if (prediction.status !== "pending") {
      return NextResponse.json({ success: true, message: "Already settled" })
    }

    const pair: string = prediction.crypto_pair || ""
    const isJpyPair = pair.includes("JPY")
    const isForex = /^(EUR|GBP|USD|AUD|NZD|CAD|CHF)(USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD)/.test(pair)
    const precision = isJpyPair ? 3 : 5
    const scale = Math.pow(10, precision)
    const roundedEntry = Math.round(prediction.entry_price * scale) / scale
    const roundedFinal = Math.round(finalPrice * scale) / scale
    const priceDiff = roundedFinal - roundedEntry
    const minMovement = isJpyPair ? 0.001 : isForex ? 0.00005 : 0.00001

    if (Math.abs(priceDiff) < minMovement) {
      await db.query(
        "UPDATE predictions SET target_price=$1, status='refunded', result='refunded', profit_loss=0, closed_at=NOW() WHERE id=$2",
        [finalPrice, predictionId]
      )
      const balanceField = prediction.balance_source === "referral" ? "bonus_balance" : "account_balance"
      await db.query(`UPDATE participants SET ${balanceField} = ${balanceField} + $1 WHERE email=$2`, [prediction.amount, prediction.participant_email])
      return NextResponse.json({ success: true, result: "refunded", profitLoss: 0, payout: prediction.amount, isWin: false, isRefund: true })
    }

    const isWin = prediction.prediction_type === "up" ? priceDiff > 0 : priceDiff < 0
    const profitRate = 0.50
    const payout = isWin ? prediction.amount * (1 + profitRate) : 0
    const profitLoss = isWin ? prediction.amount * profitRate : -prediction.amount
    const result = isWin ? "won" : "lost"

    await db.query(
      "UPDATE predictions SET status='settled', result=$1, profit_loss=$2, target_price=$3, closed_at=NOW() WHERE id=$4",
      [result, profitLoss, finalPrice, predictionId]
    )

    // On WIN: credit payout (stake back + profit). Balance was already debited at bet placement.
    // On LOSS: nothing to do — balance was already debited at bet placement.
    if (isWin && payout > 0) {
      const balanceField = prediction.balance_source === "referral" ? "bonus_balance" : "account_balance"
      await db.query(
        `UPDATE participants SET ${balanceField} = ${balanceField} + $1, total_earnings = COALESCE(total_earnings,0) + $2 WHERE email=$3`,
        [payout, profitLoss, prediction.participant_email]
      )
    }

    return NextResponse.json({ success: true, result, profitLoss, payout, isWin, isRefund: false })
  } catch (error) {
    console.error("Error in auto-settle:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
