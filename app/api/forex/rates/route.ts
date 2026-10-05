import { NextResponse } from "next/server"
import { YAHOO_SYMBOLS, TYPICAL_SPREADS, SEED_PRICES, decimals as dec } from "@/lib/forex-instruments"

// Cache to avoid hammering Yahoo Finance (server-side, resets on cold start)
let cache: {
  data: Record<string, { bid: number; ask: number; mid: number; change: number; high: number; low: number; open: number }>
  ts: number
} | null = null
const LIVE_REFRESH_INTERVAL_MS = 3000
const CACHE_TTL_MS = LIVE_REFRESH_INTERVAL_MS // refresh every 3s max
const UPSTREAM_TIMEOUT_MS = 6000 // never let a slow upstream stall the whole feed

type RateRow = { bid: number; ask: number; mid: number; change: number; high: number; low: number; open: number }

function seedRow(pair: string): RateRow {
  const seed = SEED_PRICES[pair] ?? 1.0
  // Deterministic fallback: unavailable upstream symbols must not jump to a
  // new random price on every 3-second poll.
  const stableOffset = (pair.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 17 - 8) / 100000
  const jitter = seed * (1 + stableOffset)
  const spread = TYPICAL_SPREADS[pair] ?? 0.0002
  const d = dec(pair)
  return {
    mid:    parseFloat(jitter.toFixed(d)),
    bid:    parseFloat((jitter - spread / 2).toFixed(d)),
    ask:    parseFloat((jitter + spread / 2).toFixed(d)),
    change: 0,
    high:   parseFloat((jitter * 1.001).toFixed(d)),
    low:    parseFloat((jitter * 0.999).toFixed(d)),
    open:   parseFloat(jitter.toFixed(d)),
  }
}

export async function GET() {
  try {
    const now = Date.now()
    if (cache && now - cache.ts < CACHE_TTL_MS) {
      return NextResponse.json({ rates: cache.data, source: "cache", provider: "gold-api.com (XAU spot) + Yahoo Finance", refreshIntervalSeconds: LIVE_REFRESH_INTERVAL_MS / 1000, ts: cache.ts })
    }

    const pairs = Object.keys(YAHOO_SYMBOLS)
    const bySymbol = new Map(pairs.map((p) => [YAHOO_SYMBOLS[p], p]))
    const ySymbols = pairs.map((p) => YAHOO_SYMBOLS[p])

    // Fetch ALL instruments in a single batched Yahoo quote call instead of
    // one request per pair — cuts ~70 round trips down to 1-2, which is both
    // far faster and far less likely to trip rate limiting.
    const [quoteResults, spotResult] = await Promise.all([
      fetchBatchedQuotes(ySymbols),
      fetchGoldSpot(),
    ])

    const data: Record<string, RateRow> = {}
    for (const pair of pairs) {
      const ySym = YAHOO_SYMBOLS[pair]
      const q = quoteResults.get(ySym)
      if (!q) {
        // Keep the last known live quote during an upstream partial failure;
        // only use the deterministic seed on the first request.
        data[pair] = cache?.data[pair] ?? seedRow(pair)
        continue
      }

      const futuresMid = q.regularMarketPrice
      if (!futuresMid || futuresMid <= 0) {
        data[pair] = cache?.data[pair] ?? seedRow(pair)
        continue
      }

      // XAU/USD is a spot quote. GC=F is useful for history, but its futures
      // price can diverge from spot, which made the terminal disagree with
      // TradingView. Use the live spot feed and translate the Yahoo ranges by
      // the same basis so the quote, chart levels, and daily change agree.
      let mid = futuresMid
      if (pair === "XAU/USD" && spotResult != null) mid = spotResult

      const basis = mid - futuresMid
      const openP = (q.regularMarketOpen ?? q.regularMarketPreviousClose ?? mid) + basis
      const high = (q.regularMarketDayHigh ?? futuresMid * 1.002) + basis
      const low = (q.regularMarketDayLow ?? futuresMid * 0.998) + basis
      const change = openP > 0 ? parseFloat((((mid - openP) / openP) * 100).toFixed(3)) : 0
      const spread = TYPICAL_SPREADS[pair] ?? 0.0002
      const d = dec(pair)

      data[pair] = {
        mid: parseFloat(mid.toFixed(d)),
        bid: parseFloat((mid - spread / 2).toFixed(d)),
        ask: parseFloat((mid + spread / 2).toFixed(d)),
        change,
        high: parseFloat(high.toFixed(d)),
        low: parseFloat(low.toFixed(d)),
        open: parseFloat(openP.toFixed(d)),
      }
    }

    if (Object.keys(data).length === 0) {
      throw new Error("All fetches failed")
    }

    cache = { data, ts: now }
    return NextResponse.json({ rates: data, source: "live", provider: "gold-api.com (XAU spot) + Yahoo Finance", refreshIntervalSeconds: LIVE_REFRESH_INTERVAL_MS / 1000, ts: now }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    })
  } catch (err) {
    // Return cached data if available even if stale
    if (cache) {
      return NextResponse.json({ rates: cache.data, source: "stale_cache", ts: cache.ts })
    }
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

type YahooQuote = {
  regularMarketPrice?: number
  regularMarketOpen?: number
  regularMarketPreviousClose?: number
  regularMarketDayHigh?: number
  regularMarketDayLow?: number
}

// Yahoo's v7/finance/quote batch endpoint now requires an authenticated
// session (crumb + cookie) and returns 401 Unauthorized without one — which
// was silently failing every request and made the whole feed fall back to
// fake seeded/jittered prices instead of real market data. The v8 chart
// endpoint (already used for candles) still works unauthenticated and
// exposes the same live fields via its `meta` object, so fetch quotes from
// there instead, per symbol, with bounded concurrency.
const QUOTE_CONCURRENCY = 12

async function fetchBatchedQuotes(ySymbols: string[]): Promise<Map<string, YahooQuote>> {
  const out = new Map<string, YahooQuote>()

  async function fetchOne(ySym: string) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1m&range=1d`
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ForexApp/1.0)" },
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      })
      if (!res.ok) return
      const json = await res.json()
      const meta = json?.chart?.result?.[0]?.meta
      if (!meta?.regularMarketPrice) return
      out.set(ySym, {
        regularMarketPrice: meta.regularMarketPrice,
        regularMarketOpen: meta.chartPreviousClose ?? meta.previousClose,
        regularMarketPreviousClose: meta.previousClose,
        regularMarketDayHigh: meta.regularMarketDayHigh,
        regularMarketDayLow: meta.regularMarketDayLow,
      })
    } catch {
      // Missing symbols fall back to the seed price in the caller
    }
  }

  // Bounded-concurrency pool: process the symbol list a slice at a time so
  // we don't fire ~70 simultaneous requests at Yahoo (risking throttling)
  // while still being far faster than doing them one at a time.
  for (let i = 0; i < ySymbols.length; i += QUOTE_CONCURRENCY) {
    await Promise.all(ySymbols.slice(i, i + QUOTE_CONCURRENCY).map(fetchOne))
  }
  return out
}

async function fetchGoldSpot(): Promise<number | null> {
  try {
    const res = await fetch("https://api.gold-api.com/price/XAU", {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const spot = await res.json()
    return Number.isFinite(spot?.price) && spot.price > 0 ? Number(spot.price) : null
  } catch {
    return null
  }
}
