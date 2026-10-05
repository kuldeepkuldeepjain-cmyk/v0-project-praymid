import type { MarketTick, NormalizedOrder, TradingVenueAdapter, VenueAccount } from "@/lib/trading-domain"
import { isSafeMarketPrice, isValidOrderQuantity, normalizeSymbol } from "@/lib/trading-domain"

const bridgeUrl = process.env.MT5_BRIDGE_URL

async function bridgeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!bridgeUrl) throw new Error("MT5 bridge is not configured")
  const response = await fetch(`${bridgeUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`MT5 bridge request failed: ${response.status}`)
  return response.json() as Promise<T>
}

export function createMt5BridgeAdapter(): TradingVenueAdapter {
  return {
    venue: "MT5",
    async connect() { await bridgeRequest("/health") },
    async health() {
      try {
        const result = await bridgeRequest<{ connected: boolean; latencyMs?: number; message?: string }>("/health")
        return result
      } catch (error) {
        return { connected: false, message: error instanceof Error ? error.message : "MT5 bridge unavailable" }
      }
    },
    async getAccounts() { return bridgeRequest<VenueAccount[]>("/accounts") },
    async getTicks(symbols) {
      return bridgeRequest<MarketTick[]>("/ticks", { method: "POST", body: JSON.stringify({ symbols: symbols.map(normalizeSymbol) }) })
    },
    async submitOrder(order) {
      if (!isValidOrderQuantity(order.quantity)) throw new Error("Invalid order quantity")
      if (order.price !== undefined && !isSafeMarketPrice(order.price)) throw new Error("Invalid order price")
      return bridgeRequest<NormalizedOrder>("/orders", { method: "POST", body: JSON.stringify({ ...order, symbol: normalizeSymbol(order.symbol) }) })
    },
    async cancelOrder(orderId) {
      return bridgeRequest<NormalizedOrder>(`/orders/${encodeURIComponent(orderId)}`, { method: "DELETE" })
    },
    async close() {},
  }
}
