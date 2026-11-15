import { NextRequest, NextResponse } from "next/server"
import { requireParticipantSession } from "@/lib/auth-middleware"
import { query, withTransaction } from "@/lib/db"

const DEMO_STARTING_BALANCE = 1_000
const ALLOWED_TIMEFRAMES = new Set([60, 180, 300, 600, 900, 1800, 3600, 7200, 18000, 36000, 86400])

function normalizeDemoBalance(value: unknown) {
  return Math.max(0, Number(Number(value ?? DEMO_STARTING_BALANCE).toFixed(2)))
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

    if (!/^[A-Z0-9]{5,16}$/.test(cryptoPair) || !["up", "down"].includes(predictionType)) {
      return NextResponse.json({ error: "Choose a valid market and direction" }, { status: 400 })
    }
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0 || Math.abs(requestedAmount * 100 - Math.round(requestedAmount * 100)) > 1e-8) {
      return NextResponse.json({ error: "Enter a valid demo amount with up to two decimal places" }, { status: 400 })
    }
    if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
      return NextResponse.json({ error: "A valid live entry price is required" }, { status: 400 })
    }
    if (!ALLOWED_TIMEFRAMES.has(timeframeSeconds)) {
      return NextResponse.json({ error: "Choose a supported trade duration" }, { status: 400 })
    }

    const result = await withTransaction(async (client) => {
      const participantResult = await client.query(
        "SELECT id FROM participants WHERE id = $1 AND LOWER(email) = $2 LIMIT 1 FOR UPDATE",
        [auth.participantId, participantEmail],
      )
      const participant = participantResult.rows[0]
      if (!participant) return { error: "Participant not found", status: 404 as const }

      const balanceResult = await client.query(
        `SELECT $2::numeric
           + COALESCE(SUM(CASE WHEN status = 'settled' THEN profit_loss ELSE 0 END), 0)
           - COALESCE(SUM(CASE WHEN status IN ('pending', 'settling') THEN amount ELSE 0 END), 0) AS available_balance
         FROM predictions
         WHERE participant_email = $1 AND balance_source = 'demo'`,
        [participantEmail, DEMO_STARTING_BALANCE],
      )
      const availableBalance = normalizeDemoBalance(balanceResult.rows[0]?.available_balance)
      if (requestedAmount > availableBalance) {
        return { error: "This trade is larger than your available demo funds", status: 400 as const, availableBalance }
      }

      const expiryTimestamp = new Date(Date.now() + timeframeSeconds * 1000).toISOString()
      const predictionResult = await client.query(
        `INSERT INTO predictions
           (participant_id, participant_email, crypto_pair, prediction_type, amount, entry_price, expiry_at, timeframe_seconds, status, profit_loss, balance_source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',0,'demo')
         RETURNING id, participant_id, participant_email, crypto_pair, prediction_type, amount, entry_price, expiry_at, timeframe_seconds, status, profit_loss, created_at`,
        [participant.id, participantEmail, cryptoPair, predictionType, requestedAmount, entryPrice, expiryTimestamp, timeframeSeconds],
      )

      return {
        prediction: predictionResult.rows[0],
        expiryTimestamp,
        availableBalance,
        newBalance: normalizeDemoBalance(availableBalance - requestedAmount),
      }
    })

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error, demo_balance: result.availableBalance },
        { status: result.status },
      )
    }

    return NextResponse.json({
      success: true,
      prediction: { ...result.prediction, expiry_timestamp: result.expiryTimestamp },
      new_balance: result.newBalance,
      balance_source: "demo",
      demo_account: {
        starting_balance: DEMO_STARTING_BALANCE,
        available_balance: result.newBalance,
        can_deposit: false,
        can_withdraw: false,
      },
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

    if (requestedEmail && requestedEmail !== participantEmail) {
      return NextResponse.json({ error: "You can only view your own demo trades" }, { status: 403 })
    }

    let whereClause = "WHERE participant_email = $1 AND balance_source = 'demo'"
    const params: Array<string | number> = [participantEmail]
    if (status && status !== "all") {
      whereClause += ` AND status = $${params.length + 1}`
      params.push(status)
    }

    const [rows, balanceRows] = await Promise.all([
      query(
        `SELECT id, participant_id, participant_email, crypto_pair, prediction_type, amount, entry_price, expiry_at, timeframe_seconds,
                result, profit_loss, status, target_price, closed_at, created_at
         FROM predictions
         ${whereClause}
         ORDER BY created_at DESC
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
         WHERE participant_email = $1 AND balance_source = 'demo'`,
        [participantEmail, DEMO_STARTING_BALANCE],
      ),
    ])

    const account = balanceRows[0]
    return NextResponse.json({
      success: true,
      predictions: rows.map((prediction) => ({ ...prediction, expiry_timestamp: prediction.expiry_at })),
      total: rows.length,
      demo_account: {
        starting_balance: DEMO_STARTING_BALANCE,
        available_balance: normalizeDemoBalance(account?.available_balance),
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
