import { streamText, tool, convertToModelMessages, type UIMessage } from "ai"
import { z } from "zod"
import { getPool } from "@/lib/db"
import { COACH_MODES, COACH_MODELS, coachQuoteStatus } from "@/lib/trade-coach"

export const maxDuration = 60

const pairSchema = z.enum(["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "XAU/USD"])
const timeframeSchema = z.enum(["1M", "5M", "15M", "30M", "1H", "4H", "1D", "1W"])

function safeModel(model: string | undefined) {
  return COACH_MODELS.some((item) => item.id === model) ? model! : COACH_MODELS[0].id
}

export async function POST(req: Request) {
  const body = await req.json()
  const messages = body.messages as UIMessage[]
  const userEmail = typeof body.userEmail === "string" ? body.userEmail.trim().toLowerCase() : ""
  const pair = pairSchema.safeParse(body.pair).success ? body.pair : "EUR/USD"
  const timeframe = timeframeSchema.safeParse(body.timeframe).success ? body.timeframe : "1H"
  const mode = COACH_MODES.find((item) => item.id === body.mode) ?? COACH_MODES[0]
  const db = getPool()

  const systemPrompt = `You are EliteFund AI Trade Coach. You are an educational decision-support coach, not a broker, signal service, or financial adviser. Never tell the participant to buy, sell, enter, or hold as a personalized command. Never promise returns. Never invent live prices, account values, news, spreads, order status, or policy rules.

Current coach context: mode=${mode.label}; instrument=${pair}; timeframe=${timeframe}; generatedAt=${new Date().toISOString()}.

Rules:
- Use getCoachSnapshot before answering questions about current market, account, exposure, or performance.
- Treat all quote data as current only at its returned observedAt/refreshedAt timestamps. If status is delayed or unverified, say so prominently and do not calculate an executable entry or stop from it.
- Separate verified observations, interpretations, scenarios, and missing data.
- For a plan, require the participant's direction, entry, stop, target, and risk budget before position-size math. Explain that position sizing is a framework, not an order instruction.
- Discuss invalidation, spread/slippage, leverage, margin, concentration, drawdown, and no-trade conditions. Margin is not maximum loss.
- For performance, state sample size and scope. Do not infer skill from a small sample.
- You cannot place, modify, or cancel trades. You can only explain data returned by tools.
- End with a short next-step checklist and a clear data-quality note.`

  const getAuthorizedParticipant = async () => {
    if (!db || !userEmail) return null
    const result = await db.query(`SELECT email, username, account_type, account_balance, bonus_balance, account_frozen, is_frozen, status, funded_initial_balance, funded_breach_status, challenge_status, challenge_plan_key FROM participants WHERE LOWER(email) = $1 LIMIT 1`, [userEmail])
    return result.rows[0] ?? null
  }

  const getTradeSnapshot = async (request: Request) => {
    const response = await fetch(new URL("/api/forex/trades", request.url), { headers: { cookie: request.headers.get("cookie") ?? "" }, cache: "no-store" })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.success) return { error: "Authenticated trade history is unavailable.", open: [], pending: [], closed: [] }
    return { open: data.open ?? [], pending: data.pending ?? [], closed: data.closed ?? [] }
  }

  const getMarketSnapshot = async (request: Request, requestedPair: string) => {
    const url = new URL("/api/forex/rates", request.url)
    url.searchParams.set("pair", requestedPair)
    const response = await fetch(url, { headers: { cookie: request.headers.get("cookie") ?? "" }, cache: "no-store" })
    const data = await response.json().catch(() => null)
    const now = Date.now()
    const rate = data?.rates?.[pair]
    const source = String(data?.sources?.[pair] ?? "unknown")
    const refreshedAt = Number(data?.ts ?? now)
    const observedAt = data?.quoteTimes?.[pair] ? Number(data.quoteTimes[pair]) : null
    if (!rate || !Number.isFinite(Number(rate))) return { pair, error: "No verified quote was returned.", source, refreshedAt: new Date(refreshedAt).toISOString() }
    const bid = Number(data?.bid?.[pair]) || null
    const ask = Number(data?.ask?.[pair]) || null
    return { pair, mid: Number(rate), bid, ask, spread: bid && ask ? ask - bid : null, source, observedAt: observedAt ? new Date(observedAt).toISOString() : null, refreshedAt: new Date(refreshedAt).toISOString(), status: coachQuoteStatus(observedAt, refreshedAt, source, now), spreadType: bid && ask ? "provider" : "estimated unavailable" }
  }

  const result = streamText({
    model: safeModel(body.model),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 1200,
    temperature: 0.2,
    tools: {
      getCoachSnapshot: tool({
        description: "Retrieve the signed-in participant's account context and the verified current quote for the selected instrument. Use this before current-data answers.",
        inputSchema: z.object({ pair: pairSchema, timeframe: timeframeSchema }),
        execute: async ({ pair: requestedPair, timeframe: requestedTimeframe }) => {
          const participant = await getAuthorizedParticipant()
          const [market, trades] = await Promise.all([getMarketSnapshot(req, requestedPair), getTradeSnapshot(req)])
          return {
            asOf: new Date().toISOString(),
            pair: requestedPair,
            timeframe: requestedTimeframe,
            market,
            trades: { openCount: trades.open.length, pendingCount: trades.pending.length, closedCount: trades.closed.length, open: trades.open.slice(0, 30), recentClosed: trades.closed.slice(0, 20) },
            account: participant ? { accountType: participant.account_type, balance: Number(participant.account_balance ?? 0), bonusBalance: Number(participant.bonus_balance ?? 0), frozen: Boolean(participant.account_frozen || participant.is_frozen || participant.status === "frozen"), fundedInitialBalance: participant.funded_initial_balance === null ? null : Number(participant.funded_initial_balance), fundedBreachStatus: participant.funded_breach_status ?? null, challengeStatus: participant.challenge_status ?? null, challengePlanKey: participant.challenge_plan_key ?? null } : null,
            limitations: ["This snapshot does not calculate unrealized P&L or maximum loss.", "No news feed is connected to this coach; do not describe a headline as live.", "Only the signed-in participant email is queried."],
          }
        },
      }),
      getPlatformStats: tool({ description: "Get non-sensitive platform statistics.", inputSchema: z.object({}), execute: async () => {
        if (!db) return { error: "Database unavailable." }
        const [participants, active, payouts] = await Promise.all([db.query("SELECT COUNT(*)::int AS count FROM participants"), db.query("SELECT COUNT(*)::int AS count FROM participants WHERE is_active = true"), db.query("SELECT COUNT(*)::int AS count FROM payout_requests WHERE status = 'pending'")])
        return { totalParticipants: participants.rows[0]?.count ?? 0, activeParticipants: active.rows[0]?.count ?? 0, pendingPayouts: payouts.rows[0]?.count ?? 0, asOf: new Date().toISOString() }
      } }),
    },
  })

  return result.toUIMessageStreamResponse()
}
