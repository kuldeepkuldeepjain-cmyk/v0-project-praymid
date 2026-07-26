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

function toTimestamp(c: Candle, idx: number): Time {
  if (c.ts) return c.ts as Time
  return (idx * 60) as Time
}

// ─── OHLCV Info Bar state ─────────────────────────────────────────────────────

type OHLCVInfo = {
  open: number; high: number; low: number; close: number; volume: number; isUp: boolean
} | null

// ─── TradingChart ─────────────────────────────────────────────────────────────

export function TradingChart({
  candles,
  sym,
  openTrades = [],
}: {
  candles: Candle[]
  sym: string
  openTrades?: OpenTrade[]
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

  const isJpy = sym.includes("JPY")
  const dec   = isJpy ? 3 : sym.startsWith("XAU") ? 2 : sym.startsWith("BTC") ? 1 : sym.startsWith("ETH") ? 2 : 5

  // ── Data processing ──────────────────────────────────────────────────────────
  const { candleData, volData, closes, times } = useMemo(() => {
    const candleData: CandlestickData[] = []
    const volData: HistogramData[]      = []
    const closes: number[]              = []
    const times: Time[]                 = []
    candles.forEach((c, i) => {
      const t = toTimestamp(c, i)
      const isUp = c.close >= c.open
      candleData.push({ time: t, open: c.open, high: c.high, low: c.low, close: c.close })
      volData.push({
        time: t,
        value: c.volume,
        color: isUp ? "rgba(38,166,154,0.35)" : "rgba(239,83,80,0.35)",
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
        background: { type: ColorType.Solid, color: T.bg },
        textColor:  T.textMuted,
        fontFamily: "'Inter', 'SF Pro Display', sans-serif",
        fontSize:   10,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.025)", style: LineStyle.Solid },
        horzLines: { color: "rgba(255,255,255,0.025)", style: LineStyle.Solid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(255,255,255,0.15)",
          labelBackgroundColor: "#0e2035",
          style: LineStyle.Dashed,
          width: 1,
        },
        horzLine: {
          color: "rgba(255,255,255,0.15)",
          labelBackgroundColor: "#0e2035",
          style: LineStyle.Dashed,
          width: 1,
        },
      },
      rightPriceScale: {
        borderColor: T.border,
        textColor:   T.textMuted,
        scaleMargins: { top: 0.06, bottom: 0.22 },
      },
      timeScale: {
        borderColor:    T.border,
        textColor:      T.textMuted,
        timeVisible:    true,
        secondsVisible: false,
        fixLeftEdge:    false,
        fixRightEdge:   false,
        barSpacing:     8,
        minBarSpacing:  2,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale:  { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    })

    chartRef.current = chart

    // ── Realistic candles: green body + green wicks for up, red for down ──
    const cSer = chart.addSeries(CandlestickSeries, {
      upColor:          T.green,
      downColor:        T.red,
      borderUpColor:    T.green,
      borderDownColor:  T.red,
      wickUpColor:      T.green,
      wickDownColor:    T.red,
      priceFormat: { type: "price", precision: dec, minMove: Math.pow(10, -dec) },
    })
    candleSerRef.current = cSer

    // ── Volume bars ──
    const vSer = chart.addSeries(HistogramSeries, {
      priceFormat:  { type: "volume" },
      priceScaleId: "vol",
    })
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.84, bottom: 0 },
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

  // ── Update EMA ───────────────────────────────────────────────────────────────
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

  // ── Last candle stats for header ─────────────────────────────────────────────
  const lastCandle = candles[candles.length - 1]
  const displayOhlcv = ohlcv ?? (lastCandle ? {
    open: lastCandle.open, high: lastCandle.high,
    low: lastCandle.low,   close: lastCandle.close,
    volume: lastCandle.volume, isUp: lastCandle.close >= lastCandle.open,
  } : null)

  const fmtP = (v: number) => v.toFixed(dec)
  const fmtV = (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString()

  return (
    <div className="flex flex-col w-full h-full select-none" style={{ background: T.bg }}>

      {/* ── OHLCV Info Bar ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-3 shrink-0 overflow-x-auto"
        style={{ height: 30, borderBottom: `1px solid ${T.border}`, minWidth: 0 }}
      >
        {displayOhlcv ? (
          <>
            <span className="text-[9px] font-black tracking-widest uppercase shrink-0" style={{ color: displayOhlcv.isUp ? T.green : T.red }}>
              {displayOhlcv.isUp ? "+" : "-"}{Math.abs(displayOhlcv.close - displayOhlcv.open).toFixed(dec)}
            </span>
            {[
              { label: "O", value: fmtP(displayOhlcv.open),   color: T.textBase },
              { label: "H", value: fmtP(displayOhlcv.high),   color: T.green },
              { label: "L", value: fmtP(displayOhlcv.low),    color: T.red },
              { label: "C", value: fmtP(displayOhlcv.close),  color: displayOhlcv.isUp ? T.green : T.red },
            ].map(({ label, value, color }) => (
              <span key={label} className="flex items-baseline gap-0.5 shrink-0">
                <span className="text-[8px] font-bold tracking-wider" style={{ color: T.textMuted }}>{label}</span>
                <span className="text-[10px] font-black price-mono" style={{ color }}>{value}</span>
              </span>
            ))}
            <span className="flex items-baseline gap-0.5 shrink-0">
              <span className="text-[8px] font-bold tracking-wider" style={{ color: T.textMuted }}>V</span>
              <span className="text-[10px] font-black price-mono" style={{ color: T.textDim }}>{fmtV(displayOhlcv.volume)}</span>
            </span>
          </>
        ) : (
          <span className="text-[9px]" style={{ color: T.textMuted }}>Waiting for data...</span>
        )}
      </div>

      {/* ── Indicator Toolbar ───────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-1 px-2 shrink-0 overflow-x-auto"
        style={{ height: 34, borderBottom: `1px solid ${T.border}`, background: T.bgSurface }}
      >
        {/* Overlay indicators */}
        {([
          { key: "ema9" as IndicatorKey,   label: "EMA9",  color: T.amber  },
          { key: "ema21" as IndicatorKey,  label: "EMA21", color: T.blue   },
          { key: "ema50" as IndicatorKey,  label: "EMA50", color: T.pink   },
          { key: "bb" as IndicatorKey,     label: "BB",    color: T.purple },
          { key: "volume" as IndicatorKey, label: "VOL",   color: T.cyan   },
        ]).map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className="flex items-center gap-1 px-2 py-1 rounded-md shrink-0 transition-all"
            style={indicators[key]
              ? { background: `${color}18`, border: `1px solid ${color}40`, color }
              : { background: "transparent", border: `1px solid ${T.border}`, color: T.textMuted }
            }
          >
            <span className="text-[9px] font-black tracking-wider">{label}</span>
          </button>
        ))}

        <div className="w-px h-4 self-center mx-0.5 shrink-0" style={{ background: T.border }} />

        {/* Sub-pane oscillators */}
        {([
          { id: "rsi" as const, label: "RSI", color: T.emerald },
          { id: "macd" as const, label: "MACD", color: T.orange },
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
              className="flex items-center gap-1 px-2 py-1 rounded-md shrink-0 transition-all"
              style={isActive
                ? { background: `${color}18`, border: `1px solid ${color}40`, color }
                : { background: "transparent", border: `1px solid ${T.border}`, color: T.textMuted }
              }
            >
              <span className="text-[9px] font-black tracking-wider">{label}</span>
            </button>
          )
        })}

        {/* Sub-pane label pill */}
        {chartPane !== "none" && (
          <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-black shrink-0 tracking-widest"
            style={{
              background: chartPane === "rsi" ? `${T.emerald}15` : `${T.orange}15`,
              color: chartPane === "rsi" ? T.emerald : T.orange,
              border: `1px solid ${chartPane === "rsi" ? T.emerald : T.orange}35`,
            }}>
            {chartPane.toUpperCase()}
          </span>
        )}

        <div className="flex-1" />

        {/* Reset zoom */}
        <button
          onClick={() => {
            if (!chartRef.current || candleData.length === 0) return
            const from = Math.max(0, candleData.length - 90)
            chartRef.current.timeScale().setVisibleLogicalRange({ from, to: candleData.length + 2 })
          }}
          className="flex items-center justify-center w-6 h-6 rounded shrink-0 transition-opacity hover:opacity-80"
          style={{ background: T.bgHover, border: `1px solid ${T.border}`, color: T.textDim }}
          title="Reset zoom"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 3V1h2M9 3V1H7M1 7v2h2M9 7v2H7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="5" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        </button>
      </div>

      {/* ── Chart canvas ────────────────────────────────────────────────────────── */}
      <div ref={containerRef} className="relative flex-1 min-h-0 w-full">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2"
            style={{ background: "rgba(6,11,21,0.9)", backdropFilter: "blur(6px)" }}>
            <div className="w-5 h-5 rounded-full border-2 animate-spin"
              style={{ borderColor: `${T.cyan}30`, borderTopColor: T.cyan }} />
            <span className="text-[9px] font-black tracking-[0.2em] uppercase" style={{ color: T.textMuted }}>
              Loading chart
            </span>
          </div>
        )}

        {/* Crosshair active badge */}
        {crosshairActive && (
          <div className="absolute top-1.5 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded"
            style={{ background: "rgba(6,11,21,0.8)", border: `1px solid ${T.border}`, backdropFilter: "blur(4px)" }}>
            <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: T.cyan }} />
            <span className="text-[8px] font-black tracking-wider" style={{ color: T.textDim }}>CROSS</span>
          </div>
        )}
      </div>
    </div>
  )
}
