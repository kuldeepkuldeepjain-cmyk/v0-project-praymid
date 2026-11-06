"use client"

import { useEffect, useRef, useState } from "react"

export type MarketRate = { bid: number; ask: number; mid?: number; change: number; high: number; low: number; open: number }
export type MarketRateMap = Record<string, MarketRate>
export type MarketRateMeta = {
  freshSymbols?: string[]
  quoteTimes?: Record<string, number | null>
  sources?: Record<string, string>
  source?: string
  provider?: string
  ts?: number
}
export type MarketConnectionState = "connecting" | "connected" | "reconnecting" | "fallback" | "offline"

type StreamMessage = MarketRateMeta & {
  rates?: MarketRateMap
  updatedSymbols?: string[]
  status?: MarketConnectionState
}

function isRate(value: unknown): value is MarketRate {
  if (!value || typeof value !== "object") return false
  const rate = value as Partial<MarketRate>
  return [rate.bid, rate.ask, rate.change, rate.high, rate.low, rate.open].every(
    (item) => typeof item === "number" && Number.isFinite(item),
  ) && Number(rate.bid) > 0 && Number(rate.ask) >= Number(rate.bid)
}

function parseRateUpdate(payload: unknown): { rates: MarketRateMap; meta: MarketRateMeta } | null {
  if (!payload || typeof payload !== "object") return null
  const message = payload as StreamMessage
  const candidate = message.rates && typeof message.rates === "object" ? message.rates : payload
  const rates = Object.fromEntries(
    Object.entries(candidate).filter(([, value]) => isRate(value)),
  ) as MarketRateMap
  if (Object.keys(rates).length === 0) return null

  const freshSymbols = Array.isArray(message.freshSymbols)
    ? message.freshSymbols
    : Array.isArray(message.updatedSymbols)
      ? message.updatedSymbols
      : Object.keys(rates)
  return {
    rates,
    meta: {
      freshSymbols,
      quoteTimes: message.quoteTimes,
      sources: message.sources,
      source: message.source,
      provider: message.provider,
      ts: message.ts,
    },
  }
}

function connectionStatus(payload: unknown): MarketConnectionState | null {
  if (!payload || typeof payload !== "object") return null
  const status = (payload as { status?: unknown }).status
  return status === "connecting" || status === "connected" || status === "reconnecting" || status === "fallback" || status === "offline"
    ? status
    : null
}

export function useMarketDataStream(
  onRates: (rates: MarketRateMap, meta?: MarketRateMeta) => void,
  fallbackFetch: () => Promise<void>,
) {
  const [status, setStatus] = useState<MarketConnectionState>("connecting")
  const onRatesRef = useRef(onRates)
  const fallbackFetchRef = useRef(fallbackFetch)

  useEffect(() => {
    onRatesRef.current = onRates
    fallbackFetchRef.current = fallbackFetch
  }, [onRates, fallbackFetch])

  useEffect(() => {
    if (typeof window === "undefined") return
    let disposed = false
    let animationFrame: number | null = null
    let pendingRates: MarketRateMap = {}
    let pendingFreshSymbols = new Set<string>()
    let pendingQuoteTimes: Record<string, number | null> = {}
    let pendingSources: Record<string, string> = {}
    let pendingMeta: Omit<MarketRateMeta, "freshSymbols" | "quoteTimes" | "sources"> = {}

    const flushRates = () => {
      animationFrame = null
      if (Object.keys(pendingRates).length > 0) {
        onRatesRef.current(pendingRates, {
          ...pendingMeta,
          freshSymbols: [...pendingFreshSymbols],
          quoteTimes: pendingQuoteTimes,
          sources: pendingSources,
        })
      }
      pendingRates = {}
      pendingFreshSymbols = new Set<string>()
      pendingQuoteTimes = {}
      pendingSources = {}
      pendingMeta = {}
    }

    const queueRates = (payload: unknown) => {
      const update = parseRateUpdate(payload)
      if (!update) return
      Object.assign(pendingRates, update.rates)
      update.meta.freshSymbols?.forEach((symbol) => pendingFreshSymbols.add(symbol))
      Object.assign(pendingQuoteTimes, update.meta.quoteTimes ?? {})
      Object.assign(pendingSources, update.meta.sources ?? {})
      pendingMeta = {
        source: update.meta.source ?? pendingMeta.source,
        provider: update.meta.provider ?? pendingMeta.provider,
        ts: update.meta.ts ?? pendingMeta.ts,
      }
      if (animationFrame === null) animationFrame = window.requestAnimationFrame(flushRates)
    }

    const clearAnimationFrame = () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
    const streamUrl = process.env.NEXT_PUBLIC_MARKET_DATA_WS_URL

    if (streamUrl && typeof WebSocket !== "undefined") {
      let socket: WebSocket | null = null
      let retryTimer: number | undefined
      let fallbackTimer: number | undefined
      let attempts = 0
      let socketOpen = false
      let fallbackInFlight = false

      const clearFallback = () => {
        if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer)
        fallbackTimer = undefined
      }
      const scheduleFallback = (delay = 1_500) => {
        if (fallbackTimer !== undefined || disposed) return
        fallbackTimer = window.setTimeout(async () => {
          fallbackTimer = undefined
          if (disposed || socketOpen || fallbackInFlight) return
          fallbackInFlight = true
          try {
            await fallbackFetchRef.current()
          } finally {
            fallbackInFlight = false
            if (!disposed && !socketOpen) scheduleFallback(5_000)
          }
        }, delay)
      }
      const connect = () => {
        if (disposed) return
        setStatus(attempts === 0 ? "connecting" : "reconnecting")
        try {
          socket = new WebSocket(streamUrl)
        } catch {
          setStatus("fallback")
          scheduleFallback()
          retryTimer = window.setTimeout(connect, 2_000)
          return
        }
        const activeSocket = socket
        activeSocket.onopen = () => {
          attempts = 0
          socketOpen = true
          clearFallback()
          setStatus("connected")
        }
        activeSocket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data) as unknown
            const nextStatus = connectionStatus(payload)
            if (nextStatus) setStatus(nextStatus)
            queueRates(payload)
          } catch {
            // Ignore malformed provider packets without interrupting the stream.
          }
        }
        activeSocket.onerror = () => activeSocket.close()
        activeSocket.onclose = () => {
          if (disposed) return
          socketOpen = false
          const delay = Math.min(30_000, 500 * 2 ** Math.min(attempts++, 6))
          setStatus("reconnecting")
          scheduleFallback()
          retryTimer = window.setTimeout(connect, delay)
        }
      }

      void fallbackFetchRef.current()
      connect()
      return () => {
        disposed = true
        clearFallback()
        if (retryTimer !== undefined) window.clearTimeout(retryTimer)
        clearAnimationFrame()
        socket?.close()
      }
    }

    let eventSource: EventSource | null = null
    let fallbackTimer: number | undefined
    let fallbackInFlight = false
    let eventStreamOpen = false
    const clearFallback = () => {
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer)
      fallbackTimer = undefined
    }
    const scheduleFallback = (delay = 1_500) => {
      if (fallbackTimer !== undefined || disposed) return
      fallbackTimer = window.setTimeout(async () => {
        fallbackTimer = undefined
        if (disposed || eventStreamOpen || fallbackInFlight) return
        fallbackInFlight = true
        try {
          await fallbackFetchRef.current()
          if (!disposed && !eventStreamOpen) setStatus("fallback")
        } finally {
          fallbackInFlight = false
          if (!disposed && !eventStreamOpen) scheduleFallback(5_000)
        }
      }, delay)
    }

    if (typeof EventSource !== "undefined") {
      eventSource = new EventSource("/api/market-data/stream")
      eventSource.onopen = () => {
        eventStreamOpen = true
        clearFallback()
        setStatus("connecting")
      }
      eventSource.addEventListener("rates", (event) => {
        try {
          queueRates(JSON.parse((event as MessageEvent).data) as unknown)
        } catch {
          setStatus("reconnecting")
        }
      })
      eventSource.addEventListener("status", (event) => {
        try {
          const nextStatus = connectionStatus(JSON.parse((event as MessageEvent).data) as unknown)
          if (nextStatus) setStatus(nextStatus)
        } catch {
          setStatus("reconnecting")
        }
      })
      eventSource.onerror = () => {
        eventStreamOpen = false
        setStatus("reconnecting")
        scheduleFallback()
      }
    } else {
      scheduleFallback(0)
    }

    return () => {
      disposed = true
      clearFallback()
      eventSource?.close()
      clearAnimationFrame()
    }
  }, [])

  return status
}
