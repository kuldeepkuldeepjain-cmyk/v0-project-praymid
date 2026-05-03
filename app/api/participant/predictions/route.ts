import { NextRequest, NextResponse } from "next/server"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { sql } from "@/lib/db"

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
      balance_source,
    } = body

    if (!participant_email || !crypto_pair || !prediction_type || !amount || !entry_price) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const useReferralBalance = balance_source === "referral"

    const rows = await sql`
      SELECT id, account_balance, bonus_balance
      FROM participants
      WHERE email = ${participant_email}
      LIMIT 1
    `
    const participant = rows[0]

    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    }

    const availableBalance = useReferralBalance
      ? Number(participant.bonus_balance ?? 0)
      : Number(participant.account_balance ?? 0)

    if (availableBalance < Number(amount)) {
      return NextResponse.json(
        { error: useReferralBalance ? "Insufficient referral earnings balance" : "Insufficient wallet balance" },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    const predictionRows = await sql`
      INSERT INTO predictions (
        participant_id, participant_email, crypto_pair, prediction_type, amount,
        entry_price, target_price, leverage, status, profit_loss, result, created_at, closed_at
      ) VALUES (
        ${participant.id}, ${participant_email}, ${crypto_pair}, ${prediction_type}, ${Number(amount)},
        ${Number(entry_price)}, ${target_price ? Number(target_price) : null}, ${leverage || 1},
        ${status || "pending"}, ${0}, ${null}, ${now}, ${null}
      )
      RETURNING *
    `
    const prediction = predictionRows[0]

    if (!prediction) {
      return NextResponse.json({ error: "Failed to create prediction" }, { status: 500 })
    }

    const newBalance = availableBalance - Number(amount)

    if (useReferralBalance) {
      await sql`UPDATE participants SET bonus_balance = ${newBalance} WHERE id = ${participant.id}`
    } else {
      await sql`UPDATE participants SET account_balance = ${newBalance} WHERE id = ${participant.id}`
    }

    await sql`
      INSERT INTO transactions (
        participant_id, participant_email, type, amount, description,
        reference_id, status, balance_before, balance_after
      ) VALUES (
        ${participant.id}, ${participant_email},
        ${useReferralBalance ? "referral_earning" : "prediction_bet"},
        ${-Number(amount)},
        ${`Placed ${prediction_type} trade on ${crypto_pair} using ${useReferralBalance ? "referral earnings" : "wallet balance"}`},
        ${prediction.id}, ${"completed"}, ${availableBalance}, ${newBalance}
      )
    `

    return NextResponse.json({
      success: true,
      prediction,
      new_balance: newBalance,
      balance_source: useReferralBalance ? "referral" : "wallet",
    })
  } catch (error) {
    console.error("Prediction API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
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
      return NextResponse.json({ error: "participant_email is required" }, { status: 400 })
    }

    const predictions = await sql`
      SELECT * FROM predictions
      WHERE participant_email = ${participant_email}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `

    return NextResponse.json({ success: true, predictions })
  } catch (error) {
    console.error("Prediction API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
