import { NextRequest, NextResponse } from "next/server"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { query, execute } from "@/lib/db"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    
    const { participant_email, crypto_pair, prediction_type, amount, entry_price, timeframe_seconds, balance_source } = body
    if (!participant_email || !crypto_pair || !prediction_type || !amount || !timeframe_seconds) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const useReferralBalance = balance_source === "referral"

    const rows = await query(
      "SELECT id, account_balance, bonus_balance FROM participants WHERE email = $1 LIMIT 1",
      [participant_email]
    ) as any[]
    const participant = rows[0]
    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 })

    const availableBalance = useReferralBalance
      ? Number(participant.bonus_balance ?? 0)
      : Number(participant.account_balance ?? 0)

    if (availableBalance < Number(amount)) {
      return NextResponse.json({
        error: useReferralBalance ? "Insufficient referral earnings balance" : "Insufficient wallet balance",
      }, { status: 400 })
    }

    // Calculate expiry timestamp
    const expiryTimestamp = new Date(Date.now() + timeframe_seconds * 1000).toISOString()

    // Insert prediction with all required fields
    const predRows = await query(
      `INSERT INTO predictions
         (participant_id, participant_email, crypto_pair, prediction_type, amount, entry_price, expiry_at, timeframe_seconds, status, profit_loss, balance_source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',0,$9)
       RETURNING id, participant_id, participant_email, crypto_pair, prediction_type, amount, entry_price, expiry_at, timeframe_seconds, status, profit_loss, created_at`,
      [participant.id, participant_email, crypto_pair, prediction_type, Number(amount), Number(entry_price), expiryTimestamp, timeframe_seconds, balance_source]
    ) as any[]
    const prediction = predRows[0]

    const balanceField = useReferralBalance ? "bonus_balance" : "account_balance"
    const newBalance = availableBalance - Number(amount)
    
    await execute(
      `UPDATE participants SET ${balanceField} = $1 WHERE id = $2`,
      [newBalance, participant.id]
    )

    // Log to transactions
    await execute(
      `INSERT INTO transactions
         (participant_id, participant_email, type, amount, description, reference_id, status, balance_before, balance_after)
       VALUES ($1,$2,$3,$4,$5,$6,'completed',$7,$8)`,
      [
        participant.id,
        participant_email,
        useReferralBalance ? "referral_earning" : "prediction_bet",
        -Number(amount),
        `Placed ${prediction_type} trade on ${crypto_pair} @ ${entry_price}`,
        prediction.id,
        availableBalance,
        newBalance,
      ]
    ).catch(() => {})

    return NextResponse.json({
      success: true,
      prediction: {
        ...prediction,
        expiry_timestamp: expiryTimestamp, // For frontend compatibility
      },
      new_balance: newBalance,
      balance_source: useReferralBalance ? "referral" : "wallet",
    })
  } catch (error) {
    console.error("[v0] Prediction API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { searchParams } = new URL(request.url)
    const participant_email = searchParams.get("participant_email")
    const limit = Number.parseInt(searchParams.get("limit") || "1000") // Default to 1000 to show all
    const status = searchParams.get("status") // Optional filter: pending, won, lost, all
    
    if (!participant_email) return NextResponse.json({ error: "participant_email is required" }, { status: 400 })

    // Build query with optional status filter
    let whereClause = "WHERE participant_email = $1"
    const params = [participant_email]
    
    if (status && status !== "all") {
      whereClause += ` AND status = $${params.length + 1}`
      params.push(status)
    }
    
    const rows = await query(
      `SELECT id, participant_id, participant_email, crypto_pair, prediction_type, amount, entry_price, expiry_at, timeframe_seconds,
              result, profit_loss, status, created_at
       FROM predictions
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1}`,
      [...params, limit]
    ) as any[]

    return NextResponse.json({ 
      success: true, 
      predictions: rows.map(p => ({
        ...p,
        expiry_timestamp: p.expiry_at, // Alias for frontend compatibility
      })),
      total: rows.length
    })
  } catch (error) {
    console.error("Predictions GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
