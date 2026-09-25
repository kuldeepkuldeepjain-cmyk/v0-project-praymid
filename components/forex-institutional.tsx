"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import {
  TrendingUp, TrendingDown, Activity, AlertTriangle, BarChart2, BarChart,
  Calendar, Clock, Globe2, Layers, LineChart, Newspaper, PieChart,
  Search, ShieldAlert, Target, Zap, X, ChevronRight, ChevronDown,
  Command, Keyboard, BookOpen, Gauge, Hash, ArrowUpRight, ArrowDownRight,
  Eye, EyeOff, Maximize2, Minimize2, Grid3x3, Square, BellRing,
} from "lucide-react"
import type { Candle, ForexPair, OpenTrade, ClosedTrade } from "@/components/forex-trading-platform"
import { pip, decimals, contractSize } from "@/lib/forex-instruments"

// ─── Live Depth-of-Market Ladder ──────────────────────────────────────────────
//
// Institutional DOM ladders show the full book on both sides with cumulative
// depth bars, iceberg detection (large orders highlighted), and an imbalance
// ratio that tells you which side is being lifted. The ladder ticks with the
// live bid/ask and re-anchors to the new mid on every refresh.

type DomLevel = { price: number; size: number; total: number; isIceberg: boolean }

export function DepthOfMarketLadder({
  pair, tickCount, onPlaceOrder,
}: {
  pair: ForexPair
  tickCount: number
  onPlaceOrder?: (side: "BUY" | "SELL", price: number) => void
}) {
  // Re-derive the book deterministically from the live bid/ask + tick count so
  // it animates with the feed without needing a separate WebSocket.
  const levels = useMemo(() => {
    const ps = pip(pair.symbol)
    const d = decimals(pair.symbol)
    const asks: DomLevel[] = []
    const bids: DomLevel[] = []
    // Pseudo-random but stable per (bid, ask, tick) — uses a simple LCG so the
    // ladder shifts naturally on each tick without flickering.
    let seed = (Math.floor(pair.bid * 1000) + tickCount * 7919) >>> 0
    const rand = () => { seed = (seed * 1103515245 + 12345) >>> 0; return (seed >>> 16) / 65535 }
    for (let i = 1; i <= 12; i++) {
      const askSize = Math.floor(80 + rand() * 1800)
      const bidSize = Math.floor(80 + rand() * 1800)
      // Iceberg: every ~7th level on each side is a large hidden order
      const askIceberg = i % 7 === 0
      const bidIceberg = i % 7 === 0
      asks.push({
        price: parseFloat((pair.ask + ps * i * (0.8 + rand() * 0.4)).toFixed(d)),
        size: askIceberg ? askSize * 4 + 3500 : askSize,
        total: 0,
        isIceberg: askIceberg,
      })
      bids.push({
        price: parseFloat((pair.bid - ps * i * (0.8 + rand() * 0.4)).toFixed(d)),
        size: bidIceberg ? bidSize * 4 + 3500 : bidSize,
        total: 0,
        isIceberg: bidIceberg,
      })
    }
    asks.reverse()
    let aT = 0, bT = 0
    asks.forEach(a => { aT += a.size; a.total = aT })
    bids.forEach(b => { bT += b.size; b.total = bT })
    const maxTotal = Math.max(aT, bT)
    const imbalance = aT > 0 && bT > 0 ? (bT - aT) / (bT + aT) : 0
    return { asks, bids, maxTotal, imbalance }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair.bid, pair.ask, tickCount])

  const maxSize = Math.max(...levels.asks.map(a => a.size), ...levels.bids.map(b => b.size))
  const mid = (pair.bid + pair.ask) / 2
  const spreadPips = pair.spread / pip(pair.symbol)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ background: "#04070d", borderBottom: "1px solid #1a2640" }}>
        <div className="flex items-center gap-2">
          <BarChart2 className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[10px] font-black tracking-[0.18em] uppercase text-white">Depth of Market</span>
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(34,211,238,0.1)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.2)" }}>L2</span>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold price-mono">
          <span className="text-slate-500">IMB</span>
          <span style={{ color: levels.imbalance > 0.1 ? "#10b981" : levels.imbalance < -0.1 ? "#ef4444" : "#94a3b8" }}>
            {levels.imbalance >= 0 ? "+" : ""}{(levels.imbalance * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Imbalance bar */}
      <div className="px-3 py-1.5 shrink-0" style={{ background: "#070a10", borderBottom: "1px solid #1a2640" }}>
        <div className="flex items-center gap-2 text-[8px] font-black tracking-widest uppercase mb-1">
          <span className="text-emerald-400">BID PRESSURE</span>
          <span className="ml-auto text-red-400">ASK PRESSURE</span>
        </div>
        <div className="flex h-1.5 rounded-full overflow-hidden" style={{ background: "#111827" }}>
          <div className="h-full transition-all" style={{ width: `${50 + levels.imbalance * 50}%`, background: "linear-gradient(90deg,#059669,#10b981)" }} />
          <div className="h-full transition-all" style={{ width: `${50 - levels.imbalance * 50}%`, background: "linear-gradient(90deg,#ef4444,#dc2626)" }} />
        </div>
      </div>

      {/* Column headers */}
      <div className="grid shrink-0 px-3 py-1 text-[8px] font-black tracking-widest uppercase" style={{ gridTemplateColumns: "1fr 1fr 1fr", color: "#3d5a80", background: "#070a10", borderBottom: "1px solid #1a2640" }}>
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Cumulative</span>
      </div>

      {/* Asks (sell side) — top of book is the worst ask */}
      <div className="flex-1 overflow-y-auto terminal-scroll flex flex-col-reverse">
        {levels.asks.map((a, i) => (
          <button
            key={`a${i}`}
            type="button"
            onClick={() => onPlaceOrder?.("BUY", a.price)}
            className="relative grid px-3 py-[3px] text-left transition-colors hover:bg-red-500/10"
            style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
          >
            <div className="absolute inset-y-0 right-0 transition-all" style={{ width: `${(a.size / maxSize) * 100}%`, background: a.isIceberg ? "rgba(239,68,68,0.28)" : "rgba(239,68,68,0.12)" }} />
            <span className="price-mono text-[10px] font-black text-red-400 relative z-10">{a.price.toFixed(decimals(pair.symbol))}</span>
            <span className="price-mono text-[10px] text-slate-300 text-right relative z-10">
              {a.size.toLocaleString()}{a.isIceberg && <span className="ml-1 text-[7px] font-black text-amber-400">ICE</span>}
            </span>
            <span className="price-mono text-[10px] text-slate-500 text-right relative z-10">{a.total.toLocaleString()}</span>
          </button>
        ))}
      </div>

      {/* Spread / mid row */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ background: "linear-gradient(90deg, rgba(34,211,238,0.08), rgba(34,211,238,0.02))", borderTop: "1px solid #1e2d45", borderBottom: "1px solid #1e2d45" }}>
        <div className="flex flex-col">
          <span className="text-[7px] font-black tracking-widest uppercase text-cyan-400">MID</span>
          <span className="price-mono text-sm font-black text-cyan-300">{mid.toFixed(decimals(pair.symbol))}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[7px] font-black tracking-widest uppercase text-slate-500">SPREAD</span>
          <span className="price-mono text-[10px] font-black text-slate-300">{spreadPips.toFixed(1)}p · {pair.spread.toFixed(decimals(pair.symbol))}</span>
        </div>
      </div>

      {/* Bids (buy side) */}
      <div className="flex-1 overflow-y-auto terminal-scroll flex flex-col">
        {levels.bids.map((b, i) => (
          <button
            key={`b${i}`}
            type="button"
            onClick={() => onPlaceOrder?.("SELL", b.price)}
            className="relative grid px-3 py-[3px] text-left transition-colors hover:bg-emerald-500/10"
            style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
          >
            <div className="absolute inset-y-0 right-0 transition-all" style={{ width: `${(b.size / maxSize) * 100}%`, background: b.isIceberg ? "rgba(16,185,129,0.28)" : "rgba(16,185,129,0.12)" }} />
            <span className="price-mono text-[10px] font-black text-emerald-400 relative z-10">{b.price.toFixed(decimals(pair.symbol))}</span>
            <span className="price-mono text-[10px] text-slate-300 text-right relative z-10">
              {b.size.toLocaleString()}{b.isIceberg && <span className="ml-1 text-[7px] font-black text-amber-400">ICE</span>}
            </span>
            <span className="price-mono text-[10px] text-slate-500 text-right relative z-10">{b.total.toLocaleString()}</span>
          </button>
        ))}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 shrink-0 text-[8px] font-bold tracking-wider uppercase text-center" style={{ background: "#04070d", borderTop: "1px solid #1a2640", color: "#3d5a80" }}>
        Click any level to place a {onPlaceOrder ? "limit order" : "order"} at that price
      </div>
    </div>
  )
}

// ─── Portfolio Risk Analytics ────────────────────────────────────────────────

type RiskMetrics = {
  totalExposure: number
  netExposure: number
  grossLong: number
  grossShort: number
  marginUtilization: number
  valueAtRisk1: number
  valueAtRisk5: number
  largestPosition: { pair: string; notional: number; pct: number } | null
  concentration: number
  byPair: { pair: string; notional: number; pnl: number; direction: "BUY" | "SELL" | "BOTH" | "NONE" }[]
  correlation: { a: string; b: string; corr: number }[]
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
    let grossLong = 0, grossShort = 0, netExposure = 0, totalExposure = 0
    openTrades.forEach(t => {
      const notional = t.lotSize * contractSize(t.pair) * t.currentPrice
      totalExposure += notional
      if (t.direction === "BUY") { grossLong += notional; netExposure += notional }
      else { grossShort += notional; netExposure -= notional }
      if (!byPairMap[t.pair]) byPairMap[t.pair] = { notional: 0, pnl: 0, long: 0, short: 0 }
      byPairMap[t.pair].notional += notional
      byPairMap[t.pair].pnl += t.pnl
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

    // 1% VaR: assume 1% adverse move on the notional
    const valueAtRisk1 = totalExposure * 0.01
    const valueAtRisk5 = totalExposure * 0.05

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
      valueAtRisk1, valueAtRisk5,
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
          { label: "1% VaR", value: `-$${metrics.valueAtRisk1.toFixed(0)}`, color: "#fb923c", hint: "Loss if market moves 1% against you" },
          { label: "5% VaR", value: `-$${metrics.valueAtRisk5.toFixed(0)}`, color: "#ef4444", hint: "Loss if market moves 5% against you" },
          { label: "Concentration", value: `${metrics.concentration.toFixed(0)}%`, color: metrics.concentration > 50 ? "#ef4444" : "#94a3b8", hint: "Largest single position" },
        ].map(item => (
          <div key={item.label} className="px-2.5 py-2 rounded-lg" style={{ background: "#0a1120", border: "1px solid #1a2640" }} title={item.hint}>
            <p className="text-[7px] font-black tracking-widest uppercase text-slate-700 mb-0.5">{item.label}</p>
            <p className="price-mono text-[12px] font-black" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

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

type NewsItem = {
  time: string; title: string; impact: "high" | "med" | "low"; currency: string; actual?: string; forecast?: string; previous?: string
}

const NEWS_FEED: NewsItem[] = [
  { time: "08:30", title: "US Non-Farm Payrolls", impact: "high", currency: "USD", actual: "227K", forecast: "180K", previous: "223K" },
  { time: "10:00", title: "EUR CPI Flash Estimate (YoY)", impact: "high", currency: "EUR", actual: "2.4%", forecast: "2.3%", previous: "2.2%" },
  { time: "12:30", title: "BoE Interest Rate Decision", impact: "high", currency: "GBP", actual: "4.75%", forecast: "4.75%", previous: "5.00%" },
  { time: "14:00", title: "US ISM Manufacturing PMI", impact: "med", currency: "USD", actual: "48.5", forecast: "49.0", previous: "48.7" },
  { time: "19:30", title: "FOMC Meeting Minutes", impact: "high", currency: "USD" },
  { time: "23:50", title: "Japan Trade Balance", impact: "low", currency: "JPY" },
  { time: "Tomorrow 09:00", title: "German ZEW Economic Sentiment", impact: "med", currency: "EUR" },
  { time: "Tomorrow 13:30", title: "US CPI (YoY)", impact: "high", currency: "USD" },
  { time: "Tomorrow 21:45", title: "RBNZ Rate Statement", impact: "high", currency: "NZD" },
]

const CENTRAL_BANK_RATES = [
  { cb: "Fed",     country: "US",  rate: "4.75%", next: "Dec 17", bias: "neutral", color: "#3b82f6" },
  { cb: "ECB",     country: "EU",  rate: "3.25%", next: "Dec 12", bias: "dovish",  color: "#a78bfa" },
  { cb: "BoE",     country: "UK",  rate: "4.75%", next: "Dec 19", bias: "neutral", color: "#ef4444" },
  { cb: "BoJ",     country: "JP",  rate: "0.50%", next: "Dec 19", bias: "hawkish", color: "#f59e0b" },
  { cb: "SNB",     country: "CH",  rate: "1.00%", next: "Dec 12", bias: "dovish",  color: "#10b981" },
  { cb: "RBA",     country: "AU",  rate: "4.35%", next: "Dec 10", bias: "neutral", color: "#22d3ee" },
  { cb: "BoC",     country: "CA",  rate: "3.75%", next: "Dec 11", bias: "dovish",  color: "#fb923c" },
]

export function NewsCalendarPanel() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const impactColor = { high: "#ef4444", med: "#f59e0b", low: "#10b981" }
  const biasColor = { hawkish: "#10b981", neutral: "#94a3b8", dovish: "#ef4444" }

  // Find next high-impact event
  const nextHigh = NEWS_FEED.find(n => n.impact === "high" && !n.actual)

  return (
    <div className="p-2 flex flex-col gap-2 overflow-y-auto terminal-scroll h-full">
      {/* Next event countdown */}
      {nextHigh && (
        <div className="rounded-xl px-3 py-2.5" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))", border: "1px solid rgba(239,68,68,0.3)" }}>
          <div className="flex items-center gap-2 mb-1">
            <BellRing className="h-3.5 w-3.5 text-red-400 animate-pulse" />
            <span className="text-[9px] font-black tracking-widest uppercase text-red-300">Next High-Impact Event</span>
          </div>
          <p className="text-[12px] font-black text-white">{nextHigh.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] font-bold text-slate-400">{nextHigh.currency} · {nextHigh.time}</span>
            <span className="ml-auto price-mono text-[10px] font-black text-red-400">SOON</span>
          </div>
        </div>
      )}

      {/* Central bank rates */}
      <div className="rounded-xl px-3 py-2.5" style={{ background: "#0a1120", border: "1px solid #1a2640" }}>
        <div className="flex items-center gap-1.5 mb-2">
          <Globe2 className="h-3 w-3 text-cyan-400" />
          <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">Central Bank Rates</span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {CENTRAL_BANK_RATES.map(cb => (
            <div key={cb.cb} className="px-2 py-1.5 rounded-lg flex items-center gap-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #111827" }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cb.color, boxShadow: `0 0 6px ${cb.color}` }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-black text-white">{cb.cb}</span>
                  <span className="text-[7px] font-bold text-slate-500">{cb.country}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="price-mono text-[10px] font-black" style={{ color: cb.color }}>{cb.rate}</span>
                  <span className="text-[7px] font-bold uppercase tracking-wider" style={{ color: biasColor[cb.bias as keyof typeof biasColor] }}>{cb.bias}</span>
                </div>
              </div>
              <span className="text-[7px] font-bold text-slate-600 shrink-0">{cb.next}</span>
            </div>
          ))}
        </div>
      </div>

      {/* News feed */}
      <div className="rounded-xl px-3 py-2.5" style={{ background: "#0a1120", border: "1px solid #1a2640" }}>
        <div className="flex items-center gap-1.5 mb-2">
          <Newspaper className="h-3 w-3 text-amber-400" />
          <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">Economic Calendar</span>
          <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>LIVE</span>
        </div>
        <div className="flex flex-col gap-1">
          {NEWS_FEED.map((n, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: n.actual ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.02)", border: "1px solid #111827" }}>
              <span className="price-mono text-[9px] font-bold text-slate-500 w-20 shrink-0">{n.time}</span>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: impactColor[n.impact] }} />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-slate-300 truncate">{n.title}</p>
                {n.actual && (
                  <div className="flex items-center gap-2 mt-0.5 text-[8px]">
                    <span className="font-bold text-emerald-400">A: {n.actual}</span>
                    {n.forecast && <span className="text-slate-500">F: {n.forecast}</span>}
                    {n.previous && <span className="text-slate-600">P: {n.previous}</span>}
                  </div>
                )}
              </div>
              <span className="text-[8px] font-black px-1 py-0.5 rounded shrink-0" style={{ background: "rgba(255,255,255,0.04)", color: "#64748b" }}>{n.currency}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
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

  // Holding-time distribution
  const holdingDist = useMemo(() => {
    const buckets = { "<1m": 0, "1-5m": 0, "5-15m": 0, "15-60m": 0, "1-4h": 0, ">4h": 0 }
    closed.forEach(t => {
      const ms = Date.now() - t.openTimestamp
      const m = Math.floor(ms / 60000)
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
        const ct = new Date(t.openTimestamp)
        return `${ct.getFullYear()}-${ct.getMonth()}-${ct.getDate()}` === key
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
            <span className="text-[9px] font-black tracking-widest uppercase text-slate-400">MAE / MFE (last {Math.min(maeMfe.length, 10)} trades)</span>
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
  const [latency, setLatency] = useState(42)
  const [serverTime, setServerTime] = useState(() => new Date())

  useEffect(() => {
    const t1 = setInterval(() => {
      // Simulate latency jitter between 28-58ms
      setLatency(prev => Math.max(20, Math.min(80, prev + (Math.random() - 0.5) * 8)))
    }, 2000)
    const t2 = setInterval(() => setServerTime(new Date()), 1000)
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [])

  const latencyColor = latency < 50 ? "#10b981" : latency < 100 ? "#f59e0b" : "#ef4444"

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded shrink-0" style={{ background: "rgba(34,211,238,0.04)", border: "1px solid rgba(34,211,238,0.10)" }}>
      <span className="live-dot" style={{ background: online ? "#10b981" : "#ef4444", boxShadow: online ? "0 0 6px #10b981" : "0 0 6px #ef4444" }} />
      <span className="text-[8px] font-black tracking-[0.14em] uppercase" style={{ color: "#3d5a80" }}>LP</span>
      <span className="text-[9px] font-bold price-mono" style={{ color: online ? "#10b981" : "#ef4444" }}>{online ? "LIVE" : "OFFLINE"}</span>
      <span className="text-[8px]" style={{ color: "#2d4565" }}>·</span>
      <span className="text-[8px] font-black tracking-[0.12em] uppercase" style={{ color: "#3d5a80" }}>PING</span>
      <span className="price-mono text-[9px] font-black" style={{ color: latencyColor }}>{Math.round(latency)}ms</span>
      <span className="text-[8px]" style={{ color: "#2d4565" }}>·</span>
      <span className="price-mono text-[9px] text-slate-400 hidden md:inline">{serverTime.toLocaleTimeString("en-US", { hour12: false })}</span>
    </div>
  )
}
