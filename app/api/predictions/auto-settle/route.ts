import { NextResponse } from "next/server"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { getPool } from "@/lib/db"
import { getFundedBaseAmount, getFundedEquity, isFundedDrawdownBreached } from "@/lib/funded-account"

export async function POST(request: Request) {
  const auth = await requireParticipantSession()
  if (!auth.ok) return auth.response

  try {
    const { predictionId, finalPrice } = await request.json()
    if (!predictionId || !finalPrice) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const db = getPool()!

    const participantEmail = auth.email.toLowerCase().trim()
    const predRes = await db.query(
      "SELECT * FROM predictions WHERE id = $1 AND participant_email = $2",
      [predictionId, participantEmail],
    )
    const prediction = predRes.rows[0]
    if (!prediction) {
      return NextResponse.json({ success: false, error: "Prediction not found" }, { status: 404 })
    }

    if (prediction.status !== "pending") {
      const settledResult = String(prediction.result || prediction.status || "").toLowerCase()
      const isRefund = settledResult === "refunded"
      const isWin = settledResult === "won"
      return NextResponse.json({
        success: true,
        message: "Already settled",
        result: settledResult,
        isWin,
        isRefund,
        profitLoss: Number(prediction.profit_loss || 0),
        payout: isWin ? Number(prediction.amount || 0) + Number(prediction.profit_loss || 0) : isRefund ? Number(prediction.amount || 0) : 0,
        accountFrozen: false,
      })
    }

    // Atomically claim the pending prediction before calculating and crediting
    // the result. Concurrent cron/client requests can therefore settle once.
    const claim = await db.query(
      "UPDATE predictions SET status='settling' WHERE id=$1 AND participant_email=$2 AND status='pending' RETURNING *",
      [predictionId, participantEmail],
    )
    if (!claim.rows.length) {
      const settled = await db.query(
        "SELECT * FROM predictions WHERE id=$1 AND participant_email=$2",
        [predictionId, participantEmail],
      )
      const current = settled.rows[0]
      const settledResult = String(current?.result || current?.status || "").toLowerCase()
      const isRefund = settledResult === "refunded"
      const isWin = settledResult === "won"
      return NextResponse.json({ success: true, message: "Already settled", result: settledResult, isWin, isRefund, profitLoss: Number(current?.profit_loss || 0), payout: isWin ? Number(current?.amount || 0) + Number(current?.profit_loss || 0) : isRefund ? Number(current?.amount || 0) : 0, accountFrozen: false })
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

    const isRefund = Math.abs(priceDiff) < minMovement
    const predictionType = String(prediction.prediction_type || "").trim().toLowerCase()
    const isWin = !isRefund && (predictionType === "up" ? priceDiff > 0 : priceDiff < 0)
    const result = isRefund ? "refunded" : isWin ? "won" : "lost"
    const profitRate = 0.50
    const profitLoss = isRefund ? 0 : isWin ? prediction.amount * profitRate : -prediction.amount
    const payout = isRefund ? Number(prediction.amount) : isWin ? Number(prediction.amount) * (1 + profitRate) : 0

    const client = await db.connect()
    let actualPayout = 0
    let accountBreached = false
    try {
      await client.query("BEGIN")
      const participantResult = await client.query(
        `SELECT id, account_balance, bonus_balance, account_type, funded_amount,
                funded_initial_balance, funded_breach_status
         FROM participants WHERE LOWER(email) = LOWER($1) FOR UPDATE`,
        [prediction.participant_email],
      )
      const participant = participantResult.rows[0]
      const settled = await client.query(
        `UPDATE predictions SET status = 'settled', result = $1, profit_loss = $2,
           target_price = $3, closed_at = NOW()
         WHERE id = $4 AND status = 'settling' RETURNING id`,
        [result, profitLoss, finalPrice, predictionId],
      )
      if (settled.rowCount !== 1) throw new Error("Prediction settlement was already processed")

      if (prediction.balance_source !== "demo" && participant) {
        const isWalletBalance = prediction.balance_source !== "referral"
        const isFundedWallet = isWalletBalance && participant.account_type === "funded"
        const alreadyBreached = isFundedWallet && participant.funded_breach_status === "breached"
        const credit = alreadyBreached ? 0 : payout
        actualPayout = credit

        if (isWalletBalance) {
          const balanceBefore = Number(participant.account_balance) || 0
          const candidateBalance = Number((balanceBefore + credit).toFixed(2))
          let balanceAfter = candidateBalance
          let fundedEquity = candidateBalance
          if (isFundedWallet) {
            const fundedInitial = Number(participant.funded_initial_balance)
              || getFundedBaseAmount(balanceBefore, participant.funded_amount)
            const committedResult = await client.query(
              `SELECT
                 (SELECT COALESCE(SUM(amount), 0) FROM predictions
                  WHERE participant_email = $1 AND status IN ('pending', 'settling') AND balance_source = 'wallet')
                 + (SELECT COALESCE(SUM(margin), 0) FROM forex_trades
                    WHERE participant_email = $1 AND status IN ('open', 'pending')) AS committed_funds`,
              [prediction.participant_email],
            )
            const committedFunds = Number(committedResult.rows[0]?.committed_funds) || 0
            fundedEquity = getFundedEquity(fundedInitial, candidateBalance, committedFunds)
            accountBreached = alreadyBreached || isFundedDrawdownBreached(
              participant.account_type,
              fundedInitial,
              candidateBalance,
              committedFunds,
            )
            balanceAfter = accountBreached ? 0 : candidateBalance
            actualPayout = accountBreached ? 0 : credit

            await client.query(
              `UPDATE participants SET account_balance = $1,
                 funded_breach_status = CASE WHEN $2 THEN 'breached' ELSE funded_breach_status END,
                 funded_breach_at = CASE WHEN $2 THEN COALESCE(funded_breach_at, NOW()) ELSE funded_breach_at END,
                 funded_breach_balance = CASE WHEN $2 THEN 0 ELSE funded_breach_balance END,
                 funded_breach_equity = CASE WHEN $2 THEN $3 ELSE funded_breach_equity END,
                 account_frozen = CASE WHEN $2 THEN TRUE ELSE account_frozen END,
                 is_frozen = CASE WHEN $2 THEN TRUE ELSE is_frozen END,
                 status = CASE WHEN $2 THEN 'frozen' ELSE status END,
                 updated_at = NOW()
               WHERE id = $4`,
              [balanceAfter, accountBreached, fundedEquity, participant.id],
            )
            if (accountBreached) {
              await client.query(
                `UPDATE forex_trades SET status = 'cancelled', close_reason = 'manual', updated_at = NOW()
                 WHERE LOWER(participant_email) = LOWER($1) AND status = 'pending'`,
                [prediction.participant_email],
              )
              if (!alreadyBreached && candidateBalance > 0) {
                await client.query(
                  `INSERT INTO transactions
                     (participant_id, participant_email, type, amount, description, balance_before, balance_after, status)
                   VALUES ($1, $2, 'funded_drawdown_reset', $3, 'Funded balance reset to $0.00 after maximum drawdown breach', $3, 0, 'completed')`,
                  [participant.id, prediction.participant_email, candidateBalance],
                )
              }
            }
          } else {
            await client.query(
              `UPDATE participants SET account_balance = $1,
                 total_earnings = COALESCE(total_earnings, 0) + $2, updated_at = NOW()
               WHERE id = $3`,
              [balanceAfter, isWin ? profitLoss : 0, participant.id],
            )
          }

          if (actualPayout > 0) {
            await client.query(
              `INSERT INTO transactions (participant_id, participant_email, type, amount, description, reference_id, status, balance_before, balance_after)
               VALUES ($1, $2, $3, $4, $5, $6, 'completed', $7, $8) ON CONFLICT DO NOTHING`,
              [participant.id, prediction.participant_email, isRefund ? "refund" : "prediction_win", actualPayout, isRefund ? "Trade refunded - no price movement" : `Trade won on ${prediction.crypto_pair}`, predictionId, balanceBefore, balanceAfter],
            )
          }
        } else if (credit > 0) {
          await client.query(
            `UPDATE participants SET bonus_balance = COALESCE(bonus_balance, 0) + $1,
               total_earnings = COALESCE(total_earnings, 0) + $2, updated_at = NOW()
             WHERE id = $3`,
            [credit, isWin ? profitLoss : 0, participant.id],
          )
        }
      }

      await client.query("COMMIT")
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }

    return NextResponse.json({
      success: true,
      result,
      profitLoss,
      payout: actualPayout,
      isWin,
      isRefund,
      accountFrozen: accountBreached,
    })
  } catch (error) {
    console.error("Error in auto-settle:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
