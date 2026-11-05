export const COACH_MODELS = [
  { id: "openai/gpt-6.1-sol", label: "GPT 6.1 Sol" },
  { id: "anthropic/claude-sonnet-5.5", label: "Claude Sonnet 5.5" },
  { id: "google/gemini-4-argon", label: "Gemini 4 Argon" },
] as const

export const COACH_MODES = [
  { id: "market", label: "Market brief", description: "Price, trend, volatility, and data quality", prompt: "Give me a current market brief for the selected instrument and timeframe. Separate verified observations from scenarios, cite data timestamps, and explain what is missing." },
  { id: "plan", label: "Trade planner", description: "Thesis, invalidation, and a sizing framework", prompt: "Help me build a conditional trade plan for the selected market and timeframe. Review available candles and my account constraints. Ask for my intended direction, entry, stop, and risk budget before calculating position size. Include a no-trade scenario." },
  { id: "risk", label: "Risk checklist", description: "Open exposure, missing stops, account limits", prompt: "Review my current account and open trades. Identify missing stops, concentrated exposure, and relevant account restrictions. Give me a prioritized pre-trade risk checklist. Do not confuse margin with maximum loss." },
  { id: "review", label: "Performance review", description: "Recent results and repeatable improvements", prompt: "Review my recorded closed trades and open positions. Explain win rate, net realized P&L, sample size, and concentration. Distinguish evidence from assumptions and suggest three process improvements without inventing my trading intentions." },
] as const

export type CoachMode = typeof COACH_MODES[number]["id"]
export const COACH_TIMEFRAMES = ["1M", "5M", "15M", "30M", "1H", "4H", "1D", "1W"] as const
export type CoachLaunch = { id: number; mode: CoachMode; pair: string; timeframe: string }
export type CoachMetadata = { model: string; asOf: string; pair: string; timeframe: string }

export type CoachQuote = {
  mid: number
  bid: number | null
  ask: number | null
  source: string
  observedAt: string | null
  refreshedAt: string
  status: "fresh" | "delayed" | "unverified"
  spreadType: "provider" | "estimated"
}

export type CoachSnapshot = {
  asOf: string
  pair: string
  market: { quote: CoachQuote | null; error: string | null }
  account: { type: string; balance: number | null; bonusBalance: number | null; frozen: boolean; fundedInitialBalance: number | null; fundedBreachStatus: string | null; challengeStatus: string | null; challengePlanKey: string | null } | null
  trades: {
    openCount: number
    pendingCount: number
    missingStops: number
    committedMargin: number
    closedCount: number
    wins: number
    winRate: number | null
    realizedPnl: number
    open: CoachTrade[]
    recentClosed: CoachTrade[]
    exposureByPair: Record<string, number>
    scope: string
  } | null
  warnings: string[]
}

export type CoachTrade = { pair: string; direction: string; lotSize: number; openPrice: number; sl: number | null; tp: number | null; margin: number; finalPnl?: number; closeTime?: string }

export function summarizeCoachTrades(open: CoachTrade[], pendingCount: number, closed: CoachTrade[]) {
  const wins = closed.filter((trade) => (trade.finalPnl ?? 0) > 0).length
  return {
    openCount: open.length,
    pendingCount,
    missingStops: open.filter((trade) => trade.sl === null || trade.sl <= 0).length,
    committedMargin: open.reduce((sum, trade) => sum + trade.margin, 0),
    closedCount: closed.length,
    wins,
    winRate: closed.length ? wins / closed.length * 100 : null,
    realizedPnl: closed.reduce((sum, trade) => sum + (trade.finalPnl ?? 0), 0),
    open: open.slice(0, 30),
    recentClosed: closed.slice(0, 20),
    exposureByPair: open.reduce<Record<string, number>>((result, trade) => {
      result[trade.pair] = (result[trade.pair] ?? 0) + trade.margin
      return result
    }, {}),
    scope: `Latest ${closed.length} recorded closed trades (maximum 100); all ${open.length} open positions counted, details limited to 30. Margin is not maximum loss. Live unrealized P&L and equity are not calculated here.`,
  }
}

export function coachQuoteStatus(observedAt: number | null, refreshedAt: number, source: string, now = Date.now()): CoachQuote["status"] {
  if (source.includes("stale") || now - refreshedAt > 30_000) return "delayed"
  if (!observedAt || !Number.isFinite(observedAt) || observedAt > now + 5_000) return "unverified"
  return now - observedAt <= 30_000 ? "fresh" : "delayed"
}

export type CoachCandle = { ts: number; open: number; high: number; low: number; close: number }
export function summarizeCoachCandles(candles: CoachCandle[], intervalSeconds: number, now = Date.now()) {
  const complete = candles.filter((candle) => candle.ts * 1000 + intervalSeconds * 1000 <= now && [candle.ts, candle.open, candle.high, candle.low, candle.close].every(Number.isFinite) && candle.low > 0 && candle.high >= candle.low && candle.high >= Math.max(candle.open, candle.close) && candle.low <= Math.min(candle.open, candle.close)).sort((a, b) => a.ts - b.ts)
  const recent = complete.slice(-20)
  if (recent.length < 20) return { error: "At least 20 valid completed candles are required; no trend or levels inferred.", completedCandles: complete.length }
  const last = recent[recent.length - 1]
  const sma20 = recent.reduce((sum, candle) => sum + candle.close, 0) / 20
  const trueRanges = complete.slice(-14).map((candle, index) => {
    const previous = complete[complete.length - 14 + index - 1]?.close ?? candle.open
    return Math.max(candle.high - candle.low, Math.abs(candle.high - previous), Math.abs(candle.low - previous))
  })
  return { completedCandles: complete.length, lastCandleAt: new Date(last.ts * 1000).toISOString(), lastClose: last.close, sma20, meanTrueRange14: trueRanges.reduce((sum, value) => sum + value, 0) / trueRanges.length, rangeHigh20: Math.max(...recent.map((c) => c.high)), rangeLow20: Math.min(...recent.map((c) => c.low)), observation: last.close >= sma20 ? "Last completed close at or above SMA20" : "Last completed close below SMA20", warning: "Historical observations, not predictive signals. Range extremes are not validated support/resistance; mean true range uses a simple 14-bar mean, not Wilder smoothing." }
}
