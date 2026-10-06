import type { MarketTick, NormalizedOrder, TradingVenueAdapter, VenueAccount } from "@/lib/trading-domain"
import { isSafeMarketPrice, isValidOrderQuantity, normalizeSymbol } from "@/lib/trading-domain"

const apiUrl = process.env.CTRADER_API_URL
const apiToken = process.env.CTRADER_API_TOKEN
const accountId = process.env.CTRADER_ACCOUNT_ID

type CTraderResponse<T> = { data?: T; error?: string; message?: string }

async function cTraderRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiUrl || !apiToken) throw new Error("cTrader API is not configured")
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
  if (!response.ok) throw new Error(`cTrader request failed: ${response.status}`)
  const payload = await response.json() as CTraderResponse<T> | T
  if (payload && typeof payload === "object" && "error" in payload && payload.error) throw new Error(payload.error)
  return payload && typeof payload === "object" && "data" in payload
    ? (payload as CTraderResponse<T>).data as T
    : payload as T
}

export function createCTraderAdapter(): TradingVenueAdapter {
  return {
    venue: "CTRADER",
    async connect() { await cTraderRequest("/health") },
    async health() {
      if (!apiUrl || !apiToken) return { connected: false, message: "cTrader API is not configured" }
      const started = Date.now()
      try {
        await cTraderRequest("/health")
        return { connected: true, latencyMs: Date.now() - started, message: accountId ? `cTrader account ${accountId} configured` : "cTrader connected; account ID missing" }
      } catch (error) {
        return { connected: false, latencyMs: Date.now() - started, message: error instanceof Error ? error.message : "cTrader unavailable" }
      }
    },
    async getAccounts() { return cTraderRequest<VenueAccount[]>("/accounts") },
    async getTicks(symbols) {
      return cTraderRequest<MarketTick[]>(`/prices?symbols=${encodeURIComponent(symbols.map(normalizeSymbol).join(","))}`)
    },
    async submitOrder(order) {
      if (!isValidOrderQuantity(order.quantity)) throw new Error("Invalid order quantity")
      if (order.price !== undefined && !isSafeMarketPrice(order.price)) throw new Error("Invalid order price")
      return cTraderRequest<NormalizedOrder>("/orders", { method: "POST", body: JSON.stringify({ ...order, symbol: normalizeSymbol(order.symbol), accountId: order.accountId || accountId }) })
    },
    async cancelOrder(orderId) {
      return cTraderRequest<NormalizedOrder>(`/orders/${encodeURIComponent(orderId)}`, { method: "DELETE" })
    },
    async close() {},
  }
}

export type CTraderStreamMessage = MarketTick | { type: "status"; connected: boolean; message?: string }

export function getCTraderStreamUrl(): string | null {
  return process.env.CTRADER_STREAM_URL ?? null
}
