import "server-only"

import { calculateChallengePnl } from "@/lib/challenge-account"
import { getPool } from "@/lib/db"

export async function isChallengeAccount(email: unknown) {
  if (typeof email !== "string" || !email.trim()) return false
  const db = getPool()
  if (!db) throw new Error("Database unavailable")
  const result = await db.query(
    "SELECT account_type FROM participants WHERE LOWER(email) = LOWER($1) LIMIT 1",
    [email.trim()],
  )
  return result.rows[0]?.account_type === "challenge"
}

export interface ChallengeRate {
  bid: number
  ask: number
}

export interface ChallengePosition {
  pair: string
  direction: "BUY" | "SELL"
  lot_size: number | string
  open_price: number | string
  swap?: number | string
}

const LIVE_RATE_SOURCES = new Set(["tiingo", "twelve-data", "yahoo", "gold-api"])

export async function getLiveChallengeRates(origin: string) {
  try {
    const response = await fetch(new URL("/api/forex/rates", origin), {
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    })
    if (!response.ok) return null

    const snapshot = await response.json()
    if (!snapshot?.rates || !snapshot?.sources) return null

    return Object.fromEntries(
      Object.entries(snapshot.rates as Record<string, unknown>).flatMap(([pair, value]) => {
        const source = snapshot.sources[pair]
        const quote = value as Partial<ChallengeRate> | null
        if (!LIVE_RATE_SOURCES.has(source) || !quote) return []
        const bid = Number(quote.bid)
        const ask = Number(quote.ask)
        if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask < bid) return []
        return [[pair, { bid, ask } satisfies ChallengeRate]]
      }),
    ) as Record<string, ChallengeRate>
  } catch {
    return null
  }
}

export function getChallengeExecutionPrice(
  rates: Record<string, ChallengeRate> | null,
  pair: string,
  direction: "BUY" | "SELL",
  closing = false,
) {
  const quote = rates?.[pair]
  if (!quote) return null
  const price = closing
    ? direction === "BUY" ? quote.bid : quote.ask
    : direction === "BUY" ? quote.ask : quote.bid
  return Number.isFinite(price) && price > 0 ? price : null
}

export function getChallengeOpenPositionPnl(
  positions: ChallengePosition[],
  rates: Record<string, ChallengeRate> | null,
) {
  if (positions.length === 0) return { pnl: 0, complete: true }
  if (!rates) return { pnl: 0, complete: false }

  let pnl = 0
  for (const position of positions) {
    const closePrice = getChallengeExecutionPrice(rates, position.pair, position.direction, true)
    if (closePrice === null) return { pnl: 0, complete: false }
    const result = calculateChallengePnl(
      position.pair,
      position.direction,
      Number(position.lot_size),
      Number(position.open_price),
      closePrice,
      Number(position.swap) || 0,
    )
    pnl += result.pnl
  }

  return { pnl: Number(pnl.toFixed(2)), complete: true }
}
