"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
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
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  ts?: number
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

const T = {
  bg:          "#060b15",
  bgSurface:   "#0a1120",
  bgHover:     "#0e1829",
  border:      "rgba(255,255,255,0.06)",
  borderMuted: "rgba(255,255,255,0.04)",
  textMuted:   "#3d5573",
  textDim:     "#5a7a9e",
  textBase:    "#8ba3be",
  green:       "#26a69a",
  greenBright: "#4caf7d",
  red:         "#ef5350",
  redBright:   "#f44336",
  cyan:        "#22d3ee",
  amber:       "#f59e0b",
  blue:        "#60a5fa",
  pink:        "#f472b6",
  purple:      "#818cf8",
  orange:      "#fb923c",
  emerald:     "#34d399",
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

function calcEMA(closes: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1)
  const result: (number | null)[] = new Array(closes.length).fill(null)
  let ema: number | null = null
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) continue
    if (ema === null) ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
    else ema = closes[i] * k + ema * (1 - k)
    result[i] = ema
  }
  return result
}

function calcBB(closes: number[], period = 20, mult = 2) {
  const upper: (number | null)[] = [], mid: (number | null)[] = [], lower: (number | null)[] = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { upper.push(null); mid.push(null); lower.push(null); continue }
    const sl = closes.slice(i - period + 1, i + 1)
    const sma = sl.reduce((a, b) => a + b, 0) / period
    const sd = Math.sqrt(sl.reduce((s, v) => s + (v - sma) ** 2, 0) / period)
    upper.push(sma + mult * sd); mid.push(sma); lower.push(sma - mult * sd)
  }
  return { upper, mid, lower }
}

function calcRSI(closes: number[], period = 14): (number | null)[] {
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
  "1M": 60, "5M": 300, "15M": 900, "1H": 3600, "4H": 14400, "1D": 86400,
}

function toTimestamp(c: Candle, idx: number, tfSeconds = 300): Time {
  if (c.ts && c.ts > 1_000_000) return c.ts as Time
  // Fallback: generate sequential timestamps anchored to Jan 1 2024 with proper interval
  return (1704067200 + idx * tfSeconds) as Time
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
}: {
  candles: Candle[]
  sym: string
  tf?: string
  openTrades?: OpenTrade[]
  onExpand?: () => void
  isExpanded?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)

  // Series refs
  const candleSerRef  = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const volSerRef     = useRef<ISeriesApi<"Histogram"> | null>(null)
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
    ema9: true, ema21: true, ema50: false, bb: false, rsi: true, macd: false, volume: true,
  })
  const [chartPane, setChartPane] = useState<"rsi" | "macd" | "none">("rsi")
  const [ohlcv, setOhlcv] = useState<OHLCVInfo>(null)
  const [crosshairActive, setCrosshairActive] = useState(false)

  // Price alerts ─────────────────────────────────────────────────────────────
  const [alerts, setAlerts]             = useState<PriceAlert[]>([])
  const [alertMode, setAlertMode]       = useState(false)      // true = click-to-set mode
  const [showAlertPanel, setShowAlertPanel] = useState(false)
  const alertsRef                       = useRef<PriceAlert[]>([])
  const alertNextId                     = useRef(1)
  alertsRef.current = alerts

  const isJpy = sym.includes("JPY")
  const dec   = isJpy ? 3 : sym.startsWith("XAU") ? 2 : sym.startsWith("BTC") ? 1 : sym.startsWith("ETH") ? 2 : 5

  // ── Data processing ──────────────────────────────────────────────────────────
  const { candleData, volData, closes, times } = useMemo(() => {
    const candleData: CandlestickData[] = []
    const volData: HistogramData[]      = []
    const closes: number[]              = []
    const times: Time[]                 = []
    const tfSecs = TF_SECONDS[tf] ?? 300
    candles.forEach((c, i) => {
      const t = toTimestamp(c, i, tfSecs)
      const isUp = c.close >= c.open
      candleData.push({ time: t, open: c.open, high: c.high, low: c.low, close: c.close })
      volData.push({
        time: t,
        value: c.volume,
        color: isUp ? "rgba(22,217,130,0.55)" : "rgba(255,71,87,0.55)",
      })
      closes.push(c.close)
      times.push(t)
    })
    return { candleData, volData, closes, times }
  }, [candles])

  const ema9d  = useMemo(() => calcEMA(closes, 9),  [closes])
  const ema21d = useMemo(() => calcEMA(closes, 21), [closes])
  const ema50d = useMemo(() => calcEMA(closes, 50), [closes])
  const bbd    = useMemo(() => calcBB(closes),       [closes])
  const rsid   = useMemo(() => calcRSI(closes),      [closes])
  const macdd  = useMemo(() => calcMACD(closes),     [closes])

  function toLineData(arr: (number | null)[]): LineData[] {
    return arr.map((v, i) => ({ time: times[i], value: v ?? NaN })).filter((d) => isFinite(d.value as number))
  }
  function toHistData(arr: (number | null)[], pos: string, neg: string): HistogramData[] {
    return arr
      .map((v, i) => ({ time: times[i], value: v ?? NaN, color: (v ?? 0) >= 0 ? pos : neg }))
      .filter((d) => isFinite(d.value as number))
  }

  // ── Create chart on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.VerticalGradient, topColor: "#0a1220", bottomColor: "#050a13" },
        textColor:  "#8ba3be",
        fontFamily: "'Inter', 'SF Pro Display', monospace",
        fontSize:   12,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(120,150,190,0.10)", style: LineStyle.Solid },
        horzLines: { color: "rgba(120,150,190,0.12)", style: LineStyle.Solid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(120,200,255,0.55)",
          labelBackgroundColor: "#1a3a5c",
          style: LineStyle.Dashed,
          width: 1,
        },
        horzLine: {
          color: "rgba(120,200,255,0.55)",
          labelBackgroundColor: "#1a3a5c",
          style: LineStyle.Dashed,
          width: 1,
        },
      },
      rightPriceScale: {
        borderColor: "rgba(120,150,190,0.20)",
        textColor:   "#9fb6d0",
        scaleMargins: { top: 0.06, bottom: 0.16 },
        entireTextOnly: true,
      },
      timeScale: {
        borderColor:    "rgba(120,150,190,0.20)",
        timeVisible:    true,
        secondsVisible: false,
        fixLeftEdge:    false,
        fixRightEdge:   false,
        barSpacing:     12,
        minBarSpacing:  4,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale:  { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    })

    chartRef.current = chart

    // ── Candles: vivid green/red with bright wick contrast ──
    const cSer = chart.addSeries(CandlestickSeries, {
      upColor:          "#16d982",
      downColor:        "#ff4757",
      borderUpColor:    "#3ff0a0",
      borderDownColor:  "#ff6b7a",
      wickUpColor:      "#3ff0a0",
      wickDownColor:    "#ff6b7a",
      borderVisible:    true,
      priceFormat: { type: "price", precision: dec, minMove: Math.pow(10, -dec) },
      priceLineVisible: true,
      priceLineWidth:   1,
      priceLineColor:   "rgba(120,200,255,0.5)",
      priceLineStyle:   LineStyle.Dashed,
      lastValueVisible: true,
    })
    candleSerRef.current = cSer

    // ── Volume bars ──
    const vSer = chart.addSeries(HistogramSeries, {
      priceFormat:  { type: "volume" },
      priceScaleId: "vol",
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
    ema9Ref.current  = mkLine(T.amber, 1)
    ema21Ref.current = mkLine(T.blue,  1)
    ema50Ref.current = mkLine(T.pink,  1)

    // ── Bollinger Bands ──
    bbUpperRef.current = mkLine("rgba(129,140,248,0.6)", 1)
    bbMidRef.current   = mkLine("rgba(129,140,248,0.3)", 1)
    bbLowerRef.current = mkLine("rgba(129,140,248,0.6)", 1)

    // ── RSI sub-pane ──
    const rsiSer = chart.addSeries(LineSeries, {
      color: T.emerald, lineWidth: 1,
      priceScaleId: "rsi",
      priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    })
    chart.priceScale("rsi").applyOptions({ scaleMargins: { top: 0.99, bottom: 0 }, visible: false })
    rsiSerRef.current = rsiSer

    rsiOb70Ref.current = chart.addSeries(LineSeries, { color: "rgba(239,83,80,0.25)",   lineWidth: 1, priceScaleId: "rsi", priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })
    rsiOs30Ref.current = chart.addSeries(LineSeries, { color: "rgba(38,166,154,0.25)",  lineWidth: 1, priceScaleId: "rsi", priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })

    // ── MACD sub-pane ──
    macdSerRef.current  = chart.addSeries(LineSeries, { color: T.orange, lineWidth: 1, priceScaleId: "macd", priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false })
    macdSigRef.current  = chart.addSeries(LineSeries, { color: T.purple, lineWidth: 1, priceScaleId: "macd", priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })
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
      // Only act when alert-mode is active (checked via DOM flag to avoid stale closure)
      if (!containerRef.current?.dataset.alertmode) return
      if (!param.point) return
      const price = cSer.coordinateToPrice(param.point.y)
      if (!price) return
      const id = alertNextId.current++
      const alertPrice = parseFloat(price.toFixed(dec))
      setAlerts((prev) => {
        const newAlert: PriceAlert = { id, price: alertPrice, label: `Alert ${id}`, hit: false }
        return [...prev, newAlert]
      })
      setShowAlertPanel(true)
    })

    // ── Resize observer ──
    const ro = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) return
      chartRef.current.resize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current     = null
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update candle + volume data ──────────────────────────────────────────────
  useEffect(() => {
    if (!candleSerRef.current || !volSerRef.current || candleData.length === 0) return
    candleSerRef.current.setData(candleData)
    volSerRef.current.setData(volData)
    if (chartRef.current) {
      const from = Math.max(0, candleData.length - 90)
      chartRef.current.timeScale().setVisibleLogicalRange({ from, to: candleData.length + 2 })
    }
    // Seed OHLCV from last candle
    const last = candles[candles.length - 1]
    if (last) setOhlcv({ open: last.open, high: last.high, low: last.low, close: last.close, volume: last.volume, isUp: last.close >= last.open })
  }, [candleData, volData, candles])

  // ── Update EMA ───────────────────────────────────��───────────────────────────
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

  // ── Update MACD ──────────────────────────────────────────────────────────────
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

  // ── Volume visibility ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!volSerRef.current) return
    volSerRef.current.applyOptions({ visible: indicators.volume })
    chartRef.current?.priceScale("vol").applyOptions({
      scaleMargins: indicators.volume ? { top: 0.84, bottom: 0 } : { top: 0.99, bottom: 0 },
    })
  }, [indicators.volume])

  // ── Open trade price lines ────────────────────────────────────────────────────
  useEffect(() => {
    if (!candleSerRef.current) return
    openTrades.forEach((t) => {
      if (!candleSerRef.current) return
      candleSerRef.current.createPriceLine({
        price: t.openPrice,
        color: t.direction === "BUY" ? T.green : T.red,
        lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true,
        title: `${t.direction}`,
      })
      if (t.sl) candleSerRef.current.createPriceLine({ price: t.sl, color: T.red,     lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: "SL" })
      if (t.tp) candleSerRef.current.createPriceLine({ price: t.tp, color: T.emerald, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: "TP" })
    })
  }, [openTrades])

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
      if (alertLineRefs.current.has(a.id)) return
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

  // ── Last candle stats for header ─────────────────────────────────────────────
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
  const subPaneColor  = chartPane === "rsi" ? T.emerald : T.orange
  const subPaneLabel  = chartPane !== "none" ? chartPane.toUpperCase() : null

  return (
    <div className="flex flex-col w-full h-full select-none" style={{ background: "#060b15" }}>

      {/* ── OHLCV Info Bar ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-3 shrink-0 overflow-x-auto"
        style={{ height: 32, borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#04080f", minWidth: 0 }}
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
          <span className="text-[9px]" style={{ color: "#3d5573" }}>Waiting for data...</span>
        )}
      </div>

      {/* ── Indicator Toolbar ───────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-1 px-2 shrink-0 overflow-x-auto"
        style={{ height: 36, borderBottom: "1px solid rgba(255,255,255,0.05)", background: "#070c18", flexShrink: 0 }}
      >
        {/* Overlay indicators */}
        {([
          { key: "ema9"    as IndicatorKey, label: "EMA9",  color: T.amber  },
          { key: "ema21"   as IndicatorKey, label: "EMA21", color: T.blue   },
          { key: "ema50"   as IndicatorKey, label: "EMA50", color: T.pink   },
          { key: "bb"      as IndicatorKey, label: "BB20",  color: T.purple },
          { key: "volume"  as IndicatorKey, label: "VOL",   color: T.cyan   },
        ]).map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className="flex items-center gap-1 px-2 py-1 rounded-md shrink-0 transition-all active:scale-95"
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
          { id: "rsi" as const,  label: "RSI(14)", color: T.emerald },
          { id: "macd" as const, label: "MACD",    color: T.orange  },
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
              className="flex items-center gap-1 px-2 py-1 rounded-md shrink-0 transition-all active:scale-95"
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
          className="flex items-center gap-1 px-2 py-1 rounded-md shrink-0 transition-all active:scale-95"
          style={alertMode
            ? { background: `${T.amber}20`, border: `1px solid ${T.amber}60`, color: T.amber }
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
              style={{ background: T.amber, color: "#000" }}
            >
              {alerts.length}
            </span>
          )}
        </button>

        {/* Reset zoom */}
        <button
          onClick={() => {
            if (!chartRef.current || candleData.length === 0) return
            const from = Math.max(0, candleData.length - 90)
            chartRef.current.timeScale().setVisibleLogicalRange({ from, to: candleData.length + 2 })
          }}
          className="flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-all hover:opacity-90 active:scale-95"
          style={{ background: "#0a1524", border: "1px solid rgba(255,255,255,0.07)", color: "#4a6580" }}
          title="Reset zoom to 90 candles"
        >
          <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
            <path d="M1 3V1h2M9 3V1H7M1 7v2h2M9 7v2H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="5" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
        </button>

        {/* Expand / Collapse */}
        {onExpand && (
          <button
            onClick={onExpand}
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

      {/* ── Chart canvas ────────────────────────────────────────────────────────── */}
      <div ref={containerRef} className="relative flex-1 min-h-0 w-full" style={{ background: "#060b15" }}>

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
              background: `${T.amber}20`,
              border: `1px solid ${T.amber}55`,
              backdropFilter: "blur(6px)",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 1v1M5 8v1M1 5h1M8 5h1" stroke={T.amber} strokeWidth="1.3" strokeLinecap="round"/>
              <circle cx="5" cy="5" r="2.5" stroke={T.amber} strokeWidth="1.3"/>
            </svg>
            <span className="text-[9px] font-black tracking-widest" style={{ color: T.amber }}>
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
              <span className="text-[9px] font-black tracking-widest" style={{ color: T.amber }}>PRICE ALERTS</span>
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
                  style={{ background: a.hit ? "#26c97e" : T.amber, boxShadow: a.hit ? "0 0 6px #26c97e" : `0 0 4px ${T.amber}` }}
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
                  style={{ color: T.red }}
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
                style={{ color: T.red, background: "rgba(239,83,80,0.06)", border: "1px solid rgba(239,83,80,0.15)" }}
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {isLoading && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
            style={{ background: "rgba(6,11,21,0.93)", backdropFilter: "blur(8px)" }}
          >
            <div
              className="w-6 h-6 rounded-full border-2 animate-spin"
              style={{ borderColor: "rgba(34,211,238,0.15)", borderTopColor: T.cyan }}
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
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: T.cyan, boxShadow: `0 0 4px ${T.cyan}` }} />
            <span className="text-[8px] font-black tracking-widest" style={{ color: "#4a6580" }}>CROSSHAIR</span>
          </div>
        )}
      </div>
    </div>
  )
}
