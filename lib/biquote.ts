import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from "@microsoft/signalr"

export type BiquoteTick = {
  symbol: string
  bid: number
  ask: number
  mid: number
  timestamp: number
  volume?: number
}

type BiquotePayload = Record<string, unknown> | unknown[]

const DEFAULT_HUB_URL = "https://biquote.io/hubs/tick"

function numberFrom(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = Number(payload[key])
    if (Number.isFinite(value)) return value
  }
  return undefined
}

function stringFrom(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (typeof payload[key] === "string" && payload[key]) return payload[key] as string
  }
  return undefined
}

function normalizePayload(payload: BiquotePayload): BiquoteTick | null {
  const value = Array.isArray(payload)
    ? { symbol: payload[0], bid: payload[1], ask: payload[2], timestamp: payload[3], volume: payload[4] }
    : payload
  if (!value || typeof value !== "object") return null
  const data = value as Record<string, unknown>
  const symbol = stringFrom(data, ["symbol", "ticker", "instrument", "pair", "code"])
  const bid = numberFrom(data, ["bid", "Bid", "bidPrice"])
  const ask = numberFrom(data, ["ask", "Ask", "askPrice"])
  const last = numberFrom(data, ["last", "price", "mid", "close"])
  const timestampValue = numberFrom(data, ["timestamp", "time", "ts", "epoch"])
  if (!symbol || (!Number.isFinite(bid) && !Number.isFinite(ask) && !Number.isFinite(last))) return null
  const resolvedBid = bid ?? last
  const resolvedAsk = ask ?? last
  if (!resolvedBid || !resolvedAsk || resolvedBid <= 0 || resolvedAsk <= 0) return null
  return {
    symbol: symbol.replace(/[^a-z0-9]/gi, "").toUpperCase(),
    bid: resolvedBid,
    ask: resolvedAsk,
    mid: (resolvedBid + resolvedAsk) / 2,
    timestamp: timestampValue && timestampValue < 10_000_000_000 ? timestampValue * 1000 : timestampValue ?? Date.now(),
    volume: numberFrom(data, ["volume", "Volume", "size"]),
  }
}

export function createBiquoteConnection(
  symbols: string[],
  onTick: (tick: BiquoteTick) => void,
  onStatus: (status: string) => void,
) {
  const hubUrl = process.env.BIQUOTE_TICK_HUB_URL || DEFAULT_HUB_URL
  const connection: HubConnection = new HubConnectionBuilder()
    .withUrl(hubUrl, { accessTokenFactory: () => process.env.BIQUOTE_API_KEY || "" })
    .withAutomaticReconnect([0, 2_000, 5_000, 10_000])
    .configureLogging(LogLevel.Error)
    .build()

  connection.on("ReceiveTick", (payload: BiquotePayload) => {
    const tick = normalizePayload(payload)
    if (tick) onTick(tick)
  })
  connection.onreconnecting(() => onStatus("reconnecting"))
  connection.onreconnected(() => onStatus("connected"))
  connection.onclose(() => onStatus("offline"))

  const start = async () => {
    await connection.start()
    if (connection.state === HubConnectionState.Connected) {
      await connection.invoke(process.env.BIQUOTE_SUBSCRIBE_METHOD || "Subscribe", symbols)
      onStatus("connected")
    }
  }

  return { connection, start }
}
