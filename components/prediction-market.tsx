"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TrendingUp, TrendingDown, Zap, Trophy, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AssetLogo } from "@/components/asset-logo"

interface PredictionData {
  id: string
  crypto: "BTC/USDT" | "ETH/USDT"
  direction: "UP" | "DOWN"
  entryPrice: number
  tradeAmount: number
  startTime: number
  endTime: number
  status: "pending" | "won" | "lost"
  currentPrice?: number
}

export function PredictionMarket() {
  const { toast } = useToast()
  const [btcPrice, setBtcPrice] = useState(94523.45)
  const [ethPrice, setEthPrice] = useState(3421.78)
  const [tradeAmount, setTradeAmount] = useState("")
  const [activePrediction, setActivePrediction] = useState<PredictionData | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(300)
  const [priceHistory, setPriceHistory] = useState<number[]>([94523.45])
  const intervalRef = useRef<NodeJS.Timeout>()

  // Simulate price updates
  useEffect(() => {
    const priceInterval = setInterval(() => {
      setBtcPrice((prev) => {
        const change = (Math.random() - 0.5) * 100
        const newPrice = prev + change
        setPriceHistory((history) => [...history.slice(-20), newPrice])
        return newPrice
      })
      setEthPrice((prev) => prev + (Math.random() - 0.5) * 10)
    }, 2000)

    return () => clearInterval(priceInterval)
  }, [])

  // Countdown timer
  useEffect(() => {
    if (activePrediction && activePrediction.status === "pending") {
      intervalRef.current = setInterval(() => {
        const now = Date.now()
        const remaining = Math.max(0, Math.floor((activePrediction.endTime - now) / 1000))
        setTimeRemaining(remaining)

        if (remaining === 0) {
          // Determine win/loss
          const currentPrice = activePrediction.crypto === "BTC/USDT" ? btcPrice : ethPrice
          const won =
            (activePrediction.direction === "UP" && currentPrice > activePrediction.entryPrice) ||
            (activePrediction.direction === "DOWN" && currentPrice < activePrediction.entryPrice)

          setActivePrediction((prev) => (prev ? { ...prev, status: won ? "won" : "lost", currentPrice } : null))

          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }

          toast({
            title: won ? "🎉 Prediction Won!" : "😔 Prediction Lost",
            description: won
              ? `You won $${(activePrediction.tradeAmount * 1.9).toFixed(2)}!`
              : `Better luck next time. You lost $${activePrediction.tradeAmount.toFixed(2)}.`,
            variant: won ? "default" : "destructive",
          })
        }
      }, 1000)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [activePrediction, btcPrice, ethPrice, toast])

  const handlePrediction = (crypto: "BTC/USDT" | "ETH/USDT", direction: "UP" | "DOWN") => {
    const amount = Number.parseFloat(tradeAmount)

    if (!amount || amount < 5) {
      toast({
        title: "Invalid Amount",
        description: "Minimum trade amount is $5",
        variant: "destructive",
      })
      return
    }

    const entryPrice = crypto === "BTC/USDT" ? btcPrice : ethPrice
    const now = Date.now()

    setActivePrediction({
      id: Math.random().toString(36).substr(2, 9),
      crypto,
      direction,
      entryPrice,
      tradeAmount: amount,
      startTime: now,
      endTime: now + 300000, // 5 minutes
      status: "pending",
    })

    setTimeRemaining(300)
    setTradeAmount("")

    toast({
      title: "Prediction Started!",
      description: `${direction} on ${crypto} - Entry: $${entryPrice.toFixed(2)}`,
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const renderSparkline = () => {
    if (priceHistory.length < 2) return null

    const min = Math.min(...priceHistory)
    const max = Math.max(...priceHistory)
    const range = max - min || 1

    const points = priceHistory
      .map((price, i) => {
        const x = (i / (priceHistory.length - 1)) * 100
        const y = 30 - ((price - min) / range) * 30
        return `${x},${y}`
      })
      .join(" ")

    return (
      <svg className="w-full h-8" viewBox="0 0 100 30" preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke="url(#gradient)" strokeWidth="2" className="animate-draw-line" />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E85D3B" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle cx="100" cy={30 - ((btcPrice - min) / range) * 30} r="2" fill="#E85D3B" className="animate-pulse" />
      </svg>
    )
  }

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-white to-cyan-50/20 backdrop-blur-sm overflow-hidden relative group mb-6">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <CardHeader className="pb-3 relative z-10">
        <CardTitle className="text-lg text-slate-900 font-bold flex items-center gap-2">
          <Zap className="h-5 w-5 text-cyan-500 animate-pulse-soft" />
          Prediction Market
          <span className="ml-auto text-xs font-normal text-slate-500 bg-cyan-50 px-2 py-1 rounded-full">
            MPL Style
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 relative z-10">
        {/* Live Price Feed */}
        <div className="grid grid-cols-2 gap-3">
          {/* BTC Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#F7931A]/10 to-orange-500/10 border border-[#F7931A]/30">
            <div className="flex items-center gap-3 mb-3">
              <AssetLogo symbol="BTCUSDT" name="Bitcoin" bgColor="#F7931A" size={40} />
              <div>
                <p className="text-sm font-bold text-slate-900 leading-tight">BTC/USDT</p>
                <p className="text-xs text-slate-500 leading-tight mt-0.5">Bitcoin</p>
              </div>
              <TrendingUp className="h-4 w-4 text-[#F7931A] ml-auto" />
            </div>
            <p className="text-xl font-bold text-[#F7931A]">${btcPrice.toFixed(2)}</p>
            <div className="mt-2">{renderSparkline()}</div>
          </div>

          {/* ETH Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#627EEA]/10 to-indigo-500/10 border border-[#627EEA]/30">
            <div className="flex items-center gap-3 mb-3">
              <AssetLogo symbol="ETHUSDT" name="Ethereum" bgColor="#627EEA" size={40} />
              <div>
                <p className="text-sm font-bold text-slate-900 leading-tight">ETH/USDT</p>
                <p className="text-xs text-slate-500 leading-tight mt-0.5">Ethereum</p>
              </div>
              <TrendingUp className="h-4 w-4 text-[#627EEA] ml-auto" />
            </div>
            <p className="text-xl font-bold text-[#627EEA]">${ethPrice.toFixed(2)}</p>
          </div>
        </div>

        {/* Active Prediction Display */}
        {activePrediction && (
          <div
            className={`p-4 rounded-xl border-2 ${
              activePrediction.status === "pending"
                ? "bg-cyan-50/50 border-cyan-300"
                : activePrediction.status === "won"
                  ? "bg-emerald-50 border-emerald-400"
                  : "bg-red-50 border-red-400"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {activePrediction.status === "pending" && <Clock className="h-4 w-4 text-cyan-600 animate-pulse" />}
                {activePrediction.status === "won" && <Trophy className="h-4 w-4 text-emerald-600" />}
                <span className="font-bold text-sm">
                  {activePrediction.crypto} {activePrediction.direction}
                </span>
              </div>
              {activePrediction.status === "pending" && (
                <span className="font-mono font-bold text-cyan-600">{formatTime(timeRemaining)}</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">Entry:</span>
                <span className="font-bold ml-1">${activePrediction.entryPrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500">Trade:</span>
                <span className="font-bold ml-1">${activePrediction.tradeAmount.toFixed(2)}</span>
              </div>
              {activePrediction.status !== "pending" && (
                <>
                  <div>
                    <span className="text-slate-500">Final:</span>
                    <span className="font-bold ml-1">${activePrediction.currentPrice?.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Result:</span>
                    <span
                      className={`font-bold ml-1 ${activePrediction.status === "won" ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {activePrediction.status === "won" ? "Won!" : "Lost"}
                    </span>
                  </div>
                </>
              )}
            </div>
            {activePrediction.status === "pending" && (
              <div className="mt-2 h-1.5 bg-white/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-1000"
                  style={{ width: `${(timeRemaining / 300) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Trade Input */}
        {!activePrediction || activePrediction.status !== "pending" ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Trade Amount (USD)</label>
              <Input
                type="number"
                placeholder="Enter amount (min $5)"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                className="border-slate-200 focus:border-cyan-400"
              />
            </div>

            {/* UP/DOWN Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handlePrediction("BTC/USDT", "UP")}
                className="h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold shadow-lg shadow-emerald-500/40"
              >
                <TrendingUp className="h-5 w-5 mr-2" />
                BTC UP
              </Button>
              <Button
                onClick={() => handlePrediction("BTC/USDT", "DOWN")}
                className="h-12 bg-gradient-to-r from-[#F7931A] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold shadow-lg shadow-[#F7931A]/40"
              >
                <TrendingDown className="h-5 w-5 mr-2" />
                BTC DOWN
              </Button>
            </div>

            {/* Payout Info */}
            <div className="p-3 rounded-lg bg-gradient-to-r from-purple-50 to-cyan-50 border border-purple-200/50">
              <p className="text-xs text-center text-slate-700">
                <span className="font-bold text-[#7c3aed]">💰 Predict correctly to win 1.9x</span>
                <br />
                <span className="text-slate-500">
                  Trade $5 → Get $9.50 | Trade $10 → Get $19 | Trade $100 → Get $190
                </span>
              </p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
