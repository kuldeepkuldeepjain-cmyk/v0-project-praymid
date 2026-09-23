import { NextRequest, NextResponse } from "next/server"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { query, execute } from "@/lib/db"
import { getFundedBaseAmount, getFundedEquity, getFundedMinimumBalance, getFundedPredictionMaxAmount, isFundedDrawdownBreached } from "@/lib/funded-account"

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
      "SELECT id, account_balance, bonus_balance, account_type, account_frozen, is_frozen, status, funded_initial_balance, funded_breach_status FROM participants WHERE email = $1 LIMIT 1",
      [participant_email]
    ) as any[]
    const participant = rows[0]
    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    const availableBalance = useReferralBalance
      ? Number(participant.bonus_balance ?? 0)
      : Number(participant.account_balance ?? 0)
    const fundedBaseAmount = participant.account_type === "funded"
      ? getFundedBaseAmount(participant.account_balance, participant.funded_initial_balance)
      : 0
    const fundedPredictionMax = getFundedPredictionMaxAmount(
      participant.account_type,
      participant.account_balance,
      participant.funded_initial_balance,
    )
    const requestedAmount = Number(amount)
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return NextResponse.json({ error: "Prediction amount must be greater than zero" }, { status: 400 })
    }
    if (!useReferralBalance && fundedPredictionMax !== null && requestedAmount > fundedPredictionMax) {
      const limitText = fundedPredictionMax >= 100 && Number.isInteger(fundedPredictionMax)
        ? `$${fundedPredictionMax.toLocaleString()}`
        : `$${fundedPredictionMax.toFixed(2)}`
      return NextResponse.json({
        error: `Funded accounts can place prediction trades up to ${limitText}. At or below the funded amount, trades can be up to $100; above it, only profit is eligible.`,
        funded_prediction_limit: fundedPredictionMax,
      }, { status: 400 })
    }
    const committedRows = participant.account_type === "funded" && !useReferralBalance
      ? await query(
          `SELECT
             (SELECT COALESCE(SUM(amount), 0) FROM predictions WHERE participant_email = $1 AND status = 'pending' AND balance_source = 'wallet')
             + (SELECT COALESCE(SUM(margin), 0) FROM forex_trades WHERE participant_email = $1 AND status IN ('open', 'pending')) AS committed_funds`,
          [participant_email],
        ) as Array<{ committed_funds: number }>
      : []
    const committedFunds = Number(committedRows[0]?.committed_funds ?? 0)
    const fundedInitialBalance = Number(participant.funded_initial_balance) || fundedBaseAmount
    const currentFundedEquity = getFundedEquity(fundedInitialBalance, Number(participant.account_balance ?? 0), committedFunds)
    const fundedBreachFloor = getFundedMinimumBalance(fundedInitialBalance)

    // A prior breach is recoverable when the account is back at or above 98%
    // of its funded amount. This also prevents a $10,020 balance on a $10,000
    // account from remaining incorrectly locked in breach state.
    if (
      participant.account_type === "funded" &&
      participant.funded_breach_status === "breached" &&
      fundedInitialBalance > 0 &&
      currentFundedEquity >= fundedBreachFloor
    ) {
      await execute(
        `UPDATE participants
         SET funded_breach_status = 'clear', funded_breach_at = NULL,
             funded_breach_balance = NULL, funded_breach_equity = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [participant.id],
      )
      participant.funded_breach_status = "clear"
    }

    if (participant.account_type === "funded" && participant.funded_breach_status === "breached") {
      return NextResponse.json({ error: "Funded account breached the fixed 2% drawdown rule. Current equity must recover to at least 98% of the funded amount." }, { status: 403 })
    }

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
    const totalCommittedAfterBet = committedFunds + (useReferralBalance ? 0 : Number(amount))
    const fundedEquity = getFundedEquity(fundedInitialBalance, newBalance, totalCommittedAfterBet)
    const shouldBreach = isFundedDrawdownBreached(participant.account_type, fundedInitialBalance, newBalance, totalCommittedAfterBet)
    await execute(
      `UPDATE participants
       SET ${balanceField} = $1,
           funded_initial_balance = CASE WHEN account_type = 'funded' AND funded_initial_balance IS NULL THEN $2 ELSE funded_initial_balance END,
           funded_breach_status = CASE WHEN $3 AND COALESCE(funded_breach_status, 'clear') <> 'breached' THEN 'breached' ELSE funded_breach_status END,
           funded_breach_at = CASE WHEN $3 AND COALESCE(funded_breach_status, 'clear') <> 'breached' THEN NOW() ELSE funded_breach_at END,
           funded_breach_balance = CASE WHEN $3 AND COALESCE(funded_breach_status, 'clear') <> 'breached' THEN $1 ELSE funded_breach_balance END,
           funded_breach_equity = CASE WHEN $3 AND COALESCE(funded_breach_status, 'clear') <> 'breached' THEN $4 ELSE funded_breach_equity END,
           updated_at = NOW()
       WHERE id = $5`,
      [newBalance, fundedInitialBalance, shouldBreach, fundedEquity, participant.id]
    )

    if (shouldBreach) {
      // No recovery after breach: cancel every not-yet-triggered pending
      // limit/stop forex order so no further exposure can be taken on.
      await execute(
        `UPDATE forex_trades SET status = 'cancelled', close_reason = 'funded_drawdown_breach', updated_at = NOW()
         WHERE participant_email = $1 AND status = 'pending'`,
        [participant_email]
      ).catch(() => {})
    }

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
      account_frozen: false,
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
              result, profit_loss, status, target_price, closed_at, created_at
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
