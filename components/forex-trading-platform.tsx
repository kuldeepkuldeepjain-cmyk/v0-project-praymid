"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import {
  TrendingUp, TrendingDown, RefreshCw, BarChart2, AlertTriangle,
  CheckCircle2, History, Layers, Activity, Zap, Target, ShieldAlert,
  CandlestickChart, Wallet, Edit3, X, Plus, Clock, Info, Bell,
  ChevronDown, ChevronUp, ArrowUpDown, Award, Flame, TrendingUp as TUp,
  BarChart, LineChart, PieChart, Trophy, AlarmClock, Globe2, Newspaper,
  Gauge, Lock, Unlock, BookOpen, Filter,
} from "lucide-react"
import { TradingChart } from "@/components/trading-chart"
import { participantFetch } from "@/lib/auth"

// ─── Types ────────────────────────────────────────────────────────────────────

export type Candle = {
  time: string; open: number; high: number; low: number; close: number; volume: number; ts?: number
}

type ForexPair = {
  symbol: string; base: string; quote: string
  bid: number; ask: number; change: number; high: number; low: number; open: number
  candles: Candle[]; spread: number
}

type TradeDirection = "BUY" | "SELL"

type OpenTrade = {
  id: string; pair: string; direction: TradeDirection
  lotSize: number; leverage: number
  openPrice: number; currentPrice: number
  sl: number | null; tp: number | null
  trailingStopPips: number | null   // trailing SL in pips (null = off)
  trailingPeak: number              // highest favourable price seen (for trail calc)
  openTime: string; openTimestamp: number
  pnl: number; pips: number; margin: number; returnOnMargin: number
  swap: number                      // accumulated overnight swap in USD
}

type PendingOrder = {
  id: string; pair: string; direction: TradeDirection
  orderType: "BUY_LIMIT" | "BUY_STOP" | "SELL_LIMIT" | "SELL_STOP"
  lotSize: number; leverage: number
  targetPrice: number; sl: number | null; tp: number | null
  createdTime: string
  expiry: "GTC" | "TODAY"           // Good Till Cancel or expire end of day
}

type ClosedTrade = OpenTrade & {
  closePrice: number; closeTime: string; closeDuration: string
  finalPnl: number; finalPips: number; finalSwap: number
  closeReason: "manual" | "sl" | "tp" | "trailing_sl"
}

type TimeFrame = "1M" | "5M" | "15M" | "1H" | "4H" | "1D"
type AssetCategory = "Forex" | "Commodities" | "Crypto"

type ToastItem = { id: number; type: "success" | "error" | "info" | "warning"; text: string }

type ModifyTarget = { tradeId: string; sl: string; tp: string; trailingPips: string } | null

type TradeConfirm = {
  pair: string
  direction: TradeDirection
  lotSize: number
  leverage: number
  price: number
  margin: number
  sl: number | null
  tp: number | null
  trailingPips: number | null
  pipVal: number
  liqPrice: number
  isPending: boolean
  pendingOrderType?: PendingOrder["orderType"]
  pendingPrice?: number
  pendingExpiry?: "GTC" | "TODAY"
} | null

type PositionSizerState = {
  riskPct: string; slPips: string; calculatedLots: number | null
}

type PriceAlertItem = {
  id: string; pair: string; price: number; condition: "above" | "below"
  label: string; triggered: boolean; createdAt: number
}

type TradingSession = { name: string; open: number; close: number; tz: string; color: string }

// Performance stats derived from closed trades
type PerfStats = {
  totalPnl: number; winRate: number; profitFactor: number
  avgWin: number; avgLoss: number; bestTrade: number; worstTrade: number
  totalTrades: number; winCount: number; lossCount: number
  maxDrawdown: number; sharpe: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAIRS_CONFIG: { base: string; quote: string; symbol: string; category: AssetCategory }[] = [
  { base: "EUR", quote: "USD", symbol: "EUR/USD", category: "Forex" },
  { base: "GBP", quote: "USD", symbol: "GBP/USD", category: "Forex" },
  { base: "USD", quote: "JPY", symbol: "USD/JPY", category: "Forex" },
  { base: "USD", quote: "CHF", symbol: "USD/CHF", category: "Forex" },
  { base: "AUD", quote: "USD", symbol: "AUD/USD", category: "Forex" },
  { base: "USD", quote: "CAD", symbol: "USD/CAD", category: "Forex" },
  { base: "NZD", quote: "USD", symbol: "NZD/USD", category: "Forex" },
  { base: "EUR", quote: "GBP", symbol: "EUR/GBP", category: "Forex" },
  { base: "XAU", quote: "USD", symbol: "XAU/USD", category: "Commodities" },
  { base: "XAG", quote: "USD", symbol: "XAG/USD", category: "Commodities" },
  { base: "BTC", quote: "USD", symbol: "BTC/USD", category: "Crypto" },
  { base: "ETH", quote: "USD", symbol: "ETH/USD", category: "Crypto" },
  { base: "BNB", quote: "USD", symbol: "BNB/USD", category: "Crypto" },
  { base: "SOL", quote: "USD", symbol: "SOL/USD", category: "Crypto" },
  { base: "XRP", quote: "USD", symbol: "XRP/USD", category: "Crypto" },
  { base: "ADA", quote: "USD", symbol: "ADA/USD", category: "Crypto" },
]

const TYPICAL_SPREADS: Record<string, number> = {
  "EUR/USD": 0.00012, "GBP/USD": 0.00018, "USD/JPY": 0.012,
  "USD/CHF": 0.00018, "AUD/USD": 0.00018, "USD/CAD": 0.00018,
  "NZD/USD": 0.00022, "EUR/GBP": 0.00020,
  "XAU/USD": 0.35, "XAG/USD": 0.025,
  "BTC/USD": 8.0, "ETH/USD": 2.0, "BNB/USD": 0.40,
  "SOL/USD": 0.12, "XRP/USD": 0.0008, "ADA/USD": 0.0004,
}

// Overnight swap rates per lot per day in USD (Long/Short)
// Based on real broker approximate values
const SWAP_RATES: Record<string, [number, number]> = {
  "EUR/USD": [-5.80, 0.60],  "GBP/USD": [-4.20, 0.20],
  "USD/JPY": [1.20, -3.40],  "USD/CHF": [0.80, -2.80],
  "AUD/USD": [-2.60, -0.40], "USD/CAD": [0.60, -2.90],
  "NZD/USD": [-1.80, -0.60], "EUR/GBP": [-4.10, 0.50],
  "XAU/USD": [-10.50, -3.50],"XAG/USD": [-2.80, -1.20],
  "BTC/USD": [-25.0, -25.0], "ETH/USD": [-8.0, -8.0],
  "BNB/USD": [-5.0, -5.0],   "SOL/USD": [-3.0, -3.0],
  "XRP/USD": [-1.5, -1.5],   "ADA/USD": [-1.2, -1.2],
}

const CATEGORY_COLOR: Record<AssetCategory, { bg: string; text: string; border: string }> = {
  Forex:       { bg: "rgba(34,211,238,0.1)",  text: "#22d3ee", border: "rgba(34,211,238,0.25)" },
  Commodities: { bg: "rgba(251,191,36,0.1)",  text: "#fbbf24", border: "rgba(251,191,36,0.25)" },
  Crypto:      { bg: "rgba(167,139,250,0.1)", text: "#a78bfa", border: "rgba(167,139,250,0.25)" },
}

const ASSET_ICON: Record<string, string> = {
  "XAU/USD": "Au", "XAG/USD": "Ag",
  "BTC/USD": "₿", "ETH/USD": "Ξ",
  "BNB/USD": "BNB", "SOL/USD": "◎",
  "XRP/USD": "✕", "ADA/USD": "₳",
}

// Full names for display
const FULL_NAMES: Record<string, string> = {
  "EUR/USD": "Euro / US Dollar", "GBP/USD": "British Pound", "USD/JPY": "US Dollar / Yen",
  "USD/CHF": "Swiss Franc", "AUD/USD": "Australian Dollar", "USD/CAD": "Canadian Dollar",
  "NZD/USD": "New Zealand Dollar", "EUR/GBP": "Euro / Pound",
  "XAU/USD": "Gold Spot", "XAG/USD": "Silver Spot",
  "BTC/USD": "Bitcoin", "ETH/USD": "Ethereum", "BNB/USD": "BNB Chain",
  "SOL/USD": "Solana", "XRP/USD": "Ripple XRP", "ADA/USD": "Cardano",
}

// ─── Instrument helpers ───────────────────────────────────────────────────────

function isJpy(sym: string): boolean { return sym.includes("JPY") }
function isCrypto(sym: string): boolean { return ["BTC","ETH","BNB","SOL","XRP","ADA"].some(c => sym.startsWith(c)) }
function isGold(sym: string): boolean { return sym.startsWith("XAU") }
function isSilver(sym: string): boolean { return sym.startsWith("XAG") }
function isCommodity(sym: string): boolean { return isGold(sym) || isSilver(sym) }

function decimals(sym: string): number {
  if (isGold(sym)) return 2; if (isSilver(sym)) return 3
  if (sym.startsWith("BTC")) return 1; if (sym.startsWith("ETH")) return 2
  if (sym.startsWith("BNB")) return 2; if (sym.startsWith("SOL")) return 3
  if (sym.startsWith("XRP") || sym.startsWith("ADA")) return 4
  return isJpy(sym) ? 3 : 5
}

function fmt(price: number | null | undefined, sym: string): string {
  if (price == null || !isFinite(price)) return "—"
  return price.toFixed(decimals(sym))
}

// Contract sizes — standard lot
function contractSize(sym: string): number {
  if (isGold(sym)) return 100        // 100 troy oz
  if (isSilver(sym)) return 5000     // 5000 troy oz
  if (sym.startsWith("BTC")) return 1
  if (sym.startsWith("ETH")) return 10
  if (sym.startsWith("BNB")) return 100
  if (sym.startsWith("SOL")) return 100
  if (sym.startsWith("XRP")) return 10000
  if (sym.startsWith("ADA")) return 10000
  return 100000                       // standard forex lot
}

// Pip size — smallest meaningful price move
function pip(sym: string): number {
  if (isGold(sym)) return 0.01
  if (isSilver(sym)) return 0.001
  if (sym.startsWith("BTC")) return 1.0
  if (sym.startsWith("ETH")) return 0.1
  if (sym.startsWith("BNB")) return 0.01
  if (sym.startsWith("SOL")) return 0.001
  if (sym.startsWith("XRP") || sym.startsWith("ADA")) return 0.0001
  return isJpy(sym) ? 0.01 : 0.0001
}

// ─── P&L Calculation (industry-accurate) ─────────────────────────────────────
//
// For a standard forex pair where USD is the QUOTE currency (e.g. EUR/USD):
//   Pip Value  = lotSize × contractSize × pipSize            (already in USD)
//
// For pairs where USD is the BASE currency (e.g. USD/JPY, USD/CHF, USD/CAD):
//   Pip Value  = (lotSize × contractSize × pipSize) / currentPrice
//
// For cross-pairs (e.g. EUR/GBP) the pip value must be converted at the
// GBP/USD rate. We approximate by using the inverse quote cross price.
//
// For Gold (XAU/USD):
//   Pip Value  = lotSize × contractSize × pipSize            (= lots × 100 × 0.01 = lots)
//
// For Crypto (priced in USD):
//   Same as USD-quote formula: pipVal = lots × contractSize × pipSize
//
// P&L = (currentPrice - openPrice) × direction × lots × contractSize  (for USD-quote)
// P&L = (currentPrice - openPrice) × direction × lots × contractSize / currentPrice  (for USD-base)

function pipValue(sym: string, lots: number, currentPrice: number): number {
  const cs   = contractSize(sym)
  const ps   = pip(sym)
  const base = sym.split("/")[0]

  // USD-base pairs: pip value in USD = (lot × cs × ps) / currentPrice
  if (base === "USD") {
    return (lots * cs * ps) / currentPrice
  }
  // All others (USD as quote, or commodity/crypto priced in USD)
  return lots * cs * ps
}

function calcPnl(trade: { direction: TradeDirection; openPrice: number; lotSize: number }, currentPrice: number, sym: string): {
  pnl: number; pipCount: number; returnOnMargin: number; margin: number
} {
  const dir     = trade.direction === "BUY" ? 1 : -1
  const priceDiff = (currentPrice - trade.openPrice) * dir
  const ps      = pip(sym)
  const pipCount = priceDiff / ps

  // Use currentPrice for pip value so it stays accurate as price moves
  const pv     = pipValue(sym, trade.lotSize, currentPrice)
  const pnl    = parseFloat((pipCount * pv).toFixed(2))

  // Margin recalculated using real formula (needed for returnOnMargin)
  const cs     = contractSize(sym)
  const base   = sym.split("/")[0]
  // For USD-base pairs the notional is in the base (USD), not quote
  const notional = base === "USD"
    ? trade.lotSize * cs                      // already in USD
    : trade.lotSize * cs * trade.openPrice    // convert to USD
  const margin = notional / (trade as any).leverage   // stored leverage

  const returnOnMargin = margin > 0 ? parseFloat(((pnl / margin) * 100).toFixed(2)) : 0
  return { pnl, pipCount: parseFloat(pipCount.toFixed(1)), returnOnMargin, margin }
}

function calcMargin(sym: string, lots: number, price: number, leverage: number): number {
  const cs   = contractSize(sym)
  const base = sym.split("/")[0]
  const notional = base === "USD"
    ? lots * cs           // USD-base: contract size is already in USD units
    : lots * cs * price   // USD-quote: multiply by price to get USD
  return parseFloat((notional / leverage).toFixed(2))
}

function calcLiquidationPrice(sym: string, trade: OpenTrade): number {
  // Liq price = entry ± (margin / (lots × contractSize)) depending on direction
  // This is a simplified model (ignores multi-position netting)
  const cs     = contractSize(sym)
  const dir    = trade.direction === "BUY" ? -1 : 1
  const liqMove = trade.margin / (trade.lotSize * cs)
  // For USD-base we need to convert differently, but liqMove approximation is fine
  return parseFloat((trade.openPrice + dir * liqMove).toFixed(decimals(sym)))
}

// ATR (Average True Range) — used for position sizing suggestions
function calcATR(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0
  const trs: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1]
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)))
  }
  // Simple average of last `period` TRs
  const recent = trs.slice(-period)
  return recent.reduce((a, b) => a + b, 0) / recent.length
}

// Duration string from timestamp to now
function formatDuration(openTimestamp: number): string {
  const ms = Date.now() - openTimestamp
  const s  = Math.floor(ms / 1000)
  if (s < 60)   return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60)   return `${m}m ${s % 60}s`
  const h = Math.floor(m / 60)
  if (h < 24)   return `${h}h ${m % 60}m`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}

function genId(): string { return Math.random().toString(36).slice(2, 10) }

// ─── Performance Statistics ───────────────────────────────────────────────────
function calcPerfStats(closed: ClosedTrade[]): PerfStats {
  if (closed.length === 0) return {
    totalPnl: 0, winRate: 0, profitFactor: 0, avgWin: 0, avgLoss: 0,
    bestTrade: 0, worstTrade: 0, totalTrades: 0, winCount: 0, lossCount: 0,
    maxDrawdown: 0, sharpe: 0,
  }
  const wins  = closed.filter(t => t.finalPnl > 0)
  const losses = closed.filter(t => t.finalPnl <= 0)
  const totalPnl   = parseFloat(closed.reduce((s, t) => s + t.finalPnl, 0).toFixed(2))
  const grossWin   = wins.reduce((s, t) => s + t.finalPnl, 0)
  const grossLoss  = Math.abs(losses.reduce((s, t) => s + t.finalPnl, 0))
  const winRate    = (wins.length / closed.length) * 100
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999 : 0
  const avgWin     = wins.length  > 0 ? grossWin  / wins.length  : 0
  const avgLoss    = losses.length > 0 ? grossLoss / losses.length : 0
  const bestTrade  = Math.max(...closed.map(t => t.finalPnl))
  const worstTrade = Math.min(...closed.map(t => t.finalPnl))
  // Max drawdown from equity curve
  let peak = 0, maxDD = 0, running = 0
  for (const t of [...closed].reverse()) {
    running += t.finalPnl
    if (running > peak) peak = running
    const dd = peak - running
    if (dd > maxDD) maxDD = dd
  }
  // Simple Sharpe (daily returns approximation)
  const returns = closed.map(t => t.finalPnl)
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const std  = Math.sqrt(returns.reduce((s, v) => s + (v - mean) ** 2, 0) / returns.length)
  const sharpe = std > 0 ? parseFloat((mean / std).toFixed(2)) : 0
  return {
    totalPnl, winRate: parseFloat(winRate.toFixed(1)), profitFactor: parseFloat(profitFactor.toFixed(2)),
    avgWin: parseFloat(avgWin.toFixed(2)), avgLoss: parseFloat(avgLoss.toFixed(2)),
    bestTrade: parseFloat(bestTrade.toFixed(2)), worstTrade: parseFloat(worstTrade.toFixed(2)),
    totalTrades: closed.length, winCount: wins.length, lossCount: losses.length,
    maxDrawdown: parseFloat(maxDD.toFixed(2)), sharpe,
  }
}

// ─── Trading Sessions (UTC hours) ────────────────────────────────────────────
const SESSIONS: TradingSession[] = [
  { name: "Sydney",  open: 21, close: 6,  tz: "AEST", color: "#a78bfa" },
  { name: "Tokyo",   open: 0,  close: 9,  tz: "JST",  color: "#f59e0b" },
  { name: "London",  open: 7,  close: 16, tz: "GMT",  color: "#22d3ee" },
  { name: "New York",open: 12, close: 21, tz: "EST",  color: "#10b981" },
]

function isSessionOpen(s: TradingSession, utcH: number): boolean {
  if (s.open < s.close) return utcH >= s.open && utcH < s.close
  return utcH >= s.open || utcH < s.close // crosses midnight
}

// ─── Performance Dashboard ───────────────────────────────────────────────────

function PerformanceDashboard({ closed, equityHistory, walletBalance }: {
  closed: ClosedTrade[]; equityHistory: number[]; walletBalance: number
}) {
  const stats = useMemo(() => calcPerfStats(closed), [closed])

  // Mini equity SVG path
  const eqPath = useMemo(() => {
    if (equityHistory.length < 2) return ""
    const min = Math.min(...equityHistory); const max = Math.max(...equityHistory)
    const range = max - min || 1; const w = 260; const h = 56
    return equityHistory.map((v, i) => {
      const x = (i / (equityHistory.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(" ")
  }, [equityHistory])

  // Last 10 trades sparkbar
  const recent = closed.slice(0, 10).reverse()

  // Pair breakdown
  const pairMap: Record<string, { pnl: number; count: number }> = {}
  closed.forEach(t => {
    if (!pairMap[t.pair]) pairMap[t.pair] = { pnl: 0, count: 0 }
    pairMap[t.pair].pnl  += t.finalPnl
    pairMap[t.pair].count += 1
  })
  const topPairs = Object.entries(pairMap)
    .sort((a, b) => Math.abs(b[1].pnl) - Math.abs(a[1].pnl))
    .slice(0, 5)

  if (closed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
        <Trophy className="h-10 w-10" style={{ color: "#1e2d45" }} />
        <p className="text-[11px] font-bold tracking-wider uppercase" style={{ color: "#2d4565" }}>No trade history yet</p>
        <p className="text-[10px] text-center" style={{ color: "#1e2d45" }}>Place and close trades to see your performance analytics</p>
      </div>
    )
  }

  return (
    <div className="p-2 flex flex-col gap-2 overflow-y-auto terminal-scroll" style={{ maxHeight: "100%" }}>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "Total P&L",      value: `${stats.totalPnl >= 0 ? "+" : ""}$${stats.totalPnl.toFixed(2)}`, color: stats.totalPnl >= 0 ? "#10b981" : "#ef4444", icon: <TrendingUp className="h-3.5 w-3.5" /> },
          { label: "Win Rate",       value: `${stats.winRate.toFixed(1)}%`, color: stats.winRate >= 55 ? "#10b981" : stats.winRate >= 45 ? "#f59e0b" : "#ef4444", icon: <Award className="h-3.5 w-3.5" /> },
          { label: "Profit Factor",  value: stats.profitFactor >= 999 ? "∞" : stats.profitFactor.toFixed(2), color: stats.profitFactor >= 1.5 ? "#10b981" : stats.profitFactor >= 1 ? "#f59e0b" : "#ef4444", icon: <Gauge className="h-3.5 w-3.5" /> },
          { label: "Total Trades",   value: String(stats.totalTrades), color: "#a78bfa", icon: <BarChart className="h-3.5 w-3.5" /> },
          { label: "Avg Win",        value: `+$${stats.avgWin.toFixed(2)}`, color: "#10b981", icon: <TrendingUp className="h-3.5 w-3.5" /> },
          { label: "Avg Loss",       value: `-$${stats.avgLoss.toFixed(2)}`, color: "#ef4444", icon: <TrendingDown className="h-3.5 w-3.5" /> },
          { label: "Best Trade",     value: `+$${stats.bestTrade.toFixed(2)}`, color: "#22d3ee", icon: <Trophy className="h-3.5 w-3.5" /> },
          { label: "Worst Trade",    value: `$${stats.worstTrade.toFixed(2)}`, color: "#ef4444", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
          { label: "Max Drawdown",   value: `-$${stats.maxDrawdown.toFixed(2)}`, color: "#fb923c", icon: <TrendingDown className="h-3.5 w-3.5" /> },
        ].map(item => (
          <div key={item.label} className="px-2.5 py-2 rounded-xl" style={{ background: "#0a1120", border: "1px solid #1a2640" }}>
            <div className="flex items-center gap-1 mb-1" style={{ color: item.color }}>
              {item.icon}
              <span className="text-[7px] font-black tracking-[0.15em] uppercase" style={{ color: "#374151" }}>{item.label}</span>
            </div>
            <p className="price-mono text-[12px] font-black leading-none" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Equity Curve */}
      {eqPath && (
        <div className="rounded-xl px-3 py-2.5" style={{ background: "#0a1120", border: "1px solid #1a2640" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <LineChart className="h-3 w-3 text-cyan-400" />
              <span className="text-[9px] font-black tracking-[0.15em] uppercase text-slate-500">Equity Curve</span>
            </div>
            <span className="price-mono text-[10px] font-black text-emerald-400">${walletBalance.toFixed(2)}</span>
          </div>
          <svg width="100%" height="56" viewBox="0 0 260 56" preserveAspectRatio="none" className="w-full">
            <defs>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stats.totalPnl >= 0 ? "#10b981" : "#ef4444"} stopOpacity="0.25" />
                <stop offset="100%" stopColor={stats.totalPnl >= 0 ? "#10b981" : "#ef4444"} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${eqPath} V56 H0 Z`} fill="url(#eqGrad)" />
            <path d={eqPath} stroke={stats.totalPnl >= 0 ? "#10b981" : "#ef4444"} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Recent Trades Sparkbar */}
      {recent.length > 0 && (
        <div className="rounded-xl px-3 py-2.5" style={{ background: "#0a1120", border: "1px solid #1a2640" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Flame className="h-3 w-3 text-amber-400" />
            <span className="text-[9px] font-black tracking-[0.15em] uppercase text-slate-500">Last {recent.length} Trades</span>
            <span className="ml-auto text-[9px] text-slate-600">{stats.winCount}W / {stats.lossCount}L</span>
          </div>
          <div className="flex gap-1 items-end h-8">
            {recent.map((t, i) => {
              const isWin = t.finalPnl > 0
              const maxAbs = Math.max(...recent.map(r => Math.abs(r.finalPnl)), 1)
              const h = Math.max(4, Math.abs(t.finalPnl) / maxAbs * 28)
              return (
                <div key={t.id} className="flex-1 rounded-sm relative group cursor-default"
                  style={{ height: h, background: isWin ? "#059669" : "#dc2626", minWidth: 8 }}>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 rounded text-[8px] font-bold price-mono whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity"
                    style={{ background: "#0d1625", border: "1px solid #1e2d45", color: isWin ? "#10b981" : "#ef4444" }}>
                    {t.finalPnl >= 0 ? "+" : ""}${t.finalPnl.toFixed(2)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top Pairs */}
      {topPairs.length > 0 && (
        <div className="rounded-xl px-3 py-2.5" style={{ background: "#0a1120", border: "1px solid #1a2640" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <PieChart className="h-3 w-3 text-violet-400" />
            <span className="text-[9px] font-black tracking-[0.15em] uppercase text-slate-500">Top Instruments</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {topPairs.map(([pair, data]) => {
              const isPos = data.pnl >= 0
              const maxPnl = Math.max(...topPairs.map(([,d]) => Math.abs(d.pnl)), 1)
              const barW = (Math.abs(data.pnl) / maxPnl) * 100
              return (
                <div key={pair} className="flex items-center gap-2">
                  <span className="price-mono text-[10px] font-black text-white w-16 shrink-0">{pair}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#111827" }}>
                    <div className="h-full rounded-full" style={{ width: `${barW}%`, background: isPos ? "#059669" : "#dc2626" }} />
                  </div>
                  <span className="price-mono text-[10px] font-black w-16 text-right shrink-0" style={{ color: isPos ? "#10b981" : "#ef4444" }}>
                    {isPos ? "+" : ""}${data.pnl.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-slate-600 w-6 text-right shrink-0">{data.count}t</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Market Sessions Panel ────────────────────────────────────────────────────

function MarketSessionsPanel() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const utcH = now.getUTCHours()
  const utcM = now.getUTCMinutes()
  const utcFrac = utcH + utcM / 60

  // Forex market news items (static — would be API-driven in production)
  const newsItems = [
    { time: "08:30", title: "US Non-Farm Payrolls", impact: "high", currency: "USD" },
    { time: "10:00", title: "EUR CPI Flash Estimate", impact: "high", currency: "EUR" },
    { time: "12:30", title: "BoE Interest Rate Decision", impact: "high", currency: "GBP" },
    { time: "14:00", title: "US ISM Manufacturing PMI", impact: "med",  currency: "USD" },
    { time: "19:30", title: "FOMC Meeting Minutes",   impact: "high", currency: "USD" },
    { time: "23:50", title: "Japan Trade Balance",     impact: "low",  currency: "JPY" },
  ]

  const impactColor = { high: "#ef4444", med: "#f59e0b", low: "#10b981" }

  return (
    <div className="p-2 flex flex-col gap-2 overflow-y-auto terminal-scroll h-full">
      {/* Sessions grid */}
      <div className="rounded-xl px-3 py-2.5" style={{ background: "#0a1120", border: "1px solid #1a2640" }}>
        <div className="flex items-center gap-1.5 mb-3">
          <Globe2 className="h-3 w-3 text-cyan-400" />
          <span className="text-[9px] font-black tracking-[0.15em] uppercase text-slate-500">Market Sessions</span>
          <span className="ml-auto price-mono text-[9px] text-slate-600">
            {String(now.getUTCHours()).padStart(2,"0")}:{String(now.getUTCMinutes()).padStart(2,"0")} UTC
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {SESSIONS.map(s => {
            const open = isSessionOpen(s, utcH)
            // Progress through session
            let prog = 0
            if (open) {
              const dur = s.open < s.close ? s.close - s.open : (24 - s.open) + s.close
              const elapsed = s.open < s.close
                ? utcFrac - s.open
                : utcFrac >= s.open ? utcFrac - s.open : (24 - s.open) + utcFrac
              prog = Math.min(100, (elapsed / dur) * 100)
            }
            return (
              <div key={s.name} className="rounded-lg px-2.5 py-2" style={{
                background: open ? `${s.color}10` : "#070a10",
                border: `1px solid ${open ? s.color + "35" : "#1a2640"}`,
              }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black" style={{ color: open ? s.color : "#374151" }}>{s.name}</span>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded"
                    style={{ background: open ? `${s.color}20` : "#111827", color: open ? s.color : "#374151" }}>
                    {open ? "OPEN" : "CLOSED"}
                  </span>
                </div>
                <div className="text-[8px] text-slate-600 mb-1.5">{s.tz} · {String(s.open).padStart(2,"0")}:00–{String(s.close).padStart(2,"0")}:00 UTC</div>
                {open && (
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "#111827" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${prog}%`, background: s.color }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Economic Calendar */}
      <div className="rounded-xl px-3 py-2.5" style={{ background: "#0a1120", border: "1px solid #1a2640" }}>
        <div className="flex items-center gap-1.5 mb-2">
          <Newspaper className="h-3 w-3 text-amber-400" />
          <span className="text-[9px] font-black tracking-[0.15em] uppercase text-slate-500">Economic Calendar</span>
          <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>TODAY</span>
        </div>
        <div className="flex flex-col gap-1">
          {newsItems.map((n, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #111827" }}>
              <span className="price-mono text-[9px] font-bold text-slate-600 w-8 shrink-0">{n.time}</span>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: impactColor[n.impact as keyof typeof impactColor] }} />
              <span className="text-[9px] text-slate-400 flex-1 truncate">{n.title}</span>
              <span className="text-[8px] font-black px-1 py-0.5 rounded shrink-0" style={{ background: "rgba(255,255,255,0.04)", color: "#64748b" }}>{n.currency}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sentiment indicators */}
      <div className="rounded-xl px-3 py-2.5" style={{ background: "#0a1120", border: "1px solid #1a2640" }}>
        <div className="flex items-center gap-1.5 mb-2">
          <Gauge className="h-3 w-3 text-violet-400" />
          <span className="text-[9px] font-black tracking-[0.15em] uppercase text-slate-500">Market Sentiment</span>
        </div>
        {[
          { pair: "EUR/USD", long: 58, short: 42 },
          { pair: "GBP/USD", long: 44, short: 56 },
          { pair: "XAU/USD", long: 71, short: 29 },
          { pair: "BTC/USD", long: 63, short: 37 },
        ].map(s => (
          <div key={s.pair} className="mb-2 last:mb-0">
            <div className="flex justify-between mb-0.5">
              <span className="price-mono text-[9px] font-bold text-slate-400">{s.pair}</span>
              <div className="flex gap-2">
                <span className="text-[9px] font-black text-emerald-400">{s.long}% L</span>
                <span className="text-[9px] font-black text-red-400">{s.short}% S</span>
              </div>
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden">
              <div className="h-full" style={{ width: `${s.long}%`, background: "#059669" }} />
              <div className="h-full flex-1" style={{ background: "#dc2626" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Price Alert Panel ────────────────────────────────────────────────────────

function PriceAlertPanel({ alerts, pairs, onAdd, onRemove }: {
  alerts: PriceAlertItem[]
  pairs: ForexPair[]
  onAdd: (pair: string, price: number, condition: "above" | "below", label: string) => void
  onRemove: (id: string) => void
}) {
  const [alertPair, setAlertPair] = useState(pairs[0]?.symbol ?? "EUR/USD")
  const [alertPrice, setAlertPrice] = useState("")
  const [alertCondition, setAlertCondition] = useState<"above" | "below">("above")
  const [alertLabel, setAlertLabel] = useState("")

  const selPair = pairs.find(p => p.symbol === alertPair)
  const mid = selPair ? (selPair.bid + selPair.ask) / 2 : 0

  return (
    <div className="p-2 flex flex-col gap-2 h-full overflow-y-auto terminal-scroll">
      {/* Add alert form */}
      <div className="rounded-xl px-3 py-2.5" style={{ background: "#0a1120", border: "1px solid #1a2640" }}>
        <div className="flex items-center gap-1.5 mb-2.5">
          <AlarmClock className="h-3 w-3 text-amber-400" />
          <span className="text-[9px] font-black tracking-[0.15em] uppercase text-slate-500">New Price Alert</span>
        </div>
        <div className="flex flex-col gap-2">
          <div>
            <label className="text-[8px] font-black tracking-widest uppercase text-slate-600 block mb-1">Instrument</label>
            <select value={alertPair} onChange={e => setAlertPair(e.target.value)}
              className="w-full price-mono text-xs font-black text-white focus:outline-none px-2 py-1.5 rounded-lg"
              style={{ background: "#070a10", border: "1px solid #1e2d45" }}>
              {pairs.map(p => <option key={p.symbol} value={p.symbol}>{p.symbol}</option>)}
            </select>
          </div>
          <div className="flex gap-1">
            {(["above","below"] as const).map(c => (
              <button key={c} onClick={() => setAlertCondition(c)}
                className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                style={alertCondition === c
                  ? { background: c === "above" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: c === "above" ? "#10b981" : "#ef4444", border: `1px solid ${c === "above" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}` }
                  : { background: "#070a10", color: "#374151", border: "1px solid #1a2640" }}>
                {c === "above" ? "Above" : "Below"}
              </button>
            ))}
          </div>
          <div>
            <label className="text-[8px] font-black tracking-widest uppercase text-slate-600 block mb-1">
              Target Price {mid > 0 && <span className="text-slate-700 normal-case tracking-normal font-normal">(current: {fmt(mid, alertPair)})</span>}
            </label>
            <input type="number" value={alertPrice} onChange={e => setAlertPrice(e.target.value)}
              placeholder={mid > 0 ? fmt(mid, alertPair) : "0.00000"}
              className="w-full price-mono text-sm font-black text-white focus:outline-none px-2 py-1.5 rounded-lg"
              style={{ background: "#070a10", border: "1px solid #1e2d45" }} />
          </div>
          <div>
            <label className="text-[8px] font-black tracking-widest uppercase text-slate-600 block mb-1">Label (optional)</label>
            <input type="text" value={alertLabel} onChange={e => setAlertLabel(e.target.value)}
              placeholder="e.g. Key resistance"
              className="w-full text-xs text-white focus:outline-none px-2 py-1.5 rounded-lg"
              style={{ background: "#070a10", border: "1px solid #1e2d45" }} />
          </div>
          <button
            onClick={() => {
              const p = parseFloat(alertPrice)
              if (isNaN(p) || p <= 0) return
              onAdd(alertPair, p, alertCondition, alertLabel || `${alertPair} ${alertCondition} ${alertPrice}`)
              setAlertPrice(""); setAlertLabel("")
            }}
            className="w-full py-2 rounded-lg font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
            style={{ background: "linear-gradient(135deg,#1e3a5f,#1d4ed8)", color: "#bfdbfe", border: "1px solid rgba(96,165,250,0.3)" }}>
            <Plus className="h-3 w-3" /> Set Alert
          </button>
        </div>
      </div>

      {/* Alert list */}
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <Bell className="h-8 w-8" style={{ color: "#1e2d45" }} />
          <p className="text-[10px] text-slate-700">No active alerts</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {alerts.map(a => {
            const pair = pairs.find(p => p.symbol === a.pair)
            const mid = pair ? (pair.bid + pair.ask) / 2 : 0
            const dist = mid > 0 ? Math.abs((a.price - mid) / pip(a.pair)) : 0
            return (
              <div key={a.id} className="rounded-xl px-3 py-2.5 flex items-center gap-2"
                style={{ background: a.triggered ? "rgba(16,185,129,0.07)" : "#0a1120", border: `1px solid ${a.triggered ? "rgba(16,185,129,0.25)" : "#1a2640"}` }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="price-mono text-[11px] font-black text-white">{a.pair}</span>
                    <span className="text-[8px] font-black px-1 py-0.5 rounded"
                      style={{ background: a.condition === "above" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: a.condition === "above" ? "#10b981" : "#ef4444" }}>
                      {a.condition}
                    </span>
                    {a.triggered && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="price-mono text-sm font-black text-cyan-400">{fmt(a.price, a.pair)}</span>
                    {dist > 0 && !a.triggered && <span className="text-[9px] text-slate-600">{dist.toFixed(1)}p away</span>}
                  </div>
                  {a.label && <p className="text-[9px] text-slate-600 truncate mt-0.5">{a.label}</p>}
                </div>
                <button onClick={() => onRemove(a.id)} className="p-1 rounded transition-colors text-slate-600 hover:text-red-400">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Order Depth Panel ────────────────────────────────────────────────────────

function OrderDepth({ pair }: { pair: ForexPair }) {
  const levels = useMemo(() => {
    const asks: { price: number; volume: number; total: number }[] = []
    const bids: { price: number; volume: number; total: number }[] = []
    for (let i = 0; i < 8; i++) {
      const ps = pip(pair.symbol)
      const multiplier = 1 + Math.random() * 0.8
      asks.push({ price: parseFloat((pair.ask + ps * i * multiplier).toFixed(decimals(pair.symbol))), volume: Math.floor(100 + Math.random() * 1900), total: 0 })
      bids.push({ price: parseFloat((pair.bid - ps * i * multiplier).toFixed(decimals(pair.symbol))), volume: Math.floor(100 + Math.random() * 1900), total: 0 })
    }
    asks.reverse()
    // Cumulative totals
    let askTotal = 0, bidTotal = 0
    asks.forEach(a => { askTotal += a.volume; a.total = askTotal })
    bids.forEach(b => { bidTotal += b.volume; b.total = bidTotal })
    return { asks, bids, maxTotal: Math.max(askTotal, bidTotal) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair.bid, pair.ask])

  const maxVol = Math.max(...levels.asks.map(a => a.volume), ...levels.bids.map(b => b.volume))

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#0a1120", border: "1px solid #1e2d45" }}>
      {/* Header */}
      <div className="grid px-3 py-1.5" style={{ gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid #1e2d45" }}>
        {["Price", "Size", "Total"].map(h => (
          <span key={h} className="text-[8px] font-black tracking-widest uppercase text-slate-700">{h}</span>
        ))}
      </div>
      {/* Asks (sell side) */}
      {levels.asks.map((a, i) => (
        <div key={i} className="relative grid px-3 py-[3px]" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="absolute inset-y-0 right-0 opacity-15" style={{ width: `${(a.volume / maxVol) * 100}%`, background: "#ef4444" }} />
          <span className="price-mono text-[10px] font-black text-red-400">{fmt(a.price, pair.symbol)}</span>
          <span className="price-mono text-[10px] text-slate-500">{a.volume.toLocaleString()}</span>
          <span className="price-mono text-[10px] text-slate-600">{a.total.toLocaleString()}</span>
        </div>
      ))}
      {/* Spread row */}
      <div className="flex items-center justify-between px-3 py-1.5" style={{ background: "rgba(34,211,238,0.05)", borderTop: "1px solid #1e2d45", borderBottom: "1px solid #1e2d45" }}>
        <span className="price-mono text-xs font-black text-cyan-400">{fmt((pair.bid + pair.ask) / 2, pair.symbol)}</span>
        <span className="text-[9px] font-bold text-slate-600">
          SPREAD {((pair.spread / pip(pair.symbol)) || 0).toFixed(1)}p
          &nbsp;·&nbsp;{(pair.spread).toFixed(decimals(pair.symbol))}
        </span>
      </div>
      {/* Bids (buy side) */}
      {levels.bids.map((b, i) => (
        <div key={i} className="relative grid px-3 py-[3px]" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="absolute inset-y-0 right-0 opacity-15" style={{ width: `${(b.volume / maxVol) * 100}%`, background: "#10b981" }} />
          <span className="price-mono text-[10px] font-black text-emerald-400">{fmt(b.price, pair.symbol)}</span>
          <span className="price-mono text-[10px] text-slate-500">{b.volume.toLocaleString()}</span>
          <span className="price-mono text-[10px] text-slate-600">{b.total.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Modify Trade Modal ───────────────────────────────────────────────────────

function ModifyTradeModal({
  target, trades, pairs, onClose, onSave,
}: {
  target: NonNullable<ModifyTarget>
  trades: OpenTrade[]
  pairs: ForexPair[]
  onClose: () => void
  onSave: (tradeId: string, sl: number | null, tp: number | null, trailingPips: number | null) => void
}) {
  const trade = trades.find(t => t.id === target.tradeId)
  const pair = pairs.find(p => p.symbol === trade?.pair)
  const [sl, setSl] = useState(target.sl)
  const [tp, setTp] = useState(target.tp)
  const [trailingPips, setTrailingPips] = useState(target.trailingPips)
  if (!trade || !pair) return null

  const entryPrice = trade.openPrice
  const slNum = sl ? parseFloat(sl) : null
  const tpNum = tp ? parseFloat(tp) : null

  const slPipsCalc = slNum !== null ? Math.abs((slNum - entryPrice) / pip(trade.pair)) : 0
  const tpPipsCalc = tpNum !== null ? Math.abs((tpNum - entryPrice) / pip(trade.pair)) : 0
  const rrRatio = slPipsCalc > 0 ? (tpPipsCalc / slPipsCalc).toFixed(2) : null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div className="rounded-2xl p-5 w-[340px] max-w-full" style={{ background: "#0d1625", border: "1px solid #1e3a5f", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-cyan-400" />
            <span className="font-black text-white text-sm">Modify Position</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-500 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Trade info */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg mb-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1e2d45" }}>
          <div>
            <span className="font-black text-white">{trade.pair}</span>
            <span className={`ml-2 text-xs font-black px-1.5 py-0.5 rounded`}
              style={{
                background: trade.direction === "BUY" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                color: trade.direction === "BUY" ? "#10b981" : "#ef4444",
              }}>{trade.direction}</span>
          </div>
          <span className="price-mono text-sm font-black" style={{ color: trade.pnl >= 0 ? "#10b981" : "#ef4444" }}>
            {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
          </span>
        </div>

        {/* Entry reference */}
        <div className="flex items-center gap-1.5 mb-3 text-xs">
          <span className="text-slate-600">Entry:</span>
          <span className="price-mono font-black text-slate-300">{fmt(entryPrice, trade.pair)}</span>
          <span className="text-slate-700 mx-1">|</span>
          <span className="text-slate-600">Mark:</span>
          <span className="price-mono font-black" style={{ color: trade.pnl >= 0 ? "#10b981" : "#ef4444" }}>{fmt(trade.currentPrice, trade.pair)}</span>
        </div>

        {/* SL input */}
        <div className="mb-3">
          <label className="text-[9px] font-black tracking-widest uppercase mb-1 flex items-center gap-1" style={{ color: "#ef4444" }}>
            <ShieldAlert className="h-2.5 w-2.5" /> Stop Loss
            {slNum !== null && <span className="ml-auto font-bold text-slate-600 normal-case tracking-normal">{slPipsCalc.toFixed(1)} pips away</span>}
          </label>
          <input type="number" value={sl} onChange={e => setSl(e.target.value)}
            placeholder={fmt(entryPrice * (trade.direction === "BUY" ? 0.999 : 1.001), trade.pair)}
            className="w-full price-mono text-sm font-black text-white focus:outline-none px-3 py-2 rounded-lg"
            style={{ background: "#070a10", border: "1px solid rgba(239,68,68,0.3)" }} />
        </div>

        {/* TP input */}
        <div className="mb-3">
          <label className="text-[9px] font-black tracking-widest uppercase mb-1 flex items-center gap-1" style={{ color: "#10b981" }}>
            <Target className="h-2.5 w-2.5" /> Take Profit
            {tpNum !== null && <span className="ml-auto font-bold text-slate-600 normal-case tracking-normal">{tpPipsCalc.toFixed(1)} pips away</span>}
          </label>
          <input type="number" value={tp} onChange={e => setTp(e.target.value)}
            placeholder={fmt(entryPrice * (trade.direction === "BUY" ? 1.001 : 0.999), trade.pair)}
            className="w-full price-mono text-sm font-black text-white focus:outline-none px-3 py-2 rounded-lg"
            style={{ background: "#070a10", border: "1px solid rgba(16,185,129,0.3)" }} />
        </div>

        {/* Trailing stop */}
        <div className="mb-4">
          <label className="text-[9px] font-black tracking-widest uppercase mb-1 flex items-center gap-1" style={{ color: "#a78bfa" }}>
            <ArrowUpDown className="h-2.5 w-2.5" /> Trailing Stop (pips)
          </label>
          <input type="number" value={trailingPips} onChange={e => setTrailingPips(e.target.value)}
            placeholder="e.g. 20 (0 = off)"
            className="w-full price-mono text-sm font-black text-white focus:outline-none px-3 py-2 rounded-lg"
            style={{ background: "#070a10", border: "1px solid rgba(167,139,250,0.3)" }} />
        </div>

        {/* R:R display */}
        {rrRatio !== null && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg mb-4 text-xs"
            style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.18)" }}>
            <span className="text-slate-600">Risk:Reward</span>
            <span className="price-mono font-black text-cyan-400">1:{rrRatio}</span>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-black text-xs text-slate-400 transition-all hover:text-white"
            style={{ background: "transparent", border: "1px solid #1e2d45" }}>
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(
                target.tradeId,
                sl && !isNaN(parseFloat(sl)) ? parseFloat(sl) : null,
                tp && !isNaN(parseFloat(tp)) ? parseFloat(tp) : null,
                trailingPips && parseFloat(trailingPips) > 0 ? parseFloat(trailingPips) : null,
              )
              onClose()
            }}
            className="flex-1 py-2.5 rounded-xl font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
            style={{ background: "linear-gradient(135deg,#1e40af,#2563eb)", color: "#fff", boxShadow: "0 4px 16px rgba(37,99,235,0.3)" }}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Toast Stack ─────────────────────────────────────────────────────────────

function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-12 right-3 z-[70] flex flex-col gap-1.5 pointer-events-none" style={{ maxWidth: 320 }}>
      {toasts.map(t => (
        <div
          key={t.id}
          className="flex items-start gap-2 px-3 py-2 rounded-xl pointer-events-auto"
          style={{
            background: t.type === "success" ? "rgba(5,46,22,0.95)"
              : t.type === "error" ? "rgba(69,10,10,0.95)"
              : t.type === "warning" ? "rgba(78,37,10,0.95)"
              : "rgba(8,18,38,0.95)",
            border: `1px solid ${t.type === "success" ? "rgba(16,185,129,0.3)"
              : t.type === "error" ? "rgba(239,68,68,0.3)"
              : t.type === "warning" ? "rgba(245,158,11,0.3)"
              : "rgba(34,211,238,0.3)"}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            backdropFilter: "blur(12px)",
          }}
        >
          {t.type === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />}
          {t.type === "error"   && <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />}
          {t.type === "warning" && <Bell className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />}
          {t.type === "info"    && <Info className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />}
          <span className="text-[11px] font-bold leading-tight flex-1"
            style={{ color: t.type === "success" ? "#6ee7b7"
              : t.type === "error" ? "#fca5a5"
              : t.type === "warning" ? "#fde68a"
              : "#a5f3fc" }}>
            {t.text}
          </span>
          <button onClick={() => onDismiss(t.id)} className="shrink-0 text-slate-600 hover:text-slate-400 transition-colors ml-1">
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Market Stats Panel ────────────────────────────────────────────────────────

function MarketStats({ pair }: { pair: ForexPair }) {
  const atr   = useMemo(() => calcATR(pair.candles, 14), [pair.candles])
  const rangeH = pair.high > 0 ? ((pair.high - pair.low) / pair.low * 100) : 0
  const avgVol = useMemo(() => {
    if (pair.candles.length < 5) return 0
    return pair.candles.slice(-20).reduce((s, c) => s + c.volume, 0) / Math.min(20, pair.candles.length)
  }, [pair.candles])

  const stats = [
    { label: "Day High",  value: fmt(pair.high, pair.symbol),   color: "#10b981" },
    { label: "Day Low",   value: fmt(pair.low, pair.symbol),    color: "#ef4444" },
    { label: "Day Open",  value: fmt(pair.open, pair.symbol),   color: "#94a3b8" },
    { label: "D-Range %", value: `${rangeH.toFixed(3)}%`,       color: "#f59e0b" },
    { label: "ATR(14)",   value: atr > 0 ? atr.toFixed(decimals(pair.symbol)) : "—", color: "#a78bfa" },
    { label: "Avg Vol",   value: avgVol > 0 ? (avgVol >= 1e6 ? `${(avgVol/1e6).toFixed(1)}M` : avgVol >= 1000 ? `${(avgVol/1000).toFixed(0)}K` : avgVol.toFixed(0)) : "—", color: "#22d3ee" },
    { label: "Spread",    value: `${(pair.spread / pip(pair.symbol)).toFixed(1)}p`, color: "#fb923c" },
    { label: "Pip Val",   value: `$${pipValue(pair.symbol, 1, (pair.bid + pair.ask) / 2).toFixed(4)}`, color: "#60a5fa" },
  ]

  return (
    <div className="p-2 grid grid-cols-2 gap-1.5">
      {stats.map(s => (
        <div key={s.label} className="px-2 py-1.5 rounded-lg" style={{ background: "#0a1120", border: "1px solid #1a2640" }}>
          <p className="text-[8px] font-black tracking-widest uppercase text-slate-700 mb-0.5">{s.label}</p>
          <p className="price-mono text-[11px] font-black" style={{ color: s.color }}>{s.value}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Position Sizer ────────────────────────────────────────────────────────────

function PositionSizer({
  pair, leverage, walletBalance, onApply,
}: {
  pair: ForexPair; leverage: number; walletBalance: number; onApply: (lots: string) => void
}) {
  const [riskPct, setRiskPct] = useState("1")
  const [slPipsInput, setSlPipsInput] = useState("20")
  const atr = useMemo(() => calcATR(pair.candles, 14), [pair.candles])
  const atrPips = atr > 0 ? (atr / pip(pair.symbol)) : 0

  const midPrice = (pair.bid + pair.ask) / 2

  const { lots, dollarRisk, pipVal } = useMemo(() => {
    const rPct = parseFloat(riskPct) / 100
    const slP  = parseFloat(slPipsInput)
    if (isNaN(rPct) || isNaN(slP) || slP <= 0 || walletBalance <= 0) return { lots: 0, dollarRisk: 0, pipVal: 0 }
    const maxLoss = walletBalance * rPct
    const pv = pipValue(pair.symbol, 1, midPrice)    // per 1 lot per pip
    const lots = maxLoss / (slP * pv)
    // Snap to nearest 0.01 lot, clamp to 0.01–100
    const snapped = Math.max(0.01, Math.min(100, Math.floor(lots * 100) / 100))
    return { lots: snapped, dollarRisk: slP * pv * snapped, pipVal: pv }
  }, [riskPct, slPipsInput, walletBalance, pair.symbol, midPrice])

  return (
    <div className="p-2">
      <div className="rounded-xl overflow-hidden" style={{ background: "#0a1120", border: "1px solid #1a2640" }}>
        <div className="flex items-center gap-1.5 px-3 py-2" style={{ borderBottom: "1px solid #1a2640" }}>
          <Target className="h-3 w-3 text-violet-400" />
          <span className="text-[10px] font-black tracking-widest uppercase text-slate-500">Position Sizer</span>
          {atrPips > 0 && (
            <span className="ml-auto text-[9px] font-bold text-slate-600">ATR = {atrPips.toFixed(1)}p</span>
          )}
        </div>
        <div className="p-3 flex flex-col gap-2">
          {/* Risk % */}
          <div>
            <label className="text-[9px] font-black tracking-widest uppercase text-slate-600 mb-1 block">Risk %</label>
            <div className="flex gap-1 mb-1">
              {["0.5","1","2","3"].map(v => (
                <button key={v} onClick={() => setRiskPct(v)}
                  className="flex-1 py-1 rounded text-[9px] font-black transition-all"
                  style={riskPct === v
                    ? { background: "rgba(167,139,250,0.2)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.4)" }
                    : { background: "#070a10", color: "#374151", border: "1px solid #1a2640" }}>
                  {v}%
                </button>
              ))}
            </div>
            <input type="number" value={riskPct} onChange={e => setRiskPct(e.target.value)}
              className="w-full price-mono text-sm font-black text-white focus:outline-none px-2 py-1.5 rounded-lg"
              style={{ background: "#070a10", border: "1px solid #1e2d45" }}
              placeholder="1.0" step="0.1" min="0.1" max="10" />
          </div>
          {/* SL Pips */}
          <div>
            <label className="text-[9px] font-black tracking-widest uppercase text-slate-600 mb-1 block">
              SL Distance (pips)
            </label>
            {atrPips > 0 && (
              <div className="flex gap-1 mb-1">
                {[0.5, 1.0, 1.5].map(mult => (
                  <button key={mult} onClick={() => setSlPipsInput((atrPips * mult).toFixed(1))}
                    className="flex-1 py-1 rounded text-[9px] font-black transition-all"
                    style={{ background: "#070a10", color: "#3b82f6", border: "1px solid #1a2640" }}>
                    {mult}×ATR
                  </button>
                ))}
              </div>
            )}
            <input type="number" value={slPipsInput} onChange={e => setSlPipsInput(e.target.value)}
              className="w-full price-mono text-sm font-black text-white focus:outline-none px-2 py-1.5 rounded-lg"
              style={{ background: "#070a10", border: "1px solid #1e2d45" }}
              placeholder="20" min="1" />
          </div>
          {/* Result */}
          {lots > 0 && (
            <div className="rounded-lg p-2.5" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-600">Suggested Lots</span>
                <span className="price-mono font-black text-emerald-400 text-sm">{lots.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-600">Max Risk</span>
                <span className="price-mono font-black text-red-400">${dollarRisk.toFixed(2)} ({riskPct}%)</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-600">Pip Value</span>
                <span className="price-mono font-black text-cyan-400">${(pipVal * lots).toFixed(4)}/pip</span>
              </div>
              <button
                onClick={() => onApply(lots.toFixed(2))}
                className="w-full mt-2 py-2 rounded-lg font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
                style={{ background: "linear-gradient(135deg,#065f46,#059669)", color: "#d1fae5" }}>
                <Plus className="h-3 w-3" /> Apply {lots.toFixed(2)} Lots
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ForexTradingPlatform({
  participantEmail,
  walletBalance: externalBalance = 0,
  onBalanceUpdated,
}: {
  participantEmail: string
  walletBalance?: number
  onBalanceUpdated?: (newBalance: number) => void
}) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [pairs, setPairs]             = useState<ForexPair[]>([])
  const [selectedPair, setSelectedPair] = useState<ForexPair | null>(null)
  const [activeCategory, setActiveCategory] = useState<AssetCategory | "All">("All")
  const [timeframe, setTimeframe]     = useState<TimeFrame>("5M")
  const [direction, setDirection]     = useState<TradeDirection>("BUY")
  const [lotSize, setLotSize]         = useState("0.01")
  const [leverage, setLeverage]       = useState("100")
  const [sl, setSl]                   = useState("")
  const [tp, setTp]                   = useState("")
  const [trailingPips, setTrailingPips] = useState("")
  const [openTrades, setOpenTrades]   = useState<OpenTrade[]>([])
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([])
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([])
  const [activePanel, setActivePanel] = useState<"positions" | "history" | "pending" | "depth" | "stats" | "performance" | "alerts" | "sessions">("positions")
  const [priceAlerts, setPriceAlerts] = useState<PriceAlertItem[]>([])
  const [loading, setLoading]         = useState(true)
  const [online, setOnline]           = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [toasts, setToasts]           = useState<ToastItem[]>([])
  const [totalPnl, setTotalPnl]       = useState(0)
  const [tickCount, setTickCount]     = useState(0)
  const [walletBalance, setWalletBalance] = useState(externalBalance)
  // Flag to suppress the external-balance sync while an internal adjustWalletBalance is in flight
  const suppressExternalSync = useRef(false)
  const [balanceLoaded, setBalanceLoaded] = useState(externalBalance > 0)
  const [balanceDelta, setBalanceDelta] = useState<{ value: number; id: number } | null>(null)
  const [candleCache, setCandleCache] = useState<Record<string, Candle[]>>({})
  const [candleLoading, setCandleLoading] = useState(false)
  const [mobileTab, setMobileTab]     = useState<"market" | "chart" | "order">("chart")
  const [modifyTarget, setModifyTarget] = useState<ModifyTarget>(null)
  const [tradeConfirm, setTradeConfirm] = useState<TradeConfirm>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [orderType, setOrderType]     = useState<"market" | "limit" | "stop">("market")
  const [pendingPrice, setPendingPrice] = useState("")
  const [pendingExpiry, setPendingExpiry] = useState<"GTC" | "TODAY">("GTC")
  const [rightPanelTab, setRightPanelTab] = useState<"order" | "sizer">("order")
  const [showPairSearch, setShowPairSearch] = useState(false)
  const [pairSearch, setPairSearch]   = useState("")
  const [equityHistory, setEquityHistory] = useState<number[]>([])

  const pairsRef        = useRef<ForexPair[]>([])
  const openTradesRef   = useRef<OpenTrade[]>([])
  const ratesIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const candleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const swapIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const toastIdRef       = useRef(0)

  // Keep openTradesRef in sync — assigned at render time (not in useEffect)
  // so the tick engine always reads the latest committed state
  openTradesRef.current = openTrades

  // Sync external balance — skipped while an internal adjustWalletBalance call is in-flight
  // to prevent the prop update triggered by onBalanceUpdated from overwriting the fresh DB value
  useEffect(() => {
    if (suppressExternalSync.current) return
    setWalletBalance(externalBalance)
    if (externalBalance > 0) setBalanceLoaded(true)
  }, [externalBalance])

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const showToast = useCallback((type: ToastItem["type"], text: string, duration = 5000) => {
    const id = ++toastIdRef.current
    setToasts(prev => [...prev.slice(-4), { id, type, text }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── Balance API ────────────────────────────────────────────────────────────
  const adjustWalletBalance = useCallback(async (delta: number, description: string): Promise<number | null> => {
    try {
      // Prevent the externalBalance useEffect from overwriting the fresh DB value
      suppressExternalSync.current = true
      const res = await participantFetch("/api/forex/trade-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: participantEmail, delta, description }),
      })
      const json = await res.json()
      if (!json.success) {
        suppressExternalSync.current = false
        showToast("error", json.error || "Balance update failed")
        return null
      }
      setWalletBalance(json.newBalance)
      setBalanceLoaded(true)
      onBalanceUpdated?.(json.newBalance)
      setBalanceDelta({ value: delta, id: Date.now() })
      setTimeout(() => setBalanceDelta(null), 2500)
      // Re-enable external sync after a short delay (after onBalanceUpdated propagates)
      setTimeout(() => { suppressExternalSync.current = false }, 800)
      return json.newBalance
    } catch {
      suppressExternalSync.current = false
      showToast("error", "Network error updating balance")
      return null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantEmail, onBalanceUpdated])

  // ── Fetch live rates ───────────────────────────────────────────────────────
  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch("/api/forex/rates", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      const rateMap = json.rates as Record<string, { bid: number; ask: number; mid: number; change: number; high: number; low: number; open: number }>

      setPairs(prev => {
        const updated = prev.map(p => {
          const r = rateMap[p.symbol]
          if (!r) return p
          return { ...p, bid: r.bid, ask: r.ask, change: r.change, high: r.high, low: r.low, open: r.open, spread: TYPICAL_SPREADS[p.symbol] ?? 0.0002 }
        })
        pairsRef.current = updated
        return updated
      })
      setSelectedPair(prev => {
        if (!prev) return prev
        return pairsRef.current.find(p => p.symbol === prev.symbol) ?? prev
      })
      setOnline(true)
      setLastUpdated(new Date())
      setTickCount(n => n + 1)
    } catch {
      setOnline(false)
    }
  }, [])

  // ── Fetch candles ──────────────────────────────────────────────────────────
  const fetchCandles = useCallback(async (sym: string, tf: TimeFrame) => {
    const key = `${sym}|${tf}`
    setCandleLoading(true)
    try {
      const res = await fetch(`/api/forex/candles?pair=${encodeURIComponent(sym)}&tf=${tf}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      const candles: Candle[] = json.candles
      setCandleCache(prev => ({ ...prev, [key]: candles }))
      setPairs(prev => {
        const updated = prev.map(p => p.symbol === sym ? { ...p, candles } : p)
        pairsRef.current = updated
        return updated
      })
      setSelectedPair(prev => {
        if (!prev || prev.symbol !== sym) return prev
        return pairsRef.current.find(p => p.symbol === sym) ?? prev
      })
    } catch {
      // keep existing
    } finally {
      setCandleLoading(false)
    }
  }, [])

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init: ForexPair[] = PAIRS_CONFIG.map(p => ({
      symbol: p.symbol, base: p.base, quote: p.quote,
      bid: 0, ask: 0, change: 0, high: 0, low: 0, open: 0,
      spread: TYPICAL_SPREADS[p.symbol] ?? 0.0002, candles: [],
    }))
    setPairs(init); pairsRef.current = init
    setSelectedPair(init[0]); setLoading(false)
    fetchRates(); fetchCandles(init[0].symbol, "5M")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Poll rates every 3s ────────────────────────────────────────────────────
  useEffect(() => {
    ratesIntervalRef.current = setInterval(fetchRates, 3000)
    return () => { if (ratesIntervalRef.current) clearInterval(ratesIntervalRef.current) }
  }, [fetchRates])

  // ── Re-fetch candles when pair/TF changes ──────────────────────────────────
  useEffect(() => {
    if (!selectedPair) return
    fetchCandles(selectedPair.symbol, timeframe)
    const refreshMs: Record<TimeFrame, number> = {
      "1M": 30_000, "5M": 60_000, "15M": 120_000, "1H": 300_000, "4H": 600_000, "1D": 3600_000,
    }
    const ms = refreshMs[timeframe] ?? 60_000
    candleIntervalRef.current = setInterval(() => fetchCandles(selectedPair.symbol, timeframe), ms)
    return () => { if (candleIntervalRef.current) clearInterval(candleIntervalRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPair?.symbol, timeframe])

  // ── Live-tick last candle ──────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedPair || selectedPair.candles.length === 0) return
    const mid = (selectedPair.bid + selectedPair.ask) / 2
    if (mid === 0) return
    setPairs(prev => {
      const updated = prev.map(p => {
        if (p.symbol !== selectedPair.symbol || p.candles.length === 0) return p
        const liveMid = (p.bid + p.ask) / 2
        if (liveMid === 0) return p
        const d = decimals(p.symbol)
        const nc = [...p.candles]
        const last = { ...nc[nc.length - 1] }
        last.close = parseFloat(liveMid.toFixed(d))
        last.high  = Math.max(last.high, last.close)
        last.low   = Math.min(last.low, last.close)
        nc[nc.length - 1] = last
        return { ...p, candles: nc }
      })
      pairsRef.current = updated
      return updated
    })
    setSelectedPair(prev => {
      if (!prev) return prev
      return pairsRef.current.find(p => p.symbol === prev.symbol) ?? prev
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickCount])

  // ── Overnight swap accrual (every 60s, proportional) ──────────────────────
  useEffect(() => {
    swapIntervalRef.current = setInterval(() => {
      setOpenTrades(prev => prev.map(t => {
        const [longRate, shortRate] = SWAP_RATES[t.pair] ?? [0, 0]
        const ratePerDay = t.direction === "BUY" ? longRate : shortRate
        // Accrue 1/1440 of daily swap per minute
        const accrual = parseFloat(((ratePerDay * t.lotSize) / 1440).toFixed(6))
        return { ...t, swap: parseFloat((t.swap + accrual).toFixed(6)) }
      }))
    }, 60_000)
    return () => { if (swapIntervalRef.current) clearInterval(swapIntervalRef.current) }
  }, [])

  // ── P&L engine + SL/TP/Trailing engine ────────────────────────────────────
  useEffect(() => {
    // Always read live trade list from the ref — never the stale closure value
    const liveTrades = openTradesRef.current
    if (liveTrades.length === 0 && pendingOrders.length === 0) return
    const toClose: { id: string; reason: ClosedTrade["closeReason"]; price: number }[] = []
    const toFillPending: string[] = []

    // Check pending orders for fill
    pendingOrders.forEach(o => {
      const pairNow = pairsRef.current.find(p => p.symbol === o.pair)
      if (!pairNow) return
      const currentPrice = o.direction === "BUY" ? pairNow.ask : pairNow.bid
      let filled = false
      if (o.orderType === "BUY_LIMIT"  && currentPrice <= o.targetPrice) filled = true
      if (o.orderType === "BUY_STOP"   && currentPrice >= o.targetPrice) filled = true
      if (o.orderType === "SELL_LIMIT" && currentPrice >= o.targetPrice) filled = true
      if (o.orderType === "SELL_STOP"  && currentPrice <= o.targetPrice) filled = true
      if (filled) toFillPending.push(o.id)
    })

    if (toFillPending.length > 0) {
      toFillPending.forEach(id => {
        setPendingOrders(prev => {
          const order = prev.find(o => o.id === id)
          if (!order) return prev
          const pairNow = pairsRef.current.find(p => p.symbol === order.pair)
          if (!pairNow) return prev
          const fillPrice = order.direction === "BUY" ? pairNow.ask : pairNow.bid
          const margin = calcMargin(order.pair, order.lotSize, fillPrice, order.leverage)
          const newTrade: OpenTrade = {
            id: genId(), pair: order.pair, direction: order.direction,
            lotSize: order.lotSize, leverage: order.leverage,
            openPrice: fillPrice, currentPrice: fillPrice,
            sl: order.sl, tp: order.tp,
            trailingStopPips: null, trailingPeak: fillPrice,
            openTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            openTimestamp: Date.now(),
            pnl: 0, pips: 0, margin, returnOnMargin: 0, swap: 0,
          }
          setOpenTrades(p => [newTrade, ...p])
          showToast("info", `Pending ${order.orderType.replace("_"," ")} filled: ${order.pair} @ ${fmt(fillPrice, order.pair)}`)
          return prev.filter(o => o.id !== id)
        })
      })
    }

    // Update open trades P&L + check SL/TP/Trailing — use liveTrades (ref) not stale closure
    const updated = liveTrades.map(t => {
      const pairNow = pairsRef.current.find(p => p.symbol === t.pair)
      if (!pairNow) return t
      const currentPrice = t.direction === "BUY" ? pairNow.bid : pairNow.ask

      // Update trailing peak and compute trailing SL
      let trailingPeak = t.trailingPeak
      let effectiveSl  = t.sl
      if (t.trailingStopPips && t.trailingStopPips > 0) {
        const trailDist = t.trailingStopPips * pip(t.pair)
        if (t.direction === "BUY") {
          trailingPeak = Math.max(trailingPeak, currentPrice)
          const trailSl = trailingPeak - trailDist
          // Only move SL up, never down
          effectiveSl = t.sl === null ? trailSl : Math.max(t.sl, trailSl)
        } else {
          trailingPeak = Math.min(trailingPeak, currentPrice)
          const trailSl = trailingPeak + trailDist
          effectiveSl = t.sl === null ? trailSl : Math.min(t.sl, trailSl)
        }
      }

      const { pnl, pipCount, returnOnMargin } = calcPnl(t, currentPrice, t.pair)

      // SL check
      if (effectiveSl !== null) {
        if ((t.direction === "BUY" && currentPrice <= effectiveSl) ||
            (t.direction === "SELL" && currentPrice >= effectiveSl)) {
          const reason = t.trailingStopPips ? "trailing_sl" : "sl"
          toClose.push({ id: t.id, reason, price: effectiveSl })
        }
      }
      // TP check
      if (t.tp !== null) {
        if ((t.direction === "BUY" && currentPrice >= t.tp) ||
            (t.direction === "SELL" && currentPrice <= t.tp)) {
          toClose.push({ id: t.id, reason: "tp", price: t.tp })
        }
      }

      return { ...t, currentPrice, pnl: pnl + t.swap, pips: pipCount, returnOnMargin, trailingPeak, sl: effectiveSl ?? t.sl }
    })

    if (toClose.length > 0) {
      const icons = { tp: "Take Profit", sl: "Stop Loss", trailing_sl: "Trailing Stop", manual: "Closed" }

      toClose.forEach(({ id, reason, price }) => {
        if (closingTradeIds.current.has(id)) return

        // Read trade from the live ref — never from stale closure or inside a state updater
        const trade = openTradesRef.current.find(t => t.id === id)
        if (!trade) return

        closingTradeIds.current.add(id)

        // --- Compute close values OUTSIDE any state updater ---
        const { pnl: finalPnlRaw, pipCount: finalPips } = calcPnl(trade, price, trade.pair)
        const finalPnl = parseFloat((finalPnlRaw + trade.swap).toFixed(2))
        const closed: ClosedTrade = {
          ...trade, closePrice: price,
          closeTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          closeDuration: formatDuration(trade.openTimestamp),
          finalPnl, finalPips,
          finalSwap: parseFloat(trade.swap.toFixed(2)),
          closeReason: reason as ClosedTrade["closeReason"],
        }

        // --- Apply all state mutations once, separately, never nested ---
        // 1. Remove from open list
        openTradesRef.current = openTradesRef.current.filter(t => t.id !== id)
        setOpenTrades(prev => prev.filter(t => t.id !== id))

        // 2. Add to history once — guard with ID check to be safe
        setClosedTrades(prev => {
          if (prev.some(t => t.id === closed.id)) return prev
          return [closed, ...prev.slice(0, 99)]
        })

        // 3. Return margin + P&L (called only once per trade)
        const returnAmt = parseFloat((trade.margin + finalPnl).toFixed(2))
        adjustWalletBalance(
          returnAmt > 0 ? returnAmt : 0,
          `${reason.toUpperCase().replace("_"," ")} — ${trade.pair} ${trade.direction} | P&L: ${finalPnl >= 0 ? "+" : ""}$${finalPnl.toFixed(2)} | Margin: $${trade.margin.toFixed(2)}`
        )

        showToast(
          reason === "tp" ? "success" : "error",
          `${icons[reason as keyof typeof icons]} — ${trade.pair} ${trade.direction}: ${finalPnl >= 0 ? "+" : ""}$${finalPnl.toFixed(2)} (${finalPips >= 0 ? "+" : ""}${finalPips.toFixed(1)} pips)`
        )

        setTimeout(() => closingTradeIds.current.delete(id), 1000)
      })
    } else {
      // Use functional updater: only keep trades still present in prev state.
      // This prevents resurrecting trades that were just closed between tick cycles.
      setOpenTrades(prev => {
        const prevIds = new Set(prev.map(t => t.id))
        return updated.filter(t => prevIds.has(t.id))
      })
    }

    // Sync ref immediately so subsequent ticks read the latest list
    openTradesRef.current = updated.filter(t => !toClose.some(c => c.id === t.id))

    const newTotalPnl = updated.reduce((s, t) => s + t.pnl, 0)
    setTotalPnl(newTotalPnl)

    // Update equity curve
    const equity = walletBalance + newTotalPnl
    setEquityHistory(prev => {
      const next = [...prev, equity]
      return next.length > 120 ? next.slice(-120) : next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickCount])

  // ── Persist trades ─────────────────────────────────────────────────────────
  // Guard: do not save until the load effect has run at least once
  const localStorageLoaded = useRef(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`forex_v3_${participantEmail}`)
      if (saved) {
        const { open, closed, pending } = JSON.parse(saved)
        setOpenTrades(open ?? [])
        setClosedTrades(closed ?? [])
        setPendingOrders(pending ?? [])
      }
    } catch {}
    // Mark as loaded so the save effect is now allowed to run
    localStorageLoaded.current = true
  }, [participantEmail])

  useEffect(() => {
    // Never save before the initial load — prevents empty state overwriting saved data
    if (!localStorageLoaded.current) return
    try {
      localStorage.setItem(`forex_v3_${participantEmail}`, JSON.stringify({ open: openTrades, closed: closedTrades, pending: pendingOrders }))
    } catch {}
  }, [openTrades, closedTrades, pendingOrders, participantEmail])

  // ── Execute market trade ───────────────────────────────────────────────────
  // Opens the confirmation modal ��� called by both executeTrade and quickTrade
  const requestConfirm = (
    dir: TradeDirection,
    lot: number,
    lev: number,
    price: number,
    slNum: number | null,
    tpNum: number | null,
    trailN: number | null,
    isPending: boolean,
    pendingMeta?: { orderType: PendingOrder["orderType"]; price: number; expiry: "GTC" | "TODAY" },
  ) => {
    if (!selectedPair) return
    const margin  = calcMargin(selectedPair.symbol, lot, price, lev)
    const pv      = pipValue(selectedPair.symbol, lot, price)
    const cs      = contractSize(selectedPair.symbol)
    const liqDist = margin / (lot * cs)   // distance from entry to liquidation in price units
    const liqPrice = dir === "BUY" ? parseFloat((price - liqDist).toFixed(5)) : parseFloat((price + liqDist).toFixed(5))

    setTradeConfirm({
      pair: selectedPair.symbol, direction: dir,
      lotSize: lot, leverage: lev, price, margin,
      sl: slNum, tp: tpNum, trailingPips: trailN,
      pipVal: pv, liqPrice, isPending,
      ...(pendingMeta ? {
        pendingOrderType: pendingMeta.orderType,
        pendingPrice: pendingMeta.price,
        pendingExpiry: pendingMeta.expiry,
      } : {}),
    })
  }

  const executeTrade = () => {
    if (!selectedPair) return
    const lot = parseFloat(lotSize); const lev = parseFloat(leverage)
    if (isNaN(lot) || lot <= 0 || lot > 100) { showToast("error", "Lot size: 0.01 – 100"); return }
    if (isNaN(lev) || lev < 1) { showToast("error", "Invalid leverage"); return }

    const price  = direction === "BUY" ? selectedPair.ask : selectedPair.bid
    const slNum  = sl ? parseFloat(sl) : null
    const tpNum  = tp ? parseFloat(tp) : null
    const trailN = trailingPips ? parseFloat(trailingPips) : null
    const margin = calcMargin(selectedPair.symbol, lot, price, lev)

    if (slNum && direction === "BUY"  && slNum >= price) { showToast("error", "SL must be below entry for BUY"); return }
    if (slNum && direction === "SELL" && slNum <= price) { showToast("error", "SL must be above entry for SELL"); return }
    if (tpNum && direction === "BUY"  && tpNum <= price) { showToast("error", "TP must be above entry for BUY"); return }
    if (tpNum && direction === "SELL" && tpNum >= price) { showToast("error", "TP must be below entry for SELL"); return }
    if (walletBalance < margin) {
      showToast("error", `Insufficient balance — need $${margin.toFixed(2)}, have $${walletBalance.toFixed(2)}`); return
    }

    if (orderType !== "market") {
      const pPrice = parseFloat(pendingPrice)
      if (isNaN(pPrice) || pPrice <= 0) { showToast("error", "Enter a valid pending order price"); return }
      const oType: PendingOrder["orderType"] =
        orderType === "limit"
          ? direction === "BUY" ? "BUY_LIMIT" : "SELL_LIMIT"
          : direction === "BUY" ? "BUY_STOP" : "SELL_STOP"
      requestConfirm(direction, lot, lev, price, slNum, tpNum, trailN, true, { orderType: oType, price: pPrice, expiry: pendingExpiry })
      return
    }

    requestConfirm(direction, lot, lev, price, slNum, tpNum, trailN, false)
  }

  // Actual placement — called after user confirms
  const confirmAndPlace = async () => {
    if (!tradeConfirm || !selectedPair) return
    setConfirmLoading(true)
    const { direction: dir, lotSize: lot, leverage: lev, price, margin, sl: slNum, tp: tpNum, trailingPips: trailN, isPending } = tradeConfirm

    if (isPending && tradeConfirm.pendingOrderType && tradeConfirm.pendingPrice) {
      const order: PendingOrder = {
        id: genId(), pair: selectedPair.symbol, direction: dir,
        orderType: tradeConfirm.pendingOrderType, lotSize: lot, leverage: lev,
        targetPrice: tradeConfirm.pendingPrice, sl: slNum, tp: tpNum,
        createdTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        expiry: tradeConfirm.pendingExpiry ?? "GTC",
      }
      setPendingOrders(prev => [order, ...prev])
      showToast("info", `${order.orderType.replace("_"," ")} placed: ${selectedPair.symbol} @ ${fmt(order.targetPrice, selectedPair.symbol)}`)
      setActivePanel("pending")
    } else {
      // Deduct margin from balance immediately
      const newBal = await adjustWalletBalance(
        -margin,
        `Margin locked — ${dir} ${lot}L ${selectedPair.symbol} @ ${fmt(price, selectedPair.symbol)}`
      )
      if (newBal === null) { setConfirmLoading(false); return }  // API error — abort

      const tradeId = genId()
      const trade: OpenTrade = {
        id: tradeId, pair: selectedPair.symbol, direction: dir,
        lotSize: lot, leverage: lev, openPrice: price, currentPrice: price,
        sl: slNum, tp: tpNum, trailingStopPips: trailN && trailN > 0 ? trailN : null,
        trailingPeak: price,
        openTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        openTimestamp: Date.now(),
        pnl: 0, pips: 0, margin, returnOnMargin: 0, swap: 0,
      }
      // Update ref immediately so the tick engine sees the new trade before next render
      openTradesRef.current = [trade, ...openTradesRef.current]
      setOpenTrades(prev => {
        // Guard: never add the same trade ID twice (prevents double placement on re-render)
        if (prev.some(t => t.id === tradeId)) return prev
        return [trade, ...prev]
      })
      showToast("success",
        `${dir} ${lot}L ${selectedPair.symbol} @ ${fmt(price, selectedPair.symbol)} | Margin: $${margin.toFixed(2)} | Bal: $${newBal.toFixed(2)}`
      )
      setSl(""); setTp(""); setTrailingPips("")
      setActivePanel("positions")
    }

    setTradeConfirm(null)
    setConfirmLoading(false)
  }

  // ── Quick trade — routes through confirmation modal ────────────────────────
  const quickTrade = (dir: TradeDirection) => {
    if (!selectedPair) return
    const lot = parseFloat(lotSize) || 0.01
    const lev = parseFloat(leverage) || 100
    const price  = dir === "BUY" ? selectedPair.ask : selectedPair.bid
    const margin = calcMargin(selectedPair.symbol, lot, price, lev)
    if (walletBalance < margin) { showToast("error", `Need $${margin.toFixed(2)}, have $${walletBalance.toFixed(2)}`); return }
    requestConfirm(dir, lot, lev, price, null, null, null, false)
  }

  // Tracks IDs that are in the middle of being closed to prevent concurrent double-close
  const closingTradeIds = useRef<Set<string>>(new Set())

  // ── Close trade ────────────────────────────────────────────────────────────
  const closeTrade = (id: string) => {
    // Prevent double-close if tick engine and manual close race
    if (closingTradeIds.current.has(id)) return

    // Read trade from the live ref — never from stale closure
    const trade = openTradesRef.current.find(t => t.id === id)
    if (!trade) return

    closingTradeIds.current.add(id)

    // --- Compute close values OUTSIDE any state updater ---
    const pairNow    = pairsRef.current.find(p => p.symbol === trade.pair)
    const closePrice = pairNow ? (trade.direction === "BUY" ? pairNow.bid : pairNow.ask) : trade.currentPrice
    const { pnl: pnlRaw, pipCount } = calcPnl(trade, closePrice, trade.pair)
    const finalPnl   = parseFloat((pnlRaw + trade.swap).toFixed(2))
    const closed: ClosedTrade = {
      ...trade, closePrice,
      closeTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      closeDuration: formatDuration(trade.openTimestamp),
      finalPnl, finalPips: pipCount, finalSwap: parseFloat(trade.swap.toFixed(2)),
      closeReason: "manual",
    }

    // --- Apply all state mutations once, separately, never nested ---
    // 1. Remove from open list
    openTradesRef.current = openTradesRef.current.filter(t => t.id !== id)
    setOpenTrades(prev => prev.filter(t => t.id !== id))

    // 2. Add to history once — guard with ID check to be safe
    setClosedTrades(prev => {
      if (prev.some(t => t.id === closed.id)) return prev
      return [closed, ...prev.slice(0, 99)]
    })

    // 3. Return margin + P&L to balance (called only once)
    const returnAmt = parseFloat((trade.margin + finalPnl).toFixed(2))
    adjustWalletBalance(
      returnAmt > 0 ? returnAmt : 0,
      `Manual close — ${trade.pair} ${trade.direction} | P&L: ${finalPnl >= 0 ? "+" : ""}$${finalPnl.toFixed(2)} | Margin: $${trade.margin.toFixed(2)}`
    )

    showToast(finalPnl >= 0 ? "success" : "error",
      `Closed ${trade.pair} @ ${fmt(closePrice, trade.pair)} — ${finalPnl >= 0 ? "+" : ""}$${finalPnl.toFixed(2)} (${pipCount >= 0 ? "+" : ""}${pipCount.toFixed(1)} pips)`
    )

    setTimeout(() => closingTradeIds.current.delete(id), 1000)
  }

  // ── Modify trade ───────────────────────────────────────────────────────────
  const applyModify = useCallback((tradeId: string, newSl: number | null, newTp: number | null, newTrail: number | null) => {
    setOpenTrades(prev => prev.map(t =>
      t.id === tradeId ? { ...t, sl: newSl, tp: newTp, trailingStopPips: newTrail } : t
    ))
    showToast("info", "Position updated")
  }, [showToast])

  // ── Price Alert checker (runs each tick) ─────────────────────────────────
  useEffect(() => {
    if (priceAlerts.length === 0) return
    setPriceAlerts(prev => prev.map(a => {
      if (a.triggered) return a
      const p = pairsRef.current.find(pair => pair.symbol === a.pair)
      if (!p) return a
      const mid = (p.bid + p.ask) / 2
      const hit = a.condition === "above" ? mid >= a.price : mid <= a.price
      if (hit) {
        showToast("warning", `Alert: ${a.pair} ${a.condition} ${fmt(a.price, a.pair)} — ${a.label}`, 8000)
        return { ...a, triggered: true }
      }
      return a
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickCount])

  const addPriceAlert = useCallback((pair: string, price: number, condition: "above" | "below", label: string) => {
    setPriceAlerts(prev => [{
      id: genId(), pair, price, condition, label, triggered: false, createdAt: Date.now(),
    }, ...prev])
    showToast("info", `Alert set: ${pair} ${condition} ${fmt(price, pair)}`)
  }, [showToast])

  const removePriceAlert = useCallback((id: string) => {
    setPriceAlerts(prev => prev.filter(a => a.id !== id))
  }, [])

  // ── Cancel pending order ───────────────────────────────────────────────────
  const cancelPending = (id: string) => {
    setPendingOrders(prev => prev.filter(o => o.id !== id))
    showToast("info", "Pending order cancelled")
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const midPrice = selectedPair ? (selectedPair.bid + selectedPair.ask) / 2 : 0
  const estimatedMargin = selectedPair
    ? calcMargin(selectedPair.symbol, parseFloat(lotSize) || 0.01, midPrice, parseFloat(leverage) || 100)
    : 0
  const pipVal = selectedPair
    ? pipValue(selectedPair.symbol, parseFloat(lotSize) || 0.01, midPrice)
    : 0
  const isUp = selectedPair ? selectedPair.change >= 0 : true
  const lastCandle = selectedPair?.candles?.slice(-1)[0]
  const entryPrice = selectedPair ? (direction === "BUY" ? selectedPair.ask : selectedPair.bid) : midPrice
  const slVal = sl && !isNaN(parseFloat(sl)) ? parseFloat(sl) : null
  const tpVal = tp && !isNaN(parseFloat(tp)) ? parseFloat(tp) : null
  const slPips = slVal !== null && selectedPair ? Math.abs((slVal - entryPrice) / pip(selectedPair.symbol)) : 0
  const tpPips = tpVal !== null && selectedPair ? Math.abs((tpVal - entryPrice) / pip(selectedPair.symbol)) : 0
  const maxLoss = slPips * pipVal
  const maxGain = tpPips * pipVal
  const rrRatio = slPips > 0 ? (tpPips / slPips).toFixed(2) : null

  const categoryTabs: (AssetCategory | "All")[] = ["All", "Forex", "Commodities", "Crypto"]
  const searchedPairs = pairSearch
    ? pairs.filter(p => p.symbol.toLowerCase().includes(pairSearch.toLowerCase()) || FULL_NAMES[p.symbol]?.toLowerCase().includes(pairSearch.toLowerCase()))
    : pairs
  const filteredPairs = searchedPairs.filter(p => {
    const cfg = PAIRS_CONFIG.find(c => c.symbol === p.symbol)
    return activeCategory === "All" || cfg?.category === activeCategory
  })

  // Mini equity sparkline path
  const sparkPath = useMemo(() => {
    if (equityHistory.length < 2) return ""
    const min = Math.min(...equityHistory)
    const max = Math.max(...equityHistory)
    const range = max - min || 1
    const w = 80, h = 24
    return equityHistory.map((v, i) => {
      const x = (i / (equityHistory.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(" ")
  }, [equityHistory])

  const totalSwap = openTrades.reduce((s, t) => s + t.swap, 0)
  const totalMargin = openTrades.reduce((s, t) => s + t.margin, 0)
  const freeMargin = Math.max(0, walletBalance - totalMargin)
  const marginLevel = totalMargin > 0 ? ((walletBalance + totalPnl) / totalMargin * 100) : 0
  const equity = walletBalance + totalPnl

  return (
    <div className="flex flex-col forex-deep-bg text-white" style={{ height: "100%", width: "100%", position: "relative", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Toast Stack ── */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* ── Modify Modal ── */}
      {modifyTarget && (
        <ModifyTradeModal
          target={modifyTarget}
          trades={openTrades}
          pairs={pairs}
          onClose={() => setModifyTarget(null)}
          onSave={applyModify}
        />
      )}

      {/* ══ TOP NAV BAR ══════════════════════════════════════════════════════ */}
      <div className="flex items-center shrink-0 px-3 h-10 gap-3" style={{ background: "#080c14", borderBottom: "1px solid #1e2d45" }}>
        <div className="flex items-center gap-1.5 shrink-0">
          <CandlestickChart className="h-4 w-4 text-cyan-400" />
          <span className="text-[11px] font-black tracking-[0.18em] text-white">TRADE TERMINAL</span>
        </div>
        <div className="w-px h-5 shrink-0" style={{ background: "#1e2d45" }} />

        {/* Ticker tape */}
        <div className="flex-1 overflow-hidden relative" style={{ mask: "linear-gradient(90deg,transparent 0%,black 4%,black 96%,transparent 100%)" }}>
          <div className="ticker-scroll flex gap-6 items-center">
            {[...pairs, ...pairs].map((p, i) => {
              const up = p.change >= 0
              return (
                <button key={i} onClick={() => { setSelectedPair(p); fetchCandles(p.symbol, timeframe) }}
                  className="flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity">
                  <span className="text-[10px] font-bold text-slate-400">{p.symbol}</span>
                  <span className="price-mono text-[10px] font-bold" style={{ color: up ? "#10b981" : "#ef4444" }}>{fmt(p.bid, p.symbol)}</span>
                  <span className="text-[9px] font-bold" style={{ color: up ? "#10b981" : "#ef4444" }}>{up ? "+" : ""}{(p.change ?? 0).toFixed(2)}%</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="w-px h-5 shrink-0" style={{ background: "#1e2d45" }} />

        {/* Live status */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="live-dot" style={{ background: online ? "#10b981" : "#ef4444", boxShadow: online ? "0 0 6px #10b981" : "0 0 6px #ef4444" }} />
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: online ? "#10b981" : "#ef4444" }}>
            {online ? "LIVE" : "OFFLINE"}
          </span>
          {lastUpdated && <span className="text-[9px] text-slate-600 price-mono hidden md:block">{lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>}
        </div>

        {/* Balance chip with sparkline */}
        <div className="relative flex items-center gap-1.5 px-2.5 py-1 shrink-0" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: 4 }}>
          <Wallet className="h-3 w-3 text-emerald-400" />
          <div className="flex flex-col">
            <span className="text-[8px] text-slate-600 leading-none">BALANCE</span>
            <span className="price-mono text-[11px] font-black text-emerald-400 leading-none">
              ${walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          {sparkPath && (
            <svg width="80" height="24" viewBox="0 0 80 24" fill="none" className="shrink-0">
              <path d={sparkPath} stroke={totalPnl >= 0 ? "#10b981" : "#ef4444"} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {balanceDelta && (
            <span key={balanceDelta.id} className="absolute -top-5 left-1/2 price-mono text-[10px] font-black pointer-events-none animate-bounce"
              style={{ transform: "translateX(-50%)", color: balanceDelta.value >= 0 ? "#10b981" : "#ef4444" }}>
              {balanceDelta.value >= 0 ? "+" : ""}${Math.abs(balanceDelta.value).toFixed(2)}
            </span>
          )}
        </div>

        <button onClick={() => { fetchRates(); if (selectedPair) fetchCandles(selectedPair.symbol, timeframe) }}
          className="p-1.5 transition-colors shrink-0"
          style={{ background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.15)", borderRadius: 4 }}>
          <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${candleLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ══ ACCOUNT SUMMARY STRIP ═════════════════════════════════════════════ */}
      <div className="flex items-center shrink-0 px-0 h-9 gap-0 overflow-x-auto terminal-scroll" style={{ background: "#04070d", borderBottom: "1px solid #1a2640" }}>
        {[
          { label: "BALANCE",      value: `$${walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,  color: "#34d399", bg: "rgba(52,211,153,0.06)"  },
          { label: "EQUITY",       value: `$${equity.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,          color: totalPnl >= 0 ? "#34d399" : "#f87171", bg: totalPnl >= 0 ? "rgba(52,211,153,0.04)" : "rgba(248,113,113,0.04)" },
          { label: "LIVE P&L",     value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`,                        color: totalPnl >= 0 ? "#34d399" : "#f87171", bg: totalPnl >= 0 ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)" },
          { label: "SWAP",         value: `${totalSwap >= 0 ? "+" : ""}$${totalSwap.toFixed(2)}`,                      color: totalSwap >= 0 ? "#34d399" : "#f87171", bg: "transparent" },
          { label: "MARGIN USED",  value: `$${totalMargin.toFixed(2)}`,                                                 color: "#fbbf24", bg: "rgba(251,191,36,0.05)" },
          { label: "FREE MARGIN",  value: `$${freeMargin.toFixed(2)}`,                                                  color: "#38bdf8", bg: "rgba(56,189,248,0.05)" },
          { label: "MARGIN LVL",   value: marginLevel > 0 ? `${marginLevel.toFixed(0)}%` : "—",                         color: marginLevel > 200 ? "#34d399" : marginLevel > 100 ? "#fbbf24" : "#f87171", bg: "transparent" },
          { label: "POSITIONS",    value: String(openTrades.length),                                                     color: "#c084fc", bg: "rgba(192,132,252,0.05)" },
          { label: "PENDING",      value: String(pendingOrders.length),                                                  color: "#93c5fd", bg: "transparent" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2 px-3 h-full shrink-0" style={{ borderRight: "1px solid #0f1c2e", background: item.bg }}>
            <span className="text-[8px] font-bold tracking-[0.12em] uppercase" style={{ color: "#3d5a80" }}>{item.label}</span>
            <span className="price-mono text-[11px] font-black" style={{ color: item.color }}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* ══ MOBILE TAB SWITCHER ═══════════════════════════════════════════════ */}
      <div className="flex shrink-0 md:hidden" style={{ background: "#060a12", borderBottom: "1px solid #1a2640" }}>
        {[{ id: "market", label: "Markets" }, { id: "chart", label: "Chart" }, { id: "order", label: "Order" }].map(tab => (
          <button key={tab.id} onClick={() => setMobileTab(tab.id as typeof mobileTab)}
            className="flex-1 py-2 text-[10px] font-black tracking-wider uppercase transition-all"
            style={{
              color: mobileTab === tab.id ? "#22d3ee" : "#3d5a80",
              borderBottom: mobileTab === tab.id ? "2px solid #22d3ee" : "2px solid transparent",
              background: mobileTab === tab.id ? "rgba(34,211,238,0.04)" : "transparent",
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══ MAIN 3-COLUMN GRID ════════════════════════════════════════════════ */}
      <div className="flex-1 flex min-h-0" style={{ borderBottom: "1px solid #1e2d45" }}>

        {/* ── LEFT: Market Watch ─────────────────────────────────────────────── */}
        <div className={`flex flex-col shrink-0 ${mobileTab !== "market" ? "hidden md:flex" : "flex"}`}
          style={{ width: "min(256px,100%)", borderRight: "1px solid #1e2d45", background: "#070b13" }}>

          <div className="shrink-0 px-3 pt-2.5 pb-2" style={{ borderBottom: "1px solid #1a2640" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-4 rounded-sm" style={{ background: "linear-gradient(180deg,#22d3ee,#0ea5e9)" }} />
                <span className="text-[11px] font-black tracking-[0.18em] text-white uppercase">Market Watch</span>
              </div>
              <button onClick={() => setShowPairSearch(p => !p)} className="p-1 rounded transition-colors text-slate-600 hover:text-slate-300">
                <Activity className="h-3.5 w-3.5" />
              </button>
            </div>
            {showPairSearch && (
              <input
                type="text" value={pairSearch} onChange={e => setPairSearch(e.target.value)}
                placeholder="Search instrument..."
                className="w-full price-mono text-xs text-white focus:outline-none px-2 py-1.5 rounded-lg mb-2"
                style={{ background: "#070a10", border: "1px solid #1e2d45" }}
              />
            )}
            <div className="flex gap-1">
              {categoryTabs.map(cat => {
                const isActive = activeCategory === cat
                const cc = cat === "All"
                  ? { text: "#94a3b8", border: "#334155", bg: "rgba(148,163,184,0.1)" }
                  : { text: CATEGORY_COLOR[cat as AssetCategory].text, border: CATEGORY_COLOR[cat as AssetCategory].border, bg: CATEGORY_COLOR[cat as AssetCategory].bg }
                const label = cat === "All" ? "All" : cat === "Commodities" ? "Au" : cat === "Forex" ? "FX" : cat
                return (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className="flex-1 py-1 text-[9px] font-black tracking-wider uppercase transition-all"
                    style={{ borderRadius: 4, background: isActive ? cc.bg : "transparent", color: isActive ? cc.text : "#374151", border: `1px solid ${isActive ? cc.border : "#1a2640"}` }}>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid shrink-0 px-3 py-1.5" style={{ gridTemplateColumns: "1fr 72px 52px", background: "#05080e", borderBottom: "1px solid #111827" }}>
            <span className="text-[8px] font-black tracking-[0.15em] uppercase" style={{ color: "#2d4565" }}>Instrument</span>
            <span className="text-[8px] font-black tracking-[0.15em] uppercase text-right" style={{ color: "#2d4565" }}>Bid / Ask</span>
            <span className="text-[8px] font-black tracking-[0.15em] uppercase text-right" style={{ color: "#2d4565" }}>Chg%</span>
          </div>

          <div className="flex-1 overflow-y-auto terminal-scroll">
            {loading ? (
              <div className="p-2 flex flex-col gap-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-11 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
                ))}
              </div>
            ) : (
              (() => {
                const cats: AssetCategory[] = ["Forex", "Commodities", "Crypto"]
                const toShow = activeCategory === "All" ? cats : [activeCategory as AssetCategory]
                return toShow.map(cat => {
                  const catPairs = filteredPairs.filter(p => PAIRS_CONFIG.find(c => c.symbol === p.symbol)?.category === cat)
                  if (catPairs.length === 0) return null
                  const cc = CATEGORY_COLOR[cat]
                  return (
                    <div key={cat}>
                      {activeCategory === "All" && (
                        <div className="flex items-center gap-2 px-3 py-1.5 sticky top-0 z-10"
                          style={{ background: "#06090f", borderBottom: `1px solid ${cc.border}22`, borderTop: "1px solid #111827" }}>
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cc.text, boxShadow: `0 0 6px ${cc.text}` }} />
                          <span className="text-[9px] font-black tracking-[0.2em] uppercase" style={{ color: cc.text }}>
                            {cat === "Commodities" ? "Precious Metals" : cat === "Forex" ? "Forex Majors" : "Cryptocurrency"}
                          </span>
                          <span className="text-[8px] ml-auto" style={{ color: "#2d4565" }}>{catPairs.length}</span>
                        </div>
                      )}
                      {catPairs.map(p => {
                        const up = p.change >= 0
                        const cfg = PAIRS_CONFIG.find(c => c.symbol === p.symbol)
                        const pCat = cfg?.category ?? "Forex"
                        const pCc = CATEGORY_COLOR[pCat]
                        const icon = ASSET_ICON[p.symbol]
                        const isSelected = selectedPair?.symbol === p.symbol
                        const base = p.symbol.split("/")[0]
                        const quote = p.symbol.split("/")[1]
                        // Show open trade badge
                        const hasTrade = openTrades.some(t => t.pair === p.symbol)
                        return (
                          <button key={p.symbol}
                            onClick={() => { setSelectedPair(p); fetchCandles(p.symbol, timeframe); setMobileTab("chart") }}
                            className="w-full mw-row"
                            style={{
                              background: isSelected ? `linear-gradient(90deg,${pCc.bg},rgba(0,0,0,0))` : "transparent",
                              borderLeft: isSelected ? `3px solid ${pCc.text}` : "3px solid transparent",
                              borderBottom: "1px solid #0d1525",
                              padding: "7px 12px 7px 10px",
                            }}>
                            <div className="grid items-center" style={{ gridTemplateColumns: "1fr 72px 52px", gap: 0 }}>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="mw-badge w-7 h-7 rounded flex items-center justify-center shrink-0 text-[10px] font-black relative"
                                  style={{ background: isSelected ? pCc.bg : "rgba(255,255,255,0.03)", border: `1px solid ${isSelected ? pCc.border : "#131d2e"}`, color: pCc.text }}>
                                  {icon ?? base.slice(0, 2)}
                                  {hasTrade && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-black leading-none" style={{ color: isSelected ? "#ffffff" : "#c8d4e4" }}>{base}</span>
                                    <span className="text-[9px] font-bold leading-none" style={{ color: "#3d5a7a" }}>/{quote}</span>
                                  </div>
                                  <div className="text-[8px] leading-none mt-0.5 truncate" style={{ color: "#2d4565" }}>{FULL_NAMES[p.symbol] ?? p.symbol}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="price-mono text-[10px] font-black leading-none" style={{ color: up ? "#10b981" : "#ef4444" }}>{fmt(p.bid, p.symbol)}</div>
                                <div className="price-mono text-[9px] leading-none mt-0.5" style={{ color: "#2d4565" }}>{fmt(p.ask, p.symbol)}</div>
                              </div>
                              <div className="text-right">
                                <div className="price-mono text-[10px] font-black leading-none" style={{ color: up ? "#10b981" : "#ef4444" }}>
                                  {up ? "+" : ""}{(p.change ?? 0).toFixed(2)}%
                                </div>
                                <div className="mt-1 h-0.5 w-full rounded-full overflow-hidden" style={{ background: "#111827" }}>
                                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.abs(p.change ?? 0) * 20)}%`, background: up ? "#10b981" : "#ef4444", marginLeft: up ? 0 : "auto" }} />
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )
                })
              })()
            )}
          </div>

          <div className="shrink-0 flex items-center justify-between px-3 py-2" style={{ borderTop: "1px solid #1a2640", background: "#05080e" }}>
            <span className="text-[9px] font-bold tracking-wider" style={{ color: "#2d4565" }}>{filteredPairs.length} instruments</span>
            <div className="flex items-center gap-1">
              {(["Forex", "Commodities", "Crypto"] as AssetCategory[]).map(cat => {
                const count = pairs.filter(p => PAIRS_CONFIG.find(c => c.symbol === p.symbol)?.category === cat).length
                return (
                  <span key={cat} className="text-[8px] font-black px-1.5 py-0.5 rounded"
                    style={{ background: CATEGORY_COLOR[cat].bg, color: CATEGORY_COLOR[cat].text, border: `1px solid ${CATEGORY_COLOR[cat].border}` }}>
                    {cat === "Commodities" ? "Au/Ag" : cat === "Forex" ? "FX" : "C"} {count}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── CENTER: Chart ──────────────────────────────────────────────────── */}
        <div className={`flex-1 flex flex-col min-w-0 ${mobileTab !== "chart" ? "hidden md:flex" : "flex"}`}>
          {/* Pair header */}
          {selectedPair ? (
            <div className="shrink-0 flex items-center gap-3 px-3 py-1.5" style={{ background: "#080c14", borderBottom: "1px solid #1e2d45" }}>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-black text-white tracking-wider">
                  {ASSET_ICON[selectedPair.symbol] && <span className="mr-1">{ASSET_ICON[selectedPair.symbol]}</span>}
                  {selectedPair.symbol}
                </span>
                {(() => {
                  const cat = PAIRS_CONFIG.find(c => c.symbol === selectedPair.symbol)?.category
                  if (!cat || cat === "Forex") return null
                  const cc = CATEGORY_COLOR[cat]
                  return <span className="text-[8px] font-black px-1 py-0.5 uppercase tracking-wider" style={{ background: cc.bg, color: cc.text, border: `1px solid ${cc.border}`, borderRadius: 3 }}>{cat}</span>
                })()}
              </div>
              <span className="bid-ask-price" style={{ color: isUp ? "#10b981" : "#ef4444" }}>{fmt(selectedPair.bid, selectedPair.symbol)}</span>
              <span className="price-mono text-sm font-bold" style={{ color: isUp ? "#10b981" : "#ef4444" }}>{isUp ? "+" : ""}{(selectedPair.change ?? 0).toFixed(2)}%</span>
              <div className="w-px h-6 mx-1" style={{ background: "#1e2d45" }} />
              <div className="flex items-center gap-3 text-[10px] price-mono overflow-x-auto terminal-scroll">
                <span className="text-slate-600 shrink-0">BID <span className="text-red-400 font-black">{fmt(selectedPair.bid, selectedPair.symbol)}</span></span>
                <span className="text-slate-600 shrink-0">ASK <span className="text-emerald-400 font-black">{fmt(selectedPair.ask, selectedPair.symbol)}</span></span>
                <span className="text-slate-600 shrink-0">SPR <span className="text-cyan-400 font-bold">{((selectedPair.spread / pip(selectedPair.symbol)) || 0).toFixed(1)}p</span></span>
                <span className="text-slate-600 shrink-0">H <span className="text-emerald-400 font-bold">{fmt(selectedPair.high, selectedPair.symbol)}</span></span>
                <span className="text-slate-600 shrink-0">L <span className="text-red-400 font-bold">{fmt(selectedPair.low, selectedPair.symbol)}</span></span>
                {lastCandle && <>
                  <span className="text-slate-700 mx-0.5">|</span>
                  <span className="text-slate-600 shrink-0">O<span className="text-slate-400 ml-0.5">{fmt(lastCandle.open, selectedPair.symbol)}</span></span>
                  <span className="text-emerald-600 shrink-0">H<span className="text-emerald-400 ml-0.5">{fmt(lastCandle.high, selectedPair.symbol)}</span></span>
                  <span className="text-red-600 shrink-0">L<span className="text-red-400 ml-0.5">{fmt(lastCandle.low, selectedPair.symbol)}</span></span>
                  <span className="shrink-0" style={{ color: lastCandle.close >= lastCandle.open ? "#10b981" : "#ef4444" }}>C<span className="ml-0.5">{fmt(lastCandle.close, selectedPair.symbol)}</span></span>
                </>}
              </div>
              {/* TF selector */}
              <div className="ml-auto flex items-center gap-1 shrink-0">
                {(["1M","5M","15M","1H","4H","1D"] as TimeFrame[]).map(tf => (
                  <button key={tf} onClick={() => setTimeframe(tf)}
                    className="px-2 py-0.5 text-[9px] font-black tracking-wider transition-all"
                    style={{ borderRadius: 3,
                      background: timeframe === tf ? "rgba(34,211,238,0.12)" : "transparent",
                      color: timeframe === tf ? "#22d3ee" : "#374151",
                      border: timeframe === tf ? "1px solid rgba(34,211,238,0.25)" : "1px solid transparent" }}>
                    {tf}
                  </button>
                ))}
                {candleLoading && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-1" />}
              </div>
            </div>
          ) : (
            <div className="shrink-0 flex items-center px-3 py-2 text-[11px] text-slate-700" style={{ background: "#080c14", borderBottom: "1px solid #1e2d45" }}>
              Select an instrument to begin trading
            </div>
          )}

          {/* Chart + BUY/SELL strip */}
          <div className="flex-1 min-h-0 flex flex-col" style={{ background: "#080c14" }}>
            <div className="flex-1 min-h-0">
              {selectedPair ? (
                <TradingChart
                  candles={selectedPair.candles}
                  sym={selectedPair.symbol}
                  tf={timeframe}
                  openTrades={openTrades.filter(t => t.pair === selectedPair.symbol)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <CandlestickChart className="h-12 w-12 text-slate-800" />
                  <p className="text-slate-700 text-sm font-bold tracking-wider">SELECT AN INSTRUMENT</p>
                </div>
              )}
            </div>

            {/* ── Quick BUY/SELL strip ── */}
            {selectedPair && (
              <div className="shrink-0 flex items-stretch gap-0" style={{ borderTop: "1px solid #1e2d45", height: 64 }}>
                {/* Trade params */}
                <div className="flex items-center gap-3 px-3 shrink-0" style={{ background: "#060a12", borderRight: "1px solid #1e2d45" }}>
                  <div className="text-center">
                    <p className="text-[8px] font-black tracking-widest uppercase mb-0.5" style={{ color: "#3d5a80" }}>LOTS</p>
                    <input type="number" value={lotSize} onChange={e => setLotSize(e.target.value)}
                      step="0.01" min="0.01" max="100"
                      className="price-mono text-base font-black text-white focus:outline-none text-center w-16"
                      style={{ background: "transparent", border: "none" }} />
                  </div>
                  <div className="w-px h-8" style={{ background: "#1e2d45" }} />
                  <div className="text-center">
                    <p className="text-[8px] font-black tracking-widest uppercase mb-0.5" style={{ color: "#3d5a80" }}>LEV</p>
                    <select value={leverage} onChange={e => setLeverage(e.target.value)}
                      className="price-mono text-base font-black text-cyan-400 focus:outline-none appearance-none w-14 cursor-pointer"
                      style={{ background: "transparent", border: "none" }}>
                      {["10","25","50","100","200","500"].map(l => (
                        <option key={l} value={l} style={{ background: "#080c14", color: "#22d3ee" }}>1:{l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-px h-8" style={{ background: "#1e2d45" }} />
                  <div className="text-center">
                    <p className="text-[8px] font-black tracking-widest uppercase mb-0.5" style={{ color: "#3d5a80" }}>MARGIN</p>
                    <p className="price-mono text-base font-black" style={{ color: "#f59e0b" }}>
                      ${isNaN(estimatedMargin) ? "—" : estimatedMargin.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* SELL button */}
                <button onClick={() => quickTrade("SELL")} disabled={balanceLoaded && estimatedMargin > walletBalance}
                  className="flex-1 flex flex-col items-center justify-center gap-1 font-black transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden"
                  style={{ background: "linear-gradient(160deg,#450a0a 0%,#7f1d1d 60%,#991b1b 100%)", borderRight: "1px solid #7f1d1d" }}>
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity" style={{ background: "rgba(239,68,68,0.08)" }} />
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-300" />
                    <span className="text-xl font-black tracking-widest text-white">SELL</span>
                  </div>
                  <span className="price-mono text-xs font-bold" style={{ color: "#fca5a5" }}>{fmt(selectedPair.bid, selectedPair.symbol)}</span>
                </button>

                {/* Spread divider */}
                <div className="flex flex-col items-center justify-center px-2 shrink-0" style={{ background: "#040710", borderRight: "1px solid #1e2d45", minWidth: 52 }}>
                  <span className="text-[7px] font-black tracking-[0.2em] uppercase mb-1" style={{ color: "#2d4565" }}>SPR</span>
                  <span className="price-mono text-[11px] font-black text-cyan-500">
                    {((selectedPair.spread / pip(selectedPair.symbol)) || 0).toFixed(1)}
                  </span>
                  <span className="text-[7px] font-bold" style={{ color: "#1e3a5f" }}>pips</span>
                </div>

                {/* BUY button */}
                <button onClick={() => quickTrade("BUY")} disabled={balanceLoaded && estimatedMargin > walletBalance}
                  className="flex-1 flex flex-col items-center justify-center gap-1 font-black transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden"
                  style={{ background: "linear-gradient(160deg,#052e16 0%,#065f46 60%,#047857 100%)" }}>
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity" style={{ background: "rgba(16,185,129,0.08)" }} />
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-300" />
                    <span className="text-xl font-black tracking-widest text-white">BUY</span>
                  </div>
                  <span className="price-mono text-xs font-bold" style={{ color: "#6ee7b7" }}>{fmt(selectedPair.ask, selectedPair.symbol)}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Order Ticket ────────────��────────────────────────────────── */}
        <div className={`flex flex-col shrink-0 ${mobileTab !== "order" ? "hidden md:flex" : "flex"}`}
          style={{ width: "min(224px,100%)", borderLeft: "1px solid #1e2d45", background: "#070b13" }}>

          {/* Right panel tab switcher */}
          <div className="flex shrink-0" style={{ borderBottom: "1px solid #1a2640" }}>
            {[{ id: "order", label: "Order", icon: Zap }, { id: "sizer", label: "Sizer", icon: Target }].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setRightPanelTab(id as typeof rightPanelTab)}
                className="flex-1 flex items-center justify-center gap-1 py-2 text-[9px] font-black tracking-wider uppercase transition-all"
                style={{
                  color: rightPanelTab === id ? "#22d3ee" : "#374151",
                  borderBottom: rightPanelTab === id ? "2px solid #22d3ee" : "2px solid transparent",
                  background: rightPanelTab === id ? "rgba(34,211,238,0.04)" : "transparent",
                }}>
                <Icon className="h-3 w-3" />{label}
              </button>
            ))}
          </div>

          {/* Order panel */}
          {rightPanelTab === "order" && selectedPair ? (
            <div className="flex-1 overflow-y-auto terminal-scroll">
              <div className="flex flex-col gap-0 p-2">

                {/* Order type tabs */}
                <div className="flex mb-2 overflow-hidden" style={{ borderRadius: 4, border: "1px solid #1e2d45", background: "#060a12" }}>
                  {(["market","limit","stop"] as typeof orderType[]).map(ot => (
                    <button key={ot} onClick={() => setOrderType(ot)}
                      className="flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all"
                      style={orderType === ot
                        ? { background: "rgba(34,211,238,0.1)", color: "#22d3ee", borderBottom: "2px solid #22d3ee" }
                        : { color: "#374151" }}>
                      {ot}
                    </button>
                  ))}
                </div>

                {/* BUY/SELL toggle */}
                <div className="flex mb-2 overflow-hidden" style={{ borderRadius: 4, border: "1px solid #1e2d45", background: "#060a12" }}>
                  {(["BUY","SELL"] as TradeDirection[]).map(d => (
                    <button key={d} onClick={() => setDirection(d)}
                      className="flex-1 py-2 text-xs font-black flex items-center justify-center gap-1 transition-all"
                      style={direction === d
                        ? d === "BUY"
                          ? { background: "linear-gradient(135deg,#065f46,#047857)", color: "#d1fae5", borderBottom: "2px solid #10b981" }
                          : { background: "linear-gradient(135deg,#7f1d1d,#b91c1c)", color: "#fee2e2", borderBottom: "2px solid #ef4444" }
                        : { color: "#374151" }}>
                      {d === "BUY" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {d}
                    </button>
                  ))}
                </div>

                {/* Symbol + price */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[10px] text-slate-500">{selectedPair.symbol}</span>
                  <span className="price-mono text-sm font-black" style={{ color: direction === "BUY" ? "#10b981" : "#ef4444" }}>
                    {fmt(direction === "BUY" ? selectedPair.ask : selectedPair.bid, selectedPair.symbol)}
                  </span>
                </div>

                {/* Pending price (only for limit/stop) */}
                {orderType !== "market" && (
                  <div className="mb-1.5">
                    <label className="text-[9px] font-bold tracking-widest uppercase block mb-1" style={{ color: "#22d3ee" }}>
                      {orderType === "limit" ? "Limit Price" : "Stop Price"}
                    </label>
                    <input type="number" value={pendingPrice} onChange={e => setPendingPrice(e.target.value)}
                      placeholder={fmt(midPrice, selectedPair.symbol)}
                      className="w-full price-mono text-sm font-black text-white focus:outline-none px-2 py-1.5"
                      style={{ background: "#070a10", border: "1px solid rgba(34,211,238,0.3)", borderRadius: 4 }} />
                    <div className="flex gap-1 mt-1">
                      {(["GTC","TODAY"] as PendingOrder["expiry"][]).map(e => (
                        <button key={e} onClick={() => setPendingExpiry(e)}
                          className="flex-1 py-1 text-[8px] font-black tracking-wider uppercase rounded transition-all"
                          style={pendingExpiry === e
                            ? { background: "rgba(34,211,238,0.1)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.25)" }
                            : { background: "#070a10", color: "#374151", border: "1px solid #1a2640" }}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Volume */}
                <div className="mb-1.5">
                  <label className="text-[9px] font-bold tracking-widest uppercase block mb-1 text-slate-600">Volume (Lots)</label>
                  <input type="number" value={lotSize} onChange={e => setLotSize(e.target.value)}
                    step="0.01" min="0.01" max="100"
                    className="w-full price-mono text-sm font-black text-white focus:outline-none px-2 py-1.5"
                    style={{ background: "#070a10", border: "1px solid #1e2d45", borderRadius: 4 }} />
                  <div className="flex gap-1 mt-1">
                    {["0.01","0.1","1.0"].map(l => (
                      <button key={l} onClick={() => setLotSize(l)}
                        className="flex-1 py-1 text-[8px] font-black tracking-wider rounded transition-all"
                        style={{ background: lotSize === l ? "rgba(167,139,250,0.15)" : "#070a10", color: lotSize === l ? "#a78bfa" : "#374151", border: `1px solid ${lotSize === l ? "rgba(167,139,250,0.3)" : "#1a2640"}` }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Leverage */}
                <div className="mb-1.5">
                  <label className="text-[9px] font-bold tracking-widest uppercase block mb-1 text-slate-600">Leverage</label>
                  <select value={leverage} onChange={e => setLeverage(e.target.value)}
                    className="w-full price-mono text-sm font-black text-white focus:outline-none px-2 py-1.5 appearance-none"
                    style={{ background: "#070a10", border: "1px solid #1e2d45", borderRadius: 4 }}>
                    {["10","25","50","100","200","500"].map(l => <option key={l} value={l} style={{ background: "#080c14" }}>1:{l}</option>)}
                  </select>
                </div>

                {/* SL */}
                <div className="mb-1.5">
                  <label className="text-[9px] font-bold tracking-widest uppercase mb-1 flex items-center gap-1" style={{ color: "#ef4444" }}>
                    <ShieldAlert className="h-2.5 w-2.5" /> Stop Loss
                    {slVal !== null && <span className="ml-auto text-[8px] text-slate-600 font-bold normal-case tracking-normal">{slPips.toFixed(1)}p · -${maxLoss.toFixed(2)}</span>}
                  </label>
                  <input type="number" value={sl} onChange={e => setSl(e.target.value)}
                    className="w-full price-mono text-sm text-white focus:outline-none px-2 py-1.5"
                    style={{ background: "#070a10", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 4 }}
                    placeholder={fmt(midPrice * (direction === "BUY" ? 0.9990 : 1.0010), selectedPair.symbol)} />
                </div>

                {/* TP */}
                <div className="mb-1.5">
                  <label className="text-[9px] font-bold tracking-widest uppercase mb-1 flex items-center gap-1" style={{ color: "#10b981" }}>
                    <Target className="h-2.5 w-2.5" /> Take Profit
                    {tpVal !== null && <span className="ml-auto text-[8px] text-slate-600 font-bold normal-case tracking-normal">{tpPips.toFixed(1)}p · +${maxGain.toFixed(2)}</span>}
                  </label>
                  <input type="number" value={tp} onChange={e => setTp(e.target.value)}
                    className="w-full price-mono text-sm text-white focus:outline-none px-2 py-1.5"
                    style={{ background: "#070a10", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 4 }}
                    placeholder={fmt(midPrice * (direction === "BUY" ? 1.0010 : 0.9990), selectedPair.symbol)} />
                </div>

                {/* Trailing Stop */}
                <div className="mb-2">
                  <label className="text-[9px] font-bold tracking-widest uppercase mb-1 flex items-center gap-1" style={{ color: "#a78bfa" }}>
                    <ArrowUpDown className="h-2.5 w-2.5" /> Trailing Stop (pips)
                  </label>
                  <input type="number" value={trailingPips} onChange={e => setTrailingPips(e.target.value)}
                    className="w-full price-mono text-sm text-white focus:outline-none px-2 py-1.5"
                    style={{ background: "#070a10", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 4 }}
                    placeholder="0 = disabled" />
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-2 gap-1 mb-2">
                  {[
                    { label: "Margin",    value: `$${isNaN(estimatedMargin) ? "—" : estimatedMargin.toLocaleString("en-US", { maximumFractionDigits: 2 })}`, color: "#f59e0b" },
                    { label: "Pip Value", value: `$${pipVal.toFixed(4)}`, color: "#22d3ee" },
                    { label: "Notional",  value: `$${((parseFloat(lotSize)||0.01)*contractSize(selectedPair.symbol)*midPrice).toLocaleString("en-US",{maximumFractionDigits:0})}`, color: "#a78bfa" },
                    { label: "Leverage",  value: `×${leverage}`, color: "#fb923c" },
                  ].map(item => (
                    <div key={item.label} className="px-2 py-1.5" style={{ background: "#070a10", border: "1px solid #1a2640", borderRadius: 3 }}>
                      <p className="text-[8px] text-slate-700 mb-0.5 tracking-wider uppercase">{item.label}</p>
                      <p className="price-mono text-[10px] font-black" style={{ color: item.color }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* R:R display */}
                {rrRatio !== null && (
                  <div className="mb-2 px-2 py-1.5 text-[10px]" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.18)", borderRadius: 3 }}>
                    {slVal !== null && <div className="flex justify-between"><span className="text-slate-600">Max Loss</span><span className="price-mono font-black text-red-400">-${maxLoss.toFixed(2)} ({slPips.toFixed(1)}p)</span></div>}
                    {tpVal !== null && <div className="flex justify-between"><span className="text-slate-600">Max Gain</span><span className="price-mono font-black text-emerald-400">+${maxGain.toFixed(2)} ({tpPips.toFixed(1)}p)</span></div>}
                    <div className="flex justify-between"><span className="text-slate-600">R:R</span><span className="price-mono font-black text-cyan-400">1:{rrRatio}</span></div>
                  </div>
                )}

                {/* Balance warning */}
                {balanceLoaded && estimatedMargin > walletBalance && (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 mb-2 text-[10px] font-bold"
                    style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", borderRadius: 3 }}>
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    Need ${estimatedMargin.toFixed(2)}
                  </div>
                )}

                {/* Execute */}
                <button onClick={executeTrade} disabled={balanceLoaded && estimatedMargin > walletBalance && orderType === "market"}
                  className="w-full py-2.5 font-black text-xs tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ borderRadius: 4,
                    ...(direction === "BUY"
                      ? { background: "linear-gradient(135deg,#065f46,#047857)", color: "#d1fae5", boxShadow: "0 4px 16px rgba(16,185,129,0.3)" }
                      : { background: "linear-gradient(135deg,#7f1d1d,#b91c1c)", color: "#fee2e2", boxShadow: "0 4px 16px rgba(239,68,68,0.3)" }) }}>
                  <Zap className="h-3.5 w-3.5" />
                  {orderType === "market" ? `${direction} ${selectedPair.symbol}` : `Place ${direction} ${orderType.toUpperCase()}`}
                </button>

                <div className="my-2" style={{ height: 1, background: "#1a2640" }} />

                {/* Quick trade */}
                <p className="text-[8px] font-black text-slate-700 tracking-widest uppercase mb-1.5">Quick Market Trade</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => quickTrade("BUY")} disabled={balanceLoaded && estimatedMargin > walletBalance}
                    className="flex flex-col items-center py-2 font-black text-xs transition-all active:scale-95 disabled:opacity-40"
                    style={{ borderRadius: 4, background: "linear-gradient(135deg,#065f46,#047857)", color: "#d1fae5", border: "1px solid #10b981" }}>
                    <div className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> BUY</div>
                    <span className="price-mono text-[9px] opacity-80">{fmt(selectedPair.ask, selectedPair.symbol)}</span>
                  </button>
                  <button onClick={() => quickTrade("SELL")} disabled={balanceLoaded && estimatedMargin > walletBalance}
                    className="flex flex-col items-center py-2 font-black text-xs transition-all active:scale-95 disabled:opacity-40"
                    style={{ borderRadius: 4, background: "linear-gradient(135deg,#7f1d1d,#b91c1c)", color: "#fee2e2", border: "1px solid #ef4444" }}>
                    <div className="flex items-center gap-1"><TrendingDown className="h-3 w-3" /> SELL</div>
                    <span className="price-mono text-[9px] opacity-80">{fmt(selectedPair.bid, selectedPair.symbol)}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : rightPanelTab === "order" ? (
            <div className="flex flex-col items-center justify-center flex-1 p-4 gap-2">
              <Activity className="h-8 w-8 text-slate-800" />
              <p className="text-[10px] text-slate-700 text-center">Select an instrument to place an order</p>
            </div>
          ) : null}

          {/* Position Sizer panel */}
          {rightPanelTab === "sizer" && selectedPair && (
            <div className="flex-1 overflow-y-auto terminal-scroll">
              <PositionSizer
                pair={selectedPair}
                leverage={parseFloat(leverage) || 100}
                walletBalance={walletBalance}
                onApply={lots => { setLotSize(lots); setRightPanelTab("order") }}
              />
            </div>
          )}
          {rightPanelTab === "sizer" && !selectedPair && (
            <div className="flex flex-col items-center justify-center flex-1 p-4 gap-2">
              <Target className="h-8 w-8 text-slate-800" />
              <p className="text-[10px] text-slate-700 text-center">Select an instrument first</p>
            </div>
          )}
        </div>
      </div>

      {/* ══ BOTTOM BLOTTER ════════════════════════════════════════════════════ */}
      <div className="flex flex-col shrink-0" style={{ height: 220, background: "#060a12", borderTop: "1px solid #1e2d45" }}>
        {/* Tab bar */}
        <div className="flex items-center shrink-0 overflow-x-auto terminal-scroll" style={{ borderBottom: "1px solid #1a2640", background: "#060a12" }}>
          {([
            { id: "positions",   label: `Open (${openTrades.length})`,      icon: Layers },
            { id: "pending",     label: `Pending (${pendingOrders.length})`, icon: Clock },
            { id: "history",     label: `History (${closedTrades.length})`,  icon: History },
            { id: "performance", label: "Performance",                        icon: BarChart },
            { id: "alerts",      label: `Alerts (${priceAlerts.filter(a=>!a.triggered).length})`, icon: Bell },
            { id: "sessions",    label: "Sessions",                           icon: Globe2 },
            { id: "depth",       label: "Depth",                              icon: BarChart2 },
            { id: "stats",       label: "Stats",                              icon: Activity },
          ] as { id: typeof activePanel; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActivePanel(id)}
              className="flex items-center gap-1.5 px-3 py-2 text-[9px] font-black tracking-wider uppercase transition-all shrink-0"
              style={activePanel === id
                ? { color: "#22d3ee", borderBottom: "2px solid #22d3ee", background: "rgba(34,211,238,0.04)" }
                : { color: "#374151", borderBottom: "2px solid transparent" }}>
              <Icon className="h-3 w-3" />{label}
            </button>
          ))}
        </div>

        {/* Blotter content */}
        <div className="flex-1 overflow-y-auto terminal-scroll">

          {/* ── Open Positions ── */}
          {activePanel === "positions" && (
            openTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-700">
                <BarChart2 className="h-8 w-8 opacity-20" />
                <span className="text-[11px] tracking-wider font-bold uppercase">No open positions</span>
              </div>
            ) : (
              <div className="p-2 flex flex-col gap-2">
                {openTrades.map(trade => {
                  const isBuy    = trade.direction === "BUY"
                  const pnlPos   = trade.pnl >= 0
                  const pnlClr   = pnlPos ? "#10b981" : "#ef4444"
                  const notional = parseFloat((trade.lotSize * contractSize(trade.pair) * trade.currentPrice).toFixed(2))
                  const liqPrice = calcLiquidationPrice(trade.pair, trade)
                  const duration = formatDuration(trade.openTimestamp)
                  const base     = trade.pair.split("/")[0]
                  const isCr     = isCrypto(trade.pair)
                  const isGd     = isGold(trade.pair)

                  return (
                    <div key={trade.id} className="rounded-xl price-mono text-[11px]"
                      style={{ background: "#0d1625", border: "1px solid #1a2a42" }}>
                      {/* Card header */}
                      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid #1a2a42" }}>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full font-black text-[10px]"
                            style={{ background: isGd ? "#b45309" : isCr ? "#1d4ed8" : "#0f4c81", color: "#fff" }}>
                            {ASSET_ICON[trade.pair] ?? base.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-white text-[13px]">{trade.pair}</span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase"
                                style={{ background: isBuy ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: isBuy ? "#10b981" : "#ef4444" }}>
                                {trade.direction}
                              </span>
                              <span className="text-[9px] font-bold text-amber-500">×{trade.leverage}</span>
                            </div>
                            <span className="text-[9px] text-slate-600">{trade.lotSize} Lot · {duration}</span>
                          </div>
                        </div>
                        {/* PnL big display */}
                        <div className="text-right">
                          <p className="text-[20px] font-black leading-none" style={{ color: pnlClr }}>
                            {pnlPos ? "+" : ""}{trade.pnl.toFixed(2)}
                          </p>
                          <p className="text-[9px]" style={{ color: pnlClr }}>{trade.pips >= 0 ? "+" : ""}{trade.pips.toFixed(1)} pips</p>
                          <p className="text-[9px] text-slate-600">ROE: <span style={{ color: pnlClr }}>{trade.returnOnMargin >= 0 ? "+" : ""}{trade.returnOnMargin.toFixed(2)}%</span></p>
                        </div>
                      </div>

                      {/* Price levels row */}
                      <div className="grid grid-cols-4 px-3 py-2 gap-2" style={{ borderBottom: "1px solid #1a2a42" }}>
                        <div><p className="text-[8px] text-slate-600 mb-0.5">Entry</p><p className="font-bold text-slate-300">{fmt(trade.openPrice, trade.pair)}</p></div>
                        <div><p className="text-[8px] text-slate-600 mb-0.5">Mark</p><p className="font-black" style={{ color: pnlClr }}>{fmt(trade.currentPrice, trade.pair)}</p></div>
                        <div><p className="text-[8px] text-slate-600 mb-0.5">Liq.</p><p className="font-bold text-orange-400">{fmt(liqPrice, trade.pair)}</p></div>
                        <div className="text-right"><p className="text-[8px] text-slate-600 mb-0.5">Margin</p><p className="font-bold text-amber-400">${trade.margin.toFixed(2)}</p></div>
                      </div>

                      {/* SL/TP/Trailing/Swap row */}
                      <div className="grid grid-cols-4 px-3 py-2 gap-2" style={{ borderBottom: "1px solid #1a2a42" }}>
                        <div>
                          <p className="text-[8px] text-slate-600 mb-0.5">SL</p>
                          <p className="font-bold text-red-400 text-[11px]">{trade.sl ? fmt(trade.sl, trade.pair) : "—"}</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-slate-600 mb-0.5">TP</p>
                          <p className="font-bold text-emerald-400 text-[11px]">{trade.tp ? fmt(trade.tp, trade.pair) : "—"}</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-slate-600 mb-0.5">Trail</p>
                          <p className="font-bold text-violet-400 text-[11px]">
                            {trade.trailingStopPips ? `${trade.trailingStopPips}p` : "—"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] text-slate-600 mb-0.5">Swap</p>
                          <p className="font-bold text-[11px]" style={{ color: trade.swap >= 0 ? "#10b981" : "#ef4444" }}>
                            {trade.swap >= 0 ? "+" : ""}{trade.swap.toFixed(4)}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1.5 px-3 py-2">
                        <button
                          onClick={() => setModifyTarget({ tradeId: trade.id, sl: trade.sl?.toString() ?? "", tp: trade.tp?.toString() ?? "", trailingPips: trade.trailingStopPips?.toString() ?? "" })}
                          className="flex-1 py-2 rounded-lg font-black text-[11px] transition-all active:scale-95 flex items-center justify-center gap-1"
                          style={{ background: "rgba(34,211,238,0.08)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.2)" }}>
                          <Edit3 className="h-3 w-3" /> Modify
                        </button>
                        <button
                          onClick={() => closeTrade(trade.id)}
                          className="flex-1 py-2 rounded-lg font-black text-[11px] transition-all active:scale-95 flex items-center justify-center gap-1"
                          style={{
                            background: trade.pnl >= 0 ? "linear-gradient(135deg,#065f46,#059669)" : "linear-gradient(135deg,#7f1d1d,#dc2626)",
                            color: "#fff",
                            border: `1px solid ${trade.pnl >= 0 ? "#059669" : "#dc2626"}`,
                          }}>
                          <X className="h-3 w-3" /> Close {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {/* ── Pending Orders ── */}
          {activePanel === "pending" && (
            pendingOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-700">
                <Clock className="h-8 w-8 opacity-20" />
                <span className="text-[11px] tracking-wider font-bold uppercase">No pending orders</span>
              </div>
            ) : (
              <div className="p-2 flex flex-col gap-2">
                {pendingOrders.map(o => {
                  const isBuy = o.direction === "BUY"
                  return (
                    <div key={o.id} className="rounded-xl price-mono text-[11px]"
                      style={{ background: "#0d1625", border: "1px solid #1a2a42" }}>
                      <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: "1px solid #1a2a42" }}>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="font-black text-white text-[13px]">{o.pair}</span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase"
                                style={{ background: isBuy ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: isBuy ? "#10b981" : "#ef4444" }}>
                                {o.direction}
                              </span>
                              <span className="text-[9px] font-black px-1 py-0.5 rounded" style={{ background: "rgba(34,211,238,0.1)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.2)" }}>
                                {o.orderType.replace("_"," ")}
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-600">{o.lotSize} Lot · ×{o.leverage} · {o.expiry} · {o.createdTime}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-slate-600 mb-0.5">Target</p>
                          <p className="price-mono font-black text-cyan-400 text-sm">{fmt(o.targetPrice, o.pair)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 px-3 py-2 gap-2" style={{ borderBottom: "1px solid #1a2a42" }}>
                        <div><p className="text-[8px] text-slate-600 mb-0.5">SL</p><p className="font-bold text-red-400">{o.sl ? fmt(o.sl, o.pair) : "—"}</p></div>
                        <div><p className="text-[8px] text-slate-600 mb-0.5">TP</p><p className="font-bold text-emerald-400">{o.tp ? fmt(o.tp, o.pair) : "—"}</p></div>
                        <div className="text-right">
                          <p className="text-[8px] text-slate-600 mb-0.5">Margin</p>
                          <p className="font-bold text-amber-400">${calcMargin(o.pair, o.lotSize, o.targetPrice, o.leverage).toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="px-3 py-2">
                        <button onClick={() => cancelPending(o.id)}
                          className="w-full py-2 rounded-lg font-black text-[11px] transition-all active:scale-95 flex items-center justify-center gap-1"
                          style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                          <X className="h-3 w-3" /> Cancel Order
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {/* ── Trade History ── */}
          {activePanel === "history" && (
            closedTrades.length === 0 ? (
              <div className="flex items-center justify-center h-full gap-2 text-slate-700">
                <History className="h-5 w-5 opacity-30" />
                <span className="text-[11px] tracking-wider">No closed trades yet</span>
              </div>
            ) : (
              <table className="w-full text-[10px] price-mono">
                <thead>
                  <tr style={{ background: "#070a10", borderBottom: "1px solid #1a2640" }}>
                    {["Symbol","Dir","Lots","Entry","Exit","P&L","Pips","Swap","Duration","Reason"].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left text-[8px] font-bold tracking-widest text-slate-700 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {closedTrades.slice(0, 100).map(trade => {
                    const pc = trade.finalPnl >= 0 ? "#10b981" : "#ef4444"
                    const reasonColors: Record<string, string> = { manual: "#94a3b8", sl: "#ef4444", tp: "#10b981", trailing_sl: "#a78bfa" }
                    return (
                      <tr key={trade.id} className="border-b hover:bg-white/[0.015] transition-colors" style={{ borderColor: "#0f1a2e" }}>
                        <td className="px-2 py-1.5 font-black text-white">{trade.pair}</td>
                        <td className="px-2 py-1.5">
                          <span className="px-1.5 py-0.5 font-black text-[8px] uppercase rounded"
                            style={{ background: trade.direction === "BUY" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: trade.direction === "BUY" ? "#10b981" : "#ef4444" }}>
                            {trade.direction}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-slate-400">{trade.lotSize}</td>
                        <td className="px-2 py-1.5 text-slate-400">{fmt(trade.openPrice, trade.pair)}</td>
                        <td className="px-2 py-1.5 text-slate-400">{fmt(trade.closePrice, trade.pair)}</td>
                        <td className="px-2 py-1.5 font-black" style={{ color: pc }}>{trade.finalPnl >= 0 ? "+" : ""}${trade.finalPnl.toFixed(2)}</td>
                        <td className="px-2 py-1.5 font-bold" style={{ color: pc }}>{trade.finalPips >= 0 ? "+" : ""}{trade.finalPips.toFixed(1)}</td>
                        <td className="px-2 py-1.5" style={{ color: trade.finalSwap >= 0 ? "#10b981" : "#ef4444" }}>{trade.finalSwap >= 0 ? "+" : ""}{trade.finalSwap.toFixed(4)}</td>
                        <td className="px-2 py-1.5 text-slate-600">{trade.closeDuration}</td>
                        <td className="px-2 py-1.5">
                          <span className="px-1.5 py-0.5 text-[8px] font-black uppercase rounded"
                            style={{ background: `${reasonColors[trade.closeReason]}18`, color: reasonColors[trade.closeReason], border: `1px solid ${reasonColors[trade.closeReason]}30` }}>
                            {trade.closeReason.replace("_"," ")}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )
          )}

          {/* ── Order Depth ── */}
          {activePanel === "depth" && (
            selectedPair
              ? <div className="p-3"><OrderDepth pair={selectedPair} /></div>
              : <div className="flex items-center justify-center h-full text-slate-700 text-[11px] tracking-wider">Select an instrument</div>
          )}

          {/* ── Market Stats ── */}
          {activePanel === "stats" && (
            selectedPair
              ? <MarketStats pair={selectedPair} />
              : <div className="flex items-center justify-center h-full text-slate-700 text-[11px] tracking-wider">Select an instrument</div>
          )}

          {/* ── Performance Dashboard ── */}
          {activePanel === "performance" && (
            <PerformanceDashboard
              closed={closedTrades}
              equityHistory={equityHistory}
              walletBalance={walletBalance}
            />
          )}

          {/* ── Price Alerts ── */}
          {activePanel === "alerts" && (
            <PriceAlertPanel
              alerts={priceAlerts}
              pairs={pairs}
              onAdd={addPriceAlert}
              onRemove={removePriceAlert}
            />
          )}

          {/* ── Market Sessions ── */}
          {activePanel === "sessions" && <MarketSessionsPanel />}

        </div>
      </div>

      {/* ── Trade Confirmation Modal ──���────────────────────────────────────────── */}
      {tradeConfirm && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(2,6,15,0.82)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !confirmLoading) setTradeConfirm(null) }}
        >
          <div
            className="relative flex flex-col rounded-2xl overflow-hidden"
            style={{
              width: "min(420px, 94vw)",
              background: "linear-gradient(160deg, #07101e 0%, #040c18 100%)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: `0 0 60px ${tradeConfirm.direction === "BUY" ? "rgba(16,185,129,0.18)" : "rgba(239,68,68,0.18)"}`,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{
                background: tradeConfirm.direction === "BUY"
                  ? "linear-gradient(90deg, rgba(16,185,129,0.15) 0%, transparent 100%)"
                  : "linear-gradient(90deg, rgba(239,68,68,0.15) 0%, transparent 100%)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-xl"
                  style={{
                    background: tradeConfirm.direction === "BUY" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                    border: `1px solid ${tradeConfirm.direction === "BUY" ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)"}`,
                  }}
                >
                  {tradeConfirm.direction === "BUY"
                    ? <TrendingUp className="h-5 w-5 text-emerald-400" />
                    : <TrendingDown className="h-5 w-5 text-red-400" />
                  }
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded"
                      style={{
                        background: tradeConfirm.direction === "BUY" ? "rgba(16,185,129,0.18)" : "rgba(239,68,68,0.18)",
                        color: tradeConfirm.direction === "BUY" ? "#10b981" : "#ef4444",
                      }}
                    >
                      {tradeConfirm.isPending
                        ? (tradeConfirm.pendingOrderType?.replace("_", " ") ?? "PENDING")
                        : tradeConfirm.direction}
                    </span>
                    <span className="text-white font-black text-[15px] tracking-wide">{tradeConfirm.pair}</span>
                  </div>
                  <p className="text-[10px]" style={{ color: "rgba(148,163,184,0.6)" }}>
                    Review order details before placing
                  </p>
                </div>
              </div>
              <button
                onClick={() => { if (!confirmLoading) setTradeConfirm(null) }}
                className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:bg-white/10"
                style={{ color: "rgba(148,163,184,0.6)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Order summary grid */}
            <div className="px-5 py-4 grid grid-cols-2 gap-2.5">
              {[
                {
                  label: "Entry Price",
                  value: tradeConfirm.isPending && tradeConfirm.pendingPrice
                    ? fmt(tradeConfirm.pendingPrice, tradeConfirm.pair)
                    : fmt(tradeConfirm.price, tradeConfirm.pair),
                  color: tradeConfirm.direction === "BUY" ? "#10b981" : "#ef4444",
                },
                { label: "Lot Size", value: `${tradeConfirm.lotSize} L`, color: "#f8fafc" },
                { label: "Leverage", value: `1:${tradeConfirm.leverage}`, color: "#f8fafc" },
                { label: "Pip Value", value: `$${tradeConfirm.pipVal.toFixed(4)} / pip`, color: "#94a3b8" },
                {
                  label: "Stop Loss",
                  value: tradeConfirm.sl ? fmt(tradeConfirm.sl, tradeConfirm.pair) : "None",
                  color: tradeConfirm.sl ? "#ef4444" : "#475569",
                },
                {
                  label: "Take Profit",
                  value: tradeConfirm.tp ? fmt(tradeConfirm.tp, tradeConfirm.pair) : "None",
                  color: tradeConfirm.tp ? "#10b981" : "#475569",
                },
                {
                  label: "Trailing Stop",
                  value: tradeConfirm.trailingPips ? `${tradeConfirm.trailingPips} pips` : "None",
                  color: tradeConfirm.trailingPips ? "#f59e0b" : "#475569",
                },
                {
                  label: "Liq. Price",
                  value: fmt(tradeConfirm.liqPrice, tradeConfirm.pair),
                  color: "#f97316",
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="flex flex-col gap-1 px-3 py-2.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "rgba(148,163,184,0.5)" }}>{label}</span>
                  <span className="text-[12px] font-black price-mono" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Margin block */}
            <div
              className="mx-5 mb-3 rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: "rgba(245,158,11,0.65)" }}>
                  Margin Required
                </span>
                <span className="text-[20px] font-black price-mono" style={{ color: "#f59e0b" }}>
                  ${tradeConfirm.margin.toFixed(2)}
                </span>
                <span className="text-[9px]" style={{ color: "rgba(148,163,184,0.45)" }}>
                  Locked from balance until trade closes
                </span>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div className="text-right">
                  <div className="text-[8px] font-bold tracking-wider mb-0.5" style={{ color: "rgba(148,163,184,0.5)" }}>BALANCE BEFORE</div>
                  <div className="text-[12px] font-black price-mono text-white">${walletBalance.toFixed(2)}</div>
                </div>
                <div style={{ color: "rgba(245,158,11,0.6)", lineHeight: 1 }}>↓</div>
                <div className="text-right">
                  <div className="text-[8px] font-bold tracking-wider mb-0.5" style={{ color: "rgba(148,163,184,0.5)" }}>BALANCE AFTER</div>
                  <div
                    className="text-[12px] font-black price-mono"
                    style={{ color: (walletBalance - tradeConfirm.margin) >= 0 ? "#10b981" : "#ef4444" }}
                  >
                    ${Math.max(0, walletBalance - tradeConfirm.margin).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Low free margin warning */}
            {(walletBalance - tradeConfirm.margin) < tradeConfirm.margin * 0.5 && walletBalance > tradeConfirm.margin && (
              <div
                className="mx-5 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)" }}
              >
                <AlertTriangle className="h-3 w-3 shrink-0 text-red-400" />
                <span className="text-[9px] font-bold leading-tight" style={{ color: "#f87171" }}>
                  Low free margin after this trade. Consider reducing lot size.
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => { if (!confirmLoading) setTradeConfirm(null) }}
                disabled={confirmLoading}
                className="flex-1 py-3 rounded-xl font-black text-[12px] tracking-wider transition-all hover:bg-white/10 disabled:opacity-40"
                style={{ border: "1px solid rgba(255,255,255,0.09)", color: "rgba(148,163,184,0.75)" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmAndPlace}
                disabled={confirmLoading}
                className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-black text-[12px] tracking-wider transition-all active:scale-95 disabled:opacity-60"
                style={{
                  flex: 2,
                  background: tradeConfirm.direction === "BUY"
                    ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
                    : "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
                  boxShadow: tradeConfirm.direction === "BUY"
                    ? "0 4px 24px rgba(16,185,129,0.35)"
                    : "0 4px 24px rgba(239,68,68,0.35)",
                  color: "#fff",
                }}
              >
                {confirmLoading
                  ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Placing...</>
                  : tradeConfirm.direction === "BUY"
                    ? <><TrendingUp className="h-3.5 w-3.5" /> {tradeConfirm.isPending ? `Place ${tradeConfirm.pendingOrderType?.replace("_"," ")}` : "Confirm BUY"}</>
                    : <><TrendingDown className="h-3.5 w-3.5" /> {tradeConfirm.isPending ? `Place ${tradeConfirm.pendingOrderType?.replace("_"," ")}` : "Confirm SELL"}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
