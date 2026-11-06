import { NextRequest } from "next/server"
import WebSocket from "ws"
import { createBiquoteConnection, type BiquoteTick } from "@/lib/biquote"
import { PAIRS_CONFIG } from "@/lib/forex-instruments"

export const runtime = "nodejs"

const TIINGO_SYMBOLS = [
  ...new Set([
    ...PAIRS_CONFIG.filter((pair) => pair.category === "Forex").map((pair) => pair.symbol.replace("/", "").toLowerCase()),
    "xauusd",
  ]),
]
const TIINGO_CRYPTO_SYMBOLS = ["btcusd", "ethusd", "bnbusd"]
const LIVE_SOURCE_NAMES = new Set(["tiingo", "twelve-data", "yahoo", "gold-api"])
const MAX_FALLBACK_QUOTE_AGE_MS = 90_000

type LiveRate = { bid: number; ask: number; mid: number; change: number; high: number; low: number; open: number }
type RatesPayload = {
  rates: Record<string, LiveRate>
  sources?: Record<string, string>
  quoteTimes?: Record<string, number | null>
  ts?: number
  source?: string
  provider?: string
  refreshIntervalSeconds?: number
}

function pairForTicker(ticker: string) {
  const normalized = ticker.replace(/[^a-z0-9]/gi, "").toLowerCase()
  return normalized.length === 6 ? `${normalized.slice(0, 3).toUpperCase()}/${normalized.slice(3).toUpperCase()}` : null
}

function providerTimestamp(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const numeric = Number(value)
  const timestamp = Number.isFinite(numeric)
    ? numeric < 10_000_000_000 ? numeric * 1000 : numeric
    : Date.parse(String(value))
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null
}

function rateChange(mid: number, open: number) {
  return open > 0 ? ((mid - open) / open) * 100 : 0
}

function applyBiquoteTick(payload: RatesPayload, tick: BiquoteTick) {
  const pair = pairForTicker(tick.symbol)
  if (!pair || tick.bid <= 0 || tick.ask < tick.bid || !Number.isFinite(tick.mid)) return null
  const quoteTime = tick.timestamp > 0 ? tick.timestamp : Date.now()
  const previousTime = payload.quoteTimes?.[pair]
  if (previousTime && quoteTime + 1_000 < previousTime) return null

  const previous = payload.rates[pair]
  const mid = tick.mid
  const open = previous?.open ?? mid
  payload.rates[pair] = {
    bid: tick.bid,
    ask: tick.ask,
    mid,
    change: rateChange(mid, open),
    high: Math.max(previous?.high ?? mid, mid),
    low: Math.min(previous?.low ?? mid, mid),
    open,
  }
  payload.sources = { ...payload.sources, [pair]: "biquote-websocket" }
  payload.quoteTimes = { ...payload.quoteTimes, [pair]: quoteTime }
  payload.ts = quoteTime
  payload.source = "live-biquote-signalr"
  payload.provider = "Biquote Tick Hub"
  return pair
}

function applyTiingoTick(payload: RatesPayload, message: unknown, market: "fx" | "crypto") {
  if (!Array.isArray(message) || typeof message[2] !== "string") return null
  const event = message[0]
  if (event !== "A" && !(market === "crypto" && event === "T")) return null
  const pair = pairForTicker(message[2])
  if (!pair) return null

  const quoteTime = providerTimestamp(message[3]) ?? Date.now()
  const previousTime = payload.quoteTimes?.[pair]
  if (previousTime && quoteTime + 1_000 < previousTime) return null

  const previous = payload.rates[pair]
  let bid = Number(message[4])
  let ask = Number(message[6])
  let mid: number
  if (market === "crypto" && event === "T") {
    const trade = Number(message[4])
    if (!Number.isFinite(trade) || trade <= 0) return null
    bid = previous?.bid ?? trade
    ask = previous?.ask ?? trade
    mid = trade
  } else {
    if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask < bid) return null
    mid = (bid + ask) / 2
  }

  const open = previous?.open ?? mid
  payload.rates[pair] = {
    bid,
    ask,
    mid,
    change: rateChange(mid, open),
    high: Math.max(previous?.high ?? mid, mid),
    low: Math.min(previous?.low ?? mid, mid),
    open,
  }
  payload.sources = { ...payload.sources, [pair]: `tiingo-${market}-websocket` }
  payload.quoteTimes = { ...payload.quoteTimes, [pair]: quoteTime }
  payload.ts = quoteTime
  payload.source = "live-tiingo-websocket"
  payload.provider = market === "crypto" ? "Tiingo Crypto WebSocket top-of-book and last trade" : "Tiingo FX WebSocket top-of-book"
  return pair
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  let closed = false
  let fallbackTimer: ReturnType<typeof setInterval> | undefined
  let tiingoSocket: WebSocket | undefined
  let tiingoCryptoSocket: WebSocket | undefined
  let biquoteConnection: ReturnType<typeof createBiquoteConnection> | undefined
  const payload: RatesPayload = { rates: {}, sources: {}, quoteTimes: {} }
  let fallbackInFlight = false
  let lastFallbackAt = 0
  const lastWebSocketTickAt: Record<string, number> = {}
  const tiingoRetryAttempts: Record<"fx" | "crypto", number> = { fx: 0, crypto: 0 }
  const tiingoToken = process.env.TIINGO_API_KEY

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (!closed) controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }
      const sendStatus = (status: string, provider: string) => send("status", { status, provider, ts: Date.now() })
      const sendTick = (pair: string) => {
        const rate = payload.rates[pair]
        if (!rate) return
        send("rates", {
          rates: { [pair]: rate },
          updatedSymbols: [pair],
          freshSymbols: [pair],
          sources: { [pair]: payload.sources?.[pair] },
          quoteTimes: { [pair]: payload.quoteTimes?.[pair] ?? Date.now() },
          ts: payload.quoteTimes?.[pair] ?? Date.now(),
          source: payload.source,
          provider: payload.provider,
        })
      }
      const freshFallbackSymbols = (rates: Record<string, LiveRate>, sources: Record<string, string> = {}, quoteTimes: Record<string, number | null> = {}) => {
        const now = Date.now()
        return Object.keys(rates).filter((symbol) => {
          const source = sources[symbol]
          if (!source || source === "stale-cache" || !LIVE_SOURCE_NAMES.has(source)) return false
          const quoteTime = quoteTimes[symbol]
          return quoteTime == null || (quoteTime <= now + 10_000 && now - quoteTime <= MAX_FALLBACK_QUOTE_AGE_MS)
        })
      }
      const refreshFallback = async () => {
        if (closed || fallbackInFlight) return
        fallbackInFlight = true
        lastFallbackAt = Date.now()
        try {
          const origin = new URL(request.url).origin
          const response = await fetch(`${origin}/api/forex/rates`, {
            cache: "no-store",
            headers: { "x-market-stream": "1" },
            signal: AbortSignal.timeout(8_000),
          })
          const next = await response.json() as RatesPayload
          if (!response.ok || !next?.rates) {
            sendStatus("stale", "REST rate fallback")
            return
          }

          const updatedRates: Record<string, LiveRate> = {}
          const updatedSources: Record<string, string> = {}
          const updatedQuoteTimes: Record<string, number | null> = {}
          for (const [symbol, rate] of Object.entries(next.rates)) {
            const now = Date.now()
            const lastTickAt = lastWebSocketTickAt[symbol] ?? 0
            const quoteTime = next.quoteTimes?.[symbol] ?? null
            const existingQuoteTime = payload.quoteTimes?.[symbol] ?? null
            if (now - lastTickAt < 15_000) continue
            if (quoteTime && existingQuoteTime && quoteTime + 1_000 < existingQuoteTime) continue
            payload.rates[symbol] = rate
            if (next.sources?.[symbol]) payload.sources = { ...payload.sources, [symbol]: next.sources[symbol] }
            payload.quoteTimes = { ...payload.quoteTimes, [symbol]: quoteTime }
            updatedRates[symbol] = rate
            updatedSources[symbol] = next.sources?.[symbol] ?? "unknown"
            updatedQuoteTimes[symbol] = quoteTime
          }
          if (Object.keys(updatedRates).length > 0) {
            payload.ts = next.ts ?? Date.now()
            payload.source = next.source
            payload.provider = next.provider
            send("rates", {
              rates: updatedRates,
              updatedSymbols: Object.keys(updatedRates),
              freshSymbols: freshFallbackSymbols(updatedRates, updatedSources, updatedQuoteTimes),
              sources: updatedSources,
              quoteTimes: updatedQuoteTimes,
              ts: payload.ts,
              source: next.source,
              provider: next.provider,
            })
          }
        } catch {
          sendStatus("offline", "REST rate fallback")
        } finally {
          fallbackInFlight = false
        }
      }

      const connectTiingo = (market: "fx" | "crypto") => {
        if (closed || !tiingoToken) return
        const isFx = market === "fx"
        const socket = new WebSocket(isFx ? "wss://api.tiingo.com/fx" : "wss://api.tiingo.com/crypto")
        if (isFx) tiingoSocket = socket
        else tiingoCryptoSocket = socket
        let retryScheduled = false
        const handleDisconnect = () => {
          if (retryScheduled || closed) return
          retryScheduled = true
          if (isFx && tiingoSocket === socket) tiingoSocket = undefined
          if (!isFx && tiingoCryptoSocket === socket) tiingoCryptoSocket = undefined
          sendStatus("reconnecting", isFx ? "Tiingo FX WebSocket" : "Tiingo Crypto WebSocket")
          const attempt = tiingoRetryAttempts[market]++
          const delay = Math.min(30_000, 1_000 * 2 ** Math.min(attempt, 5))
          setTimeout(() => connectTiingo(market), delay)
        }

        socket.on("open", () => {
          if (closed || (isFx ? tiingoSocket !== socket : tiingoCryptoSocket !== socket)) {
            socket.close()
            return
          }
          tiingoRetryAttempts[market] = 0
          socket.send(JSON.stringify({
            eventName: "subscribe",
            authorization: tiingoToken,
            eventData: { thresholdLevel: 5, tickers: isFx ? TIINGO_SYMBOLS : TIINGO_CRYPTO_SYMBOLS },
          }))
          sendStatus("connected", isFx ? "Tiingo FX WebSocket" : "Tiingo Crypto WebSocket")
        })
        socket.on("message", (raw) => {
          try {
            const message = JSON.parse(raw.toString()) as unknown
            const pair = applyTiingoTick(payload, message, market)
            if (!pair) return
            lastWebSocketTickAt[pair] = Date.now()
            sendTick(pair)
          } catch {
            // Ignore malformed provider packets without interrupting the stream.
          }
        })
        socket.on("close", handleDisconnect)
        socket.on("error", () => {
          handleDisconnect()
          socket.close()
        })
      }

      const biquoteEnabled = Boolean(process.env.BIQUOTE_API_KEY || process.env.BIQUOTE_TICK_HUB_URL)
      sendStatus("connecting", biquoteEnabled ? "Biquote Tick Hub" : "Tiingo market WebSockets")
      void refreshFallback()
      if (closed) return

      if (biquoteEnabled) {
        biquoteConnection = createBiquoteConnection(
          TIINGO_SYMBOLS,
          (tick) => {
            const pair = applyBiquoteTick(payload, tick)
            if (!pair) return
            lastWebSocketTickAt[pair] = Date.now()
            sendTick(pair)
          },
          (status) => sendStatus(status, "Biquote Tick Hub"),
        )
        void (async () => {
          try {
            await Promise.race([
              biquoteConnection!.start(),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Biquote connection timeout")), 8_000)),
            ])
          } catch {
            sendStatus("fallback", "Tiingo/REST rate fallback")
            void biquoteConnection?.connection.stop()
            if (tiingoToken) {
              connectTiingo("fx")
              connectTiingo("crypto")
            }
          }
        })()
      } else if (tiingoToken) {
        connectTiingo("fx")
        connectTiingo("crypto")
      } else {
        sendStatus("fallback", "REST rate fallback")
      }

      fallbackTimer = setInterval(() => {
        if (closed) return
        const liveProviderConnected = biquoteConnection?.connection.state === "Connected"
          || tiingoSocket?.readyState === WebSocket.OPEN
          || tiingoCryptoSocket?.readyState === WebSocket.OPEN
        const refreshInterval = liveProviderConnected ? 15_000 : 5_000
        if (Date.now() - lastFallbackAt >= refreshInterval) void refreshFallback()
      }, 1_000)
    },
    cancel() {
      closed = true
      if (fallbackTimer) clearInterval(fallbackTimer)
      tiingoSocket?.close()
      tiingoCryptoSocket?.close()
      void biquoteConnection?.connection.stop()
    },
  })

  request.signal.addEventListener("abort", () => {
    closed = true
    if (fallbackTimer) clearInterval(fallbackTimer)
    tiingoSocket?.close()
    tiingoCryptoSocket?.close()
    void biquoteConnection?.connection.stop()
  }, { once: true })

  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-store, must-revalidate", Connection: "keep-alive", "X-Accel-Buffering": "no" } })
}
