export type VenueKind = "MT5" | "FIX" | "INTERNAL"
export type OrderSide = "BUY" | "SELL"
export type OrderType = "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT"
export type OrderStatus = "PENDING" | "WORKING" | "PARTIALLY_FILLED" | "FILLED" | "CANCELED" | "REJECTED"

export type VenueAccount = {
  id: string
  venue: VenueKind
  account: string
  currency: string
  equity: number
  balance: number
  marginUsed: number
  freeMargin: number
  connected: boolean
  lastHeartbeat: string | null
}

export type MarketTick = {
  venue: VenueKind
  symbol: string
  bid: number
  ask: number
  timestamp: string
  sequence?: number
}

export type NormalizedOrder = {
  id: string
  clientOrderId: string
  venue: VenueKind
  accountId: string
  symbol: string
  side: OrderSide
  type: OrderType
  quantity: number
  price?: number
  stopLoss?: number
  takeProfit?: number
  status: OrderStatus
  filledQuantity: number
  averageFillPrice?: number
  createdAt: string
  updatedAt: string
  rejectReason?: string
}

export type NormalizedPosition = {
  id: string
  venue: VenueKind
  accountId: string
  symbol: string
  side: OrderSide
  quantity: number
  openPrice: number
  markPrice: number
  unrealizedPnl: number
  margin: number
  openedAt: string
}

export type TradingVenueAdapter = {
  venue: VenueKind
  connect(): Promise<void>
  health(): Promise<{ connected: boolean; latencyMs?: number; message?: string }>
  getAccounts(): Promise<VenueAccount[]>
  getTicks(symbols: string[]): Promise<MarketTick[]>
  submitOrder(order: Omit<NormalizedOrder, "id" | "status" | "filledQuantity" | "createdAt" | "updatedAt">): Promise<NormalizedOrder>
  cancelOrder(orderId: string): Promise<NormalizedOrder>
  close(): Promise<void>
}

export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(".", "")
}

export function isValidOrderQuantity(quantity: number): boolean {
  return Number.isFinite(quantity) && quantity > 0 && quantity <= 1000
}

export function isSafeMarketPrice(price: number): boolean {
  return Number.isFinite(price) && price > 0
}
