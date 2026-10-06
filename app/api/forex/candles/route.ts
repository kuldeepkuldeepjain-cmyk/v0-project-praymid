import { NextRequest, NextResponse } from "next/server"
import { YAHOO_SYMBOLS, decimals as dec } from "@/lib/forex-instruments"

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

function cryptoKucoinSymbol(pair: string): string | null {
  const [base, quote] = pair.split("/")
  if (!base || quote !== "USD") return null
  return `${base}-USDT`
}

async function fetchKucoinCryptoCandles(pair: string, tf: string): Promise<unknown[]> {
  const symbol = cryptoKucoinSymbol(pair)
  const type = KUCOIN_INTERVALS[tf]
  if (!symbol || !type) throw new Error("Unsupported crypto candle pair")

  const endAt = Math.floor(Date.now() / 1000)
  const startAt = endAt - (TF_SECONDS[tf] ?? 300) * 180
  const url = `https://api.kucoin.com/api/v1/market/candles?symbol=${encodeURIComponent(symbol)}&type=${type}&startAt=${startAt}&endAt=${endAt}`
  const response = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 0 }, signal: AbortSignal.timeout(5000) })
  if (!response.ok) throw new Error(`KuCoin candles HTTP ${response.status}`)
  const json = await response.json()
  if (json?.code !== "200000" || !Array.isArray(json.data)) throw new Error("KuCoin returned no candles")

  const decimals = dec(pair)
  return json.data
    .map((row: unknown[]) => {
      const ts = Number(row[0])
      const open = Number(row[1])
      const close = Number(row[2])
      const high = Number(row[3])
      const low = Number(row[4])
      const volume = Number(row[5])
      return { time: fmtTime(ts, tf), open, high, low, close, volume, ts }
    })
    .filter((c: { ts: number; open: number; high: number; low: number; close: number }) =>
      Number.isFinite(c.ts) && c.ts > 0 && [c.open, c.high, c.low, c.close].every(Number.isFinite) && c.open > 0 && c.high >= c.low)
    .sort((a: { ts: number }, b: { ts: number }) => a.ts - b.ts)
    .filter((c: { ts: number }, index: number, rows: { ts: number }[]) => index === 0 || c.ts !== rows[index - 1].ts)
    .slice(-150)
    .map((c: { time: string; open: number; high: number; low: number; close: number; volume: number; ts: number }) => ({
      ...c,
      open: Number(c.open.toFixed(decimals)), high: Number(c.high.toFixed(decimals)),
      low: Number(c.low.toFixed(decimals)), close: Number(c.close.toFixed(decimals)), volume: Math.round(c.volume),
    }))
}

// Format timestamp to human-readable label based on timeframe
function fmtTime(ts: number, tf: string): string {
  const d = new Date(ts * 1000)
  if (tf === "1D" || tf === "4H") {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
}

// Candle cache: key = "pair|tf"
const candleCache = new Map<string, { candles: unknown[]; ts: number }>()
const CACHE_TTL: Record<string, number> = {
  "1M":  5_000,    // 5s: keep the active one-minute candle responsive
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

  const cryptoSymbol = cryptoKucoinSymbol(pair)
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
    if (cryptoSymbol) {
      const candles = await fetchKucoinCryptoCandles(pair, tf)
      if (candles.length === 0) throw new Error("No usable crypto candles")
      candleCache.set(cacheKey, { candles, ts: now })
      return NextResponse.json({ candles, source: "live-kucoin", ts: now })
    }

    // Yahoo does not support every terminal interval directly. Use the closest
    // supported feed interval so refresh remains useful instead of returning a
    // false disconnected state for 30M and 4H charts.
    const providerInterval = tf === "30M" ? "15m" : tf === "4H" ? "1h" : tfCfg.interval
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=${providerInterval}&range=${tfCfg.range}`
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ForexApp/1.0)" },
      next: { revalidate: 0 },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()

    const result = json?.chart?.result?.[0]
    if (!result) throw new Error(json?.chart?.error?.description ?? "No result")

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
          open: Number(safeOpen.toFixed(d)),
          high: Number(Math.max(safeHigh, safeOpen, safeClose).toFixed(d)),
          low: Number(Math.min(safeLow, safeOpen, safeClose).toFixed(d)),
          close: Number(safeClose.toFixed(d)),
          volume: Math.max(0, Math.round(Number(volumes[i]) || 0)),
          ts,
        }
      })
      .filter((c): c is NonNullable<typeof c> => c != null)
      .filter((c) => [c.open, c.high, c.low, c.close].every(Number.isFinite) && c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0)
      // Clamp to last 150 candles
      .slice(-150)

    if (candles.length === 0) throw new Error("No usable candles")

    candleCache.set(cacheKey, { candles, ts: now })
    return NextResponse.json({ candles, source: "live", ts: now })
  } catch (err) {
    // Return stale cache if available
    if (cached) {
      return NextResponse.json({ candles: cached.candles, source: "stale", ts: cached.ts })
    }
    return NextResponse.json(
      { candles: [], source: "offline", provider: cryptoSymbol ? "KuCoin" : "Yahoo Finance", ts: now, error: "Live candle history is temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0", "Retry-After": "5" } },
    )
  }
}
