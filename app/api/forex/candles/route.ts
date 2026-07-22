import { NextRequest, NextResponse } from "next/server"

const YAHOO_SYMBOLS: Record<string, string> = {
  "EUR/USD": "EURUSD=X",
  "GBP/USD": "GBPUSD=X",
  "USD/JPY": "USDJPY=X",
  "USD/CHF": "USDCHF=X",
  "AUD/USD": "AUDUSD=X",
  "USD/CAD": "USDCAD=X",
  "NZD/USD": "NZDUSD=X",
  "EUR/GBP": "EURGBP=X",
}

// Yahoo Finance interval + range that gives the best candle history per timeframe
const TF_MAP: Record<string, { interval: string; range: string }> = {
  "1M":  { interval: "1m",  range: "1d"  },
  "5M":  { interval: "5m",  range: "5d"  },
  "15M": { interval: "15m", range: "5d"  },
  "1H":  { interval: "1h",  range: "1mo" },
  "4H":  { interval: "4h",  range: "3mo" },
  "1D":  { interval: "1d",  range: "1y"  },
}

function isJpy(sym: string) { return sym.includes("JPY") }
function dec(sym: string) { return isJpy(sym) ? 3 : 5 }

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
  "1M":  30_000,   // 30s
  "5M":  60_000,   // 1 min
  "15M": 120_000,  // 2 min
  "1H":  300_000,  // 5 min
  "4H":  600_000,  // 10 min
  "1D":  3600_000, // 1 hour
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pair = searchParams.get("pair") ?? "EUR/USD"
  const tf = searchParams.get("tf") ?? "5M"

  const ySym = YAHOO_SYMBOLS[pair]
  if (!ySym) return NextResponse.json({ error: "Unknown pair" }, { status: 400 })

  const tfCfg = TF_MAP[tf]
  if (!tfCfg) return NextResponse.json({ error: "Unknown timeframe" }, { status: 400 })

  const cacheKey = `${pair}|${tf}`
  const now = Date.now()
  const cached = candleCache.get(cacheKey)
  const ttl = CACHE_TTL[tf] ?? 60_000

  if (cached && now - cached.ts < ttl) {
    return NextResponse.json({ candles: cached.candles, source: "cache", ts: cached.ts })
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=${tfCfg.interval}&range=${tfCfg.range}`
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

    const candles = timestamps
      .map((ts, i) => ({
        time:   fmtTime(ts, tf),
        open:   parseFloat((opens[i]   ?? closes[i-1] ?? 0).toFixed(d)),
        high:   parseFloat((highs[i]   ?? 0).toFixed(d)),
        low:    parseFloat((lows[i]    ?? 0).toFixed(d)),
        close:  parseFloat((closes[i]  ?? 0).toFixed(d)),
        volume: Math.round(volumes[i]  ?? 0),
        ts,
      }))
      .filter((c) => c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0)
      // Clamp to last 150 candles
      .slice(-150)

    candleCache.set(cacheKey, { candles, ts: now })
    return NextResponse.json({ candles, source: "live", ts: now })
  } catch (err) {
    // Return stale cache if available
    if (cached) {
      return NextResponse.json({ candles: cached.candles, source: "stale", ts: cached.ts })
    }
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
