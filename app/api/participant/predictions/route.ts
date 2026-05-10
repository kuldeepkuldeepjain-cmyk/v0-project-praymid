import { NextRequest, NextResponse } from "next/server"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { query, execute } from "@/lib/db"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) {
    console.log("[v0] Predictions auth failed")
    return auth.response
  }
  try {
    const body = await request.json()
    console.log("[v0] Predictions POST body:", body)
    
    const { participant_email, crypto_pair, prediction_type, amount, entry_price, balance_source } = body
    if (!participant_email || !crypto_pair || !prediction_type || !amount) {
      console.log("[v0] Missing required fields:", { participant_email, crypto_pair, prediction_type, amount })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const useReferralBalance = balance_source === "referral"
    console.log("[v0] Using balance source:", useReferralBalance ? "referral" : "wallet")

    const rows = await query(
      "SELECT id, account_balance, bonus_balance FROM participants WHERE email = $1 LIMIT 1",
      [participant_email]
    ) as any[]
    const participant = rows[0]
    if (!participant) {
      console.log("[v0] Participant not found:", participant_email)
      return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    }

    const availableBalance = useReferralBalance
      ? Number(participant.bonus_balance ?? 0)
      : Number(participant.account_balance ?? 0)

    console.log("[v0] Available balance:", availableBalance, "Needed:", amount)
    
    if (availableBalance < Number(amount)) {
      console.log("[v0] Insufficient balance")
      return NextResponse.json({
        error: useReferralBalance ? "Insufficient referral earnings balance" : "Insufficient wallet balance",
      }, { status: 400 })
    }

    // Insert using only columns that exist in the predictions table
    console.log("[v0] Inserting prediction:", { participant_email, crypto_pair, prediction_type, amount })
    
    const predRows = await query(
      `INSERT INTO predictions
         (participant_id, participant_email, crypto_pair, prediction_type, amount, status, profit_loss)
       VALUES ($1,$2,$3,$4,$5,'pending',0)
       RETURNING *`,
      [participant.id, participant_email, crypto_pair, prediction_type, Number(amount)]
    ) as any[]
    const prediction = predRows[0]
    
    console.log("[v0] Prediction inserted:", prediction)

    const balanceField = useReferralBalance ? "bonus_balance" : "account_balance"
    const newBalance = availableBalance - Number(amount)
    
    console.log("[v0] Updating balance. Field:", balanceField, "New balance:", newBalance)
    
    await execute(
      `UPDATE participants SET ${balanceField} = $1 WHERE id = $2`,
      [newBalance, participant.id]
    )

    // Log to transactions (only columns that exist)
    await execute(
      `INSERT INTO transactions
         (participant_id, participant_email, type, amount, description, reference_id, status, balance_before, balance_after)
       VALUES ($1,$2,$3,$4,$5,$6,'completed',$7,$8)`,
      [
        participant.id,
        participant_email,
        useReferralBalance ? "referral_earning" : "prediction_bet",
        -Number(amount),
        `Placed ${prediction_type} trade on ${crypto_pair}${entry_price ? ` @ ${entry_price}` : ""}`,
        prediction.id,
        availableBalance,
        newBalance,
      ]
    ).catch(() => {}) // non-critical, don't fail the bet if logging fails

    const response = {
      success: true,
      prediction,
      new_balance: newBalance,
      balance_source: useReferralBalance ? "referral" : "wallet",
    }
    
    console.log("[v0] Returning response:", response)
    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Prediction API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error", details: String(error) }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { searchParams } = new URL(request.url)
    const participant_email = searchParams.get("participant_email")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    if (!participant_email) return NextResponse.json({ error: "participant_email is required" }, { status: 400 })

    const rows = await query(
      `SELECT id, participant_email, crypto_pair, prediction_type, amount, result, profit_loss, status, created_at
       FROM predictions
       WHERE participant_email = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [participant_email, limit]
    ) as any[]

    return NextResponse.json({ success: true, predictions: rows })
  } catch (error) {
    console.error("Predictions GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
