import { NextRequest, NextResponse } from "next/server"
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai"
import { z } from "zod"

import { requireParticipantSession } from "@/lib/auth-middleware"
import { getPool } from "@/lib/db"
import { enforceRateLimit, getSecurityContext } from "@/lib/security"
import { COACH_MODES, COACH_MODELS, coachQuoteStatus, summarizeCoachCandles } from "@/lib/trade-coach"

export const maxDuration = 60
export const dynamic = "force-dynamic"

const pairSchema = z.enum(["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "XAU/USD"])
const timeframeSchema = z.enum(["1M", "5M", "15M", "30M", "1H", "4H", "1D", "1W"])
const timeframeSeconds: Record<z.infer<typeof timeframeSchema>, number> = {
  "1M": 60,
  "5M": 300,
  "15M": 900,
  "30M": 1800,
  "1H": 3600,
  "4H": 14400,
  "1D": 86400,
  "1W": 604800,
}

function safeModel(model: unknown) {
  return COACH_MODELS.some((item) => item.id === model) ? String(model) : COACH_MODELS[0].id
}

export async function POST(req: NextRequest) {
  const auth = await requireParticipantSession(req)
  if (!auth.ok) return auth.response

  const context = getSecurityContext(req)
  const rate = await enforceRateLimit("api", `ai:${auth.participantId}:${context.ipAddress || "unknown"}`)
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many AI requests. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter || 60) } },
    )
  }

  const contentLength = Number(req.headers.get("content-length") || 0)
  if (contentLength > 64_000) return NextResponse.json({ error: "Chat request is too large." }, { status: 413 })

  const body = await req.json().catch(() => null)
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "A message is required." }, { status: 400 })
  }

  const messages = (body.messages as UIMessage[]).slice(-30)
  const pairResult = pairSchema.safeParse(body.pair)
  const timeframeResult = timeframeSchema.safeParse(body.timeframe)
  const pair = pairResult.success ? pairResult.data : "EUR/USD"
  const timeframe = timeframeResult.success ? timeframeResult.data : "1H"
  const mode = COACH_MODES.find((item) => item.id === body.mode) ?? COACH_MODES[0]
  const db = getPool()

  const systemPrompt = `You are EliteFund AI Trade Coach. You are an educational decision-support coach, not a broker, signal service, or financial adviser. Never tell the participant to buy, sell, enter, or hold as a personalized command. Never promise returns. Never invent live prices, account values, news, spreads, order status, or policy rules.

Current coach context: mode=${mode.label}; instrument=${pair}; timeframe=${timeframe}; generatedAt=${new Date().toISOString()}.
Selected workflow: ${mode.prompt}

Rules:
- Use getCoachSnapshot before answering questions about current market, account, exposure, or performance.
- Treat all quote and candle data as current only at the returned timestamps. If status is delayed or unverified, say so prominently and do not calculate an executable entry or stop from it.
- Separate verified observations, interpretations, scenarios, and missing data.
- For a plan, require the participant's direction, entry, stop, target, and risk budget before position-size math. Explain that position sizing is a framework, not an order instruction.
- Discuss invalidation, spread/slippage, leverage, margin, concentration, drawdown, and no-trade conditions. Margin is not maximum loss.
- For performance, state sample size and scope. Do not infer skill from a small sample.
- You cannot place, modify, or cancel trades. You can only explain data returned by tools.
- Keep answers concise and scannable. End with a short next-step checklist and a clear data-quality note.`

  const getAuthorizedParticipant = async () => {
    if (!db) return null
    const result = await db.query(
      `SELECT email, username, account_type, account_balance, bonus_balance, account_frozen, is_frozen, status,
              funded_initial_balance, funded_breach_status, challenge_status, challenge_plan_key
       FROM participants
       WHERE id = $1 AND LOWER(email) = LOWER($2)
       LIMIT 1`,
      [auth.participantId, auth.email],
    )
    return result.rows[0] ?? null
  }

  const getTradeSnapshot = async (request: Request) => {
    const response = await fetch(new URL("/api/forex/trades", request.url), {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    }).catch(() => null)
    if (!response) return { error: "Authenticated trade history is unavailable.", open: [], pending: [], closed: [] }
    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.success) return { error: "Authenticated trade history is unavailable.", open: [], pending: [], closed: [] }
    return { open: data.open ?? [], pending: data.pending ?? [], closed: data.closed ?? [] }
  }

  const getMarketSnapshot = async (request: Request, requestedPair: z.infer<typeof pairSchema>, requestedTimeframe: z.infer<typeof timeframeSchema>) => {
    const ratesUrl = new URL("/api/forex/rates", request.url)
    const candlesUrl = new URL("/api/forex/candles", request.url)
    candlesUrl.searchParams.set("pair", requestedPair)
    candlesUrl.searchParams.set("tf", requestedTimeframe)

    const [ratesResponse, candlesResponse] = await Promise.all([
      fetch(ratesUrl, { cache: "no-store" }).catch(() => null),
      fetch(candlesUrl, { cache: "no-store" }).catch(() => null),
    ])
    const ratesData = await ratesResponse?.json().catch(() => null)
    const candlesData = await candlesResponse?.json().catch(() => null)
    const now = Date.now()
    const quote = ratesData?.rates?.[requestedPair]
    const mid = Number(quote?.mid ?? quote)
    const source = String(ratesData?.sources?.[requestedPair] ?? ratesData?.source ?? "unknown")
    const refreshedAt = Number(ratesData?.ts ?? now)
    const observedAt = ratesData?.quoteTimes?.[requestedPair] ? Number(ratesData.quoteTimes[requestedPair]) : null
    const bid = Number.isFinite(Number(quote?.bid)) ? Number(quote.bid) : null
    const ask = Number.isFinite(Number(quote?.ask)) ? Number(quote.ask) : null

    const candles = Array.isArray(candlesData?.candles)
      ? candlesData.candles.map((candle: Record<string, unknown>) => ({
          ts: Number(candle.ts),
          open: Number(candle.open),
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close),
        }))
      : []
    const candleSummary = summarizeCoachCandles(candles, timeframeSeconds[requestedTimeframe], now)

    return {
      quote: Number.isFinite(mid) && mid > 0
        ? {
            pair: requestedPair,
            mid,
            bid,
            ask,
            spread: bid !== null && ask !== null ? ask - bid : null,
            source,
            observedAt: observedAt ? new Date(observedAt).toISOString() : null,
            refreshedAt: new Date(refreshedAt).toISOString(),
            status: coachQuoteStatus(observedAt, refreshedAt, source, now),
            spreadType: bid !== null && ask !== null ? "provider" : "unavailable",
          }
        : null,
      quoteError: Number.isFinite(mid) && mid > 0 ? null : "No verified quote was returned.",
      candles: candleSummary,
      candleSource: String(candlesData?.provider ?? candlesData?.source ?? "unknown"),
      candlesRefreshedAt: candlesData?.ts ? new Date(Number(candlesData.ts)).toISOString() : null,
      candleWarning: candlesData?.warning ?? candlesData?.error ?? null,
    }
  }

  const result = streamText({
    model: safeModel(body.model),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 1200,
    temperature: 0.2,
    stopWhen: stepCountIs(4),
    tools: {
      getCoachSnapshot: tool({
        description: "Retrieve the signed-in participant's account, trades, verified quote, and candle summary for the selected instrument and timeframe. Use this before current-data answers.",
        inputSchema: z.object({}),
        execute: async () => {
          const [participant, market, trades] = await Promise.all([
            getAuthorizedParticipant(),
            getMarketSnapshot(req, pair, timeframe),
            getTradeSnapshot(req),
          ])
          return {
            asOf: new Date().toISOString(),
            pair,
            timeframe,
            market,
            trades: {
              openCount: trades.open.length,
              pendingCount: trades.pending.length,
              closedCount: trades.closed.length,
              open: trades.open.slice(0, 30),
              recentClosed: trades.closed.slice(0, 20),
              error: "error" in trades ? trades.error : null,
            },
            account: participant
              ? {
                  accountType: participant.account_type,
                  balance: Number(participant.account_balance ?? 0),
                  bonusBalance: Number(participant.bonus_balance ?? 0),
                  frozen: Boolean(participant.account_frozen || participant.is_frozen || participant.status === "frozen"),
                  fundedInitialBalance: participant.funded_initial_balance === null ? null : Number(participant.funded_initial_balance),
                  fundedBreachStatus: participant.funded_breach_status ?? null,
                  challengeStatus: participant.challenge_status ?? null,
                  challengePlanKey: participant.challenge_plan_key ?? null,
                }
              : null,
            limitations: [
              "This snapshot does not calculate live unrealized P&L or maximum loss.",
              "No news feed is connected; do not describe a headline as live.",
              "Historical candle observations are not predictive signals.",
              "Only the signed-in participant session is queried.",
            ],
          }
        },
      }),
      getPlatformStats: tool({
        description: "Get current non-sensitive EliteFund platform statistics.",
        inputSchema: z.object({}),
        execute: async () => {
          if (!db) return { error: "Database unavailable." }
          const [participants, active] = await Promise.all([
            db.query("SELECT COUNT(*)::int AS count FROM participants"),
            db.query("SELECT COUNT(*)::int AS count FROM participants WHERE is_active = true"),
          ])
          return {
            totalParticipants: participants.rows[0]?.count ?? 0,
            activeParticipants: active.rows[0]?.count ?? 0,
            asOf: new Date().toISOString(),
          }
        },
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
