import type { MarketTick, NormalizedOrder, TradingVenueAdapter, VenueAccount } from "@/lib/trading-domain"
import { isSafeMarketPrice, isValidOrderQuantity, normalizeSymbol } from "@/lib/trading-domain"

const apiUrl = process.env.FXCM_PRO_API_URL
const apiToken = process.env.FXCM_PRO_API_TOKEN
const streamUrl = process.env.FXCM_PRO_STREAM_URL

type FxcmResponse<T> = { data?: T; accounts?: T; offers?: T; error?: string; message?: string }

async function fxcmRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiUrl || !apiToken) throw new Error("FXCM Pro API is not configured")
  const response = await fetch(`${apiUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${apiToken}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`FXCM Pro request failed: ${response.status}`)
  const payload = await response.json() as FxcmResponse<T> | T
  if (payload && typeof payload === "object" && "error" in payload && payload.error) throw new Error(payload.error)
  return (payload && typeof payload === "object" && ("data" in payload || "accounts" in payload || "offers" in payload)
    ? ((payload as FxcmResponse<T>).data ?? (payload as FxcmResponse<T>).accounts ?? (payload as FxcmResponse<T>).offers)
    : payload) as T
}

export function createFxcmProAdapter(): TradingVenueAdapter {
  return {
    venue: "FXCM_PRO",
    async connect() { await fxcmRequest("/health") },
    async health() {
      if (!apiUrl || !apiToken) return { connected: false, message: "FXCM Pro API is not configured" }
      const started = Date.now()
      try {
        await fxcmRequest("/health")
        return { connected: true, latencyMs: Date.now() - started, message: streamUrl ? "REST and streaming configured" : "REST configured; stream URL missing" }
      } catch (error) {
        return { connected: false, latencyMs: Date.now() - started, message: error instanceof Error ? error.message : "FXCM Pro unavailable" }
      }
    },
    async getAccounts() { return fxcmRequest<VenueAccount[]>("/accounts") },
    async getTicks(symbols) {
      const normalized = symbols.map(normalizeSymbol)
      return fxcmRequest<MarketTick[]>(`/prices?symbols=${encodeURIComponent(normalized.join(","))}`)
    },
    async submitOrder(order) {
      if (!isValidOrderQuantity(order.quantity)) throw new Error("Invalid order quantity")
      if (order.price !== undefined && !isSafeMarketPrice(order.price)) throw new Error("Invalid order price")
      return fxcmRequest<NormalizedOrder>("/orders", { method: "POST", body: JSON.stringify({ ...order, symbol: normalizeSymbol(order.symbol) }) })
    },
    async cancelOrder(orderId) {
      return fxcmRequest<NormalizedOrder>(`/orders/${encodeURIComponent(orderId)}`, { method: "DELETE" })
    },
    async close() {},
  }
}

export function getFxcmStreamUrl(): string | null { return streamUrl ?? null }

export type FxcmStreamMessage = MarketTick | { type: "status"; connected: boolean; message?: string }
export type FxcmStreamOptions = {
  symbols: string[]
  onMessage: (message: FxcmStreamMessage) => void
  onError?: (error: Error) => void
  signal?: AbortSignal
}

/**
 * Opens the provider stream without exposing credentials to the browser.
 * The adapter deliberately accepts the provider's normalized gateway payload;
 * mapping raw FXCM Pro messages belongs in the bridge/gateway boundary.
 */
export function connectFxcmProStream(options: FxcmStreamOptions): () => void {
  if (!streamUrl || !apiToken) {
    const error = new Error("FXCM Pro stream is not configured")
    options.onError?.(error)
    return () => {}
  }

  let socket: WebSocket | null = null
  let stopped = false
  let retry = 0
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  const close = () => {
    stopped = true
    if (retryTimer) clearTimeout(retryTimer)
    socket?.close()
    socket = null
  }
  const open = () => {
    if (stopped) return
    const Socket = globalThis.WebSocket as unknown as new (url: string, protocols?: string | string[]) => WebSocket
    socket = new Socket(streamUrl, [`bearer.${apiToken}`])
    socket.onopen = () => {
      retry = 0
      options.onMessage({ type: "status", connected: true })
      socket?.send(JSON.stringify({ type: "subscribe", symbols: options.symbols.map(normalizeSymbol) }))
    }
    socket.onmessage = event => {
      try {
        const message = JSON.parse(String(event.data)) as FxcmStreamMessage
        if (message && typeof message === "object") options.onMessage(message)
      } catch {
        options.onError?.(new Error("FXCM Pro stream returned invalid JSON"))
      }
    }
    socket.onerror = () => options.onError?.(new Error("FXCM Pro stream error"))
    socket.onclose = () => {
      options.onMessage({ type: "status", connected: false, message: "Stream disconnected" })
      if (!stopped) {
        const delay = Math.min(30_000, 1_000 * 2 ** retry++)
        retryTimer = setTimeout(open, delay)
      }
    }
  }
  options.signal?.addEventListener("abort", close, { once: true })
  open()
  return close
}
