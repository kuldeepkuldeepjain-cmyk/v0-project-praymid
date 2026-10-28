import { NextRequest } from "next/server"
import WebSocket from "ws"
import { createBiquoteConnection, type BiquoteTick } from "@/lib/biquote"

export const runtime = "nodejs"

const TIINGO_SYMBOLS = ["eurusd", "gbpusd", "usdjpy", "usdchf", "audusd", "usdcad", "nzdusd", "eurgbp", "euraud", "eurchf", "gbpjpy", "xauusd"]
const TIINGO_CRYPTO_SYMBOLS = ["btcusd", "ethusd", "bnbusd"]

type LiveRate = { bid: number; ask: number; mid: number; change: number; high: number; low: number; open: number }
type RatesPayload = { rates: Record<string, LiveRate>; sources?: Record<string, string>; ts?: number; source?: string; provider?: string; refreshIntervalSeconds?: number }

function pairForTicker(ticker: string) {
  const normalized = ticker.replace(/[^a-z0-9]/gi, "").toLowerCase()
  return normalized.length === 6 ? `${normalized.slice(0, 3).toUpperCase()}/${normalized.slice(3).toUpperCase()}` : null
}

function applyBiquoteTick(payload: RatesPayload, tick: BiquoteTick) {
  const pair = pairForTicker(tick.symbol)
  if (!pair) return false
  const previous = payload.rates[pair]
  const mid = tick.mid
  payload.rates[pair] = {
    bid: tick.bid,
    ask: tick.ask,
    mid,
    change: previous?.change ?? 0,
    high: Math.max(previous?.high ?? mid, mid),
    low: Math.min(previous?.low ?? mid, mid),
    open: previous?.open ?? mid,
  }
  payload.sources = { ...payload.sources, [pair]: "biquote" }
  payload.ts = tick.timestamp
  payload.source = "live-biquote-signalr"
  payload.provider = "Biquote Tick Hub"
  return true
}

function applyTiingoTick(payload: RatesPayload, message: unknown, market: "fx" | "crypto") {
  if (!Array.isArray(message) || typeof message[2] !== "string") return false
  const event = message[0]
  const pair = pairForTicker(message[2])
  if (!pair) return false

  const previous = payload.rates[pair]
  let bid = Number(message[4])
  let ask = Number(message[6])
  if (market === "crypto" && event === "T") {
    const trade = Number(message[4])
    bid = previous?.bid ?? trade
    ask = previous?.ask ?? trade
  }
  if ((event !== "A" && event !== "T") || !Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask <= 0) return false

  const mid = market === "crypto" && event === "T" ? bid : (bid + ask) / 2
  payload.rates[pair] = {
    bid,
    ask,
    mid,
    change: previous?.change ?? 0,
    high: Math.max(previous?.high ?? mid, mid),
    low: Math.min(previous?.low ?? mid, mid),
    open: previous?.open ?? mid,
  }
  payload.sources = { ...payload.sources, [pair]: "tiingo" }
  payload.ts = Date.now()
  payload.source = "live-tiingo-websocket"
  payload.provider = market === "crypto" ? "Tiingo Crypto WebSocket top-of-book and last trade" : "Tiingo FX WebSocket top-of-book"
  return true
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  let closed = false
  let fallbackTimer: ReturnType<typeof setInterval> | undefined
  let tiingoSocket: WebSocket | undefined
  let tiingoCryptoSocket: WebSocket | undefined
  let biquoteConnection: ReturnType<typeof createBiquoteConnection> | undefined
  let payload: RatesPayload = { rates: {} }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (!closed) controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }
      const refreshFallback = async () => {
        try {
          const origin = new URL(request.url).origin
          const response = await fetch(`${origin}/api/forex/rates`, { cache: "no-store", headers: { "x-market-stream": "1" }, signal: AbortSignal.timeout(8_000) })
          const next = await response.json() as RatesPayload
          if (response.ok && next?.rates) {
            payload = next
            send("rates", payload)
          } else send("status", { status: "stale", ts: Date.now() })
        } catch {
          send("status", { status: "offline", ts: Date.now() })
        }
      }

      const biquoteEnabled = Boolean(process.env.BIQUOTE_API_KEY || process.env.BIQUOTE_TICK_HUB_URL)
      send("status", { status: "connecting", provider: biquoteEnabled ? "Biquote Tick Hub" : "Tiingo FX WebSocket", ts: Date.now() })
      await refreshFallback()
      if (biquoteEnabled) {
        biquoteConnection = createBiquoteConnection(
          TIINGO_SYMBOLS,
          (tick) => { if (applyBiquoteTick(payload, tick)) send("rates", payload) },
          (status) => send("status", { status, provider: "Biquote Tick Hub", ts: Date.now() }),
        )
        try {
          await biquoteConnection.start()
        } catch {
          send("status", { status: "fallback", provider: "REST fallback", ts: Date.now() })
        }
      }
      const token = process.env.TIINGO_API_KEY
      if (token) {
        tiingoSocket = new WebSocket("wss://api.tiingo.com/fx")
        tiingoSocket.on("open", () => {
          tiingoSocket?.send(JSON.stringify({ eventName: "subscribe", authorization: token, eventData: { thresholdLevel: 5, tickers: TIINGO_SYMBOLS } }))
          send("status", { status: "connected", provider: "Tiingo FX WebSocket", ts: Date.now() })
        })
        tiingoSocket.on("message", (raw) => {
          try {
            const message = JSON.parse(raw.toString()) as unknown
            if (applyTiingoTick(payload, message, "fx")) send("rates", payload)
          } catch {
            // Ignore malformed provider packets.
          }
        })
        tiingoSocket.on("close", () => { if (!closed) send("status", { status: "reconnecting", provider: "Tiingo FX WebSocket", ts: Date.now() }) })
        tiingoSocket.on("error", () => { if (!closed) send("status", { status: "fallback", provider: "REST fallback", ts: Date.now() }) })

        tiingoCryptoSocket = new WebSocket("wss://api.tiingo.com/crypto")
        tiingoCryptoSocket.on("open", () => {
          tiingoCryptoSocket?.send(JSON.stringify({ eventName: "subscribe", authorization: token, eventData: { thresholdLevel: 5, tickers: TIINGO_CRYPTO_SYMBOLS } }))
          send("status", { status: "connected", provider: "Tiingo Crypto WebSocket", ts: Date.now() })
        })
        tiingoCryptoSocket.on("message", (raw) => {
          try {
            const message = JSON.parse(raw.toString()) as unknown
            if (applyTiingoTick(payload, message, "crypto")) send("rates", payload)
          } catch {
            // Ignore malformed provider packets without interrupting FX updates.
          }
        })
        tiingoCryptoSocket.on("close", () => { if (!closed) send("status", { status: "reconnecting", provider: "Tiingo Crypto WebSocket", ts: Date.now() }) })
        tiingoCryptoSocket.on("error", () => { if (!closed) send("status", { status: "fallback", provider: "Tiingo Crypto REST fallback", ts: Date.now() }) })
      }
      fallbackTimer = setInterval(() => { if (!tiingoSocket || tiingoSocket.readyState !== WebSocket.OPEN) void refreshFallback() }, 1_000)
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
  })

  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-store, must-revalidate", Connection: "keep-alive", "X-Accel-Buffering": "no" } })
}
