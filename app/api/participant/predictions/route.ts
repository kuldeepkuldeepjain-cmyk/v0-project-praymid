import { NextRequest, NextResponse } from "next/server"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { query, withTransaction } from "@/lib/db"
import {
  getFundedBaseAmount,
  getFundedEquity,
  getFundedPredictionMaxAmount,
  isFundedDrawdownBreached,
} from "@/lib/funded-account"

const DEMO_STARTING_BALANCE = 1_000
const DEMO_RESET_TRANSACTION_TYPE = "prediction_demo_reset"
const ALLOWED_TIMEFRAMES = new Set([60, 180, 300, 600, 900, 1800, 3600, 7200, 18000, 36000, 86400])

type PredictionBalanceSource = "demo" | "wallet"

function normalizeMoney(value: unknown) {
  return Math.max(0, Number(Number(value ?? 0).toFixed(2)))
}

async function getDemoResetAt(client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<{ reset_at: Date | null }> }> }, participantEmail: string) {
  const resetResult = await client.query(
    `SELECT MAX(created_at) AS reset_at
     FROM transactions
     WHERE participant_email = $1 AND type = $2`,
    [participantEmail, DEMO_RESET_TRANSACTION_TYPE],
  )
  return resetResult.rows[0]?.reset_at ?? null
}

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const participantEmail = auth.email.toLowerCase().trim()
    const cryptoPair = String(body.crypto_pair || "").toUpperCase().trim()
    const predictionType = String(body.prediction_type || "").toLowerCase().trim()
    const requestedAmount = Number(body.amount)
    const entryPrice = Number(body.entry_price)
    const timeframeSeconds = Number(body.timeframe_seconds)
    const balanceSource: PredictionBalanceSource = body.balance_source === "wallet" ? "wallet" : "demo"

    if (!/^[A-Z0-9]{5,16}$/.test(cryptoPair) || !["up", "down"].includes(predictionType)) {
      return NextResponse.json({ error: "Choose a valid market and direction" }, { status: 400 })
    }
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0 || Math.abs(requestedAmount * 100 - Math.round(requestedAmount * 100)) > 1e-8) {
      return NextResponse.json({ error: "Enter a valid amount with up to two decimal places" }, { status: 400 })
    }
    if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
      return NextResponse.json({ error: "A valid live entry price is required" }, { status: 400 })
    }
    if (!ALLOWED_TIMEFRAMES.has(timeframeSeconds)) {
      return NextResponse.json({ error: "Choose a supported trade duration" }, { status: 400 })
    }

    const result = await withTransaction(async (client) => {
      const participantResult = await client.query(
        `SELECT id, account_balance, account_type, account_frozen, is_frozen, status,
                funded_initial_balance, funded_breach_status
         FROM participants
         WHERE id = $1 AND LOWER(email) = $2
         LIMIT 1
         FOR UPDATE`,
        [auth.participantId, participantEmail],
      )
      const participant = participantResult.rows[0]
      if (!participant) return { error: "Participant not found", status: 404 as const }

      let availableBalance = 0
      let fundedInitialBalance = 0
      let committedFunds = 0
      let responseBalance = 0

      if (balanceSource === "demo") {
        const resetAt = await getDemoResetAt(client, participantEmail)
        const balanceResult = await client.query(
          `SELECT $2::numeric
             + COALESCE(SUM(CASE WHEN status = 'settled' THEN profit_loss ELSE 0 END), 0)
             - COALESCE(SUM(CASE WHEN status IN ('pending', 'settling') THEN amount ELSE 0 END), 0) AS available_balance
           FROM predictions
           WHERE participant_email = $1
             AND balance_source = 'demo'
             AND ($3::timestamptz IS NULL OR created_at > $3::timestamptz)`,
          [participantEmail, DEMO_STARTING_BALANCE, resetAt],
        )
        availableBalance = normalizeMoney(balanceResult.rows[0]?.available_balance ?? DEMO_STARTING_BALANCE)
      } else {
        if (participant.account_type === "challenge") {
          return { error: "Challenge accounts can only use the forex trading terminal.", status: 403 as const }
        }

        availableBalance = normalizeMoney(participant.account_balance)
        const fundedBaseAmount = participant.account_type === "funded"
          ? getFundedBaseAmount(participant.account_balance, participant.funded_initial_balance)
          : 0
        const fundedPredictionMax = getFundedPredictionMaxAmount(
          participant.account_type,
          participant.account_balance,
          participant.funded_initial_balance,
        )

        if (fundedPredictionMax !== null && requestedAmount > fundedPredictionMax) {
          return {
            error: `Funded accounts can place prediction trades up to $${fundedPredictionMax.toFixed(2)}.`,
            status: 400 as const,
            availableBalance,
          }
        }

        if (participant.account_type === "funded") {
          const committedResult = await client.query(
            `SELECT
               (SELECT COALESCE(SUM(amount), 0) FROM predictions WHERE participant_email = $1 AND status IN ('pending', 'settling') AND balance_source = 'wallet')
               + (SELECT COALESCE(SUM(margin), 0) FROM forex_trades WHERE participant_email = $1 AND status IN ('open', 'pending')) AS committed_funds`,
            [participantEmail],
          )
          committedFunds = Number(committedResult.rows[0]?.committed_funds ?? 0)
          fundedInitialBalance = Number(participant.funded_initial_balance) || fundedBaseAmount
          if (participant.funded_breach_status === "breached") {
            return { error: "Funded account breached the 3% maximum drawdown rule. Trading is disabled until administrator reactivation.", status: 403 as const }
          }
        }
      }

      if (requestedAmount > availableBalance) {
        return {
          error: balanceSource === "demo" ? "This trade is larger than your available demo funds" : "Insufficient real balance",
          status: 400 as const,
          availableBalance,
        }
      }

      const expiryTimestamp = new Date(Date.now() + timeframeSeconds * 1000).toISOString()
      const predictionResult = await client.query(
        `INSERT INTO predictions
           (participant_id, participant_email, crypto_pair, prediction_type, amount, entry_price, expiry_at, timeframe_seconds, status, profit_loss, balance_source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',0,$9)
         RETURNING id, participant_id, participant_email, crypto_pair, prediction_type, amount, entry_price, expiry_at,
                   timeframe_seconds, status, profit_loss, balance_source, created_at`,
        [participant.id, participantEmail, cryptoPair, predictionType, requestedAmount, entryPrice, expiryTimestamp, timeframeSeconds, balanceSource],
      )
      const prediction = predictionResult.rows[0]
      const newBalance = normalizeMoney(availableBalance - requestedAmount)
      responseBalance = newBalance

      if (balanceSource === "wallet") {
        const totalCommittedAfterBet = committedFunds + requestedAmount
        const fundedEquity = getFundedEquity(fundedInitialBalance, newBalance, totalCommittedAfterBet)
        const shouldBreach = isFundedDrawdownBreached(
          participant.account_type,
          fundedInitialBalance,
          newBalance,
          totalCommittedAfterBet,
        )
        const balanceAfter = shouldBreach ? 0 : newBalance
        responseBalance = balanceAfter

        await client.query(
          `UPDATE participants
           SET account_balance = $1,
               funded_initial_balance = CASE WHEN account_type = 'funded' AND funded_initial_balance IS NULL THEN $2 ELSE funded_initial_balance END,
               funded_breach_status = CASE WHEN $3 AND COALESCE(funded_breach_status, 'clear') <> 'breached' THEN 'breached' ELSE funded_breach_status END,
               funded_breach_at = CASE WHEN $3 AND COALESCE(funded_breach_status, 'clear') <> 'breached' THEN NOW() ELSE funded_breach_at END,
               funded_breach_balance = CASE WHEN $3 AND COALESCE(funded_breach_status, 'clear') <> 'breached' THEN 0 ELSE funded_breach_balance END,
               funded_breach_equity = CASE WHEN $3 AND COALESCE(funded_breach_status, 'clear') <> 'breached' THEN $4 ELSE funded_breach_equity END,
               updated_at = NOW()
           WHERE id = $5`,
          [balanceAfter, fundedInitialBalance, shouldBreach, fundedEquity, participant.id],
        )

        await client.query(
          `INSERT INTO transactions
             (participant_id, participant_email, type, amount, description, reference_id, status, balance_before, balance_after)
           VALUES ($1,$2,'prediction_bet',$3,$4,$5,'completed',$6,$7)`,
          [
            participant.id,
            participantEmail,
            -requestedAmount,
            `Placed ${predictionType} prediction on ${cryptoPair} @ ${entryPrice}`,
            prediction.id,
            availableBalance,
            balanceAfter,
          ],
        )
        if (shouldBreach) {
          await client.query(
            `UPDATE forex_trades SET status = 'cancelled', close_reason = 'manual', updated_at = NOW()
             WHERE LOWER(participant_email) = LOWER($1) AND status = 'pending'`,
            [participantEmail],
          )
          if (newBalance > 0) {
            await client.query(
              `INSERT INTO transactions
                 (participant_id, participant_email, type, amount, description, balance_before, balance_after, status)
               VALUES ($1, $2, 'funded_drawdown_reset', $3, 'Funded balance reset to $0.00 after maximum drawdown breach', $3, 0, 'completed')`,
              [participant.id, participantEmail, newBalance],
            )
          }
        }
      }

      return { prediction, expiryTimestamp, newBalance: responseBalance, balanceSource }
    })

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error, available_balance: result.availableBalance },
        { status: result.status },
      )
    }

    return NextResponse.json({
      success: true,
      prediction: { ...result.prediction, expiry_timestamp: result.expiryTimestamp },
      new_balance: result.newBalance,
      balance_source: result.balanceSource,
      account_frozen: false,
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
    const participantEmail = auth.email.toLowerCase().trim()
    const requestedEmail = searchParams.get("participant_email")?.toLowerCase().trim()
    const limit = Math.min(1_000, Math.max(1, Number.parseInt(searchParams.get("limit") || "1000")))
    const status = searchParams.get("status")
    const source = searchParams.get("source")

    if (requestedEmail && requestedEmail !== participantEmail) {
      return NextResponse.json({ error: "You can only view your own trades" }, { status: 403 })
    }
    if (source && !["all", "demo", "real"].includes(source)) {
      return NextResponse.json({ error: "Choose a valid account filter" }, { status: 400 })
    }

    const resetRows = await query<{ reset_at: Date | null }>(
      `SELECT MAX(created_at) AS reset_at
       FROM transactions
       WHERE participant_email = $1 AND type = $2`,
      [participantEmail, DEMO_RESET_TRANSACTION_TYPE],
    )
    const resetAt = resetRows[0]?.reset_at ?? null
    const params: Array<string | number | Date> = [participantEmail]
    let whereClause = "WHERE p.participant_email = $1"

    if (source === "demo") {
      whereClause += " AND p.balance_source = 'demo'"
      if (resetAt) {
        params.push(resetAt)
        whereClause += ` AND p.created_at > $${params.length}`
      }
    } else if (source === "real") {
      whereClause += " AND COALESCE(p.balance_source, 'wallet') <> 'demo'"
    } else if (resetAt) {
      params.push(resetAt)
      whereClause += ` AND (COALESCE(p.balance_source, 'wallet') <> 'demo' OR p.created_at > $${params.length})`
    }

    if (status && status !== "all") {
      params.push(status)
      whereClause += ` AND p.status = $${params.length}`
    }

    const [rows, balanceRows] = await Promise.all([
      query(
        `SELECT p.id, p.participant_id, p.participant_email, p.crypto_pair, p.prediction_type, p.amount,
                p.entry_price, p.expiry_at, p.timeframe_seconds, p.result, p.profit_loss, p.status,
                p.target_price, p.closed_at, p.balance_source, p.created_at
         FROM predictions p
         ${whereClause}
         ORDER BY p.created_at DESC
         LIMIT $${params.length + 1}`,
        [...params, limit],
      ) as Promise<any[]>,
      query<{ available_balance: number; settled_profit_loss: number; open_trades: number }>(
        `SELECT $2::numeric
           + COALESCE(SUM(CASE WHEN status = 'settled' THEN profit_loss ELSE 0 END), 0)
           - COALESCE(SUM(CASE WHEN status IN ('pending', 'settling') THEN amount ELSE 0 END), 0) AS available_balance,
           COALESCE(SUM(CASE WHEN status = 'settled' THEN profit_loss ELSE 0 END), 0) AS settled_profit_loss,
           COUNT(*) FILTER (WHERE status IN ('pending', 'settling'))::int AS open_trades
         FROM predictions
         WHERE participant_email = $1
           AND balance_source = 'demo'
           AND ($3::timestamptz IS NULL OR created_at > $3::timestamptz)`,
        [participantEmail, DEMO_STARTING_BALANCE, resetAt],
      ),
    ])

    const account = balanceRows[0]
    return NextResponse.json({
      success: true,
      predictions: rows.map((prediction) => ({ ...prediction, expiry_timestamp: prediction.expiry_at })),
      total: rows.length,
      demo_account: {
        starting_balance: DEMO_STARTING_BALANCE,
        available_balance: normalizeMoney(account?.available_balance ?? DEMO_STARTING_BALANCE),
        settled_profit_loss: Number(account?.settled_profit_loss ?? 0),
        open_trades: Number(account?.open_trades ?? 0),
        can_deposit: false,
        can_withdraw: false,
      },
    })
  } catch (error) {
    console.error("[v0] Predictions GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    const participantEmail = auth.email.toLowerCase().trim()
    const result = await withTransaction(async (client) => {
      const participantResult = await client.query(
        "SELECT id FROM participants WHERE id = $1 AND LOWER(email) = $2 LIMIT 1 FOR UPDATE",
        [auth.participantId, participantEmail],
      )
      const participant = participantResult.rows[0]
      if (!participant) return { error: "Participant not found", status: 404 as const }

      const openResult = await client.query(
        `SELECT COUNT(*)::int AS open_trades
         FROM predictions
         WHERE participant_email = $1 AND balance_source = 'demo' AND status IN ('pending', 'settling')`,
        [participantEmail],
      )
      const openTrades = Number(openResult.rows[0]?.open_trades ?? 0)
      if (openTrades > 0) {
        return { error: "Wait for your active demo trades to settle before resetting.", status: 409 as const, openTrades }
      }

      const resetAt = await getDemoResetAt(client, participantEmail)
      const balanceResult = await client.query(
        `SELECT $2::numeric + COALESCE(SUM(CASE WHEN status = 'settled' THEN profit_loss ELSE 0 END), 0) AS available_balance
         FROM predictions
         WHERE participant_email = $1
           AND balance_source = 'demo'
           AND ($3::timestamptz IS NULL OR created_at > $3::timestamptz)`,
        [participantEmail, DEMO_STARTING_BALANCE, resetAt],
      )
      const balanceBefore = normalizeMoney(balanceResult.rows[0]?.available_balance ?? DEMO_STARTING_BALANCE)

      await client.query(
        `INSERT INTO transactions
           (participant_id, participant_email, type, amount, description, status, balance_before, balance_after)
         VALUES ($1,$2,$3,0,'Participant reset the prediction demo account','completed',$4,$5)`,
        [participant.id, participantEmail, DEMO_RESET_TRANSACTION_TYPE, balanceBefore, DEMO_STARTING_BALANCE],
      )

      return { balanceBefore }
    })

    if ("error" in result) {
      return NextResponse.json({ error: result.error, open_trades: result.openTrades }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      message: "Demo account reset",
      demo_account: {
        starting_balance: DEMO_STARTING_BALANCE,
        available_balance: DEMO_STARTING_BALANCE,
        settled_profit_loss: 0,
        open_trades: 0,
        can_deposit: false,
        can_withdraw: false,
      },
    })
  } catch (error) {
    console.error("[v0] Demo account reset error:", error)
    return NextResponse.json({ error: "Demo account could not be reset" }, { status: 500 })
  }
}
