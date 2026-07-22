"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  X,
  ChevronUp,
  ChevronDown,
  Clock,
  BarChart2,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  WifiOff,
  History,
  Layers,
  Activity,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

// ─── Types ───────────────────────────────────────────────────────────────────

type ForexPair = {
  symbol: string     // "EUR/USD"
  base: string       // "EUR"
  quote: string      // "USD"
  bid: number
  ask: number
  change: number     // percentage
  high: number
  low: number
  open: number
  history: { time: string; price: number }[]
  spread: number
}

type TradeDirection = "BUY" | "SELL"

type OpenTrade = {
  id: string
  pair: string
  direction: TradeDirection
  lotSize: number
  leverage: number
  openPrice: number
  currentPrice: number
  sl: number | null
  tp: number | null
  openTime: string
  pnl: number
  margin: number
}

type ClosedTrade = OpenTrade & {
  closePrice: number
  closeTime: string
  finalPnl: number
}

type TimeFrame = "1M" | "5M" | "15M" | "1H" | "4H" | "1D"

// ─── Constants ───────────────────────────────────────────────────────────────

const PAIRS: { base: string; quote: string; symbol: string }[] = [
  { base: "EUR", quote: "USD", symbol: "EUR/USD" },
  { base: "GBP", quote: "USD", symbol: "GBP/USD" },
  { base: "USD", quote: "JPY", symbol: "USD/JPY" },
  { base: "USD", quote: "CHF", symbol: "USD/CHF" },
  { base: "AUD", quote: "USD", symbol: "AUD/USD" },
  { base: "USD", quote: "CAD", symbol: "USD/CAD" },
  { base: "NZD", quote: "USD", symbol: "NZD/USD" },
  { base: "EUR", quote: "GBP", symbol: "EUR/GBP" },
]

const TYPICAL_SPREADS: Record<string, number> = {
  "EUR/USD": 0.0002,
  "GBP/USD": 0.0003,
  "USD/JPY": 0.02,
  "USD/CHF": 0.0003,
  "AUD/USD": 0.0003,
  "USD/CAD": 0.0003,
  "NZD/USD": 0.0004,
  "EUR/GBP": 0.0003,
}

const TIMEFRAME_CANDLES: Record<TimeFrame, number> = {
  "1M": 60, "5M": 60, "15M": 60, "1H": 60, "4H": 48, "1D": 30,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pipsValue(pair: string, pnl: number): number {
  if (pair.includes("JPY")) return pnl * 100
  return pnl * 10000
}

function generateHistory(midPrice: number, candles: number, tf: TimeFrame): { time: string; price: number }[] {
  const now = Date.now()
  const msPerTF: Record<TimeFrame, number> = { "1M": 60000, "5M": 300000, "15M": 900000, "1H": 3600000, "4H": 14400000, "1D": 86400000 }
  const ms = msPerTF[tf]
  const volatility = pair_volatility(midPrice)
  const result: { time: string; price: number }[] = []
  let price = midPrice * (1 + (Math.random() - 0.5) * volatility * candles * 0.5)
  for (let i = candles; i >= 0; i--) {
    price += (Math.random() - 0.48) * volatility * midPrice
    const t = new Date(now - i * ms)
    const timeStr = tf === "1D"
      ? t.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    result.push({ time: timeStr, price: parseFloat(price.toFixed(pair_decimals(midPrice))) })
  }
  return result
}

function pair_volatility(midPrice: number): number {
  if (midPrice > 100) return 0.0003   // JPY pairs
  return 0.00015
}

function pair_decimals(midPrice: number): number {
  if (midPrice > 100) return 3
  return 5
}

function formatPrice(price: number, symbol: string): string {
  if (symbol.includes("JPY")) return price.toFixed(3)
  return price.toFixed(5)
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function calcPnl(trade: OpenTrade, currentPrice: number): number {
  const dir = trade.direction === "BUY" ? 1 : -1
  const pipDiff = (currentPrice - trade.openPrice) * dir
  const lotValue = trade.lotSize * 100000
  return parseFloat((pipDiff * lotValue).toFixed(2))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PairRow({
  pair,
  selected,
  onSelect,
}: {
  pair: ForexPair
  selected: boolean
  onSelect: () => void
}) {
  const up = pair.change >= 0
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all border ${
        selected
          ? "bg-cyan-950/70 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
          : "bg-slate-800/50 border-slate-700/40 hover:bg-slate-800 hover:border-slate-600"
      }`}
    >
      <div className="flex flex-col items-start">
        <span className="text-xs font-bold text-white tracking-wide">{pair.symbol}</span>
        <span className={`text-[10px] font-medium ${up ? "text-emerald-400" : "text-red-400"}`}>
          {up ? "+" : ""}{pair.change.toFixed(2)}%
        </span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-xs font-mono text-white">{formatPrice(pair.bid, pair.symbol)}</span>
        <span className={`text-[10px] font-mono ${up ? "text-emerald-400" : "text-red-400"}`}>
          {up ? "▲" : "▼"}
        </span>
      </div>
    </button>
  )
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-cyan-500/30 rounded-lg px-3 py-1.5 text-xs">
        <p className="text-cyan-400 font-mono">{payload[0].payload.time}</p>
        <p className="text-white font-bold font-mono">{payload[0].value}</p>
      </div>
    )
  }
  return null
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ForexTradingPlatform({ participantEmail }: { participantEmail: string }) {
  const [pairs, setPairs] = useState<ForexPair[]>([])
  const [selectedPair, setSelectedPair] = useState<ForexPair | null>(null)
  const [timeframe, setTimeframe] = useState<TimeFrame>("1H")
  const [direction, setDirection] = useState<TradeDirection>("BUY")
  const [lotSize, setLotSize] = useState("0.01")
  const [leverage, setLeverage] = useState("100")
  const [sl, setSl] = useState("")
  const [tp, setTp] = useState("")
  const [openTrades, setOpenTrades] = useState<OpenTrade[]>([])
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([])
  const [activePanel, setActivePanel] = useState<"positions" | "history">("positions")
  const [loading, setLoading] = useState(true)
  const [online, setOnline] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [tradeMsg, setTradeMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [totalPnl, setTotalPnl] = useState(0)
  const ratesRef = useRef<Record<string, number>>({})
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Fetch live rates ────────────────────────────────────────────────────────
  const fetchRates = useCallback(async () => {
    try {
      // Use open.er-api.com (no key required, free tier)
      const res = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      const usdRates: Record<string, number> = data.rates

      // Calculate cross-rates for each pair
      const newPairs: ForexPair[] = PAIRS.map((p) => {
        let mid: number
        if (p.base === "USD") {
          mid = usdRates[p.quote] ? 1 / usdRates[p.quote] : 0
          // Correct: USD/JPY = usdRates[JPY]
          mid = usdRates[p.quote] ?? 1
        } else if (p.quote === "USD") {
          // EUR/USD = 1 / usdRates[EUR]
          mid = usdRates[p.base] ? 1 / usdRates[p.base] : 1
        } else {
          // cross: EUR/GBP = usdRates[GBP] / usdRates[EUR]  — wait: EUR/GBP means 1 EUR = X GBP
          // EUR -> USD: 1/usdRates[EUR]; USD -> GBP: usdRates[GBP]
          // So EUR/GBP = usdRates[GBP] / usdRates[EUR]
          mid = (usdRates[p.quote] ?? 1) / (usdRates[p.base] ?? 1)
        }

        const spread = TYPICAL_SPREADS[p.symbol] ?? 0.0002
        const prevMid = ratesRef.current[p.symbol] ?? mid
        const change = ((mid - prevMid) / (prevMid || 1)) * 100

        // Add tiny random tick noise for realism
        const noise = (Math.random() - 0.5) * spread * 0.3
        const noisyMid = mid + noise

        const bid = parseFloat((noisyMid - spread / 2).toFixed(pair_decimals(mid)))
        const ask = parseFloat((noisyMid + spread / 2).toFixed(pair_decimals(mid)))

        const existing = pairs.find((x) => x.symbol === p.symbol)
        const history = existing?.history?.length
          ? [
              ...existing.history.slice(-TIMEFRAME_CANDLES[timeframe] + 1),
              { time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), price: parseFloat(noisyMid.toFixed(pair_decimals(mid))) },
            ]
          : generateHistory(mid, TIMEFRAME_CANDLES[timeframe], timeframe)

        return {
          symbol: p.symbol,
          base: p.base,
          quote: p.quote,
          bid,
          ask,
          change: parseFloat((change * 100).toFixed(2)),   // exaggerate for demo readability
          high: parseFloat((Math.max(existing?.high ?? bid, ask) * 1.0001).toFixed(pair_decimals(mid))),
          low: parseFloat((Math.min(existing?.low ?? bid, bid) * 0.9999).toFixed(pair_decimals(mid))),
          open: existing?.open ?? bid,
          history,
          spread: parseFloat((ask - bid).toFixed(pair_decimals(mid))),
        }
      })

      // Update ratesRef
      newPairs.forEach((p) => { ratesRef.current[p.symbol] = (p.bid + p.ask) / 2 })

      setPairs(newPairs)
      setOnline(true)
      setLastUpdated(new Date())

      // Sync selected pair
      setSelectedPair((prev) => {
        if (!prev) return newPairs[0]
        return newPairs.find((p) => p.symbol === prev.symbol) ?? prev
      })

      // Update open trade P&L
      setOpenTrades((prev) =>
        prev.map((t) => {
          const updated = newPairs.find((p) => p.symbol === t.pair)
          if (!updated) return t
          const currentPrice = t.direction === "BUY" ? updated.bid : updated.ask
          return { ...t, currentPrice, pnl: calcPnl(t, currentPrice) }
        })
      )

      setLoading(false)
    } catch {
      setOnline(false)
      // Generate synthetic rates if API fails
      if (pairs.length === 0) {
        const fallback: ForexPair[] = PAIRS.map((p) => {
          const defaults: Record<string, number> = {
            "EUR/USD": 1.0875, "GBP/USD": 1.2720, "USD/JPY": 149.50,
            "USD/CHF": 0.9012, "AUD/USD": 0.6530, "USD/CAD": 1.3620,
            "NZD/USD": 0.6050, "EUR/GBP": 0.8550,
          }
          const mid = defaults[p.symbol] ?? 1.0
          const spread = TYPICAL_SPREADS[p.symbol] ?? 0.0002
          return {
            symbol: p.symbol, base: p.base, quote: p.quote,
            bid: parseFloat((mid - spread / 2).toFixed(pair_decimals(mid))),
            ask: parseFloat((mid + spread / 2).toFixed(pair_decimals(mid))),
            change: parseFloat(((Math.random() - 0.5) * 0.4).toFixed(2)),
            high: parseFloat((mid * 1.002).toFixed(pair_decimals(mid))),
            low: parseFloat((mid * 0.998).toFixed(pair_decimals(mid))),
            open: parseFloat(mid.toFixed(pair_decimals(mid))),
            spread: spread,
            history: generateHistory(mid, TIMEFRAME_CANDLES[timeframe], timeframe),
          }
        })
        setPairs(fallback)
        setSelectedPair(fallback[0])
        setLoading(false)
      }
    }
  }, [pairs, timeframe])

  useEffect(() => {
    fetchRates()
    intervalRef.current = setInterval(fetchRates, 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  // Recalculate total P&L
  useEffect(() => {
    setTotalPnl(openTrades.reduce((sum, t) => sum + t.pnl, 0))
  }, [openTrades])

  // Load persisted trades from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`forex_trades_${participantEmail}`)
      if (saved) {
        const { open, closed } = JSON.parse(saved)
        setOpenTrades(open ?? [])
        setClosedTrades(closed ?? [])
      }
    } catch {}
  }, [participantEmail])

  // Persist trades
  useEffect(() => {
    try {
      localStorage.setItem(`forex_trades_${participantEmail}`, JSON.stringify({ open: openTrades, closed: closedTrades }))
    } catch {}
  }, [openTrades, closedTrades, participantEmail])

  // ── Execute trade ───────────────────────────────────────────────────────────
  const executeTrade = () => {
    if (!selectedPair) return
    const lot = parseFloat(lotSize)
    const lev = parseFloat(leverage)
    if (isNaN(lot) || lot <= 0 || lot > 100) { showMsg("error", "Lot size must be between 0.01 and 100"); return }
    if (isNaN(lev) || lev < 1) { showMsg("error", "Invalid leverage"); return }

    const price = direction === "BUY" ? selectedPair.ask : selectedPair.bid
    const margin = parseFloat(((lot * 100000 * price) / lev).toFixed(2))

    const trade: OpenTrade = {
      id: genId(),
      pair: selectedPair.symbol,
      direction,
      lotSize: lot,
      leverage: lev,
      openPrice: price,
      currentPrice: price,
      sl: sl ? parseFloat(sl) : null,
      tp: tp ? parseFloat(tp) : null,
      openTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      pnl: 0,
      margin,
    }
    setOpenTrades((prev) => [trade, ...prev])
    showMsg("success", `${direction} ${lot} lot ${selectedPair.symbol} @ ${formatPrice(price, selectedPair.symbol)}`)
    setSl(""); setTp("")
  }

  // ── Close trade ─────────────────────────────────────────────────────────────
  const closeTrade = (id: string) => {
    setOpenTrades((prev) => {
      const trade = prev.find((t) => t.id === id)
      if (!trade) return prev
      const closed: ClosedTrade = {
        ...trade,
        closePrice: trade.currentPrice,
        closeTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        finalPnl: trade.pnl,
      }
      setClosedTrades((c) => [closed, ...c.slice(0, 49)])
      showMsg(trade.pnl >= 0 ? "success" : "error", `Closed ${trade.pair} ${trade.direction} ��� P&L: $${trade.pnl.toFixed(2)}`)
      return prev.filter((t) => t.id !== id)
    })
  }

  const showMsg = (type: "success" | "error", text: string) => {
    setTradeMsg({ type, text })
    setTimeout(() => setTradeMsg(null), 3500)
  }

  const pip = selectedPair ? (selectedPair.symbol.includes("JPY") ? 0.01 : 0.0001) : 0.0001
  const midPrice = selectedPair ? (selectedPair.bid + selectedPair.ask) / 2 : 0
  const estimatedMargin = selectedPair
    ? parseFloat(((parseFloat(lotSize) || 0.01) * 100000 * midPrice / (parseFloat(leverage) || 100)).toFixed(2))
    : 0

  const chartMin = selectedPair?.history?.length
    ? Math.min(...selectedPair.history.map((h) => h.price)) * 0.9998
    : 0
  const chartMax = selectedPair?.history?.length
    ? Math.max(...selectedPair.history.map((h) => h.price)) * 1.0002
    : 1

  const isUp = selectedPair ? selectedPair.change >= 0 : true

  return (
    <div className="flex flex-col h-full min-h-screen text-white pb-20 forex-deep-bg">

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-3 py-2.5 sticky top-0 z-30"
        style={{
          background: "rgba(3,7,18,0.9)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(34,211,238,0.12)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
        }}
      >
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-cyan-400" style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,0.7))" }} />
          <span className="text-sm font-black text-white tracking-widest">FOREX</span>
          <Badge
            className={`text-[9px] px-1.5 py-0 h-4 font-bold ${online ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/15 text-red-400 border-red-500/30"}`}
            style={online ? { boxShadow: "0 0 8px rgba(16,185,129,0.3)" } : {}}
          >
            {online ? <><Wifi className="h-2.5 w-2.5 mr-0.5 inline" />LIVE</> : <><WifiOff className="h-2.5 w-2.5 mr-0.5 inline" />OFFLINE</>}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[10px] text-slate-600">
              <Clock className="h-3 w-3 inline mr-0.5" />
              {lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <button onClick={fetchRates} className="p-1.5 rounded-lg transition-colors" style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.15)" }}>
            <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* ── Trade notification toast ────────────────────────────────────── */}
      {tradeMsg && (
        <div className={`mx-3 mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border ${
          tradeMsg.type === "success"
            ? "bg-emerald-500/8 border-emerald-500/25 text-emerald-400"
            : "bg-red-500/8 border-red-500/25 text-red-400"
        }`}
          style={tradeMsg.type === "success"
            ? { boxShadow: "0 0 20px rgba(16,185,129,0.15)" }
            : { boxShadow: "0 0 20px rgba(239,68,68,0.15)" }
          }
        >
          {tradeMsg.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          {tradeMsg.text}
        </div>
      )}

      {/* ── P&L Summary bar ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 mx-3 mt-2 rounded-2xl overflow-hidden text-center text-[11px]"
        style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.4)" }}
      >
        <div className="px-2 py-2.5" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-slate-600 mb-1 text-[10px] uppercase tracking-wider">Open</p>
          <p className="font-black text-white">{openTrades.length}</p>
        </div>
        <div className="px-2 py-2.5" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-slate-600 mb-1 text-[10px] uppercase tracking-wider">P&amp;L</p>
          <p className={`font-black ${totalPnl >= 0 ? "price-up" : "price-down"}`}>
            {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
          </p>
        </div>
        <div className="px-2 py-2.5">
          <p className="text-slate-600 mb-1 text-[10px] uppercase tracking-wider">Closed</p>
          <p className="font-black text-white">{closedTrades.length}</p>
        </div>
      </div>

      {/* ── Pair selector ───────────────────────────────────────────────── */}
      <div className="flex gap-1.5 px-3 mt-3 overflow-x-auto pb-1 scrollbar-none flex-nowrap">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 w-20 rounded-lg animate-pulse shrink-0" style={{ background: "rgba(255,255,255,0.05)" }} />
            ))
          : pairs.map((p) => (
              <button
                key={p.symbol}
                onClick={() => setSelectedPair(p)}
                className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all"
                style={selectedPair?.symbol === p.symbol ? {
                  background: "linear-gradient(135deg,rgba(34,211,238,0.25),rgba(34,211,238,0.12))",
                  color: "#22d3ee",
                  border: "1px solid rgba(34,211,238,0.4)",
                  boxShadow: "0 0 14px rgba(34,211,238,0.25), inset 0 1px 0 rgba(255,255,255,0.08)"
                } : {
                  background: "rgba(255,255,255,0.04)",
                  color: p.change >= 0 ? "#34d399" : "#f87171",
                  border: "1px solid rgba(255,255,255,0.07)"
                }}
              >
                {p.symbol}
              </button>
            ))}
      </div>

      {/* ── Selected pair info ───────────────────────────────────────────── */}
      {selectedPair && (
        <div className="mx-3 mt-3 rounded-2xl p-3 relative overflow-hidden glass-dark">
          {/* Corner glow */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${isUp ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"} 0%, transparent 70%)`, filter: "blur(20px)", transform: "translate(30%,-30%)" }} />
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-base font-black text-white tracking-widest">{selectedPair.symbol}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-2xl font-black font-mono ${isUp ? "price-up" : "price-down"}`}>
                  {formatPrice((selectedPair.bid + selectedPair.ask) / 2, selectedPair.symbol)}
                </span>
                <span className={`flex items-center gap-0.5 text-xs font-black ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                  {isUp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {isUp ? "+" : ""}{selectedPair.change.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-right text-[10px]">
              <span className="text-slate-600 tracking-wider">BID</span>
              <span className="price-down font-mono font-black text-xs">{formatPrice(selectedPair.bid, selectedPair.symbol)}</span>
              <span className="text-slate-600 tracking-wider">ASK</span>
              <span className="price-up font-mono font-black text-xs">{formatPrice(selectedPair.ask, selectedPair.symbol)}</span>
              <span className="text-slate-600 tracking-wider">SPRD</span>
              <span className="text-cyan-400 font-mono text-xs">{(selectedPair.spread / pip).toFixed(1)}p</span>
            </div>
          </div>

          {/* OHLC row */}
          <div className="grid grid-cols-3 gap-1.5 text-[10px] text-center mb-3">
            {[
              { label: "OPEN", value: formatPrice(selectedPair.open, selectedPair.symbol), color: "text-slate-300" },
              { label: "HIGH", value: formatPrice(selectedPair.high, selectedPair.symbol), color: "text-emerald-400" },
              { label: "LOW",  value: formatPrice(selectedPair.low,  selectedPair.symbol), color: "text-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="panel-inset rounded-lg py-1.5" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-slate-600 mb-0.5 tracking-wider">{label}</p>
                <p className={`font-mono font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Timeframe selector */}
          <div className="flex gap-1 mb-3">
            {(["1M", "5M", "15M", "1H", "4H", "1D"] as TimeFrame[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className="flex-1 py-1 rounded-lg text-[10px] font-bold transition-all"
                style={timeframe === tf ? {
                  background: "rgba(34,211,238,0.12)",
                  color: "#22d3ee",
                  border: "1px solid rgba(34,211,238,0.3)",
                  boxShadow: "0 0 10px rgba(34,211,238,0.2)"
                } : {
                  color: "rgba(100,116,139,0.7)",
                  border: "1px solid transparent"
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="h-44 rounded-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.2)" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={selectedPair.history} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 8, fill: "#334155" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[chartMin, chartMax]} tick={{ fontSize: 8, fill: "#334155" }} tickLine={false} axisLine={false} tickFormatter={(v) => formatPrice(v, selectedPair.symbol)} width={52} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={isUp ? "#10b981" : "#ef4444"}
                  strokeWidth={2}
                  fill="url(#priceGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: isUp ? "#10b981" : "#ef4444", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Trade execution panel ────────────────────────────────────────── */}
      {selectedPair && (
        <div className="mx-3 mt-3 rounded-2xl p-3 glass-dark">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-cyan-400" style={{ filter: "drop-shadow(0 0 4px rgba(34,211,238,0.7))" }} /> Place Order
          </h3>

          {/* BUY / SELL toggle */}
          <div className="flex rounded-xl overflow-hidden mb-3" style={{ border: "1px solid rgba(255,255,255,0.08)", gap: "1px", background: "rgba(0,0,0,0.3)" }}>
            <button
              onClick={() => setDirection("BUY")}
              className="flex-1 py-2.5 text-sm font-black transition-all flex items-center justify-center gap-1.5"
              style={direction === "BUY" ? {
                background: "linear-gradient(135deg,#059669,#047857)",
                color: "white",
                boxShadow: "0 0 20px rgba(16,185,129,0.5), inset 0 1px 0 rgba(255,255,255,0.15)"
              } : { color: "rgba(100,116,139,0.7)" }}
            >
              <TrendingUp className="h-4 w-4" /> BUY
            </button>
            <button
              onClick={() => setDirection("SELL")}
              className="flex-1 py-2.5 text-sm font-black transition-all flex items-center justify-center gap-1.5"
              style={direction === "SELL" ? {
                background: "linear-gradient(135deg,#dc2626,#b91c1c)",
                color: "white",
                boxShadow: "0 0 20px rgba(239,68,68,0.5), inset 0 1px 0 rgba(255,255,255,0.15)"
              } : { color: "rgba(100,116,139,0.7)" }}
            >
              <TrendingDown className="h-4 w-4" /> SELL
            </button>
          </div>

          {/* Lot size + Leverage */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-[10px] text-slate-600 mb-1 block tracking-wider">Lot Size</label>
              <input
                type="number"
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                step="0.01" min="0.01" max="100"
                className="w-full rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none"
                style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.4)" }}
                placeholder="0.01"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-600 mb-1 block tracking-wider">Leverage</label>
              <select
                value={leverage}
                onChange={(e) => setLeverage(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none"
                style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.4)" }}
              >
                {["10", "25", "50", "100", "200", "500"].map((l) => (
                  <option key={l} value={l}>1:{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* SL / TP */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-[10px] text-slate-600 mb-1 block tracking-wider">Stop Loss</label>
              <input
                type="number"
                value={sl}
                onChange={(e) => setSl(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none"
                style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(239,68,68,0.15)", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.4)" }}
                placeholder={formatPrice(midPrice * (direction === "BUY" ? 0.999 : 1.001), selectedPair.symbol)}
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-600 mb-1 block tracking-wider">Take Profit</label>
              <input
                type="number"
                value={tp}
                onChange={(e) => setTp(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none"
                style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(16,185,129,0.15)", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.4)" }}
                placeholder={formatPrice(midPrice * (direction === "BUY" ? 1.001 : 0.999), selectedPair.symbol)}
              />
            </div>
          </div>

          {/* Margin info */}
          <div className="flex items-center justify-between text-[11px] rounded-xl px-3 py-2 mb-3 panel-inset" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <span className="text-slate-600 flex items-center gap-1"><DollarSign className="h-3 w-3" />Margin</span>
            <span className="text-cyan-400 font-mono font-black">${isNaN(estimatedMargin) ? "—" : estimatedMargin.toLocaleString()}</span>
            <span className="text-slate-600">Pip Val</span>
            <span className="text-cyan-400 font-mono font-black">${((parseFloat(lotSize) || 0.01) * 100000 * pip).toFixed(2)}</span>
          </div>

          {/* Execute button */}
          <button
            onClick={executeTrade}
            className="w-full py-3 rounded-xl font-black text-sm tracking-widest transition-all"
            style={direction === "BUY" ? {
              background: "linear-gradient(135deg,#059669,#047857)",
              color: "white",
              boxShadow: "0 4px 24px rgba(16,185,129,0.5), inset 0 1px 0 rgba(255,255,255,0.15)",
            } : {
              background: "linear-gradient(135deg,#dc2626,#b91c1c)",
              color: "white",
              boxShadow: "0 4px 24px rgba(239,68,68,0.5), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            {direction === "BUY" ? <TrendingUp className="h-4 w-4 inline mr-1.5" /> : <TrendingDown className="h-4 w-4 inline mr-1.5" />}
            {direction} {selectedPair.symbol} @ {formatPrice(direction === "BUY" ? selectedPair.ask : selectedPair.bid, selectedPair.symbol)}
          </button>
        </div>
      )}

      {/* ── Positions + History ─────────────────────────────────────────── */}
      <div className="mx-3 mt-3 rounded-2xl overflow-hidden glass-dark">
        {/* Tabs */}
        <div className="flex" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => setActivePanel("positions")}
            className="flex-1 py-2.5 text-xs font-black flex items-center justify-center gap-1.5 transition-all"
            style={activePanel === "positions" ? {
              color: "#22d3ee",
              borderBottom: "2px solid #22d3ee",
              background: "rgba(34,211,238,0.04)"
            } : { color: "rgba(100,116,139,0.6)" }}
          >
            <Layers className="h-3.5 w-3.5" /> Positions ({openTrades.length})
          </button>
          <button
            onClick={() => setActivePanel("history")}
            className="flex-1 py-2.5 text-xs font-black flex items-center justify-center gap-1.5 transition-all"
            style={activePanel === "history" ? {
              color: "#22d3ee",
              borderBottom: "2px solid #22d3ee",
              background: "rgba(34,211,238,0.04)"
            } : { color: "rgba(100,116,139,0.6)" }}
          >
            <History className="h-3.5 w-3.5" /> History ({closedTrades.length})
          </button>
        </div>

        {/* Open Positions */}
        {activePanel === "positions" && (
          <div>
            {openTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-700">
                <BarChart2 className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs tracking-wider">No open positions</p>
              </div>
            ) : (
              openTrades.map((trade) => (
                <div key={trade.id} className="p-3 flex items-center justify-between gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-black text-white">{trade.pair}</span>
                      <Badge
                        className="text-[9px] px-1.5 py-0 h-4 font-black"
                        style={trade.direction === "BUY"
                          ? { background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)", boxShadow: "0 0 6px rgba(16,185,129,0.15)" }
                          : { background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", boxShadow: "0 0 6px rgba(239,68,68,0.15)" }
                        }
                      >
                        {trade.direction}
                      </Badge>
                      <span className="text-[10px] text-slate-600">x{trade.leverage}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-600">
                      <span>{trade.lotSize} lot</span>
                      <span>@{formatPrice(trade.openPrice, trade.pair)}</span>
                      <span>{trade.openTime}</span>
                    </div>
                    {(trade.sl || trade.tp) && (
                      <div className="flex gap-2 mt-0.5 text-[10px]">
                        {trade.sl && <span className="text-red-500">SL {formatPrice(trade.sl, trade.pair)}</span>}
                        {trade.tp && <span className="text-emerald-500">TP {formatPrice(trade.tp, trade.pair)}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-sm font-black font-mono ${trade.pnl >= 0 ? "price-up" : "price-down"}`}>
                      {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-mono text-slate-600">
                      {formatPrice(trade.currentPrice, trade.pair)}
                    </span>
                    <button
                      onClick={() => closeTrade(trade.id)}
                      className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
                    >
                      <X className="h-3 w-3" /> Close
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Trade History */}
        {activePanel === "history" && (
          <div>
            {closedTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-700">
                <History className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs tracking-wider">No closed trades yet</p>
              </div>
            ) : (
              closedTrades.slice(0, 20).map((trade) => (
                <div key={trade.id} className="p-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-black text-white">{trade.pair}</span>
                      <Badge
                        className="text-[9px] px-1.5 py-0 h-4 font-black"
                        style={trade.direction === "BUY"
                          ? { background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" }
                          : { background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }
                        }
                      >
                        {trade.direction}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-slate-600">
                      {trade.lotSize} lot · {trade.openTime} → {trade.closeTime}
                    </div>
                    <div className="text-[10px] text-slate-700 font-mono">
                      {formatPrice(trade.openPrice, trade.pair)} → {formatPrice(trade.closePrice, trade.pair)}
                    </div>
                  </div>
                  <span className={`text-sm font-black font-mono ${trade.finalPnl >= 0 ? "price-up" : "price-down"}`}>
                    {trade.finalPnl >= 0 ? "+" : ""}${trade.finalPnl.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Watchlist - mini pair rows */}
      <div className="mx-3 mt-3 mb-4 rounded-2xl bg-slate-900 border border-slate-800 p-3">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Market Watch</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {pairs.map((p) => (
            <PairRow key={p.symbol} pair={p} selected={selectedPair?.symbol === p.symbol} onSelect={() => setSelectedPair(p)} />
          ))}
        </div>
      </div>

    </div>
  )
}
