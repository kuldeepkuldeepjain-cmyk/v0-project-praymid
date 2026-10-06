"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { normalizeTimestamp } from "@/lib/normalize-timestamp"
import { decimals as instrumentDecimals } from "@/lib/forex-instruments"
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type HistogramData,
  ColorType,
  CrosshairMode,
  LineStyle,
  type Time,
} from "lightweight-charts"

// ─── Types ────────────────────────────────────────────────────────────────────

export type Candle = {
  time: unknown
  open: number
  high: number
  low: number
  close: number
  volume: number
  ts?: unknown
}

export type OpenTrade = {
  id: string
  pair: string
  direction: "BUY" | "SELL"
  openPrice: number
  sl: number | null
  tp: number | null
}

type IndicatorKey = "ema9" | "ema21" | "ema50" | "bb" | "rsi" | "macd" | "volume"

type PriceAlert = {
  id: number
  price: number
  label: string
  hit: boolean
}

// ─── Theme ────────────────────────────────────────────────────────────────────

// TradingView-accurate palette: flat background, muted grid, #26a69a/#ef5350 candles
const T = {
  bg:          "#070b13",
  bgSurface:   "#0d1625",
  bgHover:     "#142238",
  border:      "#1e2d45",
  borderMuted: "#15243a",
  textMuted:   "#7890ad",
  textDim:     "#a7bad1",
  textBase:    "#e5eef9",
  green:       "#10b981",
  greenBright: "#34d399",
  red:         "#ef4444",
  redBright:   "#f87171",
  cyan:        "#22d3ee",
  amber:       "#fbbf24",
  blue:        "#60a5fa",
  pink:        "#f472b6",
  purple:      "#a78bfa",
  orange:      "#fb923c",
  emerald:     "#34d399",
}

const DARK_T = {
  bg: "#131722", bgSurface: "#131722", bgHover: "#1e222d",
  border: "#2a2e39", borderMuted: "#1e222d",
  textMuted: "#787b86", textDim: "#b2b5be", textBase: "#d1d4dc",
  green: "#089981", greenBright: "#26a69a", red: "#f23645", redBright: "#ef5350",
  cyan: "#2962ff", amber: "#fbbf24", blue: "#60a5fa", pink: "#f472b6",
  purple: "#a78bfa", orange: "#fb923c", emerald: "#26a69a",
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

function calcEMA(closes: number[], period: number): (number | null)[] {
  if (!Array.isArray(closes) || closes.length === 0 || period <= 0) return []
  const k = 2 / (period + 1)
  const result: (number | null)[] = new Array(closes.length).fill(null)
  let ema: number | null = null
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) continue
    if (ema === null) ema = closes.slice(0, period).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) / period
    else ema = closes[i] * k + ema * (1 - k)
    result[i] = Number.isFinite(ema) ? ema : null
  }
  return result
}

function calcBB(closes: number[], period = 20, mult = 2) {
  const upper: (number | null)[] = [], mid: (number | null)[] = [], lower: (number | null)[] = []
  if (!Array.isArray(closes) || closes.length === 0) return { upper, mid, lower }
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { upper.push(null); mid.push(null); lower.push(null); continue }
    const sl = closes.slice(i - period + 1, i + 1)
    const sma = sl.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) / period
    const sd = Math.sqrt(sl.reduce((s, v) => s + ((v - sma) ** 2), 0) / period)
    upper.push(Number.isFinite(sma + mult * sd) ? sma + mult * sd : null)
    mid.push(Number.isFinite(sma) ? sma : null)
    lower.push(Number.isFinite(sma - mult * sd) ? sma - mult * sd : null)
  }
  return { upper, mid, lower }
}

function calcRSI(closes: number[], period = 14): (number | null)[] {
  if (!Array.isArray(closes) || closes.length === 0) return []
  const result: (number | null)[] = new Array(closes.length).fill(null)
  if (closes.length < period + 1) return result
  let ag = 0, al = 0
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1]
    if (d > 0) ag += d; else al -= d
  }
  ag /= period; al /= period
  result[period] = 100 - 100 / (1 + (al === 0 ? Infinity : ag / al))
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    ag = (ag * (period - 1) + Math.max(d, 0)) / period
    al = (al * (period - 1) + Math.max(-d, 0)) / period
    result[i] = 100 - 100 / (1 + (al === 0 ? Infinity : ag / al))
  }
  return result
}

function calcMACD(closes: number[]) {
  if (!Array.isArray(closes) || closes.length === 0) return { macd: [], signal: [], hist: [] }
  const ema12 = calcEMA(closes, 12)
  const ema26 = calcEMA(closes, 26)
  const macd: (number | null)[] = closes.map((_, i) =>
    ema12[i] != null && ema26[i] != null ? ema12[i]! - ema26[i]! : null)
  const rawSig = calcEMA(macd.map((v) => v ?? 0), 9)
  const signal: (number | null)[] = macd.map((v, i) => (v != null ? rawSig[i] : null))
  const hist: (number | null)[] = macd.map((v, i) =>
    v != null && signal[i] != null ? v - signal[i]! : null)
  return { macd, signal, hist }
}

const TF_SECONDS: Record<string, number> = {
  "1M": 60, "5M": 300, "15M": 900, "30M": 1800, "1H": 3600, "4H": 14400, "1D": 86400, "1W": 604800,
}

function toTimestamp(c: Candle | null | undefined, idx: number, tfSeconds = 300): number {
  if (!c || typeof c !== "object") return 1704067200 + idx * tfSeconds
  const timestamp = normalizeTimestamp(c.ts ?? c.time)
  if (Number.isFinite(timestamp) && timestamp > 0) return Math.floor(timestamp / 1000)
  return 1704067200 + idx * tfSeconds
}

// ─── OHLCV Info Bar state ─────────────────────────────────────────────────────

type OHLCVInfo = {
  open: number; high: number; low: number; close: number; volume: number; isUp: boolean
} | null

// ─── TradingChart ─────────────────────────────────────────────────────────────

export function TradingChart({
  candles,
  sym,
  tf = "5M",
  openTrades = [],
  onExpand,
  isExpanded = false,
  onQuickTrade,
  buyPrice,
  sellPrice,
  darkTheme = false,
  marketStatus = "connecting",
  }: {
  candles: Candle[] | null | undefined
  sym: string | null | undefined
  tf?: string
  marketStatus?: "live" | "reconnecting" | "connecting"
  openTrades?: OpenTrade[]
  onExpand?: () => void
  isExpanded?: boolean
  onQuickTrade?: (direction: "BUY" | "SELL") => void
  buyPrice?: number
  sellPrice?: number
  darkTheme?: boolean
  }) {
  const safeSymbol = typeof sym === "string" && sym.trim() ? sym : "EUR/USD"
  const safeCandles = Array.isArray(candles) ? candles : []
  const palette = darkTheme ? DARK_T : T
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)

  // Series refs
  const candleSerRef  = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const volSerRef     = useRef<ISeriesApi<"Histogram"> | null>(null)
  const candleCountRef = useRef(0)
  const lastCandleTimeRef = useRef<number | null>(null)
  const userAdjustedViewRef = useRef(false)
  const autoFitRequestedRef = useRef(true)
  const ema9Ref       = useRef<ISeriesApi<"Line"> | null>(null)
  const ema21Ref      = useRef<ISeriesApi<"Line"> | null>(null)
  const ema50Ref      = useRef<ISeriesApi<"Line"> | null>(null)
  const bbUpperRef    = useRef<ISeriesApi<"Line"> | null>(null)
  const bbMidRef      = useRef<ISeriesApi<"Line"> | null>(null)
  const bbLowerRef    = useRef<ISeriesApi<"Line"> | null>(null)
  const rsiSerRef     = useRef<ISeriesApi<"Line"> | null>(null)
  const rsiOb70Ref    = useRef<ISeriesApi<"Line"> | null>(null)
  const rsiOs30Ref    = useRef<ISeriesApi<"Line"> | null>(null)
  const macdSerRef    = useRef<ISeriesApi<"Line"> | null>(null)
  const macdSigRef    = useRef<ISeriesApi<"Line"> | null>(null)
  const macdHistRef   = useRef<ISeriesApi<"Histogram"> | null>(null)

  const [indicators, setIndicators] = useState<Record<IndicatorKey, boolean>>({
    ema9: true, ema21: true, ema50: false, bb: false, rsi: false, macd: false, volume: true,
  })
  const [chartPane, setChartPane] = useState<"rsi" | "macd" | "none">("rsi")
  const [ohlcv, setOhlcv] = useState<OHLCVInfo>(null)
  const [crosshairActive, setCrosshairActive] = useState(false)

  // Price alerts ─────���──────────────────��────────────────────────────────────
  const [alerts, setAlerts]             = useState<PriceAlert[]>([])
  const [alertMode, setAlertMode]       = useState(false)      // true = click-to-set mode
  const [showAlertPanel, setShowAlertPanel] = useState(false)
  const alertsRef                       = useRef<PriceAlert[]>([])
  const alertNextId                     = useRef(1)
  alertsRef.current = alerts

  const dec = instrumentDecimals(safeSymbol)

  // ── Data processing ──────────────────────────────────────────────────────────
  const { candleData, volData, closes, times } = useMemo(() => {
    const candleData: CandlestickData[] = []
    const volData: HistogramData[]      = []
    const closes: number[]              = []
    const times: Time[]                 = []
    const tfSecs = TF_SECONDS[tf] ?? 300
    const normalizedCandles = safeCandles
      .filter((c): c is NonNullable<typeof c> => c != null && typeof c === "object")
      .map((c, i) => ({ candle: c, time: toTimestamp(c, i, tfSecs) }))
      .filter(({ candle: c, time }) => {
        const open = Number(c.open)
        const high = Number(c.high)
        const low = Number(c.low)
        const close = Number(c.close)
        const volume = Number(c.volume)
        return Number.isFinite(time) && time > 0 && [open, high, low, close, volume].every(Number.isFinite)
          && high >= low && open > 0 && close > 0
      })
      .sort((a, b) => a.time - b.time)
      .filter((entry, index, entries) => index === 0 || entry.time !== entries[index - 1].time)
    normalizedCandles.forEach(({ candle: c, time: rawTime }) => {
  const open = Number(c.open)
  const high = Number(c.high)
  const low = Number(c.low)
  const close = Number(c.close)
  const volume = Number(c.volume)
  const t = rawTime as Time
  const normalizedHigh = Math.max(high, open, close)
  const normalizedLow = Math.min(low, open, close)
  const isUp = close >= open
  candleData.push({ time: t, open, high: normalizedHigh, low: normalizedLow, close })
  volData.push({
  time: t,
  value: Math.max(0, volume),
  color: isUp ? "rgba(22,217,130,0.55)" : "rgba(255,71,87,0.55)",
  })
  closes.push(close)
  times.push(t)
  })
    return { candleData, volData, closes, times }
  }, [candles, tf])

  const priceEnvelope = useMemo(() => {
    if (candleData.length === 0) return null
    const recent = candleData.slice(-Math.min(48, candleData.length))
    const high = Math.max(...recent.map((c) => c.high))
    const low = Math.min(...recent.map((c) => c.low))
    const ranges = recent.map((c) => Math.max(0, c.high - c.low)).filter(Number.isFinite)
    const atr = ranges.length ? ranges.reduce((sum, range) => sum + range, 0) / ranges.length : 0
    const last = candleData[candleData.length - 1]
    const rawRange = Math.max(0, high - low)
    // Keep the primary scale focused on the active market window. A large
    // ATR multiplier makes high-priced crypto look flat on small screens.
    const tickFloor = Math.abs(last.close) * Math.pow(10, -dec) * 12
    const rangeFloor = Math.max(atr * 2.25, tickFloor, Math.abs(last.close) * 0.0015)
    const range = Math.max(rawRange, rangeFloor)
    const padding = Math.min(0.04, Math.max(0.015, (atr / Math.max(range, 1)) * 0.5))
    return { min: low - range * padding, max: high + range * padding, atr, range }
  }, [candleData, dec])

  const ema9d  = useMemo(() => calcEMA(closes, 9),  [closes])
  const ema21d = useMemo(() => calcEMA(closes, 21), [closes])
  const ema50d = useMemo(() => calcEMA(closes, 50), [closes])
  const bbd    = useMemo(() => calcBB(closes),       [closes])
  const rsid   = useMemo(() => calcRSI(closes),      [closes])
  const macdd  = useMemo(() => calcMACD(closes),     [closes])

  function toLineData(arr: (number | null)[]): LineData[] {
    return arr
      .map((v, i) => ({ time: times[i], value: v ?? NaN }))
      .filter((d) => Number.isFinite(Number(d.time)) && Number(d.time) > 0 && Number.isFinite(d.value as number))
  }
  function toHistData(arr: (number | null)[], pos: string, neg: string): HistogramData[] {
    return arr
      .map((v, i) => ({ time: times[i], value: v ?? NaN, color: (v ?? 0) >= 0 ? pos : neg }))
      .filter((d) => Number.isFinite(Number(d.time)) && Number(d.time) > 0 && Number.isFinite(d.value as number))
  }

  // ── Create chart on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: palette.bg },
        textColor:  palette.textDim,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif",
        fontSize:   12,
        attributionLogo: false,
      },
  grid: {
  vertLines: { color: "rgba(148,163,184,0.09)", style: LineStyle.Solid },
  horzLines: { color: "rgba(148,163,184,0.13)", style: LineStyle.Solid },
  },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: {
          color: "rgba(148,163,184,0.72)",
          labelBackgroundColor: "#334155",
          style: LineStyle.Dashed,
          width: 1,
          labelVisible: true,
        },
        horzLine: {
          color: "rgba(148,163,184,0.72)",
          labelBackgroundColor: "#334155",
          style: LineStyle.Dashed,
          width: 1,
          labelVisible: true,
        },
      },
      rightPriceScale: {
        borderColor: palette.border,
        textColor:   palette.textDim,
        scaleMargins: { top: 0.08, bottom: 0.18 },
        entireTextOnly: false,
        autoScale: true,
        ticksVisible: true,
        borderVisible: true,
      },
      timeScale: {
        borderColor:    "rgba(148,163,184,0.22)",
        timeVisible:    true,
        secondsVisible: false,
        fixLeftEdge:    false,
        fixRightEdge:   false,
        rightOffset:    6,
        barSpacing:     8,
        minBarSpacing:  3,
        lockVisibleTimeRangeOnResize: true,
        rightBarStaysOnScroll: true,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale:  { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    })

    chartRef.current = chart
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range && !autoFitRequestedRef.current) userAdjustedViewRef.current = true
      autoFitRequestedRef.current = false
    })
    // ── Candles: TradingView-standard teal/red, borderless bodies ──
    const cSer = chart.addSeries(CandlestickSeries, {
      upColor:          "#26a69a",
      downColor:        "#ef5350",
      borderUpColor:    "#26a69a",
      borderDownColor:  "#ef5350",
      wickUpColor:      "#26a69a",
      wickDownColor:    "#ef5350",
      borderVisible:    true,
      wickVisible:      true,
      // Keep bodies and wicks legible on narrow screens while preserving the
      // selected instrument's native precision and tick size.
      priceFormat: { type: "price", precision: dec, minMove: Math.pow(10, -dec) },
      priceLineVisible: true,
      priceLineWidth:   1,
      priceLineStyle:   LineStyle.Dashed,
      lastValueVisible: true,
    })
    candleSerRef.current = cSer

    // ── Volume bars ──
    const vSer = chart.addSeries(HistogramSeries, {
      priceFormat:  { type: "volume" },
      priceScaleId: "vol",
      lastValueVisible: false,
      priceLineVisible: false,
    })
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
      visible: false,
    })
    volSerRef.current = vSer

    // ── EMA lines ──
    const mkLine = (color: string, width = 1) => chart.addSeries(LineSeries, {
      color, lineWidth: width as 1 | 2 | 3 | 4,
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      priceFormat: { type: "price", precision: dec, minMove: Math.pow(10, -dec) },
    })
    ema9Ref.current  = mkLine(palette.amber, 1)
    ema21Ref.current = mkLine(palette.blue,  1)
    ema50Ref.current = mkLine(palette.pink,  1)

    // ── Bollinger Bands ──
    bbUpperRef.current = mkLine("rgba(129,140,248,0.6)", 1)
    bbMidRef.current   = mkLine("rgba(129,140,248,0.3)", 1)
    bbLowerRef.current = mkLine("rgba(129,140,248,0.6)", 1)

    // ── RSI sub-pane ──
    const rsiSer = chart.addSeries(LineSeries, {
      color: palette.emerald, lineWidth: 1,
      priceScaleId: "rsi",
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    })
    chart.priceScale("rsi").applyOptions({ scaleMargins: { top: 0.99, bottom: 0 }, visible: false })
    rsiSerRef.current = rsiSer

    rsiOb70Ref.current = chart.addSeries(LineSeries, { color: "rgba(239,83,80,0.25)",   lineWidth: 1, priceScaleId: "rsi", priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })
    rsiOs30Ref.current = chart.addSeries(LineSeries, { color: "rgba(38,166,154,0.25)",  lineWidth: 1, priceScaleId: "rsi", priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })

    // ── MACD sub-pane ──
    macdSerRef.current  = chart.addSeries(LineSeries, { color: palette.orange, lineWidth: 1, priceScaleId: "macd", priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })
    macdSigRef.current  = chart.addSeries(LineSeries, { color: palette.purple, lineWidth: 1, priceScaleId: "macd", priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })
    macdHistRef.current = chart.addSeries(HistogramSeries, { priceScaleId: "macd", priceLineVisible: false, lastValueVisible: false })
    chart.priceScale("macd").applyOptions({ scaleMargins: { top: 0.99, bottom: 0 }, visible: false })

    // ── Crosshair OHLCV subscriber ──
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || param.seriesData.size === 0) {
        setCrosshairActive(false)
        setOhlcv(null)
        return
      }
      const cd = param.seriesData.get(cSer) as CandlestickData | undefined
      const vd = param.seriesData.get(vSer) as HistogramData | undefined
      if (!cd) return
      setCrosshairActive(true)
      setOhlcv({
        open:   cd.open,
        high:   cd.high,
        low:    cd.low,
        close:  cd.close,
        volume: (vd?.value as number) ?? 0,
        isUp:   cd.close >= cd.open,
      })
    })

    // ── Click-to-set price alert ──
    chart.subscribeClick((param) => {
      if (!param.point) return
      const price = cSer.coordinateToPrice(param.point.y)
      if (price == null) return
      const roundedPrice = parseFloat(price.toFixed(dec))

      if (containerRef.current?.dataset.alertmode) {
        const id = alertNextId.current++
        setAlerts((prev) => [...prev, { id, price: roundedPrice, label: `Alert ${id}`, hit: false }])
        setShowAlertPanel(true)
        return
      }
    })

    // ── Resize observer ──
    // lightweight-charts can synchronously change its internal layout while it is
    // being resized. Coalesce observer callbacks and only resize when the actual
    // container dimensions changed to avoid a ResizeObserver feedback loop.
    let frameId: number | null = null
    let lastWidth = containerRef.current.clientWidth
    let lastHeight = containerRef.current.clientHeight

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry || frameId !== null) return

      frameId = requestAnimationFrame(() => {
        frameId = null
        const width = Math.round(entry.contentRect.width)
        const height = Math.round(entry.contentRect.height)
        if (!chartRef.current || width <= 0 || height <= 0) return
        if (width === lastWidth && height === lastHeight) return

        lastWidth = width
        lastHeight = height
        chartRef.current.resize(width, height)
      })
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      if (frameId !== null) cancelAnimationFrame(frameId)
      chart.remove()
      chartRef.current     = null
  candleCountRef.current = 0
  lastCandleTimeRef.current = null
  candleSerRef.current = null
      volSerRef.current    = null
      ema9Ref.current      = null
      ema21Ref.current     = null
      ema50Ref.current     = null
      bbUpperRef.current   = null
      bbMidRef.current     = null
      bbLowerRef.current   = null
      rsiSerRef.current    = null
      rsiOb70Ref.current   = null
      rsiOs30Ref.current   = null
      macdSerRef.current   = null
      macdSigRef.current   = null
      macdHistRef.current  = null
    }
  }, [darkTheme]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update candle + volume data ──────────────────────────────────────────────
  useEffect(() => {
    if (!candleSerRef.current || !volSerRef.current || candleData.length === 0) return
  const previousCount = candleCountRef.current
  const latestTime = Number(candleData[candleData.length - 1]?.time)
  const canIncrementallyUpdate = previousCount === candleData.length
    && previousCount > 0
    && Number.isFinite(latestTime)
    && lastCandleTimeRef.current === latestTime

  if (canIncrementallyUpdate) {
    candleSerRef.current.update(candleData[candleData.length - 1])
    volSerRef.current.update(volData[volData.length - 1])
  } else {
    candleSerRef.current.setData(candleData)
    volSerRef.current.setData(volData)
    candleCountRef.current = candleData.length
  }
  if (Number.isFinite(latestTime)) lastCandleTimeRef.current = latestTime
    if (chartRef.current && previousCount !== candleData.length && !userAdjustedViewRef.current) {
      const visibleBars = candleData.length > 120 ? 90 : Math.min(90, candleData.length)
      const from = Math.max(0, candleData.length - visibleBars)
      autoFitRequestedRef.current = true
      chartRef.current.timeScale().setVisibleLogicalRange({ from, to: candleData.length + 6 })
    }
    // Seed OHLCV from last candle
    const last = candleData[candleData.length - 1]
    if (last) setOhlcv({ open: last.open, high: last.high, low: last.low, close: last.close, volume: volData[volData.length - 1]?.value ?? 0, isUp: last.close >= last.open })
  }, [candleData, volData, candles])

  // ── Update EMA ───────────────────────────────��───��───────────────────────────
  useEffect(() => {
    if (!ema9Ref.current || times.length === 0) return
    ema9Ref.current.setData(indicators.ema9 ? toLineData(ema9d) : [])
    ema9Ref.current.applyOptions({ visible: indicators.ema9 })
  }, [ema9d, indicators.ema9, times]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ema21Ref.current || times.length === 0) return
    ema21Ref.current.setData(indicators.ema21 ? toLineData(ema21d) : [])
    ema21Ref.current.applyOptions({ visible: indicators.ema21 })
  }, [ema21d, indicators.ema21, times]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ema50Ref.current || times.length === 0) return
    ema50Ref.current.setData(indicators.ema50 ? toLineData(ema50d) : [])
    ema50Ref.current.applyOptions({ visible: indicators.ema50 })
  }, [ema50d, indicators.ema50, times]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update BB ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bbUpperRef.current || !bbMidRef.current || !bbLowerRef.current || times.length === 0) return
    const show = indicators.bb
    bbUpperRef.current.setData(show ? toLineData(bbd.upper) : []); bbUpperRef.current.applyOptions({ visible: show })
    bbMidRef.current.setData(show ? toLineData(bbd.mid) : []);     bbMidRef.current.applyOptions({ visible: show })
    bbLowerRef.current.setData(show ? toLineData(bbd.lower) : []); bbLowerRef.current.applyOptions({ visible: show })
  }, [bbd, indicators.bb, times]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update RSI ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!rsiSerRef.current || !rsiOb70Ref.current || !rsiOs30Ref.current || times.length === 0) return
    const show = indicators.rsi && chartPane === "rsi"
    rsiSerRef.current.setData(show ? toLineData(rsid) : [])
    rsiSerRef.current.applyOptions({ visible: show })
    const ob70: LineData[] = times.map((t) => ({ time: t, value: 70 }))
    const os30: LineData[] = times.map((t) => ({ time: t, value: 30 }))
    rsiOb70Ref.current.setData(show ? ob70 : []); rsiOb70Ref.current.applyOptions({ visible: show })
    rsiOs30Ref.current.setData(show ? os30 : []); rsiOs30Ref.current.applyOptions({ visible: show })
    chartRef.current?.priceScale("rsi").applyOptions({
      scaleMargins: show ? { top: 0.70, bottom: 0.02 } : { top: 0.99, bottom: 0 },
    })
  }, [rsid, indicators.rsi, chartPane, times]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update MACD ─────────────────────────────────────────────────────────���────
  useEffect(() => {
    if (!macdSerRef.current || !macdSigRef.current || !macdHistRef.current || times.length === 0) return
    const show = indicators.macd && chartPane === "macd"
    macdSerRef.current.setData(show ? toLineData(macdd.macd) : [])
    macdSigRef.current.setData(show ? toLineData(macdd.signal) : [])
    macdHistRef.current.setData(show ? toHistData(macdd.hist, "rgba(38,166,154,0.6)", "rgba(239,83,80,0.6)") : [])
    macdSerRef.current.applyOptions({ visible: show })
    macdSigRef.current.applyOptions({ visible: show })
    macdHistRef.current.applyOptions({ visible: show })
    chartRef.current?.priceScale("macd").applyOptions({
      scaleMargins: show ? { top: 0.70, bottom: 0.02 } : { top: 0.99, bottom: 0 },
    })
  }, [macdd, indicators.macd, chartPane, times]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Volume visibility ─────────────────────�����──────────────────────────────────
  useEffect(() => {
    if (!volSerRef.current) return
    volSerRef.current.applyOptions({ visible: indicators.volume })
    chartRef.current?.priceScale("vol").applyOptions({
      scaleMargins: indicators.volume ? { top: 0.84, bottom: 0 } : { top: 0.99, bottom: 0 },
    })
  }, [indicators.volume])

  // ── Adaptive market scale and live bid/ask overlays ─────────────────────────
  useEffect(() => {
    const chart = chartRef.current
    const series = candleSerRef.current
    if (!chart || !series || !priceEnvelope) return
    const width = containerRef.current?.clientWidth ?? 900
    const visibleBars = Math.max(36, Math.min(96, candleData.length || 36))
    const spacing = Math.max(4, Math.min(14, width / visibleBars * 0.72))
    chart.timeScale().applyOptions({ barSpacing: spacing, minBarSpacing: 3, rightOffset: Math.max(4, Math.round(visibleBars * 0.06)) })
    series.applyOptions({
      // Keep the primary price axis bounded by the selected instrument's
      // recent OHLC range. Volume/RSI/MACD use isolated hidden scales below.
      autoscaleInfoProvider: () => ({ priceRange: { minValue: priceEnvelope.min, maxValue: priceEnvelope.max } }),
    })
    chart.priceScale("right").applyOptions({
      autoScale: !userAdjustedViewRef.current,
      scaleMargins: { top: 0.08, bottom: indicators.volume ? 0.16 : 0.06 },
      mode: 0,
    })
    if (candleData.length > 0 && candleCountRef.current === candleData.length && !userAdjustedViewRef.current) {
      autoFitRequestedRef.current = true
      chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, candleData.length - visibleBars), to: candleData.length + Math.max(4, Math.round(visibleBars * 0.06)) })
    }
  }, [priceEnvelope, candleData.length, indicators.volume])

  // Live BID/ASK remains visible in the terminal header and order panel.
  // The price pane stays clean: no quote or open-trade labels are drawn over candles.

  const toggle = useCallback((key: IndicatorKey) => setIndicators((p) => ({ ...p, [key]: !p[key] })), [])
  const isLoading = candles.length === 0

  // Sync alertMode to DOM so the subscribeClick handler can read it without stale closure
  useEffect(() => {
    if (!containerRef.current) return
    if (alertMode) containerRef.current.dataset.alertmode = "1"
    else delete containerRef.current.dataset.alertmode
  }, [alertMode])

  // Render alert price lines on the chart
  useEffect(() => {
    if (!candleSerRef.current) return
    // Remove all existing alert lines by rebuilding — lightweight-charts price lines
    // don't have a direct "remove all" API so we track via series re-render.
    // We use a separate approach: store IPriceLine refs.
  }, [alerts])

  // Draw alert price lines (stored refs for later removal)
  const alertLineRefs = useRef<Map<number, ReturnType<ISeriesApi<"Candlestick">["createPriceLine"]>>>(new Map())

  useEffect(() => {
    if (!candleSerRef.current) return
    const ser = candleSerRef.current
    // Remove lines that no longer exist
    alertLineRefs.current.forEach((line, id) => {
      if (!alerts.find(a => a.id === id)) {
        try { ser.removePriceLine(line) } catch {}
        alertLineRefs.current.delete(id)
      }
    })
    // Add new lines
    alerts.forEach(a => {
      if (alertLineRefs.current.has(a.id) || !Number.isFinite(a.price) || a.price <= 0) return
      const line = ser.createPriceLine({
        price:              a.price,
        color:              a.hit ? "rgba(245,158,11,0.4)" : "#f59e0b",
        lineWidth:          1,
        lineStyle:          LineStyle.LargeDashed,
        axisLabelVisible:   true,
        title:              a.label,
      })
      alertLineRefs.current.set(a.id, line)
    })
  }, [alerts])

  // Check if current candle close crosses any alert
  useEffect(() => {
    if (alerts.length === 0) return
    const last = candles[candles.length - 1]
    if (!last) return
    setAlerts(prev => prev.map(a => {
      if (a.hit) return a
      // Triggered when close is within 0.05% of alert price
      const dist = Math.abs(last.close - a.price) / a.price
      if (dist < 0.0005) return { ...a, hit: true }
      return a
    }))
  }, [candles]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Last candle stats for header ───────────────────────��─────────────────────
  const lastCandle = candles[candles.length - 1]
  const displayOhlcv = ohlcv ?? (lastCandle ? {
    open: lastCandle.open, high: lastCandle.high,
    low: lastCandle.low,   close: lastCandle.close,
    volume: lastCandle.volume, isUp: lastCandle.close >= lastCandle.open,
  } : null)

  const fmtP = (v: number) => v.toFixed(dec)
  const fmtV = (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString()

  // ATR(14) derived from current candles for display in OHLCV bar
  const atr14 = useMemo(() => {
    if (candles.length < 15) return null
    const trs: number[] = []
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i], p = candles[i - 1]
      trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)))
    }
    const recent = trs.slice(-14)
    return recent.reduce((a, b) => a + b, 0) / 14
  }, [candles])

  // Sub-pane config helpers
  const subPaneColor  = chartPane === "rsi" ? palette.emerald : palette.orange
  const subPaneLabel  = chartPane !== "none" ? chartPane.toUpperCase() : null

  return (
    <div className="apple-trading-chart flex flex-col w-full h-full select-none" style={{ background: "#09121e" }}>

      {/* ── OHLCV Info Bar ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-3 shrink-0 overflow-x-auto"
        style={{ height: 36, borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#04080f", minWidth: 0 }}
      >
        {displayOhlcv ? (
          <>
            {/* Change chip */}
            <span
              className="text-[10px] font-black tracking-widest uppercase shrink-0 px-1.5 py-0.5 rounded"
              style={{
                color: displayOhlcv.isUp ? "#26c97e" : "#ff4d4d",
                background: displayOhlcv.isUp ? "rgba(38,201,126,0.1)" : "rgba(255,77,77,0.1)",
                border: `1px solid ${displayOhlcv.isUp ? "rgba(38,201,126,0.25)" : "rgba(255,77,77,0.25)"}`,
              }}
            >
              {displayOhlcv.isUp ? "+" : "-"}{Math.abs(displayOhlcv.close - displayOhlcv.open).toFixed(dec)}
            </span>
            <div className="w-px h-4 shrink-0" style={{ background: "rgba(255,255,255,0.06)" }} />
            {[
              { label: "O", value: fmtP(displayOhlcv.open),  color: "#8ba3be" },
              { label: "H", value: fmtP(displayOhlcv.high),  color: "#26c97e" },
              { label: "L", value: fmtP(displayOhlcv.low),   color: "#ff4d4d" },
              { label: "C", value: fmtP(displayOhlcv.close), color: displayOhlcv.isUp ? "#26c97e" : "#ff4d4d" },
            ].map(({ label, value, color }) => (
              <span key={label} className="flex items-baseline gap-1 shrink-0">
                <span className="text-[8px] font-bold tracking-widest" style={{ color: "#3d5573" }}>{label}</span>
                <span className="text-[11px] font-black price-mono" style={{ color }}>{value}</span>
              </span>
            ))}
            <div className="w-px h-4 shrink-0" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="flex items-baseline gap-1 shrink-0">
              <span className="text-[8px] font-bold tracking-widest" style={{ color: "#3d5573" }}>VOL</span>
              <span className="text-[11px] font-black price-mono" style={{ color: "#5a7a9e" }}>{fmtV(displayOhlcv.volume)}</span>
            </span>
            {atr14 !== null && (
              <span className="flex items-baseline gap-1 shrink-0">
                <span className="text-[8px] font-bold tracking-widest" style={{ color: "#3d5573" }}>ATR</span>
                <span className="text-[11px] font-black price-mono" style={{ color: "#f59e0b" }}>{fmtP(atr14)}</span>
              </span>
            )}
          </>
        ) : (
          <span className="text-[10px]" style={{ color: "#7890ad" }}>Waiting for market data…</span>
        )}
        <div
          className="ml-auto flex items-center gap-1.5 shrink-0 pl-2"
          role="status"
          aria-live="polite"
          aria-label={`Market feed ${marketStatus}`}
          title={marketStatus === "live" ? "Live market quotes are updating the active candle" : "Waiting for live market quotes to reconnect"}
        >
          <span
            aria-hidden="true"
            className={marketStatus === "live" ? "size-2 rounded-full animate-pulse" : "size-2 rounded-full"}
            style={{ background: marketStatus === "live" ? "#26a69a" : "#fbbf24", boxShadow: marketStatus === "live" ? "0 0 8px rgba(38,166,154,0.7)" : "none" }}
          />
          <span className="text-[9px] font-bold tracking-widest" style={{ color: marketStatus === "live" ? "#26a69a" : "#fbbf24" }}>
            {marketStatus === "live" ? "LIVE" : marketStatus === "reconnecting" ? "RECONNECTING" : "CONNECTING"}
          </span>
        </div>
      </div>

      {/* ── Indicator Toolbar ───────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-1 px-2 py-1 shrink-0 overflow-x-auto terminal-chart-toolbar"
        style={{ minHeight: 40, borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#080f1b", flexShrink: 0 }}
      >
        {/* Overlay indicators */}
        {([
          { key: "ema9"    as IndicatorKey, label: "EMA9",  color: palette.amber  },
          { key: "ema21"   as IndicatorKey, label: "EMA21", color: palette.blue   },
          { key: "ema50"   as IndicatorKey, label: "EMA50", color: palette.pink   },
          { key: "bb"      as IndicatorKey, label: "BB20",  color: palette.purple },
          { key: "volume"  as IndicatorKey, label: "VOL",   color: palette.cyan   },
        ]).map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md shrink-0 transition-all active:scale-95"
            style={indicators[key]
              ? { background: `${color}18`, border: `1px solid ${color}45`, color, boxShadow: `0 0 6px ${color}20` }
              : { background: "transparent", border: "1px solid rgba(255,255,255,0.05)", color: "#3d5573" }
            }
          >
            <span className="text-[9px] font-black tracking-wide">{label}</span>
          </button>
        ))}

        <div className="w-px h-4 self-center mx-1 shrink-0" style={{ background: "rgba(255,255,255,0.06)" }} />

        {/* Sub-pane oscillators */}
        {([
          { id: "rsi" as const,  label: "RSI(14)", color: palette.emerald },
          { id: "macd" as const, label: "MACD",    color: palette.orange  },
        ]).map(({ id, label, color }) => {
          const isActive = chartPane === id && indicators[id]
          return (
            <button
              key={id}
              onClick={() => {
                if (isActive) {
                  setChartPane("none")
                  setIndicators((p) => ({ ...p, [id]: false }))
                } else {
                  setChartPane(id)
                  setIndicators((p) => ({ ...p, rsi: id === "rsi", macd: id === "macd" }))
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md shrink-0 transition-all active:scale-95"
              style={isActive
                ? { background: `${color}18`, border: `1px solid ${color}45`, color, boxShadow: `0 0 6px ${color}20` }
                : { background: "transparent", border: "1px solid rgba(255,255,255,0.05)", color: "#3d5573" }
              }
            >
              <span className="text-[9px] font-black tracking-wide">{label}</span>
            </button>
          )
        })}

        {/* Sub-pane active pill */}
        {subPaneLabel && (
          <span
            className="ml-0.5 px-2 py-0.5 rounded text-[8px] font-black shrink-0 tracking-widest"
            style={{
              background: `${subPaneColor}15`,
              color: subPaneColor,
              border: `1px solid ${subPaneColor}35`,
            }}
          >
            {subPaneLabel}
          </span>
        )}

        <div className="flex-1" />

        {/* Price Alert toggle */}
        <button
          onClick={() => { setAlertMode(m => !m); if (!alertMode) setShowAlertPanel(true) }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md shrink-0 transition-all active:scale-95"
          style={alertMode
            ? { background: `${palette.amber}20`, border: `1px solid ${palette.amber}60`, color: palette.amber }
            : { background: "transparent", border: "1px solid rgba(255,255,255,0.05)", color: "#3d5573" }
          }
          title="Click on chart to set a price alert"
        >
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
            <path d="M5 1v1M5 8v1M1 5h1M8 5h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <circle cx="5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
          <span className="text-[9px] font-black tracking-wide">ALERT</span>
          {alerts.length > 0 && (
            <span
              className="flex items-center justify-center w-3.5 h-3.5 rounded-full text-[8px] font-black ml-0.5"
              style={{ background: palette.amber, color: "#000" }}
            >
              {alerts.length}
            </span>
          )}
        </button>

        {/* Reset zoom */}
        <button
          onClick={() => {
            if (!chartRef.current || candleData.length === 0) return
            userAdjustedViewRef.current = false
            autoFitRequestedRef.current = true
            chartRef.current.priceScale("right").applyOptions({ autoScale: true })
            const from = Math.max(0, candleData.length - 90)
            chartRef.current.timeScale().setVisibleLogicalRange({ from, to: candleData.length + 2 })
          }}
          className="flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-all hover:opacity-90 active:scale-95"
          style={{ background: "#0a1524", border: "1px solid rgba(255,255,255,0.07)", color: "#4a6580" }}
          title="Reset zoom and fit selected instrument"
        >
          <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
            <path d="M1 3V1h2M9 3V1H7M1 7v2h2M9 7v2H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="5" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
        </button>

        {/* Expand / Collapse */}
        {onExpand && (
          <button
    type="button"
    onClick={onExpand}
    aria-pressed={isExpanded}
    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md shrink-0 font-black text-[9px] tracking-widest transition-all active:scale-95"

            style={isExpanded
              ? { background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.4)", color: "#22d3ee", boxShadow: "0 0 8px rgba(34,211,238,0.15)" }
              : { background: "#0a1524", border: "1px solid rgba(255,255,255,0.08)", color: "#4a6580" }
            }
            title={isExpanded ? "Collapse chart" : "Expand chart"}
          >
            {isExpanded ? (
              <>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M3 1H1v2M7 1h2v2M3 9H1V7M7 9h2V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                COLLAPSE
              </>
            ) : (
              <>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 3V1h2M9 3V1H7M1 7v2h2M9 7v2H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                EXPAND
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Chart canvas ───────────────────────────���────────────────────────────── */}
  <div ref={containerRef} className="apple-trading-chart-canvas relative flex-1 min-h-0 w-full" style={{ background: darkTheme ? DARK_T.bg : T.bg }}>

  {/* Sub-pane label overlay in bottom-left of chart */}

        {subPaneLabel && (
          <div
            className="absolute bottom-2 left-3 z-10 px-2 py-0.5 rounded pointer-events-none"
            style={{
              background: `${subPaneColor}10`,
              border: `1px solid ${subPaneColor}30`,
            }}
          >
            <span className="text-[8px] font-black tracking-[0.2em]" style={{ color: subPaneColor }}>{subPaneLabel}</span>
          </div>
        )}

        {/* Alert mode banner */}
        {alertMode && (
          <div
            className="absolute top-2 left-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg pointer-events-none"
            style={{
              transform: "translateX(-50%)",
              background: `${palette.amber}20`,
              border: `1px solid ${palette.amber}55`,
              backdropFilter: "blur(6px)",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 1v1M5 8v1M1 5h1M8 5h1" stroke={palette.amber} strokeWidth="1.3" strokeLinecap="round"/>
              <circle cx="5" cy="5" r="2.5" stroke={palette.amber} strokeWidth="1.3"/>
            </svg>
            <span className="text-[9px] font-black tracking-widest" style={{ color: palette.amber }}>
              CLICK TO SET PRICE ALERT
            </span>
          </div>
        )}

        {/* Alert management panel */}
        {showAlertPanel && alerts.length > 0 && (
          <div
            className="absolute top-2 right-2 z-20 flex flex-col gap-1 rounded-xl p-2.5"
            style={{
              background: "rgba(4,8,15,0.94)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(12px)",
              minWidth: 190,
              maxWidth: 230,
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-black tracking-widest" style={{ color: palette.amber }}>PRICE ALERTS</span>
              <button
                onClick={() => setShowAlertPanel(false)}
                className="text-[8px] font-bold transition-opacity hover:opacity-60 px-1"
                style={{ color: "#3d5573" }}
              >
                hide
              </button>
            </div>
            {alerts.map(a => (
              <div key={a.id} className="flex items-center gap-2 px-1.5 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: a.hit ? "#26c97e" : palette.amber, boxShadow: a.hit ? "0 0 6px #26c97e" : `0 0 4px ${palette.amber}` }}
                />
                <span className="flex-1 text-[10px] font-black price-mono" style={{ color: a.hit ? "#26c97e" : "#8ba3be" }}>
                  {fmtP(a.price)}
                  {a.hit && <span className="ml-1.5 text-[8px] font-black tracking-widest" style={{ color: "#26c97e" }}>HIT</span>}
                </span>
                <button
                  onClick={() => {
                    const line = alertLineRefs.current.get(a.id)
                    if (line && candleSerRef.current) {
                      try { candleSerRef.current.removePriceLine(line) } catch {}
                      alertLineRefs.current.delete(a.id)
                    }
                    setAlerts(prev => prev.filter(x => x.id !== a.id))
                  }}
                  className="text-[11px] leading-none transition-opacity hover:opacity-60 shrink-0 w-4 h-4 flex items-center justify-center rounded"
                  style={{ color: palette.red }}
                >
                  &times;
                </button>
              </div>
            ))}
            {alerts.length > 1 && (
              <button
                onClick={() => {
                  alertLineRefs.current.forEach((line) => {
                    if (candleSerRef.current) try { candleSerRef.current.removePriceLine(line) } catch {}
                  })
                  alertLineRefs.current.clear()
                  setAlerts([])
                }}
                className="mt-1 text-[8px] font-black tracking-widest uppercase transition-opacity hover:opacity-70 text-center py-1 rounded-lg"
                style={{ color: palette.red, background: "rgba(239,83,80,0.06)", border: "1px solid rgba(239,83,80,0.15)" }}
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {isExpanded && onQuickTrade && !isLoading && (
          <div
            className="absolute bottom-4 left-1/2 z-30 flex w-[min(360px,calc(100%-24px))] -translate-x-1/2 items-stretch gap-2 rounded-xl p-2"
            style={{
              background: "rgba(4,8,15,0.92)",
              border: "1px solid rgba(148,163,184,0.2)",
              backdropFilter: "blur(14px)",
              boxShadow: "0 12px 32px rgba(0,0,0,0.42)",
            }}
          >
            <button
              type="button"
              onClick={() => onQuickTrade("SELL")}
              className="reference-quick-trade reference-quick-trade-sell btn-3d-execute-sell flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5"
              aria-label={`Sell ${safeSymbol} at ${sellPrice !== undefined ? fmtP(sellPrice) : "market price"}`}
            >
              <span className="relative z-10 flex items-center gap-1.5 text-xs font-black">SELL</span>
              {sellPrice !== undefined && <span className="relative z-10 price-mono text-[9px] opacity-80">{fmtP(sellPrice)}</span>}
            </button>
            <button
              type="button"
              onClick={() => onQuickTrade("BUY")}
              className="reference-quick-trade reference-quick-trade-buy btn-3d-execute-buy flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5"
              aria-label={`Buy ${safeSymbol} at ${buyPrice !== undefined ? fmtP(buyPrice) : "market price"}`}
            >
              <span className="relative z-10 flex items-center gap-1.5 text-xs font-black">BUY</span>
              {buyPrice !== undefined && <span className="relative z-10 price-mono text-[9px] opacity-80">{fmtP(buyPrice)}</span>}
            </button>
          </div>
        )}

        {isLoading && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
            style={{ background: "rgba(6,11,21,0.93)", backdropFilter: "blur(8px)" }}
          >
            <div
              className="w-6 h-6 rounded-full border-2 animate-spin"
              style={{ borderColor: "rgba(34,211,238,0.15)", borderTopColor: palette.cyan }}
            />
            <span className="text-[9px] font-black tracking-[0.25em] uppercase" style={{ color: "#3d5573" }}>
              Loading chart data
            </span>
          </div>
        )}

        {/* Crosshair active badge */}
        {crosshairActive && !alertMode && (
          <div
            className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-md"
            style={{ background: "rgba(4,8,15,0.85)", border: "1px solid rgba(34,211,238,0.15)", backdropFilter: "blur(4px)" }}
          >
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: palette.cyan, boxShadow: `0 0 4px ${palette.cyan}` }} />
            <span className="text-[8px] font-black tracking-widest" style={{ color: "#4a6580" }}>CROSSHAIR</span>
          </div>
        )}
      </div>
    </div>
  )
}
