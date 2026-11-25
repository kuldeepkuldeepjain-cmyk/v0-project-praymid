"use client"

import { startTransition, useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import type { Candle, ForexPair } from "@/components/forex-trading-platform"
import { decimals } from "@/lib/forex-instruments"
import { normalizeTimestamp } from "@/lib/normalize-timestamp"

const FRAMES = {
  "1M": { seconds: 60, refresh: 15_000 },
  "5M": { seconds: 300, refresh: 3_000 },
  "15M": { seconds: 900, refresh: 15_000 },
  "30M": { seconds: 1800, refresh: 30_000 },
  "1H": { seconds: 3600, refresh: 60_000 },
  "4H": { seconds: 14400, refresh: 120_000 },
  "1D": { seconds: 86400, refresh: 300_000 },
  "1W": { seconds: 604800, refresh: 900_000 },
} as const

export type TimeFrame = keyof typeof FRAMES
export type HistoryStatus = "loading" | "ready" | "cached" | "unavailable"
export const CHART_TIMEFRAMES = Object.keys(FRAMES) as TimeFrame[]
const EMPTY_CANDLES: Candle[] = []

type CandleSnapshot = { candles: Candle[]; stale: boolean }
type LiveCandle = { key: string; timestamp: number; candle: Candle }

function isCandle(value: unknown): value is Candle {
  if (!value || typeof value !== "object") return false
  const { open, high, low, close, volume, time, ts } = value as Partial<Candle>
  return typeof time === "string" && [open, high, low, close, volume].every(Number.isFinite)
    && (open ?? 0) > 0 && (close ?? 0) > 0 && (high ?? 0) >= (low ?? 0)
    && normalizeTimestamp(ts ?? time) > 0
}

async function fetchHistory(url: string): Promise<CandleSnapshot> {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) })
  if (!response.ok) throw new Error("Candle history unavailable")
  const payload = await response.json()
  const candles = Array.isArray(payload?.candles) ? payload.candles.filter(isCandle) : EMPTY_CANDLES
  if (!candles.length || payload.source === "offline") throw new Error("No usable candle history")
  return { candles, stale: payload.source === "stale" }
}

export function useTerminalCandles(quote: ForexPair | null, timeframe: TimeFrame, hasFreshRate: (symbol: string) => boolean) {
  const symbol = quote?.symbol
  const key = symbol ? `/api/forex/candles?pair=${encodeURIComponent(symbol)}&tf=${timeframe}` : null
  const { data, error, mutate, isValidating } = useSWR(key, fetchHistory, {
    keepPreviousData: false,
    refreshInterval: (snapshot) => snapshot?.stale ? 5_000 : FRAMES[timeframe].refresh,
    onErrorRetry: (_, __, ___, revalidate, { retryCount }) => {
      setTimeout(() => void revalidate({ retryCount, dedupe: true }), 5_000)
    },
  })
  const [live, setLive] = useState<LiveCandle | null>(null)
  const history = data?.candles ?? EMPTY_CANDLES
  const bid = quote?.bid ?? 0
  const ask = quote?.ask ?? 0
  const timestamp = quote?.rateTimestamp ?? 0
  const seconds = FRAMES[timeframe].seconds
  const offset = timeframe === "1W" ? 4 * 86400 : 0

  useEffect(() => {
    if (!key || !symbol || !history.length || !hasFreshRate(symbol) || bid <= 0 || ask < bid) return
    const age = Date.now() - timestamp
    if (age > 90_000 || age < -10_000) return
    const price = Number(((bid + ask) / 2).toFixed(decimals(symbol)))
    if (!Number.isFinite(price) || price <= 0) return
    const bucket = Math.floor((timestamp / 1000 - offset) / seconds) * seconds + offset
    startTransition(() => {
      setLive((previous) => {
        if (previous?.key === key && previous.timestamp > timestamp) return previous
        if (previous?.key === key && previous.candle.ts === bucket) {
          if (previous.candle.close === price && previous.timestamp === timestamp) return previous
          return { key, timestamp, candle: { ...previous.candle, high: Math.max(previous.candle.high, price), low: Math.min(previous.candle.low, price), close: price } }
        }
        return { key, timestamp, candle: { ts: bucket, time: new Date(bucket * 1000).toISOString(), open: price, high: price, low: price, close: price, volume: 0 } }
      })
    })
  }, [key, symbol, history, bid, ask, timestamp, seconds, offset, hasFreshRate])

  const candles = useMemo(() => {
    if (!history.length || !live || live.key !== key) return history
    const last = history[history.length - 1]
    const lastTime = normalizeTimestamp(last.ts ?? last.time) / 1000
    const lastBucket = Math.floor((lastTime - offset) / seconds) * seconds + offset
    const liveBucket = live.candle.ts ?? 0
    if (liveBucket < lastBucket) return history
    if (liveBucket > lastBucket) return [...history.slice(-149), live.candle]
    return [...history.slice(0, -1), {
      ...last,
      high: Math.max(last.high, live.candle.high),
      low: Math.min(last.low, live.candle.low),
      close: live.candle.close,
    }]
  }, [history, live, key, offset, seconds])

  const status: HistoryStatus = history.length
    ? (error || data?.stale ? "cached" : "ready")
    : (error ? "unavailable" : "loading")

  return { candles, history, status, refresh: mutate, isRefreshing: isValidating }
}
