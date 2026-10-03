"use client"

import { useEffect, useRef, useState } from "react"

type Rate = { bid: number; ask: number; mid?: number; change: number; high: number; low: number; open: number }
type RateMap = Record<string, Rate>

type StreamMessage = { type?: string; rates?: RateMap } | RateMap

export type MarketConnectionState = "connecting" | "connected" | "reconnecting" | "fallback" | "offline"

function isRate(value: unknown): value is Rate {
  if (!value || typeof value !== "object") return false
  const rate = value as Partial<Rate>
  return [rate.bid, rate.ask, rate.change, rate.high, rate.low, rate.open].every(
    (item) => typeof item === "number" && Number.isFinite(item),
  )
}

function parseRates(payload: unknown): RateMap | null {
  if (!payload || typeof payload !== "object") return null
  const candidate = "rates" in payload && payload.rates && typeof payload.rates === "object"
    ? payload.rates
    : payload
  if (!candidate || typeof candidate !== "object") return null
  const rates = Object.fromEntries(
    Object.entries(candidate).filter(([, value]) => isRate(value)),
  ) as RateMap
  return Object.keys(rates).length > 0 ? rates : null
}

export function useMarketDataStream(
  onRates: (rates: RateMap) => void,
  fallbackFetch: () => Promise<void>,
) {
  const [status, setStatus] = useState<MarketConnectionState>("connecting")
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const attemptsRef = useRef(0)

  useEffect(() => {
    let disposed = false
    const streamUrl = process.env.NEXT_PUBLIC_MARKET_DATA_WS_URL

    if (!streamUrl || typeof window === "undefined" || typeof WebSocket === "undefined") {
      setStatus("fallback")
      void fallbackFetch()
      const fallbackTimer = window.setInterval(() => void fallbackFetch(), 3000)
      return () => window.clearInterval(fallbackTimer)
    }

    const clearTimers = () => {
      if (retryRef.current) clearTimeout(retryRef.current)
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      retryRef.current = null
      heartbeatRef.current = null
    }

    const connect = () => {
      if (disposed) return
      setStatus(attemptsRef.current === 0 ? "connecting" : "reconnecting")
      const socket = new WebSocket(streamUrl)
      socketRef.current = socket

      socket.onopen = () => {
        attemptsRef.current = 0
        setStatus("connected")
        heartbeatRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "ping", at: Date.now() }))
        }, 15_000)
      }

      socket.onmessage = (event) => {
        try {
          const rates = parseRates(JSON.parse(event.data) as StreamMessage)
          if (rates) onRates(rates)
        } catch {
          // Ignore malformed market packets without interrupting the stream.
        }
      }

      socket.onerror = () => socket.close()
      socket.onclose = () => {
        if (disposed) return
        clearTimers()
        const delay = Math.min(30_000, 500 * 2 ** Math.min(attemptsRef.current++, 6))
        setStatus("reconnecting")
        retryRef.current = setTimeout(connect, delay)
      }
    }

    connect()
    return () => {
      disposed = true
      clearTimers()
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [fallbackFetch, onRates])

  return status
}
