'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Clock, ChevronRight } from 'lucide-react'
import Link from 'next/link'
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
  timeframe_seconds: number
  result: string | null
  profit_loss: number | null
  status: 'pending' | 'won' | 'lost'
  created_at: string
}

interface LivePredictionMonitorProps {
  userEmail: string
  currentPrices: Record<string, { price: number; change: number }>
  onBalanceUpdate?: () => void
}

export function LivePredictionMonitor({
  userEmail,
  currentPrices,
  onBalanceUpdate,
}: LivePredictionMonitorProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'live' | 'won' | 'lost'>('all')

  // Fetch predictions
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
        console.log('[v0] Fetching predictions for:', userEmail)
        
        const response = await participantFetch(`/api/participant/predictions?participant_email=${encodeURIComponent(userEmail)}`)
        
        if (!response.ok) {
          const errorData = await response.text()
          console.error('[v0] API error:', response.status, errorData)
          throw new Error(`Failed to fetch predictions: ${response.status}`)
        }

        const data = await response.json()
        console.log('[v0] Predictions loaded:', data.predictions?.length || 0)
        
        if (data.success && Array.isArray(data.predictions)) {
          setPredictions(data.predictions)
        } else {
          console.warn('[v0] Invalid response format:', data)
          setPredictions([])
        }
      } catch (err: any) {
        console.error('[v0] Error fetching predictions:', err.message)
        setError(err.message)
        setPredictions([])
      } finally {
        setLoading(false)
      }
    }

    fetchPredictions()
  }, [userEmail])

  // Filter predictions
  const filteredPredictions = predictions.filter((p) => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'live') return p.status === 'pending'
    if (activeFilter === 'won') return p.status === 'won'
    if (activeFilter === 'lost') return p.status === 'lost'
    return true
  })

  // Count stats
  const stats = {
    all: predictions.length,
    live: predictions.filter((p) => p.status === 'pending').length,
    won: predictions.filter((p) => p.status === 'won').length,
    lost: predictions.filter((p) => p.status === 'lost').length,
  }

  // Loading state
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-10 h-10 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500">Loading predictions...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-600 font-semibold">Error loading predictions</p>
        <p className="text-xs text-slate-500 mt-2">{error}</p>
      </div>
    )
  }

  // Empty state
  if (predictions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-600">
        <p className="font-semibold">No prediction history yet</p>
        <p className="text-sm mt-2 text-slate-500">Start trading to see your predictions here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 flex-wrap">
        {[
          { key: 'all' as const, label: 'All' },
          { key: 'live' as const, label: 'Live' },
          { key: 'won' as const, label: 'Won' },
          { key: 'lost' as const, label: 'Lost' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`px-4 py-2.5 font-semibold transition-all border-b-2 ${
              activeFilter === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            {label} <span className="text-xs ml-1 opacity-70">({stats[key]})</span>
          </button>
        ))}
      </div>

      {/* Predictions List */}
      {filteredPredictions.length === 0 ? (
        <div className="text-center py-8 text-slate-600">
          <p className="font-semibold">No {activeFilter === 'all' ? 'predictions' : activeFilter + ' predictions'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPredictions.map((prediction) => {
            const amount = Number(prediction.amount)
            const entryPrice = Number(prediction.entry_price)
            const profitLoss = prediction.profit_loss ? Number(prediction.profit_loss) : 0
            const isWin = prediction.status === 'won'
            const isLoss = prediction.status === 'lost'
            const isLive = prediction.status === 'pending'
            
            // Calculate time remaining
            const expiryTime = new Date(prediction.expiry_at).getTime()
            const nowTime = Date.now()
            const secondsLeft = Math.max(0, Math.floor((expiryTime - nowTime) / 1000))
            const timeRemaining = secondsLeft > 0 
              ? `${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60}s`
              : 'Expired'

            // Current price
            const currentPrice = currentPrices[prediction.crypto_pair]?.price || entryPrice
            
            return (
              <Card
                key={prediction.id}
                className={`p-4 border transition-all hover:shadow-md ${
                  isWin
                    ? 'border-green-200 bg-green-50/50'
                    : isLoss
                    ? 'border-red-200 bg-red-50/50'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Prediction Type Icon */}
                      <div
                        className={`p-2 rounded ${
                          prediction.prediction_type === 'up' ? 'bg-green-100' : 'bg-red-100'
                        }`}
                      >
                        {prediction.prediction_type === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      {/* Pair & Amount */}
                      <div>
                        <p className="font-semibold text-slate-900">{prediction.crypto_pair}</p>
                        <p className="text-xs text-slate-500">${amount.toFixed(2)} bet</p>
                      </div>
                    </div>
                    {/* Status Badge */}
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        isWin
                          ? 'bg-green-200 text-green-800'
                          : isLoss
                          ? 'bg-red-200 text-red-800'
                          : 'bg-amber-200 text-amber-800'
                      }`}
                    >
                      {isWin ? 'Won' : isLoss ? 'Lost' : 'Live'}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-200">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold">Entry</p>
                      <p className="text-sm font-semibold text-slate-900">
                        ${entryPrice.toFixed(entryPrice < 1 ? 8 : 2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold">Current</p>
                      <p className="text-sm font-semibold text-slate-900">
                        ${currentPrice.toFixed(currentPrice < 1 ? 8 : 2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold">P/L</p>
                      <p
                        className={`text-sm font-semibold ${
                          profitLoss > 0
                            ? 'text-green-600'
                            : profitLoss < 0
                            ? 'text-red-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {profitLoss > 0 ? '+' : ''} ${profitLoss.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 uppercase font-semibold">
                        {isLive ? 'Time Left' : 'Closed'}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {isLive ? timeRemaining : new Date(prediction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Time Created */}
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Placed {new Date(prediction.created_at).toLocaleString()}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
