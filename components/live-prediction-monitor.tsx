'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
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

  useEffect(() => {
    if (!userEmail) {
      setLoading(false)
      setPredictions([])
      return
    }

    const fetchPredictions = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await participantFetch(
          `/api/participant/predictions?participant_email=${encodeURIComponent(userEmail)}`
        )
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
        const data = await response.json()
        if (data.success && Array.isArray(data.predictions)) {
          setPredictions(data.predictions)
        } else {
          setPredictions([])
        }
      } catch (err: any) {
        setError(err.message)
        setPredictions([])
      } finally {
        setLoading(false)
      }
    }

    fetchPredictions()
  }, [userEmail])

  // Normalise status: DB stores 'settled' with result='won'/'lost', or 'pending', or 'refunded'
  const isLive = (p: Prediction) => p.status === 'pending'
  const isWon  = (p: Prediction) => p.result === 'won'  || p.status === 'won'
  const isLost = (p: Prediction) => p.result === 'lost' || p.status === 'lost'
  const isRefunded = (p: Prediction) =>
    p.result === 'refunded' || p.status === 'refunded'
  const isSettled = (p: Prediction) => !isLive(p)

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
      <div className="text-center py-12">
        <div className="w-10 h-10 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500">Loading trade history...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-600 font-semibold">Error loading history</p>
        <p className="text-xs text-slate-500 mt-1">{error}</p>
      </div>
    )
  }

  if (predictions.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-semibold">No trade history yet</p>
        <p className="text-sm mt-1">Place your first trade to see results here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {(
          [
            { key: 'all'      as const, label: 'All'      },
            { key: 'live'     as const, label: 'Live'     },
            { key: 'won'      as const, label: 'Won'      },
            { key: 'lost'     as const, label: 'Lost'     },
            { key: 'refunded' as const, label: 'Refunded' },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`px-3 py-2.5 whitespace-nowrap font-semibold text-sm transition-colors border-b-2 ${
              activeFilter === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {label}
            <span className="ml-1 text-xs opacity-60">({stats[key]})</span>
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          <p className="text-sm">No {activeFilter === 'all' ? '' : activeFilter + ' '}trades found</p>
        </div>
      ) : (
        <div className="space-y-3">
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

            // Closed date — prefer closed_at, fall back to expiry_at
            const closedDate = prediction.closed_at
              ? new Date(prediction.closed_at).toLocaleString()
              : new Date(prediction.expiry_at).toLocaleString()

            return (
              <Card
                key={prediction.id}
                className={`overflow-hidden border ${
                  won      ? 'border-green-200' :
                  lost     ? 'border-red-200'   :
                  refunded ? 'border-amber-200' :
                             'border-slate-200'
                }`}
              >
                {/* Coloured top stripe */}
                <div
                  className={`h-1 w-full ${
                    won      ? 'bg-green-500'  :
                    lost     ? 'bg-red-500'    :
                    refunded ? 'bg-amber-500'  :
                               'bg-blue-500'
                  }`}
                />

                <div className="p-4 space-y-3">
                  {/* Row 1: pair + direction + status badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-1.5 rounded ${
                          prediction.prediction_type === 'up' ? 'bg-green-100' : 'bg-red-100'
                        }`}
                      >
                        {prediction.prediction_type === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{prediction.crypto_pair}</p>
                        <p className="text-xs text-slate-500 capitalize">
                          {prediction.prediction_type === 'up' ? 'UP' : 'DOWN'} &middot; ${amount.toFixed(2)} bet
                        </p>
                      </div>
                    </div>

                    {/* Status badge */}
                    {live ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        <Clock className="h-3 w-3" />
                        {countdown}
                      </span>
                    ) : won ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        Won
                      </span>
                    ) : lost ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        <XCircle className="h-3 w-3" />
                        Lost
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        <RotateCcw className="h-3 w-3" />
                        Refunded
                      </span>
                    )}
                  </div>

                  {/* Row 2: price grid */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Entry Price</p>
                      <p className="text-sm font-bold text-slate-800">
                        ${entryPrice.toFixed(pricePrecision)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">
                        {live ? 'Current Price' : 'Final Price'}
                      </p>
                      <p className="text-sm font-bold text-slate-800">
                        ${displayPrice.toFixed(pricePrecision)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Result</p>
                      {live ? (
                        <p className="text-sm font-bold text-slate-500">Pending</p>
                      ) : profitLoss != null ? (
                        <p
                          className={`text-sm font-bold ${
                            profitLoss > 0 ? 'text-green-600' :
                            profitLoss < 0 ? 'text-red-600'  :
                            'text-amber-600'
                          }`}
                        >
                          {profitLoss > 0 ? '+' : profitLoss === 0 ? '' : '-'}
                          ${Math.abs(profitLoss).toFixed(2)}
                        </p>
                      ) : (
                        <p className="text-sm font-bold text-amber-600">+${amount.toFixed(2)}</p>
                      )}
                    </div>
                  </div>

                  {/* Row 3: timestamp */}
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-100">
                    <Clock className="h-3 w-3" />
                    {live
                      ? `Placed ${new Date(prediction.created_at).toLocaleString()}`
                      : `Settled ${closedDate}`
                    }
                  </p>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
