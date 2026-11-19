"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import {
  TrendingUp, TrendingDown, Activity, AlertTriangle, BarChart2, BarChart,
  Calendar, Clock, Layers, LineChart, Newspaper, PieChart,
  Search, ShieldAlert, Target, Zap, X, ChevronRight, ChevronDown,
  Command, Keyboard, BookOpen, Gauge, Hash, ArrowUpRight, ArrowDownRight,
  Eye, EyeOff, Maximize2, Minimize2, Grid3x3, Square,
} from "lucide-react"
import type { Candle, ForexPair, OpenTrade, ClosedTrade } from "@/components/forex-trading-platform"
import { pip, decimals, contractSize } from "@/lib/forex-instruments"

// ─── Provider quote ladder ────────────────────────────────────────────────────

export function DepthOfMarketLadder({
  pair, online, onPlaceOrder,
}: {
  pair: ForexPair
  online: boolean
  onPlaceOrder?: (side: "BUY" | "SELL", price: number) => void
}) {
  const precision = decimals(pair.symbol)
  const spread = Math.max(0, pair.ask - pair.bid)
  const mid = (pair.bid + pair.ask) / 2
  const spreadPips = spread / pip(pair.symbol)
  const hasProviderBidAsk = ["tiingo", "tiingo-fx-websocket", "biquote-websocket"].includes(pair.quoteSource ?? "")
  const quoteLabel = hasProviderBidAsk ? "Provider bid/ask" : "Indicative bid/ask"

  return (
    <section aria-label={`${pair.symbol} quote details`} className="flex h-full flex-col gap-3 overflow-y-auto p-3" style={{ background: "#070a10" }}>
      <header className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <BarChart2 className="size-4 shrink-0 text-cyan-400" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-white">Quote ladder</h3>
            <p className="truncate text-[9px] text-slate-500">{quoteLabel} · {pair.quoteSource || "feed pending"}</p>
          </div>
        </div>
        <span className="shrink-0 rounded border px-2 py-1 text-[8px] font-black uppercase tracking-wider" style={{ color: online ? "#34d399" : "#94a3b8", borderColor: online ? "rgba(52,211,153,.25)" : "rgba(148,163,184,.2)", background: online ? "rgba(52,211,153,.08)" : "rgba(148,163,184,.06)" }}>
          {online ? "Live quote" : "Waiting"}
        </span>
      </header>

      <button
        type="button"
        disabled={!online || !onPlaceOrder}
        onClick={() => online && onPlaceOrder?.("BUY", pair.ask)}
        className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 text-left transition-colors hover:bg-red-500/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={online ? `Prefill buy limit at ${pair.ask.toFixed(precision)}` : "Buy quote unavailable"}
      >
        <span className="text-[9px] font-bold uppercase tracking-wider text-red-300">Ask · buy</span>
        <strong className="price-mono text-base font-black text-red-300">{online ? pair.ask.toFixed(precision) : "—"}</strong>
      </button>

      <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5">
        <div>
          <p className="text-[8px] font-black uppercase tracking-wider text-slate-500">Mid</p>
          <p className="price-mono mt-1 text-sm font-black text-cyan-300">{online ? mid.toFixed(precision) : "—"}</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-black uppercase tracking-wider text-slate-500">Spread</p>
          <p className="price-mono mt-1 text-[10px] font-bold text-slate-300">{online ? `${spreadPips.toFixed(1)} pips · ${spread.toFixed(precision)}` : "—"}</p>
        </div>
      </div>

      <button
        type="button"
        disabled={!online || !onPlaceOrder}
        onClick={() => online && onPlaceOrder?.("SELL", pair.bid)}
        className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 text-left transition-colors hover:bg-emerald-500/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={online ? `Prefill sell limit at ${pair.bid.toFixed(precision)}` : "Bid quote unavailable"}
      >
        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300">Bid · sell</span>
        <strong className="price-mono text-base font-black text-emerald-300">{online ? pair.bid.toFixed(precision) : "—"}</strong>
      </button>

      <p className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-[10px] leading-relaxed text-slate-400">
        This quote feed does not provide venue order-book sizes, cumulative depth, or iceberg data. Prices above prefill a limit ticket; they do not place an order.
      </p>
    </section>
  )
}

// ─── Portfolio Risk Analytics ────────────────────────────────────────────────

type RiskMetrics = {
  totalExposure: number
  netExposure: number
  grossLong: number
  grossShort: number
  marginUtilization: number
  stressLoss1: number
  stressLoss5: number
  largestPosition: { pair: string; notional: number; pct: number } | null
  concentration: number
  byPair: { pair: string; notional: number; pnl: number; direction: "BUY" | "SELL" | "BOTH" | "NONE" }[]
  correlation: { a: string; b: string; corr: number }[]
}

function estimateUsdNotional(pairSymbol: string, lotSize: number, price: number, pairs: ForexPair[]): number | null {
  if (![lotSize, price].every(Number.isFinite) || lotSize <= 0 || price <= 0) return null
  const [base, quote] = pairSymbol.split("/")
  const units = lotSize * contractSize(pairSymbol)
  if (base === "USD") return units
  if (quote === "USD") return units * price

  const directConversion = pairs.find(pair => pair.symbol === `${quote}/USD`)
  if (directConversion && directConversion.bid > 0 && directConversion.ask > 0) {
    return units * price * ((directConversion.bid + directConversion.ask) / 2)
  }
  const inverseConversion = pairs.find(pair => pair.symbol === `USD/${quote}`)
  if (inverseConversion && inverseConversion.bid > 0 && inverseConversion.ask > 0) {
    return units * price / ((inverseConversion.bid + inverseConversion.ask) / 2)
  }
  return null
}

export function RiskAnalyticsPanel({
  openTrades, walletBalance, equity, totalMargin, totalPnl, pairs,
}: {
  openTrades: OpenTrade[]
  walletBalance: number
  equity: number
  totalMargin: number
  totalPnl: number
  pairs: ForexPair[]
}) {
  const metrics = useMemo(() => {
    const byPairMap: Record<string, { notional: number; pnl: number; long: number; short: number }> = {}
    let grossLong = 0, grossShort = 0, netExposure = 0, totalExposure = 0, unpricedPositions = 0
    openTrades.forEach(t => {
      if (!byPairMap[t.pair]) byPairMap[t.pair] = { notional: 0, pnl: 0, long: 0, short: 0 }
      byPairMap[t.pair].pnl += t.pnl
      const notional = estimateUsdNotional(t.pair, t.lotSize, t.currentPrice, pairs)
      if (notional === null) {
        unpricedPositions += 1
        return
      }
      totalExposure += notional
      if (t.direction === "BUY") { grossLong += notional; netExposure += notional }
      else { grossShort += notional; netExposure -= notional }
      byPairMap[t.pair].notional += notional
      if (t.direction === "BUY") byPairMap[t.pair].long += notional
      else byPairMap[t.pair].short += notional
    })
    const byPair = Object.entries(byPairMap).map(([pair, d]) => ({
      pair,
      notional: d.notional,
      pnl: d.pnl,
      direction: d.long > 0 && d.short > 0 ? "BOTH" : d.long > 0 ? "BUY" : d.short > 0 ? "SELL" : "NONE",
    })).sort((a, b) => b.notional - a.notional)

    const largest = byPair[0] ?? null
    const concentration = totalExposure > 0 && largest ? (largest.notional / totalExposure) * 100 : 0

    const stressLoss1 = totalExposure * 0.01
    const stressLoss5 = totalExposure * 0.05

    // Correlation: simple proxy from recent candle closes (Pearson on last 30)
    const corr: { a: string; b: string; corr: number }[] = []
    const symbols = byPair.map(b => b.pair).slice(0, 6)
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const a: number[] = pairs.find(p => p.symbol === symbols[i])?.candles.slice(-30).map((c: Candle) => c.close) ?? []
        const b: number[] = pairs.find(p => p.symbol === symbols[j])?.candles.slice(-30).map((c: Candle) => c.close) ?? []
        const n = Math.min(a.length, b.length)
        if (n < 5) continue
        const ma = a.slice(-n).reduce((s: number, v: number) => s + v, 0) / n
        const mb = b.slice(-n).reduce((s: number, v: number) => s + v, 0) / n
        let num = 0, da = 0, db = 0
        for (let k = 0; k < n; k++) {
          const xa = a[a.length - n + k] - ma
          const xb = b[b.length - n + k] - mb
          num += xa * xb
          da += xa * xa
          db += xb * xb
        }
        const denom = Math.sqrt(da * db)
        corr.push({ a: symbols[i], b: symbols[j], corr: denom > 0 ? num / denom : 0 })
      }
    }

    return {
      totalExposure, netExposure, grossLong, grossShort,
      marginUtilization: equity > 0 ? (totalMargin / equity) * 100 : 0,
      stressLoss1, stressLoss5, unpricedPositions,
      largestPosition: largest ? { pair: largest.pair, notional: largest.notional, pct: concentration } : null,
      concentration,
      byPair, correlation: corr,
    }
  }, [openTrades, equity, totalMargin, pairs])

  const marginWarning = metrics.marginUtilization > 80
  const netDir = metrics.netExposure >= 0 ? "LONG" : "SHORT"
  const netColor = metrics.netExposure >= 0 ? "#10b981" : "#ef4444"

  return (
    <div className="p-2 flex flex-col gap-2 overflow-y-auto terminal-scroll h-full">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { label: "Gross Exposure", value: `$${(metrics.totalExposure / 1000).toFixed(1)}K`, color: "#22d3ee", hint: "Sum of all position notionals" },
          { label: "Net Direction", value: `${netDir} $${(Math.abs(metrics.netExposure) / 1000).toFixed(1)}K`, color: netColor, hint: "Longs minus shorts" },
          { label: "Margin Used", value: `${metrics.marginUtilization.toFixed(0)}%`, color: metrics.marginUtilization > 80 ? "#ef4444" : metrics.marginUtilization > 50 ? "#f59e0b" : "#10b981", hint: "Of total equity" },
          { label: "1% Shock", value: `-$${metrics.stressLoss1.toFixed(0)}`, color: "#fb923c", hint: "Simple 1% adverse-price scenario; not statistical VaR" },
          { label: "5% Shock", value: `-$${metrics.stressLoss5.toFixed(0)}`, color: "#ef4444", hint: "Simple 5% adverse-price scenario; not statistical VaR" },
          { label: "Concentration", value: `${metrics.concentration.toFixed(0)}%`, color: metrics.concentration > 50 ? "#ef4444" : "#94a3b8", hint: "Largest single position" },
        ].map(item => (
          <div key={item.label} className="px-2.5 py-2 rounded-lg" style={{ background: "#0a1120", border: "1px solid #1a2640" }} title={item.hint}>
            <p className="text-[7px] font-black tracking-widest uppercase text-slate-700 mb-0.5">{item.label}</p>
            <p className="price-mono text-[12px] font-black" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {metrics.unpricedPositions > 0 && (
        <div role="status" className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-[9px] leading-relaxed text-amber-200">
          USD exposure is incomplete for {metrics.unpricedPositions} position{metrics.unpricedPositions === 1 ? "" : "s"}; a quote-currency conversion is unavailable.
        </div>
      )}

      {/* Margin call warning */}
      {marginWarning && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="text-[10px] font-black text-red-300">MARGIN CALL WARNING</p>
            <p className="text-[9px] text-red-400/80">Margin utilization above 80% — consider closing or hedging positions.</p>
          </div>
        </div>
      )}

      {/* Long / Short bar */}
      <div className="rounded-xl px-3 py-2.5" style={{ background: "#0a1120", border: "1px solid #1a2640" }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">Long vs Short</span>
          <span className="text-[8px] font-bold text-slate-500">${(metrics.grossLong / 1000).toFixed(1)}K / ${(metrics.grossShort / 1000).toFixed(1)}K</span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden" style={{ background: "#111827" }}>
          <div className="h-full transition-all" style={{ width: `${metrics.totalExposure > 0 ? (metrics.grossLong / metrics.totalExposure) * 100 : 50}%`, background: "linear-gradient(90deg,#059669,#10b981)" }} />
          <div className="h-full transition-all" style={{ width: `${metrics.totalExposure > 0 ? (metrics.grossShort / metrics.totalExposure) * 100 : 50}%`, background: "linear-gradient(90deg,#ef4444,#dc2626)" }} />
        </div>
      </div>

      {/* Exposure by pair */}
      {metrics.byPair.length > 0 && (
        <div className="rounded-xl px-3 py-2.5" style={{ background: "#0a1120", border: "1px solid #1a2640" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <PieChart className="h-3 w-3 text-violet-400" />
            <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">Exposure by Pair</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {metrics.byPair.map(p => {
              const pct = metrics.totalExposure > 0 ? (p.notional / metrics.totalExposure) * 100 : 0
              const dirColor = p.direction === "BUY" ? "#10b981" : p.direction === "SELL" ? "#ef4444" : "#a78bfa"
              return (
                <div key={p.pair} className="flex items-center gap-2">
                  <span className="price-mono text-[10px] font-black text-white w-16 shrink-0">{p.pair}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden relative" style={{ background: "#111827" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: dirColor }} />
                  </div>
                  <span className="price-mono text-[9px] font-bold w-14 text-right shrink-0" style={{ color: dirColor }}>
                    ${(p.notional / 1000).toFixed(1)}K
                  </span>
                  <span className="text-[8px] font-black w-8 text-right shrink-0" style={{ color: p.pnl >= 0 ? "#10b981" : "#ef4444" }}>
                    {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(0)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Correlation heatmap */}
      {metrics.correlation.length > 0 && (
        <div className="rounded-xl px-3 py-2.5" style={{ background: "#0a1120", border: "1px solid #1a2640" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Grid3x3 className="h-3 w-3 text-cyan-400" />
            <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">Pair Correlation (30-bar)</span>
          </div>
          <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${Math.min(metrics.correlation.length, 6)}, 1fr)` }}>
            {metrics.correlation.slice(0, 12).map((c, i) => {
              const intensity = Math.abs(c.corr)
              const isPos = c.corr >= 0
              const bg = isPos
                ? `rgba(16,185,129,${0.15 + intensity * 0.4})`
                : `rgba(239,68,68,${0.15 + intensity * 0.4})`
              return (
                <div key={i} className="px-1.5 py-1 rounded text-center" style={{ background: bg, border: "1px solid rgba(255,255,255,0.04)" }} title={`${c.a} vs ${c.b}: ${(c.corr * 100).toFixed(0)}%`}>
                  <p className="text-[7px] font-black text-slate-400 truncate">{c.a.split("/")[0]}/{c.b.split("/")[0]}</p>
                  <p className="price-mono text-[10px] font-black" style={{ color: isPos ? "#10b981" : "#ef4444" }}>{(c.corr * 100).toFixed(0)}%</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {openTrades.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <ShieldAlert className="h-8 w-8" style={{ color: "#1e2d45" }} />
          <p className="text-[10px] text-slate-700">No open positions — risk metrics will appear here</p>
        </div>
      )}
    </div>
  )
}

// ─── News & Economic Calendar ────────────────────────────────────────────────

export function NewsCalendarPanel() {
  return (
    <section aria-labelledby="economic-calendar-title" className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <header className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3">
        <Newspaper className="size-4 shrink-0 text-amber-400" aria-hidden="true" />
        <div className="min-w-0">
          <h3 id="economic-calendar-title" className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">Economic calendar</h3>
          <p className="mt-1 text-[9px] text-slate-500">Live event data is not connected</p>
        </div>
        <span className="ml-auto shrink-0 rounded border border-slate-700 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-slate-400">Unavailable</span>
      </header>
      <div role="status" className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
        <p className="text-[11px] font-bold text-slate-200">No verified events to display</p>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
          A live economic-calendar provider is not configured. Sample dates and stale central-bank figures are intentionally hidden rather than presented as current market data.
        </p>
      </div>
    </section>
  )
}

// ─── Trade Journal & Analytics ───────────────────────────────────────────────

export function TradeJournalPanel({ closed, equityHistory }: { closed: ClosedTrade[]; equityHistory: number[] }) {
  // MAE/MFE: maximum adverse/favorable excursion per trade (approximated from
  // final pips — a real implementation would track intrabar extremes)
  const maeMfe = useMemo(() => {
    return closed.slice(0, 20).map(t => ({
      id: t.id,
      pair: t.pair,
      direction: t.direction,
      mae: Math.abs(t.finalPips) * 0.4, // approximation
      mfe: Math.abs(t.finalPips) * 1.2,
      efficiency: Math.abs(t.finalPips) > 0 ? (t.finalPips > 0 ? 1 : 0) : 0.5,
    }))
  }, [closed])

  // Holding-time distribution uses the duration captured when each trade closed.
  const holdingDist = useMemo(() => {
    const buckets = { "<1m": 0, "1-5m": 0, "5-15m": 0, "15-60m": 0, "1-4h": 0, ">4h": 0 }
    closed.forEach(t => {
      const seconds = [...String(t.closeDuration ?? "").matchAll(/(\d+)\s*([dhms])/gi)].reduce((total, match) => {
        const amount = Number(match[1])
        const unit = match[2].toLowerCase()
        return total + amount * (unit === "d" ? 86400 : unit === "h" ? 3600 : unit === "m" ? 60 : 1)
      }, 0)
      const m = Math.floor(seconds / 60)
      if (m < 1) buckets["<1m"]++
      else if (m < 5) buckets["1-5m"]++
      else if (m < 15) buckets["5-15m"]++
      else if (m < 60) buckets["15-60m"]++
      else if (m < 240) buckets["1-4h"]++
      else buckets[">4h"]++
    })
    const max = Math.max(...Object.values(buckets), 1)
    return { buckets, max }
  }, [closed])

  // Daily P&L calendar (last 14 days)
  const dailyPnl = useMemo(() => {
    const days: { date: string; pnl: number; trades: number }[] = []
    const now = new Date()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      const dayTrades = closed.filter(t => {
        const closeTimestamp = Date.parse(t.closeTime)
        const closedAt = Number.isFinite(closeTimestamp) ? new Date(closeTimestamp) : new Date(t.openTimestamp)
        return `${closedAt.getFullYear()}-${closedAt.getMonth()}-${closedAt.getDate()}` === key
      })
      days.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        pnl: dayTrades.reduce((s, t) => s + t.finalPnl, 0),
        trades: dayTrades.length,
      })
    }
    return days
  }, [closed])

  // Expectancy: average win × win rate − average loss × loss rate
  const expectancy = useMemo(() => {
    if (closed.length === 0) return 0
    const wins = closed.filter(t => t.finalPnl > 0)
    const losses = closed.filter(t => t.finalPnl <= 0)
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.finalPnl, 0) / wins.length : 0
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.finalPnl, 0)) / losses.length : 0
    const winRate = wins.length / closed.length
    const lossRate = 1 - winRate
    return avgWin * winRate - avgLoss * lossRate
  }, [closed])

  if (closed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
        <BookOpen className="h-10 w-10" style={{ color: "#1e2d45" }} />
        <p className="text-[11px] font-bold tracking-wider uppercase" style={{ color: "#2d4565" }}>Trade journal is empty</p>
        <p className="text-[10px] text-center" style={{ color: "#1e2d45" }}>Close trades to build your performance journal</p>
      </div>
    )
  }

  const maxAbsDaily = Math.max(...dailyPnl.map(d => Math.abs(d.pnl)), 1)

  return (
    <div className="p-2 flex flex-col gap-2 overflow-y-auto terminal-scroll h-full">
      {/* Expectancy */}
      <div className="rounded-xl px-3 py-2.5" style={{ background: "#0a1120", border: "1px solid #1a2640" }}>
        <div className="flex items-center gap-1.5 mb-1">
          <Target className="h-3 w-3 text-cyan-400" />
          <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">Expectancy per Trade</span>
        </div>
        <p className="price-mono text-[18px] font-black" style={{ color: expectancy >= 0 ? "#10b981" : "#ef4444" }}>
          {expectancy >= 0 ? "+" : ""}${expectancy.toFixed(2)}
        </p>
        <p className="text-[8px] text-slate-500 mt-0.5">Average expected profit per trade at current win rate</p>
      </div>

      {/* Daily P&L calendar */}
      <div className="rounded-xl px-3 py-2.5" style={{ background: "#0a1120", border: "1px solid #1a2640" }}>
        <div className="flex items-center gap-1.5 mb-2">
          <Calendar className="h-3 w-3 text-violet-400" />
          <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">Daily P&L (14 days)</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {dailyPnl.map((d, i) => {
            const intensity = Math.abs(d.pnl) / maxAbsDaily
            const isPos = d.pnl >= 0
            const bg = d.pnl === 0
              ? "rgba(255,255,255,0.03)"
              : isPos
                ? `rgba(16,185,129,${0.15 + intensity * 0.5})`
                : `rgba(239,68,68,${0.15 + intensity * 0.5})`
            return (
              <div key={i} className="aspect-square rounded flex flex-col items-center justify-center p-1" style={{ background: bg, border: "1px solid rgba(255,255,255,0.04)" }} title={`${d.date}: ${d.pnl >= 0 ? "+" : ""}$${d.pnl.toFixed(2)} (${d.trades} trades)`}>
                <span className="text-[7px] font-bold text-slate-500">{d.date}</span>
                {d.pnl !== 0 && (
                  <span className="price-mono text-[8px] font-black" style={{ color: isPos ? "#10b981" : "#ef4444" }}>
                    {d.pnl >= 0 ? "+" : ""}${Math.abs(d.pnl) < 100 ? d.pnl.toFixed(0) : (d.pnl / 1000).toFixed(1) + "K"}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Holding-time distribution */}
      <div className="rounded-xl px-3 py-2.5" style={{ background: "#0a1120", border: "1px solid #1a2640" }}>
        <div className="flex items-center gap-1.5 mb-2">
          <Clock className="h-3 w-3 text-amber-400" />
          <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">Holding-Time Distribution</span>
        </div>
        <div className="flex items-end gap-1 h-12">
          {Object.entries(holdingDist.buckets).map(([bucket, count]) => {
            const h = (count / holdingDist.max) * 100
            return (
              <div key={bucket} className="flex-1 flex flex-col items-center gap-0.5">
                <span className="text-[7px] font-black text-cyan-400">{count}</span>
                <div className="w-full rounded-t transition-all" style={{ height: `${h}%`, minHeight: 2, background: "linear-gradient(180deg,#22d3ee,#0891b2)" }} />
                <span className="text-[7px] font-bold text-slate-500">{bucket}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* MAE / MFE efficiency */}
      {maeMfe.length > 0 && (
        <div className="rounded-xl px-3 py-2.5" style={{ background: "#0a1120", border: "1px solid #1a2640" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Activity className="h-3 w-3 text-emerald-400" />
            <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">Estimated MAE / MFE (last {Math.min(maeMfe.length, 10)} trades)</span>
          </div>
          <div className="flex flex-col gap-1">
            {maeMfe.slice(0, 10).map(t => (
              <div key={t.id} className="flex items-center gap-2">
                <span className="price-mono text-[9px] font-black text-white w-14 shrink-0">{t.pair}</span>
                <div className="flex-1 flex h-1.5 rounded-full overflow-hidden relative" style={{ background: "#111827" }}>
                  <div className="h-full" style={{ width: `${(t.mae / (t.mae + t.mfe)) * 100}%`, background: "#ef4444" }} />
                  <div className="h-full" style={{ width: `${(t.mfe / (t.mae + t.mfe)) * 100}%`, background: "#10b981" }} />
                </div>
                <span className="text-[8px] font-bold w-10 text-right shrink-0" style={{ color: t.direction === "BUY" ? "#10b981" : "#ef4444" }}>{t.direction}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-2 text-[8px] font-bold">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500" /> MAE (adverse)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> MFE (favorable)</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Command Palette ─────────────────────────────────────────────────────────

type CommandAction = {
  id: string; label: string; hint?: string; icon: any; shortcut?: string; action: () => void
}

export function CommandPalette({
  open, onClose, actions,
}: {
  open: boolean
  onClose: () => void
  actions: CommandAction[]
}) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery("")
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return actions
    return actions.filter(a => a.label.toLowerCase().includes(q) || a.hint?.toLowerCase().includes(q))
  }, [query, actions])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose() }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(filtered.length - 1, s + 1)) }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(0, s - 1)) }
      if (e.key === "Enter") {
        e.preventDefault()
        const action = filtered[selected]
        if (action) { action.action(); onClose() }
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, filtered, selected, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-[480px] max-w-full rounded-2xl overflow-hidden" style={{ background: "#0a1120", border: "1px solid #1e3a5f", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid #1a2640" }}>
          <Command className="h-4 w-4 text-cyan-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
          <kbd className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: "#1a2640", color: "#64748b" }}>ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto terminal-scroll">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[11px] text-slate-500">No commands match "{query}"</div>
          ) : (
            filtered.map((action, i) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => { action.action(); onClose() }}
                  onMouseEnter={() => setSelected(i)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  style={{ background: i === selected ? "rgba(34,211,238,0.08)" : "transparent", borderLeft: i === selected ? "2px solid #22d3ee" : "2px solid transparent" }}
                >
                  <Icon className="h-4 w-4 text-cyan-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-white">{action.label}</p>
                    {action.hint && <p className="text-[9px] text-slate-500 truncate">{action.hint}</p>}
                  </div>
                  {action.shortcut && (
                    <kbd className="text-[9px] font-black px-1.5 py-0.5 rounded shrink-0" style={{ background: "#1a2640", color: "#94a3b8" }}>{action.shortcut}</kbd>
                  )}
                </button>
              )
            })
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-2 text-[9px] font-bold tracking-wider uppercase" style={{ background: "#04070d", borderTop: "1px solid #1a2640", color: "#3d5a80" }}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="px-1 rounded" style={{ background: "#1a2640" }}>↑↓</kbd> Navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1 rounded" style={{ background: "#1a2640" }}>↵</kbd> Select</span>
          </div>
          <span>{filtered.length} commands</span>
        </div>
      </div>
    </div>
  )
}

// ─── Hotkey Handler ──────────────────────────────────────────────────────────

export function useTradingHotkeys({
  onBuy, onSell, onCloseAll, onCancelPending, onToggleCommand, onIncreaseLot, onDecreaseLot,
}: {
  onBuy: () => void
  onSell: () => void
  onCloseAll: () => void
  onCancelPending: () => void
  onToggleCommand: () => void
  onIncreaseLot: () => void
  onDecreaseLot: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "k") { e.preventDefault(); onToggleCommand(); return }
      }
      if (e.key === "b" || e.key === "B") { e.preventDefault(); onBuy() }
      else if (e.key === "s" || e.key === "S") { e.preventDefault(); onSell() }
      else if (e.key === "x" || e.key === "X") { e.preventDefault(); onCloseAll() }
      else if (e.key === "Escape") { onCancelPending() }
      else if (e.key === "+" || e.key === "=") { e.preventDefault(); onIncreaseLot() }
      else if (e.key === "-" || e.key === "_") { e.preventDefault(); onDecreaseLot() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onBuy, onSell, onCloseAll, onCancelPending, onToggleCommand, onIncreaseLot, onDecreaseLot])
}

// ─── Mini-Chart Grid (Multi-Asset View) ──────────────────────────────────────

export function MiniChartGrid({
  pairs, selectedSymbol, onSelect, tickCount,
}: {
  pairs: ForexPair[]
  selectedSymbol: string
  onSelect: (symbol: string) => void
  tickCount: number
}) {
  const watchSymbols = ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD", "ETH/USD"]
  const watchPairs = watchSymbols.map(s => pairs.find(p => p.symbol === s)).filter(Boolean) as ForexPair[]

  return (
    <div className="grid grid-cols-3 gap-1 p-1.5 h-full" style={{ background: "#04070d" }}>
      {watchPairs.map(p => {
        const isSelected = p.symbol === selectedSymbol
        const up = p.change >= 0
        const candles = p.candles.slice(-30)
        // Build a tiny sparkline path
        const path = candles.length > 1 ? (() => {
          const min = Math.min(...candles.map((c: Candle) => c.low))
          const max = Math.max(...candles.map((c: Candle) => c.high))
          const range = max - min || 1
          const w = 100, h = 30
          return candles.map((c: Candle, i: number) => {
            const x = (i / (candles.length - 1)) * w
            const y = h - ((c.close - min) / range) * h
            return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
          }).join(" ")
        })() : ""
        return (
          <button
            key={p.symbol}
            type="button"
            onClick={() => onSelect(p.symbol)}
            className="flex flex-col rounded-lg p-1.5 transition-all"
            style={{
              background: isSelected ? "rgba(34,211,238,0.08)" : "#0a1120",
              border: `1px solid ${isSelected ? "rgba(34,211,238,0.4)" : "#1a2640"}`,
            }}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] font-black text-white">{p.symbol}</span>
              <span className="price-mono text-[8px] font-black" style={{ color: up ? "#10b981" : "#ef4444" }}>
                {up ? "+" : ""}{(p.change ?? 0).toFixed(2)}%
              </span>
            </div>
            <div className="flex-1 min-h-0 relative">
              {path ? (
                <svg width="100%" height="30" viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full">
                  <path d={path} stroke={up ? "#10b981" : "#ef4444"} strokeWidth="1" fill="none" />
                </svg>
              ) : (
                <div className="flex items-center justify-center h-full text-[8px] text-slate-700">Loading…</div>
              )}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="price-mono text-[9px] font-bold" style={{ color: up ? "#10b981" : "#ef4444" }}>
                {p.bid > 0 ? p.bid.toFixed(decimals(p.symbol)) : "—"}
              </span>
              <span className="text-[7px] font-bold text-slate-600">{p.spread > 0 ? `${(p.spread / pip(p.symbol)).toFixed(1)}p` : ""}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Connection / Latency Indicator ──────────────────────────────────────────

export function ConnectionStatus({ online, lastUpdated }: { online: boolean; lastUpdated: Date | null }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const quoteAgeSeconds = lastUpdated ? Math.max(0, Math.floor((now - lastUpdated.getTime()) / 1000)) : null

  return (
    <div className="flex items-center gap-2 rounded border border-cyan-400/10 bg-cyan-400/[0.04] px-2 py-1">
      <span className="live-dot" style={{ background: online ? "#10b981" : "#94a3b8", boxShadow: online ? "0 0 6px #10b981" : "none" }} aria-hidden="true" />
      <span className="text-[9px] font-bold price-mono" style={{ color: online ? "#10b981" : "#94a3b8" }}>{online ? "LIVE QUOTES" : "WAITING FOR QUOTE"}</span>
      {quoteAgeSeconds !== null && <span className="price-mono text-[9px] text-slate-400">{quoteAgeSeconds}s ago</span>}
      <span className="price-mono text-[9px] text-slate-500">{new Date(now).toLocaleTimeString("en-US", { hour12: false, timeZone: "UTC" })} UTC</span>
    </div>
  )
}
