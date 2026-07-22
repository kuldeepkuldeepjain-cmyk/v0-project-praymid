"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
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
  Zap,
  Target,
  ShieldAlert,
  CandlestickChart,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

// ─── Types ───────────────────────────────────────────────────────────────────

type Candle = {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

type ForexPair = {
  symbol: string
  base: string
  quote: string
  bid: number
  ask: number
  change: number
  high: number
  low: number
  open: number
  candles: Candle[]
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
  pips: number
  margin: number
}

type ClosedTrade = OpenTrade & {
  closePrice: number
  closeTime: string
  finalPnl: number
  closeReason: "manual" | "sl" | "tp"
}

type TimeFrame = "1M" | "5M" | "15M" | "1H" | "4H" | "1D"

// ─── Constants ───────────────────────────────────────────────────────────────

const PAIRS_CONFIG: { base: string; quote: string; symbol: string }[] = [
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
  "EUR/USD": 0.0002, "GBP/USD": 0.0003, "USD/JPY": 0.02,
  "USD/CHF": 0.0003, "AUD/USD": 0.0003, "USD/CAD": 0.0003,
  "NZD/USD": 0.0004, "EUR/GBP": 0.0003,
}

const CANDLE_COUNT = 80

const DEFAULTS: Record<string, number> = {
  "EUR/USD": 1.0842, "GBP/USD": 1.2731, "USD/JPY": 149.42,
  "USD/CHF": 0.9014, "AUD/USD": 0.6524, "USD/CAD": 1.3618,
  "NZD/USD": 0.6052, "EUR/GBP": 0.8552,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isJpy(sym: string): boolean { return sym.includes("JPY") }
function decimals(sym: string): number { return isJpy(sym) ? 3 : 5 }
function fmt(price: number, sym: string): string { return price.toFixed(decimals(sym)) }
function pip(sym: string): number { return isJpy(sym) ? 0.01 : 0.0001 }
function pips(diff: number, sym: string): number { return diff / pip(sym) }
function genId(): string { return Math.random().toString(36).slice(2, 10) }

function volatilityFor(mid: number): number {
  return mid > 50 ? 0.04 : 0.00012   // JPY vs others
}

// Generate a realistic candle using Geometric Brownian Motion + candle patterns
function generateCandle(prevClose: number, sym: string, bias: number = 0): Candle {
  const vol = volatilityFor(prevClose)
  const drift = bias * vol * 0.2
  const open = prevClose
  // GBM step
  const bodySize = vol * prevClose * (0.3 + Math.random() * 1.2)
  const direction = Math.random() < 0.5 + drift ? 1 : -1
  const close = open + direction * bodySize
  // Wicks: high/low extend beyond body
  const upperWick = bodySize * (0.2 + Math.random() * 0.8)
  const lowerWick = bodySize * (0.2 + Math.random() * 0.8)
  const high = Math.max(open, close) + upperWick
  const low = Math.min(open, close) - lowerWick
  const volume = Math.floor(200 + Math.random() * 1800)
  return {
    time: "",
    open: parseFloat(open.toFixed(decimals(sym))),
    high: parseFloat(high.toFixed(decimals(sym))),
    low: parseFloat(low.toFixed(decimals(sym))),
    close: parseFloat(close.toFixed(decimals(sym))),
    volume,
  }
}

function buildInitialCandles(sym: string): Candle[] {
  const now = Date.now()
  const msPerCandle = 60000 // treat each as 1 min candle for speed
  const mid = DEFAULTS[sym] ?? 1.0
  const candles: Candle[] = []
  let price = mid * (1 - (Math.random() - 0.5) * 0.004)
  for (let i = CANDLE_COUNT; i >= 0; i--) {
    const c = generateCandle(price, sym)
    const t = new Date(now - i * msPerCandle)
    c.time = t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    candles.push(c)
    price = c.close
  }
  return candles
}

function calcPnl(trade: OpenTrade, currentPrice: number, sym: string): { pnl: number; pips: number } {
  const dir = trade.direction === "BUY" ? 1 : -1
  const diff = (currentPrice - trade.openPrice) * dir
  const pipVal = trade.lotSize * 100000 * pip(sym)
  const rawPips = pips(Math.abs(diff), sym) * Math.sign(diff)
  return {
    pnl: parseFloat((rawPips * pipVal).toFixed(2)),
    pips: parseFloat(rawPips.toFixed(1)),
  }
}

// ─── Candlestick Chart Component ─────────────────────────────────────────────

function CandlestickChartSVG({
  candles,
  sym,
  openTrades,
}: {
  candles: Candle[]
  sym: string
  openTrades: OpenTrade[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 340, h: 200 })
  const [hovered, setHovered] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; candle: Candle } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        setSize({ w: containerRef.current.offsetWidth, h: containerRef.current.offsetHeight })
      }
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const visible = candles.slice(-60)
  const { w, h } = size
  const padL = 54, padR = 8, padT = 12, padB = 22
  const chartW = w - padL - padR
  const chartH = h - padT - padB

  const allHigh = Math.max(...visible.map((c) => c.high))
  const allLow = Math.min(...visible.map((c) => c.low))
  const priceRange = allHigh - allLow || 0.001
  const candleW = Math.max(2, chartW / visible.length - 1)

  function toY(price: number): number {
    return padT + ((allHigh - price) / priceRange) * chartH
  }
  function toX(i: number): number {
    return padL + (i + 0.5) * (chartW / visible.length)
  }

  // Price grid lines
  const gridPrices: number[] = []
  const step = priceRange / 5
  for (let i = 0; i <= 5; i++) gridPrices.push(allLow + step * i)

  const hovCandle = hovered !== null ? visible[hovered] : null

  return (
    <div ref={containerRef} className="relative w-full h-full" style={{ cursor: "crosshair" }}>
      <svg
        width={w}
        height={h}
        onMouseLeave={() => { setHovered(null); setTooltip(null) }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const mx = e.clientX - rect.left
          const colW = chartW / visible.length
          const idx = Math.floor((mx - padL) / colW)
          if (idx >= 0 && idx < visible.length) {
            setHovered(idx)
            setTooltip({ x: mx, y: e.clientY - rect.top, candle: visible[idx] })
          } else {
            setHovered(null); setTooltip(null)
          }
        }}
      >
        {/* Background */}
        <rect x={0} y={0} width={w} height={h} fill="rgba(0,0,0,0.0)" />

        {/* Grid lines */}
        {gridPrices.map((p, i) => (
          <g key={i}>
            <line
              x1={padL} x2={w - padR}
              y1={toY(p)} y2={toY(p)}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={1}
            />
            <text
              x={padL - 4} y={toY(p) + 3}
              fill="rgba(100,116,139,0.7)"
              fontSize={8}
              textAnchor="end"
              fontFamily="monospace"
            >
              {fmt(p, sym)}
            </text>
          </g>
        ))}

        {/* SL/TP lines from open trades */}
        {openTrades.map((t) => (
          <g key={t.id}>
            {t.sl && (
              <g>
                <line x1={padL} x2={w - padR} y1={toY(t.sl)} y2={toY(t.sl)} stroke="#f87171" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
                <text x={padL + 2} y={toY(t.sl) - 2} fill="#f87171" fontSize={7} fontFamily="monospace" opacity={0.9}>SL</text>
              </g>
            )}
            {t.tp && (
              <g>
                <line x1={padL} x2={w - padR} y1={toY(t.tp)} y2={toY(t.tp)} stroke="#34d399" strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
                <text x={padL + 2} y={toY(t.tp) - 2} fill="#34d399" fontSize={7} fontFamily="monospace" opacity={0.9}>TP</text>
              </g>
            )}
            {/* Open price line */}
            <line
              x1={padL} x2={w - padR}
              y1={toY(t.openPrice)} y2={toY(t.openPrice)}
              stroke={t.direction === "BUY" ? "#34d399" : "#f87171"}
              strokeWidth={1} strokeDasharray="6 2" opacity={0.5}
            />
          </g>
        ))}

        {/* Candles */}
        {visible.map((c, i) => {
          const x = toX(i)
          const isGreen = c.close >= c.open
          const bodyTop = toY(Math.max(c.open, c.close))
          const bodyBot = toY(Math.min(c.open, c.close))
          const bodyH = Math.max(1, bodyBot - bodyTop)
          const isHov = hovered === i
          const color = isGreen ? "#22c55e" : "#ef4444"
          const fill = isGreen ? "rgba(34,197,94,0.85)" : "rgba(239,68,68,0.85)"
          const wickFill = isGreen ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)"

          return (
            <g key={i}>
              {/* Upper wick */}
              <line
                x1={x} x2={x}
                y1={toY(c.high)} y2={bodyTop}
                stroke={isHov ? color : wickFill}
                strokeWidth={isHov ? 1.5 : 1}
              />
              {/* Lower wick */}
              <line
                x1={x} x2={x}
                y1={bodyBot} y2={toY(c.low)}
                stroke={isHov ? color : wickFill}
                strokeWidth={isHov ? 1.5 : 1}
              />
              {/* Body */}
              <rect
                x={x - candleW / 2}
                y={bodyTop}
                width={candleW}
                height={bodyH}
                fill={isHov ? color : fill}
                rx={candleW > 4 ? 1 : 0}
                style={{ filter: isHov ? `drop-shadow(0 0 3px ${color})` : undefined }}
              />
            </g>
          )
        })}

        {/* Current price line */}
        {visible.length > 0 && (
          <g>
            <line
              x1={padL} x2={w - padR}
              y1={toY(visible[visible.length - 1].close)} y2={toY(visible[visible.length - 1].close)}
              stroke="#22d3ee" strokeWidth={1} strokeDasharray="3 2" opacity={0.8}
            />
            <rect x={w - padR - 50} y={toY(visible[visible.length - 1].close) - 7} width={50} height={13} rx={3}
              fill="rgba(34,211,238,0.2)" stroke="rgba(34,211,238,0.5)" strokeWidth={0.5}
            />
            <text
              x={w - padR - 4} y={toY(visible[visible.length - 1].close) + 3.5}
              fill="#22d3ee" fontSize={8} textAnchor="end" fontFamily="monospace" fontWeight="bold"
            >
              {fmt(visible[visible.length - 1].close, sym)}
            </text>
          </g>
        )}

        {/* Crosshair vertical */}
        {hovered !== null && (
          <line
            x1={toX(hovered)} x2={toX(hovered)}
            y1={padT} y2={h - padB}
            stroke="rgba(34,211,238,0.3)"
            strokeWidth={1}
            strokeDasharray="3 2"
          />
        )}

        {/* X-axis time labels */}
        {visible.map((c, i) => {
          if (i % Math.ceil(visible.length / 6) !== 0) return null
          return (
            <text key={i} x={toX(i)} y={h - 6} fill="rgba(100,116,139,0.6)" fontSize={7}
              textAnchor="middle" fontFamily="monospace"
            >
              {c.time}
            </text>
          )
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && hovCandle && (
        <div
          className="absolute pointer-events-none z-20 rounded-xl text-[10px] font-mono"
          style={{
            left: tooltip.x > w * 0.6 ? tooltip.x - 120 : tooltip.x + 8,
            top: Math.max(8, tooltip.y - 60),
            background: "rgba(3,7,18,0.95)",
            border: "1px solid rgba(34,211,238,0.25)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
            padding: "8px 10px",
            minWidth: 110,
          }}
        >
          <p className="text-cyan-400 mb-1 font-bold">{hovCandle.time}</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <span className="text-slate-500">O</span><span className="text-white">{fmt(hovCandle.open, sym)}</span>
            <span className="text-emerald-400">H</span><span className="text-emerald-400">{fmt(hovCandle.high, sym)}</span>
            <span className="text-red-400">L</span><span className="text-red-400">{fmt(hovCandle.low, sym)}</span>
            <span className="text-slate-300">C</span><span className={hovCandle.close >= hovCandle.open ? "text-emerald-400" : "text-red-400"}>{fmt(hovCandle.close, sym)}</span>
            <span className="text-slate-500">Vol</span><span className="text-slate-400">{hovCandle.volume}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Volume Bar Chart ────────────────────────────────────────────────────────

function VolumeBar({ candles }: { candles: Candle[] }) {
  const visible = candles.slice(-60)
  const maxVol = Math.max(...visible.map((c) => c.volume), 1)
  return (
    <div className="flex items-end gap-[1px] w-full h-full">
      {visible.map((c, i) => {
        const heightPct = (c.volume / maxVol) * 100
        const isGreen = c.close >= c.open
        return (
          <div
            key={i}
            className="flex-1 rounded-t-[1px] transition-all"
            style={{
              height: `${heightPct}%`,
              background: isGreen ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)",
              minWidth: 1,
            }}
          />
        )
      })}
    </div>
  )
}

// ─── Order Depth Panel ───────────────────────────────────────────────────────

function OrderDepth({ pair }: { pair: ForexPair }) {
  // Simulate depth levels
  const levels = useMemo(() => {
    const asks: { price: number; volume: number }[] = []
    const bids: { price: number; volume: number }[] = []
    for (let i = 0; i < 6; i++) {
      const pSize = pip(pair.symbol)
      asks.push({ price: parseFloat((pair.ask + pSize * i * (1 + Math.random())).toFixed(decimals(pair.symbol))), volume: Math.floor(100 + Math.random() * 900) })
      bids.push({ price: parseFloat((pair.bid - pSize * i * (1 + Math.random())).toFixed(decimals(pair.symbol))), volume: Math.floor(100 + Math.random() * 900) })
    }
    asks.reverse()
    return { asks, bids }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair.bid, pair.ask])

  const maxVol = Math.max(...levels.asks.map((a) => a.volume), ...levels.bids.map((b) => b.volume))

  return (
    <div className="rounded-2xl overflow-hidden glass-dark">
      <div className="px-3 py-2 text-[10px] font-black text-slate-500 tracking-widest uppercase flex items-center gap-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Layers className="h-3 w-3 text-cyan-400" /> Order Depth
      </div>
      {/* Asks */}
      <div className="px-2 pt-1.5 pb-0">
        {levels.asks.map((a, i) => (
          <div key={i} className="flex items-center gap-2 py-[3px] relative">
            <div className="absolute inset-y-0 right-0 rounded-sm" style={{ width: `${(a.volume / maxVol) * 100}%`, background: "rgba(239,68,68,0.08)" }} />
            <span className="text-red-400 font-mono text-[10px] w-16 shrink-0">{fmt(a.price, pair.symbol)}</span>
            <span className="text-slate-500 font-mono text-[10px] text-right flex-1">{a.volume}</span>
          </div>
        ))}
      </div>
      {/* Spread mid */}
      <div className="flex items-center justify-center gap-2 py-1.5 my-0.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(34,211,238,0.04)" }}>
        <span className="text-cyan-400 font-black font-mono text-xs">{fmt((pair.bid + pair.ask) / 2, pair.symbol)}</span>
        <span className="text-slate-600 text-[9px]">spread {(pips(pair.spread, pair.symbol)).toFixed(1)}p</span>
      </div>
      {/* Bids */}
      <div className="px-2 pb-1.5 pt-0">
        {levels.bids.map((b, i) => (
          <div key={i} className="flex items-center gap-2 py-[3px] relative">
            <div className="absolute inset-y-0 right-0 rounded-sm" style={{ width: `${(b.volume / maxVol) * 100}%`, background: "rgba(34,197,94,0.08)" }} />
            <span className="text-emerald-400 font-mono text-[10px] w-16 shrink-0">{fmt(b.price, pair.symbol)}</span>
            <span className="text-slate-500 font-mono text-[10px] text-right flex-1">{b.volume}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Custom Tooltip (unused but kept) ────────────────────────────────────────

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
  const [timeframe, setTimeframe] = useState<TimeFrame>("5M")
  const [direction, setDirection] = useState<TradeDirection>("BUY")
  const [lotSize, setLotSize] = useState("0.01")
  const [leverage, setLeverage] = useState("100")
  const [sl, setSl] = useState("")
  const [tp, setTp] = useState("")
  const [openTrades, setOpenTrades] = useState<OpenTrade[]>([])
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([])
  const [activePanel, setActivePanel] = useState<"positions" | "history" | "depth">("positions")
  const [loading, setLoading] = useState(true)
  const [online, setOnline] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [tradeMsg, setTradeMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [totalPnl, setTotalPnl] = useState(0)
  const [tickCount, setTickCount] = useState(0)
  const [chartType, setChartType] = useState<"candle" | "line">("candle")

  const ratesRef = useRef<Record<string, number>>({})
  const pairsRef = useRef<ForexPair[]>([])
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const candleTickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const apiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Init pairs with synthetic data ─────────────────────────────────────────
  useEffect(() => {
    const initialPairs: ForexPair[] = PAIRS_CONFIG.map((p) => {
      const mid = DEFAULTS[p.symbol] ?? 1.0
      const spread = TYPICAL_SPREADS[p.symbol] ?? 0.0002
      const candles = buildInitialCandles(p.symbol)
      return {
        symbol: p.symbol, base: p.base, quote: p.quote,
        bid: parseFloat((mid - spread / 2).toFixed(decimals(p.symbol))),
        ask: parseFloat((mid + spread / 2).toFixed(decimals(p.symbol))),
        change: parseFloat(((Math.random() - 0.5) * 0.6).toFixed(2)),
        high: parseFloat((mid * 1.003).toFixed(decimals(p.symbol))),
        low: parseFloat((mid * 0.997).toFixed(decimals(p.symbol))),
        open: parseFloat(mid.toFixed(decimals(p.symbol))),
        spread: spread,
        candles,
      }
    })
    setPairs(initialPairs)
    pairsRef.current = initialPairs
    setSelectedPair(initialPairs[0])
    setLoading(false)
    setLastUpdated(new Date())
    // Store initial rates
    initialPairs.forEach((p) => { ratesRef.current[p.symbol] = (p.bid + p.ask) / 2 })
  }, [])

  // ── Tick engine: update prices every 1.5s ─────────────────────────────────
  useEffect(() => {
    if (pairsRef.current.length === 0) return
    tickRef.current = setInterval(() => {
      setPairs((prev) => {
        const updated = prev.map((p) => {
          const spread = TYPICAL_SPREADS[p.symbol] ?? 0.0002
          const vol = volatilityFor((p.bid + p.ask) / 2)
          const midNow = (p.bid + p.ask) / 2
          const tick = (Math.random() - 0.5) * 2 * vol * midNow
          const newMid = midNow + tick
          const newBid = parseFloat((newMid - spread / 2).toFixed(decimals(p.symbol)))
          const newAsk = parseFloat((newMid + spread / 2).toFixed(decimals(p.symbol)))
          const newHigh = Math.max(p.high, newAsk)
          const newLow = Math.min(p.low, newBid)
          const change = parseFloat((((newMid - p.open) / p.open) * 100).toFixed(2))
          ratesRef.current[p.symbol] = newMid

          // Update last candle's close/high/low (live candle)
          const newCandles = [...p.candles]
          if (newCandles.length > 0) {
            const last = { ...newCandles[newCandles.length - 1] }
            last.close = parseFloat(newMid.toFixed(decimals(p.symbol)))
            last.high = Math.max(last.high, parseFloat(newMid.toFixed(decimals(p.symbol))))
            last.low = Math.min(last.low, parseFloat(newMid.toFixed(decimals(p.symbol))))
            newCandles[newCandles.length - 1] = last
          }

          return { ...p, bid: newBid, ask: newAsk, high: newHigh, low: newLow, change, candles: newCandles }
        })
        pairsRef.current = updated
        return updated
      })

      setSelectedPair((prev) => {
        if (!prev) return prev
        return pairsRef.current.find((p) => p.symbol === prev.symbol) ?? prev
      })
      setLastUpdated(new Date())
      setTickCount((n) => n + 1)
    }, 1500)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [loading])

  // ── Candle engine: add new candle every 15s ──────────────────────────────
  useEffect(() => {
    if (pairsRef.current.length === 0) return
    candleTickRef.current = setInterval(() => {
      setPairs((prev) => {
        const updated = prev.map((p) => {
          const lastClose = p.candles.length > 0 ? p.candles[p.candles.length - 1].close : DEFAULTS[p.symbol] ?? 1.0
          const newCandle = generateCandle(lastClose, p.symbol)
          newCandle.time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
          const newCandles = [...p.candles.slice(-CANDLE_COUNT + 1), newCandle]
          return { ...p, candles: newCandles }
        })
        pairsRef.current = updated
        return updated
      })
      setSelectedPair((prev) => {
        if (!prev) return prev
        return pairsRef.current.find((p) => p.symbol === prev.symbol) ?? prev
      })
    }, 15000)
    return () => { if (candleTickRef.current) clearInterval(candleTickRef.current) }
  }, [loading])

  // ── Try to fetch real rates every 60s ─────────────────────────────────────
  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      const usdRates = data.rates as Record<string, number>

      setPairs((prev) => prev.map((p) => {
        let mid: number
        if (p.base === "USD") mid = usdRates[p.quote] ?? (p.bid + p.ask) / 2
        else if (p.quote === "USD") mid = usdRates[p.base] ? 1 / usdRates[p.base] : (p.bid + p.ask) / 2
        else mid = (usdRates[p.quote] ?? 1) / (usdRates[p.base] ?? 1)
        const spread = TYPICAL_SPREADS[p.symbol] ?? 0.0002
        const noise = (Math.random() - 0.5) * spread * 0.4
        const nMid = mid + noise
        ratesRef.current[p.symbol] = nMid
        return {
          ...p,
          bid: parseFloat((nMid - spread / 2).toFixed(decimals(p.symbol))),
          ask: parseFloat((nMid + spread / 2).toFixed(decimals(p.symbol))),
        }
      }))
      setOnline(true)
    } catch {
      setOnline(false)
    }
  }, [])

  useEffect(() => {
    fetchRates()
    apiIntervalRef.current = setInterval(fetchRates, 60000)
    return () => { if (apiIntervalRef.current) clearInterval(apiIntervalRef.current) }
  }, [fetchRates])

  // ── P&L + SL/TP engine ─────────────────────────────────────────────────────
  useEffect(() => {
    if (openTrades.length === 0) return
    const toClose: { id: string; reason: "sl" | "tp"; price: number }[] = []

    const updated = openTrades.map((t) => {
      const pairNow = pairsRef.current.find((p) => p.symbol === t.pair)
      if (!pairNow) return t
      const currentPrice = t.direction === "BUY" ? pairNow.bid : pairNow.ask
      const { pnl, pips: pipCount } = calcPnl(t, currentPrice, t.pair)
      // SL check
      if (t.sl) {
        if ((t.direction === "BUY" && currentPrice <= t.sl) || (t.direction === "SELL" && currentPrice >= t.sl)) {
          toClose.push({ id: t.id, reason: "sl", price: t.sl })
        }
      }
      // TP check
      if (t.tp) {
        if ((t.direction === "BUY" && currentPrice >= t.tp) || (t.direction === "SELL" && currentPrice <= t.tp)) {
          toClose.push({ id: t.id, reason: "tp", price: t.tp })
        }
      }
      return { ...t, currentPrice, pnl, pips: pipCount }
    })

    if (toClose.length > 0) {
      toClose.forEach(({ id, reason, price }) => {
        setOpenTrades((prev) => {
          const trade = prev.find((t) => t.id === id)
          if (!trade) return prev
          const { pnl: finalPnl } = calcPnl(trade, price, trade.pair)
          const closed: ClosedTrade = {
            ...trade, closePrice: price,
            closeTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            finalPnl, closeReason: reason,
          }
          setClosedTrades((c) => [closed, ...c.slice(0, 49)])
          showMsg(
            reason === "tp" ? "success" : "error",
            `${reason.toUpperCase()} hit: ${trade.pair} ${trade.direction} — P&L: $${finalPnl.toFixed(2)}`
          )
          return prev.filter((t) => t.id !== id)
        })
      })
    } else {
      setOpenTrades(updated)
    }

    setTotalPnl(updated.reduce((s, t) => s + t.pnl, 0))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickCount])

  // ── Persist trades ──────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`forex_v2_${participantEmail}`)
      if (saved) {
        const { open, closed } = JSON.parse(saved)
        setOpenTrades(open ?? [])
        setClosedTrades(closed ?? [])
      }
    } catch {}
  }, [participantEmail])

  useEffect(() => {
    try {
      localStorage.setItem(`forex_v2_${participantEmail}`, JSON.stringify({ open: openTrades, closed: closedTrades }))
    } catch {}
  }, [openTrades, closedTrades, participantEmail])

  // ── Execute trade ───────────────────────────────────────────────────────────
  const executeTrade = () => {
    if (!selectedPair) return
    const lot = parseFloat(lotSize)
    const lev = parseFloat(leverage)
    if (isNaN(lot) || lot <= 0 || lot > 100) { showMsg("error", "Lot size: 0.01 – 100"); return }
    if (isNaN(lev) || lev < 1) { showMsg("error", "Invalid leverage"); return }

    const price = direction === "BUY" ? selectedPair.ask : selectedPair.bid
    const margin = parseFloat(((lot * 100000 * price) / lev).toFixed(2))
    const slNum = sl ? parseFloat(sl) : null
    const tpNum = tp ? parseFloat(tp) : null

    // Validate SL/TP
    if (slNum && direction === "BUY" && slNum >= price) { showMsg("error", "SL must be below entry for BUY"); return }
    if (slNum && direction === "SELL" && slNum <= price) { showMsg("error", "SL must be above entry for SELL"); return }
    if (tpNum && direction === "BUY" && tpNum <= price) { showMsg("error", "TP must be above entry for BUY"); return }
    if (tpNum && direction === "SELL" && tpNum >= price) { showMsg("error", "TP must be below entry for SELL"); return }

    const trade: OpenTrade = {
      id: genId(), pair: selectedPair.symbol, direction,
      lotSize: lot, leverage: lev, openPrice: price, currentPrice: price,
      sl: slNum, tp: tpNum,
      openTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      pnl: 0, pips: 0, margin,
    }
    setOpenTrades((prev) => [trade, ...prev])
    showMsg("success", `${direction} ${lot}L ${selectedPair.symbol} @ ${fmt(price, selectedPair.symbol)}`)
    setSl(""); setTp("")
    setActivePanel("positions")
  }

  // ── Quick trade (one-click) ─────────────────────────────────────────────────
  const quickTrade = (dir: TradeDirection) => {
    if (!selectedPair) return
    const lot = parseFloat(lotSize) || 0.01
    const lev = parseFloat(leverage) || 100
    const price = dir === "BUY" ? selectedPair.ask : selectedPair.bid
    const margin = parseFloat(((lot * 100000 * price) / lev).toFixed(2))
    const trade: OpenTrade = {
      id: genId(), pair: selectedPair.symbol, direction: dir,
      lotSize: lot, leverage: lev, openPrice: price, currentPrice: price,
      sl: null, tp: null,
      openTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      pnl: 0, pips: 0, margin,
    }
    setOpenTrades((prev) => [trade, ...prev])
    showMsg("success", `Quick ${dir}: ${lot}L ${selectedPair.symbol} @ ${fmt(price, selectedPair.symbol)}`)
    setActivePanel("positions")
  }

  const closeTrade = (id: string) => {
    setOpenTrades((prev) => {
      const trade = prev.find((t) => t.id === id)
      if (!trade) return prev
      const closed: ClosedTrade = {
        ...trade, closePrice: trade.currentPrice,
        closeTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        finalPnl: trade.pnl, closeReason: "manual",
      }
      setClosedTrades((c) => [closed, ...c.slice(0, 49)])
      showMsg(trade.pnl >= 0 ? "success" : "error", `Closed ${trade.pair} — P&L: $${trade.pnl.toFixed(2)}`)
      return prev.filter((t) => t.id !== id)
    })
  }

  const showMsg = (type: "success" | "error", text: string) => {
    setTradeMsg({ type, text })
    setTimeout(() => setTradeMsg(null), 4000)
  }

  const midPrice = selectedPair ? (selectedPair.bid + selectedPair.ask) / 2 : 0
  const estimatedMargin = selectedPair
    ? parseFloat(((parseFloat(lotSize) || 0.01) * 100000 * midPrice / (parseFloat(leverage) || 100)).toFixed(2))
    : 0
  const pipValue = selectedPair ? ((parseFloat(lotSize) || 0.01) * 100000 * pip(selectedPair.symbol)) : 0
  const isUp = selectedPair ? selectedPair.change >= 0 : true
  const lastCandle = selectedPair?.candles?.slice(-1)[0]

  return (
    <div className="flex flex-col h-full min-h-screen text-white pb-20 forex-deep-bg">

      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-3 py-2.5 sticky top-0 z-30"
        style={{
          background: "rgba(3,7,18,0.92)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(34,211,238,0.1)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.6)"
        }}
      >
        <div className="flex items-center gap-2">
          <CandlestickChart className="h-4 w-4 text-cyan-400" style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,0.7))" }} />
          <span className="text-sm font-black text-white tracking-widest">FOREX PRO</span>
          <Badge
            className="text-[9px] px-1.5 py-0 h-4 font-bold"
            style={online
              ? { background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)", boxShadow: "0 0 8px rgba(16,185,129,0.25)" }
              : { background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }
            }
          >
            {online ? <><Wifi className="h-2.5 w-2.5 mr-0.5 inline" />LIVE</> : <><WifiOff className="h-2.5 w-2.5 mr-0.5 inline" />SIM</>}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          {lastUpdated && (
            <span className="text-[10px] text-slate-600 font-mono">
              <Clock className="h-2.5 w-2.5 inline mr-0.5" />
              {lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => setChartType((c) => c === "candle" ? "line" : "candle")}
            className="p-1.5 rounded-lg transition-colors text-[10px] font-black"
            style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)", color: "#a78bfa" }}
          >
            {chartType === "candle" ? "LINE" : "CANDLE"}
          </button>
          <button onClick={fetchRates} className="p-1.5 rounded-lg transition-colors" style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.15)" }}>
            <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* ── Trade notification ────────────────────────────────────────────────── */}
      {tradeMsg && (
        <div
          className="mx-3 mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
          style={tradeMsg.type === "success"
            ? { background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399", boxShadow: "0 0 20px rgba(16,185,129,0.12)" }
            : { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", boxShadow: "0 0 20px rgba(239,68,68,0.12)" }
          }
        >
          {tradeMsg.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          {tradeMsg.text}
        </div>
      )}

      {/* ── Summary bar ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 mx-3 mt-2 rounded-2xl overflow-hidden text-center text-[11px]"
        style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.05)", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.4)" }}
      >
        {[
          { label: "Positions", value: String(openTrades.length), color: "#22d3ee" },
          { label: "Live P&L", value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? "#34d399" : "#f87171" },
          { label: "Closed", value: String(closedTrades.length), color: "#a78bfa" },
          { label: "Margin", value: `$${openTrades.reduce((s, t) => s + t.margin, 0).toFixed(0)}`, color: "#fb923c" },
        ].map((item, i) => (
          <div key={i} className="px-1 py-2.5" style={{ borderRight: i < 3 ? "1px solid rgba(255,255,255,0.05)" : undefined }}>
            <p className="text-slate-600 mb-0.5 text-[9px] uppercase tracking-wider">{item.label}</p>
            <p className="font-black" style={{ color: item.color, textShadow: `0 0 8px ${item.color}60` }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* ── Pair selector ────────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 px-3 mt-3 overflow-x-auto pb-1 scrollbar-none flex-nowrap">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 w-20 rounded-lg animate-pulse shrink-0" style={{ background: "rgba(255,255,255,0.05)" }} />
            ))
          : pairs.map((p) => {
              const up = p.change >= 0
              return (
                <button
                  key={p.symbol}
                  onClick={() => setSelectedPair(p)}
                  className="shrink-0 flex flex-col items-center px-2.5 py-1 rounded-xl text-[10px] font-black transition-all"
                  style={selectedPair?.symbol === p.symbol ? {
                    background: "linear-gradient(135deg,rgba(34,211,238,0.2),rgba(34,211,238,0.08))",
                    color: "#22d3ee",
                    border: "1px solid rgba(34,211,238,0.35)",
                    boxShadow: "0 0 12px rgba(34,211,238,0.2), inset 0 1px 0 rgba(255,255,255,0.08)"
                  } : {
                    background: "rgba(255,255,255,0.03)",
                    color: "#94a3b8",
                    border: "1px solid rgba(255,255,255,0.06)"
                  }}
                >
                  <span>{p.symbol}</span>
                  <span style={{ color: up ? "#34d399" : "#f87171", fontSize: 9 }}>{up ? "+" : ""}{p.change.toFixed(2)}%</span>
                </button>
              )
            })}
      </div>

      {/* ── Selected pair header ──────────────────────────────────────────────── */}
      {selectedPair && (
        <div className="mx-3 mt-3 rounded-2xl p-3 relative overflow-hidden glass-dark">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none" style={{
            background: `radial-gradient(circle, ${isUp ? "rgba(16,185,129,0.18)" : "rgba(239,68,68,0.18)"} 0%, transparent 70%)`,
            filter: "blur(24px)", transform: "translate(40%,-40%)"
          }} />

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-sm font-black text-white tracking-widest">{selectedPair.symbol}</h2>
                <span className="text-[9px] text-slate-600 tracking-widest font-bold uppercase">{timeframe}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono" style={{
                  color: isUp ? "#34d399" : "#f87171",
                  textShadow: `0 0 30px ${isUp ? "rgba(52,211,153,0.4)" : "rgba(248,113,113,0.4)"}`
                }}>
                  {fmt(midPrice, selectedPair.symbol)}
                </span>
                <span className={`flex items-center gap-0.5 text-xs font-black ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                  {isUp ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {isUp ? "+" : ""}{selectedPair.change.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-right">
              <span className="text-slate-600">BID</span>
              <span className="text-red-400 font-mono font-black">{fmt(selectedPair.bid, selectedPair.symbol)}</span>
              <span className="text-slate-600">ASK</span>
              <span className="text-emerald-400 font-mono font-black">{fmt(selectedPair.ask, selectedPair.symbol)}</span>
              <span className="text-slate-600">SPREAD</span>
              <span className="text-cyan-400 font-mono">{pips(selectedPair.spread, selectedPair.symbol).toFixed(1)}p</span>
              <span className="text-slate-600">HIGH</span>
              <span className="text-emerald-400 font-mono">{fmt(selectedPair.high, selectedPair.symbol)}</span>
              <span className="text-slate-600">LOW</span>
              <span className="text-red-400 font-mono">{fmt(selectedPair.low, selectedPair.symbol)}</span>
            </div>
          </div>

          {/* Last candle OHLC strip */}
          {lastCandle && (
            <div className="flex items-center gap-2 mt-2 px-2 py-1.5 rounded-lg text-[10px] font-mono"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <span className="text-slate-600">O</span><span className="text-slate-300">{fmt(lastCandle.open, selectedPair.symbol)}</span>
              <span className="text-emerald-500">H</span><span className="text-emerald-400">{fmt(lastCandle.high, selectedPair.symbol)}</span>
              <span className="text-red-500">L</span><span className="text-red-400">{fmt(lastCandle.low, selectedPair.symbol)}</span>
              <span className="text-cyan-500">C</span><span className={lastCandle.close >= lastCandle.open ? "text-emerald-400" : "text-red-400"}>{fmt(lastCandle.close, selectedPair.symbol)}</span>
              <span className="text-slate-600 ml-auto">Vol</span><span className="text-slate-500">{lastCandle.volume}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Chart ────────────────────────────────────────────────────────────── */}
      {selectedPair && (
        <div className="mx-3 mt-2 rounded-2xl overflow-hidden glass-dark" style={{ height: 260 }}>
          {/* Timeframe bar */}
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <div className="flex gap-1">
              {(["1M", "5M", "15M", "1H", "4H", "1D"] as TimeFrame[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className="px-2 py-0.5 rounded text-[9px] font-black transition-all"
                  style={timeframe === tf ? {
                    background: "rgba(34,211,238,0.15)",
                    color: "#22d3ee",
                    border: "1px solid rgba(34,211,238,0.3)",
                  } : {
                    color: "rgba(100,116,139,0.6)",
                    border: "1px solid transparent"
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>
            <span className="text-[9px] text-slate-600 font-mono">{selectedPair.candles.length} bars</span>
          </div>

          {/* Main candlestick area */}
          <div style={{ height: 190, padding: "0 0 0 0" }}>
            <CandlestickChartSVG
              candles={selectedPair.candles}
              sym={selectedPair.symbol}
              openTrades={openTrades.filter((t) => t.pair === selectedPair.symbol)}
            />
          </div>

          {/* Volume strip */}
          <div className="px-3 pb-2" style={{ height: 32 }}>
            <VolumeBar candles={selectedPair.candles} />
          </div>
        </div>
      )}

      {/* ── Quick Trade Buttons ───────────────────────────────────────────────── */}
      {selectedPair && (
        <div className="mx-3 mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => quickTrade("BUY")}
            className="flex flex-col items-center py-3 rounded-2xl font-black text-white transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg,#059669,#047857)",
              boxShadow: "0 4px 24px rgba(16,185,129,0.45), inset 0 1px 0 rgba(255,255,255,0.12)"
            }}
          >
            <div className="flex items-center gap-1.5 text-sm">
              <TrendingUp className="h-4 w-4" /> BUY
            </div>
            <span className="text-[10px] opacity-80 font-mono mt-0.5">{fmt(selectedPair.ask, selectedPair.symbol)}</span>
          </button>
          <button
            onClick={() => quickTrade("SELL")}
            className="flex flex-col items-center py-3 rounded-2xl font-black text-white transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg,#dc2626,#b91c1c)",
              boxShadow: "0 4px 24px rgba(239,68,68,0.45), inset 0 1px 0 rgba(255,255,255,0.12)"
            }}
          >
            <div className="flex items-center gap-1.5 text-sm">
              <TrendingDown className="h-4 w-4" /> SELL
            </div>
            <span className="text-[10px] opacity-80 font-mono mt-0.5">{fmt(selectedPair.bid, selectedPair.symbol)}</span>
          </button>
        </div>
      )}

      {/* ── Advanced Order Panel ──────────────────────────────────────────────── */}
      {selectedPair && (
        <div className="mx-3 mt-2 rounded-2xl p-3 glass-dark">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
            <Activity className="h-3 w-3 text-cyan-400" style={{ filter: "drop-shadow(0 0 4px rgba(34,211,238,0.7))" }} />
            Advanced Order
          </h3>

          {/* BUY / SELL direction */}
          <div className="flex rounded-xl overflow-hidden mb-3"
            style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.3)" }}
          >
            {(["BUY", "SELL"] as TradeDirection[]).map((d) => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                className="flex-1 py-2.5 text-sm font-black flex items-center justify-center gap-1.5 transition-all"
                style={direction === d
                  ? d === "BUY"
                    ? { background: "linear-gradient(135deg,#059669,#047857)", color: "white", boxShadow: "0 0 20px rgba(16,185,129,0.4), inset 0 1px 0 rgba(255,255,255,0.15)" }
                    : { background: "linear-gradient(135deg,#dc2626,#b91c1c)", color: "white", boxShadow: "0 0 20px rgba(239,68,68,0.4), inset 0 1px 0 rgba(255,255,255,0.15)" }
                  : { color: "rgba(100,116,139,0.6)" }
                }
              >
                {d === "BUY" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {d}
              </button>
            ))}
          </div>

          {/* Lot + Leverage */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-[10px] text-slate-600 mb-1 block tracking-wider uppercase">Lot Size</label>
              <input
                type="number" value={lotSize} onChange={(e) => setLotSize(e.target.value)}
                step="0.01" min="0.01" max="100"
                className="w-full rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none"
                style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.4)" }}
                placeholder="0.01"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-600 mb-1 block tracking-wider uppercase">Leverage</label>
              <select
                value={leverage} onChange={(e) => setLeverage(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none appearance-none"
                style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.4)" }}
              >
                {["10", "25", "50", "100", "200", "500"].map((l) => <option key={l} value={l}>1:{l}</option>)}
              </select>
            </div>
          </div>

          {/* SL / TP */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-[10px] mb-1 flex items-center gap-1 tracking-wider uppercase" style={{ color: "#f87171" }}>
                <ShieldAlert className="h-2.5 w-2.5" /> Stop Loss
              </label>
              <input
                type="number" value={sl} onChange={(e) => setSl(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none"
                style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(239,68,68,0.2)", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.4)" }}
                placeholder={fmt(midPrice * (direction === "BUY" ? 0.999 : 1.001), selectedPair.symbol)}
              />
            </div>
            <div>
              <label className="text-[10px] mb-1 flex items-center gap-1 tracking-wider uppercase" style={{ color: "#34d399" }}>
                <Target className="h-2.5 w-2.5" /> Take Profit
              </label>
              <input
                type="number" value={tp} onChange={(e) => setTp(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none"
                style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(16,185,129,0.2)", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.4)" }}
                placeholder={fmt(midPrice * (direction === "BUY" ? 1.001 : 0.999), selectedPair.symbol)}
              />
            </div>
          </div>

          {/* Order info strip */}
          <div className="grid grid-cols-3 gap-1 mb-3 text-center text-[10px]">
            {[
              { label: "Margin", value: `$${isNaN(estimatedMargin) ? "—" : estimatedMargin.toLocaleString()}`, color: "#fb923c" },
              { label: "Pip Value", value: `$${pipValue.toFixed(2)}`, color: "#22d3ee" },
              { label: "Notional", value: `$${((parseFloat(lotSize) || 0.01) * 100000).toLocaleString()}`, color: "#a78bfa" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg py-1.5 panel-inset"
                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <p className="text-slate-600 mb-0.5 text-[9px] tracking-wider">{item.label}</p>
                <p className="font-black font-mono" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Execute */}
          <button
            onClick={executeTrade}
            className="w-full py-3 rounded-xl font-black text-sm tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
            style={direction === "BUY"
              ? { background: "linear-gradient(135deg,#059669,#047857)", color: "white", boxShadow: "0 4px 24px rgba(16,185,129,0.5), inset 0 1px 0 rgba(255,255,255,0.15)" }
              : { background: "linear-gradient(135deg,#dc2626,#b91c1c)", color: "white", boxShadow: "0 4px 24px rgba(239,68,68,0.5), inset 0 1px 0 rgba(255,255,255,0.15)" }
            }
          >
            <Zap className="h-4 w-4" />
            {direction} {selectedPair.symbol} @ {fmt(direction === "BUY" ? selectedPair.ask : selectedPair.bid, selectedPair.symbol)}
          </button>
        </div>
      )}

      {/* ── Positions / History / Depth tabs ─────────────────────────────────── */}
      <div className="mx-3 mt-3 rounded-2xl overflow-hidden glass-dark">
        <div className="flex" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {([
            { id: "positions", label: `Positions (${openTrades.length})`, icon: Layers },
            { id: "history",   label: `History (${closedTrades.length})`, icon: History },
            { id: "depth",     label: "Depth", icon: BarChart2 },
          ] as { id: "positions" | "history" | "depth"; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActivePanel(id)}
              className="flex-1 py-2.5 text-[10px] font-black flex items-center justify-center gap-1 transition-all"
              style={activePanel === id
                ? { color: "#22d3ee", borderBottom: "2px solid #22d3ee", background: "rgba(34,211,238,0.04)" }
                : { color: "rgba(100,116,139,0.5)" }
              }
            >
              <Icon className="h-3 w-3" /> {label}
            </button>
          ))}
        </div>

        {/* Open Positions */}
        {activePanel === "positions" && (
          <div>
            {openTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <BarChart2 className="h-8 w-8 opacity-20 text-slate-600" />
                <p className="text-xs text-slate-700 tracking-wider">No open positions</p>
                <p className="text-[10px] text-slate-800">Place a trade above to get started</p>
              </div>
            ) : (
              openTrades.map((trade) => {
                const pnlColor = trade.pnl >= 0 ? "#34d399" : "#f87171"
                return (
                  <div key={trade.id} className="p-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-black text-white">{trade.pair}</span>
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-black"
                            style={trade.direction === "BUY"
                              ? { background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }
                              : { background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }
                            }
                          >
                            {trade.direction}
                          </span>
                          <span className="text-[10px] text-slate-600">x{trade.leverage} · {trade.lotSize}L</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-mono">
                          <span className="text-slate-600">Open: <span className="text-slate-400">{fmt(trade.openPrice, trade.pair)}</span></span>
                          <span className="text-slate-600">Now: <span className="text-slate-400">{fmt(trade.currentPrice, trade.pair)}</span></span>
                        </div>
                        {/* SL/TP indicators */}
                        {(trade.sl || trade.tp) && (
                          <div className="flex gap-2 mt-1 text-[10px]">
                            {trade.sl && <span className="flex items-center gap-0.5" style={{ color: "#f87171" }}><ShieldAlert className="h-2.5 w-2.5" />{fmt(trade.sl, trade.pair)}</span>}
                            {trade.tp && <span className="flex items-center gap-0.5" style={{ color: "#34d399" }}><Target className="h-2.5 w-2.5" />{fmt(trade.tp, trade.pair)}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="text-right">
                          <p className="text-base font-black font-mono" style={{ color: pnlColor, textShadow: `0 0 10px ${pnlColor}60` }}>
                            {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                          </p>
                          <p className="text-[10px] font-mono" style={{ color: `${pnlColor}80` }}>
                            {trade.pips >= 0 ? "+" : ""}{trade.pips.toFixed(1)} pips
                          </p>
                        </div>
                        <button
                          onClick={() => closeTrade(trade.id)}
                          className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
                        >
                          <X className="h-3 w-3" /> Close
                        </button>
                      </div>
                    </div>
                    {/* Live P&L progress bar */}
                    <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.abs(trade.pnl) / 5)}%`,
                          background: trade.pnl >= 0
                            ? "linear-gradient(90deg,#059669,#34d399)"
                            : "linear-gradient(90deg,#b91c1c,#f87171)",
                          boxShadow: trade.pnl >= 0 ? "0 0 8px rgba(52,211,153,0.5)" : "0 0 8px rgba(248,113,113,0.5)"
                        }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Trade History */}
        {activePanel === "history" && (
          <div>
            {closedTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <History className="h-8 w-8 opacity-20 text-slate-600" />
                <p className="text-xs text-slate-700 tracking-wider">No closed trades yet</p>
              </div>
            ) : (
              closedTrades.slice(0, 30).map((trade) => (
                <div key={trade.id} className="px-3 py-2.5 flex items-center justify-between gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-black text-white">{trade.pair}</span>
                      <span
                        className="text-[9px] px-1 py-0.5 rounded font-black"
                        style={trade.direction === "BUY"
                          ? { background: "rgba(16,185,129,0.1)", color: "#34d399", border: "1px solid rgba(16,185,129,0.18)" }
                          : { background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.18)" }
                        }
                      >
                        {trade.direction}
                      </span>
                      {trade.closeReason !== "manual" && (
                        <span
                          className="text-[9px] px-1 rounded font-black"
                          style={trade.closeReason === "tp"
                            ? { background: "rgba(16,185,129,0.1)", color: "#34d399" }
                            : { background: "rgba(239,68,68,0.1)", color: "#f87171" }
                          }
                        >
                          {trade.closeReason.toUpperCase()}
                        </span>
                      )}
                      <span className="text-[9px] text-slate-700">{trade.lotSize}L</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-700">
                      <span>{fmt(trade.openPrice, trade.pair)}</span>
                      <span className="text-slate-800">→</span>
                      <span>{fmt(trade.closePrice, trade.pair)}</span>
                      <span className="text-slate-800 ml-1">{trade.openTime}</span>
                    </div>
                  </div>
                  <span className="font-black font-mono text-sm" style={{
                    color: trade.finalPnl >= 0 ? "#34d399" : "#f87171",
                    textShadow: `0 0 8px ${trade.finalPnl >= 0 ? "rgba(52,211,153,0.4)" : "rgba(248,113,113,0.4)"}`
                  }}>
                    {trade.finalPnl >= 0 ? "+" : ""}${trade.finalPnl.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Order Depth */}
        {activePanel === "depth" && selectedPair && (
          <div className="p-3">
            <OrderDepth pair={selectedPair} />
          </div>
        )}
      </div>

      {/* ── Market Watch ─────────────────────────────────────────────────────── */}
      <div className="mx-3 mt-3 mb-4 rounded-2xl overflow-hidden glass-dark">
        <div className="px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Market Watch</h3>
        </div>
        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.03)" }}>
          {pairs.map((p) => {
            const up = p.change >= 0
            const isSelected = selectedPair?.symbol === p.symbol
            return (
              <button
                key={p.symbol}
                onClick={() => setSelectedPair(p)}
                className="w-full flex items-center justify-between px-3 py-2.5 transition-all"
                style={isSelected
                  ? { background: "rgba(34,211,238,0.04)" }
                  : { background: "transparent" }
                }
              >
                <div className="flex items-center gap-2">
                  {isSelected && <div className="w-1 h-4 rounded-full" style={{ background: "#22d3ee", boxShadow: "0 0 6px #22d3ee" }} />}
                  <div className="text-left">
                    <p className="text-xs font-black text-white">{p.symbol}</p>
                    <p className="text-[10px] font-mono" style={{ color: up ? "#34d399" : "#f87171" }}>
                      {fmt(p.bid, p.symbol)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono text-slate-500">{fmt(p.ask, p.symbol)}</p>
                  <p className="text-[10px] font-black" style={{ color: up ? "#34d399" : "#f87171" }}>
                    {up ? "+" : ""}{p.change.toFixed(2)}%
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

    </div>
  )
}
