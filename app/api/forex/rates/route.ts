import { NextResponse } from "next/server"
import { YAHOO_SYMBOLS, TYPICAL_SPREADS, decimals as dec, isCrypto } from "@/lib/forex-instruments"

// Cache to avoid hammering Yahoo Finance (server-side, resets on cold start)
let cache: {
  data: Record<string, { bid: number; ask: number; mid: number; change: number; high: number; low: number; open: number }>
  sources: Record<string, "tiingo" | "twelve-data" | "yahoo" | "gold-api" | "stale-cache">
  ts: number
} | null = null
const LIVE_REFRESH_INTERVAL_MS = 1000
const CACHE_TTL_MS = LIVE_REFRESH_INTERVAL_MS // refresh once per second max to protect upstream providers
const UPSTREAM_TIMEOUT_MS = 4000 // bound each provider request so live quote refreshes recover quickly

type RateRow = { bid: number; ask: number; mid: number; change: number; high: number; low: number; open: number }

export async function GET() {
  try {
    const now = Date.now()
    if (cache && now - cache.ts < CACHE_TTL_MS) {
      return NextResponse.json({ rates: cache.data, sources: cache.sources, source: "cache", provider: "gold-api.com (XAU spot) + Yahoo Finance", refreshIntervalSeconds: LIVE_REFRESH_INTERVAL_MS / 1000, ts: cache.ts })
    }

    const pairs = Object.keys(YAHOO_SYMBOLS)
    const bySymbol = new Map(pairs.map((p) => [YAHOO_SYMBOLS[p], p]))
    const ySymbols = pairs.map((p) => YAHOO_SYMBOLS[p])

    // Fetch ALL instruments in a single batched Yahoo quote call instead of
    // one request per pair — cuts ~70 round trips down to 1-2, which is both
    // far faster and far less likely to trip rate limiting.
    const [quoteResults, spotResult, tiingoResults, twelveResults] = await Promise.all([
      fetchBatchedQuotes(ySymbols),
      fetchGoldSpot(),
      fetchTiingoQuotes(pairs),
      fetchTwelveQuotes(pairs),
    ])

    const data: Record<string, RateRow> = {}
    const sources: Record<string, "tiingo" | "twelve-data" | "yahoo" | "gold-api" | "stale-cache"> = {}
    for (const pair of pairs) {
      const ySym = YAHOO_SYMBOLS[pair]
      const tiingo = tiingoResults.get(pair)
      const twelve = twelveResults.get(pair)
      const q = quoteResults.get(ySym)
      if (tiingo) {
        const d = dec(pair)
        const mid = Number(tiingo.mid.toFixed(d))
        data[pair] = { mid, bid: Number(tiingo.bid.toFixed(d)), ask: Number(tiingo.ask.toFixed(d)), change: tiingo.change, high: Number(tiingo.high.toFixed(d)), low: Number(tiingo.low.toFixed(d)), open: Number(tiingo.open.toFixed(d)) }
        sources[pair] = "tiingo"
        continue
      }
      if (twelve) {
        const d = dec(pair)
        const mid = Number(twelve.price.toFixed(d))
        const spread = TYPICAL_SPREADS[pair] ?? 0.00002
        data[pair] = { mid, bid: Number((mid - spread / 2).toFixed(d)), ask: Number((mid + spread / 2).toFixed(d)), change: twelve.change, high: Number(twelve.high.toFixed(d)), low: Number(twelve.low.toFixed(d)), open: Number(twelve.open.toFixed(d)) }
        sources[pair] = "twelve-data"
        continue
      }
      if (!q || !q.regularMarketPrice || q.regularMarketPrice <= 0) {
        const lastKnown = cache?.data[pair]
        if (lastKnown) {
          data[pair] = lastKnown
          sources[pair] = "stale-cache"
        }
        continue
      }

      const futuresMid = q.regularMarketPrice

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
  const d = dec(pair)
  const roundedMid = parseFloat(mid.toFixed(d))
  const configuredSpread = TYPICAL_SPREADS[pair] ?? 0.0002
  const minTick = 10 ** -d
  const spread = Math.min(configuredSpread, Math.max(minTick, roundedMid * 0.002))

      data[pair] = {
        mid: roundedMid,
        bid: Math.max(minTick, parseFloat((roundedMid - spread / 2).toFixed(d))),
        ask: parseFloat((roundedMid + spread / 2).toFixed(d)),
        change,
        high: parseFloat(high.toFixed(d)),
        low: parseFloat(low.toFixed(d)),
        open: parseFloat(openP.toFixed(d)),
      }
      sources[pair] = pair === "XAU/USD" && spotResult != null ? "gold-api" : "yahoo"
    }

    if (Object.keys(data).length === 0) {
      throw new Error("All fetches failed")
    }

    cache = { data, sources, ts: now }
    const hasFreshQuotes = Object.values(sources).some((source) => source === "tiingo" || source === "twelve-data" || source === "yahoo" || source === "gold-api")
    const hasStaleQuotes = Object.values(sources).some((source) => source === "stale-cache")
    const hasMissingQuotes = Object.keys(data).length < pairs.length
    return NextResponse.json({
      rates: data,
      sources,
      source: hasFreshQuotes ? (hasStaleQuotes || hasMissingQuotes ? "partial-live" : "live") : "stale-cache",
      provider: "Tiingo live FX quotes + Twelve Data fallback + Yahoo fallback + Gold API spot fallback",
      marketDataType: "live-provider-data",
      refreshIntervalSeconds: LIVE_REFRESH_INTERVAL_MS / 1000,
      ts: now,
    }, { headers: { "Cache-Control": "no-store, max-age=0" } })
  } catch (err) {
    // Return cached data if available even if stale
    if (cache) {
      return NextResponse.json({ rates: cache.data, sources: cache.sources, source: "stale_cache", ts: cache.ts })
    }
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

type TiingoQuote = { bid: number; ask: number; mid: number; change: number; high: number; low: number; open: number }

async function fetchTiingoQuotes(pairs: string[]): Promise<Map<string, TiingoQuote>> {
  const out = new Map<string, TiingoQuote>()
  const token = process.env.TIINGO_API_KEY
  if (!token || pairs.length === 0) return out
  try {
    const tickers = pairs.map((pair) => pair.replace("/", "").toLowerCase()).join(",")
    const response = await fetch(`https://api.tiingo.com/tiingo/fx/top?tickers=${encodeURIComponent(tickers)}&token=${encodeURIComponent(token)}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cache: "no-store",
    })
    if (!response.ok) return out
    const quotes = await response.json() as Array<Record<string, unknown>>
    for (const quote of quotes) {
      const ticker = String(quote.ticker ?? "").toUpperCase()
      const pair = ticker.length === 6 ? `${ticker.slice(0, 3)}/${ticker.slice(3)}` : ""
      const bid = Number(quote.bidPrice)
      const ask = Number(quote.askPrice)
      const mid = Number(quote.midPrice ?? (bid + ask) / 2)
      if (!pair || !Number.isFinite(bid) || !Number.isFinite(ask) || !Number.isFinite(mid) || bid <= 0 || ask <= 0) continue
      const previous = Number(quote.previousClose)
      const openValue = Number(quote.open)
      const open = Number.isFinite(openValue) && openValue > 0 ? openValue : (Number.isFinite(previous) && previous > 0 ? previous : mid)
      const highValue = Number(quote.high)
      const lowValue = Number(quote.low)
      const high = Number.isFinite(highValue) && highValue > 0 ? highValue : Math.max(mid, open)
      const low = Number.isFinite(lowValue) && lowValue > 0 ? lowValue : Math.min(mid, open)
      out.set(pair, { bid, ask, mid, change: Number.isFinite(previous) && previous > 0 ? ((mid - previous) / previous) * 100 : 0, high, low, open })
    }
  } catch {}
  return out
}

type TwelveQuote = { price: number; change: number; high: number; low: number; open: number }

async function fetchTwelveQuotes(pairs: string[]): Promise<Map<string, TwelveQuote>> {
  const out = new Map<string, TwelveQuote>()
  const key = process.env.TWELVE_DATA_API_KEY
  if (!key || pairs.length === 0) return out

  try {
    const requests = Object.fromEntries(pairs.map((pair, index) => [
      `pair_${index}`,
      { url: `/quote?symbol=${encodeURIComponent(pair)}&apikey=${encodeURIComponent(key)}` },
    ]))
    const response = await fetch("https://api.twelvedata.com/batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requests),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cache: "no-store",
    })
    if (!response.ok) return out
    const json = await response.json() as Record<string, Record<string, unknown>>
    pairs.forEach((pair, index) => {
      const quote = json[`pair_${index}`]
      if (!quote || quote.status === "error") return
      const price = Number(quote.close ?? quote.price)
      const open = Number(quote.open)
      const high = Number(quote.high)
      const low = Number(quote.low)
      if ([price, open, high, low].every(Number.isFinite) && price > 0) {
        out.set(pair, { price, open, high, low, change: Number(quote.percent_change) || 0 })
      }
    })
  } catch {}
  return out
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
const QUOTE_CONCURRENCY = 24

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
