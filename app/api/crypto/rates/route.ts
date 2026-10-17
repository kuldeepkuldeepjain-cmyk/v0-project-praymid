import { NextResponse } from "next/server"

const symbols = ["btcusd", "ethusd", "bnbusd"] as const

export async function GET() {
  const token = process.env.TIINGO_API_KEY
  if (!token) return NextResponse.json({ error: "Crypto market data is not configured" }, { status: 503 })

  try {
    const response = await fetch(
      `https://api.tiingo.com/tiingo/crypto/top?tickers=${symbols.join(",")}&token=${encodeURIComponent(token)}`,
      { headers: { accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(4_000) },
    )
    if (!response.ok) return NextResponse.json({ error: "Crypto provider unavailable" }, { status: 502 })

    const quotes = await response.json() as Array<Record<string, unknown>>
    const rates = quotes.flatMap((quote) => {
      const ticker = String(quote.ticker ?? "").toLowerCase()
      const symbol = ticker.length >= 6 ? `${ticker.slice(0, 3).toUpperCase()}/${ticker.slice(3, 6).toUpperCase()}` : ""
      const top = Array.isArray(quote.topOfBookData) ? quote.topOfBookData[0] as Record<string, unknown> | undefined : undefined
      const bid = Number(top?.bidPrice)
      const ask = Number(top?.askPrice)
      const lastTrade = Number(top?.lastPrice)
      const price = Number.isFinite(bid) && Number.isFinite(ask) && bid > 0 && ask > 0 ? (bid + ask) / 2 : lastTrade
      const prev = Number(quote.prevClose ?? quote.previousClose)
      if (!symbol || !Number.isFinite(price) || price <= 0) return []
      return [{ symbol, price, bid, ask, change24h: Number.isFinite(prev) && prev > 0 ? ((price - prev) / prev) * 100 : 0, timestamp: top?.quoteTimestamp ?? new Date().toISOString() }]
    })

    return NextResponse.json({ provider: "tiingo", rates, timestamp: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "Crypto provider unavailable" }, { status: 502 })
  }
}
