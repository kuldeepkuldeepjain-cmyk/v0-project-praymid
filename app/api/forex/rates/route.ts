import { NextResponse } from "next/server"

// Pairs we support + their Yahoo Finance symbols for live quote
const YAHOO_SYMBOLS: Record<string, string> = {
  // Forex
  "EUR/USD": "EURUSD=X",
  "GBP/USD": "GBPUSD=X",
  "USD/JPY": "USDJPY=X",
  "USD/CHF": "USDCHF=X",
  "AUD/USD": "AUDUSD=X",
  "USD/CAD": "USDCAD=X",
  "NZD/USD": "NZDUSD=X",
  "EUR/GBP": "EURGBP=X",
  // Commodities
  "XAU/USD": "GC=F",   // Gold futures
  "XAG/USD": "SI=F",   // Silver futures
  // Crypto
  "BTC/USD": "BTC-USD",
  "ETH/USD": "ETH-USD",
  "BNB/USD": "BNB-USD",
  "SOL/USD": "SOL-USD",
  "XRP/USD": "XRP-USD",
  "ADA/USD": "ADA-USD",
}

const TYPICAL_SPREADS: Record<string, number> = {
  // Forex
  "EUR/USD": 0.00015, "GBP/USD": 0.00020, "USD/JPY": 0.013,
  "USD/CHF": 0.00020, "AUD/USD": 0.00018, "USD/CAD": 0.00020,
  "NZD/USD": 0.00025, "EUR/GBP": 0.00018,
  // Commodities
  "XAU/USD": 0.50,    // ~$0.50 spread on Gold
  "XAG/USD": 0.03,    // ~$0.03 spread on Silver
  // Crypto
  "BTC/USD": 5.0,     "ETH/USD": 1.5,
  "BNB/USD": 0.30,    "SOL/USD": 0.10,
  "XRP/USD": 0.001,   "ADA/USD": 0.0005,
}

function isJpy(sym: string) { return sym.includes("JPY") }
function isCrypto(sym: string) { return ["BTC","ETH","BNB","SOL","XRP","ADA"].some(c => sym.startsWith(c)) }
function isGold(sym: string) { return sym.startsWith("XAU") }
function isSilver(sym: string) { return sym.startsWith("XAG") }
function dec(sym: string): number {
  if (isGold(sym))   return 2
  if (isSilver(sym)) return 3
  if (sym.startsWith("BTC")) return 1
  if (sym.startsWith("ETH") || sym.startsWith("BNB")) return 2
  if (sym.startsWith("SOL")) return 3
  if (isCrypto(sym)) return 4
  return isJpy(sym) ? 3 : 5
}

// Cache to avoid hammering Yahoo Finance (server-side, resets on cold start)
let cache: {
  data: Record<string, { bid: number; ask: number; mid: number; change: number; high: number; low: number; open: number }>
  ts: number
} | null = null
const CACHE_TTL_MS = 3000 // refresh every 3s max

export async function GET() {
  try {
    const now = Date.now()
    if (cache && now - cache.ts < CACHE_TTL_MS) {
      return NextResponse.json({ rates: cache.data, source: "cache", ts: cache.ts })
    }

    // Fetch all pairs in parallel from Yahoo Finance quote endpoint
    const pairs = Object.keys(YAHOO_SYMBOLS)
    const results = await Promise.allSettled(
      pairs.map(async (pair) => {
        const ySym = YAHOO_SYMBOLS[pair]
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1m&range=1d`
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; ForexApp/1.0)" },
          next: { revalidate: 0 },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        const result = json?.chart?.result?.[0]
        if (!result) throw new Error("No result")

        const meta = result.meta ?? {}
        const quote = result.indicators?.quote?.[0] ?? {}
        const closes = (quote.close ?? []).filter((v: number | null) => v != null) as number[]
        const highs = (quote.high ?? []).filter((v: number | null) => v != null) as number[]
        const lows = (quote.low ?? []).filter((v: number | null) => v != null) as number[]

        const mid = closes.length > 0 ? closes[closes.length - 1] : (meta.regularMarketPrice ?? 0)
        const openP = meta.chartPreviousClose ?? meta.regularMarketOpen ?? mid
        const high = highs.length > 0 ? Math.max(...highs) : mid * 1.002
        const low = lows.length > 0 ? Math.min(...lows) : mid * 0.998
        const change = openP > 0 ? parseFloat((((mid - openP) / openP) * 100).toFixed(3)) : 0
        const spread = TYPICAL_SPREADS[pair] ?? 0.0002
        const d = dec(pair)

        return {
          pair,
          mid: parseFloat(mid.toFixed(d)),
          bid: parseFloat((mid - spread / 2).toFixed(d)),
          ask: parseFloat((mid + spread / 2).toFixed(d)),
          change,
          high: parseFloat(high.toFixed(d)),
          low: parseFloat(low.toFixed(d)),
          open: parseFloat(openP.toFixed(d)),
        }
      })
    )

    const data: Record<string, { bid: number; ask: number; mid: number; change: number; high: number; low: number; open: number }> = {}
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        const { pair, ...rest } = r.value
        data[pair] = rest
      }
    })

    if (Object.keys(data).length === 0) {
      throw new Error("All fetches failed")
    }

    cache = { data, ts: now }
    return NextResponse.json({ rates: data, source: "live", ts: now })
  } catch (err) {
    // Return cached data if available even if stale
    if (cache) {
      return NextResponse.json({ rates: cache.data, source: "stale_cache", ts: cache.ts })
    }
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
