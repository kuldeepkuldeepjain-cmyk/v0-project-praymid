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
        if (res.isRefund) {
          setResultType("refunded")
          setResultPL(0)
          setResultWin(false)
        } else if (res.isWin) {
          setResultType("won")
          setResultPL(res.payout - normalizedTrade.amount)
          setResultWin(true)
        } else {
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
    const bgColor = resultType === "refunded" ? "bg-amber-500 border-amber-400"
      : resultType === "won" ? "bg-green-500 border-green-400"
      : "bg-red-500 border-red-400"

    const Icon = resultType === "refunded" ? RefreshCw
      : resultType === "won" ? CheckCircle
      : XCircle

    return (
      <div className="fixed bottom-20 sm:bottom-6 right-3 sm:right-4 w-[calc(100%-24px)] sm:w-72 z-50">
        <Card className={`border-2 shadow-2xl ${bgColor}`}>
          <div className="p-4 text-white">
            {isSettling ? (
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-semibold">Settling trade...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-full bg-white/20">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-white/70 uppercase tracking-widest font-semibold">
                      {resultType === "refunded" ? "Trade Refunded" : resultType === "won" ? "Trade Won!" : "Trade Lost"}
                    </p>
                    <p className="text-2xl font-black tabular-nums leading-tight">
                      {resultType === "refunded"
                        ? `$${formatRupees(normalizedTrade.amount)} back`
                        : resultType === "won"
                        ? `+$${formatRupees(Math.abs(resultPL))}`
                        : `-$${formatRupees(Math.abs(resultPL))}`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div className="bg-white/10 rounded-lg p-1.5">
                    <p className="text-[9px] text-white/60 uppercase">Pair</p>
                    <p className="text-[11px] font-bold">{normalizedTrade.crypto_pair}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-1.5">
                    <p className="text-[9px] text-white/60 uppercase">Direction</p>
                    <p className="text-[11px] font-bold">{normalizedTrade.prediction_type.toUpperCase()}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-1.5">
                    <p className="text-[9px] text-white/60 uppercase">Stake</p>
                    <p className="text-[11px] font-bold">${formatRupees(normalizedTrade.amount)}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPhase("hidden")
                    settlingRef.current = false
                    onTradeSettled()
                  }}
                  className="w-full py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-bold transition-colors"
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
  return (
    <div className="fixed bottom-20 sm:bottom-6 right-3 sm:right-4 w-[calc(100%-24px)] sm:w-72 z-50">
      <Card className={`border shadow-xl ${
        isTie ? "bg-amber-50 border-amber-400"
        : isWinning ? "bg-green-50 border-green-400"
        : "bg-red-50 border-red-400"
      }`}>
        <div className="p-3">
          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`p-1 rounded ${normalizedTrade.prediction_type === "up" ? "bg-green-500" : "bg-red-500"}`}>
                {normalizedTrade.prediction_type === "up"
                  ? <TrendingUp className="h-3 w-3 text-white" />
                  : <TrendingDown className="h-3 w-3 text-white" />
                }
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{normalizedTrade.crypto_pair}</p>
                <p className="text-[9px] text-slate-500">${formatRupees(normalizedTrade.amount)} stake</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-900 text-white px-2 py-1 rounded-lg">
              <Clock className="h-3 w-3" />
              <span className="font-mono text-xs font-bold tabular-nums">{formatTime(timeRemaining)}</span>
            </div>
          </div>

          {/* P/L bar */}
          <div className={`rounded-lg p-2.5 mb-2 ${
            isTie ? "bg-amber-500" : isWinning ? "bg-green-500" : "bg-red-500"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] text-white/70 uppercase font-semibold">
                  {isTie ? "Flat Market" : "Live P/L"}
                </p>
                <p className="text-xl font-black text-white tabular-nums">
                  {isTie ? "$0.00" : `${currentPL >= 0 ? "+" : ""}$${formatRupees(Math.abs(currentPL))}`}
                </p>
              </div>
              <div className="p-1.5 rounded-lg bg-white/20">
                {isTie ? <Clock className="h-5 w-5 text-white" />
                  : isWinning ? <TrendingUp className="h-5 w-5 text-white" />
                  : <TrendingDown className="h-5 w-5 text-white" />
                }
              </div>
            </div>
          </div>

          {/* Entry / Current prices */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-white/60 rounded-lg p-2">
              <p className="text-[8px] text-slate-500 uppercase font-semibold">Entry</p>
              <p className="text-[11px] font-bold text-slate-800 tabular-nums">
                {normalizedTrade.entry_price.toFixed(pricePrecision)}
              </p>
            </div>
            <div className="bg-white/60 rounded-lg p-2">
              <p className="text-[8px] text-slate-500 uppercase font-semibold">Current</p>
              <p className={`text-[11px] font-bold tabular-nums ${
                isTie ? "text-amber-600" : isWinning ? "text-green-600" : "text-red-600"
              }`}>
                {currentPrice.toFixed(pricePrecision)}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
