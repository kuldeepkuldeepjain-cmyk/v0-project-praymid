"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { TrendingUp, TrendingDown, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"

interface ActiveTrade {
  id: string
  crypto_pair: string
  prediction_type: "up" | "down"
  amount: number
  entry_price: number
  expiry_timestamp: string
  timeframe_seconds: number
}

interface ActiveTradeTrackerProps {
  activeTrade: ActiveTrade | null
  currentPrice: number
  onTradeSettled: () => void
}

// Determine display precision for a given pair
function getPairPrecision(pair: string): number {
  if (!pair) return 2
  const p = pair.toUpperCase()
  if (p.includes("JPY")) return 3        // USD/JPY, EUR/JPY, GBP/JPY → 3dp
  const forexPairs = ["EURUSD","GBPUSD","AUDUSD","NZDUSD","USDCHF","USDCAD","EURGBP","USDJPY","EURJPY","GBPJPY"]
  if (forexPairs.some(fp => p.startsWith(fp.substring(0,3)) || p === fp)) return 5
  const isCommodity = ["XAUUSD","XAGUSD","XCUUSD","USOIL"].includes(p)
  if (isCommodity) return 2
  return 2 // crypto
}

// Pip-aware win/loss/tie determination (mirrors auto-settle logic)
function getTradeState(pair: string, predType: "up" | "down", entry: number, current: number): "win" | "loss" | "tie" {
  const p = pair.toUpperCase()
  const isJpy = p.includes("JPY")
  const isForex = /^(EUR|GBP|USD|AUD|NZD|CAD|CHF)(USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD)/.test(p)
  const precision = isJpy ? 3 : (isForex ? 5 : 5)
  const scale = Math.pow(10, precision)
  const roundedEntry = Math.round(entry * scale) / scale
  const roundedCurrent = Math.round(current * scale) / scale
  const diff = roundedCurrent - roundedEntry
  const minMove = isJpy ? 0.001 : (isForex ? 0.00005 : 0.00001)
  
  // No meaningful movement = refund (tie)
  if (Math.abs(diff) < minMove) return "tie"
  
  // Determine win/loss based on prediction direction
  const isCorrectDirection = predType === "up" ? diff > 0 : diff < 0
  return isCorrectDirection ? "win" : "loss"
}

export function ActiveTradeTracker({ activeTrade, currentPrice, onTradeSettled }: ActiveTradeTrackerProps) {
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [phase, setPhase] = useState<"live" | "settling" | "result" | "hidden">("live")
  const [resultPL, setResultPL] = useState(0)
  const [resultWin, setResultWin] = useState(false)

  // Refs to prevent double-settlement and stale closures
  const settlingRef = useRef(false)
  const currentPriceRef = useRef(currentPrice)
  const currentPLRef = useRef(0)

  // Keep refs updated
  currentPriceRef.current = currentPrice

  // Determine precision for this pair
  const pricePrecision = activeTrade ? getPairPrecision(activeTrade.crypto_pair) : 2

  // Calculate P/L using pip-aware comparison with tie detection
  const tradeState = activeTrade ? getTradeState(
    activeTrade.crypto_pair,
    activeTrade.prediction_type,
    activeTrade.entry_price,
    currentPrice
  ) : "tie"

  const currentPL = (() => {
    if (!activeTrade) return 0
    if (tradeState === "tie") return 0  // No movement = no profit/loss (refund)
    if (tradeState === "win") return activeTrade.amount * 0.80
    return -activeTrade.amount
  })()

  const isWinning = tradeState === "win"
  const isTie = tradeState === "tie"
  currentPLRef.current = currentPL

  // Settle trade via API (called once)
  const settleTrade = useCallback(async () => {
    if (!activeTrade || settlingRef.current) return
    settlingRef.current = true

    setResultPL(currentPLRef.current)
    setResultWin(currentPLRef.current > 0)
    setPhase("settling")

    try {
      const resp = await fetch("/api/predictions/auto-settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          predictionId: activeTrade.id,
          finalPrice: currentPriceRef.current,
        }),
      })
      const res = await resp.json()
      if (res.success) {
        // Use API result for accuracy
        setResultWin(res.isWin)
        if (res.isRefund) {
          // Flat market — full refund, zero P/L
          setResultPL(0)
        } else {
          setResultPL(res.isWin ? res.payout - activeTrade.amount : -activeTrade.amount)
        }
      }
    } catch (err) {
      console.error("[v0] Settlement error:", err)
    }

    // Show result for 3 seconds, then hide and notify parent
    setPhase("result")
    setTimeout(() => {
      setPhase("hidden")
      settlingRef.current = false
      onTradeSettled()
    }, 3000)
  }, [activeTrade, onTradeSettled]) // Updated dependency list

  // Reset state when a NEW trade comes in
  useEffect(() => {
    if (!activeTrade) return
    settlingRef.current = false
    setPhase("live")
    setResultPL(0)
    setResultWin(false)
  }, [activeTrade])

  // Countdown timer
  useEffect(() => {
    if (!activeTrade || phase !== "live") return

    let iv: NodeJS.Timeout | null = null

    const tick = () => {
      const now = Date.now()
      const expiry = new Date(activeTrade.expiry_timestamp).getTime()
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000))
      setTimeRemaining(remaining)

      if (remaining <= 0 && !settlingRef.current) {
        if (iv) clearInterval(iv)
        settleTrade()
      }
    }

    tick() // run immediately
    iv = setInterval(tick, 1000)
    return () => {
      if (iv) clearInterval(iv)
    }
  }, [activeTrade, phase, settleTrade])

  // --- Render ---

  if (!activeTrade || phase === "hidden") return null

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`
  }

  // Determine if this is a refund (no price movement)
  const isRefund = !resultWin && resultPL === 0

  // Result card (shown for 3 seconds after settlement)
  if (phase === "result" || phase === "settling") {
    return (
      <div className="fixed bottom-20 sm:bottom-24 left-3 right-3 sm:left-auto sm:right-4 sm:w-64 z-50 animate-in fade-in zoom-in-95 duration-300">
        <Card
          className={`border-2 shadow-xl backdrop-blur-md ${
            isRefund
              ? "bg-gradient-to-br from-amber-400/95 to-orange-500/95 border-amber-300"
              : resultWin
              ? "bg-gradient-to-br from-green-500/95 to-emerald-600/95 border-green-400"
              : "bg-gradient-to-br from-red-500/95 to-rose-600/95 border-red-400"
          }`}
        >
          <div className="p-3 text-center text-white">
            <h3 className="text-base font-bold mb-1">
              {isRefund ? "Bet Refunded" : resultWin ? "You Won!" : "You Lost"}
            </h3>
            <div className="text-xl font-black">
              {isRefund
                ? `$${activeTrade.amount.toFixed(2)} returned`
                : `${resultPL > 0 ? "+" : "-"}$${Math.abs(resultPL).toFixed(2)}`}
            </div>
            <p className="text-[10px] mt-1.5 text-white/80">
              {isRefund ? "Low liquidity — no market movement" : "View in history"}
            </p>
          </div>
        </Card>
      </div>
    )
  }

  // Live tracking card
  return (
    <div className="fixed bottom-20 sm:bottom-24 left-3 right-3 sm:left-auto sm:right-4 sm:w-64 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <Card
        className={`border shadow-lg backdrop-blur-lg transition-all duration-200 ${
          isTie
            ? "bg-gradient-to-br from-amber-50/95 to-orange-50/95 border-amber-500"
            : isWinning
            ? "bg-gradient-to-br from-green-50/95 to-emerald-50/95 border-green-500"
            : "bg-gradient-to-br from-red-50/95 to-rose-50/95 border-red-500"
        }`}
      >
        <div className="p-2 sm:p-2.5">
          {/* Header */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1">
              <div className={`p-0.5 rounded ${activeTrade.prediction_type === "up" ? "bg-green-500" : "bg-red-500"}`}>
                {activeTrade.prediction_type === "up" ? (
                  <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
                )}
              </div>
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-slate-800 leading-tight">
                  {activeTrade.crypto_pair}
                </p>
                <p className="text-[8px] sm:text-[9px] text-slate-600 leading-tight">
                  ${activeTrade.amount.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-900 text-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded">
              <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span className="font-mono text-[10px] sm:text-[11px] font-bold tabular-nums">
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>

          {/* Live P/L */}
          <div
            className={`rounded p-2 sm:p-2.5 mb-1.5 ${
              isTie
                ? "bg-gradient-to-r from-amber-500 to-orange-600"
                : isWinning 
                ? "bg-gradient-to-r from-green-500 to-emerald-600" 
                : "bg-gradient-to-r from-red-500 to-rose-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] sm:text-[9px] text-white/70 uppercase font-semibold mb-0.5">
                  {isTie ? "No Movement" : "Live P/L"}
                </p>
                <span className="text-lg sm:text-xl font-black text-white tabular-nums">
                  {isTie ? "$0.00" : `${currentPL > 0 ? "+" : ""}$${Math.abs(currentPL).toFixed(2)}`}
                </span>
              </div>
              <div className="p-1 sm:p-1.5 rounded bg-white/20">
                {isTie ? (
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                ) : isWinning ? (
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                ) : (
                  <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                )}
              </div>
            </div>
          </div>

          {/* Price Info */}
          <div className="grid grid-cols-2 gap-1">
            <div className="bg-white/50 rounded p-1 sm:p-1.5">
              <p className="text-[7px] sm:text-[8px] text-slate-500 uppercase font-semibold">Entry</p>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-800 tabular-nums">
                {activeTrade.entry_price.toFixed(pricePrecision)}
              </p>
            </div>
            <div className="bg-white/50 rounded p-1 sm:p-1.5">
              <p className="text-[7px] sm:text-[8px] text-slate-500 uppercase font-semibold">Now</p>
              <p
                className={`text-[10px] sm:text-[11px] font-bold tabular-nums ${
                  isTie ? "text-amber-600" : isWinning ? "text-green-600" : "text-red-600"
                }`}
              >
                {currentPrice.toFixed(pricePrecision)}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
