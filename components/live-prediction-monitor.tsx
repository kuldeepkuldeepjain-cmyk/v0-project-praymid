"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Clock, ExternalLink } from "lucide-react"


// Chart URLs for assets
const CHART_URLS: Record<string, string> = {
  BTCUSDT: 'https://www.tradingview.com/chart/?symbol=BINANCE:BTCUSDT',
  ETHUSDT: 'https://www.tradingview.com/chart/?symbol=BINANCE:ETHUSDT',
  BNBUSDT: 'https://www.tradingview.com/chart/?symbol=BINANCE:BNBUSDT',
  SOLUSDT: 'https://www.tradingview.com/chart/?symbol=BINANCE:SOLUSDT',
  XRPUSDT: 'https://www.tradingview.com/chart/?symbol=BINANCE:XRPUSDT',
  DOGEUSDT: 'https://www.tradingview.com/chart/?symbol=BINANCE:DOGEUSDT',
  ADAUSDT: 'https://www.tradingview.com/chart/?symbol=BINANCE:ADAUSDT',
  AVAXUSDT: 'https://www.tradingview.com/chart/?symbol=BINANCE:AVAXUSDT',
  MATICUSDT: 'https://www.tradingview.com/chart/?symbol=BINANCE:MATICUSDT',
  SHIBUSDT: 'https://www.tradingview.com/chart/?symbol=BINANCE:SHIBUSDT',
}

// Crypto icons and colors
const CRYPTO_ICONS: Record<string, { icon: string; color: string; bgColor: string }> = {
  BTCUSDT: { icon: '₿', color: '#F7931A', bgColor: 'rgba(247, 147, 26, 0.15)' },
  ETHUSDT: { icon: '♦', color: '#627EEA', bgColor: 'rgba(98, 126, 234, 0.15)' },
  BNBUSDT: { icon: '◆', color: '#F3BA2F', bgColor: 'rgba(243, 186, 47, 0.15)' },
  SOLUSDT: { icon: '◉', color: '#14F195', bgColor: 'rgba(20, 241, 149, 0.15)' },
  XRPUSDT: { icon: '✦', color: '#23292F', bgColor: 'rgba(35, 41, 47, 0.15)' },
  DOGEUSDT: { icon: 'Ð', color: '#C2A633', bgColor: 'rgba(194, 166, 51, 0.15)' },
  ADAUSDT: { icon: '₳', color: '#0033AD', bgColor: 'rgba(0, 51, 173, 0.15)' },
  AVAXUSDT: { icon: '△', color: '#E84142', bgColor: 'rgba(232, 65, 66, 0.15)' },
  MATICUSDT: { icon: '⬡', color: '#8247E5', bgColor: 'rgba(130, 71, 229, 0.15)' },
  SHIBUSDT: { icon: '🐕', color: '#FFA409', bgColor: 'rgba(255, 164, 9, 0.15)' },
}

interface Prediction {
  id: string
  participant_id: string
  participant_email: string
  crypto_pair: string
  prediction_type: "up" | "down"
  amount: number
  leverage?: number
  entry_price: number
  target_price?: number
  status: "pending" | "won" | "lost"
  profit_loss: number
  result?: string
  created_at: string
  closed_at?: string
  timeframe_seconds?: number
  expiry_timestamp?: string
}

interface LivePredictionMonitorProps {
  userEmail: string
  currentPrices: Record<string, { price: number }>
  onBalanceUpdate: () => void
}

export function LivePredictionMonitor({
  userEmail,
  currentPrices,
  onBalanceUpdate,
}: LivePredictionMonitorProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Load predictions - refresh periodically for updates
  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout
    
    // Don't fetch if no email
    if (!userEmail) {
      return
    }
    
    const loadWithMountCheck = async () => {
      if (!isMounted || !userEmail) return
      
      await loadPredictions()
      
      // Schedule next load only after current completes
      if (isMounted) {
        timeoutId = setTimeout(loadWithMountCheck, 10000)
      }
    }
    
    loadWithMountCheck()
    
    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [userEmail])

  // Auto-settle predictions when expiry timestamp is reached
  useEffect(() => {
    let isMounted = true
    
    const checkAndSettle = async () => {
      if (!isMounted) return
      
      const now = new Date()
      const activePredictions = predictions.filter(
        (p) => p.status === "pending" && !processingIds.has(p.id)
      )

      for (const prediction of activePredictions) {
        if (!isMounted) break
        
        // Use expiry_timestamp if available, otherwise fall back to calculated expiry
        const expiryTime = prediction.expiry_timestamp 
          ? new Date(prediction.expiry_timestamp)
          : new Date(new Date(prediction.created_at).getTime() + ((prediction.timeframe_seconds || 60) * 1000))
        
        const timeUntilExpiry = expiryTime.getTime() - now.getTime()
        
        // Only settle if current time has passed the expiry timestamp
        if (timeUntilExpiry <= 0) {
          await settlePrediction(prediction)
        }
      }
    }

    // Check every 3 seconds for settlement timing
    const interval = setInterval(checkAndSettle, 3000)
    
    // Run initial check after 1 second delay to avoid immediate settlement of newly created trades
    const initialTimeout = setTimeout(() => {
      if (isMounted) checkAndSettle()
    }, 1000)
    
    return () => {
      isMounted = false
      clearInterval(interval)
      clearTimeout(initialTimeout)
    }
  }, [predictions, currentPrices, processingIds])

  const loadPredictions = async () => {
    // Skip if no email provided
    if (!userEmail) {
      return
    }
    
    try {
      const response = await fetch(`/api/participant/predictions?participant_email=${encodeURIComponent(userEmail)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success && result.predictions) {
        setPredictions(result.predictions)
        setIsInitialLoad(false)
      }
    } catch (error: any) {
      // Ignore AbortError - it happens when component unmounts or requests are cancelled
      if (error?.name === 'AbortError') {
        return
      }
      console.error("Load predictions error:", error)
    }
  }

  const settlePrediction = async (prediction: Prediction) => {
    // Skip if no created_at (means it's not fully settled yet)
    if (!prediction.created_at) return
    
    // Mark as processing
    setProcessingIds((prev) => new Set(prev).add(prediction.id))

    try {
      // Get current price for the crypto pair
      const priceSymbol = prediction.crypto_pair
      
      const currentPrice = currentPrices[priceSymbol]?.price
      if (!currentPrice) {
        console.error("No current price for", prediction.crypto_pair)
        setProcessingIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(prediction.id)
          return newSet
        })
        return
      }

      const entryPrice = prediction.entry_price
      const isWin =
        (prediction.prediction_type === "up" && currentPrice > entryPrice) ||
        (prediction.prediction_type === "down" && currentPrice < entryPrice)

      // 80% profit rate — net profit only; total payout = stake + net profit
      const profitRate = 0.80
      const leverage = prediction.leverage || 1
      const netProfit = prediction.amount * profitRate * leverage
      const totalPayout = isWin ? prediction.amount + netProfit : 0
      const profitLoss = isWin ? netProfit : -prediction.amount
      const status = isWin ? "won" : "lost"

      // Settle via server-side API (uses Neon DB directly)
      const settleResponse = await fetch("/api/predictions/auto-settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictionId: prediction.id, finalPrice: currentPrice }),
      })

      if (!settleResponse.ok) {
        throw new Error(`Settlement failed: ${settleResponse.status}`)
      }

      if (isWin) {
        onBalanceUpdate()
      }

      // Reload predictions
      await loadPredictions()
    } catch (error: any) {
      // Ignore AbortError - it happens when component unmounts or requests are cancelled
      if (error?.name === 'AbortError') {
        return
      }
      console.error("Settlement error:", error)
    } finally {
      // Remove from processing
      setProcessingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(prediction.id)
        return newSet
      })
    }
  }

  const getTimeRemaining = (createdAt: string, timeframeSeconds?: number, expiryTimestamp?: string) => {
    const now = new Date()
    
    // Use expiry_timestamp if available, otherwise calculate from created_at
    const settlementTime = expiryTimestamp 
      ? new Date(expiryTimestamp)
      : new Date(new Date(createdAt).getTime() + ((timeframeSeconds || 60) * 1000))
    
    const diff = settlementTime.getTime() - now.getTime()

    if (diff <= 0) return "Settling..."

    const totalSeconds = Math.floor(diff / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else if (seconds > 0) {
      return `${seconds}s`
    }
    return "Settling..."
  }

  const getProgressPercentage = (createdAt: string, timeframeSeconds?: number, expiryTimestamp?: string) => {
    const start = new Date(createdAt).getTime()
    
    // Use expiry_timestamp if available, otherwise calculate from timeframe
    const end = expiryTimestamp 
      ? new Date(expiryTimestamp).getTime()
      : start + ((timeframeSeconds || 60) * 1000)
    
    const now = Date.now()
    const progress = ((now - start) / (end - start)) * 100
    return Math.min(Math.max(progress, 0), 100)
  }

  const getProfitLoss = (prediction: Prediction) => {
    if (prediction.status !== "pending") {
      return prediction.status === "won"
        ? { value: prediction.profit_loss || 0, isProfit: true }
        : { value: prediction.profit_loss || -prediction.amount, isProfit: false }
    }

    const currentPrice = currentPrices[prediction.crypto_pair]?.price
    if (!currentPrice) return { value: 0, isProfit: false }

    const entryPrice = prediction.entry_price
    const isInProfit =
      (prediction.prediction_type === "up" && currentPrice > entryPrice) ||
      (prediction.prediction_type === "down" && currentPrice < entryPrice)

    const leverage = prediction.leverage || 1
    const potentialPayout = prediction.amount * 1.9 * leverage
    return {
      value: isInProfit ? potentialPayout : -prediction.amount,
      isProfit: isInProfit,
    }
  }

  if (isInitialLoad) {
    return (
      <div className="text-center py-12">
        <div className="w-10 h-10 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500">Loading predictions...</p>
      </div>
    )
  }

  if (predictions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-600">
        <p className="font-semibold">No prediction history yet</p>
        <p className="text-sm mt-2 text-slate-500">Start trading to see your predictions here</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {predictions.map((prediction) => {
            const { value: plValue, isProfit } = getProfitLoss(prediction)
            const isActive = prediction.status === "pending"
            const timeRemaining = isActive ? getTimeRemaining(prediction.created_at, prediction.timeframe_seconds, prediction.expiry_timestamp) : null
            const progress = isActive ? getProgressPercentage(prediction.created_at, prediction.timeframe_seconds, prediction.expiry_timestamp) : 100

            return (
          <div
            key={prediction.id}
            className={`relative overflow-hidden rounded-xl border transition-all duration-200 ${
              isActive
                ? "bg-white border-slate-200 shadow-sm"
                : prediction.status === "won"
                  ? "bg-white border-green-200"
                  : "bg-white border-red-200"
            }`}
          >
            {/* Header with Prominent Logo */}
            <div className="flex items-center justify-between p-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm"
                  style={{
                    background: CRYPTO_ICONS[prediction.crypto_pair]?.bgColor || 'rgba(100, 100, 100, 0.15)',
                    color: CRYPTO_ICONS[prediction.crypto_pair]?.color || '#666',
                  }}
                >
                  {CRYPTO_ICONS[prediction.crypto_pair]?.icon || '◎'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold text-slate-900">
                      {prediction.crypto_pair.replace('USDT', '')}
                    </span>
                    {prediction.leverage && prediction.leverage > 1 && (
                      <span className="px-1.5 py-0.5 text-xs font-bold rounded bg-orange-100 text-orange-700">
                        {prediction.leverage}x
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(prediction.created_at).toLocaleString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>

              {isActive ? (
                <Badge className="text-xs font-semibold bg-amber-100 text-amber-700 border-0">
                  <Clock className="h-3 w-3 mr-1 inline" />
                  {timeRemaining}
                </Badge>
              ) : (
                <Badge 
                  className={`text-xs font-semibold border-0 ${
                    prediction.status === "won" 
                      ? "bg-green-100 text-green-700" 
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {prediction.status === "won" ? "Won" : "Lost"}
                </Badge>
              )}
            </div>

            {/* Trade Details */}
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2 pb-2">
                {prediction.prediction_type === "up" ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className={`text-sm font-semibold ${
                  prediction.prediction_type === "up" ? "text-green-600" : "text-red-600"
                }`}>
                  {prediction.prediction_type === "up" ? "Long Position" : "Short Position"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <div className="text-xs text-slate-500">Entry Point</div>
                  <div className="text-sm font-semibold text-slate-900">${prediction.entry_price.toLocaleString()}</div>
                </div>
                {!isActive && prediction.target_price ? (
                  <div>
                    <div className="text-xs text-slate-500">Close Point</div>
                    <div className="text-sm font-semibold text-slate-900">
                      ${prediction.target_price.toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs text-slate-500">Current</div>
                    <div className="text-sm font-semibold text-slate-900">
                      ${(currentPrices[prediction.crypto_pair]?.price || prediction.entry_price).toLocaleString()}
                    </div>
                  </div>
                )}
                <div className="text-right">
                  <div className="text-xs text-slate-500">Volume</div>
                  <div className="text-sm font-semibold text-slate-900">${prediction.amount.toFixed(2)}</div>
                </div>
              </div>

              {/* P&L Display */}
              <div className={`flex items-center justify-between p-2 rounded-lg ${
                isProfit ? "bg-green-50" : "bg-red-50"
              }`}>
                <span className="text-xs font-medium text-slate-600">Profit/Loss</span>
                <span className={`text-base font-bold ${
                  isProfit ? "text-green-600" : "text-red-600"
                }`}>
                  {isProfit ? "+" : ""}{typeof plValue === "number" ? plValue.toFixed(2) : "0.00"}
                </span>
              </div>

              {/* Close Time for Settled Trades */}
              {!isActive && prediction.closed_at && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500">Closed at:</span>
                  <span className="text-slate-600 font-medium">
                    {new Date(prediction.closed_at).toLocaleString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              )}

              {/* Chart Link */}
              {CHART_URLS[prediction.crypto_pair] && (
                <a
                  href={CHART_URLS[prediction.crypto_pair]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Chart
                </a>
              )}
            </div>

            {/* Progress Bar for Active */}
            {isActive && (
              <div className="px-3 pb-3">
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${
                      isProfit ? "bg-green-500" : "bg-red-500"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Manual Settle Button */}
            {isActive && timeRemaining === "Expired" && !processingIds.has(prediction.id) && (
              <div className="px-3 pb-3">
                <button
                  onClick={() => manuallySettlePrediction(prediction.id)}
                  disabled={processingIds.has(prediction.id)}
                  className="w-full py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Settle Trade
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
