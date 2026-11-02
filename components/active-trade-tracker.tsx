"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { Card } from "@/components/ui/card"

interface ActiveTrade {
  id: string
  crypto_pair: string
  prediction_type: "up" | "down"
  amount: number
  entry_price: number
  expiry_timestamp?: string
  expiry_at?: string
  timeframe_seconds: number
  status?: string
}

interface ActiveTradeTrackerProps {
  activeTrade: ActiveTrade | null
  currentPrice: number
  onTradeSettled: () => void
}

function getPairPrecision(pair: string): number {
  if (!pair) return 2
  const p = pair.toUpperCase()
  if (p.includes("JPY")) return 3
  const forexPairs = ["EURUSD","GBPUSD","AUDUSD","NZDUSD","USDCHF","USDCAD","EURGBP","USDJPY","EURJPY","GBPJPY"]
  if (forexPairs.some(fp => p.includes(fp.substring(0,3)))) return 5
  if (["XAUUSD","XAGUSD","XCUUSD","USOIL"].includes(p)) return 2
  return 2
}

function getTradeState(pair: string, predType: "up" | "down", entry: number, current: number): "win" | "loss" | "tie" {
  const p = pair.toUpperCase()
  const isJpy = p.includes("JPY")
  const isForex = /^(EUR|GBP|USD|AUD|NZD|CAD|CHF)(USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD)/.test(p)
  const precision = isJpy ? 3 : (isForex ? 5 : 5)
  const scale = Math.pow(10, precision)
  const diff = Math.round(current * scale) / scale - Math.round(entry * scale) / scale
  const minMove = isJpy ? 0.001 : (isForex ? 0.00005 : 0.00001)
  if (Math.abs(diff) < minMove) return "tie"
  return (predType === "up" ? diff > 0 : diff < 0) ? "win" : "loss"
}

export function ActiveTradeTracker({ activeTrade, currentPrice, onTradeSettled }: ActiveTradeTrackerProps) {
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [phase, setPhase] = useState<"live" | "settling" | "result" | "hidden">("live")
  const [resultPL, setResultPL] = useState(0)
  const [resultWin, setResultWin] = useState(false)
  const [resultType, setResultType] = useState<"won" | "lost" | "refunded">("lost")

  const settlingRef = useRef(false)
  const currentPriceRef = useRef(currentPrice)
  const currentPLRef = useRef(0)
  const settleTradeRef = useRef<(() => Promise<void>) | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  currentPriceRef.current = currentPrice

  const normalizedTrade = activeTrade ? {
    ...activeTrade,
    amount: Number(activeTrade.amount),
    entry_price: Number(activeTrade.entry_price),
    expiry_timestamp: activeTrade.expiry_timestamp || activeTrade.expiry_at || "",
  } : null

  const pricePrecision = normalizedTrade ? getPairPrecision(normalizedTrade.crypto_pair) : 2

  const tradeState = normalizedTrade
    ? getTradeState(normalizedTrade.crypto_pair, normalizedTrade.prediction_type, normalizedTrade.entry_price, currentPrice)
    : "tie"

  const currentPL = (() => {
    if (!normalizedTrade) return 0
    if (tradeState === "tie") return 0
    if (tradeState === "win") return normalizedTrade.amount * 0.50
    return -normalizedTrade.amount
  })()

  const isWinning = tradeState === "win"
  const isTie = tradeState === "tie"
  currentPLRef.current = currentPL

  const settleTrade = useCallback(async () => {
    if (!normalizedTrade || settlingRef.current) return
    settlingRef.current = true
    setPhase("settling")

    // Capture snapshot of P/L at exact settlement moment
    const snapshotPL = currentPLRef.current
    const snapshotPrice = currentPriceRef.current
    setResultPL(snapshotPL)
    setResultWin(snapshotPL > 0)

    try {
      const resp = await fetch("/api/predictions/auto-settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          predictionId: normalizedTrade.id,
          finalPrice: snapshotPrice,
        }),
      })
      const res = await resp.json()
      if (res.success) {
        const settledResult = String(res.result || "").toLowerCase()
        if (res.isRefund || settledResult === "refunded") {
          setResultType("refunded")
          setResultPL(0)
          setResultWin(false)
        } else if (res.isWin === true || settledResult === "won") {
          setResultType("won")
          setResultPL(Number(res.profitLoss ?? (Number(res.payout) - normalizedTrade.amount)))
          setResultWin(true)
        } else if (settledResult === "lost") {
          setResultType("lost")
          setResultPL(-normalizedTrade.amount)
          setResultWin(false)
        }
      }
    } catch {
      // Keep snapshot result on network error
    }
    setPhase("result")
  }, [normalizedTrade])

  useEffect(() => {
    settleTradeRef.current = settleTrade
  }, [settleTrade])

  // Reset ONLY when trade ID changes
  useEffect(() => {
    if (!normalizedTrade?.id) return
    settlingRef.current = false
    setPhase("live")
    setResultPL(0)
    setResultWin(false)
    setResultType("lost")
  }, [normalizedTrade?.id])

  // Countdown — fires settlement exactly once at expiry
  useEffect(() => {
    if (!normalizedTrade?.id || phase !== "live") return

    const expiry = new Date(normalizedTrade.expiry_timestamp).getTime()
    if (!expiry || isNaN(expiry)) return

    // Already expired on mount → settle immediately
    if (Date.now() >= expiry && !settlingRef.current) {
      setTimeRemaining(0)
      settleTradeRef.current?.()
      return
    }

    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000))
      setTimeRemaining(remaining)
      if (remaining <= 0 && !settlingRef.current) {
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = null
        settleTradeRef.current?.()
      }
    }

    tick()
    timerRef.current = setInterval(tick, 500)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [normalizedTrade?.id, phase])

  if (!normalizedTrade || phase === "hidden") return null

  const formatTime = (s: number) => {
    if (s >= 3600) return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`
    if (s >= 60) return `${Math.floor(s/60)}m ${s%60}s`
    return `${s}s`
  }

  // --- RESULT CARD ---
  if (phase === "result" || phase === "settling") {
    const isSettling = phase === "settling"
    const accentColor = resultType === "refunded"
      ? "var(--terminal-graphite-warning)"
      : resultType === "won"
        ? "var(--terminal-graphite-positive)"
        : "var(--terminal-graphite-negative)"

    const Icon = resultType === "refunded" ? RefreshCw
      : resultType === "won" ? CheckCircle
      : XCircle

    return (
      <div className="pointer-events-auto w-full">
        <Card className="terminal-panel overflow-hidden rounded-2xl border-2 p-0 shadow-2xl" style={{ borderColor: accentColor }}>
          <div className="p-4 text-[var(--terminal-graphite-text)]">
            {isSettling ? (
              <div className="flex items-center justify-center gap-3 py-2">
                <div aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-[var(--terminal-graphite-border)] border-t-[var(--brand-primary)]" />
                <span className="text-sm font-semibold">Settling trade...</span>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-full border"
                    style={{
                      borderColor: `color-mix(in srgb, ${accentColor} 40%, var(--terminal-graphite-border))`,
                      backgroundColor: `color-mix(in srgb, ${accentColor} 14%, var(--terminal-graphite-surface))`,
                    }}
                  >
                    <Icon aria-hidden="true" className="size-5" style={{ color: accentColor }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[var(--terminal-graphite-muted)]">
                      {resultType === "refunded" ? "Trade refunded" : resultType === "won" ? "Trade won" : "Trade lost"}
                    </p>
                    <p className="price-mono text-2xl font-bold leading-tight" style={{ color: accentColor }}>
                      {resultType === "refunded"
                        ? `$${normalizedTrade.amount.toFixed(2)} back`
                        : resultType === "won"
                        ? `+$${Math.abs(resultPL).toFixed(2)}`
                        : `-$${Math.abs(resultPL).toFixed(2)}`}
                    </p>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                  <div className="terminal-panel-raised min-w-0 rounded-lg p-2">
                    <p className="text-xs text-[var(--terminal-graphite-muted)]">Pair</p>
                    <p className="truncate text-xs font-semibold text-[var(--terminal-graphite-text)]">{normalizedTrade.crypto_pair}</p>
                  </div>
                  <div className="terminal-panel-raised min-w-0 rounded-lg p-2">
                    <p className="text-xs text-[var(--terminal-graphite-muted)]">Direction</p>
                    <p className="text-xs font-semibold text-[var(--terminal-graphite-text)]">{normalizedTrade.prediction_type.toUpperCase()}</p>
                  </div>
                  <div className="terminal-panel-raised min-w-0 rounded-lg p-2">
                    <p className="text-xs text-[var(--terminal-graphite-muted)]">Stake</p>
                    <p className="price-mono truncate text-xs font-semibold text-[var(--terminal-graphite-text)]">${normalizedTrade.amount.toFixed(2)}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPhase("hidden")
                    settlingRef.current = false
                    onTradeSettled()
                  }}
                  className="min-h-11 w-full rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Dismiss
                </button>
              </>
            )}
          </div>
        </Card>
      </div>
    )
  }

  // --- LIVE CARD ---
  const liveAccentColor = isTie
    ? "var(--terminal-graphite-warning)"
    : isWinning
      ? "var(--terminal-graphite-positive)"
      : "var(--terminal-graphite-negative)"

  return (
    <div className="pointer-events-auto w-full">
      <Card
        className="terminal-panel overflow-hidden rounded-2xl p-0 shadow-xl"
        style={{ borderColor: liveAccentColor }}
      >
        <div className="p-4">
          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="flex size-8 items-center justify-center rounded-lg border"
                style={{
                  borderColor: `color-mix(in srgb, ${normalizedTrade.prediction_type === "up" ? "var(--terminal-graphite-positive)" : "var(--terminal-graphite-negative)"} 38%, var(--terminal-graphite-border))`,
                  backgroundColor: `color-mix(in srgb, ${normalizedTrade.prediction_type === "up" ? "var(--terminal-graphite-positive)" : "var(--terminal-graphite-negative)"} 13%, var(--terminal-graphite-surface))`,
                }}
              >
                {normalizedTrade.prediction_type === "up"
                  ? <TrendingUp aria-hidden="true" className="size-4" style={{ color: "var(--terminal-graphite-positive)" }} />
                  : <TrendingDown aria-hidden="true" className="size-4" style={{ color: "var(--terminal-graphite-negative)" }} />
                }
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[var(--terminal-graphite-text)]">{normalizedTrade.crypto_pair}</p>
                <p className="text-xs text-[var(--terminal-graphite-muted)]">${normalizedTrade.amount.toFixed(2)} stake</p>
              </div>
            </div>
            <div className="terminal-panel-raised flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[var(--terminal-graphite-text)]">
              <Clock aria-hidden="true" className="size-3.5 text-[var(--brand-primary)]" />
              <span className="price-mono text-xs font-bold tabular-nums">{formatTime(timeRemaining)}</span>
            </div>
          </div>

          {/* P/L bar */}
          <div
            className="mb-3 rounded-xl border p-3"
            style={{
              borderColor: `color-mix(in srgb, ${liveAccentColor} 36%, var(--terminal-graphite-border))`,
              backgroundColor: `color-mix(in srgb, ${liveAccentColor} 12%, var(--terminal-graphite-surface))`,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--terminal-graphite-muted)]">
                  {isTie ? "Flat market" : "Live P/L"}
                </p>
                <p className="price-mono text-xl font-bold tabular-nums" style={{ color: liveAccentColor }}>
                  {isTie ? "$0.00" : `${currentPL >= 0 ? "+" : ""}$${Math.abs(currentPL).toFixed(2)}`}
                </p>
              </div>
              <div
                className="flex size-9 items-center justify-center rounded-lg border"
                style={{
                  borderColor: `color-mix(in srgb, ${liveAccentColor} 36%, var(--terminal-graphite-border))`,
                  backgroundColor: `color-mix(in srgb, ${liveAccentColor} 10%, var(--terminal-graphite-surface))`,
                }}
              >
                {isTie ? <Clock aria-hidden="true" className="size-5" style={{ color: liveAccentColor }} />
                  : isWinning ? <TrendingUp aria-hidden="true" className="size-5" style={{ color: liveAccentColor }} />
                  : <TrendingDown aria-hidden="true" className="size-5" style={{ color: liveAccentColor }} />
                }
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="terminal-panel-raised min-w-0 rounded-lg p-2.5">
              <p className="text-xs font-medium text-[var(--terminal-graphite-muted)]">Entry</p>
              <p className="price-mono mt-1 truncate text-sm font-semibold text-[var(--terminal-graphite-text)]">
                {normalizedTrade.entry_price.toFixed(pricePrecision)}
              </p>
            </div>
            <div className="terminal-panel-raised min-w-0 rounded-lg p-2.5">
              <p className="text-xs font-medium text-[var(--terminal-graphite-muted)]">Current</p>
              <p className="price-mono mt-1 truncate text-sm font-semibold tabular-nums" style={{ color: liveAccentColor }}>
                {currentPrice.toFixed(pricePrecision)}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
