'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, RotateCcw } from 'lucide-react'
import { participantFetch } from '@/lib/auth'

interface Prediction {
  id: string
  participant_id: string
  participant_email: string
  crypto_pair: string
  prediction_type: 'up' | 'down'
  amount: number | string
  entry_price: number | string
  expiry_at: string
  expiry_timestamp?: string
  timeframe_seconds: number
  result: string | null       // 'won' | 'lost' | 'refunded' | null
  profit_loss: number | null
  status: string              // 'pending' | 'settled' | 'refunded'
  target_price: number | null // final price at settlement
  closed_at: string | null    // when it was settled
  created_at: string
}

interface LivePredictionMonitorProps {
  userEmail: string
  currentPrices: Record<string, { price: number; change: number }>
  onBalanceUpdate?: () => void
}

function getPricePrecision(price: number): number {
  if (price < 0.01) return 8
  if (price < 1) return 6
  if (price < 100) return 4
  return 2
}

export function LivePredictionMonitor({
  userEmail,
  currentPrices,
  onBalanceUpdate,
}: LivePredictionMonitorProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'live' | 'won' | 'lost' | 'refunded'>('all')

  const fetchPredictions = useCallback(async (showLoader = false) => {
    if (!userEmail) { setLoading(false); setPredictions([]); return }
    try {
      if (showLoader) setLoading(true)
      setError(null)
      const response = await participantFetch(
        `/api/participant/predictions?participant_email=${encodeURIComponent(userEmail)}`
      )
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
      const data = await response.json()
      setPredictions(data.success && Array.isArray(data.predictions) ? data.predictions : [])
    } catch {
      setError("Unable to load trade history. Please try again.")
      setPredictions([])
    } finally {
      setLoading(false)
    }
  }, [userEmail])

  // Initial fetch
  useEffect(() => { fetchPredictions(true) }, [fetchPredictions])

  // Auto-refresh every 10s so results appear without manual reload
  useEffect(() => {
    const iv = setInterval(() => fetchPredictions(false), 10000)
    return () => clearInterval(iv)
  }, [fetchPredictions])

  // Normalise status: DB stores 'settled' with result='won'/'lost', or 'pending', or 'refunded'
  const isLive = (p: Prediction) => p.status === 'pending'
  const isWon  = (p: Prediction) => p.result === 'won'  || p.status === 'won'
  const isLost = (p: Prediction) => p.result === 'lost' || p.status === 'lost'
  const isRefunded = (p: Prediction) =>
    p.result === 'refunded' || p.status === 'refunded'
  const filtered = predictions.filter((p) => {
    if (activeFilter === 'all')      return true
    if (activeFilter === 'live')     return isLive(p)
    if (activeFilter === 'won')      return isWon(p)
    if (activeFilter === 'lost')     return isLost(p)
    if (activeFilter === 'refunded') return isRefunded(p)
    return true
  })

  const stats = {
    all:      predictions.length,
    live:     predictions.filter(isLive).length,
    won:      predictions.filter(isWon).length,
    lost:     predictions.filter(isLost).length,
    refunded: predictions.filter(isRefunded).length,
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div aria-hidden="true" className="size-10 animate-spin rounded-full border-4 border-[var(--terminal-graphite-border)] border-t-[var(--brand-primary)]" />
        <p className="text-sm text-[var(--terminal-graphite-muted)]">Loading trade history...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="terminal-panel flex flex-col items-center gap-3 rounded-2xl p-8 text-center">
        <div className="flex size-10 items-center justify-center rounded-full border border-[var(--terminal-graphite-border)] bg-[var(--terminal-graphite-surface-2)]">
          <Clock aria-hidden="true" className="size-5 text-[var(--brand-primary)]" />
        </div>
        <p className="text-sm font-semibold text-[var(--terminal-graphite-text)]">Unable to load history</p>
        <p className="text-sm text-[var(--terminal-graphite-muted)]">Please check your connection and try again.</p>
      </div>
    )
  }

  if (predictions.length === 0) {
    return (
      <div className="terminal-panel flex flex-col items-center gap-2 rounded-2xl px-5 py-12 text-center">
        <Clock aria-hidden="true" className="mb-2 size-9 text-[var(--terminal-graphite-muted)]" />
        <p className="font-semibold text-[var(--terminal-graphite-text)]">No trade history yet</p>
        <p className="text-sm text-[var(--terminal-graphite-muted)]">Place your first prediction to see results here.</p>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div
        aria-label="Filter trade history"
        className="terminal-scroll flex min-w-0 gap-1 overflow-x-auto border-b"
        role="group"
        style={{ borderColor: "var(--terminal-graphite-border)" }}
      >
        {(
          [
            { key: 'all'      as const, label: 'All'      },
            { key: 'live'     as const, label: 'Live'     },
            { key: 'won'      as const, label: 'Won'      },
            { key: 'lost'     as const, label: 'Lost'     },
            { key: 'refunded' as const, label: 'Refunded' },
          ] as const
        ).map(({ key, label }) => {
          const active = activeFilter === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFilter(key)}
              aria-pressed={active}
              className="min-h-11 shrink-0 whitespace-nowrap border-b-2 px-3 py-2 font-semibold text-sm transition-colors"
              style={{
                borderColor: active ? "var(--brand-primary)" : "transparent",
                color: active ? "var(--brand-primary)" : "var(--terminal-graphite-muted)",
              }}
            >
              {label}
              <span className="ml-1 text-xs opacity-70">({stats[key]})</span>
            </button>
          )
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed px-5 py-10 text-center" style={{ borderColor: "var(--terminal-graphite-border)" }}>
          <p className="text-sm text-[var(--terminal-graphite-muted)]">No {activeFilter === 'all' ? '' : activeFilter + ' '}trades found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((prediction) => {
            const amount      = Number(prediction.amount)
            const entryPrice  = Number(prediction.entry_price)
            const profitLoss  = prediction.profit_loss != null ? Number(prediction.profit_loss) : null
            const targetPrice = prediction.target_price != null ? Number(prediction.target_price) : null
            const live        = isLive(prediction)
            const won         = isWon(prediction)
            const lost        = isLost(prediction)
            const refunded    = isRefunded(prediction)

            // For live trades show countdown, for settled show final price
            const expiry      = new Date(prediction.expiry_at || prediction.expiry_timestamp || '').getTime()
            const secondsLeft = Math.max(0, Math.floor((expiry - Date.now()) / 1000))
            const countdown   = secondsLeft > 0
              ? `${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60}s`
              : 'Settling...'

            // Show target_price (settlement price) for closed bets, live price for live bets
            const displayPrice = live
              ? (currentPrices[prediction.crypto_pair]?.price ?? entryPrice)
              : (targetPrice ?? entryPrice)

            const pricePrecision = getPricePrecision(entryPrice)
            const outcomeColor = won
              ? "var(--terminal-graphite-positive)"
              : lost
                ? "var(--terminal-graphite-negative)"
                : refunded
                  ? "var(--terminal-graphite-warning)"
                  : "var(--brand-primary)"
            const directionColor = prediction.prediction_type === "up"
              ? "var(--terminal-graphite-positive)"
              : "var(--terminal-graphite-negative)"
            const resultLabel = live
              ? "Pending"
              : profitLoss === null
                ? `+$${amount.toFixed(2)}`
                : `${profitLoss > 0 ? "+" : profitLoss < 0 ? "−" : ""}$${Math.abs(profitLoss).toFixed(2)}`

            // Closed date — prefer closed_at, fall back to expiry_at
            const closedDate = prediction.closed_at
              ? new Date(prediction.closed_at).toLocaleString()
              : new Date(prediction.expiry_at).toLocaleString()

            return (
              <Card
                key={prediction.id}
                className="terminal-panel gap-0 overflow-hidden rounded-2xl p-0 shadow-none"
                style={{ borderColor: outcomeColor }}
              >
                <div aria-hidden="true" className="h-1 w-full" style={{ backgroundColor: outcomeColor }} />
                <CardHeader className="flex flex-row items-center justify-between gap-3 px-4 py-4 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl border"
                      style={{
                        borderColor: `color-mix(in srgb, ${directionColor} 35%, var(--terminal-graphite-border))`,
                        backgroundColor: `color-mix(in srgb, ${directionColor} 12%, var(--terminal-graphite-surface))`,
                      }}
                    >
                      {prediction.prediction_type === 'up' ? (
                        <TrendingUp aria-hidden="true" className="size-5" style={{ color: directionColor }} />
                      ) : (
                        <TrendingDown aria-hidden="true" className="size-5" style={{ color: directionColor }} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="truncate text-sm font-bold text-[var(--terminal-graphite-text)] sm:text-base">{prediction.crypto_pair}</CardTitle>
                      <CardDescription className="mt-1 text-sm text-[var(--terminal-graphite-muted)]">
                        {prediction.prediction_type === 'up' ? 'UP' : 'DOWN'} · ${amount.toFixed(2)} stake
                      </CardDescription>
                    </div>
                  </div>

                  <span
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold"
                    style={{
                      borderColor: `color-mix(in srgb, ${outcomeColor} 40%, var(--terminal-graphite-border))`,
                      backgroundColor: `color-mix(in srgb, ${outcomeColor} 12%, var(--terminal-graphite-surface))`,
                      color: outcomeColor,
                    }}
                  >
                    {live ? <Clock aria-hidden="true" className="size-3.5" />
                      : won ? <CheckCircle aria-hidden="true" className="size-3.5" />
                      : lost ? <XCircle aria-hidden="true" className="size-3.5" />
                      : <RotateCcw aria-hidden="true" className="size-3.5" />}
                    {live ? countdown : won ? 'Won' : lost ? 'Lost' : 'Refunded'}
                  </span>
                </CardHeader>

                <CardContent className="px-4 pb-4 sm:px-5">
                  <div
                    className="grid grid-cols-3 gap-2 border-t pt-3"
                    style={{ borderColor: "var(--terminal-graphite-border)" }}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--terminal-graphite-muted)]">Entry</p>
                      <p className="price-mono mt-1 truncate text-sm font-semibold text-[var(--terminal-graphite-text)]">${entryPrice.toFixed(pricePrecision)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--terminal-graphite-muted)]">{live ? 'Current' : 'Final'}</p>
                      <p className="price-mono mt-1 truncate text-sm font-semibold text-[var(--terminal-graphite-text)]">${displayPrice.toFixed(pricePrecision)}</p>
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="text-xs font-medium text-[var(--terminal-graphite-muted)]">Result</p>
                      <p className="price-mono mt-1 truncate text-sm font-semibold" style={{ color: live ? "var(--terminal-graphite-muted)" : outcomeColor }}>
                        {resultLabel}
                      </p>
                    </div>
                  </div>
                </CardContent>

                <CardFooter
                  className="min-w-0 gap-2 border-t px-4 py-3 text-xs text-[var(--terminal-graphite-muted)] sm:px-5"
                  style={{ borderColor: "var(--terminal-graphite-border)" }}
                >
                  <Clock aria-hidden="true" className="size-3.5 shrink-0" />
                  <span className="min-w-0 break-words">
                    {live
                      ? `Placed ${new Date(prediction.created_at).toLocaleString()}`
                      : `Settled ${closedDate}`
                    }
                  </span>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
