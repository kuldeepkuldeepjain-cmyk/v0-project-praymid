"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  BarChart2,
  AlertTriangle,
  CheckCircle2,
  History,
  Layers,
  Activity,
  Zap,
  Target,
  ShieldAlert,
  CandlestickChart,
  Wallet,
} from "lucide-react"
import { TradingChart } from "@/components/trading-chart"
import { participantFetch } from "@/lib/auth"

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
  returnOnMargin: number
}

type ClosedTrade = OpenTrade & {
  closePrice: number
  closeTime: string
  finalPnl: number
  closeReason: "manual" | "sl" | "tp"
}

type TimeFrame = "1M" | "5M" | "15M" | "1H" | "4H" | "1D"

// ─── Constants ───────────────────────────────────────────────────────────────

type AssetCategory = "Forex" | "Commodities" | "Crypto"

const PAIRS_CONFIG: { base: string; quote: string; symbol: string; category: AssetCategory }[] = [
  // Forex majors
  { base: "EUR", quote: "USD", symbol: "EUR/USD",   category: "Forex" },
  { base: "GBP", quote: "USD", symbol: "GBP/USD",   category: "Forex" },
  { base: "USD", quote: "JPY", symbol: "USD/JPY",   category: "Forex" },
  { base: "USD", quote: "CHF", symbol: "USD/CHF",   category: "Forex" },
  { base: "AUD", quote: "USD", symbol: "AUD/USD",   category: "Forex" },
  { base: "USD", quote: "CAD", symbol: "USD/CAD",   category: "Forex" },
  { base: "NZD", quote: "USD", symbol: "NZD/USD",   category: "Forex" },
  { base: "EUR", quote: "GBP", symbol: "EUR/GBP",   category: "Forex" },
  // Commodities
  { base: "XAU", quote: "USD", symbol: "XAU/USD",   category: "Commodities" },
  { base: "XAG", quote: "USD", symbol: "XAG/USD",   category: "Commodities" },
  // Crypto
  { base: "BTC", quote: "USD", symbol: "BTC/USD",   category: "Crypto" },
  { base: "ETH", quote: "USD", symbol: "ETH/USD",   category: "Crypto" },
  { base: "BNB", quote: "USD", symbol: "BNB/USD",   category: "Crypto" },
  { base: "SOL", quote: "USD", symbol: "SOL/USD",   category: "Crypto" },
  { base: "XRP", quote: "USD", symbol: "XRP/USD",   category: "Crypto" },
  { base: "ADA", quote: "USD", symbol: "ADA/USD",   category: "Crypto" },
]

const TYPICAL_SPREADS: Record<string, number> = {
  // Forex
  "EUR/USD": 0.0002, "GBP/USD": 0.0003, "USD/JPY": 0.02,
  "USD/CHF": 0.0003, "AUD/USD": 0.0003, "USD/CAD": 0.0003,
  "NZD/USD": 0.0004, "EUR/GBP": 0.0003,
  // Commodities — spread as $ absolute
  "XAU/USD": 0.50,   // ~$0.50 on Gold
  "XAG/USD": 0.03,   // ~$0.03 on Silver
  // Crypto — spread as % of price applied later
  "BTC/USD": 5.0,
  "ETH/USD": 1.5,
  "BNB/USD": 0.30,
  "SOL/USD": 0.10,
  "XRP/USD": 0.001,
  "ADA/USD": 0.0005,
}

// Category colours for UI badges
const CATEGORY_COLOR: Record<AssetCategory, { bg: string; text: string; border: string }> = {
  Forex:       { bg: "rgba(34,211,238,0.1)",  text: "#22d3ee", border: "rgba(34,211,238,0.25)" },
  Commodities: { bg: "rgba(251,191,36,0.1)",  text: "#fbbf24", border: "rgba(251,191,36,0.25)" },
  Crypto:      { bg: "rgba(167,139,250,0.1)", text: "#a78bfa", border: "rgba(167,139,250,0.25)" },
}

// Emoji/icon label for each asset
const ASSET_ICON: Record<string, string> = {
  "XAU/USD": "Au", "XAG/USD": "Ag",
  "BTC/USD": "₿",  "ETH/USD": "Ξ",
  "BNB/USD": "BNB","SOL/USD": "◎",
  "XRP/USD": "✕",  "ADA/USD": "₳",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isJpy(sym: string): boolean { return sym.includes("JPY") }
function isCrypto(sym: string): boolean { return ["BTC","ETH","BNB","SOL","XRP","ADA"].some(c => sym.startsWith(c)) }
function isGold(sym: string): boolean { return sym.startsWith("XAU") }
function isSilver(sym: string): boolean { return sym.startsWith("XAG") }
function isCommodity(sym: string): boolean { return isGold(sym) || isSilver(sym) }

function decimals(sym: string): number {
  if (isGold(sym))   return 2
  if (isSilver(sym)) return 3
  if (isCrypto(sym)) {
    if (sym.startsWith("BTC")) return 1
    if (sym.startsWith("ETH")) return 2
    if (sym.startsWith("BNB")) return 2
    if (sym.startsWith("SOL")) return 3
    return 4
  }
  return isJpy(sym) ? 3 : 5
}

function fmt(price: number | null | undefined, sym: string): string {
  if (price == null || !isFinite(price)) return "—"
  return price.toFixed(decimals(sym))
}

// Pip size — the minimum price increment used for P&L calculation
function pip(sym: string): number {
  if (isGold(sym))           return 0.01    // $0.01 per pip on Gold
  if (isSilver(sym))         return 0.001   // $0.001 per pip on Silver
  if (sym.startsWith("BTC")) return 1.0     // $1 per pip on BTC
  if (sym.startsWith("ETH")) return 0.1
  if (sym.startsWith("BNB")) return 0.01
  if (sym.startsWith("SOL")) return 0.001
  if (sym.startsWith("XRP") || sym.startsWith("ADA")) return 0.0001
  return isJpy(sym) ? 0.01 : 0.0001
}

function pips(diff: number, sym: string): number { return diff / pip(sym) }
function genId(): string { return Math.random().toString(36).slice(2, 10) }

// Contract sizes per instrument class
function contractSize(sym: string): number {
  if (isGold(sym))           return 100     // 100 oz per standard lot
  if (isSilver(sym))         return 5000    // 5000 oz per standard lot
  if (sym.startsWith("BTC")) return 1       // 1 BTC per lot
  if (sym.startsWith("ETH")) return 10      // 10 ETH per lot
  if (sym.startsWith("BNB")) return 100
  if (sym.startsWith("SOL")) return 100
  if (sym.startsWith("XRP")) return 10000
  if (sym.startsWith("ADA")) return 10000
  return 100000 // Standard forex
}

// ─── P&L Calculation ─────────────────────────────────────────────────────────
function calcPnl(trade: OpenTrade, currentPrice: number, sym: string): {
  pnl: number; pips: number; returnOnMargin: number
} {
  const dir = trade.direction === "BUY" ? 1 : -1
  const diff = (currentPrice - trade.openPrice) * dir
  const cs = contractSize(sym)
  const pipSize = pip(sym)
  const pipVal = trade.lotSize * cs * pipSize
  const rawPips = diff / pipSize
  const pnl = parseFloat((rawPips * pipVal).toFixed(2))
  const returnOnMargin = trade.margin > 0 ? parseFloat(((pnl / trade.margin) * 100).toFixed(1)) : 0
  return { pnl, pips: parseFloat(rawPips.toFixed(1)), returnOnMargin }
}



// ─── Order Depth Panel ───────────────────────────────────────────���───────────

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
        <span className="text-slate-600 text-[9px]">spread {(pips(pair.spread ?? 0, pair.symbol) || 0).toFixed(1)}p</span>
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


// ─── Main Component ─────────────────────���─────────────────────────────�����───────

export function ForexTradingPlatform({
  participantEmail,
  walletBalance: externalBalance = 0,
  onBalanceUpdated,
}: {
  participantEmail: string
  walletBalance?: number
  onBalanceUpdated?: (newBalance: number) => void
}) {
  const [pairs, setPairs] = useState<ForexPair[]>([])
  const [selectedPair, setSelectedPair] = useState<ForexPair | null>(null)
  const [activeCategory, setActiveCategory] = useState<AssetCategory | "All">("All")
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
  // Mirror external balance locally so we can optimistically update it
  const [walletBalance, setWalletBalance] = useState(externalBalance)
  // Track whether balance has been received from parent at least once
  const [balanceLoaded, setBalanceLoaded] = useState(externalBalance > 0)
  // Flash the balance change (+/-) briefly on each update
  const [balanceDelta, setBalanceDelta] = useState<{ value: number; id: number } | null>(null)
  // candleCache: key = "symbol|tf" => Candle[]
  const [candleCache, setCandleCache] = useState<Record<string, Candle[]>>({})
  const [candleLoading, setCandleLoading] = useState(false)
  const [mobileTab, setMobileTab] = useState<"market" | "chart" | "order">("chart")
  const pairsRef = useRef<ForexPair[]>([])
  const ratesIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const candleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Sync external wallet balance when parent updates it (e.g. after top-up)
  useEffect(() => {
    setWalletBalance(externalBalance)
    if (externalBalance > 0) setBalanceLoaded(true)
  }, [externalBalance])

  // ── Wallet balance API helper ───────────────────────────────────────────────
  const adjustWalletBalance = useCallback(async (delta: number, description: string): Promise<number | null> => {
    try {
      // Use participantFetch so X-Participant-Token header is sent automatically
      const res = await participantFetch("/api/forex/trade-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: participantEmail, delta, description }),
      })
      const json = await res.json()
      if (!json.success) {
        showMsg("error", json.error || "Balance update failed")
        return null
      }
      setWalletBalance(json.newBalance)
      setBalanceLoaded(true)
      onBalanceUpdated?.(json.newBalance)
      // Flash delta badge
      setBalanceDelta({ value: delta, id: Date.now() })
      setTimeout(() => setBalanceDelta(null), 2500)
      return json.newBalance
    } catch {
      showMsg("error", "Network error updating balance")
      return null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantEmail, onBalanceUpdated])

  // ── Fetch live rates from our API route (which proxies Yahoo Finance) ──────
  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch("/api/forex/rates", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      const rateMap = json.rates as Record<string, {
        bid: number; ask: number; mid: number; change: number; high: number; low: number; open: number
      }>

      setPairs((prev) => {
        const updated = prev.map((p) => {
          const r = rateMap[p.symbol]
          if (!r) return p
          const spread = TYPICAL_SPREADS[p.symbol] ?? 0.0002
          return {
            ...p,
            bid: r.bid,
            ask: r.ask,
            change: r.change,
            high: r.high,
            low: r.low,
            open: r.open,
            spread,
          }
        })
        pairsRef.current = updated
        return updated
      })

      setSelectedPair((prev) => {
        if (!prev) return prev
        return pairsRef.current.find((p) => p.symbol === prev.symbol) ?? prev
      })
      setOnline(true)
      setLastUpdated(new Date())
      setTickCount((n) => n + 1)
    } catch {
      setOnline(false)
    }
  }, [])

  // ── Fetch real OHLC candles for selected pair + timeframe ───────────�������─────
  const fetchCandles = useCallback(async (sym: string, tf: TimeFrame) => {
    const key = `${sym}|${tf}`
    setCandleLoading(true)
    try {
      const res = await fetch(`/api/forex/candles?pair=${encodeURIComponent(sym)}&tf=${tf}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      const candles: Candle[] = json.candles
      setCandleCache((prev) => ({ ...prev, [key]: candles }))
      // Update the pair's candles array too so TradingChart gets live candles
      setPairs((prev) => {
        const updated = prev.map((p) => p.symbol === sym ? { ...p, candles } : p)
        pairsRef.current = updated
        return updated
      })
      setSelectedPair((prev) => {
        if (!prev || prev.symbol !== sym) return prev
        return pairsRef.current.find((p) => p.symbol === sym) ?? prev
      })
    } catch {
      // keep existing candles on error
    } finally {
      setCandleLoading(false)
    }
  }, [])

  // ── Init: build empty pairs then load data ────────────────────���────────────
  useEffect(() => {
    const initialPairs: ForexPair[] = PAIRS_CONFIG.map((p) => ({
      symbol: p.symbol, base: p.base, quote: p.quote,
      bid: 0, ask: 0, change: 0, high: 0, low: 0, open: 0,
      spread: TYPICAL_SPREADS[p.symbol] ?? 0.0002,
      candles: [],
    }))
    setPairs(initialPairs)
    pairsRef.current = initialPairs
    setSelectedPair(initialPairs[0])
    setLoading(false)
    // Kick off first fetch immediately
    fetchRates()
    fetchCandles(initialPairs[0].symbol, "5M")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Poll rates every 3s ────────────────────────────────────────────────────
  useEffect(() => {
    ratesIntervalRef.current = setInterval(fetchRates, 3000)
    return () => { if (ratesIntervalRef.current) clearInterval(ratesIntervalRef.current) }
  }, [fetchRates])

  // ── Re-fetch candles when pair or timeframe changes ───────────────────────
  useEffect(() => {
    if (!selectedPair) return
    fetchCandles(selectedPair.symbol, timeframe)
    // Refresh candles periodically based on TF
    const refreshMs: Record<TimeFrame, number> = {
      "1M": 30_000, "5M": 60_000, "15M": 120_000, "1H": 300_000, "4H": 600_000, "1D": 3600_000
    }
    const ms = refreshMs[timeframe] ?? 60_000
    candleIntervalRef.current = setInterval(() => fetchCandles(selectedPair.symbol, timeframe), ms)
    return () => { if (candleIntervalRef.current) clearInterval(candleIntervalRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPair?.symbol, timeframe])

  // ── Live-update the last candle's close/high/low on every rate tick ────────
  // This makes the chart animate in real time even between candle refreshes.
  useEffect(() => {
    if (!selectedPair || selectedPair.candles.length === 0) return
    const mid = (selectedPair.bid + selectedPair.ask) / 2
    if (mid === 0) return
    setPairs((prev) => {
      const updated = prev.map((p) => {
        if (p.symbol !== selectedPair.symbol || p.candles.length === 0) return p
        const liveMid = (p.bid + p.ask) / 2
        if (liveMid === 0) return p
        const d = decimals(p.symbol)
        const newCandles = [...p.candles]
        const last = { ...newCandles[newCandles.length - 1] }
        last.close = parseFloat(liveMid.toFixed(d))
        last.high  = Math.max(last.high, last.close)
        last.low   = Math.min(last.low,  last.close)
        newCandles[newCandles.length - 1] = last
        return { ...p, candles: newCandles }
      })
      pairsRef.current = updated
      return updated
    })
    setSelectedPair((prev) => {
      if (!prev) return prev
      return pairsRef.current.find((p) => p.symbol === prev.symbol) ?? prev
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickCount])

  // ── P&L + SL/TP engine ─────────────────────────────────────────────────────
  useEffect(() => {
    if (openTrades.length === 0) return
    const toClose: { id: string; reason: "sl" | "tp"; price: number }[] = []

    const updated = openTrades.map((t) => {
      const pairNow = pairsRef.current.find((p) => p.symbol === t.pair)
      if (!pairNow) return t
      const currentPrice = t.direction === "BUY" ? pairNow.bid : pairNow.ask
      const { pnl, pips: pipCount, returnOnMargin } = calcPnl(t, currentPrice, t.pair)
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
      return { ...t, currentPrice, pnl, pips: pipCount, returnOnMargin }
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
          // Only apply the P&L — profit adds to balance, loss deducts
          const pnl = parseFloat(finalPnl.toFixed(2))
          adjustWalletBalance(
            pnl,
            `${reason.toUpperCase()} hit — ${trade.pair} ${trade.direction} | P&L: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`
          )
          showMsg(
            reason === "tp" ? "success" : "error",
            `${reason.toUpperCase()} hit: ${trade.pair} ${trade.direction} — ${pnl >= 0 ? "Profit" : "Loss"}: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`
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

  // ── Execute trade ───────────��───────────────────────────────────────────────
  const executeTrade = async () => {
    if (!selectedPair) return
    const lot = parseFloat(lotSize)
    const lev = parseFloat(leverage)
    if (isNaN(lot) || lot <= 0 || lot > 100) { showMsg("error", "Lot size: 0.01 – 100"); return }
    if (isNaN(lev) || lev < 1) { showMsg("error", "Invalid leverage"); return }

    const price = direction === "BUY" ? selectedPair.ask : selectedPair.bid
    const margin = parseFloat(((lot * contractSize(selectedPair.symbol) * price) / lev).toFixed(2))
    const slNum = sl ? parseFloat(sl) : null
    const tpNum = tp ? parseFloat(tp) : null

    // Validate SL/TP
    if (slNum && direction === "BUY" && slNum >= price) { showMsg("error", "SL must be below entry for BUY"); return }
    if (slNum && direction === "SELL" && slNum <= price) { showMsg("error", "SL must be above entry for SELL"); return }
    if (tpNum && direction === "BUY" && tpNum <= price) { showMsg("error", "TP must be above entry for BUY"); return }
    if (tpNum && direction === "SELL" && tpNum >= price) { showMsg("error", "TP must be below entry for SELL"); return }

    // Check margin against balance (margin is reserved, not deducted on open)
    if (walletBalance < margin) {
      showMsg("error", `Insufficient balance. Need $${margin.toFixed(2)}, have $${walletBalance.toFixed(2)}`)
      return
    }

    const trade: OpenTrade = {
      id: genId(), pair: selectedPair.symbol, direction,
      lotSize: lot, leverage: lev, openPrice: price, currentPrice: price,
      sl: slNum, tp: tpNum,
      openTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      pnl: 0, pips: 0, margin, returnOnMargin: 0,
    }
    setOpenTrades((prev) => [trade, ...prev])
    showMsg("success", `${direction} ${lot}L ${selectedPair.symbol} @ ${fmt(price, selectedPair.symbol)} | Margin: $${margin.toFixed(2)}`)
    setSl(""); setTp("")
    setActivePanel("positions")
  }

  // ── Quick trade (one-click) ─────────────────────────────────────────────────
  const quickTrade = async (dir: TradeDirection) => {
    if (!selectedPair) return
    const lot = parseFloat(lotSize) || 0.01
    const lev = parseFloat(leverage) || 100
    const price = dir === "BUY" ? selectedPair.ask : selectedPair.bid
    const margin = parseFloat(((lot * contractSize(selectedPair.symbol) * price) / lev).toFixed(2))

    if (walletBalance < margin) {
      showMsg("error", `Insufficient balance. Need $${margin.toFixed(2)}, have $${walletBalance.toFixed(2)}`)
      return
    }

    const trade: OpenTrade = {
      id: genId(), pair: selectedPair.symbol, direction: dir,
      lotSize: lot, leverage: lev, openPrice: price, currentPrice: price,
      sl: null, tp: null,
      openTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      pnl: 0, pips: 0, margin, returnOnMargin: 0,
    }
    setOpenTrades((prev) => [trade, ...prev])
    showMsg("success", `Quick ${dir}: ${lot}L ${selectedPair.symbol} @ ${fmt(price, selectedPair.symbol)} | Margin: $${margin.toFixed(2)}`)
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
      // Only apply the P&L to balance — profit adds, loss deducts
      // Balance is never deducted on open, so only the net gain/loss is applied here
      const pnl = parseFloat(trade.pnl.toFixed(2))
      adjustWalletBalance(
        pnl,
        `Trade closed — ${trade.pair} ${trade.direction} | P&L: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`
      )
      showMsg(
        pnl >= 0 ? "success" : "error",
        `Closed ${trade.pair} — ${pnl >= 0 ? "Profit" : "Loss"}: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`
      )
      return prev.filter((t) => t.id !== id)
    })
  }

  const showMsg = (type: "success" | "error", text: string) => {
    setTradeMsg({ type, text })
    setTimeout(() => setTradeMsg(null), 4000)
  }

  const midPrice = selectedPair ? (selectedPair.bid + selectedPair.ask) / 2 : 0
  const estimatedMargin = selectedPair
    ? parseFloat(((parseFloat(lotSize) || 0.01) * contractSize(selectedPair.symbol) * midPrice / (parseFloat(leverage) || 100)).toFixed(2))
    : 0
  const pipValue = selectedPair ? ((parseFloat(lotSize) || 0.01) * contractSize(selectedPair.symbol) * pip(selectedPair.symbol)) : 0
  const isUp = selectedPair ? selectedPair.change >= 0 : true
  const lastCandle = selectedPair?.candles?.slice(-1)[0]

  // Pre-compute SL/TP risk metrics so we avoid IIFE patterns inside JSX
  const entryPrice = selectedPair
    ? (direction === "BUY" ? selectedPair.ask : selectedPair.bid)
    : midPrice
  const slVal = sl && !isNaN(parseFloat(sl)) ? parseFloat(sl) : null
  const tpVal = tp && !isNaN(parseFloat(tp)) ? parseFloat(tp) : null
  const slPips    = slVal !== null && selectedPair ? Math.abs((slVal - entryPrice) / pip(selectedPair.symbol)) : 0
  const tpPips    = tpVal !== null && selectedPair ? Math.abs((tpVal - entryPrice) / pip(selectedPair.symbol)) : 0
  const maxLoss   = slPips * pipValue
  const maxGain   = tpPips * pipValue
  const rrRatio   = slPips > 0 ? (tpPips / slPips).toFixed(2) : null

  // ─── Derived values for layout ──────────────────────────────────────────
  const categoryTabs: (AssetCategory | "All")[] = ["All", "Forex", "Commodities", "Crypto"]
  const filteredPairs = pairs.filter((p) => {
    const cfg = PAIRS_CONFIG.find((c) => c.symbol === p.symbol)
    return activeCategory === "All" || cfg?.category === activeCategory
  })

  return (
    <div className="flex flex-col forex-deep-bg text-white" style={{ height: "100%", minHeight: 540, fontFamily: "'Inter', sans-serif" }}>

      {/* ══════════════════════════════════════════════════════════════════════
           TOP NAVIGATION BAR
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center shrink-0 px-3 h-10 gap-3" style={{ background: "#080c14", borderBottom: "1px solid #1e2d45" }}>
        {/* Brand */}
        <div className="flex items-center gap-1.5 shrink-0">
          <CandlestickChart className="h-4 w-4 text-cyan-400" />
          <span className="text-[11px] font-black tracking-[0.18em] text-white">TRADE TERMINAL</span>
        </div>
        <div className="w-px h-5 shrink-0" style={{ background: "#1e2d45" }} />

        {/* Scrolling ticker tape */}
        <div className="flex-1 overflow-hidden relative" style={{ mask: "linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)" }}>
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
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: online ? "#10b981" : "#ef4444" }}>{online ? "LIVE" : "OFFLINE"}</span>
          {lastUpdated && <span className="text-[9px] text-slate-600 price-mono hidden md:block">{lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>}
        </div>

        {/* Balance chip */}
        <div className="relative flex items-center gap-1.5 px-2.5 py-1 shrink-0" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: 4 }}>
          <Wallet className="h-3 w-3 text-emerald-400" />
          <span className="text-[10px] text-slate-500">Balance</span>
          <span className="price-mono text-[11px] font-black text-emerald-400">${walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          {/* Delta flash badge */}
          {balanceDelta && (
            <span
              key={balanceDelta.id}
              className="absolute -top-5 left-1/2 price-mono text-[10px] font-black pointer-events-none animate-bounce"
              style={{
                transform: "translateX(-50%)",
                color: balanceDelta.value >= 0 ? "#10b981" : "#ef4444",
                textShadow: `0 0 8px ${balanceDelta.value >= 0 ? "rgba(16,185,129,0.8)" : "rgba(239,68,68,0.8)"}`,
              }}
            >
              {balanceDelta.value >= 0 ? "+" : ""}${Math.abs(balanceDelta.value).toFixed(2)}
            </span>
          )}
        </div>

        {/* Refresh */}
        <button
          onClick={() => { fetchRates(); if (selectedPair) fetchCandles(selectedPair.symbol, timeframe) }}
          className="p-1.5 transition-colors shrink-0"
          style={{ background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.15)", borderRadius: 4 }}
          >
            <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${candleLoading ? "animate-spin" : ""}`} />
          </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
           ACCOUNT SUMMARY STRIP
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center shrink-0 px-3 h-8 gap-0 overflow-x-auto" style={{ background: "#060a12", borderBottom: "1px solid #1a2640", WebkitOverflowScrolling: "touch" as any }}>
        {[
          { label: "BALANCE", value: `$${walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "#10b981" },
          { label: "EQUITY", value: `$${(walletBalance + totalPnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: totalPnl >= 0 ? "#10b981" : "#ef4444" },
          { label: "LIVE P&L", value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? "#10b981" : "#ef4444" },
          { label: "MARGIN", value: `$${openTrades.reduce((s, t) => s + t.margin, 0).toFixed(2)}`, color: "#f59e0b" },
          { label: "FREE MARGIN", value: `$${Math.max(0, walletBalance - openTrades.reduce((s, t) => s + t.margin, 0)).toFixed(2)}`, color: "#22d3ee" },
          { label: "POSITIONS", value: String(openTrades.length), color: "#a78bfa" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 px-3 h-full" style={{ borderRight: "1px solid #1a2640" }}>
            <span className="text-[9px] font-bold tracking-widest" style={{ color: "#3d5a80" }}>{item.label}</span>
            <span className="price-mono text-[10px] font-black" style={{ color: item.color }}>{item.value}</span>
          </div>
        ))}
        {/* Trade notification inline */}
        {tradeMsg && (
          <div className="ml-3 flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold"
            style={{ background: tradeMsg.type === "success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
              color: tradeMsg.type === "success" ? "#10b981" : "#ef4444",
              border: `1px solid ${tradeMsg.type === "success" ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
              borderRadius: 3 }}
          >
            {tradeMsg.type === "success" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            {tradeMsg.text}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
           MOBILE TAB SWITCHER (hidden on md+)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex shrink-0 md:hidden" style={{ background: "#060a12", borderBottom: "1px solid #1a2640" }}>
        {[{ id: "market", label: "Markets" }, { id: "chart", label: "Chart" }, { id: "order", label: "Order" }].map((tab) => (
          <button key={tab.id} onClick={() => setMobileTab(tab.id as "market" | "chart" | "order")}
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

      {/* ══════════════════════════════════════════════════════════════════════
           MAIN 3-COLUMN TRADING GRID
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex min-h-0" style={{ borderBottom: "1px solid #1e2d45" }}>

        {/* ── LEFT COLUMN: Market Watch ──────────────────────────────────────── */}
        <div className={`flex flex-col shrink-0 ${mobileTab !== "market" ? "hidden md:flex" : "flex"}`} style={{ width: "min(264px, 100%)", borderRight: "1px solid #1e2d45", background: "#070b13" }}>

          {/* ── Sidebar header ── */}
          <div className="shrink-0 px-3 pt-3 pb-2" style={{ borderBottom: "1px solid #1a2640" }}>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-4 rounded-sm" style={{ background: "linear-gradient(180deg,#22d3ee,#0ea5e9)" }} />
                <span className="text-[11px] font-black tracking-[0.18em] text-white uppercase">Market Watch</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="live-dot" />
                <span className="text-[9px] font-bold text-emerald-500 tracking-wider">LIVE</span>
              </div>
            </div>

            {/* Category filter pills */}
            <div className="flex gap-1">
              {categoryTabs.map((cat) => {
                const isActive = activeCategory === cat
                const cc = cat === "All"
                  ? { text: "#94a3b8", border: "#334155", bg: "rgba(148,163,184,0.1)" }
                  : { text: CATEGORY_COLOR[cat as AssetCategory].text, border: CATEGORY_COLOR[cat as AssetCategory].border, bg: CATEGORY_COLOR[cat as AssetCategory].bg }
                const label = cat === "All" ? "All" : cat === "Commodities" ? "Metals" : cat === "Forex" ? "FX" : cat
                return (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className="flex-1 py-1 text-[9px] font-black tracking-wider uppercase transition-all"
                    style={{ borderRadius: 4,
                      background: isActive ? cc.bg : "transparent",
                      color: isActive ? cc.text : "#374151",
                      border: `1px solid ${isActive ? cc.border : "#1a2640"}` }}>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Column headers ── */}
          <div className="grid shrink-0 px-3 py-1.5" style={{ gridTemplateColumns: "1fr 72px 52px", background: "#05080e", borderBottom: "1px solid #111827" }}>
            <span className="text-[8px] font-black tracking-[0.15em] uppercase" style={{ color: "#2d4565" }}>Instrument</span>
            <span className="text-[8px] font-black tracking-[0.15em] uppercase text-right" style={{ color: "#2d4565" }}>Bid / Ask</span>
            <span className="text-[8px] font-black tracking-[0.15em] uppercase text-right" style={{ color: "#2d4565" }}>Chg%</span>
          </div>

          {/* ── Instrument list ── */}
          <div className="flex-1 overflow-y-auto terminal-scroll">
            {loading ? (
              <div className="p-2 flex flex-col gap-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-11 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
                ))}
              </div>
            ) : (
              (() => {
                // Group by category when showing All
                const categories: AssetCategory[] = ["Forex", "Commodities", "Crypto"]
                const toShow = activeCategory === "All" ? categories : [activeCategory as AssetCategory]
                return toShow.map((cat) => {
                  const catPairs = filteredPairs.filter(p => PAIRS_CONFIG.find(c => c.symbol === p.symbol)?.category === cat)
                  if (catPairs.length === 0) return null
                  const cc = CATEGORY_COLOR[cat]
                  return (
                    <div key={cat}>
                      {/* Category section label */}
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
                      {/* Rows */}
                      {catPairs.map((p) => {
                        const up = p.change >= 0
                        const cfg = PAIRS_CONFIG.find((c) => c.symbol === p.symbol)
                        const pCat = cfg?.category ?? "Forex"
                        const pCc = CATEGORY_COLOR[pCat]
                        const icon = ASSET_ICON[p.symbol]
                        const isSelected = selectedPair?.symbol === p.symbol
                        const base = p.symbol.split("/")[0]
                        const quote = p.symbol.split("/")[1]
                        // Full instrument names
                        const fullNames: Record<string, string> = {
                          "EUR/USD": "Euro / US Dollar", "GBP/USD": "British Pound", "USD/JPY": "US Dollar / Yen",
                          "USD/CHF": "Swiss Franc", "AUD/USD": "Australian Dollar", "USD/CAD": "Canadian Dollar",
                          "NZD/USD": "New Zealand Dollar", "EUR/GBP": "Euro / Pound",
                          "XAU/USD": "Gold Spot", "XAG/USD": "Silver Spot",
                          "BTC/USD": "Bitcoin", "ETH/USD": "Ethereum", "BNB/USD": "BNB Chain",
                          "SOL/USD": "Solana", "XRP/USD": "Ripple XRP", "ADA/USD": "Cardano",
                        }
                        return (
                          <button key={p.symbol}
                            onClick={() => { setSelectedPair(p); fetchCandles(p.symbol, timeframe); setMobileTab("chart") }}
                            className="w-full mw-row"
                            style={{
                              background: isSelected ? `linear-gradient(90deg, ${pCc.bg}, rgba(0,0,0,0))` : "transparent",
                              borderLeft: isSelected ? `3px solid ${pCc.text}` : "3px solid transparent",
                              borderBottom: "1px solid #0d1525",
                              padding: "8px 12px 8px 10px",
                            }}>
                            <div className="grid items-center" style={{ gridTemplateColumns: "1fr 72px 52px", gap: 0 }}>
                              {/* Left: icon + names */}
                              <div className="flex items-center gap-2 min-w-0">
                                {/* Icon badge */}
                                <div className="mw-badge w-7 h-7 rounded flex items-center justify-center shrink-0 text-[10px] font-black"
                                  style={{ background: isSelected ? pCc.bg : "rgba(255,255,255,0.03)", border: `1px solid ${isSelected ? pCc.border : "#131d2e"}`, color: pCc.text }}>
                                  {icon ?? base.slice(0, 2)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-black leading-none" style={{ color: isSelected ? "#ffffff" : "#c8d4e4" }}>{base}</span>
                                    <span className="text-[9px] font-bold leading-none" style={{ color: "#3d5a7a" }}>/{quote}</span>
                                  </div>
                                  <div className="text-[8px] leading-none mt-0.5 truncate" style={{ color: "#2d4565" }}>
                                    {fullNames[p.symbol] ?? p.symbol}
                                  </div>
                                </div>
                              </div>
                              {/* Middle: Bid / Ask stacked */}
                              <div className="text-right">
                                <div className="price-mono text-[10px] font-black leading-none" style={{ color: up ? "#10b981" : "#ef4444" }}>
                                  {fmt(p.bid, p.symbol)}
                                </div>
                                <div className="price-mono text-[9px] leading-none mt-0.5" style={{ color: "#2d4565" }}>
                                  {fmt(p.ask, p.symbol)}
                                </div>
                              </div>
                              {/* Right: change% + mini bar */}
                              <div className="text-right">
                                <div className="price-mono text-[10px] font-black leading-none" style={{ color: up ? "#10b981" : "#ef4444" }}>
                                  {up ? "+" : ""}{(p.change ?? 0).toFixed(2)}%
                                </div>
                                {/* Mini change bar */}
                                <div className="mt-1 h-0.5 w-full rounded-full overflow-hidden" style={{ background: "#111827" }}>
                                  <div className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${Math.min(100, Math.abs(p.change ?? 0) * 20)}%`,
                                      background: up ? "#10b981" : "#ef4444",
                                      boxShadow: up ? "0 0 4px #10b981" : "0 0 4px #ef4444",
                                      marginLeft: up ? 0 : "auto"
                                    }} />
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

          {/* ── Sidebar footer: instrument count ── */}
          <div className="shrink-0 flex items-center justify-between px-3 py-2" style={{ borderTop: "1px solid #1a2640", background: "#05080e" }}>
            <span className="text-[9px] font-bold tracking-wider" style={{ color: "#2d4565" }}>
              {filteredPairs.length} instrument{filteredPairs.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-1.5">
              {(["Forex", "Commodities", "Crypto"] as AssetCategory[]).map(cat => {
                const count = pairs.filter(p => PAIRS_CONFIG.find(c => c.symbol === p.symbol)?.category === cat).length
                return (
                  <span key={cat} className="text-[8px] font-black px-1.5 py-0.5 rounded"
                    style={{ background: CATEGORY_COLOR[cat].bg, color: CATEGORY_COLOR[cat].text, border: `1px solid ${CATEGORY_COLOR[cat].border}` }}>
                    {cat === "Commodities" ? "Au/Ag" : cat === "Forex" ? "FX" : "Crypto"} {count}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── CENTER COLUMN: Chart area ──────────────────────────────────────── */}
        <div className={`flex-1 flex flex-col min-w-0 ${mobileTab !== "chart" ? "hidden md:flex" : "flex"}`}>
          {/* Pair header bar */}
          {selectedPair ? (
            <div className="shrink-0 flex items-center gap-4 px-3 py-2" style={{ background: "#080c14", borderBottom: "1px solid #1e2d45" }}>
              {/* Symbol + price */}
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-black text-white tracking-wider">
                  {ASSET_ICON[selectedPair.symbol] && <span className="mr-1 text-base">{ASSET_ICON[selectedPair.symbol]}</span>}
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

              {/* OHLC + market data */}
              <div className="flex items-center gap-3 text-[10px] price-mono">
                <span className="text-slate-600">BID <span className="text-red-400 font-black">{fmt(selectedPair.bid, selectedPair.symbol)}</span></span>
                <span className="text-slate-600">ASK <span className="text-emerald-400 font-black">{fmt(selectedPair.ask, selectedPair.symbol)}</span></span>
                <span className="text-slate-600">SPR <span className="text-cyan-400 font-bold">{(pips(selectedPair.spread ?? 0, selectedPair.symbol) || 0).toFixed(1)}p</span></span>
                <span className="text-slate-600">H <span className="text-emerald-400 font-bold">{fmt(selectedPair.high, selectedPair.symbol)}</span></span>
                <span className="text-slate-600">L <span className="text-red-400 font-bold">{fmt(selectedPair.low, selectedPair.symbol)}</span></span>
                {lastCandle && <>
                  <span className="text-slate-700 mx-0.5">|</span>
                  <span className="text-slate-600">O<span className="text-slate-400 ml-0.5">{fmt(lastCandle.open, selectedPair.symbol)}</span></span>
                  <span className="text-emerald-600">H<span className="text-emerald-400 ml-0.5">{fmt(lastCandle.high, selectedPair.symbol)}</span></span>
                  <span className="text-red-600">L<span className="text-red-400 ml-0.5">{fmt(lastCandle.low, selectedPair.symbol)}</span></span>
                  <span style={{ color: lastCandle.close >= lastCandle.open ? "#10b981" : "#ef4444" }}>C<span className="ml-0.5">{fmt(lastCandle.close, selectedPair.symbol)}</span></span>
                </>}
              </div>

              {/* Timeframe selector pushed to right */}
              <div className="ml-auto flex items-center gap-1">
                {(["1M", "5M", "15M", "1H", "4H", "1D"] as TimeFrame[]).map((tf) => (
                  <button key={tf} onClick={() => setTimeframe(tf)}
                    className="px-2 py-0.5 text-[9px] font-black tracking-wider transition-all"
                    style={{ borderRadius: 3,
                      background: timeframe === tf ? "rgba(34,211,238,0.12)" : "transparent",
                      color: timeframe === tf ? "#22d3ee" : "#374151",
                      border: timeframe === tf ? "1px solid rgba(34,211,238,0.25)" : "1px solid transparent" }}>
                    {tf}
                  </button>
                ))}
                {candleLoading && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-1" />}
              </div>
            </div>
          ) : (
            <div className="shrink-0 flex items-center px-3 py-2 text-[11px] text-slate-700" style={{ background: "#080c14", borderBottom: "1px solid #1e2d45" }}>
              Select an instrument from the Market Watch panel to begin trading.
            </div>
          )}

          {/* Chart — fills all remaining height, with BUY/SELL strip at bottom */}
          <div className="flex-1 min-h-0 flex flex-col" style={{ background: "#080c14" }}>
            <div className="flex-1 min-h-0">
              {selectedPair ? (
                <TradingChart
                  candles={selectedPair.candles}
                  sym={selectedPair.symbol}
                  openTrades={openTrades.filter((t) => t.pair === selectedPair.symbol)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <CandlestickChart className="h-12 w-12 text-slate-800" />
                  <p className="text-slate-700 text-sm font-bold tracking-wider">SELECT AN INSTRUMENT</p>
                </div>
              )}
            </div>

            {/* ── BUY / SELL action strip directly below chart ── */}
            {selectedPair && (
              <div className="shrink-0 flex items-stretch gap-0" style={{ borderTop: "1px solid #1e2d45", height: 54 }}>
                {/* Lot + Leverage compact display */}
                <div className="flex items-center gap-3 px-3 shrink-0" style={{ background: "#060a12", borderRight: "1px solid #1e2d45" }}>
                  <div className="text-center">
                    <p className="text-[8px] font-black tracking-widest text-slate-700 uppercase">Lots</p>
                    <input
                      type="number"
                      value={lotSize}
                      onChange={(e) => setLotSize(e.target.value)}
                      step="0.01" min="0.01" max="100"
                      className="price-mono text-sm font-black text-white focus:outline-none text-center w-16"
                      style={{ background: "transparent", border: "none" }}
                    />
                  </div>
                  <div className="w-px h-6" style={{ background: "#1e2d45" }} />
                  <div className="text-center">
                    <p className="text-[8px] font-black tracking-widest text-slate-700 uppercase">Leverage</p>
                    <select
                      value={leverage}
                      onChange={(e) => setLeverage(e.target.value)}
                      className="price-mono text-sm font-black text-cyan-400 focus:outline-none text-center appearance-none w-14 cursor-pointer"
                      style={{ background: "transparent", border: "none" }}
                    >
                      {["10", "25", "50", "100", "200", "500"].map((l) => (
                        <option key={l} value={l} style={{ background: "#080c14", color: "#22d3ee" }}>1:{l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-px h-6" style={{ background: "#1e2d45" }} />
                  <div className="text-center">
                    <p className="text-[8px] font-black tracking-widest text-slate-700 uppercase">Margin</p>
                    <p className="price-mono text-sm font-black" style={{ color: "#f59e0b" }}>
                      ${isNaN(estimatedMargin) ? "—" : estimatedMargin.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* SELL button */}
                <button
                  onClick={() => quickTrade("SELL")}
                  disabled={balanceLoaded && estimatedMargin > walletBalance}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 font-black transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #450a0a, #7f1d1d)", borderRight: "1px solid #991b1b" }}
                >
                  <div className="flex items-center gap-1.5">
                    <TrendingDown className="h-4 w-4 text-red-400" />
                    <span className="text-base font-black tracking-wider text-red-300">SELL</span>
                  </div>
                  <span className="price-mono text-[11px] font-bold text-red-500">{fmt(selectedPair.bid, selectedPair.symbol)}</span>
                </button>

                {/* Spread pill */}
                <div className="flex flex-col items-center justify-center px-2 shrink-0" style={{ background: "#050810", borderRight: "1px solid #1e2d45" }}>
                  <span className="text-[8px] font-black tracking-widest text-slate-700 uppercase">Spread</span>
                  <span className="price-mono text-[10px] font-black text-cyan-600">
                    {(pips(selectedPair.spread ?? 0, selectedPair.symbol) || 0).toFixed(1)}p
                  </span>
                </div>

                {/* BUY button */}
                <button
                  onClick={() => quickTrade("BUY")}
                  disabled={balanceLoaded && estimatedMargin > walletBalance}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 font-black transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #052e16, #065f46)" }}
                >
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span className="text-base font-black tracking-wider text-emerald-300">BUY</span>
                  </div>
                  <span className="price-mono text-[11px] font-bold text-emerald-500">{fmt(selectedPair.ask, selectedPair.symbol)}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: Order Ticket ────────────────────────────────────── */}
        <div className={`flex flex-col shrink-0 terminal-scroll overflow-y-auto ${mobileTab !== "order" ? "hidden md:flex" : "flex"}`} style={{ width: "min(220px, 100%)", borderLeft: "1px solid #1e2d45" }}>

          {/* Panel header */}
          <div className="terminal-panel-header shrink-0">
            <Activity className="h-3 w-3 text-cyan-400" />
            <span className="text-[9px] font-black tracking-[0.2em] text-slate-500 uppercase">Order Ticket</span>
          </div>

          {selectedPair ? (
            <div className="flex flex-col gap-0 p-2">

              {/* BUY / SELL toggle */}
              <div className="flex mb-2 overflow-hidden" style={{ borderRadius: 4, border: "1px solid #1e2d45", background: "#060a12" }}>
                {(["BUY", "SELL"] as TradeDirection[]).map((d) => (
                  <button key={d} onClick={() => setDirection(d)}
                    className="flex-1 py-2 text-xs font-black flex items-center justify-center gap-1 transition-all"
                    style={direction === d
                      ? d === "BUY"
                        ? { background: "linear-gradient(135deg,#065f46,#047857)", color: "#d1fae5", borderBottom: "2px solid #10b981" }
                        : { background: "linear-gradient(135deg,#7f1d1d,#b91c1c)", color: "#fee2e2", borderBottom: "2px solid #ef4444" }
                      : { color: "#374151" }
                    }>
                    {d === "BUY" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {d}
                  </button>
                ))}
              </div>

              {/* Instrument + entry price display */}
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] text-slate-500">{selectedPair.symbol}</span>
                <span className="price-mono text-sm font-black" style={{ color: direction === "BUY" ? "#10b981" : "#ef4444" }}>
                  {fmt(direction === "BUY" ? selectedPair.ask : selectedPair.bid, selectedPair.symbol)}
                </span>
              </div>

              {/* Lot size */}
              <div className="mb-1.5">
                <label className="text-[9px] font-bold tracking-widest text-slate-600 uppercase block mb-1">Volume (Lots)</label>
                <input type="number" value={lotSize} onChange={(e) => setLotSize(e.target.value)}
                  step="0.01" min="0.01" max="100"
                  className="w-full price-mono text-sm font-black text-white focus:outline-none px-2 py-1.5"
                  style={{ background: "#070a10", border: "1px solid #1e2d45", borderRadius: 4 }}
                  placeholder="0.01" />
              </div>

              {/* Leverage */}
              <div className="mb-1.5">
                <label className="text-[9px] font-bold tracking-widest text-slate-600 uppercase block mb-1">Leverage</label>
                <select value={leverage} onChange={(e) => setLeverage(e.target.value)}
                  className="w-full price-mono text-sm font-black text-white focus:outline-none px-2 py-1.5 appearance-none"
                  style={{ background: "#070a10", border: "1px solid #1e2d45", borderRadius: 4 }}>
                  {["10", "25", "50", "100", "200", "500"].map((l) => <option key={l} value={l} style={{ background: "#080c14" }}>1:{l}</option>)}
                </select>
              </div>

              {/* SL */}
              <div className="mb-1.5">
                <label className="text-[9px] font-bold tracking-widest uppercase block mb-1 flex items-center gap-1" style={{ color: "#ef4444" }}>
                  <ShieldAlert className="h-2.5 w-2.5" />Stop Loss
                </label>
                <input type="number" value={sl} onChange={(e) => setSl(e.target.value)}
                  className="w-full price-mono text-sm text-white focus:outline-none px-2 py-1.5"
                  style={{ background: "#070a10", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 4 }}
                  placeholder={fmt(midPrice * (direction === "BUY" ? 0.999 : 1.001), selectedPair.symbol)} />
              </div>

              {/* TP */}
              <div className="mb-2">
                <label className="text-[9px] font-bold tracking-widest uppercase block mb-1 flex items-center gap-1" style={{ color: "#10b981" }}>
                  <Target className="h-2.5 w-2.5" />Take Profit
                </label>
                <input type="number" value={tp} onChange={(e) => setTp(e.target.value)}
                  className="w-full price-mono text-sm text-white focus:outline-none px-2 py-1.5"
                  style={{ background: "#070a10", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 4 }}
                  placeholder={fmt(midPrice * (direction === "BUY" ? 1.001 : 0.999), selectedPair.symbol)} />
              </div>

              {/* Order metrics grid */}
              <div className="grid grid-cols-2 gap-1 mb-2">
                {[
                  { label: "Margin", value: `$${isNaN(estimatedMargin) ? "—" : estimatedMargin.toLocaleString()}`, color: "#f59e0b" },
                  { label: "Pip Val", value: `$${pipValue.toFixed(2)}`, color: "#22d3ee" },
                  { label: "Notional", value: `$${((parseFloat(lotSize) || 0.01) * contractSize(selectedPair.symbol)).toLocaleString()}`, color: "#a78bfa" },
                  { label: "Leverage", value: `×${leverage}`, color: "#fb923c" },
                ].map((item) => (
                  <div key={item.label} className="px-2 py-1.5" style={{ background: "#070a10", border: "1px solid #1a2640", borderRadius: 3 }}>
                    <p className="text-[8px] text-slate-700 mb-0.5 tracking-wider uppercase">{item.label}</p>
                    <p className="price-mono text-[10px] font-black" style={{ color: item.color }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* R:R metrics when SL/TP set */}
              {(slVal !== null || tpVal !== null) && (
                <div className="mb-2 px-2 py-1.5 text-[10px]" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.18)", borderRadius: 3 }}>
                  {slVal !== null && <div className="flex justify-between"><span className="text-slate-600">Max Loss</span><span className="price-mono font-black text-red-400">-${maxLoss.toFixed(2)} ({slPips.toFixed(1)}p)</span></div>}
                  {tpVal !== null && <div className="flex justify-between"><span className="text-slate-600">Max Gain</span><span className="price-mono font-black text-emerald-400">+${maxGain.toFixed(2)} ({tpPips.toFixed(1)}p)</span></div>}
                  {rrRatio !== null && <div className="flex justify-between"><span className="text-slate-600">R:R</span><span className="price-mono font-black text-cyan-400">1:{rrRatio}</span></div>}
                </div>
              )}

              {/* Balance warning */}
              {balanceLoaded && estimatedMargin > walletBalance && (
                <div className="flex items-center gap-1.5 px-2 py-1.5 mb-2 text-[10px] font-bold"
                  style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", borderRadius: 3 }}>
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  Insufficient — need ${estimatedMargin.toFixed(2)}
                </div>
              )}

              {/* Execute button */}
              <button onClick={executeTrade} disabled={balanceLoaded && estimatedMargin > walletBalance}
                className="w-full py-2.5 font-black text-xs tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderRadius: 4,
                  ...(direction === "BUY"
                    ? { background: "linear-gradient(135deg,#065f46,#047857)", color: "#d1fae5", boxShadow: "0 4px 16px rgba(16,185,129,0.35)" }
                    : { background: "linear-gradient(135deg,#7f1d1d,#b91c1c)", color: "#fee2e2", boxShadow: "0 4px 16px rgba(239,68,68,0.35)" }) }}>
                <Zap className="h-3.5 w-3.5" />
                {direction} {selectedPair.symbol}
              </button>

              <div className="my-2" style={{ height: 1, background: "#1a2640" }} />

              {/* Quick trade strip */}
              <p className="text-[8px] font-black text-slate-700 tracking-widest uppercase mb-1.5">Quick Trade</p>
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
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 p-4 gap-2">
              <Activity className="h-8 w-8 text-slate-800" />
              <p className="text-[10px] text-slate-700 text-center">Select an instrument to place an order</p>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
           BOTTOM BLOTTER: Positions / History / Depth
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col shrink-0" style={{ height: 200, background: "#060a12", borderTop: "1px solid #1e2d45" }}>
        {/* Tab bar */}
        <div className="flex items-center shrink-0" style={{ borderBottom: "1px solid #1a2640", background: "#060a12" }}>
          {([
            { id: "positions", label: `Open Positions (${openTrades.length})`, icon: Layers },
            { id: "history",   label: `Trade History (${closedTrades.length})`, icon: History },
            { id: "depth",     label: "Order Depth", icon: BarChart2 },
          ] as { id: "positions" | "history" | "depth"; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActivePanel(id)}
              className="flex items-center gap-1.5 px-4 py-2 text-[9px] font-black tracking-wider uppercase transition-all"
              style={activePanel === id
                ? { color: "#22d3ee", borderBottom: "2px solid #22d3ee", background: "rgba(34,211,238,0.04)" }
                : { color: "#374151", borderBottom: "2px solid transparent" }}>
              <Icon className="h-3 w-3" />{label}
            </button>
          ))}
        </div>

        {/* Blotter content */}
        <div className="flex-1 overflow-y-auto terminal-scroll">

          {/* ── Open Positions (BiDana-style cards) ── */}
          {activePanel === "positions" && (
            openTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-700">
                <BarChart2 className="h-8 w-8 opacity-20" />
                <span className="text-[11px] tracking-wider font-bold uppercase">No open positions</span>
              </div>
            ) : (
              <div className="p-2 flex flex-col gap-2 overflow-y-auto">
                {openTrades.map((trade) => {
                  const isBuy   = trade.direction === "BUY"
                  const pnlPos  = trade.pnl >= 0
                  const pnlClr  = pnlPos  ? "#10b981" : "#ef4444"
                  const dirBg   = isBuy   ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"
                  const dirClr  = isBuy   ? "#10b981"               : "#ef4444"
                  const notional = parseFloat((trade.lotSize * contractSize(trade.pair) * trade.currentPrice).toFixed(2))
                  // Liquidation price estimate (simplified: margin / notional away from entry)
                  const liqOffset = (trade.margin / (trade.lotSize * contractSize(trade.pair))) * (isBuy ? -1 : 1)
                  const liqPrice  = parseFloat((trade.openPrice + liqOffset).toFixed(pip(trade.pair) < 0.001 ? 5 : 2))
                  // Risk % = margin / total balance *100 — use returnOnMargin as proxy
                  const riskPct = Math.abs(trade.returnOnMargin).toFixed(2)
                  // Pair display name
                  const base  = trade.pair.slice(0, 3)
                  const quote = trade.pair.slice(3)
                  const isCrypto = ["BTC","ETH","SOL","BNB","XRP"].includes(base)
                  const isGold   = base === "XAU"

                  return (
                    <div
                      key={trade.id}
                      className="rounded-xl price-mono text-[11px]"
                      style={{ background: "#0d1625", border: "1px solid #1a2a42" }}
                    >
                      {/* ── Card header ── */}
                      <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: "1px solid #1a2a42" }}>
                        <div className="flex items-center gap-2">
                          {/* Instrument icon */}
                          <div className="flex items-center justify-center w-7 h-7 rounded-full font-black text-[10px]"
                            style={{ background: isGold ? "#b45309" : isCrypto ? "#1d4ed8" : "#0f4c81", color: "#fff" }}>
                            {isGold ? "Au" : isCrypto ? base.slice(0,2) : base.slice(0,2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-white text-[13px] tracking-wide">{trade.pair}</span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider"
                                style={{ background: dirBg, color: dirClr }}>
                                {trade.direction}
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-600 tracking-wide">
                              {isCrypto ? "Crypto" : isGold ? "Gold" : `${base} / ${quote}`} &nbsp;&bull;&nbsp; {trade.lotSize} Lot
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-600">{trade.openTime}</span>
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <span className="text-[9px] font-bold" style={{ color: "#f59e0b" }}>
                              1:{trade.leverage}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ── PnL + ROE row ── */}
                      <div className="flex items-end justify-between px-3 py-2.5" style={{ borderBottom: "1px solid #1a2a42" }}>
                        <div>
                          <p className="text-[9px] text-slate-600 mb-0.5">PnL (USD)</p>
                          <p className="text-[22px] font-black leading-none tracking-tight" style={{ color: pnlClr }}>
                            {pnlPos ? "+" : ""}{trade.pnl.toFixed(2)}
                          </p>
                          <p className="text-[9px] mt-0.5" style={{ color: pnlClr }}>
                            {trade.pips >= 0 ? "+" : ""}{trade.pips.toFixed(1)} pips
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-slate-600 mb-0.5">ROE</p>
                          <p className="text-[18px] font-black leading-none" style={{ color: pnlClr }}>
                            {trade.returnOnMargin >= 0 ? "+" : ""}{trade.returnOnMargin.toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      {/* ── Amount / Margin / Risk ── */}
                      <div className="grid grid-cols-3 px-3 py-2" style={{ borderBottom: "1px solid #1a2a42", gap: "0 8px" }}>
                        <div>
                          <p className="text-[9px] text-slate-600 mb-0.5">Amount (USD)</p>
                          <p className="font-bold text-slate-300 text-[11px]">{notional.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-600 mb-0.5">Margin (USD)</p>
                          <p className="font-bold text-slate-300 text-[11px]">{trade.margin.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-slate-600 mb-0.5">Risk</p>
                          <p className="font-black text-[11px]" style={{ color: "#f87171" }}>{riskPct}%</p>
                        </div>
                      </div>

                      {/* ── Price levels ── */}
                      <div className="grid grid-cols-3 px-3 py-2" style={{ borderBottom: "1px solid #1a2a42", gap: "0 8px" }}>
                        <div>
                          <p className="text-[9px] text-slate-600 mb-0.5">Entry Price (USD)</p>
                          <p className="font-bold text-slate-400 text-[11px]">{fmt(trade.openPrice, trade.pair)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-600 mb-0.5">Mark Price (USD)</p>
                          <p className="font-black text-[11px]" style={{ color: pnlClr }}>{fmt(trade.currentPrice, trade.pair)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-slate-600 mb-0.5">Liq. Price (USD)</p>
                          <p className="font-bold text-slate-400 text-[11px]">{fmt(liqPrice, trade.pair)}</p>
                        </div>
                      </div>

                      {/* ── SL / TP levels (if set) ── */}
                      {(trade.sl || trade.tp) && (
                        <div className="grid grid-cols-2 px-3 py-2" style={{ borderBottom: "1px solid #1a2a42", gap: "0 8px" }}>
                          <div>
                            <p className="text-[9px] text-slate-600 mb-0.5">Stop Loss</p>
                            <p className="font-bold text-[11px] text-red-500">{trade.sl ? fmt(trade.sl, trade.pair) : "—"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] text-slate-600 mb-0.5">Take Profit</p>
                            <p className="font-bold text-[11px] text-emerald-500">{trade.tp ? fmt(trade.tp, trade.pair) : "—"}</p>
                          </div>
                        </div>
                      )}

                      {/* ── Action buttons ── */}
                      <div className="flex gap-2 px-3 py-2.5">
                        {/* Take Profit button — only if TP set, else greyed */}
                        <button
                          onClick={() => {
                            // Manually close at current price as take-profit
                            if (trade.pnl > 0) closeTrade(trade.id)
                          }}
                          className="flex-1 py-2 rounded-lg font-black text-[12px] tracking-wide transition-all active:scale-[0.97]"
                          style={{
                            background: trade.pnl > 0 ? "linear-gradient(135deg,#065f46,#059669)" : "rgba(16,185,129,0.1)",
                            color: trade.pnl > 0 ? "#fff" : "#10b981",
                            border: `1px solid ${trade.pnl > 0 ? "#059669" : "rgba(16,185,129,0.25)"}`,
                          }}
                        >
                          Take Profit
                        </button>
                        {/* Stop Loss */}
                        <button
                          onClick={() => {
                            if (trade.pnl < 0) closeTrade(trade.id)
                          }}
                          className="flex-1 py-2 rounded-lg font-black text-[12px] tracking-wide transition-all active:scale-[0.97]"
                          style={{
                            background: trade.pnl < 0 ? "linear-gradient(135deg,#7f1d1d,#dc2626)" : "rgba(239,68,68,0.1)",
                            color: trade.pnl < 0 ? "#fff" : "#ef4444",
                            border: `1px solid ${trade.pnl < 0 ? "#dc2626" : "rgba(239,68,68,0.25)"}`,
                          }}
                        >
                          Stop Loss
                        </button>
                        {/* Close position */}
                        <button
                          onClick={() => closeTrade(trade.id)}
                          className="flex-1 py-2 rounded-lg font-black text-[12px] tracking-wide transition-all active:scale-[0.97] text-slate-300 hover:text-white"
                          style={{ background: "transparent", border: "1px solid #2a3f5f" }}
                        >
                          Close
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
                    {["Symbol","Dir","Lots","Open","Close","P&L","Pips","Time","Reason"].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left text-[8px] font-bold tracking-widest text-slate-700 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {closedTrades.slice(0, 50).map((trade) => {
                    const pc = trade.finalPnl >= 0 ? "#10b981" : "#ef4444"
                    return (
                      <tr key={trade.id} className="border-b hover:bg-white/[0.015] transition-colors" style={{ borderColor: "#0f1a2e" }}>
                        <td className="px-2 py-1.5 font-black text-white">{trade.pair}</td>
                        <td className="px-2 py-1.5">
                          <span className="px-1.5 py-0.5 font-black text-[8px] uppercase" style={{
                            background: trade.direction === "BUY" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                            color: trade.direction === "BUY" ? "#10b981" : "#ef4444",
                            border: `1px solid ${trade.direction === "BUY" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                            borderRadius: 3 }}>
                            {trade.direction}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-slate-400">{trade.lotSize}</td>
                        <td className="px-2 py-1.5 text-slate-400">{fmt(trade.openPrice, trade.pair)}</td>
                        <td className="px-2 py-1.5 text-slate-400">{fmt(trade.closePrice, trade.pair)}</td>
                        <td className="px-2 py-1.5 font-black" style={{ color: pc }}>{trade.finalPnl >= 0 ? "+" : ""}${trade.finalPnl.toFixed(2)}</td>
                        <td className="px-2 py-1.5" style={{ color: pc }}>—</td>
                        <td className="px-2 py-1.5 text-slate-600">{trade.openTime}</td>
                        <td className="px-2 py-1.5">
                          {trade.closeReason !== "manual" && (
                            <span className="px-1.5 py-0.5 text-[8px] font-black uppercase" style={{
                              background: trade.closeReason === "tp" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                              color: trade.closeReason === "tp" ? "#10b981" : "#ef4444",
                              borderRadius: 3 }}>
                              {trade.closeReason.toUpperCase()}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )
          )}

          {/* ── Order Depth ── */}
          {activePanel === "depth" && selectedPair && (
            <div className="p-3">
              <OrderDepth pair={selectedPair} />
            </div>
          )}
          {activePanel === "depth" && !selectedPair && (
            <div className="flex items-center justify-center h-full text-slate-700 text-[11px] tracking-wider">Select an instrument to view depth</div>
          )}
        </div>
      </div>

    </div>
  )
}

