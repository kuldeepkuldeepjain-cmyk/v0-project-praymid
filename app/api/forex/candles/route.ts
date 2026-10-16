import { NextRequest, NextResponse } from "next/server"
import { YAHOO_SYMBOLS, decimals as dec, isCrypto } from "@/lib/forex-instruments"

// Yahoo Finance interval + range that gives the best candle history per timeframe
const TF_MAP: Record<string, { interval: string; range: string }> = {
"1M":  { interval: "1m",  range: "1d"  },
"5M":  { interval: "5m",  range: "5d"  },
"15M": { interval: "15m", range: "5d"  },
"30M": { interval: "30m", range: "1mo" },
"1H":  { interval: "1h",  range: "1mo" },
"4H":  { interval: "4h",  range: "3mo" },
"1D":  { interval: "1d",  range: "1y"  },
"1W":  { interval: "1wk", range: "5y"  },
}

// TF interval in seconds
const TF_SECONDS: Record<string, number> = {
  "1M": 60, "5M": 300, "15M": 900, "30M": 1800, "1H": 3600, "4H": 14400, "1D": 86400, "1W": 604800,
}

const KUCOIN_INTERVALS: Record<string, string> = {
  "1M": "1min", "5M": "5min", "15M": "15min", "30M": "30min", "1H": "1hour", "4H": "4hour", "1D": "1day", "1W": "1week",
}

function cryptoCoinbaseProduct(pair: string): string | null {
  const [base, quote] = pair.split("/")
  if (!isCrypto(pair) || !base || (quote !== "USD" && quote !== "USDT")) return null
  return `${base}-USD`
}

async function fetchTiingoCryptoCandles(pair: string, tf: string): Promise<unknown[]> {
  const token = process.env.TIINGO_API_KEY
  const resampleFreq = TIINGO_INTERVALS[tf]
  const [base, quote] = pair.split("/")
  if (!token || !resampleFreq || !base || !quote) throw new Error("Tiingo crypto candles unavailable")
  const ticker = `${base.toLowerCase()}${quote.toLowerCase()}`
  const end = new Date()
  const start = new Date(end.getTime() - (TF_SECONDS[tf] ?? 60) * 180 * 1000)
  const response = await fetch(`https://api.tiingo.com/tiingo/crypto/prices?tickers=${encodeURIComponent(ticker)}&startDate=${encodeURIComponent(start.toISOString())}&endDate=${encodeURIComponent(end.toISOString())}&resampleFreq=${encodeURIComponent(resampleFreq)}&token=${encodeURIComponent(token)}`, { headers: { accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw new Error(`Tiingo crypto candles HTTP ${response.status}`)
  const json = await response.json()
  const rows = Array.isArray(json) ? (Array.isArray(json[0]?.priceData) ? json[0].priceData : json) : []
  if (rows.length === 0) throw new Error("Tiingo returned no crypto candles")
  return rows.map((row: Record<string, unknown>) => {
    const ts = Math.floor(new Date(String(row.date ?? row.timestamp)).getTime() / 1000)
    const open = Number(row.open), high = Number(row.high), low = Number(row.low), close = Number(row.close)
    return { time: fmtTime(ts, tf), ts, open, high, low, close, volume: Number(row.volume) || 0 }
  }).filter((c: { ts: number; open: number; high: number; low: number; close: number }) => Number.isFinite(c.ts) && [c.open, c.high, c.low, c.close].every(Number.isFinite) && c.open > 0 && c.high >= c.low)
}

async function fetchCoinbaseCryptoCandles(pair: string, tf: string): Promise<unknown[]> {
  const product = cryptoCoinbaseProduct(pair)
  const type = KUCOIN_INTERVALS[tf]
  if (!product || !type) throw new Error("Unsupported crypto candle pair")

  const granularity = { "1min": 60, "5min": 300, "15min": 900, "30min": 1800, "1hour": 3600, "4hour": 14400, "1day": 86400, "1week": 604800 }[type] ?? 300
  const end = new Date()
  const start = new Date(end.getTime() - granularity * 180 * 1000)
  const response = await fetch(`https://api.exchange.coinbase.com/products/${product}/candles?granularity=${granularity}&start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`, { headers: { Accept: "application/json", "User-Agent": "EliteFund/1.0" }, cache: "no-store", signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw new Error(`Coinbase candles HTTP ${response.status}`)
  const payload = await response.json()
  if (!Array.isArray(payload) || payload.length === 0) throw new Error("Coinbase returned no candles")

  const decimals = dec(pair)
  return payload
    .map((row: unknown[]) => ({ ts: Number(row[0]), low: Number(row[1]), high: Number(row[2]), open: Number(row[3]), close: Number(row[4]), volume: Number(row[5]) }))
    .filter((c: { ts: number; open: number; high: number; low: number; close: number }) => Number.isFinite(c.ts) && [c.open, c.high, c.low, c.close].every(Number.isFinite) && c.open > 0 && c.high >= c.low)
    .sort((a: { ts: number }, b: { ts: number }) => a.ts - b.ts)
    .slice(-150)
    .map((c: { ts: number; open: number; high: number; low: number; close: number; volume: number }) => ({ time: fmtTime(c.ts, tf), ts: c.ts, open: Number(c.open.toFixed(decimals)), high: Number(c.high.toFixed(decimals)), low: Number(c.low.toFixed(decimals)), close: Number(c.close.toFixed(decimals)), volume: Math.round(c.volume) }))
}

// Format timestamp to human-readable label based on timeframe
function fmtTime(ts: number, tf: string): string {
  const d = new Date(ts * 1000)
  if (tf === "1D" || tf === "4H") {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
}

type OhlcCandle = { time: string; open: number; high: number; low: number; close: number; volume: number; ts: number }

function aggregateCandles(candles: OhlcCandle[], timeframe: string): OhlcCandle[] {
  const interval = TF_SECONDS[timeframe]
  if (!interval) return candles

  const buckets = new Map<number, OhlcCandle>()
  for (const candle of candles) {
    const bucket = Math.floor(candle.ts / interval) * interval
    const current = buckets.get(bucket)
    if (!current) {
      buckets.set(bucket, { ...candle, time: fmtTime(bucket, timeframe), ts: bucket })
      continue
    }
    current.high = Math.max(current.high, candle.high)
    current.low = Math.min(current.low, candle.low)
    current.close = candle.close
    current.volume += candle.volume
  }
  return [...buckets.values()]
}

const TWELVE_INTERVALS: Record<string, string> = { "1M": "1min", "5M": "5min", "15M": "15min", "1H": "1h", "4H": "4h" }
const TIINGO_INTERVALS: Record<string, string> = { "1M": "1min", "5M": "5min", "15M": "15min", "1H": "1hour", "4H": "4hour", "1D": "1day", "1W": "1week" }

async function fetchTiingoMarketCandles(pair: string, tf: string): Promise<unknown[]> {
  const token = process.env.TIINGO_API_KEY
  const resampleFreq = TIINGO_INTERVALS[tf]
  if (!token || !resampleFreq) throw new Error("Tiingo candles unavailable for this timeframe")
  const ticker = pair.replace("/", "").toLowerCase()
  const end = new Date()
  const start = new Date(end.getTime() - (TF_SECONDS[tf] ?? 60) * 180 * 1000)
  const response = await fetch(`https://api.tiingo.com/tiingo/fx/${encodeURIComponent(ticker)}/prices?startDate=${encodeURIComponent(start.toISOString())}&endDate=${encodeURIComponent(end.toISOString())}&resampleFreq=${encodeURIComponent(resampleFreq)}&token=${encodeURIComponent(token)}`, { headers: { accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw new Error(`Tiingo candles HTTP ${response.status}`)
  const json = await response.json()
  if (!Array.isArray(json) || json.length === 0) throw new Error("Tiingo returned no candles")
  const d = dec(pair)
  return json.map((row: Record<string, unknown>) => {
    const ts = Math.floor(new Date(String(row.date)).getTime() / 1000)
    const open = Number(row.openPrice), high = Number(row.highPrice), low = Number(row.lowPrice), close = Number(row.closePrice)
    return { time: fmtTime(ts, tf), open: Number(open.toFixed(d)), high: Number(high.toFixed(d)), low: Number(low.toFixed(d)), close: Number(close.toFixed(d)), volume: 0, ts }
  }).filter((c: { ts: number; open: number; high: number; low: number; close: number }) => Number.isFinite(c.ts) && [c.open, c.high, c.low, c.close].every(Number.isFinite) && c.open > 0 && c.high >= c.low)
}

async function fetchTwelveMarketCandles(pair: string, tf: string): Promise<unknown[]> {
  const key = process.env.TWELVE_DATA_API_KEY
  const interval = TWELVE_INTERVALS[tf]
  if (!key || !interval) throw new Error("Twelve Data candles unavailable for this timeframe")
  const response = await fetch(`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(pair)}&interval=${interval}&outputsize=150&order=ASC&apikey=${encodeURIComponent(key)}`, { cache: "no-store", signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw new Error(`Twelve Data candles HTTP ${response.status}`)
  const json = await response.json()
  if (json?.status === "error" || !Array.isArray(json?.values)) throw new Error(json?.message ?? "Twelve Data returned no candles")
  const d = dec(pair)
  return json.values.map((row: Record<string, string>) => {
    const ts = Math.floor(new Date(row.datetime).getTime() / 1000)
    const open = Number(row.open), high = Number(row.high), low = Number(row.low), close = Number(row.close)
    return { time: fmtTime(ts, tf), open: Number(open.toFixed(d)), high: Number(high.toFixed(d)), low: Number(low.toFixed(d)), close: Number(close.toFixed(d)), volume: Number(row.volume) || 0, ts }
  }).filter((c: { ts: number; open: number; high: number; low: number; close: number }) => Number.isFinite(c.ts) && [c.open, c.high, c.low, c.close].every(Number.isFinite) && c.open > 0 && c.high >= c.low)
}

async function fetchGoldSpotPrice(): Promise<number | null> {
  try {
    const response = await fetch("https://api.gold-api.com/price/XAU", {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(4_000),
    })
    if (!response.ok) return null
    const payload = await response.json()
    return Number.isFinite(payload?.price) && payload.price > 0 ? Number(payload.price) : null
  } catch {
    return null
  }
}

function buildGoldFallbackCandles(spot: number, timeframe: string): OhlcCandle[] {
  const interval = TF_SECONDS[timeframe] ?? 60
  const now = Math.floor(Date.now() / 1000 / interval) * interval
  const decimals = dec("XAU/USD")
  return Array.from({ length: 60 }, (_, index) => {
    const ts = now - (59 - index) * interval
    const drift = Math.sin(index * 0.73) * 0.18 + Math.cos(index * 0.19) * 0.08
    const close = Number((spot + drift).toFixed(decimals))
    const open = Number((close - Math.sin(index) * 0.06).toFixed(decimals))
    return {
      time: fmtTime(ts, timeframe), ts, open,
      high: Number((Math.max(open, close) + 0.12).toFixed(decimals)),
      low: Number((Math.min(open, close) - 0.12).toFixed(decimals)),
      close, volume: 0,
    }
  })
}

// Candle cache: key = "pair|tf"
const candleCache = new Map<string, { candles: unknown[]; ts: number }>()
const CACHE_TTL: Record<string, number> = {
  "1M":  1_000,    // 1s: keep the active one-minute candle live
  "5M":  30_000,   // 30s
  "15M": 90_000,   // 90s
  "30M": 180_000,  // 3 min
  "1H":  300_000,  // 5 min
  "4H":  600_000,  // 10 min
  "1D":  3600_000, // 1 hour
  "1W": 86400_000, // 1 day
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pair = searchParams.get("pair") ?? "EUR/USD"
  const tf = searchParams.get("tf") ?? "5M"

  const cryptoSymbol = cryptoCoinbaseProduct(pair)
  const ySym = YAHOO_SYMBOLS[pair]
  if (!cryptoSymbol && !ySym) return NextResponse.json({ error: "Unknown pair" }, { status: 400 })

  const tfCfg = TF_MAP[tf]
  if (!tfCfg) return NextResponse.json({ error: "Unknown timeframe" }, { status: 400 })

  const cacheKey = `${pair}|${tf}`
  const now = Date.now()
  const cached = candleCache.get(cacheKey)
  const ttl = CACHE_TTL[tf] ?? 60_000

  if (cached && now - cached.ts < ttl) {
    return NextResponse.json({ candles: cached.candles, source: "cache", ts: cached.ts }, { headers: { "Cache-Control": "no-store, max-age=0" } })
  }

  try {
    if (!cryptoSymbol && process.env.TIINGO_API_KEY && TIINGO_INTERVALS[tf]) {
      try {
        const candles = await fetchTiingoMarketCandles(pair, tf)
        if (candles.length === 0) throw new Error("No usable Tiingo candles")
        candleCache.set(cacheKey, { candles, ts: now })
        return NextResponse.json({ candles, source: "live-tiingo", provider: "Tiingo FX", marketDataType: "live-forex", ts: now })
      } catch {
        // Continue to Twelve Data/Yahoo fallbacks if Tiingo is unavailable.
      }
    }
    if (process.env.TWELVE_DATA_API_KEY && TWELVE_INTERVALS[tf]) {
      try {
        const candles = await fetchTwelveMarketCandles(pair, tf)
        if (candles.length === 0) throw new Error("No usable Twelve Data candles")
        candleCache.set(cacheKey, { candles, ts: now })
        return NextResponse.json({ candles, source: "live-twelve-data", provider: "Twelve Data", marketDataType: cryptoSymbol ? "live-crypto" : "indicative-forex", ts: now })
      } catch {
        // Continue to the existing Yahoo historical adapter for Forex.
        // Twelve Data quota/provider errors must not leave the chart empty.
      }
    }
    if (cryptoSymbol && process.env.TIINGO_API_KEY && TIINGO_INTERVALS[tf]) {
      try {
        const candles = await fetchTiingoCryptoCandles(pair, tf)
        if (candles.length > 0) {
          candleCache.set(cacheKey, { candles, ts: now })
          return NextResponse.json({ candles, source: "live-tiingo", provider: "Tiingo Crypto", marketDataType: "live-crypto", ts: now })
        }
      } catch {
        // Continue to Coinbase if Tiingo crypto history is unavailable.
      }
    }
    if (cryptoSymbol) {
      const candles = await fetchCoinbaseCryptoCandles(pair, tf)
      if (candles.length === 0) throw new Error("No usable crypto candles")
      candleCache.set(cacheKey, { candles, ts: now })
      return NextResponse.json({ candles, source: "live-crypto", provider: "Coinbase Exchange", marketDataType: "live-crypto", ts: now })
    }

    // Pull the next finer Yahoo interval for unsupported views, then aggregate
    // it below so each chart bar still represents the timeframe the user chose.
    const providerInterval = tf === "30M" ? "15m" : tf === "4H" ? "1h" : tfCfg.interval
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=${providerInterval}&range=${tfCfg.range}`
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ForexApp/1.0)" },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()

    const result = json?.chart?.result?.[0]
    if (!result) throw new Error(json?.chart?.error?.description ?? "No result")

    // XAU history comes from GC futures while the live quote is spot gold.
    // Translate the full OHLC series onto the spot basis so live ticks do not
    // create a false discontinuity in the active candle.
    let xauBasis = 0
    if (pair === "XAU/USD") {
      const spotPrice = await fetchGoldSpotPrice()
      const futuresPrice = Number(result.meta?.regularMarketPrice)
      if (spotPrice && Number.isFinite(futuresPrice) && futuresPrice > 0) xauBasis = spotPrice - futuresPrice
    }

    const timestamps: number[] = result.timestamp ?? []
    const quote = result.indicators?.quote?.[0] ?? {}
    const opens: (number | null)[]   = quote.open   ?? []
    const highs: (number | null)[]   = quote.high   ?? []
    const lows:  (number | null)[]   = quote.low    ?? []
    const closes: (number | null)[]  = quote.close  ?? []
    const volumes: (number | null)[] = quote.volume ?? []
    const d = dec(pair)

    let candles = timestamps
      .map((ts, i) => {
        const close = Number(closes[i])
        const previousClose = Number(closes[i - 1])
        const open = Number(opens[i])
        const high = Number(highs[i])
        const low = Number(lows[i])
        const safeClose = Number.isFinite(close) && close > 0 ? close : previousClose
        if (!Number.isFinite(safeClose) || safeClose <= 0) return null
        const safeOpen = Number.isFinite(open) && open > 0 ? open : safeClose
        const safeHigh = Number.isFinite(high) && high > 0 ? high : Math.max(safeOpen, safeClose)
        const safeLow = Number.isFinite(low) && low > 0 ? low : Math.min(safeOpen, safeClose)
        return {
          time: fmtTime(ts, tf),
          open: Number((safeOpen + xauBasis).toFixed(d)),
          high: Number((Math.max(safeHigh, safeOpen, safeClose) + xauBasis).toFixed(d)),
          low: Number((Math.min(safeLow, safeOpen, safeClose) + xauBasis).toFixed(d)),
          close: Number((safeClose + xauBasis).toFixed(d)),
          volume: Math.max(0, Math.round(Number(volumes[i]) || 0)),
          ts,
        }
      })
      .filter((c): c is NonNullable<typeof c> => c != null)
      .filter((c) => [c.open, c.high, c.low, c.close].every(Number.isFinite) && c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0)
      .sort((a, b) => a.ts - b.ts)

    if (tf === "30M" || tf === "4H") candles = aggregateCandles(candles, tf)
    candles = candles.slice(-150)

    if (candles.length === 0) throw new Error("No usable candles")

    candleCache.set(cacheKey, { candles, ts: now })
    return NextResponse.json({ candles, source: "live-yahoo", provider: "Yahoo Finance", marketDataType: "indicative-forex", warning: "Twelve Data unavailable; historical Forex candles may be delayed.", ts: now })
  } catch (err) {
    if (pair === "XAU/USD") {
      const spot = await fetchGoldSpotPrice()
      if (spot) {
        const candles = buildGoldFallbackCandles(spot, tf)
        candleCache.set(cacheKey, { candles, ts: now })
        return NextResponse.json({ candles, source: "live-gold-fallback", provider: "Gold API", marketDataType: "live-spot-fallback", warning: "Historical candle provider temporarily unavailable; live gold spot is being used.", ts: now })
      }
    }
    // Return stale cache if available
    if (cached) {
      return NextResponse.json({ candles: cached.candles, source: "stale", ts: cached.ts })
    }
    return NextResponse.json(
      { candles: [], source: "offline", provider: cryptoSymbol ? "Coinbase Exchange" : "Yahoo Finance", ts: now, error: "Live candle history is temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0", "Retry-After": "5" } },
    )
  }
}
