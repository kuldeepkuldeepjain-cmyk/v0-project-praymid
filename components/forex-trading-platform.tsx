"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"

import { createPortal } from "react-dom"
import {
  TrendingUp, TrendingDown, RefreshCw, BarChart2, AlertTriangle, BrainCircuit,
  CheckCircle2, History, Layers, Activity, Zap, Target, ShieldAlert, ShieldCheck,
  CandlestickChart, Wallet, Edit3, X, Plus, Clock, Info, Bell,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ArrowUpDown, Award, Flame, TrendingUp as TUp,
  BarChart, LineChart, PieChart, Trophy, AlarmClock, Globe2, Newspaper,
  Gauge, Lock, Unlock, BookOpen, Filter, Sun, Moon, Check, Search,
  Command, Grid3x3, Square, BellRing, MessageCircle, Headphones, Ticket, LockKeyhole, FileCheck2,
  HelpCircle, LifeBuoy, Send, Wrench, UserRound, CreditCard, Settings, LogOut,
  ArrowUpRight, ArrowDownRight, Home,
} from "lucide-react"
import { TradingChart } from "@/components/trading-chart"
import { ErrorBoundary } from "@/components/error-boundary"
import { normalizeTimestamp } from "@/lib/normalize-timestamp"
import { clearParticipantAuth, participantFetch } from "@/lib/auth"
import { getFundedBaseAmount, getFundedMinimumBalance } from "@/lib/funded-account"
import {
  PAIRS_CONFIG, TYPICAL_SPREADS, SWAP_RATES, FULL_NAMES, ASSET_ICON, SEED_PRICES,
  isJpy, isCrypto, isGold, isSilver, isCommodity, decimals, pip, contractSize,
  type AssetCategory,
} from "@/lib/forex-instruments"
import {
  DepthOfMarketLadder, RiskAnalyticsPanel, NewsCalendarPanel,
  TradeJournalPanel, CommandPalette, useTradingHotkeys,
  MiniChartGrid, ConnectionStatus,
} from "@/components/forex-institutional"
import { ForexHeader } from "@/components/forex-header"
import { AssetLogo } from "@/components/asset-logo"
import { PortfolioActivityView } from "@/components/portfolio-activity-view"
import { useMarketDataStream } from "@/hooks/use-market-data-stream"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react"

// ─── Workspace layout (UI preferences only — never market or account data) ──

const DOCK_AUTOSAVE_ID = "elitefund-terminal-columns-v1"
const BLOTTER_HEIGHT_KEY = "elitefund-terminal-blotter-height"
const TAB_ORDER_KEY = "elitefund-terminal-tab-order"
const MIN_BLOTTER_HEIGHT = 150

function DockGroup({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  if (!enabled) return <>{children}</>
  return (
    <PanelGroup direction="horizontal" autoSaveId={DOCK_AUTOSAVE_ID} className="terminal-dock-group">
      {children}
    </PanelGroup>
  )
}

function DockPanel({ enabled, id, order, defaultSize, minSize, maxSize, children }: {
  enabled: boolean; id: string; order: number; defaultSize: number; minSize: number; maxSize?: number; children: ReactNode
}) {
  if (!enabled) return <>{children}</>
  return (
    <Panel id={id} order={order} defaultSize={defaultSize} minSize={minSize} maxSize={maxSize} className="terminal-dock-panel">
      {children}
    </Panel>
  )
}

function DockHandle({ enabled }: { enabled: boolean }) {
  if (!enabled) return null
  return (
    <PanelResizeHandle className="terminal-dock-handle">
      <span aria-hidden="true" />
    </PanelResizeHandle>
  )
}

function applyTabOrder<T extends { id: string }>(items: T[], order: string[]): T[] {
  if (!order.length) return items
  const rank = (id: string) => {
    const saved = order.indexOf(id)
    return saved === -1 ? order.length + items.findIndex(item => item.id === id) : saved
  }
  return [...items].sort((a, b) => rank(a.id) - rank(b.id))
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type Candle = {
  time: string; open: number; high: number; low: number; close: number; volume: number; ts?: number
}

export type ForexPair = {
  symbol: string; base: string; quote: string
  bid: number; ask: number; change: number; high: number; low: number; open: number
  candles: Candle[]; spread: number
}

export type TradeDirection = "BUY" | "SELL"

export type OpenTrade = {
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

export type PendingOrder = {
  id: string; pair: string; direction: TradeDirection
  orderType: "BUY_LIMIT" | "BUY_STOP" | "SELL_LIMIT" | "SELL_STOP"
  lotSize: number; leverage: number
  targetPrice: number; sl: number | null; tp: number | null
  createdTime: string
  createdTimestamp?: number
  expiry: "GTC" | "TODAY"           // Good Till Cancel or expire end of day
}

export type ClosedTrade = OpenTrade & {
  closePrice: number; closeTime: string; closeDuration: string
  finalPnl: number; finalPips: number; finalSwap: number
  closeReason: "manual" | "sl" | "tp" | "trailing_sl" | "stop_out" | "account_breach"
}

type TimeFrame = "1M" | "5M" | "15M" | "30M" | "1H" | "4H" | "1D" | "1W"

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

type SmartAlertStatus = "clear" | "warning" | "triggered" | "monitoring"

type SmartAlertItem = {
  id: string
  label: string
  description: string
  status: SmartAlertStatus
  value: string
  threshold: string
  icon: any
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
// PAIRS_CONFIG, TYPICAL_SPREADS, SWAP_RATES, FULL_NAMES, ASSET_ICON, and the
// isJpy/isCrypto/isGold/isSilver/isCommodity/decimals/pip/contractSize helpers
// live in @/lib/forex-instruments so the UI and the rates/candles API routes
// share one instrument catalog.

const CATEGORY_COLOR: Record<AssetCategory, { bg: string; text: string; border: string }> = {
  Forex:       { bg: "rgba(34,211,238,0.1)",  text: "#22d3ee", border: "rgba(34,211,238,0.25)" },
  Commodities: { bg: "rgba(251,191,36,0.1)",  text: "#fbbf24", border: "rgba(251,191,36,0.25)" },
  Crypto:      { bg: "rgba(167,139,250,0.1)", text: "#a78bfa", border: "rgba(167,139,250,0.25)" },
}

function fmt(price: number | null | undefined, sym: string): string {
  if (price == null || !isFinite(price)) return "—"
  return price.toFixed(decimals(sym))
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
  if (!Number.isFinite(currentPrice) || currentPrice <= 0 || !Number.isFinite(lots) || lots <= 0) return 0
  const cs   = contractSize(sym)
  const ps   = pip(sym)
  const base = (sym || "").split("/")[0]

  if (base === "USD") {
    return (lots * cs * ps) / currentPrice
  }
  return lots * cs * ps
}

function calcPnl(trade: { direction: TradeDirection; openPrice: number; lotSize: number; leverage: number }, currentPrice: number, sym: string): {
  pnl: number; pipCount: number; returnOnMargin: number; margin: number
} {
  if (!trade || !Number.isFinite(currentPrice) || currentPrice <= 0) {
    return { pnl: 0, pipCount: 0, returnOnMargin: 0, margin: 0 }
  }
  const dir       = trade.direction === "BUY" ? 1 : -1
  const openPrice = Number.isFinite(trade.openPrice) && trade.openPrice > 0 ? trade.openPrice : currentPrice
  const priceDiff = (currentPrice - openPrice) * dir
  const ps        = pip(sym)
  const pipCount  = ps > 0 ? priceDiff / ps : 0

  const pv     = pipValue(sym, trade.lotSize, currentPrice)
  const pnlVal = pipCount * pv
  const pnl    = Number.isFinite(pnlVal) ? parseFloat(pnlVal.toFixed(2)) : 0

  const marginVal = calcMargin(sym, trade.lotSize, openPrice, trade.leverage)
  const margin    = Number.isFinite(marginVal) ? marginVal : 0

  const returnOnMargin = margin > 0 ? parseFloat(((pnl / margin) * 100).toFixed(2)) : 0
  return { pnl, pipCount: Number.isFinite(pipCount) ? parseFloat(pipCount.toFixed(1)) : 0, returnOnMargin: Number.isFinite(returnOnMargin) ? returnOnMargin : 0, margin }
}

function defaultLotsForOrderValue(sym: string, price: number, targetValue = 3000): string {
  const safePrice = Number.isFinite(price) && price > 0 ? price : 1
  const size = contractSize(sym)
  const isUsdBase = (sym || "").startsWith("USD/")
  const rawLots = isUsdBase ? targetValue / size : targetValue / (size * safePrice)
  const lots = Math.max(0.01, Math.min(100, Math.round(rawLots * 100) / 100))
  return lots.toFixed(2)
}

function calcMargin(sym: string, lots: number, price: number, leverage: number): number {
  const safeLev   = Number.isFinite(leverage) && leverage > 0 ? leverage : 100
  const safeLots  = Number.isFinite(lots) && lots > 0 ? lots : 0.01
  const safePrice = Number.isFinite(price) && price > 0 ? price : 1
  const cs        = contractSize(sym)
  const base      = (sym || "").split("/")[0]
  const notional  = base === "USD" ? safeLots * cs : safeLots * cs * safePrice
  return notional / safeLev
}

function minimumLotsForMargin(sym: string, price: number, leverage: number, minimumMargin: number): number {
  const marginPerLot = calcMargin(sym, 1, price, leverage)
  if (!Number.isFinite(marginPerLot) || marginPerLot <= 0) return 0.01
  return Math.max(0.01, Math.ceil((minimumMargin / marginPerLot) * 100) / 100)
}

function playTerminalSound(type: "buy" | "sell" | "close" | "breakeven" | "alert" | "click") {
  if (typeof window === "undefined") return
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    const now = ctx.currentTime
    if (type === "buy") {
      osc.type = "sine"
      osc.frequency.setValueAtTime(587.33, now)
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12)
      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      osc.start(now)
      osc.stop(now + 0.15)
    } else if (type === "sell") {
      osc.type = "sine"
      osc.frequency.setValueAtTime(783.99, now)
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.12)
      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      osc.start(now)
      osc.stop(now + 0.15)
    } else if (type === "close") {
      osc.type = "triangle"
      osc.frequency.setValueAtTime(659.25, now)
      osc.frequency.setValueAtTime(523.25, now + 0.08)
      gain.gain.setValueAtTime(0.07, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
      osc.start(now)
      osc.stop(now + 0.18)
    } else if (type === "breakeven") {
      osc.type = "sine"
      osc.frequency.setValueAtTime(523.25, now)
      osc.frequency.setValueAtTime(659.25, now + 0.06)
      osc.frequency.setValueAtTime(783.99, now + 0.12)
      gain.gain.setValueAtTime(0.06, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
      osc.start(now)
      osc.stop(now + 0.22)
    } else if (type === "alert") {
      osc.type = "square"
      osc.frequency.setValueAtTime(880, now)
      gain.gain.setValueAtTime(0.05, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
      osc.start(now)
      osc.stop(now + 0.2)
    }
  } catch {
    // Audio synthesis fallback
  }
}

function calcLiquidationPrice(sym: string, trade: OpenTrade): number {
  // Liq price = entry ± (margin / (lots × contractSize)) depending on direction
  // This is a simplified model (ignores multi-position netting)
  const cs = contractSize(sym)
  const lots = Number(trade.lotSize)
  const margin = Number(trade.margin)
  const openPrice = Number(trade.openPrice)
  if (!Number.isFinite(cs) || cs <= 0 || !Number.isFinite(lots) || lots <= 0 || !Number.isFinite(margin) || !Number.isFinite(openPrice)) return 0
  const dir = trade.direction === "BUY" ? -1 : 1
  const liqMove = margin / (lots * cs)
  return parseFloat((openPrice + dir * liqMove).toFixed(decimals(sym)))
}

// ATR (Average True Range) — used for position sizing suggestions
function calcATR(candles: Candle[], period = 14): number {
  if (!Array.isArray(candles) || candles.length < period + 1) return 0
  const trs: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1]
    if (!c || !p) continue
    const cHigh = Number(c.high), cLow = Number(c.low), pClose = Number(p.close)
    if (![cHigh, cLow, pClose].every(Number.isFinite)) continue
    trs.push(Math.max(cHigh - cLow, Math.abs(cHigh - pClose), Math.abs(cLow - pClose)))
  }
  if (trs.length === 0) return 0
  const recent = trs.slice(-period)
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length
  return Number.isFinite(avg) ? avg : 0
}

// Duration string from timestamp to now
function formatDuration(openTimestamp: number): string {
  const timestamp = Number(openTimestamp)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "—"
  const ms = Math.max(0, Date.now() - timestamp)
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

// ─── Trading Sessions (UTC hours) �����������─────��────────────────────────────��������────────
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

// ─── Performance Dashboard ──────────────────────────────────────────────────��

function TrustCenterPanel({ isFundedAccount, walletBalance, online }: { isFundedAccount: boolean; walletBalance: number; online: boolean }) {
  const protections = [
    { label: "Account data", detail: "Protected session and scoped account access", icon: LockKeyhole },
    { label: "Trade controls", detail: "Orders pass server-side risk validation", icon: ShieldCheck },
    { label: "Execution status", detail: online ? "Market connection is currently online" : "Connection needs attention", icon: Activity },
    { label: "Account rules", detail: isFundedAccount ? "Funded-account limits are active" : "Standard account rules are active", icon: FileCheck2 },
  ]

  return <div className="flex h-full flex-col overflow-y-auto terminal-scroll p-3" style={{ background: "#070d18" }}>
    <div className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-[#10283b] to-[#0a1322] p-4">
      <div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/10"><ShieldCheck className="size-5 text-cyan-200" /></div><div><p className="text-[12px] font-black uppercase tracking-[.14em] text-white">Trust & account protection</p><p className="mt-1 text-[10px] leading-relaxed text-slate-400">Clear controls, visible account rules, and support when you need it.</p></div></div>
      <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-3"><p className="text-[9px] uppercase tracking-wider text-slate-500">Account equity</p><p className="mt-1 price-mono text-sm font-black text-white">${walletBalance.toFixed(2)}</p></div><div className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-3"><p className="text-[9px] uppercase tracking-wider text-slate-500">Connection</p><p className={`mt-1 text-sm font-black ${online ? "text-emerald-300" : "text-amber-300"}`}>{online ? "Online" : "Reconnecting"}</p></div></div>
    </div>
    <div className="mt-3 space-y-2">{protections.map(({ label, detail, icon: Icon }) => <div key={label} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/35 p-3"><Icon className="mt-0.5 size-4 shrink-0 text-cyan-300" /><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-200">{label}</p><p className="mt-1 text-[10px] leading-relaxed text-slate-500">{detail}</p></div></div>)}</div>
    <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-amber-200">Trade responsibly</p><p className="mt-1 text-[10px] leading-relaxed text-slate-400">Trading involves risk. Review margin, drawdown, and order size before confirming every trade.</p></div>
  </div>
}

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
        <p className="text-[11px] font-bold tracking-wider uppercase" style={{ color: "#9fb4c8" }}>No trade history yet</p>
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
              <span className="text-[9px] font-black tracking-[0.15em] uppercase text-slate-400">Equity Curve</span>
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
            <span className="text-[9px] font-black tracking-[0.15em] uppercase text-slate-400">Last {recent.length} Trades</span>
            <span className="ml-auto text-[9px] text-slate-500">{stats.winCount}W / {stats.lossCount}L</span>
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
            <span className="text-[9px] font-black tracking-[0.15em] uppercase text-slate-400">Top Instruments</span>
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
                  <span className="text-[9px] text-slate-500 w-6 text-right shrink-0">{data.count}t</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Market Sessions Panel ───────────────────────────────────────────────����───���

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
          <span className="text-[9px] font-black tracking-[0.15em] uppercase text-slate-400">Market Sessions</span>
          <span className="ml-auto price-mono text-[9px] text-slate-500">
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
                <div className="text-[8px] text-slate-500 mb-1.5">{s.tz} �� {String(s.open).padStart(2,"0")}:00�������������{String(s.close).padStart(2,"0")}:00 UTC</div>
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
          <span className="text-[9px] font-black tracking-[0.15em] uppercase text-slate-400">Economic Calendar</span>
          <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>TODAY</span>
        </div>
        <div className="flex flex-col gap-1">
          {newsItems.map((n, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #111827" }}>
              <span className="price-mono text-[9px] font-bold text-slate-500 w-8 shrink-0">{n.time}</span>
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
          <span className="text-[9px] font-black tracking-[0.15em] uppercase text-slate-400">Market Sentiment</span>
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
          <span className="text-[9px] font-black tracking-[0.15em] uppercase text-slate-400">New Price Alert</span>
        </div>
        <div className="flex flex-col gap-2">
          <div>
            <label className="text-[8px] font-black tracking-widest uppercase text-slate-500 block mb-1">Instrument</label>
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
            <label className="text-[8px] font-black tracking-widest uppercase text-slate-500 block mb-1">
              Target Price {mid > 0 && <span className="text-slate-700 normal-case tracking-normal font-normal">(current: {fmt(mid, alertPair)})</span>}
            </label>
            <input type="number" value={alertPrice} onChange={e => setAlertPrice(e.target.value)}
              placeholder={mid > 0 ? fmt(mid, alertPair) : "0.00000"}
              className="w-full price-mono text-sm font-black text-white focus:outline-none px-2 py-1.5 rounded-lg"
              style={{ background: "#070a10", border: "1px solid #1e2d45" }} />
          </div>
          <div>
            <label className="text-[8px] font-black tracking-widest uppercase text-slate-500 block mb-1">Label (optional)</label>
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
                    {dist > 0 && !a.triggered && <span className="text-[9px] text-slate-500">{dist.toFixed(1)}p away</span>}
                  </div>
                  {a.label && <p className="text-[9px] text-slate-500 truncate mt-0.5">{a.label}</p>}
                </div>
                <button onClick={() => onRemove(a.id)} className="p-1 rounded transition-colors text-slate-500 hover:text-red-400">
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

// ─── Smart Alerts Panel ────────────────────────────────────────────────────────

function SmartAlertsPanel({ alerts }: { alerts: SmartAlertItem[] }) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(alerts.map(alert => [alert.id, true]))
  )
  const activeCount = Object.values(enabled).filter(Boolean).length
  const statusColor = (status: SmartAlertStatus) => status === "triggered" ? "#f87171" : status === "warning" ? "#fbbf24" : status === "monitoring" ? "#22d3ee" : "#34d399"
  const statusLabel = (status: SmartAlertStatus) => status === "triggered" ? "ACTION" : status === "warning" ? "WARNING" : status === "monitoring" ? "MONITORING" : "CLEAR"

  return (
    <div className="p-2 flex flex-col gap-2 h-full overflow-y-auto terminal-scroll">
      <div className="rounded-xl px-3 py-2.5" style={{ background: "linear-gradient(135deg,rgba(8,31,50,.98),rgba(8,14,26,.98))", border: "1px solid rgba(34,211,238,.24)" }}>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(34,211,238,.12)", border: "1px solid rgba(34,211,238,.28)" }}><BellRing className="h-3.5 w-3.5 text-cyan-300" /></div>
          <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.16em] text-white">Smart Alerts</p><p className="text-[8px] text-slate-500">Protection before a trading mistake</p></div>
          <span className="ml-auto rounded border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-1 text-[8px] font-black text-emerald-300">{activeCount}/{alerts.length} ON</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2">
          <span className="text-[9px] text-slate-400">Daily drawdown limit</span><span className="price-mono text-[10px] font-black text-amber-300">2.00%</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {alerts.map(alert => {
          const color = statusColor(alert.status)
          const isOn = enabled[alert.id] !== false
          return (
            <div key={alert.id} className="rounded-xl px-3 py-2.5 transition-colors" style={{ background: alert.status === "triggered" ? "rgba(127,29,29,.2)" : "#0a1120", border: `1px solid ${alert.status === "triggered" ? "rgba(248,113,113,.35)" : "#1a2640"}` }}>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ color, background: `${color}18`, border: `1px solid ${color}35` }}><alert.icon className="h-3 w-3" /></div>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className="truncate text-[10px] font-black text-slate-200">{alert.label}</span><span className="ml-auto shrink-0 text-[7px] font-black tracking-wider" style={{ color }}>{statusLabel(alert.status)}</span></div><p className="mt-0.5 text-[8px] leading-relaxed text-slate-500">{alert.description}</p></div>
                <button type="button" role="switch" aria-checked={isOn} aria-label={`${isOn ? "Disable" : "Enable"} ${alert.label}`} onClick={() => setEnabled(prev => ({ ...prev, [alert.id]: !isOn }))} className="relative mt-1 h-3.5 w-6 shrink-0 rounded-full transition-colors" style={{ background: isOn ? "#0891b2" : "#1e293b" }}><span className="absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-transform" style={{ left: isOn ? 13 : 2 }} /></button>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-1.5"><span className="price-mono text-[10px] font-black" style={{ color }}>{alert.value}</span><span className="text-[8px] text-slate-600">{alert.threshold}</span></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Support Center Panel ───────────��────���────────────────────────────────────

function SupportCenterPanel() {
  const [view, setView] = useState<"overview" | "chat" | "ticket" | "faq">("overview")
  const [ticketType, setTicketType] = useState("Account-specific support")
  const [ticketMessage, setTicketMessage] = useState("")
  const [ticketSent, setTicketSent] = useState(false)
  const [ticketSubmitting, setTicketSubmitting] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)

  const supportTopics = [
    { label: "Account-specific support", description: "Balance, rules, verification, and account access", icon: UserRound },
    { label: "Withdrawal support", description: "Eligibility, requests, and withdrawal status", icon: CreditCard },
    { label: "Technical support", description: "Platform errors, charts, and connection issues", icon: Wrench },
    { label: "MT5 troubleshooting", description: "Login, server, symbols, and Expert Advisors", icon: Headphones },
  ]
  const faqs = [
    { question: "How do I request a withdrawal?", answer: "Open a withdrawal request after your account meets the target, minimum balance, and drawdown rules. Our team will review the request and update its status in your transaction history." },
    { question: "Why is my MT5 account not connecting?", answer: "Confirm the exact server name, login number, and trading password. If the issue continues, create an MT5 troubleshooting ticket and include a screenshot of the error." },
    { question: "Where can I see my account rules?", answer: "Your active challenge or funded-account rules are available from Account Overview. Support can also confirm any account-specific limits before you trade." },
  ]

  const submitTicket = async () => {
    if (!ticketMessage.trim() || ticketSubmitting) return
    setTicketSubmitting(true)
    try {
      const response = await participantFetch("/api/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          participantName: localStorage.getItem("participant_name") || undefined,
          subject: ticketType,
          category: ticketType,
          message: ticketMessage,
        }),
      })
      if (!response.ok) throw new Error("Ticket submission failed")
      setTicketSent(true)
      setTicketMessage("")
    } catch (error) {
      console.error("[v0] Support ticket submission failed:", error)
    } finally {
      setTicketSubmitting(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto terminal-scroll p-3" style={{ background: "#070d18" }}>
      <div className="flex items-start justify-between gap-3 rounded-xl p-3" style={{ background: "linear-gradient(135deg,#0b2940,#0a1322)", border: "1px solid rgba(34,211,238,.25)" }}>
        <div className="flex items-start gap-2.5"><div className="flex size-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(34,211,238,.13)", border: "1px solid rgba(34,211,238,.3)" }}><LifeBuoy className="size-4 text-cyan-300" /></div><div><p className="text-[12px] font-black uppercase tracking-[.14em] text-white">24/7 Support Center</p><p className="mt-1 text-[9px] leading-relaxed text-slate-400">Get help with your account, withdrawals, platform, or MT5.</p></div></div>
        <span className="flex shrink-0 items-center gap-1 rounded border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-emerald-300"><span className="size-1.5 rounded-full bg-emerald-400" />Online</span>
      </div>

      <div className="mt-2 flex gap-1 overflow-x-auto terminal-scroll">
        {[{ id: "overview", label: "Center", icon: LifeBuoy }, { id: "chat", label: "Live chat", icon: MessageCircle }, { id: "ticket", label: "New ticket", icon: Ticket }, { id: "faq", label: "FAQ", icon: HelpCircle }].map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setView(id as typeof view)} className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider transition-colors" style={view === id ? { color: "#22d3ee", background: "rgba(34,211,238,.1)", border: "1px solid rgba(34,211,238,.25)" } : { color: "#64748b", background: "#0b1423", border: "1px solid #1a2941" }}><Icon className="size-3" />{label}</button>
        ))}
      </div>

      {view === "overview" && <>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setView("chat")} className="rounded-xl p-3 text-left transition-colors hover:border-cyan-400/40" style={{ background: "#0c1727", border: "1px solid #1d304a" }}><MessageCircle className="size-4 text-cyan-300" /><p className="mt-2 text-[10px] font-black text-slate-200">Live chat</p><p className="mt-1 text-[8px] text-slate-500">Typical reply under 2 min</p></button>
          <button type="button" onClick={() => setView("ticket")} className="rounded-xl p-3 text-left transition-colors hover:border-cyan-400/40" style={{ background: "#0c1727", border: "1px solid #1d304a" }}><Ticket className="size-4 text-amber-300" /><p className="mt-2 text-[10px] font-black text-slate-200">Ticket system</p><p className="mt-1 text-[8px] text-slate-500">Track every request in one place</p></button>
        </div>
        <div className="mt-3 flex flex-col gap-1.5"><p className="px-1 text-[9px] font-black uppercase tracking-[.15em] text-slate-500">Support topics</p>{supportTopics.map(({ label, description, icon: Icon }) => <button key={label} type="button" onClick={() => { setTicketType(label); setView("ticket") }} className="flex items-center gap-2 rounded-lg p-2.5 text-left transition-colors hover:bg-cyan-400/5" style={{ background: "#0a1321", border: "1px solid #16263d" }}><Icon className="size-3.5 shrink-0 text-slate-400" /><span className="min-w-0 flex-1"><span className="block text-[9px] font-bold text-slate-200">{label}</span><span className="mt-0.5 block text-[8px] text-slate-500">{description}</span></span><ChevronRight className="size-3 text-slate-600" /></button>)}</div>
      </>}

      {view === "chat" && <div className="mt-3 rounded-xl p-3" style={{ background: "#0a1321", border: "1px solid #1a2b44" }}><div className="flex items-center gap-2"><div className="flex size-8 items-center justify-center rounded-full bg-cyan-400/10"><Headphones className="size-4 text-cyan-300" /></div><div><p className="text-[10px] font-black text-slate-200">Support specialist online</p><p className="text-[8px] text-emerald-300">Available 24/7 · replies in under 2 minutes</p></div></div><div className="mt-3 rounded-lg p-2.5 text-[9px] leading-relaxed text-slate-400" style={{ background: "#111d2e" }}>Hello. Tell us what you need help with and we&apos;ll connect you with the right specialist.</div><button type="button" onClick={() => setView("ticket")} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[9px] font-black uppercase tracking-wider text-cyan-200" style={{ background: "rgba(34,211,238,.1)", border: "1px solid rgba(34,211,238,.25)" }}><Send className="size-3" />Start conversation</button></div>}

      {view === "ticket" && <div className="mt-3 rounded-xl p-3" style={{ background: "#0a1321", border: "1px solid #1a2b44" }}><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-200">Create support ticket</p><p className="mt-1 text-[8px] text-slate-500">Your account context will be attached securely.</p></div><Ticket className="size-4 text-amber-300" /></div>{ticketSent ? <div className="mt-4 rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-3 text-[9px] leading-relaxed text-emerald-200">Ticket submitted successfully. A support specialist will respond in the ticket system and live chat.</div> : <><label className="mt-4 block text-[8px] font-black uppercase tracking-wider text-slate-500">Category<select value={ticketType} onChange={e => setTicketType(e.target.value)} className="mt-1 w-full rounded-lg px-2 py-2 text-[10px] text-slate-200 outline-none" style={{ background: "#111d2e", border: "1px solid #243751" }}><option>Account-specific support</option><option>Payout support</option><option>Technical support</option><option>MT5 troubleshooting</option></select></label><label className="mt-3 block text-[8px] font-black uppercase tracking-wider text-slate-500">What can we help with?<textarea value={ticketMessage} onChange={e => setTicketMessage(e.target.value)} placeholder="Describe the issue or question..." rows={3} className="mt-1 w-full resize-none rounded-lg px-2 py-2 text-[10px] text-slate-200 outline-none placeholder:text-slate-600" style={{ background: "#111d2e", border: "1px solid #243751" }} /></label><button type="button" onClick={submitTicket} disabled={!ticketMessage.trim()} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[9px] font-black uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-40" style={{ background: "#0891b2", color: "#ecfeff" }}><Send className="size-3" />{ticketSubmitting ? "Submitting..." : "Submit ticket"}</button></>}</div>}

      {view === "faq" && <div className="mt-3 flex flex-col gap-1.5">{faqs.map(faq => <div key={faq.question} className="rounded-xl" style={{ background: "#0a1321", border: "1px solid #1a2b44" }}><button type="button" onClick={() => setExpandedFaq(expandedFaq === faq.question ? null : faq.question)} className="flex w-full items-center justify-between gap-2 p-3 text-left"><span className="text-[9px] font-bold text-slate-200">{faq.question}</span><ChevronDown className={`size-3 shrink-0 text-slate-500 transition-transform ${expandedFaq === faq.question ? "rotate-180" : ""}`} /></button>{expandedFaq === faq.question && <p className="border-t border-white/5 px-3 pb-3 pt-2 text-[9px] leading-relaxed text-slate-400">{faq.answer}</p>}</div>)}</div>}
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
          <span className="price-mono text-[10px] text-slate-400">{a.volume.toLocaleString()}</span>
          <span className="price-mono text-[10px] text-slate-500">{a.total.toLocaleString()}</span>
        </div>
      ))}
      {/* Spread row */}
      <div className="flex items-center justify-between px-3 py-1.5" style={{ background: "rgba(34,211,238,0.05)", borderTop: "1px solid #1e2d45", borderBottom: "1px solid #1e2d45" }}>
        <span className="price-mono text-xs font-black text-cyan-400">{fmt((pair.bid + pair.ask) / 2, pair.symbol)}</span>
        <span className="text-[9px] font-bold text-slate-500">
          Spread {((pair.spread / pip(pair.symbol)) || 0).toFixed(1)} pips
          &nbsp;·&nbsp;{(pair.spread).toFixed(decimals(pair.symbol))} price units
        </span>
      </div>
      {/* Bids (buy side) */}
      {levels.bids.map((b, i) => (
        <div key={i} className="relative grid px-3 py-[3px]" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="absolute inset-y-0 right-0 opacity-15" style={{ width: `${(b.volume / maxVol) * 100}%`, background: "#10b981" }} />
          <span className="price-mono text-[10px] font-black text-emerald-400">{fmt(b.price, pair.symbol)}</span>
          <span className="price-mono text-[10px] text-slate-400">{b.volume.toLocaleString()}</span>
          <span className="price-mono text-[10px] text-slate-500">{b.total.toLocaleString()}</span>
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
  onSave: (tradeId: string, sl: number | null, tp: number | null, trailingPips: number | null) => boolean
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
    <div className="terminal-modal-overlay fixed inset-0 z-[110] flex items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl p-5 w-[340px] max-w-full" style={{ background: "#0d1625", border: "1px solid #1e3a5f", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-cyan-400" />
            <span className="font-black text-white text-sm">Modify Position</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white transition-colors">
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
          <span className="text-slate-500">Entry:</span>
          <span className="price-mono font-black text-slate-300">{fmt(entryPrice, trade.pair)}</span>
          <span className="text-slate-700 mx-1">|</span>
          <span className="text-slate-500">Mark:</span>
          <span className="price-mono font-black" style={{ color: trade.pnl >= 0 ? "#10b981" : "#ef4444" }}>{fmt(trade.currentPrice, trade.pair)}</span>
        </div>

        {/* SL input */}
        <div className="mb-3">
          <label className="text-[9px] font-black tracking-widest uppercase mb-1 flex items-center gap-1" style={{ color: "#ef4444" }}>
            <ShieldAlert className="h-2.5 w-2.5" /> Stop Loss
            {slNum !== null && <span className="ml-auto font-bold text-slate-500 normal-case tracking-normal">{slPipsCalc.toFixed(1)} pips away</span>}
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
            {tpNum !== null && <span className="ml-auto font-bold text-slate-500 normal-case tracking-normal">{tpPipsCalc.toFixed(1)} pips away</span>}
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
            <span className="text-slate-500">Risk:Reward</span>
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
              const saved = onSave(
                target.tradeId,
                sl && !isNaN(parseFloat(sl)) ? parseFloat(sl) : null,
                tp && !isNaN(parseFloat(tp)) ? parseFloat(tp) : null,
                trailingPips && parseFloat(trailingPips) > 0 ? parseFloat(trailingPips) : null,
              )
              if (saved) onClose()
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

// ─── Toast Stack ────�����────────────────────────────────────────────────────────

function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-14 right-3 left-3 sm:left-auto sm:w-[320px] max-w-[calc(100vw-24px)] z-[150] flex flex-col gap-1.5 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="flex items-start gap-2 px-3 py-2 rounded-xl pointer-events-auto"
          style={{
            background: t.type === "success" ? "rgba(5,46,22,0.95)"
              : t.type === "error" ? "rgba(69,10,10,0.95)"
              : t.type === "warning" ? "rgba(78,37,10,0.95)"
              : "rgba(8,18,38,0.95)",
            border: `1px solid ${t.type === "success" ? "rgba(16,185,129,0.35)"
              : t.type === "error" ? "rgba(239,68,68,0.35)"
              : t.type === "warning" ? "rgba(245,158,11,0.35)"
              : "rgba(34,211,238,0.35)"}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
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
          <button onClick={() => onDismiss(t.id)} className="shrink-0 text-slate-500 hover:text-slate-400 transition-colors ml-1" aria-label="Dismiss notification">
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Market Stats Panel ─────────────────���─���─���─���─���─────���────────────������───────────

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

// ─── Position Sizer ──────────────────��─────���─����──────────────�������───────────����──────

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
          <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">Position Sizer</span>
          {atrPips > 0 && (
            <span className="ml-auto text-[9px] font-bold text-slate-500">ATR = {atrPips.toFixed(1)}p</span>
          )}
        </div>
        <div className="p-3 flex flex-col gap-2">
          {/* Risk % */}
          <div>
            <label className="text-[9px] font-black tracking-widest uppercase text-slate-500 mb-1 block">Risk %</label>
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
            <label className="text-[9px] font-black tracking-widest uppercase text-slate-500 mb-1 block">
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
                <span className="text-slate-500">Suggested Lots</span>
                <span className="price-mono font-black text-emerald-400 text-sm">{lots.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500">Max Risk</span>
                <span className="price-mono font-black text-red-400">${dollarRisk.toFixed(2)} ({riskPct}%)</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500">Pip Value</span>
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

function TradingAiCoach({ pair, openTrades, walletBalance, onOpenRisk }: { pair: ForexPair | null; openTrades: OpenTrade[]; walletBalance: number; onOpenRisk: () => void }) {
  const change = pair?.change ?? 0
  const trend = change > 0.15 ? "positive momentum" : change < -0.15 ? "negative momentum" : "mixed momentum"
  const spreadPips = pair ? (pair.ask - pair.bid) / pip(pair.symbol) : 0
  const exposure = openTrades.reduce((total, trade) => total + Math.abs(trade.margin), 0)
  const riskShare = walletBalance > 0 ? (exposure / walletBalance) * 100 : 0
  const checklist = [
    { label: "Live quote connected", ok: Boolean(pair && pair.bid > 0) },
    { label: "Spread within normal range", ok: spreadPips > 0 && spreadPips < 8 },
    { label: "Risk plan attached", ok: openTrades.length === 0 || openTrades.every((trade) => trade.sl !== null) },
  ]
  return <div className="flex h-full flex-col gap-2 overflow-y-auto p-2 terminal-scroll">
    <div className="border border-cyan-400/25 bg-[#0a1120] p-3"><div className="flex items-start gap-2"><div className="flex h-7 w-7 items-center justify-center border border-cyan-300/30 bg-cyan-400/10 text-cyan-300"><BrainCircuit className="h-4 w-4" /></div><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">AI trading guide</p><p className="mt-1 text-xs font-semibold text-white">Context, not predictions</p></div><span className="ml-auto rounded border border-emerald-400/25 px-1.5 py-0.5 text-[8px] font-bold uppercase text-emerald-300">Assist</span></div><p className="mt-3 text-[11px] leading-5 text-slate-400">Inspect market conditions and risk before you decide. This guide does not place trades or guarantee outcomes.</p></div>
    <div className="border border-slate-800 bg-[#0a1120] p-3"><div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Current read</span><span className="font-mono text-[9px] text-slate-500">{pair?.symbol ?? "—"}</span></div><p className="mt-3 text-sm font-semibold text-white">{pair ? `${trend} with ${spreadPips.toFixed(1)} pip spread` : "Select an instrument to begin"}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">Based on the current quote and recent session movement.</p></div>
    <div className="border border-slate-800 bg-[#0a1120] p-3"><div className="mb-3 flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Pre-trade checklist</span><span className="font-mono text-[9px] text-slate-500">{checklist.filter((item) => item.ok).length}/{checklist.length}</span></div><div className="space-y-2">{checklist.map((item) => <div key={item.label} className="flex items-center gap-2 text-[10px] text-slate-400"><span className={`h-1.5 w-1.5 rounded-full ${item.ok ? "bg-emerald-400" : "bg-amber-400"}`} />{item.label}<span className="ml-auto text-[9px] uppercase tracking-wider text-slate-600">{item.ok ? "ready" : "review"}</span></div>)}</div></div>
    <div className="border border-slate-800 bg-[#0a1120] p-3"><div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Exposure lens</span><span className="font-mono text-[10px] text-cyan-300">{riskShare.toFixed(1)}%</span></div><div className="mt-2 h-1.5 bg-slate-800"><div className={`h-full ${riskShare > 30 ? "bg-amber-400" : "bg-cyan-400"}`} style={{ width: `${Math.min(riskShare, 100)}%` }} /></div><p className="mt-2 text-[10px] leading-4 text-slate-500">Review margin usage and stops before increasing exposure.</p><button type="button" onClick={onOpenRisk} className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300 hover:text-cyan-200">Open risk analytics <ArrowUpRight className="h-3 w-3" /></button></div>
    <p className="px-1 text-[9px] leading-4 text-slate-600">Educational guidance only. Trading involves risk, including possible loss of capital.</p>
  </div>
}

// ─��─ Main Component ───────────────────────────────────�������������───────────────────────

  export function ForexTradingPlatform({
  participantEmail,
  participantName,
  kycStatus = "",
  kycVerified = false,
  walletBalance: externalBalance = 0,
  isFundedAccount = false,
  isChallengeAccount = false,
  fundedAmount,
  isFrozen = false,
  onBalanceUpdated,
  onAccountFrozen,
  onAddFunds,
  onOpenSidebar,
  accountMenuOpen = false,
  onAddFundedFunds,
  fundedTopUpAvailable = false,
  onStatsUpdate,
  }: {
  participantEmail: string
  participantName?: string
  kycStatus?: string
  kycVerified?: boolean
  walletBalance?: number
  isFundedAccount?: boolean
  isChallengeAccount?: boolean
  fundedAmount?: number
  isFrozen?: boolean
  onBalanceUpdated?: (newBalance: number) => void
  onAccountFrozen?: () => void
  onAddFunds?: () => void
  onOpenSidebar?: () => void
  accountMenuOpen?: boolean
  onAddFundedFunds?: () => void
  fundedTopUpAvailable?: boolean
  onStatsUpdate?: (stats: { equity: number; openPnl: number; openPnlPct: number }) => void
}) {
  const accountDisplayName = participantName?.trim() || participantEmail?.split("@")[0] || "Trader"
  const normalizedKycStatus = kycStatus.trim().toLowerCase()
  const isAccountKycVerified = kycVerified || ["approved", "verified", "complete", "completed"].includes(normalizedKycStatus)
  const isAccountKycPending = ["pending", "submitted", "in_review", "under_review"].includes(normalizedKycStatus)
  const accountKycLabel = isAccountKycVerified ? "Verified" : isAccountKycPending ? "In review" : normalizedKycStatus === "rejected" ? "Action needed" : "Not submitted"
  const accountKycTone = isAccountKycVerified ? "is-verified" : isAccountKycPending ? "is-pending" : "is-needed"
  // ── State ─────────────��─────────────────────────────��─�������──────────────�����������������������������───
  const [pairs, setPairs]             = useState<ForexPair[]>([])
  const [selectedPair, setSelectedPair] = useState<ForexPair | null>(null)
  const [activeCategory, setActiveCategory] = useState<AssetCategory | "All">("All")
  const [timeframe, setTimeframe]     = useState<TimeFrame>("5M")
  const [utcClock, setUtcClock] = useState("--:--:--")
  const [direction, setDirection]     = useState<TradeDirection>("BUY")

  useEffect(() => {
    const updateClock = () => setUtcClock(new Date().toLocaleTimeString("en-US", { hour12: false }))
    updateClock()
    const timer = window.setInterval(updateClock, 1000)
    return () => window.clearInterval(timer)
  }, [])
  const [lotSize, setLotSize]         = useState("0.01")
  const [leverage, setLeverage]       = useState(isChallengeAccount ? "30" : "10")
  const defaultOrderInstrumentRef = useRef<string | null>(null)

  useEffect(() => {
    if (!selectedPair || defaultOrderInstrumentRef.current === selectedPair.symbol) return
    const midPrice = (selectedPair.bid + selectedPair.ask) / 2
    setLotSize(defaultLotsForOrderValue(selectedPair.symbol, midPrice, 3000))
    defaultOrderInstrumentRef.current = selectedPair.symbol
  }, [selectedPair?.symbol])
  const effectiveLeverage = Math.min(parseFloat(leverage) || 1, isChallengeAccount ? 30 : 100)
  const [sl, setSl]                   = useState("")
  const [tp, setTp]                   = useState("")
  const [trailingPips, setTrailingPips] = useState("")
  const [openTrades, setOpenTrades]   = useState<OpenTrade[]>([])
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([])
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([])
  const [activePanel, setActivePanel] = useState<"positions" | "history" | "pending" | "depth" | "stats" | "performance" | "alerts" | "smart-alerts" | "support" | "sessions" | "dom" | "risk" | "journal" | "news" | "ai-coach" | "trust">("positions")
  const [positionsPopupOpen, setPositionsPopupOpen] = useState(false)
  const [historyPopupOpen, setHistoryPopupOpen] = useState(false)
  const [profilePanel, setProfilePanel] = useState<"support" | "smart-alerts" | null>(null)
  const [priceAlerts, setPriceAlerts] = useState<PriceAlertItem[]>([])
  const [chartExpanded, setChartExpanded] = useState(false)
  const [footerOpen, setFooterOpen] = useState(true)
  const [rightPanelHidden, setRightPanelHidden] = useState(false)
  const marketPanelWidth = 256
  const orderPanelWidth = 320

  // Map of tradeId ��� partial close lot input value
  const [partialCloseMap, setPartialCloseMap] = useState<Record<string, string>>({})
  const [loading, setLoading]         = useState(true)
  const [online, setOnline]           = useState(false)
  const [terminalLocked, setTerminalLocked] = useState(false)
  const [marketError, setMarketError] = useState<string | null>(null)
  const [candleError, setCandleError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [toasts, setToasts]           = useState<ToastItem[]>([])
  const [adminNotifications, setAdminNotifications] = useState<Array<{ id: string; type: string; title: string; message: string; time: string; read: boolean }>>([])
  const [totalPnl, setTotalPnl]       = useState(0)
  const [tickCount, setTickCount]     = useState(0)
  const [walletBalance, setWalletBalance] = useState(externalBalance)
  // Flag to suppress the external-balance sync while an internal adjustWalletBalance is in flight
  const suppressExternalSync = useRef(false)
  const [balanceLoaded, setBalanceLoaded] = useState(externalBalance > 0)
  const [balanceDelta, setBalanceDelta] = useState<{ value: number; id: number } | null>(null)
  const [candleCache, setCandleCache] = useState<Record<string, Candle[]>>({})
  const [candleLoading, setCandleLoading] = useState(false)
  const candleRequestRef = useRef(0)
  const [mobileTab, setMobileTab]     = useState<"market" | "chart" | "order" | "portfolio" | "account">("chart")
  const [isCompactViewport, setIsCompactViewport] = useState(false)
  const [modifyTarget, setModifyTarget] = useState<ModifyTarget>(null)
  const [tradeConfirm, setTradeConfirm] = useState<TradeConfirm>(null)
  const [tradeRestrictionNotice, setTradeRestrictionNotice] = useState<string | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const confirmInFlight = useRef(false)
  const [orderType, setOrderType]     = useState<"market" | "limit" | "stop">("market")
  const [pendingPrice, setPendingPrice] = useState("")
  const [pendingExpiry, setPendingExpiry] = useState<"GTC" | "TODAY">("GTC")
  const [showAdvancedOrderControls, setShowAdvancedOrderControls] = useState(false)
  const [rightPanelTab, setRightPanelTab] = useState<"order" | "sizer">("order")
  const [showPairSearch, setShowPairSearch] = useState(false)
  const [pairSearch, setPairSearch]   = useState("")
  const pairSearchRef = useRef<HTMLInputElement>(null)
  const headerPairSearchRef = useRef<HTMLInputElement>(null)
  const [equityHistory, setEquityHistory] = useState<number[]>([])
  const [isDarkTheme, setIsDarkTheme] = useState(true)
  const [themeReady, setThemeReady] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [chartLayout, setChartLayout] = useState<"single" | "grid">("single")
  const [chartReloadKey, setChartReloadKey] = useState(0)
  const [rateBarExpanded, setRateBarExpanded] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const smartAlertNotifiedRef = useRef<Record<string, boolean>>({})

  const DEFAULT_WATCHLIST = ["XAU/USD", "EUR/USD", "GBP/USD", "USD/JPY", "BTC/USD"]
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>(DEFAULT_WATCHLIST)
  const [watchlistReady, setWatchlistReady] = useState(false)
  const fundedBaseAmount = isFundedAccount
    ? getFundedBaseAmount(externalBalance, fundedAmount)
    : 0
  const fundedMinimumBalance = getFundedMinimumBalance(fundedBaseAmount)
  const freezeRequestStarted = useRef(false)
  const [breachInfo, setBreachInfo] = useState<{ realizedLoss: number; closedCount: number } | null>(null)
  const [showAddInstrument, setShowAddInstrument] = useState(false)
  const [addInstrumentQuery, setAddInstrumentQuery] = useState("")
  const [addInstrumentPos, setAddInstrumentPos] = useState<{ top: number; left: number } | null>(null)
  const addInstrumentRef = useRef<HTMLDivElement>(null)
  const addInstrumentBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
  const updateViewport = () => setIsCompactViewport(window.innerWidth < 1024)
  updateViewport()
  window.addEventListener("resize", updateViewport)
  return () => window.removeEventListener("resize", updateViewport)
  }, [])

  const dockEnabled = !isCompactViewport
  const [layoutKey, setLayoutKey] = useState(0)
  const [blotterHeight, setBlotterHeight] = useState<number | null>(null)
  const [tabOrder, setTabOrder] = useState<string[]>([])
  const [draggedTab, setDraggedTab] = useState<string | null>(null)
  const blotterRef = useRef<HTMLElement>(null)

  useEffect(() => {
    try {
      const savedHeight = Number(window.localStorage.getItem(BLOTTER_HEIGHT_KEY))
      if (savedHeight >= MIN_BLOTTER_HEIGHT) setBlotterHeight(savedHeight)
      const savedOrder: unknown = JSON.parse(window.localStorage.getItem(TAB_ORDER_KEY) ?? "[]")
      if (Array.isArray(savedOrder)) setTabOrder(savedOrder.filter((value): value is string => typeof value === "string"))
    } catch {
      // Ignore unreadable layout preferences and fall back to defaults.
    }
  }, [])

  useEffect(() => {
    if (!chartExpanded) return
    const exitExpanded = (event: KeyboardEvent) => { if (event.key === "Escape") setChartExpanded(false) }
    window.addEventListener("keydown", exitExpanded)
    return () => window.removeEventListener("keydown", exitExpanded)
  }, [chartExpanded])

  const clampBlotterHeight = (height: number) =>
    Math.round(Math.min(Math.max(height, MIN_BLOTTER_HEIGHT), Math.max(MIN_BLOTTER_HEIGHT, window.innerHeight * 0.7)))

  const saveBlotterHeight = (height: number | null) => {
    try {
      if (height === null) window.localStorage.removeItem(BLOTTER_HEIGHT_KEY)
      else window.localStorage.setItem(BLOTTER_HEIGHT_KEY, String(height))
    } catch {}
  }

  const startBlotterResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const startY = event.clientY
    const startHeight = blotterRef.current?.getBoundingClientRect().height ?? 260
    let latest = startHeight
    const onMove = (moveEvent: PointerEvent) => {
      latest = clampBlotterHeight(startHeight + startY - moveEvent.clientY)
      setBlotterHeight(latest)
    }
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      document.body.classList.remove("is-resizing-terminal")
      saveBlotterHeight(latest)
    }
    document.body.classList.add("is-resizing-terminal")
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  const handleBlotterResizeKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return
    event.preventDefault()
    const current = blotterHeight ?? blotterRef.current?.getBoundingClientRect().height ?? 260
    const next = clampBlotterHeight(current + (event.key === "ArrowUp" ? 24 : -24))
    setBlotterHeight(next)
    saveBlotterHeight(next)
  }

  const moveTab = (from: string, to: string, ids: string[]) => {
    if (from === to) return
    const next = ids.filter(id => id !== from)
    next.splice(next.indexOf(to), 0, from)
    setTabOrder(next)
    try { window.localStorage.setItem(TAB_ORDER_KEY, JSON.stringify(next)) } catch {}
  }

  const resetTerminalLayout = () => {
    try {
      window.localStorage.removeItem(`react-resizable-panels:${DOCK_AUTOSAVE_ID}`)
      window.localStorage.removeItem(TAB_ORDER_KEY)
    } catch {}
    saveBlotterHeight(null)
    setBlotterHeight(null)
    setTabOrder([])
    setLayoutKey(key => key + 1)
  }

  useEffect(() => {
  setThemeReady(true)
    try {
      const saved = window.localStorage.getItem("trade-terminal-theme")
      if (saved) setIsDarkTheme(saved === "dark")
    } catch {}
    try {
      const savedWatchlist = window.localStorage.getItem("trade-terminal-watchlist")
      if (savedWatchlist) {
        const parsed = JSON.parse(savedWatchlist)
        if (Array.isArray(parsed) && parsed.every(s => typeof s === "string") && parsed.length > 0) {
          const prioritized = ["XAU/USD", ...parsed.filter(symbol => symbol !== "XAU/USD")]
          setWatchlistSymbols(prioritized)
        }
      }
    } catch {}
    setWatchlistReady(true)
  }, [])

  useEffect(() => {
    if (themeReady) window.localStorage.setItem("trade-terminal-theme", isDarkTheme ? "dark" : "light")
  }, [isDarkTheme, themeReady])

  useEffect(() => {
    if (watchlistReady) window.localStorage.setItem("trade-terminal-watchlist", JSON.stringify(watchlistSymbols))
  }, [watchlistSymbols, watchlistReady])

  // Close the "add instrument" popover on outside click, Escape, or scroll/resize
  // (the popover is portaled to <body> with fixed positioning computed from the
  // trigger button's rect, so its position must be recalculated or dismissed
  // whenever the layout can shift).
  useEffect(() => {
    if (!showAddInstrument) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      const insideTrigger = addInstrumentRef.current?.contains(target)
      const insidePopover = document.getElementById("add-instrument-popover")?.contains(target)
      if (!insideTrigger && !insidePopover) setShowAddInstrument(false)
    }
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowAddInstrument(false) }
    const handleReposition = () => setShowAddInstrument(false)
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    window.addEventListener("resize", handleReposition)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKey)
      window.removeEventListener("resize", handleReposition)
    }
  }, [showAddInstrument])

  const toggleWatchlistSymbol = useCallback((symbol: string) => {
    setWatchlistSymbols(prev =>
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    )
  }, [])

  const addInstrumentResults = useMemo(() => {
    const q = addInstrumentQuery.trim().toLowerCase().replace(/[\s/_-]/g, "")
    if (!q) return PAIRS_CONFIG
    return PAIRS_CONFIG.filter(c => {
      const sym = c.symbol.toLowerCase().replace(/[\s/_-]/g, "")
      const name = (FULL_NAMES[c.symbol] ?? "").toLowerCase().replace(/[\s/_-]/g, "")
      return sym.includes(q) || name.includes(q)
    })
  }, [addInstrumentQuery])

  const pairsRef        = useRef<ForexPair[]>([])
  const selectedPairRef = useRef<ForexPair | null>(null)
  const openTradesRef   = useRef<OpenTrade[]>([])
  const freshRateSymbolsRef = useRef<Set<string>>(new Set())
  const freshRateUpdatedAtRef = useRef<Record<string, number>>({})
  const lastUiUpdateRef = useRef(0)
  const tickUpdateScheduledRef = useRef(false)
  const hasFreshRate = useCallback(
    (symbol: string) => freshRateSymbolsRef.current.has(symbol) && Date.now() - (freshRateUpdatedAtRef.current[symbol] ?? 0) <= 10_000,
    [],
  )
  const candleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const swapIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const toastIdRef       = useRef(0)

  // Keep openTradesRef in sync — assigned at render time (not in useEffect)
  // so the tick engine always reads the latest committed state
  openTradesRef.current = openTrades
  selectedPairRef.current = selectedPair

  // Sync external balance — skipped while an internal adjustWalletBalance call is in-flight
  // to prevent the prop update triggered by onBalanceUpdated from overwriting the fresh DB value
  useEffect(() => {
    if (suppressExternalSync.current) return
    setWalletBalance(externalBalance)
    if (externalBalance > 0) setBalanceLoaded(true)
  }, [externalBalance])

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const showToast = useCallback((type: ToastItem["type"], text: string, duration = 4500) => {
    setToasts(prev => {
      if (prev.some(t => t.text === text)) return prev
      const id = ++toastIdRef.current
      setTimeout(() => setToasts(current => current.filter(t => t.id !== id)), duration)
      return [...prev.slice(-2), { id, type, text }]
    })
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const loadAdminNotifications = useCallback(async () => {
    if (!participantEmail) return
    try {
      const response = await participantFetch(`/api/participant/notifications?email=${encodeURIComponent(participantEmail)}`, { cache: "no-store" })
      const data = await response.json()
      if (data?.success && Array.isArray(data.notifications)) {
        setAdminNotifications(
          data.notifications.map((n: { id: string; title: string; message: string; type: string; read_status: boolean; created_at: string }) => ({
            id: n.id,
            type: n.type ?? "info",
            title: n.title,
            message: n.message,
            time: new Date(n.created_at).toLocaleString(),
            read: !!n.read_status,
          }))
        )
      }
    } catch {
      // Silently ignore — notifications are non-critical to trading.
    }
  }, [participantEmail])

  useEffect(() => {
    loadAdminNotifications()
    const interval = setInterval(loadAdminNotifications, 30000)
    return () => clearInterval(interval)
  }, [loadAdminNotifications])

  const markAdminNotificationRead = useCallback((id: string) => {
    setAdminNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
    participantFetch("/api/participant/notifications", {
      method: "PATCH",
      body: JSON.stringify({ id, read_status: true }),
    }).catch(() => {})
  }, [])

  const clearAdminNotifications = useCallback(() => {
    const unreadIds = adminNotifications.filter(n => !n.read).map(n => n.id)
    setAdminNotifications(prev => prev.map(n => ({ ...n, read: true })))
    if (unreadIds.length > 0) {
      participantFetch("/api/participant/notifications", {
        method: "PATCH",
        body: JSON.stringify({ ids: unreadIds }),
      }).catch(() => {})
    }
  }, [adminNotifications])

  const lockedMargin = openTrades.reduce((sum, trade) => sum + trade.margin, 0)
  const accountEquity = walletBalance + lockedMargin + totalPnl
  const tradingLocked = isFrozen || terminalLocked
  // The popup is triggered only when live equity crosses into the breach zone.
  const fundedLossLimitReached = isFundedAccount && fundedBaseAmount > 0 && accountEquity < fundedMinimumBalance
  const breachConditionWasActiveRef = useRef(fundedLossLimitReached)

  const freezeFundedAccount = useCallback(async () => {
    if (!participantEmail || freezeRequestStarted.current || isFrozen) return
    freezeRequestStarted.current = true
    try {
      const response = await participantFetch("/api/participant/freeze-account", {
        method: "POST",
        body: JSON.stringify({ email: participantEmail }),
      })
      if (!response.ok) throw new Error("Freeze request failed")
      showToast("warning", `Funded account frozen at the ${((fundedBaseAmount - fundedMinimumBalance) / fundedBaseAmount * 100).toFixed(0)}% loss limit.`)
      onAccountFrozen?.()
    } catch {
      freezeRequestStarted.current = false
      showToast("error", "Could not freeze the account automatically. Please refresh and try again.")
    }
  }, [fundedBaseAmount, fundedMinimumBalance, isFrozen, onAccountFrozen, participantEmail, showToast])

  // ── Balance API ────────────������──────────────────────────────────────────────
  const adjustWalletBalance = useCallback(async (delta: number, description: string): Promise<number | null> => {
    try {
      // Prevent the externalBalance useEffect from overwriting the fresh DB value
      suppressExternalSync.current = true
      const res = await participantFetch("/api/forex/trade-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: participantEmail, delta, description }),
      })
      const json = await res.json().catch(() => null)
      const newBalance = json && typeof json.newBalance === "number" && Number.isFinite(json.newBalance) ? json.newBalance : null
      if (!res.ok || !json?.success || newBalance === null) {
        suppressExternalSync.current = false
        showToast("error", json?.error || "Balance update failed. Please try again.")
        return null
      }
      setWalletBalance(newBalance)
      setBalanceLoaded(true)
      onBalanceUpdated?.(newBalance)
      setBalanceDelta({ value: delta, id: Date.now() })
      setTimeout(() => setBalanceDelta(null), 2500)
      // Re-enable external sync after a short delay (after onBalanceUpdated propagates)
      setTimeout(() => { suppressExternalSync.current = false }, 800)
      return newBalance
    } catch {
      suppressExternalSync.current = false
      showToast("error", "Network error updating balance")
      return null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantEmail, onBalanceUpdated])

  // ── Trade persistence API. The UI remains optimistic, but failed writes are
  //    retried once and surfaced instead of being silently discarded. ─────────
  const persistTradeRequest = useCallback(async (input: string, init: RequestInit, label: string): Promise<Record<string, unknown> | false> => {
    let lastError = ""
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await participantFetch(input, init)
        const payload = await response.json().catch(() => ({}))
        if (response.ok && payload.success !== false) return payload
        lastError = payload.error || `Request failed (${response.status})`
        if (response.status === 400 || response.status === 401 || response.status === 403) break
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Network error"
      }
      await new Promise((resolve) => setTimeout(resolve, 400))
    }
    console.error("[v0] Trade persistence failed:", label, lastError)
    showToast("error", `${label} could not be confirmed by the server. Refresh before placing another order.`)
    return false
  }, [showToast])

  const persistOpenTrade = useCallback((trade: OpenTrade) => persistTradeRequest("/api/forex/trades", { method: "POST", body: JSON.stringify({ participant_email: participantEmail, action: "open", trade }) }, "Opening trade"), [participantEmail, persistTradeRequest])
  const persistPendingOrder = useCallback((order: PendingOrder) => persistTradeRequest("/api/forex/trades", { method: "POST", body: JSON.stringify({ participant_email: participantEmail, action: "pending", trade: order }) }, "Saving pending order"), [participantEmail, persistTradeRequest])
  const persistPartialClose = useCallback((closed: ClosedTrade, sourceTradeId: string, remainingLotSize: number, remainingMargin: number) => persistTradeRequest("/api/forex/trades", { method: "POST", body: JSON.stringify({ participant_email: participantEmail, action: "partial_close", trade: { ...closed, sourceTradeId, remainingLotSize, remainingMargin } }) }, "Saving partial close"), [participantEmail, persistTradeRequest])
  const persistClose = useCallback((closed: ClosedTrade) => persistTradeRequest("/api/forex/trades", { method: "PATCH", body: JSON.stringify({ participant_email: participantEmail, id: closed.id, action: "close", closePrice: closed.closePrice, closeTime: closed.closeTime, closeDuration: closed.closeDuration, finalPnl: closed.finalPnl, finalPips: closed.finalPips, finalSwap: closed.finalSwap, closeReason: closed.closeReason, lotSize: closed.lotSize, margin: closed.margin }) }, "Saving closed trade"), [participantEmail, persistTradeRequest])

  const loadTrades = useCallback(async () => {
    if (!participantEmail) return false
    try {
      const res = await participantFetch(`/api/forex/trades?email=${encodeURIComponent(participantEmail)}`, { cache: "no-store" })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) return false
      const isFinitePositive = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0
      const open = (Array.isArray(json.open) ? json.open : []).filter((trade: OpenTrade) =>
        trade && typeof trade.id === "string" && typeof trade.pair === "string" &&
        (trade.direction === "BUY" || trade.direction === "SELL") &&
        isFinitePositive(trade.openPrice) && isFinitePositive(trade.currentPrice) &&
        isFinitePositive(trade.lotSize) && isFinitePositive(trade.leverage) &&
        Number.isFinite(trade.margin) && Number.isFinite(trade.pnl),
      )
      const closed = (Array.isArray(json.closed) ? json.closed : []).filter((trade: ClosedTrade) =>
        trade && typeof trade.id === "string" && typeof trade.pair === "string" &&
        isFinitePositive(trade.openPrice) && Number.isFinite(trade.finalPnl),
      )
      const pending = (Array.isArray(json.pending) ? json.pending : []).filter((order: PendingOrder) =>
        order && typeof order.id === "string" && typeof order.pair === "string" &&
        isFinitePositive(order.targetPrice) && isFinitePositive(order.lotSize) && isFinitePositive(order.leverage),
      )
      setOpenTrades(open)
      setClosedTrades(closed)
      setPendingOrders(pending)
      openTradesRef.current = open
      return true
    } catch {
      return false
    }
  }, [participantEmail])
  const persistModify = useCallback((id: string, newSl: number | null, newTp: number | null, newTrail: number | null) => persistTradeRequest("/api/forex/trades", { method: "PATCH", body: JSON.stringify({ participant_email: participantEmail, id, action: "modify", sl: newSl, tp: newTp, trailingStopPips: newTrail }) }, "Saving trade changes"), [participantEmail, persistTradeRequest])
  const persistPartialReduce = useCallback((id: string, lotSize: number, margin: number) => persistTradeRequest("/api/forex/trades", { method: "PATCH", body: JSON.stringify({ participant_email: participantEmail, id, action: "partial_reduce", lotSize, margin }) }, "Saving partial reduction"), [participantEmail, persistTradeRequest])
  const persistFill = useCallback((id: string, openPrice: number, openTime: string, openTimestamp: number) => persistTradeRequest("/api/forex/trades", { method: "PATCH", body: JSON.stringify({ participant_email: participantEmail, id, action: "fill", openPrice, openTime, openTimestamp }) }, "Saving filled order"), [participantEmail, persistTradeRequest])
  const deletePendingOrder = useCallback((id: string) => persistTradeRequest(`/api/forex/trades?id=${encodeURIComponent(id)}&email=${encodeURIComponent(participantEmail)}`, { method: "DELETE" }, "Cancelling pending order"), [participantEmail, persistTradeRequest])

  // ── Apply validated live quotes; the selected chart builds bars separately ──
  const applyRateMap = useCallback((rateMap: Record<string, { bid: number; ask: number; mid?: number; change: number; high: number; low: number; open: number }>, freshSymbols?: string[]) => {
    const freshCandidates = new Set(freshSymbols ?? Object.keys(rateMap))
    freshRateSymbolsRef.current = new Set(
      [...freshCandidates].filter(symbol => {
        const rate = rateMap[symbol]
        return !!rate && [rate.bid, rate.ask, rate.change, rate.high, rate.low, rate.open].every(Number.isFinite) && rate.bid > 0 && rate.ask >= rate.bid
      }),
    )
    const receivedAt = Date.now()
    for (const symbol of freshRateSymbolsRef.current) freshRateUpdatedAtRef.current[symbol] = receivedAt
    setPairs(prev => {
      let changed = false
      const updated = prev.map(pair => {
        const rate = rateMap[pair.symbol]
        if (!rate || ![rate.bid, rate.ask, rate.change, rate.high, rate.low, rate.open].every(Number.isFinite) || rate.bid <= 0 || rate.ask <= 0 || rate.ask < rate.bid) return pair
        const nextSpread = TYPICAL_SPREADS[pair.symbol] ?? 0.0002
        if (pair.bid !== rate.bid || pair.ask !== rate.ask || pair.change !== rate.change || pair.high !== rate.high || pair.low !== rate.low || pair.open !== rate.open || pair.spread !== nextSpread) changed = true
        return { ...pair, bid: rate.bid, ask: rate.ask, change: rate.change, high: rate.high, low: rate.low, open: rate.open, spread: nextSpread }
      })
      if (!changed) return prev
      pairsRef.current = updated
      const liveSelected = updated.find(pair => pair.symbol === selectedPairRef.current?.symbol)
      if (liveSelected) {
        selectedPairRef.current = liveSelected
        setSelectedPair(liveSelected)
      }
      return updated
    })
    const selectedSymbol = selectedPairRef.current?.symbol ?? ""
    const selectedRate = rateMap[selectedSymbol]
    const selectedRateIsValid = hasFreshRate(selectedSymbol)
      && !!selectedRate
      && [selectedRate.bid, selectedRate.ask, selectedRate.change, selectedRate.high, selectedRate.low, selectedRate.open].every(Number.isFinite)
      && selectedRate.bid > 0 && selectedRate.ask >= selectedRate.bid
    const now = Date.now()
    lastUiUpdateRef.current = now
    setOnline(selectedRateIsValid)
    setMarketError(selectedRateIsValid ? null : "Waiting for a live quote for this instrument.")
    setLastUpdated(new Date(now))
    if (freshRateSymbolsRef.current.size > 0) {
      setTickCount((count) => count + 1)
    }
  }, [hasFreshRate])

  // REST remains a safe fallback when no authenticated market-data WebSocket is configured.
  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch("/api/forex/rates", { cache: "no-store", signal: AbortSignal.timeout(15000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json().catch(() => null)
      if (!json || typeof json !== "object" || json.error || !json.rates) throw new Error(json?.error || "Invalid rates response")
      const responseHasLiveQuotes = json.source === "live" || json.source === "partial-live"
      const responseHasRecentCache = json.source === "cache"
        && Number.isFinite(json.ts)
        && Date.now() - json.ts <= 5_000
      const freshSymbols = responseHasLiveQuotes || responseHasRecentCache
        ? Object.keys(json.rates).filter(symbol => ["tiingo", "twelve-data", "yahoo", "gold-api"].includes(json.sources?.[symbol]))
        : []
      applyRateMap(json.rates, freshSymbols)
      const selectedSymbol = selectedPairRef.current?.symbol ?? ""
      const selectedRate = json.rates[selectedSymbol]
      const stale = !freshSymbols.includes(selectedSymbol)
      const selectedRateAvailable = !!selectedRate
        && [selectedRate.bid, selectedRate.ask, selectedRate.change, selectedRate.high, selectedRate.low, selectedRate.open].every(Number.isFinite)
        && selectedRate.bid > 0 && selectedRate.ask >= selectedRate.bid
      setOnline(selectedRateAvailable && !stale)
      setMarketError(stale
        ? "Showing last-known prices — reconnecting to live market feed."
        : selectedRateAvailable ? null : "Live quote unavailable for this instrument — reconnecting.")
    } catch (error) {
      console.error("[v0] Live rate refresh failed:", error)
      freshRateSymbolsRef.current = new Set()
      setOnline(false)
      setMarketError(lastUpdated ? "Live prices are temporarily unavailable. Existing quotes remain visible." : "Live prices are unavailable. Trading will resume when the feed reconnects.")
    }
  }, [applyRateMap])

  useMarketDataStream(applyRateMap, fetchRates)

  // ── Fetch candles ─���─────────────────────────────────────���──────────────────
  const fetchCandles = useCallback(async (sym: string, tf: TimeFrame) => {
    const key = `${sym}|${tf}`
    const requestId = ++candleRequestRef.current
    const cached = candleCache[key]
    if (cached?.length) {
      setPairs(prev => {
        const updated = prev.map(pair => pair.symbol === sym ? { ...pair, candles: cached } : pair)
        pairsRef.current = updated
        return updated
      })
    }
    setCandleLoading(true)
    try {
      let res: Response | null = null
      let json: Record<string, unknown> | null = null
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          res = await fetch(`/api/forex/candles?pair=${encodeURIComponent(sym)}&tf=${tf}&_=${Date.now()}`, { cache: "no-store" })
          json = await res.json().catch(() => null)
          if (res.ok && Array.isArray(json?.candles) && json.candles.length > 0) break
        } catch {
          if (attempt === 1) throw new Error("Candle provider unavailable")
        }
        if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 800))
      }
      if (!res) throw new Error("Candle provider unavailable")
      if (!json || typeof json !== "object") throw new Error(`Invalid candles response (${res.status})`)
      // A provider timeout is not a terminal UI error. The route can return a
      // stale snapshot or an empty retry response while the live feed recovers.
      if (!res.ok && !Array.isArray(json?.candles)) throw new Error(String(json?.error ?? `HTTP ${res.status}`))
      if (json?.error && (!Array.isArray(json.candles) || json.candles.length === 0)) {
        if (cached?.length) {
          setCandleError("Showing cached candles — reconnecting to live history.")
          return
        }
        throw new Error(String(json.error))
      }
      if (requestId !== candleRequestRef.current) return
      const historicalCandles: Candle[] = Array.isArray(json.candles)
        ? json.candles.filter((c: Candle | null | undefined): c is Candle => !!c && [c.open, c.high, c.low, c.close].every((value) => typeof value === "number" && Number.isFinite(value)))
        : []
      if (historicalCandles.length === 0) throw new Error("Provider returned no usable candles")
      // Keep historical OHLC values exactly as returned by the selected
      // provider. The live-tick effect below updates only the active candle.
      const candles = historicalCandles
      setCandleError(null)
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
      setCandleError(json.source === "stale" ? "Showing cached candles — reconnecting to live history." : json.source === "offline" ? "Live candle history unavailable — retrying." : null)
    } catch (error) {
      if (requestId !== candleRequestRef.current) return
      console.error("[v0] Candle refresh failed:", error)
      // Never imply a synthetic/recovery series is live. Keep retrying and
      // expose the upstream state until genuine historical candles return.
      setCandleError(cached?.length ? "Showing cached candles — retrying live history." : "Live candle history unavailable — retrying provider.")
    } finally {
      if (requestId === candleRequestRef.current) setCandleLoading(false)
    }
  }, [candleCache])

  // ── Init ───────────────────────────────────────────────────────────────��───
  useEffect(() => {
  const init: ForexPair[] = PAIRS_CONFIG.map(p => {
  const seed = SEED_PRICES[p.symbol] ?? 0
  const spread = TYPICAL_SPREADS[p.symbol] ?? 0.0002
  const precision = decimals(p.symbol)
  const bid = seed > 0 ? Number((seed - spread / 2).toFixed(precision)) : 0
  const ask = seed > 0 ? Number((seed + spread / 2).toFixed(precision)) : 0
  return {
  symbol: p.symbol, base: p.base, quote: p.quote,
  bid, ask, change: 0, high: seed > 0 ? Number((seed * 1.002).toFixed(precision)) : 0, low: seed > 0 ? Number((seed * 0.998).toFixed(precision)) : 0, open: seed,
  spread, candles: [],
  }
  })
    setPairs(init); pairsRef.current = init
    const defaultPair = init.find(pair => pair.symbol === "XAU/USD") ?? init[0]
    setSelectedPair(defaultPair); setLoading(false)
    fetchRates(); fetchCandles(defaultPair.symbol, "5M")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Re-fetch candles when pair/TF changes ──��──────────���────������──────────�����������────
  useEffect(() => {
    if (!selectedPair) return
    fetchCandles(selectedPair.symbol, timeframe)
    const refreshMs: Record<TimeFrame, number> = {
      // Refresh the 1-minute history frequently enough to pick up the next
      // server candle while live ticks keep the active candle moving between
      // snapshots. Wider frames stay on lighter polling intervals.
      "1M": 1_000, "5M": 3_000, "15M": 15_000, "30M": 30_000, "1H": 60_000, "4H": 120_000, "1D": 300_000, "1W": 900_000,
    }
  const ms = candleError ? 5_000 : (refreshMs[timeframe] ?? 60_000)
  const retry = () => { void fetchCandles(selectedPair.symbol, timeframe) }
  candleIntervalRef.current = setInterval(retry, ms)
    return () => { if (candleIntervalRef.current) clearInterval(candleIntervalRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPair?.symbol, timeframe, candleError])

  // ── Live-tick last candle ���───────────────────────────����────��────────────────
  useEffect(() => {
    if (!selectedPair || !Array.isArray(selectedPair.candles) || selectedPair.candles.length === 0) return
    const mid = (selectedPair.bid + selectedPair.ask) / 2
    if (!Number.isFinite(mid) || mid === 0) return
    setPairs(prev => {
      const updated = prev.map(p => {
        if (p.symbol !== selectedPair.symbol || !Array.isArray(p.candles) || p.candles.length === 0) return p
        const liveMid = (p.bid + p.ask) / 2
        if (!Number.isFinite(liveMid) || liveMid === 0) return p
        const d = decimals(p.symbol)
        const intervalSeconds = timeframe === "1M" ? 60 : timeframe === "5M" ? 300 : timeframe === "15M" ? 900 : timeframe === "30M" ? 1800 : timeframe === "1H" ? 3600 : timeframe === "4H" ? 14400 : timeframe === "1W" ? 604800 : 86400
        const nowSeconds = Math.floor(Date.now() / 1000)
        const bucketOffset = timeframe === "1W" ? 4 * 86400 : 0
        const currentBucket = Math.floor((nowSeconds - bucketOffset) / intervalSeconds) * intervalSeconds + bucketOffset
        const nc = [...p.candles]
        const last = { ...nc[nc.length - 1] }
        const lastTimestamp = normalizeTimestamp(last.ts ?? last.time) / 1000
        const lastBucket = Number.isFinite(lastTimestamp) && lastTimestamp > 0
          ? Math.floor((lastTimestamp - bucketOffset) / intervalSeconds) * intervalSeconds + bucketOffset
          : 0
        const price = parseFloat(liveMid.toFixed(d))
        if (lastBucket > 0 && currentBucket > lastBucket) {
          nc.push({ time: new Date(currentBucket * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }), open: price, high: price, low: price, close: price, volume: 0, ts: currentBucket })
          if (nc.length > 150) nc.shift()
        } else {
          last.close = price
          last.high  = Math.max(last.high ?? price, price)
          last.low   = Math.min(last.low ?? price, price)
          if (!Number.isFinite(lastTimestamp) || lastTimestamp <= 0) last.ts = currentBucket
          nc[nc.length - 1] = last
        }
        return { ...p, candles: nc }
      })
      pairsRef.current = updated
      return updated
    })
    setSelectedPair(prev => {
      if (!prev) return prev
      return pairsRef.current.find(p => p.symbol === prev.symbol) ?? prev
    })
  }, [selectedPair?.symbol, selectedPair?.bid, selectedPair?.ask, timeframe])

  // ─��� Overnight swap accrual (every 60s, proportional) ──────────────────────
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

  // Keep risk checks running independently of chart redraws. This guarantees
  // SL/TP is evaluated even when a market-data update does not cause a React render.
  useEffect(() => {
    const riskCheckInterval = setInterval(() => setTickCount((count) => count + 1), 1000)
    return () => clearInterval(riskCheckInterval)
  }, [])

  // ── P&L engine + SL/TP/Trailing engine ────────────────────────────────────
  useEffect(() => {
    // Always read live trade list from the ref — never the stale closure value
    const liveTrades = openTradesRef.current
    if (liveTrades.length === 0 && pendingOrders.length === 0) return
    const toClose: { id: string; reason: ClosedTrade["closeReason"]; price: number }[] = []
    const toFillPending: string[] = []

    // Check pending orders for expiry and fill. TODAY orders expire at the next
    // local calendar day, while GTC orders remain active until cancelled.
    const now = new Date()
    const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
    const expiredPending: string[] = []
    pendingOrders.forEach(o => {
      if (o.expiry === "TODAY" && o.createdTimestamp) {
        const created = new Date(o.createdTimestamp)
        const createdKey = `${created.getFullYear()}-${created.getMonth()}-${created.getDate()}`
        if (createdKey !== todayKey) {
          expiredPending.push(o.id)
          return
        }
      }
      const pairNow = pairsRef.current.find(p => p.symbol === o.pair)
      if (!pairNow || !hasFreshRate(o.pair)) return
      const currentPrice = o.direction === "BUY" ? pairNow.ask : pairNow.bid
      let filled = false
      if (o.orderType === "BUY_LIMIT"  && currentPrice <= o.targetPrice) filled = true
      if (o.orderType === "BUY_STOP"   && currentPrice >= o.targetPrice) filled = true
      if (o.orderType === "SELL_LIMIT" && currentPrice >= o.targetPrice) filled = true
      if (o.orderType === "SELL_STOP"  && currentPrice <= o.targetPrice) filled = true
      if (filled) toFillPending.push(o.id)
    })

    if (expiredPending.length > 0) {
      expiredPending.forEach(id => {
        setPendingOrders(prev => prev.filter(o => o.id !== id))
        deletePendingOrder(id)
      })
      showToast("info", `${expiredPending.length} TODAY order${expiredPending.length === 1 ? "" : "s"} expired`)
    }

    if (toFillPending.length > 0) {
      toFillPending.forEach(id => {
        setPendingOrders(prev => {
          const order = prev.find(o => o.id === id)
          if (!order) return prev
          const pairNow = pairsRef.current.find(p => p.symbol === order.pair)
          if (!pairNow || !hasFreshRate(order.pair)) return prev
          const fillPrice = order.direction === "BUY" ? pairNow.ask : pairNow.bid
          const margin = calcMargin(order.pair, order.lotSize, fillPrice, order.leverage)
          if (walletBalance < margin) {
            deletePendingOrder(order.id)
            showToast("error", `${order.orderType.replace("_", " ")} cancelled — need $${margin.toFixed(2)} margin, have $${walletBalance.toFixed(2)}`)
            return prev.filter(o => o.id !== id)
          }
          const newTrade: OpenTrade = {
            id: order.id, pair: order.pair, direction: order.direction,
            lotSize: order.lotSize, leverage: order.leverage,
            openPrice: fillPrice, currentPrice: fillPrice,
            sl: order.sl, tp: order.tp,
            trailingStopPips: null, trailingPeak: fillPrice,
            openTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            openTimestamp: Date.now(),
            pnl: 0, pips: 0, margin, returnOnMargin: 0, swap: 0,
          }
          setOpenTrades(p => [newTrade, ...p])
          if (isChallengeAccount) {
            void (async () => {
              const saved = await persistFill(order.id, fillPrice, newTrade.openTime, newTrade.openTimestamp)
              if (!saved) {
                openTradesRef.current = openTradesRef.current.filter(item => item.id !== order.id)
                setOpenTrades(current => current.filter(item => item.id !== order.id))
                setPendingOrders(current => current.some(item => item.id === order.id) ? current : [order, ...current])
                return
              }
              const result = saved as Record<string, unknown>
              const execution = result.execution as { price?: number; margin?: number } | undefined
              const verifiedTrade = {
                ...newTrade,
                openPrice: typeof execution?.price === "number" ? execution.price : newTrade.openPrice,
                currentPrice: typeof execution?.price === "number" ? execution.price : newTrade.currentPrice,
                trailingPeak: typeof execution?.price === "number" ? execution.price : newTrade.trailingPeak,
                margin: typeof execution?.margin === "number" ? execution.margin : newTrade.margin,
              }
              openTradesRef.current = openTradesRef.current.map(item => item.id === order.id ? verifiedTrade : item)
              setOpenTrades(current => current.map(item => item.id === order.id ? verifiedTrade : item))
              if (typeof result.newBalance === "number") {
                suppressExternalSync.current = true
                setWalletBalance(result.newBalance)
                setBalanceLoaded(true)
                onBalanceUpdated?.(result.newBalance)
                setTimeout(() => { suppressExternalSync.current = false }, 800)
              }
              showToast("info", `Challenge pending ${order.orderType.replace("_", " ")} filled: ${order.pair} @ ${fmt(verifiedTrade.openPrice, order.pair)}`)
            })()
          } else {
            void adjustWalletBalance(
              -margin,
              `Pending fill — ${order.direction} ${order.lotSize}L ${order.pair} @ ${fmt(fillPrice, order.pair)}`
            )
            void persistFill(order.id, fillPrice, newTrade.openTime, newTrade.openTimestamp)
            showToast("info", `Pending ${order.orderType.replace("_", " ")} filled: ${order.pair} @ ${fmt(fillPrice, order.pair)}`)
          }
          return prev.filter(o => o.id !== id)
        })
      })
    }

    // Update open trades P&L + check SL/TP/Trailing — use liveTrades (ref) not stale closure
    const updated = liveTrades.map(t => {
      const pairNow = pairsRef.current.find(p => p.symbol === t.pair)
      if (!pairNow || !hasFreshRate(t.pair)) return t
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

        // 2. Save the close before returning margin. This keeps the balance and
        // trade history consistent if the network or database rejects the write.
        void (async () => {
          const saved = await persistClose(closed)
          if (!saved) {
            openTradesRef.current = [trade, ...openTradesRef.current]
            setOpenTrades(prev => prev.some(item => item.id === trade.id) ? prev : [trade, ...prev])
            setClosedTrades(prev => prev.filter(item => item.id !== closed.id))
            closingTradeIds.current.delete(id)
            return
          }

          setClosedTrades(prev => {
            if (prev.some(t => t.id === closed.id)) return prev
            return [closed, ...prev]
          })

          // The close endpoint settles margin + P&L atomically with the trade.
          const settledBalance = saved && typeof saved.newBalance === "number" ? saved.newBalance : null
          if (settledBalance !== null) {
            suppressExternalSync.current = true
            setWalletBalance(settledBalance)
            setBalanceLoaded(true)
            onBalanceUpdated?.(settledBalance)
            setTimeout(() => { suppressExternalSync.current = false }, 800)
          }

          showToast(
            reason === "tp" ? "success" : "error",
            `${icons[reason as keyof typeof icons]} — ${trade.pair} ${trade.direction}: ${finalPnl >= 0 ? "+" : ""}$${finalPnl.toFixed(2)} (${finalPips >= 0 ? "+" : ""}${finalPips.toFixed(1)} pips)`
          )
        })()

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

  // Open P/L includes both mark-to-market P/L and accrued swap so equity,
  // free margin, margin level, and drawdown use the same account-wide figure.
  // t.pnl already has t.swap folded in (see the tick update above), so do not
  // add t.swap again here — that would double-count it in the account total.
  const newTotalPnl = updated.reduce((s, t) => s + t.pnl, 0)
  setTotalPnl(parseFloat(newTotalPnl.toFixed(2)))

    // Equity includes margin locked in open positions plus floating P/L.
    const lockedMargin = updated
      .filter(t => !toClose.some(c => c.id === t.id))
      .reduce((sum, t) => sum + t.margin, 0)
    const equity = walletBalance + lockedMargin + newTotalPnl
    setEquityHistory(prev => {
      const next = [...prev, equity]
      return next.length > 120 ? next.slice(-120) : next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickCount])

  // ── Load trades from the database ───────────────────────────────────────────
  // All trade writes (open/close/modify/fill/cancel) are persisted directly to
  // the forex_trades table via the persist* helpers above — this effect just
  // hydrates state from the database on mount / participant change.
  const tradesLoaded = useRef(false)

  useEffect(() => {
    let cancelled = false
    tradesLoaded.current = false
    loadTrades().finally(() => {
      if (!cancelled) tradesLoaded.current = true
    })
    return () => { cancelled = true }
  }, [loadTrades])

  // ── Execute market trade ───────────────────────────────────���─��─────────────
  // Opens the confirmation modal ����� called by both executeTrade and quickTrade
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

  const executeTrade = (tradeDirection: TradeDirection = direction) => {
    if (tradingLocked) { showToast("warning", "Account frozen — trading is disabled"); return }
    if (!selectedPair) return
    if (!hasFreshRate(selectedPair.symbol)) { showToast("warning", "Waiting for a fresh live quote for this instrument."); return }
    const lot = parseFloat(lotSize); const lev = effectiveLeverage
    if (isNaN(lot) || lot <= 0 || lot > 100) { showToast("error", "Lot size: 0.01 – 100"); return }
    if (isNaN(lev) || lev < 1) { showToast("error", "Invalid leverage"); return }

    setDirection(tradeDirection)
    const price  = tradeDirection === "BUY" ? selectedPair.ask : selectedPair.bid
    const slNum  = sl ? parseFloat(sl) : null
    const tpNum  = tp ? parseFloat(tp) : null
    const trailN = trailingPips ? parseFloat(trailingPips) : null
    if ((sl && !Number.isFinite(slNum)) || (tp && !Number.isFinite(tpNum)) || (trailingPips && (trailN === null || trailN < 0 || !Number.isFinite(trailN)))) {
      showToast("error", "Use valid numbers for Stop Loss, Take Profit, and Trailing Stop")
      return
    }
    const margin = calcMargin(selectedPair.symbol, lot, price, lev)
    if (isFundedAccount && margin < 3000) { showToast("error", "Funded accounts require a minimum order amount of 3000"); return }

    if (slNum !== null && tradeDirection === "BUY"  && slNum >= price) { showToast("error", "SL must be below entry for BUY"); return }
    if (slNum !== null && tradeDirection === "SELL" && slNum <= price) { showToast("error", "SL must be above entry for SELL"); return }
    if (tpNum !== null && tradeDirection === "BUY"  && tpNum <= price) { showToast("error", "TP must be above entry for BUY"); return }
    if (tpNum !== null && tradeDirection === "SELL" && tpNum >= price) { showToast("error", "TP must be below entry for SELL"); return }
    if (orderType === "market" && walletBalance < margin) {
      showToast("error", `Insufficient balance — need $${margin.toFixed(2)}, have $${walletBalance.toFixed(2)}`); return
    }

    if (orderType !== "market") {
      const pPrice = parseFloat(pendingPrice)
      if (isNaN(pPrice) || pPrice <= 0) { showToast("error", "Enter a valid pending order price"); return }
      const currentQuote = tradeDirection === "BUY" ? selectedPair.ask : selectedPair.bid
      const isInvalidLevel = orderType === "limit"
        ? (tradeDirection === "BUY" ? pPrice >= currentQuote : pPrice <= currentQuote)
        : (tradeDirection === "BUY" ? pPrice <= currentQuote : pPrice >= currentQuote)
      if (isInvalidLevel) {
        showToast("error", `${orderType === "limit" ? "Limit" : "Stop"} price is on the wrong side of the current ${tradeDirection === "BUY" ? "ask" : "bid"}`)
        return
      }
      const oType: PendingOrder["orderType"] =
        orderType === "limit"
          ? tradeDirection === "BUY" ? "BUY_LIMIT" : "SELL_LIMIT"
          : tradeDirection === "BUY" ? "BUY_STOP" : "SELL_STOP"
      requestConfirm(tradeDirection, lot, lev, price, slNum, tpNum, trailN, true, { orderType: oType, price: pPrice, expiry: pendingExpiry })
      return
    }

    requestConfirm(tradeDirection, lot, lev, price, slNum, tpNum, trailN, false)
  }

  // Actual placement — called after user confirms
  const updateConfirmLotSize = (value: string) => {
  if (!tradeConfirm || !selectedPair) return
  const nextLot = Math.min(100, Math.max(0.01, Number(value) || 0.01))
  const margin = calcMargin(selectedPair.symbol, nextLot, tradeConfirm.price, tradeConfirm.leverage)
  const pipVal = pipValue(selectedPair.symbol, nextLot, tradeConfirm.price)
  const cs = contractSize(selectedPair.symbol)
  const liqDist = margin / (nextLot * cs)
  const liqPrice = tradeConfirm.direction === "BUY"
    ? parseFloat((tradeConfirm.price - liqDist).toFixed(5))
    : parseFloat((tradeConfirm.price + liqDist).toFixed(5))
  setTradeConfirm({ ...tradeConfirm, lotSize: nextLot, margin, pipVal, liqPrice })
  }

  const updateConfirmLeverage = (value: string) => {
    if (!tradeConfirm || !selectedPair) return
const maxLeverage = 100
  const nextLeverage = Math.min(maxLeverage, Math.max(1, Number(value) || 1))
    const margin = calcMargin(selectedPair.symbol, tradeConfirm.lotSize, tradeConfirm.price, nextLeverage)
    const cs = contractSize(selectedPair.symbol)
    const liqDist = margin / (tradeConfirm.lotSize * cs)
    const liqPrice = tradeConfirm.direction === "BUY"
      ? parseFloat((tradeConfirm.price - liqDist).toFixed(5))
      : parseFloat((tradeConfirm.price + liqDist).toFixed(5))
    setTradeConfirm({ ...tradeConfirm, leverage: nextLeverage, margin, liqPrice })
  }

  const confirmAndPlace = async () => {
    if (confirmInFlight.current || confirmLoading) return
    if (tradingLocked) { setTradeConfirm(null); showToast("warning", "Account frozen — trading is disabled"); return }
    if (!tradeConfirm || !selectedPair) return
    confirmInFlight.current = true
    setConfirmLoading(true)
    if (!hasFreshRate(tradeConfirm.pair)) {
      setTradeConfirm(null)
      setConfirmLoading(false)
      confirmInFlight.current = false
      showToast("warning", "Live quote expired before confirmation. Please review a fresh quote.")
      return
    }
    const { direction: dir, lotSize: lot, leverage: lev, price, margin, sl: slNum, tp: tpNum, trailingPips: trailN, isPending } = tradeConfirm
    const pairSymbol = selectedPair.symbol
    if (isFundedAccount && margin < 3000) {
      const message = "This funded account requires a minimum order amount of $3,000. Increase your position size before placing this trade."
      setTradeRestrictionNotice(message)
      setTradeConfirm(null)
      setConfirmLoading(false)
      confirmInFlight.current = false
      showToast("error", message)
      return
    }

    // Close the modal and reflect the trade right away �� persistence and margin
    // deduction continue in the background so the button doesn't sit on a spinner
    // waiting on two sequential network round trips. Any failure rolls back below.
    setTradeConfirm(null)

    if (isPending && tradeConfirm.pendingOrderType && tradeConfirm.pendingPrice) {
      const order: PendingOrder = {
        id: genId(), pair: pairSymbol, direction: dir,
        orderType: tradeConfirm.pendingOrderType, lotSize: lot, leverage: lev,
        targetPrice: tradeConfirm.pendingPrice, sl: slNum, tp: tpNum,
        createdTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        createdTimestamp: Date.now(),
        expiry: tradeConfirm.pendingExpiry ?? "GTC",
      }
	      setPendingOrders(prev => [order, ...prev])
	      setActivePanel("pending")

	      const pendingSaved = await persistPendingOrder(order)
	      if (!pendingSaved) {
	        setPendingOrders(prev => prev.filter(item => item.id !== order.id))
	        showToast("error", `${order.orderType.replace("_", " ")} was rejected by the trading engine.`)
	      } else {
	        showToast("success", `${order.orderType.replace("_", " ")} accepted by the trading engine: ${pairSymbol} @ ${fmt(order.targetPrice, pairSymbol)}`)
	      }
      confirmInFlight.current = false
      setConfirmLoading(false)
    } else {
      const tradeId = genId()
      const trade: OpenTrade = {
        id: tradeId, pair: pairSymbol, direction: dir,
        lotSize: lot, leverage: lev, openPrice: price, currentPrice: price,
        sl: slNum, tp: tpNum, trailingStopPips: trailN && trailN > 0 ? trailN : null,
        trailingPeak: price,
        openTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        openTimestamp: Date.now(),
        pnl: 0, pips: 0, margin, returnOnMargin: 0, swap: 0,
      }
      // Reflect the trade and the margin deduction immediately (ref first, so the
      // tick engine sees it before the next render; balance update is optimistic
      // and gets overwritten by the authoritative server value once it responds).
      openTradesRef.current = [trade, ...openTradesRef.current]
      setOpenTrades(prev => {
        // Guard: never add the same trade ID twice (prevents double placement on re-render)
        if (prev.some(t => t.id === tradeId)) return prev
        return [trade, ...prev]
      })
	      setWalletBalance(prev => prev - margin)
	      setSl(""); setTp(""); setTrailingPips("")
	      setActivePanel("positions")

	      // The API locks margin, records the trade, and writes the ledger entry in
	      // one transaction. Never deduct or restore margin in a second request.
	      const saved = await persistOpenTrade(trade)
	      if (!saved) {
	        openTradesRef.current = openTradesRef.current.filter(item => item.id !== trade.id)
	        setOpenTrades(prev => prev.filter(item => item.id !== trade.id))
	        setWalletBalance(prev => prev + margin)
	        showToast("error", `${pairSymbol} order was rejected by the trading engine. Margin was released.`)
	        confirmInFlight.current = false
	        setConfirmLoading(false)
	        return
	      }
	      showToast("success", `${dir} ${lot}L ${pairSymbol} execution confirmed @ ${fmt(price, pairSymbol)}`)
      if (typeof saved.newBalance === "number") {
        suppressExternalSync.current = true
        setWalletBalance(saved.newBalance)
        setBalanceLoaded(true)
        onBalanceUpdated?.(saved.newBalance)
        setTimeout(() => { suppressExternalSync.current = false }, 800)
      }
    }
  }

  // ��─ Quick trade — routes through confirmation modal ────────��──���───────────��
  const quickTrade = (dir: TradeDirection) => {
  if (tradingLocked) { showToast("warning", "Account frozen — trading is disabled"); return }
  if (!selectedPair) return
  if (!hasFreshRate(selectedPair.symbol)) { showToast("warning", "Waiting for a fresh live quote for this instrument."); return }
  if (!balanceLoaded) { showToast("info", "Loading account balance — try again in a moment"); return }

  // Keep the ticket and confirmation state in sync with the quote the user clicked.
  setDirection(dir)
  const lot = parseFloat(lotSize)
  if (!Number.isFinite(lot) || lot <= 0 || lot > 100) {
    showToast("error", "Lot size must be between 0.01 and 100")
    setMobileTab("order")
    return
  }
  const lev = effectiveLeverage
  const price  = dir === "BUY" ? selectedPair.ask : selectedPair.bid
  const margin = calcMargin(selectedPair.symbol, lot, price, lev)
  if (isFundedAccount && margin < 3000) {
  const message = "This funded account requires a minimum order amount of $3,000. Increase your position size before placing this trade."
  setTradeRestrictionNotice(message)
  showToast("error", message)
  setMobileTab("order")
  return
  }
  if (walletBalance < margin) {
    showToast("error", `Need $${margin.toFixed(2)}, have $${walletBalance.toFixed(2)}`)
    setMobileTab("order")
    return
  }
  requestConfirm(dir, lot, lev, price, null, null, null, false)
  }

  const setOrderDirection = (nextDirection: TradeDirection) => {
    setDirection(nextDirection)
    if (orderType === "market" || !selectedPair) return
    const quote = nextDirection === "BUY" ? selectedPair.ask : selectedPair.bid
    const offset = pip(selectedPair.symbol) * 10
    const suggested = orderType === "limit"
      ? (nextDirection === "BUY" ? quote - offset : quote + offset)
      : (nextDirection === "BUY" ? quote + offset : quote - offset)
    setPendingPrice(suggested.toFixed(decimals(selectedPair.symbol)))
  }

  // Tracks IDs that are in the middle of being closed to prevent concurrent double-close
  const closingTradeIds = useRef<Set<string>>(new Set())

  // ── Close trade ──────────────���──────────────────────────────────────────����─���
  const closeTrade = (id: string, reason: ClosedTrade["closeReason"] = "manual") => {
  // Prevent double-close if tick engine and manual close race
  if (closingTradeIds.current.has(id)) return

  const requestedTrade = openTradesRef.current.find(t => t.id === id)
  if (!requestedTrade) return
  if (reason === "manual" && !window.confirm(`Close ${requestedTrade.direction} ${requestedTrade.pair} (${requestedTrade.lotSize} lots)?`)) return

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
      closeReason: reason,
    }

    // --- Apply all state mutations once, separately, never nested ---
    // 1. Remove from open list
    openTradesRef.current = openTradesRef.current.filter(t => t.id !== id)
    setOpenTrades(prev => prev.filter(t => t.id !== id))

    void (async () => {
      try {
        const saved = await persistClose(closed)
        if (!saved) {
          openTradesRef.current = [trade, ...openTradesRef.current]
          setOpenTrades(prev => prev.some(item => item.id === trade.id) ? prev : [trade, ...prev])
          return
        }

        const response = saved as Record<string, unknown>
        const verifiedClose: ClosedTrade = {
          ...closed,
          closePrice: typeof response.closePrice === "number" ? response.closePrice : closed.closePrice,
          finalPnl: typeof response.finalPnl === "number" ? response.finalPnl : closed.finalPnl,
          finalPips: typeof response.finalPips === "number" ? response.finalPips : closed.finalPips,
          closeTime: typeof response.closePrice === "number" ? new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : closed.closeTime,
        }
        setClosedTrades(prev => {
          if (prev.some(item => item.id === verifiedClose.id)) return prev
          return [verifiedClose, ...prev.slice(0, 99)]
        })

        const newBalance = typeof response.newBalance === "number" ? response.newBalance : null
        if (newBalance === null) return
        suppressExternalSync.current = true
        setWalletBalance(newBalance)
        setBalanceLoaded(true)
        onBalanceUpdated?.(newBalance)
        setTimeout(() => { suppressExternalSync.current = false }, 800)

        showToast(reason === "stop_out" ? "error" : (verifiedClose.finalPnl >= 0 ? "success" : "error"),
          reason === "stop_out"
            ? `Stop-out: force-closed ${trade.pair} @ ${fmt(verifiedClose.closePrice, trade.pair)} — margin level hit 100% (${verifiedClose.finalPnl >= 0 ? "+" : ""}$${verifiedClose.finalPnl.toFixed(2)})`
            : `Closed ${trade.pair} @ ${fmt(verifiedClose.closePrice, trade.pair)} — ${verifiedClose.finalPnl >= 0 ? "+" : ""}$${verifiedClose.finalPnl.toFixed(2)} (${verifiedClose.finalPips >= 0 ? "+" : ""}${verifiedClose.finalPips.toFixed(1)} pips)`
        )
        if (soundEnabled) playTerminalSound("close")
      } finally {
        closingTradeIds.current.delete(id)
      }
    })()
  }

  const closeWinningPositions = useCallback(() => {
    const winners = openTradesRef.current.filter(t => t.pnl > 0)
    if (winners.length === 0) {
      showToast("info", "No positions are currently in profit")
      return
    }
    if (!window.confirm(`Close ${winners.length} profitable position(s)?`)) return
    winners.forEach(t => closeTrade(t.id, "manual"))
    if (soundEnabled) playTerminalSound("close")
  }, [closeTrade, soundEnabled])

  const applyBreakEvenSL = useCallback(() => {
    const winners = openTradesRef.current.filter(t => t.pnl > 0)
    if (winners.length === 0) {
      showToast("info", "No profitable positions available to set Break-Even SL")
      return
    }
    let updatedCount = 0
    winners.forEach(t => {
      persistModify(t.id, t.openPrice, t.tp, t.trailingStopPips)
      setOpenTrades(prev => prev.map(item => item.id === t.id ? { ...item, sl: t.openPrice } : item))
      updatedCount++
    })
    showToast("success", `Set Break-Even SL on ${updatedCount} position(s)`)
    if (soundEnabled) playTerminalSound("breakeven")
  }, [persistModify, soundEnabled])

  // ── Funded account breach ───────��────���───────────────────────���─────────────
  // When the drawdown limit is breached, every open position is force-closed
  // (booking whatever loss/gain it currently holds), the account is frozen,
  // and the trader is shown a clear breach notice.
  const breachHandledRef = useRef(false)
  const handleFundedBreach = useCallback(() => {
    if (breachHandledRef.current) return
    breachHandledRef.current = true

    const trades = [...openTradesRef.current]
    let realizedPnl = 0
    trades.forEach(trade => {
      const pairNow    = pairsRef.current.find(p => p.symbol === trade.pair)
      const closePrice = pairNow ? (trade.direction === "BUY" ? pairNow.bid : pairNow.ask) : trade.currentPrice
      const { pnl: pnlRaw } = calcPnl(trade, closePrice, trade.pair)
      realizedPnl += pnlRaw + trade.swap
    })
    trades.forEach(trade => closeTrade(trade.id, "account_breach"))

    freezeFundedAccount()
    setBreachInfo({ realizedLoss: parseFloat(realizedPnl.toFixed(2)), closedCount: trades.length })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freezeFundedAccount])

  useEffect(() => {
    const enteredBreachCondition = !breachConditionWasActiveRef.current && fundedLossLimitReached
    breachConditionWasActiveRef.current = fundedLossLimitReached
    if (enteredBreachCondition) handleFundedBreach()
  }, [fundedLossLimitReached, handleFundedBreach])

  // ── Partial close trade ────────────────────────���──────────────────���────────
  const partialCloseTrade = useCallback((id: string, closeLots: number) => {
    const trade = openTradesRef.current.find(t => t.id === id)
    if (!trade) return
    if (closeLots <= 0 || closeLots >= trade.lotSize) {
      // Full close
      closeTrade(id)
      return
    }
    if (closingTradeIds.current.has(id)) return

    const pairNow    = pairsRef.current.find(p => p.symbol === trade.pair)
    const closePrice = pairNow ? (trade.direction === "BUY" ? pairNow.bid : pairNow.ask) : trade.currentPrice

    // Scale P&L proportionally to the closed lot fraction
    const lotFraction = closeLots / trade.lotSize
    const { pnl: pnlRaw, pipCount } = calcPnl({ ...trade, lotSize: closeLots }, closePrice, trade.pair)
    const finalPnl = parseFloat((pnlRaw + trade.swap * lotFraction).toFixed(2))
    const closedMargin = parseFloat((trade.margin * lotFraction).toFixed(2))

    const closed: ClosedTrade = {
      ...trade,
      lotSize: closeLots,
      closePrice,
      closeTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      closeDuration: formatDuration(trade.openTimestamp),
      finalPnl, finalPips: pipCount,
      finalSwap: parseFloat((trade.swap * lotFraction).toFixed(4)),
      closeReason: "manual",
      id: `${id}_partial_${Date.now()}`,
    }

    // Update the open trade with reduced lots and margin
    const remainingLots = parseFloat((trade.lotSize - closeLots).toFixed(2))
    const remainingMargin = parseFloat((trade.margin - closedMargin).toFixed(2))
    openTradesRef.current = openTradesRef.current.map(t =>
      t.id === id ? { ...t, lotSize: remainingLots, margin: remainingMargin } : t
    )
    setOpenTrades(prev => prev.map(t =>
      t.id === id ? { ...t, lotSize: remainingLots, margin: remainingMargin } : t
    ))
  void (async () => {
    const saved = await persistPartialClose(closed, id, remainingLots, remainingMargin)
    if (!saved) {
      openTradesRef.current = [trade, ...openTradesRef.current.filter(t => t.id !== id)]
      setOpenTrades(prev => prev.map(item => item.id === id ? trade : item))
      return
    }

    const result = saved as Record<string, unknown>
    const verifiedClose: ClosedTrade = {
      ...closed,
      closePrice: typeof result.closePrice === "number" ? result.closePrice : closed.closePrice,
      finalPnl: typeof result.finalPnl === "number" ? result.finalPnl : closed.finalPnl,
      finalPips: typeof result.finalPips === "number" ? result.finalPips : closed.finalPips,
    }
    setClosedTrades(prev => [verifiedClose, ...prev.filter(item => item.id !== verifiedClose.id)].slice(0, 100))
    if (isChallengeAccount) {
      if (typeof result.newBalance === "number") {
        suppressExternalSync.current = true
        setWalletBalance(result.newBalance)
        setBalanceLoaded(true)
        onBalanceUpdated?.(result.newBalance)
        setTimeout(() => { suppressExternalSync.current = false }, 800)
      }
    } else {
      const returnAmt = parseFloat((closedMargin + finalPnl).toFixed(2))
      await adjustWalletBalance(returnAmt,
        `Partial close ${closeLots}L — ${trade.pair} | P&L: ${finalPnl >= 0 ? "+" : ""}$${finalPnl.toFixed(2)}`)
    }

    showToast(verifiedClose.finalPnl >= 0 ? "success" : "error",
      `Partial close ${closeLots}L ${trade.pair} @ ${fmt(verifiedClose.closePrice, trade.pair)} — ${verifiedClose.finalPnl >= 0 ? "+" : ""}$${verifiedClose.finalPnl.toFixed(2)}`)
    setPartialCloseMap(prev => ({ ...prev, [id]: "" }))
  })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjustWalletBalance, showToast, persistPartialClose])

  // ── Modify trade ──────���────────────────────────────────────────────────────
  const applyModify = useCallback((tradeId: string, newSl: number | null, newTp: number | null, newTrail: number | null) => {
    const trade = openTradesRef.current.find(item => item.id === tradeId)
    const pair = trade ? pairsRef.current.find(item => item.symbol === trade.pair) : null
    if (!trade || !pair) {
      showToast("error", "Position is no longer available")
      return false
    }

    const referencePrice = trade.openPrice
    if (newSl !== null && (!Number.isFinite(newSl) || newSl <= 0)) {
      showToast("error", "Enter a valid Stop Loss price")
      return false
    }
    if (newTp !== null && (!Number.isFinite(newTp) || newTp <= 0)) {
      showToast("error", "Enter a valid Take Profit price")
      return false
    }
    if (newSl !== null && (trade.direction === "BUY" ? newSl >= referencePrice : newSl <= referencePrice)) {
      showToast("error", `SL must be ${trade.direction === "BUY" ? "below" : "above"} entry price`)
      return false
    }
    if (newTp !== null && (trade.direction === "BUY" ? newTp <= referencePrice : newTp >= referencePrice)) {
      showToast("error", `TP must be ${trade.direction === "BUY" ? "above" : "below"} entry price`)
      return false
    }

    const updatedTrade = { ...trade, sl: newSl, tp: newTp, trailingStopPips: newTrail }
    openTradesRef.current = openTradesRef.current.map(item => item.id === tradeId ? updatedTrade : item)
    setOpenTrades(prev => prev.map(item => item.id === tradeId ? updatedTrade : item))
    persistModify(tradeId, newSl, newTp, newTrail)
    showToast("success", `${trade.pair} position updated with ${newSl !== null ? "SL" : "no SL"} and ${newTp !== null ? "TP" : "no TP"}`)
    return true
  }, [showToast, persistModify])

  // ── Price Alert checker (runs each tick) ��─────────────────���──────────────
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

  // ── Cancel pending order ─��──────────────����────────���─────────────────────────
  const cancelPending = (id: string) => {
    setPendingOrders(prev => prev.filter(o => o.id !== id))
    deletePendingOrder(id)
    showToast("info", "Pending order cancelled")
  }

  // ── Derived values ────────────────────────────────────────────���──��───�����─────
  const midPrice = selectedPair ? (selectedPair.bid + selectedPair.ask) / 2 : 0
  const minimumFundedLots = selectedPair ? minimumLotsForMargin(selectedPair.symbol, midPrice, effectiveLeverage, 3000) : 0.01
  useEffect(() => {
    if (!isFundedAccount || !selectedPair || !Number.isFinite(minimumFundedLots)) return
    setLotSize(current => Math.max(Number.parseFloat(current) || 0.01, minimumFundedLots).toFixed(2))
  }, [isFundedAccount, selectedPair?.symbol, midPrice, effectiveLeverage, minimumFundedLots])
  const estimatedMargin = selectedPair
    ? calcMargin(selectedPair.symbol, parseFloat(lotSize) || 0.01, midPrice, effectiveLeverage)
    : 0
  const estimatedFees: number | null = null
  const estimatedSpreadCost = selectedPair
    ? pipValue(selectedPair.symbol, parseFloat(lotSize) || 0.01, midPrice) * ((selectedPair.spread / pip(selectedPair.symbol)) || 0)
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
  // Search always scans the complete catalog, regardless of the selected
  // category tab. This makes the terminal search bar a true instrument finder:
  // typing EURUSD while Crypto is selected still finds EUR/USD.
  const searchedPairs = useMemo(() => {
    const query = pairSearch.trim().toLowerCase().replace(/[\s/_-]/g, "")
    if (!query) return pairs
    return pairs.filter((pair) => {
      const symbol = pair.symbol.toLowerCase().replace(/[\s/_-]/g, "")
      const name = (FULL_NAMES[pair.symbol] ?? "").toLowerCase().replace(/[\s/_-]/g, "")
      return symbol.includes(query) || name.includes(query)
    })
  }, [pairSearch, pairs])

  const filteredPairs = useMemo(() => {
    if (pairSearch.trim()) return searchedPairs
    return searchedPairs.filter((pair) => {
      const config = PAIRS_CONFIG.find((item) => item.symbol === pair.symbol)
      return activeCategory === "All" || config?.category === activeCategory
    })
  }, [activeCategory, pairSearch, searchedPairs])
  const visibleInstrumentCount = pairSearch.trim() ? filteredPairs.length : pairs.length
  const hasInstrumentSearch = pairSearch.trim().length > 0
  const searchNoResults = hasInstrumentSearch && filteredPairs.length === 0
  

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
  // Free margin is equity less margin currently committed. Floating P/L and
  // swap remain available (or reduce availability) while a position is open.
  const equity = walletBalance + totalMargin + totalPnl
  const freeMargin = equity - totalMargin
  const marginLevel = totalMargin > 0 ? (equity / totalMargin * 100) : 0
  const today = new Date().toDateString()
  const dailyClosedPnl = closedTrades.reduce((sum, trade) => {
    const closeDate = new Date(trade.closeTime).toDateString()
    return closeDate === today ? sum + trade.finalPnl : sum
  }, 0)
  const dailyPnl = dailyClosedPnl + Math.min(0, totalPnl)
  const dailyDrawdownPct = walletBalance > 0 ? Math.max(0, (-dailyPnl / walletBalance) * 100) : 0
  const currentLots = parseFloat(lotSize) || 0
  const selectedRiskPct = selectedPair && sl && walletBalance > 0
    ? (Math.abs(selectedPair.ask - parseFloat(sl)) / pip(selectedPair.symbol) * pipValue(selectedPair.symbol, currentLots, selectedPair.ask) / walletBalance) * 100
    : 0
  const riskWarning = selectedRiskPct >= 1.5 || openTrades.some(trade => !trade.sl)
  const smartAlerts: SmartAlertItem[] = [
    { id: "drawdown", label: "Drawdown warning", description: `Warning: Your daily drawdown has reached ${dailyDrawdownPct.toFixed(2)}%.`, status: dailyDrawdownPct >= 2 ? "triggered" : dailyDrawdownPct >= 1.5 ? "warning" : "clear", value: `${dailyDrawdownPct.toFixed(2)}%`, threshold: "Warn at 1.50% · limit 2.00%", icon: AlertTriangle },
    { id: "lot-size", label: "High lot size", description: "Large position sizes can amplify losses before you have time to react.", status: currentLots > 5 ? "triggered" : currentLots > 1 ? "warning" : "clear", value: `${currentLots.toFixed(2)} lots`, threshold: "Warning above 1.00", icon: BarChart2 },
    { id: "risk", label: "High risk", description: riskWarning ? "Add a stop loss or reduce risk before placing this trade." : "Your current ticket has a controlled risk profile.", status: riskWarning ? "warning" : "clear", value: selectedRiskPct > 0 ? `${selectedRiskPct.toFixed(2)}% risk` : "Protected", threshold: "Review above 1.50%", icon: ShieldAlert },
    { id: "margin", label: "Margin warning", description: "Keep enough free margin available for normal market movement.", status: marginLevel > 0 && marginLevel < 150 ? "triggered" : marginLevel > 0 && marginLevel < 300 ? "warning" : "clear", value: marginLevel > 0 ? `${marginLevel.toFixed(0)}% level` : "No margin used", threshold: "Warn below 300%", icon: Gauge },
    { id: "news", label: "News event approaching", description: "High-impact economic events are monitored before execution.", status: "monitoring", value: "Monitoring calendar", threshold: "30-minute lookahead", icon: Newspaper },
    { id: "day-target", label: "Trading-day target", description: "Track progress toward today’s funded-account target.", status: dailyPnl >= walletBalance * 0.01 ? "triggered" : "monitoring", value: walletBalance > 0 ? `${Math.max(0, dailyPnl / walletBalance * 100).toFixed(2)}% today` : "0.00% today", threshold: "Target +1.00%", icon: Target },
    { id: "profit-target", label: "Profit target reached", description: "Your profit target is calculated from the funded account base.", status: isFundedAccount && fundedBaseAmount > 0 && totalPnl >= fundedBaseAmount * 0.1 ? "triggered" : "monitoring", value: fundedBaseAmount > 0 ? `${Math.max(0, totalPnl / fundedBaseAmount * 100).toFixed(2)}%` : "Not configured", threshold: "Target +10.00%", icon: Trophy },
    { id: "payout", label: "Withdrawal eligibility", description: "Eligibility is shown when the funded account is profitable and within risk limits.", status: isFundedAccount && totalPnl > 0 && dailyDrawdownPct < 2 ? "monitoring" : "clear", value: isFundedAccount && totalPnl > 0 ? "Eligible review" : "Not eligible", threshold: "Profit + risk rules", icon: Award },
  ]

  // ── Margin call / stop-out ───────────────────────────────────────────────────
  // Industry-standard safety net: when margin level drops to or below 100%,
  // force-close the single most unprofitable open position (largest floating
  // loss) to free up margin and protect the account from going further
  // negative. Repeats on the next tick if the level is still at/below 100%
  // after closing one position.
  useEffect(() => {
    if (totalMargin <= 0 || marginLevel <= 0 || marginLevel > 100) return
    if (openTradesRef.current.length === 0) return

    const worst = [...openTradesRef.current].sort((a, b) => a.pnl - b.pnl)[0]
    if (!worst || closingTradeIds.current.has(worst.id)) return

    closeTrade(worst.id, "stop_out")
  // Re-evaluate every tick / whenever open trades or margin level change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickCount, marginLevel, totalMargin, openTrades.length])

  useEffect(() => {
    const candidates = smartAlerts.filter(alert => alert.status === "warning" || alert.status === "triggered")
    candidates.forEach(alert => {
      if (!smartAlertNotifiedRef.current[alert.id]) {
        showToast(alert.status === "triggered" ? "error" : "warning", `${alert.label}: ${alert.description}`)
        smartAlertNotifiedRef.current[alert.id] = true
      }
    })
    Object.keys(smartAlertNotifiedRef.current).forEach(id => {
      if (!candidates.some(alert => alert.id === id)) delete smartAlertNotifiedRef.current[id]
    })
  // Alert notifications intentionally react to live trade metrics.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickCount, openTrades.length, dailyDrawdownPct, marginLevel, selectedRiskPct, currentLots])
  
  useEffect(() => {
  onStatsUpdate?.({
      equity,
      openPnl: totalPnl,
      openPnlPct: walletBalance > 0 ? (totalPnl / walletBalance) * 100 : 0,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equity, totalPnl, walletBalance])

  // ─��� Institutional hotkeys (B/S buy/sell, X close all, Ctrl+K palette, +/- lot) ──
  useTradingHotkeys({
    onBuy: () => { if (!tradingLocked && selectedPair && balanceLoaded) quickTrade("BUY") },
    onSell: () => { if (!tradingLocked && selectedPair && balanceLoaded) quickTrade("SELL") },
    onCloseAll: () => { openTrades.forEach(t => closeTrade(t.id)) },
    onCancelPending: () => { setTradeConfirm(null); setModifyTarget(null) },
    onToggleCommand: () => setCommandPaletteOpen(v => !v),
    onIncreaseLot: () => setLotSize(prev => { const n = parseFloat(prev) || 0.01; return String(Math.min(100, Math.round((n + 0.01) * 100) / 100)) }),
    onDecreaseLot: () => setLotSize(prev => { const n = parseFloat(prev) || 0.01; return String(Math.max(0.01, Math.round((n - 0.01) * 100) / 100)) }),
  })

  // ── Command palette actions ────────────────────────────────────────────���─────
  const commandActions = useMemo(() => [
    { id: "buy", label: "Quick BUY at market", hint: "Open a long position at the current ask", icon: TrendingUp, shortcut: "B", action: () => { if (!tradingLocked && selectedPair && balanceLoaded) quickTrade("BUY") } },
    { id: "sell", label: "Quick SELL at market", hint: "Open a short position at the current bid", icon: TrendingDown, shortcut: "S", action: () => { if (!tradingLocked && selectedPair && balanceLoaded) quickTrade("SELL") } },
    { id: "close-all", label: "Close all positions", hint: "Manually close every open trade", icon: X, shortcut: "X", action: () => { openTrades.forEach(t => closeTrade(t.id)) } },
    { id: "cancel-pending", label: "Cancel all pending orders", hint: "Remove every working limit/stop order", icon: Clock, action: () => { pendingOrders.forEach(o => cancelPending(o.id)) } },
    { id: "refresh", label: "Refresh market data", hint: "Re-fetch rates and candles", icon: RefreshCw, action: () => { fetchRates(); if (selectedPair) fetchCandles(selectedPair.symbol, timeframe) } },
    { id: "theme", label: isDarkTheme ? "Switch to light theme" : "Switch to dark theme", hint: "Toggle the terminal color scheme", icon: isDarkTheme ? Sun : Moon, action: () => setIsDarkTheme(v => !v) },
    { id: "chart-grid", label: chartLayout === "single" ? "Switch to multi-chart grid" : "Switch to single chart", hint: "Toggle the institutional multi-asset view", icon: chartLayout === "single" ? Grid3x3 : Square, action: () => setChartLayout(v => v === "single" ? "grid" : "single") },
    { id: "panel-positions", label: "Show open positions", hint: "Switch the bottom blotter to positions", icon: Layers, action: () => setActivePanel("positions") },
    { id: "panel-pending", label: "Show pending orders", hint: "Switch the bottom blotter to pending orders", icon: Clock, action: () => setActivePanel("pending") },
    { id: "panel-history", label: "Show trade history", hint: "Switch the bottom blotter to closed trades", icon: History, action: () => setActivePanel("history") },
    { id: "panel-dom", label: "Show depth-of-market", hint: "Open the L2 order book ladder", icon: BarChart2, action: () => setActivePanel("dom") },
    { id: "panel-risk", label: "Show portfolio risk", hint: "Open the risk analytics panel", icon: ShieldAlert, action: () => setActivePanel("risk") },
    { id: "panel-journal", label: "Show trade journal", hint: "Open the performance journal", icon: BookOpen, action: () => setActivePanel("journal") },
    { id: "panel-news", label: "Show news & calendar", hint: "Open the economic calendar", icon: Newspaper, action: () => setActivePanel("news") },
    { id: "panel-performance", label: "Show performance dashboard", hint: "Open the equity curve and KPIs", icon: BarChart, action: () => setActivePanel("performance") },
    { id: "panel-alerts", label: "Show price alerts", hint: "Open the price alert manager", icon: Bell, action: () => setActivePanel("alerts") },
  { id: "panel-support", label: "Open support center", hint: "Live chat, tickets, FAQ, and account support", icon: LifeBuoy, action: () => setActivePanel("support") },
    { id: "panel-sessions", label: "Show market sessions", hint: "Open the global session tracker", icon: Globe2, action: () => setActivePanel("sessions") },
    { id: "panel-stats", label: "Show market stats", hint: "Open the instrument statistics panel", icon: Activity, action: () => setActivePanel("stats") },
  { id: "panel-ai-coach", label: "Open AI trading guide", hint: "Review market context and pre-trade risk checks", icon: BrainCircuit, action: () => setActivePanel("ai-coach") },
  { id: "panel-trust", label: "Open trust center", hint: "Review account protection and operating status", icon: ShieldCheck, action: () => setActivePanel("trust") },
    { id: "panel-depth", label: "Show order depth", hint: "Open the static depth ladder", icon: BarChart2, action: () => setActivePanel("depth") },
    { id: "sizer", label: "Open position sizer", hint: "Calculate lot size from risk %", icon: Target, action: () => { setRightPanelTab("sizer"); setMobileTab("order") } },
    { id: "add-funds", label: "Add funds", hint: "Open the deposit flow", icon: Plus, action: () => onAddFunds?.() },
    { id: "payout", label: "Withdraw", hint: "Open the withdrawal page", icon: ArrowUpDown, action: () => { window.location.href = "/participant/dashboard/payout" } },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isDarkTheme, chartLayout, selectedPair, isFrozen, balanceLoaded, openTrades, pendingOrders])

  return (
    <div className={`flex flex-col forex-deep-bg apple-trading-terminal terminal-live-surface reference-terminal mt5-terminal ${isDarkTheme ? "is-dark" : ""} ${isCompactViewport ? "compact-terminal" : ""} ${chartExpanded ? "is-chart-expanded" : ""} ${dockEnabled ? "is-docked" : ""} ${mobileTab === "market" && !chartExpanded ? "is-market-watch-active" : ""} ${mobileTab === "portfolio" ? "is-portfolio-active" : ""} ${mobileTab === "account" ? "is-account-active" : ""} text-slate-900`} style={{ width: "100%", position: "relative", fontFamily: "inherit", borderTop: "2px solid #2f80c9" }}>

      {/* ── Toast Stack ── */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* ── Command Palette (Ctrl+K) ─�� */}
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} actions={commandActions} />

      {profilePanel && (
        <div className="absolute inset-0 z-[70] flex items-start justify-center bg-slate-950/75 p-3 pt-16 backdrop-blur-sm sm:p-6 sm:pt-20" role="dialog" aria-modal="true" aria-label={profilePanel === "support" ? "Support Center" : "Smart Alerts"}>
          <div className="flex max-h-[calc(100vh-5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-cyan-400/20 bg-[#070d18] shadow-2xl shadow-black/50">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2.5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-300">Profile Center</p>
                <p className="mt-0.5 text-[9px] text-slate-500">Account tools available from your terminal profile</p>
              </div>
              <button type="button" onClick={() => setProfilePanel(null)} className="terminal-icon-button" aria-label="Close profile panel"><X className="h-4 w-4" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              {profilePanel === "support" ? <SupportCenterPanel /> : <SmartAlertsPanel alerts={smartAlerts} />}
            </div>
          </div>
        </div>
      )}

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



{/* Desktop terminal controls */}
<div className="reference-desktop-header">
<ForexHeader
  walletBalance={walletBalance}
  equity={equity}
  totalPnl={totalPnl}
  openTradesCount={openTrades.length}
        pendingOrdersCount={pendingOrders.length}
        leverage={Number(leverage) || 100}
        accountType={isFundedAccount ? "Funded" : "Live"}
        accountId={participantEmail ? participantEmail.split("@")[0].toUpperCase().slice(0, 8) : "DEMO-001"}
        userName={participantEmail ? participantEmail.split("@")[0] : "Trader"}
        userEmail={participantEmail || "trayer@praysmid.com"}
        isConnected={online}
        onNavigate={(panel) => {
          if (panel === "sizer") { setMobileTab("order"); setRightPanelTab("sizer") }
          else if (panel === "calendar") { setActivePanel("news") }
          else if (panel === "news") { setActivePanel("news") }
          else if (panel === "performance") { setActivePanel("performance") }
	          else if (panel === "history") { setActivePanel("history") }
	          else if (panel === "journal") { setActivePanel("journal") }
	          else if (panel === "support" || panel === "smart-alerts") { setProfilePanel(panel as "support" | "smart-alerts"); setRightPanelHidden(false) }
	          else { setActivePanel(panel as typeof activePanel) }
	        }}
	        onToggleFullscreen={() => {
	          if (document.fullscreenElement) document.exitFullscreen()
	          else document.documentElement.requestFullscreen()
	        }}
	        isFullscreen={typeof document !== "undefined" && !!document.fullscreenElement}
	  onToggleLock={() => {
	    setTerminalLocked((locked) => {
	      const nextLocked = !locked
	      showToast(nextLocked ? "warning" : "info", nextLocked ? "Trading locked — no new orders will be accepted" : "Trading unlocked")
	      return nextLocked
	    })
	  }}
	  isLocked={isFrozen || terminalLocked}
	        onToggleSound={() => setSoundEnabled(!soundEnabled)}
	        soundEnabled={soundEnabled}
	        onToggleTheme={() => setIsDarkTheme(!isDarkTheme)}
	        theme={isDarkTheme ? "dark" : "light"}
	  onToggleWatchlist={() => setMobileTab("market")}
	        onOpenSidebar={onOpenSidebar}
	        onOpenTransfer={() => {}}
	  onOpenSettings={() => { window.location.assign("/participant/dashboard/settings/security") }}
	        onOpenProfile={() => { window.location.assign("/participant/dashboard/profile") }}
	  onLogout={async () => {
	    clearParticipantAuth()
	    await fetch("/api/auth/participant-logout", { method: "POST" }).catch(() => {})
	    window.location.assign("/participant/login")
	  }}
	        onSearch={(q) => { setPairSearch(q); setShowPairSearch(Boolean(q)) }}
	        onSelectInstrument={(symbol) => {
	          const match = pairs.find(pair => pair.symbol === symbol)
	          if (match) {
	            setSelectedPair(match)
	            setPairSearch("")
	            setShowPairSearch(false)
	            setMobileTab("chart")
	            fetchCandles(match.symbol, timeframe)
	          }
	        }}
	        instruments={pairs.map(pair => ({
	          symbol: pair.symbol,
	          name: FULL_NAMES[pair.symbol] ?? pair.symbol,
	          category: PAIRS_CONFIG.find(config => config.symbol === pair.symbol)?.category ?? "Forex",
	          bid: pair.bid,
	          ask: pair.ask,
	          change: pair.change,
	        }))}
	        notifications={adminNotifications}
	        onMarkNotificationRead={(id) => {
	          markAdminNotificationRead(id)
	        }}
	        onClearNotifications={clearAdminNotifications}
	        activeLanguage="en"
	        onChangeLanguage={() => {}}
	        activeLayout={chartLayout === "grid" ? "pro" : "default"}
	        onChangeLayout={(layout) => setChartLayout(layout === "pro" ? "grid" : "single")}
	        serverTime="UTC"
        marketStatus={online ? "open" : "closed"}
      />
</div>

      <header className="mobile-terminal-header">
        <div className="mobile-terminal-brand-group">
          <a className="mobile-terminal-brand" href="/participant/dashboard" aria-label="Elite Fund home">
            <img src="/elite-fund-logo.jpg" onError={event => { event.currentTarget.src = "/elite-fund-terminal-logo.png" }} alt="" />
            <span><strong>ELITE FUND</strong></span>
          </a>
          <a className="mobile-terminal-home" href="/participant/dashboard" aria-label="Go to dashboard" title="Go to dashboard">
            <Home aria-hidden="true" />
          </a>
        </div>
        <button type="button" className="mobile-terminal-account" onClick={() => onOpenSidebar?.()} aria-label="Open account menu" aria-expanded={onOpenSidebar ? accountMenuOpen : undefined} aria-controls={onOpenSidebar ? "elite-terminal-sidebar" : undefined}>
          <Award className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          <span><strong className="text-xs font-bold text-white">${walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
          <ChevronDown className="h-3 w-3 text-slate-400" aria-hidden="true" />
        </button>
        <button type="button" className="mobile-terminal-notifications" onClick={() => { setMobileTab("chart"); setActivePanel("alerts"); setFooterOpen(true) }} aria-label="Open trading alerts">
          <Bell aria-hidden="true" />
          {(adminNotifications.filter(item => !item.read).length + toasts.length) > 0 && <span>{adminNotifications.filter(item => !item.read).length + toasts.length}</span>}
        </button>
      </header>

      {/* ── DESKTOP ACCOUNT BAR (Hidden on mobile to match sleek terminal header) ── */}
      <header className="terminal-account-bar hidden lg:flex" aria-label="Account overview">
        <div className="terminal-account-dock">
        <div className="terminal-account-stats terminal-scroll" aria-label="Account metrics">
          {[
            { label: "Balance / Equity", value: `$${walletBalance.toFixed(2)} / $${equity.toFixed(2)}`, tone: "neutral" },
            { label: "Free Margin", value: `$${freeMargin.toFixed(2)}`, tone: "neutral", bar: totalMargin > 0 },
            { label: "Net P&L", value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)} (${walletBalance ? ((totalPnl / walletBalance) * 100).toFixed(2) : "0.00"}%)`, tone: totalPnl >= 0 ? "green" : "red" },
            { label: "Drawdown Risk", value: `${dailyDrawdownPct.toFixed(2)}% / 2.00%`, tone: dailyDrawdownPct >= 2 ? "red" : dailyDrawdownPct >= 1.5 ? "gold" : "green" },
          ].map(item => (
            <div key={item.label} className={`terminal-stat tone-${item.tone}`}>
              <span className="terminal-stat-label">{item.label}</span>
              <strong className="terminal-stat-value">{item.value}</strong>
              {item.bar && <div className="terminal-margin-bar"><span style={{ width: `${Math.min(100, marginLevel ? (totalMargin / Math.max(equity, 1)) * 100 : 0)}%` }} /></div>}
            </div>
          ))}
        </div>
        <nav className="terminal-account-actions" aria-label="Account actions">
          <button type="button" className="terminal-action terminal-action-primary" onClick={() => onAddFunds?.() || showToast("info", "Add funds flow opened")}>
            <Wallet className="h-3.5 w-3.5" />
            <span>Add Funds</span>
          </button>
          <button type="button" className="terminal-action terminal-action-withdraw" onClick={() => { window.location.href = "/participant/dashboard/payout" }}>
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>Withdraw</span>
          </button>
          <button type="button" className="terminal-action terminal-action-accent" onClick={() => { window.location.href = "/participant/dashboard/predict" }}>
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Prediction</span>
          </button>
        </nav>
        </div>
      </header>

      {/* ══ REFERENCE WATCHLIST ═══════════��════════════�������══════���══════��������═���═��══������ */}
      <div className="reference-watchlist terminal-watch-strip shrink-0 flex items-center gap-2 px-3 py-2 overflow-x-auto terminal-scroll">
        {watchlistSymbols.map(symbol => {
          const pair = pairs.find(p => p.symbol === symbol)
          if (!pair) return null
          const isSelected = selectedPair?.symbol === pair.symbol
          const up = pair.change >= 0
          return (
            <button key={pair.symbol} type="button" onClick={() => { const next = pairsRef.current.find(item => item.symbol === pair.symbol) ?? pair; setSelectedPair({ ...next, candles: candleCache[`${next.symbol}|${timeframe}`] ?? [] }); fetchCandles(next.symbol, timeframe); setMobileTab("chart") }} className={`reference-watch-card shrink-0 group relative ${isSelected ? "is-selected" : ""}`}>
              <span
                role="button"
                aria-label={`Remove ${pair.symbol} from watchlist`}
                onClick={(e) => { e.stopPropagation(); toggleWatchlistSymbol(pair.symbol) }}
                className="absolute -top-1.5 -right-1.5 hidden group-hover:flex items-center justify-center w-4 h-4 rounded-full text-[9px] leading-none"
                style={{ background: "#1e2d45", color: "#94a3b8", border: "1px solid #334155" }}
              >
                <X className="h-2.5 w-2.5" />
              </span>
              <span className="reference-watch-icon"><AssetLogo symbol={pair.symbol} size={18} className="shrink-0" /></span>
              <span className="reference-watch-copy">
                <strong>{pair.symbol.replace("/", "")}</strong>
                <span>{fmt(pair.bid, pair.symbol)}</span>
              </span>
              <span className={up ? "reference-watch-up" : "reference-watch-down"}>{up ? "+" : ""}{pair.change.toFixed(2)}%</span>
            </button>
          )
        })}
        <div className="relative shrink-0" ref={addInstrumentRef}>
          <button
            ref={addInstrumentBtnRef}
            type="button"
            onClick={() => {
              if (!showAddInstrument && addInstrumentBtnRef.current) {
                const rect = addInstrumentBtnRef.current.getBoundingClientRect()
                setAddInstrumentPos({ top: rect.bottom + 8, left: rect.left })
              }
              setShowAddInstrument(v => !v)
            }}
            className="reference-watch-add"
            aria-label="Add instrument to watchlist"
            aria-expanded={showAddInstrument}
          >
            <Plus />
          </button>
          {showAddInstrument && addInstrumentPos && typeof document !== "undefined" && createPortal(
            <div
              id="add-instrument-popover"
              className="fixed flex flex-col overflow-hidden"
              style={{
                top: addInstrumentPos.top,
                left: Math.max(8, Math.min(addInstrumentPos.left, typeof window !== "undefined" ? window.innerWidth - 290 : addInstrumentPos.left)),
                width: 280, maxWidth: "calc(100vw - 24px)", maxHeight: 360, zIndex: 200,
                background: "#0b111d", border: "1px solid #1e2d45", borderRadius: 10,
                boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
              }}
            >
              <div className="flex items-center gap-2 px-3 py-2.5 shrink-0" style={{ borderBottom: "1px solid #1a2640" }}>
                <Search className="h-3.5 w-3.5" style={{ color: "#3d5a80" }} />
                <input
                  autoFocus
                  type="search"
                  value={addInstrumentQuery}
                  onChange={e => setAddInstrumentQuery(e.target.value)}
                  placeholder="Search instrument..."
                  aria-label="Search instrument to add"
                  className="flex-1 price-mono text-xs text-white bg-transparent focus:outline-none"
                />
              </div>
              <div className="flex-1 overflow-y-auto terminal-scroll">
                {addInstrumentResults.length === 0 && (
                  <div className="px-3 py-6 text-center text-[10px]" style={{ color: "#3d5a80" }}>No instruments found</div>
                )}
                {addInstrumentResults.map(cfg => {
                  const isPinned = watchlistSymbols.includes(cfg.symbol)
                  return (
	                    <button
	                      key={cfg.symbol}
	                      type="button"
	                      onClick={() => toggleWatchlistSymbol(cfg.symbol)}
	                      className="w-full flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-white/5"
	                    >
	                      <AssetLogo symbol={cfg.symbol} size={18} className="shrink-0" />
	                      <span className="flex flex-col items-start flex-1 min-w-0 text-left">
                        <span className="price-mono text-[11px] font-bold text-white">{cfg.symbol}</span>
                        <span className="text-[9px] truncate" style={{ color: "#3d5a80" }}>{FULL_NAMES[cfg.symbol] ?? cfg.symbol}</span>
                      </span>
                      {isPinned && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "#22d3ee" }} />}
                    </button>
                  )
                })}
              </div>
            </div>,
            document.body
          )}
        </div>
        <button type="button" onClick={() => setIsDarkTheme(theme => !theme)} className="reference-watch-theme" aria-label={`Switch to ${isDarkTheme ? "light" : "dark"} theme`}>
          {isDarkTheme ? <Sun /> : <Moon />}
        </button>
      </div>

      <nav className="reference-mobile-nav" aria-label="Trading navigation">
        <button type="button" onClick={() => { setMobileTab("chart"); setActivePanel("positions") }} aria-current={mobileTab === "chart" && activePanel === "positions" ? "page" : undefined} className={mobileTab === "chart" && activePanel === "positions" ? "is-active" : ""}>
          <CandlestickChart aria-hidden="true" /><span>Trade</span>
        </button>
        <button type="button" onClick={() => setMobileTab("market")} aria-current={mobileTab === "market" ? "page" : undefined} className={mobileTab === "market" ? "is-active" : ""}>
          <Globe2 aria-hidden="true" /><span>Markets</span>
        </button>
        <button type="button" onClick={() => { setMobileTab("order"); setActivePanel("positions") }} aria-current={mobileTab === "order" ? "page" : undefined} className={mobileTab === "order" ? "is-active" : ""} aria-label="Open order ticket">
          <Zap aria-hidden="true" /><span>Order</span>
        </button>
        <button type="button" onClick={() => setMobileTab("portfolio")} aria-current={mobileTab === "portfolio" ? "page" : undefined} className={mobileTab === "portfolio" ? "is-active" : ""} aria-label="Open portfolio">
          <Wallet aria-hidden="true" /><span>Portfolio</span>
        </button>
        <button type="button" onClick={() => setMobileTab("account")} aria-label="Open account page" aria-current={mobileTab === "account" ? "page" : undefined} className={mobileTab === "account" ? "is-active" : ""}>
          <UserRound aria-hidden="true" /><span>Account</span>
        </button>
      </nav>

      {mobileTab === "account" && (
        <main id="mobile-account-page" className="mobile-account-page" aria-labelledby="mobile-account-heading">
          <div className="mobile-account-page-header">
            <div>
              <p className="mobile-account-eyebrow">Personal workspace</p>
              <h1 id="mobile-account-heading">Account</h1>
            </div>
            <span className={`mobile-account-kyc-badge ${accountKycTone}`}>
              <span aria-hidden="true" />{accountKycLabel}
            </span>
          </div>

          <section className="mobile-account-profile" aria-label="User profile">
            <div className="mobile-account-avatar" aria-hidden="true">{accountDisplayName.charAt(0).toUpperCase()}</div>
            <div className="mobile-account-profile-copy">
              <span className="mobile-account-profile-label">Account holder</span>
              <strong>{accountDisplayName}</strong>
              <span className="mobile-account-profile-email">{participantEmail || "Email unavailable"}</span>
            </div>
            <button type="button" className="mobile-account-profile-edit" onClick={() => window.location.assign("/participant/dashboard/profile")} aria-label="Edit profile">
              <ArrowUpRight aria-hidden="true" />
            </button>
          </section>

          <section className="mobile-account-details" aria-label="Account details">
            <div className="mobile-account-detail">
              <span>Account type</span>
              <strong>{isFundedAccount ? "Funded account" : "Live account"}</strong>
            </div>
            <div className={`mobile-account-detail ${accountKycTone}`}>
              <span>KYC status</span>
              <strong>{accountKycLabel}</strong>
            </div>
            <div className="mobile-account-detail mobile-account-balance">
              <span>Wallet balance</span>
              <strong>${walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
          </section>

          <section className="mobile-account-actions" aria-label="Funding and payout">
            <button type="button" className="mobile-account-action is-primary" onClick={() => onAddFunds ? onAddFunds() : window.location.assign("/participant/dashboard/contribute")}>
              <span className="mobile-account-action-icon"><Plus aria-hidden="true" /></span>
              <span className="mobile-account-action-copy"><strong>Add funds</strong><small>Deposit into your account</small></span>
              <ArrowUpRight aria-hidden="true" />
            </button>
            <button type="button" className="mobile-account-action" onClick={() => window.location.assign("/participant/dashboard/payout")}>
              <span className="mobile-account-action-icon"><ArrowUpDown aria-hidden="true" /></span>
              <span className="mobile-account-action-copy"><strong>Payout</strong><small>Withdraw available funds</small></span>
              <ArrowUpRight aria-hidden="true" />
            </button>
          </section>

          <button type="button" className="mobile-account-settings" onClick={() => window.location.assign("/participant/dashboard/settings/security")}>
            <span className="mobile-account-settings-icon"><Settings aria-hidden="true" /></span>
            <span><strong>Settings</strong><small>Security and account preferences</small></span>
            <ChevronRight aria-hidden="true" />
          </button>

          <button
            type="button"
            className="mobile-account-logout"
            onClick={async () => {
              clearParticipantAuth()
              await fetch("/api/auth/participant-logout", { method: "POST" }).catch(() => {})
              window.location.assign("/participant/login")
            }}
          >
            <LogOut aria-hidden="true" />
            <span>Log out</span>
          </button>
        </main>
      )}

      {/* ══ MAIN 3-COLUMN GRID ═══════════��════════════�������══════���═��═════════ */}
      <div className="apple-terminal-grid flex-1 flex min-h-0" style={{ borderBottom: "1px solid #1e2d45" }}>
      <div className={mobileTab === "portfolio" ? "hidden lg:flex lg:min-w-0 lg:flex-1" : "flex min-w-0 flex-1"}>
      <DockGroup key={layoutKey} enabled={dockEnabled}>

        {/* ── LEFT: Market Watch ──────────────────────���──────�������───────────────��� */}
        {(!dockEnabled || !chartExpanded) && (
        <DockPanel enabled={dockEnabled} id="market" order={1} defaultSize={19} minSize={14} maxSize={32}>
	        <div className={`apple-terminal-market flex-col shrink-0 ${chartExpanded || mobileTab !== "market" ? "hidden" : "flex"} ${mobileTab === "market" ? "flex" : "hidden lg:flex tablet-panel-hidden"}`}
          style={{ flex: dockEnabled ? "1 1 auto" : `0 0 ${marketPanelWidth}px`, width: dockEnabled ? "100%" : undefined, height: dockEnabled ? "100%" : undefined, maxWidth: "100%", borderRight: "1px solid #1e2d45", background: "#070b13" }}>

          <div className="shrink-0 px-3 pt-3 pb-2.5" style={{ background: "linear-gradient(180deg, rgba(12,32,54,0.98), rgba(7,11,19,0.98))", borderBottom: "1px solid rgba(34,211,238,0.22)", boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.32)", boxShadow: "0 0 14px rgba(34,211,238,0.14)" }}>
                  <Activity className="h-3.5 w-3.5 text-cyan-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black tracking-[0.18em] text-white uppercase">Market Watch</span>
                    <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-emerald-300">Live</span>
                  </div>
                  <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-500">Real-time instruments</span>
                </div>
              </div>
            </div>
            <div role="search" className="mb-2 flex items-center gap-2 rounded-md px-2.5" style={{ height: 44, border: "1px solid #1a2640", background: "rgba(4,12,22,0.72)" }}>
              <Search className="size-3.5 shrink-0" style={{ color: "#6f8aa3" }} aria-hidden="true" />
              <input
                ref={pairSearchRef}
                type="text"
                aria-label="Search instruments"
                placeholder="Search symbol or name..."
                value={pairSearch}
                onChange={(event) => setPairSearch(event.currentTarget.value)}
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500"
              />
              {pairSearch && (
                <button
                  type="button"
                  aria-label="Clear instrument search"
                  onClick={() => setPairSearch("")}
                  className="flex size-10 shrink-0 items-center justify-center rounded"
                  style={{ minHeight: 42, color: "#8ba0b5" }}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
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

          <div className="apple-market-table-head grid shrink-0 px-3 py-1.5" style={{ gridTemplateColumns: "1fr 72px 52px", background: "#0a1321", borderBottom: "1px solid #1e2d45" }}>
            <span className="text-[8px] font-black tracking-[0.15em] uppercase" style={{ color: "#6f8aa3" }}>Instrument</span>
            <span className="text-[8px] font-black tracking-[0.15em] uppercase text-right" style={{ color: "#6f8aa3" }}>Bid / Ask</span>
            <span className="text-[8px] font-black tracking-[0.15em] uppercase text-right" style={{ color: "#6f8aa3" }}>Chg%</span>
          </div>

          <div id="market-watch-instruments" className="min-h-0 flex-1 overflow-y-auto terminal-scroll">
            {loading ? (
              <div className="p-2 flex flex-col gap-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-11 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
                ))}
              </div>
            ) : (
              (() => {
                const cats: AssetCategory[] = ["Forex", "Commodities", "Crypto"]
                const toShow = hasInstrumentSearch || activeCategory === "All" ? cats : [activeCategory as AssetCategory]
                return (
                  <>
                  {searchNoResults && (
                    <div className="px-3 py-8 text-center text-[10px] text-slate-400">No instruments match “{pairSearch}”.</div>
                  )}
                  {toShow.map(cat => {
                  const catPairs = filteredPairs.filter(p => PAIRS_CONFIG.find(c => c.symbol === p.symbol)?.category === cat)
                  if (catPairs.length === 0) return null
                  const cc = CATEGORY_COLOR[cat]
                  return (
                    <div key={cat}>
                      {(activeCategory === "All" || hasInstrumentSearch) && (
                        <div className="apple-market-category-row flex items-center gap-2 px-3 py-1.5 sticky top-0 z-10"
                          style={{ background: "#0b1625", borderBottom: `1px solid ${cc.border}22`, borderTop: "1px solid #152338" }}>
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cc.text, boxShadow: `0 0 6px ${cc.text}` }} />
                          <span className="text-[9px] font-black tracking-[0.2em] uppercase" style={{ color: cc.text }}>
                            {cat === "Commodities" ? "Precious Metals" : cat === "Forex" ? "Forex Majors" : "Cryptocurrency"}
                          </span>
                          <span className="text-[8px] ml-auto" style={{ color: "#6f8aa3" }}>{catPairs.length}</span>
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
	                                <div className="mw-badge flex items-center justify-center shrink-0 relative">
	                                  <AssetLogo symbol={p.symbol} size={22} className="shrink-0" />
	                                  {hasTrade && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />}
	                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-black leading-none" style={{ color: isSelected ? "#ffffff" : "#c8d4e4" }}>{base}</span>
                                    <span className="text-[9px] font-bold leading-none" style={{ color: "#89a3bb" }}>/{quote}</span>
                                  </div>
                                  <div className="text-[8px] leading-none mt-0.5 truncate" style={{ color: "#9fb4c8" }}>{FULL_NAMES[p.symbol] ?? p.symbol}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="price-mono text-[10px] font-black leading-none" style={{ color: up ? "#10b981" : "#ef4444" }}>{fmt(p.bid, p.symbol)}</div>
                                <div className="price-mono text-[9px] leading-none mt-0.5" style={{ color: "#9fb4c8" }}>{fmt(p.ask, p.symbol)}</div>
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
                  })}
                  </>
                )
              })()
            )}
          </div>

          <div className="apple-market-footer shrink-0 flex items-center justify-between px-3 py-2 gap-2" style={{ borderTop: "1px solid #1e2d45", background: "#0a1321" }}>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "#10b981", animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite" }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "#10b981" }} />
              </span>
              <span className="text-[9px] font-black tracking-wider truncate" style={{ color: "#345777" }}>
                {visibleInstrumentCount} {hasInstrumentSearch ? "matching " : ""}live instruments
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {(["Forex", "Commodities", "Crypto"] as AssetCategory[]).map(cat => {
                const count = pairs.filter(p => PAIRS_CONFIG.find(c => c.symbol === p.symbol)?.category === cat).length
                return (
                  <span key={cat} className="text-[8px] font-black px-1.5 py-0.5 rounded-md"
                    style={{ background: CATEGORY_COLOR[cat].bg, color: CATEGORY_COLOR[cat].text, border: `1px solid ${CATEGORY_COLOR[cat].border}` }}>
                    {cat === "Commodities" ? "Au/Ag" : cat === "Forex" ? "FX" : "C"} {count}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
        {/* ── CENTER: Chart ────���─��────����────���─���─���────���─��────────────────������─────── */}
        </DockPanel>
        )}
        {!chartExpanded && <DockHandle enabled={dockEnabled} />}
        <DockPanel enabled={dockEnabled} id="chart" order={2} defaultSize={57} minSize={34}>
        <div className={`apple-terminal-chart-column min-w-0 flex-1 flex-col ${dockEnabled ? "h-full w-full" : ""} ${mobileTab !== "chart" ? "hidden" : "flex"} ${mobileTab === "chart" ? "flex" : "hidden lg:flex"} ${chartExpanded ? "is-chart-expanded" : ""}`}>
          {/* Pair header */}
          {selectedPair ? (
            <div className="chart-header terminal-market-dock shrink-0 flex flex-col px-3 py-1.5 gap-1.5" style={{ background: "linear-gradient(180deg, #0d1727 0%, #080c14 100%)", borderBottom: "1px solid #243752", boxShadow: "0 4px 16px rgba(0,0,0,.2)" }}>
              {/* Primary Market Bar */}
              <div className="terminal-market-dock-primary-row flex flex-wrap items-center justify-between gap-2">
                {/* Symbol & Price Group */}
                <div className="terminal-market-dock-quote flex items-center gap-2.5 min-w-0">
	                  <button type="button" onClick={() => setMobileTab("market")} className="chart-symbol-switch flex items-center gap-1.5 text-sm font-black text-white tracking-wider hover:text-cyan-300 transition-colors" aria-label={`${selectedPair.symbol} selected. Open instrument list`}>
	                    <AssetLogo symbol={selectedPair.symbol} size={20} className="shrink-0" />
	                    <span>{selectedPair.symbol}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  </button>
                  {(() => {
                    const cat = PAIRS_CONFIG.find(c => c.symbol === selectedPair.symbol)?.category
                    if (!cat || cat === "Forex") return null
                    const cc = CATEGORY_COLOR[cat]
                    return <span className="text-[8px] font-black px-1.5 py-0.5 uppercase tracking-wider rounded" style={{ background: cc.bg, color: cc.text, border: `1px solid ${cc.border}` }}>{cat}</span>
                  })()}
                  <span className="price-mono text-sm font-black" style={{ color: isUp ? "#10b981" : "#ef4444" }}>{fmt(selectedPair.bid, selectedPair.symbol)}</span>
                  <span className="price-mono text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: isUp ? "#10b981" : "#ef4444", background: isUp ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)" }}>{isUp ? "+" : ""}{(selectedPair.change ?? 0).toFixed(2)}%</span>
                </div>

	                {/* Key Quote Metrics (Compact & Non-duplicated) */}
	                <div className="hidden lg:flex items-center gap-3 text-[10px] price-mono font-semibold">
	                  <span className="text-slate-400">BID <strong className="text-red-400">{fmt(selectedPair.bid, selectedPair.symbol)}</strong></span>
	                  <span className="text-slate-400">ASK <strong className="text-emerald-400">{fmt(selectedPair.ask, selectedPair.symbol)}</strong></span>
	                  <span className="text-slate-400">SPR <strong className="text-cyan-400">{((selectedPair.spread / pip(selectedPair.symbol)) || 0).toFixed(1)}p</strong></span>
	                  <span className="text-slate-400">H <strong className="text-emerald-400">{fmt(selectedPair.high, selectedPair.symbol)}</strong></span>
	                  <span className="text-slate-400">L <strong className="text-red-400">{fmt(selectedPair.low, selectedPair.symbol)}</strong></span>
	                </div>

	                {/* Chart Controls & Tools Group */}
	                <div className="terminal-market-dock-tools flex items-center gap-1.5 ml-auto">
                  {/* Chart layout and live-data tools */}

	                  <button
	                    type="button"
	                    onClick={() => setChartLayout(v => v === "single" ? "grid" : "single")}
	                    aria-label={chartLayout === "single" ? "Switch to grid layout" : "Switch to single layout"}
	                    className="p-1 rounded border border-[#1e2d45] bg-[#0b1625] text-purple-300 hover:border-purple-500/40"
	                  >
	                    {chartLayout === "single" ? <Grid3x3 className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
	                  </button>

	                  {/* Tools Dropdown */}
	                  <select
	                    onChange={e => { if (e.target.value) { setActivePanel(e.target.value as any); e.target.value = "" } }}
	                    className="rounded border border-[#1e2d45] bg-[#0b1625] px-1.5 py-1 text-[9px] font-bold text-slate-300 outline-none cursor-pointer"
	                    defaultValue=""
	                    aria-label="Workspace tools menu"
	                  >
	                    <option value="" disabled>TOOLS ▾</option>
	                    <option value="dom" className="bg-[#0b1625] text-white">L2 Order Book</option>
	                    <option value="risk" className="bg-[#0b1625] text-white">Risk Analytics</option>
	                    <option value="alerts" className="bg-[#0b1625] text-white">Price Alerts</option>
	                    <option value="ai-coach" className="bg-[#0b1625] text-white">AI Guide</option>
	                  </select>

	                  {candleLoading && <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />}
	                </div>
	              </div>
	            </div>
	          ) : (
	            <div className="shrink-0 flex items-center px-3 py-2 text-[11px] text-slate-700" style={{ background: "#080c14", borderBottom: "1px solid #1e2d45" }}>
	              Select an instrument to begin trading
	            </div>
	          )}

	          {/* Chart + Timeframe Dock + Quick Trade + Instrument Details + Blotter strip */}
	          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto terminal-scroll" style={{ background: "#080c14", WebkitOverflowScrolling: "touch" }}>
	            <div className="relative flex-1 min-h-[460px] h-[58vh] max-h-[620px] min-w-0 mobile-terminal-chart-wrap chart-surface">
	              {selectedPair && chartLayout === "single" ? (
	                <ErrorBoundary key={`${selectedPair?.symbol ?? "none"}|${timeframe}|${chartReloadKey}`} fallback={
	                  <div className="chart-silent-error" aria-hidden="true">
	                    {selectedPair?.candles?.length ? <TradingChart candles={selectedPair.candles} sym={selectedPair.symbol} tf={timeframe} openTrades={openTrades.filter(t => t.pair === selectedPair.symbol)} onExpand={() => setChartExpanded(e => !e)} isExpanded={false} onQuickTrade={quickTrade} buyPrice={selectedPair.ask} sellPrice={selectedPair.bid} darkTheme={isDarkTheme} marketStatus={online ? "live" : "reconnecting"} /> : null}
	                  </div>
	                }>
  <div className="terminal-single-chart-stack h-full min-h-0 w-full flex-1">
  <div className="terminal-native-chart-panel h-full min-h-0 w-full flex-1">
  <TradingChart
  key={`${selectedPair.symbol}|${timeframe}|${isDarkTheme ? "dark" : "light"}`}
  candles={selectedPair.candles}
  sym={selectedPair.symbol}
  tf={timeframe}
  openTrades={openTrades.filter(t => t.pair === selectedPair.symbol)}
  onExpand={() => setChartExpanded(e => !e)}
  isExpanded={chartExpanded}
  onQuickTrade={quickTrade}
  buyPrice={selectedPair.ask}
  sellPrice={selectedPair.bid}
  darkTheme={isDarkTheme}
  marketStatus={online ? "live" : marketError ? "reconnecting" : "connecting"}
  livePrice={(selectedPair.bid + selectedPair.ask) / 2}
  />
  </div>
  </div>
	                </ErrorBoundary>
	              ) : selectedPair && chartLayout === "grid" ? (
	                <MiniChartGrid
	                  pairs={pairs}
	                  selectedSymbol={selectedPair.symbol}
	                  onSelect={(sym) => {
	                    const p = pairs.find(x => x.symbol === sym)
	                    if (p) {
	                      setSelectedPair(p)
	                      fetchCandles(sym, timeframe)
	                    }
	                  }}
	                  tickCount={tickCount}
	                />
	              ) : (
	                <div className="flex flex-col items-center justify-center h-full gap-3">
	                  <CandlestickChart className="h-12 w-12 text-slate-800" />
	                  <p className="text-slate-700 text-sm font-bold tracking-wider">SELECT AN INSTRUMENT</p>
	                </div>
	              )}
	            </div>

	            {/* ── Timeframe Selector Bar (Docked at Bottom of Chart) ── */}
	            <div className="shrink-0 flex items-center justify-between gap-1.5 px-3 py-1.5 bg-[#070e1a] border-t border-b border-[#1a293d] overflow-x-auto terminal-scroll">
	              <div className="flex items-center gap-1">
	                {(["1M", "5M", "15M", "30M", "1H", "4H", "1D", "1W"] as TimeFrame[]).map(tf => {
	                  const active = timeframe === tf
	                  return (
	                    <button
	                      key={tf}
	                      type="button"
	                      onClick={() => setTimeframe(tf)}
	                      aria-pressed={active}
	                      className={`px-2.5 py-1 text-[10px] font-black tracking-wide rounded-md transition-all shrink-0 ${
	                        active
	                          ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/60 shadow-[0_0_10px_rgba(34,211,238,0.25)]"
	                          : "bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:text-slate-200 hover:bg-white/[0.08]"
	                      }`}
	                    >
	                      {tf}
	                    </button>
	                  )
	                })}
	              </div>

	              {/* Provider Quick Toggle */}
	              <div className="flex items-center gap-1 shrink-0 ml-1">

	              </div>
	            </div>

	            {/* ── Quick Trade Dock (Revealed on Scroll) ── */}
	            <div className="reference-chart-trade-dock shrink-0">
	              <div className="reference-chart-trade-heading">
	                <span>Quick trade</span>
	                <span>{selectedPair ? `${selectedPair.symbol} �� Market Execution` : "Select an instrument"}</span>
	              </div>
	              <div className="reference-chart-trade-actions">
	                <button type="button" onClick={() => quickTrade("BUY")} disabled={!selectedPair || isFrozen || !balanceLoaded || estimatedMargin > walletBalance} className="reference-quick-trade reference-quick-trade-buy btn-3d-execute-buy">
	                  <span><TrendingUp className="h-3.5 w-3.5" /> BUY</span>
	                  <strong>{selectedPair ? fmt(selectedPair.ask, selectedPair.symbol) : "—"}</strong>
	                </button>
	                <button type="button" onClick={() => quickTrade("SELL")} disabled={!selectedPair || isFrozen || !balanceLoaded || estimatedMargin > walletBalance} className="reference-quick-trade reference-quick-trade-sell btn-3d-execute-sell">
	                  <span><TrendingDown className="h-3.5 w-3.5" /> SELL</span>
	                  <strong>{selectedPair ? fmt(selectedPair.bid, selectedPair.symbol) : "—"}</strong>
	                </button>
	              </div>
	              <button type="button" onClick={() => setMobileTab("order")} disabled={!selectedPair || isFrozen} className="reference-make-order">
	                <Zap className="h-3.5 w-3.5" /> MAKE ORDER
	                <span>Open full order ticket</span>
	              </button>
	            </div>

	            {/* ── Rich Instrument Details & Key Stats ── */}
	            {selectedPair && (
	              <div className="shrink-0 mx-3 my-2 p-3 rounded-xl border border-[#1e2d45] bg-[#07111e]/90 backdrop-blur-md shadow-lg">
	                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#162338]">
	                  <div className="flex items-center gap-2">
	                    <AssetLogo symbol={selectedPair.symbol} size={18} className="shrink-0" />
	                    <span className="text-xs font-black text-white tracking-wide">{selectedPair.symbol} Overview</span>
	                  </div>
	                  <span className="text-[9px] font-bold text-slate-400">
	                    {online ? "● Market Live" : "○ Market Closed"}
	                  </span>
	                </div>

	                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
	                  <div className="flex flex-col p-2 rounded-lg bg-[#040810]/70 border border-[#121c2e]">
	                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">24h High</span>
	                    <span className="price-mono font-black text-emerald-400 text-xs mt-0.5">{fmt(selectedPair.high, selectedPair.symbol)}</span>
	                  </div>
	                  <div className="flex flex-col p-2 rounded-lg bg-[#040810]/70 border border-[#121c2e]">
	                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">24h Low</span>
	                    <span className="price-mono font-black text-red-400 text-xs mt-0.5">{fmt(selectedPair.low, selectedPair.symbol)}</span>
	                  </div>
	                  <div className="flex flex-col p-2 rounded-lg bg-[#040810]/70 border border-[#121c2e]">
	                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Spread</span>
	                    <span className="price-mono font-black text-cyan-300 text-xs mt-0.5">{((selectedPair.spread / pip(selectedPair.symbol)) || 0).toFixed(1)} pips</span>
	                  </div>
	                  <div className="flex flex-col p-2 rounded-lg bg-[#040810]/70 border border-[#121c2e]">
	                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">24h Change</span>
	                    <span className={`price-mono font-black text-xs mt-0.5 ${isUp ? "text-emerald-400" : "text-red-400"}`}>
	                      {isUp ? "+" : ""}{(selectedPair.change ?? 0).toFixed(2)}%
	                    </span>
	                  </div>
	                  <div className="flex flex-col p-2 rounded-lg bg-[#040810]/70 border border-[#121c2e]">
	                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Leverage</span>
	                    <span className="price-mono font-black text-purple-300 text-xs mt-0.5">1:{effectiveLeverage}</span>
	                  </div>
	                  <div className="flex flex-col p-2 rounded-lg bg-[#040810]/70 border border-[#121c2e]">
	                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pip Value</span>
	                    <span className="price-mono font-black text-amber-300 text-xs mt-0.5">~$10.00 / lot</span>
	                  </div>
	                  <div className="flex flex-col p-2 rounded-lg bg-[#040810]/70 border border-[#121c2e]">
	                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Contract Size</span>
	                    <span className="price-mono font-black text-slate-200 text-xs mt-0.5">
	                      {isCommodity(selectedPair.symbol) ? "100 oz" : isCrypto(selectedPair.symbol) ? "1 Coin" : "100,000 units"}
	                    </span>
	                  </div>
	                  <div className="flex flex-col p-2 rounded-lg bg-[#040810]/70 border border-[#121c2e]">
	                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Est. Margin</span>
	                    <span className="price-mono font-black text-cyan-400 text-xs mt-0.5">${estimatedMargin.toFixed(2)}</span>
	                  </div>
	                </div>
	              </div>
	            )}

	            {/* ── Mobile Activity / Blotter Section ── */}
	            <div className="hidden shrink-0 mx-3 my-2 mb-20 md:mb-4 rounded-xl border border-[#1e2d45] bg-[#07111e]/90 overflow-hidden shadow-lg">
	              <div className="flex items-center justify-between px-3 py-2 bg-[#050a12] border-b border-[#162338]">
	                <div className="flex items-center gap-1.5">
	                  <Layers className="h-3.5 w-3.5 text-cyan-400" />
	                  <span className="text-xs font-black uppercase tracking-wider text-white">Active Blotter</span>
	                </div>
	                <div className="flex items-center gap-1">
	                  <button
	                    type="button"
	                    onClick={() => setActivePanel("positions")}
	                    className={`px-2.5 py-1 text-[9px] font-black rounded-md uppercase transition-all ${
	                      activePanel === "positions" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40" : "text-slate-400 hover:text-slate-200"
	                    }`}
	                  >
	                    Positions ({openTrades.length})
	                  </button>
	                  <button
	                    type="button"
	                    onClick={() => setActivePanel("pending")}
	                    className={`px-2.5 py-1 text-[9px] font-black rounded-md uppercase transition-all ${
	                      activePanel === "pending" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40" : "text-slate-400 hover:text-slate-200"
	                    }`}
	                  >
	                    Orders ({pendingOrders.length})
	                  </button>
	                  <button
	                    type="button"
	                    onClick={() => setActivePanel("history")}
	                    className={`px-2.5 py-1 text-[9px] font-black rounded-md uppercase transition-all ${
	                      activePanel === "history" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40" : "text-slate-400 hover:text-slate-200"
	                    }`}
	                  >
	                    History ({closedTrades.length})
	                  </button>
	                </div>
	              </div>

	              <div className="p-3">
	                {activePanel === "positions" && (
	                  openTrades.length === 0 ? (
	                    <div className="flex flex-col items-center justify-center py-6 text-center text-slate-500 gap-1.5">
	                      <Layers className="h-6 w-6 opacity-30 text-slate-400" />
	                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">No Open Positions</span>
	                      <span className="text-[10px] text-slate-500">Place a BUY or SELL order to begin</span>
	                    </div>
	                  ) : (
	                    <div className="flex flex-col gap-2">
	                      {openTrades.map(trade => (
	                        <div key={trade.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#040810] border border-[#162338]">
	                          <div className="flex items-center gap-2">
	                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${trade.direction === "BUY" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>
	                              {trade.direction}
	                            </span>
	                            <div className="flex flex-col">
	                              <span className="text-xs font-black text-white">{trade.pair}</span>
	                              <span className="text-[9px] text-slate-400">{trade.lotSize.toFixed(2)} lots @ {fmt(trade.openPrice, trade.pair)}</span>
	                            </div>
	                          </div>
	                          <div className="flex items-center gap-2.5">
	                            <div className="flex flex-col items-end">
	                              <span className={`text-xs font-black price-mono ${trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
	                                {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
	                              </span>
	                              <span className="text-[8px] text-slate-500">P&L</span>
	                            </div>
	                            <button
	                              type="button"
	                              onClick={() => closeTrade(trade.id)}
	                              className="px-2 py-1 rounded text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/25 hover:bg-red-500/20"
	                            >
	                              Close
	                            </button>
	                          </div>
	                        </div>
	                      ))}
	                    </div>
	                  )
	                )}

	                {activePanel === "pending" && (
	                  pendingOrders.length === 0 ? (
	                    <div className="flex flex-col items-center justify-center py-6 text-center text-slate-500 gap-1.5">
	                      <Clock className="h-6 w-6 opacity-30 text-slate-400" />
	                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">No Pending Orders</span>
	                      <span className="text-[10px] text-slate-500">Create Limit or Stop orders from the Order ticket</span>
	                    </div>
	                  ) : (
	                    <div className="flex flex-col gap-2">
	                      {pendingOrders.map(order => (
	                        <div key={order.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#040810] border border-[#162338]">
	                          <div className="flex items-center gap-2">
	                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
	                              {order.orderType} {order.direction}
	                            </span>
	                            <div className="flex flex-col">
	                              <span className="text-xs font-black text-white">{order.pair}</span>
	                              <span className="text-[9px] text-slate-400">{order.lotSize.toFixed(2)} lots @ {fmt(order.targetPrice, order.pair)}</span>
	                            </div>
	                          </div>
	                          <button
	                            type="button"
	                            onClick={() => cancelPending(order.id)}
	                            className="px-2 py-1 rounded text-[9px] font-bold text-slate-400 bg-slate-800/40 border border-slate-700 hover:text-red-400"
	                          >
	                            Cancel
	                          </button>
	                        </div>
	                      ))}
	                    </div>
	                  )
	                )}

	                {activePanel === "history" && (
	                  closedTrades.length === 0 ? (
	                    <div className="flex flex-col items-center justify-center py-6 text-center text-slate-500 gap-1.5">
	                      <History className="h-6 w-6 opacity-30 text-slate-400" />
	                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">No Trade History</span>
	                      <span className="text-[10px] text-slate-500">Closed positions will be recorded here</span>
	                    </div>
	                  ) : (
	                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto terminal-scroll">
	                      {closedTrades.slice(0, 10).map((trade, idx) => (
	                        <div key={trade.id || idx} className="flex items-center justify-between p-2 rounded-lg bg-[#040810] border border-[#162338]">
	                          <div className="flex items-center gap-2">
	                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${trade.direction === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
	                              {trade.direction}
	                            </span>
	                            <span className="text-xs font-bold text-white">{trade.pair}</span>
	                          </div>
	                          <span className={`text-xs font-black price-mono ${trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
	                            {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
	                          </span>
	                        </div>
	                      ))}
	                    </div>
	                  )
	                )}
	              </div>
	            </div>
	          </div>
	        </div>
	        {/* RIGHT: Order Ticket */}
	        </DockPanel>
        {dockEnabled && chartExpanded ? null : rightPanelHidden ? (
          <div className="reference-sidebar-collapsed shrink-0 items-start justify-center pt-2" style={{ borderLeft: "1px solid #1e2d45", background: "#070b13" }}>
            <button
              type="button"
              onClick={() => setRightPanelHidden(false)}
              aria-label="Show trading sidebar (Ctrl+Shift+O)"
              title="Show trading sidebar (Ctrl+Shift+O)"
              className="rounded p-1.5 text-cyan-400 transition-colors hover:bg-cyan-400/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        ) : (
        <>
        <DockHandle enabled={dockEnabled} />
        <DockPanel enabled={dockEnabled} id="order" order={3} defaultSize={24} minSize={19} maxSize={36}>
        <div className={`apple-terminal-order flex-col shrink-0 ${mobileTab !== "order" || chartExpanded ? "hidden" : "flex"} ${mobileTab === "order" ? "flex" : "hidden lg:flex"}`}
          style={{ flex: dockEnabled ? "1 1 auto" : `0 0 ${orderPanelWidth}px`, width: dockEnabled ? "100%" : undefined, height: dockEnabled ? "100%" : undefined, maxWidth: "100%", borderLeft: "1px solid #243752", background: "linear-gradient(180deg, #0a1321 0%, #070b13 100%)" }}>

          {/* Right panel tab switcher */}
          <div className="terminal-order-panel-header flex shrink-0 items-stretch bg-[#08101d] border-b border-[#1a2640]">
            <div className="flex min-w-0 flex-1 items-center gap-2 px-2.5">
              <Zap className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <div className="min-w-0"><div className="truncate text-[10px] font-black uppercase tracking-wider text-white">Order Panel</div></div>
            </div>
            <div className="terminal-order-view-dock" role="group" aria-label="Order panel view">
              {[{ id: "order", label: "Order", icon: Zap }, { id: "sizer", label: "Sizer", icon: Target }].map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setRightPanelTab(id as typeof rightPanelTab)}
                  aria-pressed={rightPanelTab === id}
                  className="flex min-w-[48px] flex-1 items-center justify-center gap-1 px-1 py-2 text-[9px] font-black tracking-wider uppercase transition-colors"
                  style={{
                    color: rightPanelTab === id ? "#22d3ee" : "#64748b",
                    borderBottom: rightPanelTab === id ? "2px solid #22d3ee" : "2px solid transparent",
                    background: rightPanelTab === id ? "rgba(34,211,238,0.05)" : "transparent",
                  }}>
                  <Icon className="h-3 w-3" />{label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setRightPanelHidden(true)}
              aria-label="Hide trading sidebar (Ctrl+Shift+O)"
              title="Hide trading sidebar (Ctrl+Shift+O)"
              className="px-2 text-slate-500 transition-colors hover:text-cyan-400"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

		          {/* Order panel */}
		          {rightPanelTab === "order" && selectedPair ? (
		            <div className="flex-1 overflow-y-auto terminal-scroll">
		              <div className="mobile-order-ticket flex flex-col gap-2 p-2 pb-[calc(76px+env(safe-area-inset-bottom,0px))] md:pb-2">
	                {/* Header banner */}
	                <div className="flex items-center justify-between rounded-lg border border-[#1e2d45] bg-[#071221] px-2.5 py-1.5 shadow-sm">
	                  <div className="flex items-center gap-2">
	                    <span className="text-xs font-black uppercase tracking-wider text-cyan-300">{selectedPair.symbol}</span>
	                    <span className="text-[9px] font-bold text-slate-400">1:{effectiveLeverage}</span>
	                  </div>
	                  <div className="flex items-center gap-1.5">
	                    <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${balanceLoaded ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20" : "bg-amber-400/10 text-amber-300 border border-amber-400/20"}`}>
	                      {balanceLoaded ? "Ready" : "Loading"}
	                    </span>
	                    <span className="rounded border border-cyan-400/20 bg-cyan-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-cyan-300">{online ? "Live" : "Offline"}</span>
	                  </div>
	                </div>

	                {/* Order type tabs */}
                <div className="terminal-order-type-dock flex items-stretch overflow-hidden rounded-lg border border-[#1a2640] bg-[#070a10]">
                  {(["market","limit","stop"] as typeof orderType[]).map(ot => (
                    <button key={ot} type="button" onClick={() => {
	                      setOrderType(ot)
	                      if (ot === "market") {
	                        setPendingPrice("")
	                      } else if (selectedPair) {
	                        const quote = direction === "BUY" ? selectedPair.ask : selectedPair.bid
	                        const offset = pip(selectedPair.symbol) * 10
	                        const suggested = ot === "limit"
	                          ? (direction === "BUY" ? quote - offset : quote + offset)
	                          : (direction === "BUY" ? quote + offset : quote - offset)
	                        setPendingPrice(suggested.toFixed(decimals(selectedPair.symbol)))
	                      }
	                    }}
                      aria-pressed={orderType === ot}
                      className="flex min-w-0 flex-1 items-center justify-center px-2 py-2 text-[9px] font-black uppercase tracking-wider transition-colors">
                      {ot}
	                    </button>
	                  ))}
	                </div>

		                {/* Single Executable Quote / Direction Selector */}
                <div className="terminal-order-quote-dock mobile-quote-switch relative flex items-stretch overflow-hidden rounded-lg border border-[#1a2640] bg-[#07101b]">
                  <button type="button" onClick={() => setOrderDirection("SELL")}
                    aria-label={`Sell ${selectedPair.symbol} at ${fmt(selectedPair.bid, selectedPair.symbol)}`}
                    aria-pressed={direction === "SELL"}
                    data-active={direction === "SELL"}
                    className="mobile-quote-side mobile-quote-sell flex min-w-0 flex-1 flex-col items-start justify-center px-2.5 py-2 text-left transition-colors">
                    <span className="block text-[8px] font-black tracking-wider uppercase text-rose-300">Sell · Bid</span>
                    <span className="price-mono text-sm font-black text-white">{fmt(selectedPair.bid, selectedPair.symbol)}</span>
                  </button>
                  <button type="button" onClick={() => setOrderDirection("BUY")}
                    aria-label={`Buy ${selectedPair.symbol} at ${fmt(selectedPair.ask, selectedPair.symbol)}`}
                    aria-pressed={direction === "BUY"}
                    data-active={direction === "BUY"}
                    className="mobile-quote-side mobile-quote-buy flex min-w-0 flex-1 flex-col items-end justify-center px-2.5 py-2 text-right transition-colors">
                    <span className="block text-[8px] font-black tracking-wider uppercase text-emerald-300">Buy · Ask</span>
                    <span className="price-mono text-sm font-black text-white">{fmt(selectedPair.ask, selectedPair.symbol)}</span>
                  </button>
			                  <div className="mobile-quote-spread pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded border border-[#243752] bg-[#0d1726] px-2 py-0.5 text-center">
			                    <span className="price-mono text-[9px] font-black text-slate-300">{((selectedPair.spread / pip(selectedPair.symbol)) || 0).toFixed(1)}p</span>
			                  </div>
			                </div>

		                {/* Pending price (limit/stop) */}
	                {orderType !== "market" && (
	                  <div className="rounded-lg border border-cyan-400/20 bg-[#07101b] p-2 flex flex-col gap-1.5">
	                    <label className="text-[8px] font-bold tracking-widest uppercase text-cyan-300">
	                      {orderType === "limit" ? "Limit Price" : "Stop Price"}
	                    </label>
	                    <input type="number" value={pendingPrice} onChange={e => setPendingPrice(e.target.value)}
	                      placeholder={fmt(midPrice, selectedPair.symbol)}
	                      className="w-full price-mono text-sm font-black text-white focus:outline-none px-2 py-1.5 rounded bg-[#070a10] border border-cyan-400/30" />
                    <div className="terminal-order-expiry-dock flex items-stretch overflow-hidden rounded-md border border-[#1a2640] bg-[#070a10]">
                      {(["GTC","TODAY"] as PendingOrder["expiry"][]).map(e => (
                        <button key={e} type="button" onClick={() => setPendingExpiry(e)} aria-pressed={pendingExpiry === e}
                          className="min-w-0 flex-1 px-2 py-1 text-[8px] font-black tracking-wider uppercase transition-colors"
                          style={pendingExpiry === e
                            ? { background: "rgba(34,211,238,0.15)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.3)" }
                            : { background: "#070a10", color: "#64748b", border: "1px solid #1a2640" }}>
                          {e}
	                        </button>
	                      ))}
	                    </div>
	                  </div>
	                )}

			                {/* Volume (lots) */}
			                <div className="rounded-lg border border-[#1a2640] bg-[#07101b] p-2 flex flex-col gap-1.5">
			                  <div className="flex items-center justify-between">
			                    <label className="text-[8px] font-black tracking-wider uppercase text-cyan-300">
			                      Trade size (lots)
			                    </label>
			                    <span className="text-[8px] font-bold text-slate-400">Leverage: 1:{effectiveLeverage}</span>
			                  </div>
			                  <input type="number" value={lotSize} onChange={e => {
			                    const next = Number.parseFloat(e.target.value)
			                    setLotSize(isFundedAccount && Number.isFinite(next) && next > 0 ? Math.max(next, minimumFundedLots).toFixed(2) : e.target.value)
			                  }}
			                  onBlur={() => {
			                    if (isFundedAccount) setLotSize(Math.max(Number.parseFloat(lotSize) || 0.01, minimumFundedLots).toFixed(2))
			                  }}
			                  step="0.01" min={isFundedAccount ? minimumFundedLots : 0.01} max="100" aria-describedby="lot-size-help"
			                  className="w-full price-mono text-sm font-black text-white focus:outline-none px-2.5 py-1.5 rounded bg-[#070a10] border border-[#243752]"
			                  placeholder="0.01"
			                  />
			                  {isFundedAccount && <p id="lot-size-help" className="text-[9px] font-semibold text-cyan-300">Auto min: {minimumFundedLots.toFixed(2)} lots · $3,000 margin</p>}
                  <div className="terminal-order-size-dock flex items-stretch overflow-hidden rounded-md border border-[#1a2640] bg-[#070a10]">
                    {["0.01","0.10","0.50","1.00","5.00","10.0"].map(l => (
                      <button key={l} type="button" onClick={() => setLotSize(l)} aria-pressed={lotSize === l}
                        className="min-w-0 flex-1 px-1 py-1 text-[7px] font-black tracking-wide transition-colors">
                        {l}
				                      </button>
				                    ))}
				                  </div>
	                </div>

                {/* Essential Risk controls (SL / TP) */}
                <div className="rounded-lg border border-[#1a2640] bg-[#07101b] p-2 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Stop Loss & Take Profit</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* SL */}
                    <div>
                      <label className="text-[8px] font-black tracking-wider uppercase mb-1 flex items-center justify-between text-rose-400">
                        <span className="flex items-center gap-1"><ShieldAlert className="h-2.5 w-2.5" /> SL</span>
                        {slVal !== null && <span className="text-[8px] font-bold text-slate-400">{slPips.toFixed(1)}p · -${maxLoss.toFixed(2)}</span>}
                      </label>
                      <input type="number" value={sl} onChange={e => setSl(e.target.value)}
                        className="w-full price-mono text-xs font-bold text-white focus:outline-none px-2 py-1.5 rounded bg-[#0d0204] border border-rose-500/30"
                        placeholder={fmt(midPrice * (direction === "BUY" ? 0.9990 : 1.0010), selectedPair.symbol)}
                      />
                    </div>

                    {/* TP */}
                    <div>
                      <label className="text-[8px] font-black tracking-wider uppercase mb-1 flex items-center justify-between text-emerald-400">
                        <span className="flex items-center gap-1"><Target className="h-2.5 w-2.5" /> TP</span>
                        {tpVal !== null && <span className="text-[8px] font-bold text-slate-400">{tpPips.toFixed(1)}p · +${maxGain.toFixed(2)}</span>}
                      </label>
                      <input type="number" value={tp} onChange={e => setTp(e.target.value)}
                        className="w-full price-mono text-xs font-bold text-white focus:outline-none px-2 py-1.5 rounded bg-[#010d06] border border-emerald-500/30"
                        placeholder={fmt(midPrice * (direction === "BUY" ? 1.0010 : 0.9990), selectedPair.symbol)}
                      />
                    </div>
                  </div>
                </div>

                {/* Collapsible Advanced Section Toggle */}
                <button
                  type="button"
                  onClick={() => setShowAdvancedOrderControls(!showAdvancedOrderControls)}
                  aria-expanded={showAdvancedOrderControls}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-[#1a2640] bg-[#07101b] hover:border-cyan-500/30 text-slate-300 hover:text-white transition-all text-[9px] font-black uppercase tracking-wider"
                >
                  <div className="flex items-center gap-1.5">
                    <Wrench className="h-3 w-3 text-cyan-400" />
                    <span>Advanced Options</span>
                    {(Boolean(trailingPips && parseFloat(trailingPips) > 0) || pendingExpiry !== "GTC" || leverage !== "100") && (
                      <span className="rounded bg-cyan-400/20 px-1 py-0.2 text-[7px] font-bold text-cyan-300">Active</span>
                    )}
                  </div>
                  {showAdvancedOrderControls ? <ChevronUp className="h-3 w-3 text-slate-400" /> : <ChevronDown className="h-3 w-3 text-slate-400" />}
                </button>

                {/* Advanced Options Body */}
                {showAdvancedOrderControls && (
                  <div className="flex flex-col gap-2 rounded-lg border border-[#1a2640] bg-[#050b14] p-2 transition-all">
                    {/* Trailing Stop */}
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[8px] font-black tracking-wider uppercase text-purple-300 flex items-center gap-1 shrink-0">
                        <ArrowUpDown className="h-2.5 w-2.5" /> Trailing Stop (pips)
                      </label>
                      <input type="number" value={trailingPips} onChange={e => setTrailingPips(e.target.value)}
                        className="w-28 price-mono text-xs text-white focus:outline-none px-2 py-1 rounded bg-[#07030f] border border-purple-500/30 text-right"
                        placeholder="0 (disabled)"
                      />
                    </div>

                    {/* Pending Order Expiry */}
                    <div className="flex items-center justify-between gap-2 border-t border-[#142032] pt-1.5">
                      <span className="text-[8px] font-black tracking-wider uppercase text-slate-400">Order Expiry</span>
                      <div className="terminal-order-expiry-dock flex flex-1 items-stretch overflow-hidden rounded-md border border-[#1a2640] bg-[#070a10]">
                        {(["GTC","TODAY"] as PendingOrder["expiry"][]).map(e => (
                          <button key={e} type="button" onClick={() => setPendingExpiry(e)} aria-pressed={pendingExpiry === e}
                            className="min-w-0 flex-1 px-2 py-0.5 text-[8px] font-black tracking-wider uppercase transition-colors"
                            style={pendingExpiry === e
                              ? { background: "rgba(34,211,238,0.15)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.3)" }
                              : { background: "#070a10", color: "#64748b", border: "1px solid #1a2640" }}>
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Leverage Selection */}
                    <div className="flex items-center justify-between gap-2 border-t border-[#142032] pt-1.5">
                      <span className="text-[8px] font-black tracking-wider uppercase text-amber-300">Account Leverage</span>
                      <select value={leverage} onChange={e => setLeverage(e.target.value)}
                        aria-label="Select leverage"
                        className={`bg-[#080c14] price-mono text-[9px] font-bold focus:outline-none px-2 py-0.5 rounded border border-[#263b4f] cursor-pointer ${isFundedAccount || isChallengeAccount ? "text-amber-300" : "text-cyan-300"}`}>
                        {["1", "5", "10", "20", "30", "50", "100"].filter(value => !isChallengeAccount || Number(value) <= 30).map(value => <option key={value} value={value}>1:{value}</option>)}
                      </select>
                    </div>

                    {/* Quick Risk Presets */}
                    <div className="border-t border-[#142032] pt-1.5">
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-1">Risk Presets</span>
                      <div className="grid grid-cols-4 gap-1">
                        {[{ label: "Scalp", slPips: 8, tpPips: 12 }, { label: "1:2", slPips: 15, tpPips: 30 }, { label: "1:3", slPips: 20, tpPips: 60 }, { label: "Clear", slPips: 0, tpPips: 0 }].map(preset => (
                          <button key={preset.label} type="button" onClick={() => {
                            if (preset.slPips === 0) { setSl(""); setTp(""); return }
                            const point = direction === "BUY" ? selectedPair.ask : selectedPair.bid
                            const unit = pip(selectedPair.symbol)
                            const stop = direction === "BUY" ? point - preset.slPips * unit : point + preset.slPips * unit
                            const target = direction === "BUY" ? point + preset.tpPips * unit : point - preset.tpPips * unit
                            setSl(stop.toFixed(decimals(selectedPair.symbol)))
                            setTp(target.toFixed(decimals(selectedPair.symbol)))
                          }} className="rounded border border-[#243752] bg-[#0b1625] px-1.5 py-0.5 text-[8px] font-bold text-slate-400 hover:border-cyan-400/40 hover:text-cyan-200">{preset.label}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

	                {/* Order Metrics summary */}
	                <div className="grid grid-cols-2 gap-1 rounded-lg border border-[#1a2640] bg-[#070a10] p-1.5">
	                  <div className="px-2 py-1 bg-[#090f19] rounded">
	                    <p className="text-[8px] uppercase tracking-wider text-slate-400">Margin</p>
	                    <p className="price-mono text-[10px] font-black text-amber-300">${isNaN(estimatedMargin) ? "—" : estimatedMargin.toFixed(2)}</p>
	                  </div>
	                  <div className="px-2 py-1 bg-[#090f19] rounded">
	                    <p className="text-[8px] uppercase tracking-wider text-slate-400">Pip Value</p>
	                    <p className="price-mono text-[10px] font-black text-cyan-300">${pipVal.toFixed(4)}</p>
	                  </div>
	                  <div className="px-2 py-1 bg-[#090f19] rounded">
	                    <p className="text-[8px] uppercase tracking-wider text-slate-400">Risk / Reward</p>
	                    <p className="price-mono text-[10px] font-black text-purple-300">
	                      {slVal !== null ? `-$${maxLoss.toFixed(2)}` : "—"} / {tpVal !== null ? `+$${maxGain.toFixed(2)}` : "—"} {rrRatio ? `(1:${rrRatio})` : ""}
	                    </p>
	                  </div>
	                  <div className="px-2 py-1 bg-[#090f19] rounded">
	                    <p className="text-[8px] uppercase tracking-wider text-slate-400">Notional</p>
	                    <p className="price-mono text-[10px] font-black text-slate-200">
	                      ${((parseFloat(lotSize)||0.01)*contractSize(selectedPair.symbol)*midPrice).toLocaleString("en-US",{maximumFractionDigits:0})}
	                    </p>
	                  </div>
	                </div>

	                {/* Balance warning */}
	                {balanceLoaded && estimatedMargin > walletBalance && (
	                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-400 text-[10px] font-bold">
	                    <AlertTriangle className="h-3 w-3 shrink-0" />
	                    Insufficient margin: Need ${estimatedMargin.toFixed(2)} (Have ${walletBalance.toFixed(2)})
	                  </div>
	                )}

	                {/* Execute button */}
	                <button
	                  className={`w-full py-2.5 rounded-lg font-black text-xs tracking-wider flex items-center justify-center gap-2 transition-all ${
	                    direction === "BUY" ? "btn-3d-execute-buy" : "btn-3d-execute-sell"
	                  }`}
	                  onClick={() => executeTrade()}
	                  disabled={isFrozen || !balanceLoaded || (balanceLoaded && estimatedMargin > walletBalance && orderType === "market")}
	                >
	                  <Zap className="h-3.5 w-3.5 relative z-10" />
	                  <span className="relative z-10 uppercase">
	                    {orderType === "market"
	                      ? `Execute ${direction} ${selectedPair.symbol} (${lotSize} Lots)`
	                      : `Place ${direction} ${orderType.toUpperCase()} @ ${pendingPrice || "—"}`}
	                  </span>
	                </button>
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
                leverage={effectiveLeverage}
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
        </DockPanel>
        </>
        )}
        </DockGroup>
        </div>
        {mobileTab === "portfolio" && (
        <div className="mobile-portfolio-view flex flex-1 min-h-0 flex-col overflow-y-auto lg:hidden">
          <PortfolioActivityView
            openTrades={openTrades}
            pendingOrders={pendingOrders}
            closedTrades={closedTrades}
            totalPnl={totalPnl}
            walletBalance={walletBalance}
            equity={equity}
            freeMargin={freeMargin}
            totalMargin={totalMargin}
            totalLots={openTrades.reduce((sum, trade) => sum + trade.lotSize, 0)}
            formatPrice={fmt}
            onCloseTrade={closeTrade}
            onCancelOrder={cancelPending}
          />
        </div>
        )}
      </div>

      {/* BOTTOM BLOTTER */}
      {!isCompactViewport && (
      <section
        ref={blotterRef}
        className={`apple-terminal-blotter ${footerOpen ? "is-open" : "is-collapsed"} ${dockEnabled && footerOpen && blotterHeight ? "has-custom-height" : ""} flex flex-col shrink-0`}
        aria-label="Trading activity footer"
        style={{ background: "#060a12", borderTop: "1px solid #1e2d45", ...(dockEnabled && footerOpen && blotterHeight ? { "--blotter-h": `${blotterHeight}px` } : {}) } as CSSProperties}
      >
        {dockEnabled && footerOpen && (
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize trading activity panel"
            aria-valuemin={MIN_BLOTTER_HEIGHT}
            aria-valuenow={blotterHeight ?? undefined}
            tabIndex={0}
            title="Drag to resize · double-click to reset"
            className="terminal-blotter-resizer"
            onPointerDown={startBlotterResize}
            onKeyDown={handleBlotterResizeKey}
            onDoubleClick={() => { setBlotterHeight(null); saveBlotterHeight(null) }}
          >
            <span aria-hidden="true" />
          </div>
        )}
        {/* Tab bar */}
        <div className="apple-terminal-blotter-tabs flex items-center shrink-0 overflow-x-auto terminal-scroll" style={{ borderBottom: footerOpen ? "1px solid #1a2640" : "0", background: "#060a12" }}>
          <button
            type="button"
            onClick={() => setFooterOpen(value => !value)}
            aria-expanded={footerOpen}
            aria-controls="terminal-activity-content"
            aria-label={footerOpen ? "Hide trading activity" : "Show trading activity"}
            className="terminal-footer-toggle order-first flex h-9 w-10 shrink-0 items-center justify-center border-r border-[#1b3047] text-slate-400 transition hover:bg-cyan-300/10 hover:text-cyan-200"
          >
            {footerOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            <span className="terminal-footer-toggle-label">Activity</span>
          </button>
          {applyTabOrder([
            { id: "positions",   label: `Positions (${openTrades.length})`, icon: Layers },
            { id: "pending",     label: `Orders (${pendingOrders.length})`, icon: Clock },
            { id: "history",     label: `History (${closedTrades.length})`,  icon: History },
            { id: "dom",         label: "L2 Book",                            icon: BarChart2 },
            { id: "risk",        label: "Risk",                               icon: ShieldAlert },
            { id: "journal",     label: "Journal",                            icon: BookOpen },
            { id: "news",        label: "News",                               icon: Newspaper },
            { id: "performance", label: "Performance",                        icon: BarChart },
            { id: "alerts",      label: `Alerts (${priceAlerts.filter(a=>!a.triggered).length})`, icon: Bell },
            { id: "smart-alerts",label: `Smart (${smartAlerts.filter(a => a.status === "warning" || a.status === "triggered").length})`, icon: BellRing },
            { id: "support",     label: "Support",                            icon: LifeBuoy },
  { id: "trust",       label: "Trust",                              icon: ShieldCheck },
            { id: "sessions",    label: "Sessions",                           icon: Globe2 },
            { id: "depth",       label: "Depth",                              icon: BarChart2 },
            { id: "stats",       label: "Stats",                               icon: Activity },
            { id: "ai-coach",    label: "AI Guide",                            icon: BrainCircuit },
          ] as { id: typeof activePanel; label: string; icon: any }[], tabOrder).map(({ id, label, icon: Icon }, _index, orderedTabs) => (
            <button key={id}
              draggable={dockEnabled}
              onDragStart={(event) => { setDraggedTab(id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", id) }}
              onDragOver={(event) => { if (draggedTab) event.preventDefault() }}
              onDrop={(event) => { event.preventDefault(); if (draggedTab) moveTab(draggedTab, id, orderedTabs.map(tab => tab.id)); setDraggedTab(null) }}
              onDragEnd={() => setDraggedTab(null)}
              data-dragging={draggedTab === id ? "true" : undefined}
              title={dockEnabled ? `${label} · drag to reorder` : undefined}
              data-panel={id}
              onClick={() => { setActivePanel(id); setFooterOpen(true) }} aria-label={id === "positions" ? "Open positions manager" : id === "history" ? "Open trading history" : label}
              className="flex items-center gap-1.5 px-3 py-2 text-[9px] font-black tracking-wider uppercase transition-all shrink-0"
              style={activePanel === id
                ? { color: "#22d3ee", borderBottom: "2px solid #22d3ee", background: "rgba(34,211,238,0.04)" }
                : { color: "#374151", borderBottom: "2px solid transparent" }}>
              <Icon className="h-3 w-3" />{label}
            </button>
          ))}
          {dockEnabled && (
            <button type="button" onClick={resetTerminalLayout} className="terminal-layout-reset" aria-label="Reset panel sizes and tab order">
              Reset layout
            </button>
          )}
        </div>

        {/* Blotter content */}
        <div id="terminal-activity-content" className="flex-1 overflow-y-auto terminal-scroll pb-[calc(76px+env(safe-area-inset-bottom,0px))] md:pb-0" hidden={!footerOpen}>

	          {/* ── Open Positions ── */}
	          {activePanel === "positions" && (
	            openTrades.length === 0 ? (
	              <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-slate-500">
	                <Layers className="h-6 w-6 opacity-30" />
	                <span className="text-xs font-bold uppercase tracking-wider">No open positions</span>
	                <span className="text-[10px] text-slate-600">Place a BUY or SELL order to begin</span>
	              </div>
	            ) : (
	              <div className="flex flex-col h-full">
	                {/* Summary bar */}
	                <div className="flex items-center gap-0 shrink-0 price-mono text-[10px] overflow-x-auto bg-[#04070d] border-b border-[#1a2640]">
	                  {[
	                    { label: "LIVE P&L",    value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? "#34d399" : "#f87171", bg: totalPnl >= 0 ? "rgba(52,211,153,0.07)" : "rgba(248,113,113,0.07)" },
	                    { label: "POSITIONS",   value: String(openTrades.length), color: "#c084fc", bg: "transparent" },
	                    { label: "TOTAL LOTS",  value: openTrades.reduce((s,t) => s + t.lotSize, 0).toFixed(2), color: "#38bdf8", bg: "transparent" },
	                    { label: "MARGIN USED", value: `$${totalMargin.toFixed(2)}`, color: "#fbbf24", bg: "transparent" },
	                  ].map((item, i) => (
	                    <div key={i} className="flex items-center gap-1.5 px-2.5 h-8 shrink-0 border-r border-[#0f1c2e]" style={{ background: item.bg }}>
	                      <span className="text-[7px] font-bold tracking-wider uppercase text-slate-400">{item.label}</span>
	                      <span className="font-black text-[11px]" style={{ color: item.color }}>{item.value}</span>
	                    </div>
	                  ))}
	                  {/* Mass Actions */}
	                  <div className="ml-auto mr-2 my-1 flex items-center gap-1 shrink-0">
	                    <button
	                      type="button"
	                      onClick={applyBreakEvenSL}
	                      title="Set Stop Loss to entry price for all winning trades"
	                      className="px-2 py-1 rounded font-black text-[8px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20">
	                      <ShieldAlert className="h-2.5 w-2.5" /> Break-Even SL
	                    </button>
	                    <button
	                      type="button"
	                      onClick={closeWinningPositions}
	                      title="Close all positions currently in profit"
	                      className="px-2 py-1 rounded font-black text-[8px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20">
	                      <CheckCircle2 className="h-2.5 w-2.5" /> Close Winners
	                    </button>
	                    <button
	                      type="button"
	                      aria-label={`Close all ${openTrades.length} open positions`}
	                      onClick={() => { if (window.confirm(`Close all ${openTrades.length} open positions?`)) openTrades.forEach(t => closeTrade(t.id)) }}
	                      className="px-2 py-1 rounded font-black text-[8px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1 bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20">
	                      <X className="h-2.5 w-2.5" /> Close All
	                    </button>
	                  </div>
	                </div>

	                {/* Positions list */}
	                <div className="flex-1 overflow-y-auto terminal-scroll p-2 flex flex-col gap-2">
	                  {openTrades.map(trade => {
	                    const isBuy    = trade.direction === "BUY"
	                    const pnlPos   = trade.pnl >= 0
	                    const pnlClr   = pnlPos ? "#10b981" : "#ef4444"
	                    const liqPrice = calcLiquidationPrice(trade.pair, trade)
	                    const duration = formatDuration(trade.openTimestamp)

	                    return (
	                      <div key={trade.id} className="rounded-lg price-mono text-[11px] overflow-hidden bg-[#0d1625] border border-[#1a2a42]">
		                        {/* Card header */}
		                        <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a2a42] bg-[#070e1a]">
		                          <div className="flex items-center gap-2 flex-wrap min-w-0">
		                            <AssetLogo symbol={trade.pair} size={18} className="shrink-0" />
		                            <span className="font-black text-white text-xs">{trade.pair}</span>
	                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${isBuy ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border border-rose-500/30"}`}>
	                              {trade.direction}
	                            </span>
	                            <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-amber-400/10 text-amber-300">×{trade.leverage}</span>
	                            <span className="text-[9px] font-bold text-slate-400">{trade.lotSize} Lot</span>
	                            <span className="text-[9px] text-slate-500 flex items-center gap-1">
	                              <Clock className="h-2.5 w-2.5" /> {duration}
	                            </span>
	                          </div>

	                          {/* P&L Display */}
	                          <div className="text-right shrink-0">
	                            <span className="text-base font-black leading-none" style={{ color: pnlClr }}>
	                              {pnlPos ? "+" : ""}${trade.pnl.toFixed(2)}
	                            </span>
	                            <span className="text-[9px] font-bold ml-2" style={{ color: pnlClr }}>
	                              ({trade.pips >= 0 ? "+" : ""}{trade.pips.toFixed(1)}p · {trade.returnOnMargin >= 0 ? "+" : ""}{trade.returnOnMargin.toFixed(1)}% ROE)
	                            </span>
	                          </div>
	                        </div>

	                        {/* Price & Risk metrics grid */}
	                        <div className="grid grid-cols-2 sm:grid-cols-4 px-3 py-1.5 gap-2 border-b border-[#1a2a42] text-[10px]">
	                          <div><span className="text-[8px] text-slate-500 block">Entry / Current</span><span className="font-bold text-slate-300">{fmt(trade.openPrice, trade.pair)}</span> / <span className="font-black" style={{ color: pnlClr }}>{fmt(trade.currentPrice, trade.pair)}</span></div>
	                          <div><span className="text-[8px] text-slate-500 block">SL / TP</span><span className="font-bold text-rose-400">{trade.sl ? fmt(trade.sl, trade.pair) : "—"}</span> / <span className="font-bold text-emerald-400">{trade.tp ? fmt(trade.tp, trade.pair) : "—"}</span></div>
	                          <div><span className="text-[8px] text-slate-500 block">Liq / Margin</span><span className="font-bold text-amber-400">{fmt(liqPrice, trade.pair)}</span> / <span className="font-bold text-slate-300">${trade.margin.toFixed(2)}</span></div>
	                          <div className="text-right"><span className="text-[8px] text-slate-500 block">Trail / Swap</span><span className="font-bold text-violet-400">{trade.trailingStopPips ? `${trade.trailingStopPips}p` : "—"}</span> / <span className="font-bold" style={{ color: trade.swap >= 0 ? "#10b981" : "#ef4444" }}>{trade.swap >= 0 ? "+" : ""}${trade.swap.toFixed(2)}</span></div>
	                        </div>

	                        {/* Action controls row */}
	                        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#08101d]">
	                          {/* Partial close */}
	                          <div className="flex items-center gap-1.5">
	                            <span className="text-[8px] font-black uppercase text-slate-400">Partial:</span>
	                            <input
	                              type="number" min="0.01" step="0.01" max={trade.lotSize - 0.01}
	                              value={partialCloseMap[trade.id] ?? ""}
	                              onChange={e => setPartialCloseMap(prev => ({ ...prev, [trade.id]: e.target.value }))}
	                              placeholder={`${(trade.lotSize / 2).toFixed(2)}`}
	                              className="w-16 price-mono text-[10px] text-white focus:outline-none px-1.5 py-0.5 rounded bg-[#070a10] border border-[#1e2d45]"
	                            />
	                            <button
	                              type="button"
	                              onClick={() => {
	                                const l = parseFloat(partialCloseMap[trade.id] ?? "")
	                                if (!isNaN(l) && l > 0 && window.confirm(`Close ${l.toFixed(2)} lots of ${trade.pair}?`)) partialCloseTrade(trade.id, l)
	                              }}
	                              className="px-2 py-0.5 rounded font-black text-[9px] bg-amber-400/10 text-amber-300 border border-amber-400/20 hover:bg-amber-400/20">
	                              Close Lot
	                            </button>
	                          </div>

	                          {/* Main Actions */}
	                          <div className="flex items-center gap-1.5 ml-auto">
	                            <button
	                              type="button"
	                              onClick={() => setModifyTarget({ tradeId: trade.id, sl: trade.sl?.toString() ?? "", tp: trade.tp?.toString() ?? "", trailingPips: trade.trailingStopPips?.toString() ?? "" })}
	                              className="px-2.5 py-1 rounded font-black text-[9px] flex items-center gap-1 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20">
	                              <Edit3 className="h-2.5 w-2.5" /> Modify SL/TP
	                            </button>
	                            <button
	                              type="button"
	                              aria-label={`Close ${trade.pair} position`}
	                              onClick={() => closeTrade(trade.id)}
	                              className={`px-3 py-1 rounded font-black text-[9px] flex items-center gap-1 text-white ${
	                                trade.pnl >= 0 ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
	                              }`}>
	                              <X className="h-2.5 w-2.5" /> CLOSE ({trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)})
	                            </button>
	                          </div>
	                        </div>
	                      </div>
	                    )
	                  })}
	                </div>
	              </div>
	            )
	          )}

	          {/* ── Pending Orders ── */}
	          {activePanel === "pending" && (
	            pendingOrders.length === 0 ? (
	              <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-slate-500">
	                <Clock className="h-6 w-6 opacity-30" />
	                <span className="text-xs font-bold uppercase tracking-wider">No pending orders</span>
	              </div>
	            ) : (
	              <div className="flex flex-col h-full">
	                <div className="flex items-center justify-between shrink-0 px-3 py-1.5 bg-[#04070d] border-b border-[#1a2640] text-[10px] font-bold text-slate-400 price-mono">
	                  <span className="uppercase text-cyan-300">Pending Orders ({pendingOrders.length})</span>
	                </div>
	                <div className="flex-1 overflow-y-auto terminal-scroll p-2 flex flex-col gap-2">
	                  {pendingOrders.map(o => {
	                    const isBuy = o.direction === "BUY"
	                    return (
	                      <div key={o.id} className="rounded-lg price-mono text-[11px] overflow-hidden bg-[#0d1625] border border-[#1a2a42]">
		                        <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a2a42] bg-[#070e1a]">
		                          <div className="flex items-center gap-2 flex-wrap">
		                            <AssetLogo symbol={o.pair} size={18} className="shrink-0" />
		                            <span className="font-black text-white text-xs">{o.pair}</span>
	                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${isBuy ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
	                              {o.direction}
	                            </span>
	                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 uppercase">
	                              {o.orderType.replace("_"," ")}
	                            </span>
	                            <span className="text-[9px] font-bold text-slate-400">{o.lotSize} Lot · ×{o.leverage}</span>
	                            <span className="text-[9px] text-slate-500">{o.expiry} · {o.createdTime}</span>
	                          </div>
	                          <div className="text-right">
	                            <span className="text-[8px] text-slate-500 block">Target Price</span>
	                            <span className="price-mono font-black text-cyan-400 text-sm">{fmt(o.targetPrice, o.pair)}</span>
	                          </div>
	                        </div>
	                        <div className="flex items-center justify-between px-3 py-1.5 bg-[#08101d] text-[10px]">
	                          <div className="flex items-center gap-3 text-slate-400">
	                            <span>SL: <strong className="text-rose-400">{o.sl ? fmt(o.sl, o.pair) : "—"}</strong></span>
	                            <span>TP: <strong className="text-emerald-400">{o.tp ? fmt(o.tp, o.pair) : "—"}</strong></span>
	                            <span>Margin: <strong className="text-amber-400">${calcMargin(o.pair, o.lotSize, o.targetPrice, o.leverage).toFixed(2)}</strong></span>
	                          </div>
	                          <button
	                            type="button"
	                            onClick={() => cancelPending(o.id)}
	                            className="px-2.5 py-1 rounded font-black text-[9px] uppercase tracking-wide bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20">
	                            Cancel Order
	                          </button>
	                        </div>
	                      </div>
	                    )
	                  })}
	                </div>
	              </div>
	            )
	          )}

	          {/* ── Trade History ── */}
	          {activePanel === "history" && (() => {
	            const totalHistPnl   = closedTrades.reduce((s, t) => s + t.finalPnl, 0)
	            const totalHistPips  = closedTrades.reduce((s, t) => s + t.finalPips, 0)
	            const totalHistSwap  = closedTrades.reduce((s, t) => s + t.finalSwap, 0)
	            const wins           = closedTrades.filter(t => t.finalPnl > 0).length
	            const winRate        = closedTrades.length > 0 ? (wins / closedTrades.length * 100).toFixed(0) : "0"
	            const pnlColor       = totalHistPnl >= 0 ? "#34d399" : "#f87171"
	            return closedTrades.length === 0 ? (
	              <div className="flex items-center justify-center h-full gap-2 p-6 text-slate-500">
	                <History className="h-5 w-5 opacity-30" />
	                <span className="text-xs font-bold uppercase tracking-wider">No trade history</span>
	              </div>
	            ) : (
	              <div className="flex flex-col h-full">
	                {/* Summary strip */}
	                <div className="flex items-center gap-0 shrink-0 price-mono text-[10px] overflow-x-auto bg-[#04070d] border-b border-[#1a2640]">
	                  {[
	                    { label: "TOTAL P&L",  value: `${totalHistPnl >= 0 ? "+" : ""}$${totalHistPnl.toFixed(2)}`, color: pnlColor, bg: totalHistPnl >= 0 ? "rgba(52,211,153,0.07)" : "rgba(248,113,113,0.07)" },
	                    { label: "TOTAL PIPS", value: `${totalHistPips >= 0 ? "+" : ""}${totalHistPips.toFixed(1)}p`, color: pnlColor, bg: "transparent" },
	                    { label: "TOTAL SWAP", value: `${totalHistSwap >= 0 ? "+" : ""}$${totalHistSwap.toFixed(2)}`, color: totalHistSwap >= 0 ? "#34d399" : "#f87171", bg: "transparent" },
	                    { label: "TRADES",     value: String(closedTrades.length), color: "#c084fc", bg: "rgba(192,132,252,0.05)" },
	                    { label: "WIN RATE",   value: `${winRate}%`, color: parseFloat(winRate) >= 50 ? "#34d399" : "#f87171", bg: "transparent" },
	                    { label: "WINS",       value: String(wins), color: "#34d399", bg: "transparent" },
	                    { label: "LOSSES",     value: String(closedTrades.length - wins), color: "#f87171", bg: "transparent" },
	                  ].map((item, i) => (
	                    <div key={i} className="flex items-center gap-1.5 px-2.5 h-7 shrink-0 border-r border-[#0f1c2e]" style={{ background: item.bg }}>
	                      <span className="text-[7px] font-bold tracking-wider uppercase text-slate-400">{item.label}</span>
	                      <span className="font-black text-[10px]" style={{ color: item.color }}>{item.value}</span>
	                    </div>
	                  ))}
	                  <button type="button" onClick={() => void loadTrades()} aria-label="Refresh trade history" title="Refresh trade history" className="ml-auto mr-2 rounded p-1 text-slate-500 transition-colors hover:bg-cyan-400/10 hover:text-cyan-300">
	                    <RefreshCw className="h-3 w-3" />
	                  </button>
	                </div>
	                {/* Table */}
	                <div className="flex-1 overflow-x-auto overflow-y-auto terminal-scroll">
	                  <table className="w-full text-[10px] price-mono min-w-[640px]">
	                    <thead>
	                      <tr className="bg-[#070a10] border-b border-[#1a2640]">
	                        {["Symbol","Dir","Lots","Entry","Exit","P&L","Pips","Swap","Duration","Reason"].map(h => (
	                          <th key={h} className="px-2 py-1.5 text-left text-[8px] font-bold tracking-widest text-slate-400 uppercase whitespace-nowrap sticky top-0 bg-[#070a10]">{h}</th>
	                        ))}
	                      </tr>
	                    </thead>
	                    <tbody>
	                      {closedTrades.slice(0, 100).map(trade => {
	                        const pc = trade.finalPnl >= 0 ? "#10b981" : "#ef4444"
	                        const reasonColors: Record<string, string> = { manual: "#94a3b8", sl: "#ef4444", tp: "#10b981", trailing_sl: "#a78bfa", stop_out: "#f97316" }
	                        return (
	                          <tr key={trade.id} className="border-b border-[#0f1a2e] hover:bg-white/[0.015] transition-colors">
	                            <td className="px-2 py-1.5 font-black text-white whitespace-nowrap">{trade.pair}</td>
	                            <td className="px-2 py-1.5">
	                              <span className={`px-1.5 py-0.5 font-black text-[8px] uppercase rounded ${trade.direction === "BUY" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
	                                {trade.direction}
	                              </span>
	                            </td>
	                            <td className="px-2 py-1.5 text-slate-400">{trade.lotSize}</td>
	                            <td className="px-2 py-1.5 text-slate-400 whitespace-nowrap">{fmt(trade.openPrice, trade.pair)}</td>
	                            <td className="px-2 py-1.5 text-slate-400 whitespace-nowrap">{fmt(trade.closePrice, trade.pair)}</td>
	                            <td className="px-2 py-1.5 font-black whitespace-nowrap" style={{ color: pc }}>{trade.finalPnl >= 0 ? "+" : ""}${trade.finalPnl.toFixed(2)}</td>
	                            <td className="px-2 py-1.5 font-bold" style={{ color: pc }}>{trade.finalPips >= 0 ? "+" : ""}{trade.finalPips.toFixed(1)}</td>
	                            <td className="px-2 py-1.5" style={{ color: trade.finalSwap >= 0 ? "#10b981" : "#ef4444" }}>{trade.finalSwap >= 0 ? "+" : ""}${trade.finalSwap.toFixed(2)}</td>
	                            <td className="px-2 py-1.5 text-slate-500 whitespace-nowrap">{trade.closeDuration}</td>
	                            <td className="px-2 py-1.5">
	                              <span className="px-1.5 py-0.5 text-[8px] font-black uppercase rounded whitespace-nowrap"
	                                style={{ background: `${reasonColors[trade.closeReason]}18`, color: reasonColors[trade.closeReason], border: `1px solid ${reasonColors[trade.closeReason]}30` }}>
	                                {trade.closeReason.replace("_"," ")}
	                              </span>
	                            </td>
	                          </tr>
	                        )
	                      })}
	                    </tbody>
	                  </table>
	                </div>
	              </div>
	            )
	          })()}

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

          {/* ── Smart Risk Alerts ── */}
          {activePanel === "smart-alerts" && <SmartAlertsPanel alerts={smartAlerts} />}

          {/* ── Trust & Account Protection ── */}
          {activePanel === "trust" && <TrustCenterPanel isFundedAccount={isFundedAccount} walletBalance={walletBalance} online={online} />}

          {/* ── 24/7 Support Center ── */}
          {activePanel === "support" && <SupportCenterPanel />}

          {/* ── Market Sessions ── */}
          {activePanel === "sessions" && <MarketSessionsPanel />}

          {/* ── Depth-of-Market (L2 ladder) ── */}
          {activePanel === "dom" && (
            selectedPair
              ? <DepthOfMarketLadder pair={selectedPair} tickCount={tickCount} onPlaceOrder={(side, price) => {
                  setDirection(side)
                  setOrderType("limit")
                  setPendingPrice(price.toFixed(decimals(selectedPair.symbol)))
                  setMobileTab("order")
                  setRightPanelTab("order")
                  showToast("info", `${side} limit pre-filled at ${price.toFixed(decimals(selectedPair.symbol))} — review and place`)
                }} />
              : <div className="flex items-center justify-center h-full text-slate-700 text-[11px] tracking-wider">Select an instrument</div>
          )}

          {/* ── Portfolio Risk Analytics ── */}
          {activePanel === "risk" && (
            <RiskAnalyticsPanel
              openTrades={openTrades}
              walletBalance={walletBalance}
              equity={equity}
              totalMargin={totalMargin}
              totalPnl={totalPnl}
              pairs={pairs}
            />
          )}

          {/* ── Trade Journal ── */}
          {activePanel === "journal" && (
            <TradeJournalPanel closed={closedTrades} equityHistory={equityHistory} />
          )}

  {/* ── News & Economic Calendar ── */}
  {activePanel === "news" && <NewsCalendarPanel />}

  {/* ── AI Trading Guide ── */}
          {activePanel === "ai-coach" && <TradingAiCoach pair={selectedPair} openTrades={openTrades} walletBalance={walletBalance} onOpenRisk={() => setActivePanel("risk")} />}

        </div>
      </section>
      )}

      <div className="reference-statusbar shrink-0">
        <span><i />{online ? "Connected" : "Reconnecting"}</span>
        <strong>Live Account</strong>
        <span className="reference-status-spacer" />
        <span>Server: Elite-Trade-Live-1</span>
        <span className="reference-status-divider">|</span>
        <span>Ping: 42 ms</span>
        <span className="reference-status-divider">|</span>
        <span>{utcClock} (UTC+5:30)</span>
      </div>

      {/* ── Trade Confirmation Modal ──����────���──────────���────────────────────���────── */}
      {breachInfo && (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(2,4,10,0.92)", backdropFilter: "blur(8px)" }}
        >
          <div
            className="relative flex flex-col rounded-2xl overflow-hidden"
            style={{
              width: "min(440px, 94vw)",
              background: "linear-gradient(160deg, #1a0808 0%, #0a0303 100%)",
              border: "1px solid rgba(239,68,68,0.35)",
              boxShadow: "0 0 80px rgba(239,68,68,0.25), 0 20px 60px rgba(0,0,0,0.6)",
            }}
          >
            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #ef4444, #f97316, #ef4444)" }} />

            <div className="flex flex-col items-center text-center px-7 pt-7 pb-6">
              <div
                className="flex items-center justify-center w-16 h-16 rounded-full mb-4"
                style={{
                  background: "radial-gradient(circle, rgba(239,68,68,0.22) 0%, rgba(239,68,68,0.05) 70%)",
                  border: "1px solid rgba(239,68,68,0.4)",
                  boxShadow: "0 0 30px rgba(239,68,68,0.3)",
                }}
              >
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>

              <span
                className="text-[10px] font-black tracking-[0.25em] uppercase mb-2 px-3 py-1 rounded-full"
                style={{ color: "#fca5a5", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}
              >
                Account Breach
              </span>

              <h2 className="text-xl font-black text-white tracking-tight mb-2 text-balance">
                Funded Account Breached
              </h2>
              <p className="text-[13px] leading-relaxed text-slate-400 mb-6 text-pretty">
                {"Your drawdown exceeded the funded account's risk limit. All open positions have been force-closed and the account is now frozen pending review."}
              </p>

              <div className="grid grid-cols-2 gap-3 w-full mb-6">
                <div
                  className="flex flex-col items-start gap-1 rounded-xl px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <span className="text-[9px] font-bold tracking-[0.12em] uppercase text-slate-500">Positions Closed</span>
                  <span className="text-lg font-black text-white tabular-nums">{breachInfo.closedCount}</span>
                </div>
                <div
                  className="flex flex-col items-start gap-1 rounded-xl px-4 py-3"
                  style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  <span className="text-[9px] font-bold tracking-[0.12em] uppercase text-slate-500">Realized P&amp;L</span>
                  <span className="text-lg font-black tabular-nums" style={{ color: breachInfo.realizedLoss >= 0 ? "#34d399" : "#f87171" }}>
                    {breachInfo.realizedLoss >= 0 ? "+" : ""}${breachInfo.realizedLoss.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBreachInfo(null)}
                className="w-full py-3 rounded-xl font-bold text-[13px] tracking-wide uppercase transition-transform active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  color: "white",
                  boxShadow: "0 4px 20px rgba(239,68,68,0.35)",
                }}
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

	      {tradeRestrictionNotice && (
    <div className="terminal-modal-overlay fixed inset-0 z-[110] flex items-center justify-center bg-[#02060f]/80 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="trade-restriction-title">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-amber-400/35 bg-[#0a1422] shadow-2xl shadow-black/60">
        <div className="h-1 bg-amber-400" />
        <div className="p-5 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10"><LockKeyhole className="size-5 text-amber-300" /></div>
          <p className="mt-3 text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">Trade restricted</p>
          <h2 id="trade-restriction-title" className="mt-1 text-base font-black text-white">Order cannot be placed</h2>
          <p className="mt-2 text-xs leading-5 text-slate-400">{tradeRestrictionNotice}</p>
          <button type="button" autoFocus onClick={() => setTradeRestrictionNotice(null)} className="mt-4 w-full rounded-lg bg-amber-400 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#111315] transition hover:bg-amber-300">Review order</button>
        </div>
      </div>
    </div>
  )}

  {tradeConfirm && (
  <div
  className="terminal-modal-overlay fixed inset-0 z-[110] flex items-center justify-center p-2"
          style={{ background: "rgba(2,6,15,0.82)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !confirmLoading) setTradeConfirm(null) }}
        >
          <div
            className="relative flex max-h-full flex-col rounded-2xl overflow-y-auto overflow-x-hidden"
            style={{
              width: "min(340px, calc(100vw - 20px))",
              maxHeight: "calc(100dvh - 16px)",
              background: "linear-gradient(160deg, #07101e 0%, #040c18 100%)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: `0 0 60px ${tradeConfirm.direction === "BUY" ? "rgba(16,185,129,0.18)" : "rgba(239,68,68,0.18)"}`,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{
                background: tradeConfirm.direction === "BUY"
                  ? "linear-gradient(90deg, rgba(16,185,129,0.15) 0%, transparent 100%)"
                  : "linear-gradient(90deg, rgba(239,68,68,0.15) 0%, transparent 100%)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg"
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
                type="button"
                aria-label="Close trade confirmation"
                onClick={() => { if (!confirmLoading) setTradeConfirm(null) }}
                className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:bg-white/10"
                style={{ color: "rgba(148,163,184,0.6)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quantity can be adjusted before the final confirmation. */}
            <div className="mx-3 mt-2 rounded-lg px-2.5 py-2" style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.18)" }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label htmlFor="confirm-lot-size" className="block text-[9px] font-black uppercase tracking-widest text-cyan-300">Trade quantity</label>
                  <p className="mt-1 text-[9px] text-slate-400">Adjust the position size in lots before placing.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateConfirmLotSize(String(tradeConfirm.lotSize - 0.01))} disabled={confirmLoading} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-sm font-bold text-slate-300 hover:border-cyan-500 hover:text-cyan-300 disabled:opacity-40" aria-label="Decrease lots">−</button>
                  <input
                    id="confirm-lot-size"
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={tradeConfirm.lotSize}
                    onChange={(event) => updateConfirmLotSize(event.target.value)}
                    disabled={confirmLoading}
                    className="h-8 w-20 rounded-lg border border-cyan-500/40 bg-slate-950 px-2 text-center font-mono text-sm font-bold text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30 disabled:opacity-40"
                    aria-label="Trade quantity in lots"
                  />
                  <span className="text-[10px] font-bold text-slate-400">lots</span>
                  <button type="button" onClick={() => updateConfirmLotSize(String(tradeConfirm.lotSize + 0.01))} disabled={confirmLoading} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-sm font-bold text-slate-300 hover:border-cyan-500 hover:text-cyan-300 disabled:opacity-40" aria-label="Increase lots">+</button>
                </div>
              </div>
            </div>

            <div className="mx-3 mt-2 rounded-lg px-2.5 py-2" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label htmlFor="confirm-leverage" className="block text-[9px] font-black uppercase tracking-widest text-amber-300">Leverage</label>
                  <p className="mt-1 text-[9px] text-slate-400">Choose leverage before placing the order.</p>
                </div>
                <select id="confirm-leverage" value={tradeConfirm.leverage} onChange={(event) => updateConfirmLeverage(event.target.value)} disabled={confirmLoading} className="h-8 rounded-lg border border-amber-500/40 bg-slate-950 px-3 text-center font-mono text-sm font-bold text-amber-200 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30 disabled:opacity-40" aria-label="Trade leverage">
                  {[1, 5, 10, 20, 50, 100].map(value => <option key={value} value={value} style={{ background: "#080c14", color: "#fbbf24" }}>1:{value}</option>)}
                </select>
              </div>
            </div>

            {/* Order summary grid */}
            <div className="px-3 py-2.5 grid grid-cols-2 gap-1.5">
                {[
                { label: "Instrument", value: tradeConfirm.pair, color: "#f8fafc" },
                { label: "Order Type", value: tradeConfirm.isPending ? (tradeConfirm.pendingOrderType?.replace("_", " ") ?? "Pending") : "MARKET", color: "#22d3ee" },
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
                { label: "Spread", value: `${((selectedPair?.spread ?? 0) / pip(tradeConfirm.pair)).toFixed(1)} pips · $${estimatedSpreadCost.toFixed(2)}`, color: "#fbbf24" },
                { label: "Estimated Fees", value: estimatedFees == null ? "Not returned by engine" : `$${Number(estimatedFees).toFixed(2)}`, color: "#94a3b8" },
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
                  label: tradeConfirm.isPending ? "Liquidation Risk" : "Liq. Price",
                  value: tradeConfirm.isPending ? "Calculated at fill" : fmt(tradeConfirm.liqPrice, tradeConfirm.pair),
                  color: tradeConfirm.isPending ? "#94a3b8" : "#f97316",
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="flex min-w-0 flex-col gap-0.5 px-2.5 py-2 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "rgba(148,163,184,0.5)" }}>{label}</span>
                  <span className="text-[12px] font-black price-mono" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Margin block */}
            <div
              className="mx-3 mb-2 rounded-lg px-3 py-2 flex items-center justify-between"
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
                    {tradeConfirm.isPending ? "Estimated at fill; balance is unchanged until activation" : "Locked from balance until trade closes"}
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
                    ${Math.max(0, walletBalance - (tradeConfirm.isPending ? 0 : tradeConfirm.margin)).toFixed(2)}
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
            <div className="px-4 pb-4 flex gap-2">
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
