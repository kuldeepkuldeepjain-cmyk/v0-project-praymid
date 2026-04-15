"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TrendingUp, TrendingDown, X, Clock, DollarSign } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AssetLogo } from "@/components/asset-logo"

interface ActiveTrade {
  id: string
  asset_symbol: string
  asset_name: string
  direction: "UP" | "DOWN"
  bet_amount: number
  entry_price: number
  opening_time: Date
  closing_time: Date
  current_price: number
  profit_loss: number
  status: "active" | "won" | "lost"
}

interface TradeHistory {
  id: string
  asset_symbol: string
  direction: "UP" | "DOWN"
  bet_amount: number
  entry_price: number
  settlement_price: number
  profit_loss: number
  status: "won" | "lost"
  created_at: Date
  settled_at: Date
}

interface PriceData {
  price: number
  change: number
  changePercent: number
  timestamp: number
}

export function EnhancedPredictionMarket({ participantEmail }: { participantEmail: string }) {
  const { toast } = useToast()
  
  // State
  const [selectedAsset, setSelectedAsset] = useState<"AUD/CAD" | "EUR/USD" | "GBP/JPY">("AUD/CAD")
  const [betAmount, setBetAmount] = useState("")
  const [duration, setDuration] = useState<1 | 3 | 5>(1) // minutes
  const [activeTrade, setActiveTrade] = useState<ActiveTrade | null>(null)
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([])
  const [currentPrice, setCurrentPrice] = useState<PriceData>({
    price: 0.93007,
    change: -0.00002,
    changePercent: -0.002,
    timestamp: Date.now()
  })
  const [priceHistory, setPriceHistory] = useState<number[]>([])
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [showHistory, setShowHistory] = useState(false)
  
  const chartCanvasRef = useRef<HTMLCanvasElement>(null)
  const priceIntervalRef = useRef<NodeJS.Timeout>()
  const countdownIntervalRef = useRef<NodeJS.Timeout>()

  // Initialize price based on asset
  useEffect(() => {
    const initialPrices = {
      "AUD/CAD": 0.93007,
      "EUR/USD": 1.04523,
      "GBP/JPY": 187.45
    }
    setCurrentPrice(prev => ({
      ...prev,
      price: initialPrices[selectedAsset]
    }))
    setPriceHistory([initialPrices[selectedAsset]])
  }, [selectedAsset])

  // Simulate real-time price updates
  useEffect(() => {
    priceIntervalRef.current = setInterval(() => {
      setCurrentPrice(prev => {
        const volatility = 0.0001
        const randomChange = (Math.random() - 0.5) * volatility
        const newPrice = prev.price + randomChange
        const change = newPrice - prev.price
        const changePercent = (change / prev.price) * 100

        // Update price history for chart
        setPriceHistory(history => {
          const newHistory = [...history, newPrice]
          return newHistory.slice(-50) // Keep last 50 points
        })

        // Update active trade if exists
        if (activeTrade) {
          const priceDiff = newPrice - activeTrade.entry_price
          const profitLoss = activeTrade.direction === "UP" 
            ? priceDiff > 0 ? activeTrade.bet_amount * 0.9 : -activeTrade.bet_amount
            : priceDiff < 0 ? activeTrade.bet_amount * 0.9 : -activeTrade.bet_amount

          setActiveTrade(prev => prev ? {
            ...prev,
            current_price: newPrice,
            profit_loss: profitLoss
          } : null)
        }

        return {
          price: newPrice,
          change,
          changePercent,
          timestamp: Date.now()
        }
      })
    }, 1000) // Update every second

    return () => {
      if (priceIntervalRef.current) clearInterval(priceIntervalRef.current)
    }
  }, [activeTrade, selectedAsset])

  // Draw chart
  useEffect(() => {
    if (!chartCanvasRef.current || priceHistory.length < 2) return

    const canvas = chartCanvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const padding = 10

    // Clear canvas
    ctx.fillStyle = "#1a1d2e"
    ctx.fillRect(0, 0, width, height)

    // Calculate min and max for scaling
    const min = Math.min(...priceHistory)
    const max = Math.max(...priceHistory)
    const range = max - min || 0.0001

    // Draw grid
    ctx.strokeStyle = "#2a2d3e"
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i * (height - padding * 2) / 4)
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Draw price line
    ctx.beginPath()
    ctx.strokeStyle = "#22d3ee"
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    priceHistory.forEach((price, index) => {
      const x = padding + (index / (priceHistory.length - 1)) * (width - padding * 2)
      const y = height - padding - ((price - min) / range) * (height - padding * 2)
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // Draw entry point marker if active trade
    if (activeTrade && priceHistory.length > 0) {
      const entryIndex = Math.max(0, priceHistory.length - Math.floor((activeTrade.closing_time.getTime() - Date.now()) / 1000))
      const entryX = padding + (entryIndex / (priceHistory.length - 1)) * (width - padding * 2)
      const entryY = height - padding - ((activeTrade.entry_price - min) / range) * (height - padding * 2)
      
      // Draw marker
      ctx.fillStyle = "#10b981"
      ctx.beginPath()
      ctx.arc(entryX, entryY, 6, 0, Math.PI * 2)
      ctx.fill()
      
      // Draw entry line
      ctx.strokeStyle = "#10b981"
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(padding, entryY)
      ctx.lineTo(width - padding, entryY)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw current price marker
    const lastPrice = priceHistory[priceHistory.length - 1]
    const lastY = height - padding - ((lastPrice - min) / range) * (height - padding * 2)
    ctx.fillStyle = "#22d3ee"
    ctx.beginPath()
    ctx.arc(width - padding, lastY, 4, 0, Math.PI * 2)
    ctx.fill()

  }, [priceHistory, activeTrade])

  // Countdown timer
  useEffect(() => {
    if (activeTrade && activeTrade.status === "active") {
      countdownIntervalRef.current = setInterval(() => {
        const now = Date.now()
        const remaining = Math.max(0, Math.floor((activeTrade.closing_time.getTime() - now) / 1000))
        setTimeRemaining(remaining)

        if (remaining === 0) {
          settleTrade()
        }
      }, 1000)

      return () => {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
      }
    }
  }, [activeTrade])

  const settleTrade = async () => {
    if (!activeTrade) return

    const finalPrice = currentPrice.price
    const priceDiff = finalPrice - activeTrade.entry_price
    const won = activeTrade.direction === "UP" ? priceDiff > 0 : priceDiff < 0
    const profitLoss = won ? activeTrade.bet_amount * 0.9 : -activeTrade.bet_amount

    // Update trade status
    setActiveTrade(prev => prev ? {
      ...prev,
      status: won ? "won" : "lost",
      profit_loss: profitLoss
    } : null)

    // Save to database
    try {
      const response = await fetch("/api/participant/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_email: participantEmail,
          asset_symbol: activeTrade.asset_symbol,
          asset_name: activeTrade.asset_name,
          direction: activeTrade.direction,
          bet_amount: activeTrade.bet_amount,
          entry_price: activeTrade.entry_price,
          settlement_price: finalPrice,
          status: won ? "won" : "lost",
          payout_amount: won ? activeTrade.bet_amount * 1.9 : 0,
          timeframe_minutes: duration
        })
      })

      if (response.ok) {
        // Add to history
        const newHistory: TradeHistory = {
          id: activeTrade.id,
          asset_symbol: activeTrade.asset_symbol,
          direction: activeTrade.direction,
          bet_amount: activeTrade.bet_amount,
          entry_price: activeTrade.entry_price,
          settlement_price: finalPrice,
          profit_loss: profitLoss,
          status: won ? "won" : "lost",
          created_at: activeTrade.opening_time,
          settled_at: new Date()
        }
        setTradeHistory(prev => [newHistory, ...prev])

        toast({
          title: won ? "Trade Won!" : "Trade Lost",
          description: won 
            ? `Congratulations! You won $${(activeTrade.bet_amount * 1.9).toFixed(2)}`
            : `Better luck next time. You lost $${activeTrade.bet_amount.toFixed(2)}`,
          variant: won ? "default" : "destructive"
        })
      }
    } catch (error) {
      console.error("Error settling trade:", error)
    }

    // Clear active trade after 5 seconds
    setTimeout(() => {
      setActiveTrade(null)
    }, 5000)
  }

  const placeTrade = (direction: "UP" | "DOWN") => {
    const amount = parseFloat(betAmount)

    if (!amount || amount < 5) {
      toast({
        title: "Invalid Amount",
        description: "Minimum bet is $5",
        variant: "destructive"
      })
      return
    }

    if (amount > 5000) {
      toast({
        title: "Invalid Amount",
        description: "Maximum bet is $5000",
        variant: "destructive"
      })
      return
    }

    const now = new Date()
    const closingTime = new Date(now.getTime() + duration * 60 * 1000)

    const newTrade: ActiveTrade = {
      id: Math.random().toString(36).substr(2, 9),
      asset_symbol: selectedAsset,
      asset_name: selectedAsset,
      direction,
      bet_amount: amount,
      entry_price: currentPrice.price,
      opening_time: now,
      closing_time: closingTime,
      current_price: currentPrice.price,
      profit_loss: 0,
      status: "active"
    }

    setActiveTrade(newTrade)
    setTimeRemaining(duration * 60)
    setBetAmount("")

    toast({
      title: "Trade Placed!",
      description: `${direction} on ${selectedAsset} for $${amount}`,
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const formatCurrency = (value: number, decimals: number = 5) => {
    return value.toFixed(decimals)
  }

  const formatChange = (value: number, decimals: number = 6) => {
    return value.toFixed(decimals)
  }

  const formatChangePercent = (value: number, decimals: number = 4) => {
    return Math.abs(value).toFixed(decimals)
  }

  const getAssetFlag = (asset: string) => {
    const flags = {
      "AUD": "🇦🇺",
      "CAD": "🇨🇦",
      "EUR": "🇪🇺",
      "USD": "🇺🇸",
      "GBP": "🇬🇧",
      "JPY": "🇯🇵"
    }
    const [first, second] = asset.split("/")
    return `${flags[first as keyof typeof flags] || ""} ${flags[second as keyof typeof flags] || ""}`
  }

  return (
    <div className="space-y-4">
      {/* Active Trade View */}
      {activeTrade && (
        <Card className="border-0 shadow-2xl bg-gradient-to-br from-[#1a1d2e] to-[#242842] overflow-hidden">
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AssetLogo symbol={activeTrade.asset_symbol.replace("/", "")} name={activeTrade.asset_name} size={40} />
                <div>
                  <h3 className="text-white font-bold text-lg">{activeTrade.asset_symbol}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      activeTrade.direction === "UP" 
                        ? "bg-emerald-500/20 text-emerald-400" 
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      {activeTrade.direction === "UP" ? "↑" : "↓"} {activeTrade.bet_amount} ₹
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                {activeTrade.status === "active" ? (
                  <>
                    <div className="text-cyan-400 text-sm mb-1">Duration:</div>
                    <div className="text-white font-mono font-bold text-xl">
                      {formatTime(timeRemaining)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-slate-400 text-sm mb-1">Result:</div>
                    <div className={`font-bold text-xl ${
                      activeTrade.status === "won" ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {activeTrade.profit_loss >= 0 ? "+" : ""}{activeTrade.profit_loss.toFixed(2)} ₹
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Chart */}
            <div className="relative">
              <canvas 
                ref={chartCanvasRef} 
                width={600} 
                height={200}
                className="w-full rounded-lg"
              />
              
              {/* Entry marker label */}
              {activeTrade.status === "active" && (
                <div className="absolute top-2 left-2 bg-emerald-500/90 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {activeTrade.bet_amount} ₹
                </div>
              )}
            </div>

            {/* Trade Info */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-800/50 rounded-lg p-2">
                <div className="text-slate-400 mb-1">Opening quote:</div>
                <div className="text-white font-bold">{formatCurrency(activeTrade.entry_price)}</div>
                <div className="text-slate-500 text-[10px] mt-0.5">
                  {activeTrade.opening_time.toLocaleTimeString()}
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-2">
                <div className="text-slate-400 mb-1">{activeTrade.status === "active" ? "Current:" : "Closing quote:"}</div>
                <div className="text-cyan-400 font-bold">{formatCurrency(activeTrade.current_price)}</div>
                {activeTrade.status !== "active" && (
                  <div className="text-slate-500 text-[10px] mt-0.5">
                    {activeTrade.closing_time.toLocaleTimeString()}
                  </div>
                )}
              </div>

              <div className="bg-slate-800/50 rounded-lg p-2">
                <div className="text-slate-400 mb-1">Change:</div>
                <div className={`font-bold text-sm ${
                  (activeTrade.current_price - activeTrade.entry_price) >= 0 ? "text-emerald-400" : "text-red-400"
                }`}>
                  {(activeTrade.current_price - activeTrade.entry_price) >= 0 ? "+" : ""}{formatChange(activeTrade.current_price - activeTrade.entry_price)}
                  <span className="text-xs ml-1">
                    ({(activeTrade.current_price - activeTrade.entry_price) >= 0 ? "+" : ""}{formatChangePercent(((activeTrade.current_price - activeTrade.entry_price) / activeTrade.entry_price) * 100)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {activeTrade.status === "active" && (
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-1000"
                  style={{ width: `${(timeRemaining / (duration * 60)) * 100}%` }}
                />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Trade Setup */}
      {!activeTrade && (
        <Card className="border-0 shadow-lg bg-white">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Prediction Market</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="text-slate-600"
              >
                History
              </Button>
            </div>

            {/* Asset Selection */}
            <div className="grid grid-cols-3 gap-2">
              {(["AUD/CAD", "EUR/USD", "GBP/JPY"] as const).map(asset => (
                  <button
                  key={asset}
                  onClick={() => setSelectedAsset(asset)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedAsset === asset
                      ? "border-purple-500 bg-purple-50"
                      : "border-slate-200 hover:border-purple-300"
                  }`}
                >
                  <div className="flex justify-center mb-1">
                    <AssetLogo symbol={asset.replace("/", "")} size={28} />
                  </div>
                  <div className="text-xs font-bold text-slate-700">{asset}</div>
                  <div className="text-xs text-slate-500 mt-1">{formatCurrency(currentPrice.price)}</div>
                </button>
              ))}
            </div>

            {/* Duration Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block">Duration</label>
              <div className="grid grid-cols-3 gap-2">
                {([1, 3, 5] as const).map(mins => (
                  <button
                    key={mins}
                    onClick={() => setDuration(mins)}
                    className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                      duration === mins
                        ? "bg-purple-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block">
                Trade Amount ($5 - $5000)
              </label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                className="h-12 text-base"
                min={5}
                max={5000}
              />
            </div>

            {/* Trade Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => placeTrade("UP")}
                disabled={!betAmount}
                className="h-14 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-lg"
              >
                <TrendingUp className="h-5 w-5 mr-2" />
                UP
              </Button>
              <Button
                onClick={() => placeTrade("DOWN")}
                disabled={!betAmount}
                className="h-14 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-bold text-lg"
              >
                <TrendingDown className="h-5 w-5 mr-2" />
                DOWN
              </Button>
            </div>

            {/* Payout Info */}
            <div className="text-center text-xs text-slate-500 bg-purple-50 rounded-lg p-3">
              Win rate: 1.9x | Minimum: $5 | Maximum: $5000
            </div>
          </div>
        </Card>
      )}

      {/* Trade History */}
      {showHistory && (
        <Card className="border-0 shadow-lg bg-white">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Trade History</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {tradeHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No trade history yet. Place your first trade!
                </div>
              ) : (
                tradeHistory.map((trade) => (
                  <div key={trade.id} className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AssetLogo symbol={trade.asset_symbol.replace("/", "")} size={22} />
                        <span className="font-semibold text-sm">{trade.asset_symbol}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          trade.direction === "UP" 
                            ? "bg-emerald-100 text-emerald-700" 
                            : "bg-red-100 text-red-700"
                        }`}>
                          {trade.direction}
                        </span>
                      </div>
                      <span className={`text-sm font-bold ${
                        trade.status === "won" ? "text-emerald-600" : "text-red-600"
                      }`}>
                        {trade.status === "won" ? "+" : ""}{trade.profit_loss.toFixed(2)} ₹
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
                      <div>Bet: ${trade.bet_amount}</div>
                      <div>Entry: {formatCurrency(trade.entry_price)}</div>
                      <div>Exit: {formatCurrency(trade.settlement_price)}</div>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {trade.settled_at.toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
