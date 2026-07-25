"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import {
  createChart,
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

type IndicatorSet = {
  ema9: boolean
  ema21: boolean
  ema50: boolean
  bb: boolean
  rsi: boolean
  macd: boolean
  volume: boolean
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

function calcEMA(closes: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1)
  const result: (number | null)[] = new Array(closes.length).fill(null)
  let ema: number | null = null
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) continue
    if (ema === null) {
      ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
    } else {
      ema = closes[i] * k + ema * (1 - k)
    }
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
  const macdFilled = macd.map((v) => v ?? 0)
  const rawSig = calcEMA(macdFilled, 9)
  const signal: (number | null)[] = macd.map((v, i) => (v != null ? rawSig[i] : null))
  const hist: (number | null)[] = macd.map((v, i) =>
    v != null && signal[i] != null ? v - signal[i]! : null)
  return { macd, signal, hist }
}

// Convert candle time string to a unix timestamp for lightweight-charts
function toTimestamp(c: Candle, idx: number): Time {
  // If we have raw ts from the API, use it
  if (c.ts) return c.ts as Time
  // Fallback: use index as "fake" time (spaced 60s apart so chart is happy)
  return (idx * 60) as Time
}

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
  const containerRef  = useRef<HTMLDivElement>(null)
  const chartRef      = useRef<IChartApi | null>(null)
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

  const [indicators, setIndicators] = useState<IndicatorSet>({
    ema9: true, ema21: true, ema50: false, bb: false, rsi: true, macd: false, volume: true,
  })
  const [chartPane, setChartPane] = useState<"rsi" | "macd" | "none">("rsi")

  const isJpy = sym.includes("JPY")
  const dec   = isJpy ? 3 : sym.startsWith("XAU") ? 2 : sym.startsWith("BTC") ? 1 : 5

  // Build series data from candles
  const { candleData, volData, closes, times } = useMemo(() => {
    const candleData: CandlestickData[] = []
    const volData: HistogramData[]      = []
    const closes: number[]              = []
    const times: Time[]                 = []

    candles.forEach((c, i) => {
      const t = toTimestamp(c, i)
      candleData.push({ time: t, open: c.open, high: c.high, low: c.low, close: c.close })
      volData.push({
        time: t,
        value: c.volume,
        color: c.close >= c.open ? "rgba(34,211,238,0.25)" : "rgba(248,113,113,0.25)",
      })
      closes.push(c.close)
      times.push(t)
    })
    return { candleData, volData, closes, times }
  }, [candles])

  // Computed indicators
  const ema9d  = useMemo(() => calcEMA(closes, 9),  [closes])
  const ema21d = useMemo(() => calcEMA(closes, 21), [closes])
  const ema50d = useMemo(() => calcEMA(closes, 50), [closes])
  const bbd    = useMemo(() => calcBB(closes),       [closes])
  const rsid   = useMemo(() => calcRSI(closes),      [closes])
  const macdd  = useMemo(() => calcMACD(closes),     [closes])

  function toLineData(arr: (number | null)[]): LineData[] {
    return arr.map((v, i) => ({ time: times[i], value: v ?? NaN })).filter((d) => isFinite(d.value as number))
  }
  function toHistData(arr: (number | null)[], positiveColor: string, negativeColor: string): HistogramData[] {
    return arr
      .map((v, i) => ({ time: times[i], value: v ?? NaN, color: (v ?? 0) >= 0 ? positiveColor : negativeColor }))
      .filter((d) => isFinite(d.value as number))
  }

  // ─── Create chart on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#070d1a" },
        textColor:  "#4a6080",
        fontFamily: "'Inter', sans-serif",
        fontSize:   10,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)", style: LineStyle.Dotted },
        horzLines: { color: "rgba(255,255,255,0.03)", style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(34,211,238,0.4)", labelBackgroundColor: "#0e2035" },
        horzLine: { color: "rgba(34,211,238,0.4)", labelBackgroundColor: "#0e2035" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.06)",
        textColor:   "#4a6080",
        scaleMargins: { top: 0.08, bottom: 0.25 },
      },
      timeScale: {
        borderColor:      "rgba(255,255,255,0.06)",
        textColor:        "#3d5573",
        timeVisible:      true,
        secondsVisible:   false,
        fixLeftEdge:      false,
        fixRightEdge:     false,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true },
      handleScale:  { mouseWheel: true, pinch: true },
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    })

    chartRef.current = chart

    // ── Candlestick series ──
    const cSer = chart.addCandlestickSeries({
      upColor:          "#22d3ee",
      downColor:        "#f87171",
      borderUpColor:    "#22d3ee",
      borderDownColor:  "#f87171",
      wickUpColor:      "#22d3ee",
      wickDownColor:    "#f87171",
      priceFormat:      { type: "price", precision: dec, minMove: Math.pow(10, -dec) },
    })
    candleSerRef.current = cSer

    // ── Volume histogram (overlay on candle pane, bottom) ──
    const vSer = chart.addHistogramSeries({
      priceFormat:     { type: "volume" },
      priceScaleId:    "vol",
    })
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
    volSerRef.current = vSer

    // ── EMA overlays ──
    const mkLine = (color: string, width = 1) => chart.addLineSeries({
      color, lineWidth: width as 1 | 2 | 3 | 4,
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      priceFormat: { type: "price", precision: dec, minMove: Math.pow(10, -dec) },
    })
    ema9Ref.current  = mkLine("#fbbf24", 1)
    ema21Ref.current = mkLine("#60a5fa", 1)
    ema50Ref.current = mkLine("#f472b6", 1)

    // ── Bollinger Bands ──
    bbUpperRef.current = mkLine("rgba(129,140,248,0.7)", 1)
    bbMidRef.current   = mkLine("rgba(129,140,248,0.4)", 1)
    bbLowerRef.current = mkLine("rgba(129,140,248,0.7)", 1)

    // ── RSI pane ──
    const rsiSer = chart.addLineSeries({
      color: "#34d399", lineWidth: 1,
      priceScaleId: "rsi",
      priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    })
    chart.priceScale("rsi").applyOptions({
      scaleMargins: { top: 0.75, bottom: 0.02 },
      visible: false,
    })
    rsiSerRef.current = rsiSer

    const rsiOb = chart.addLineSeries({ color: "rgba(248,113,113,0.3)", lineWidth: 1, priceScaleId: "rsi", priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })
    const rsiOs = chart.addLineSeries({ color: "rgba(52,211,153,0.3)",  lineWidth: 1, priceScaleId: "rsi", priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })
    rsiOb70Ref.current = rsiOb
    rsiOs30Ref.current = rsiOs

    // ── MACD pane ──
    const macdSer = chart.addLineSeries({
      color: "#fb923c", lineWidth: 1,
      priceScaleId: "macd",
      priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false,
    })
    const macdSigSer = chart.addLineSeries({
      color: "#818cf8", lineWidth: 1,
      priceScaleId: "macd",
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
    })
    const macdHistSer = chart.addHistogramSeries({
      priceScaleId: "macd",
      priceLineVisible: false, lastValueVisible: false,
    })
    chart.priceScale("macd").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0.02 },
      visible: false,
    })
    macdSerRef.current  = macdSer
    macdSigRef.current  = macdSigSer
    macdHistRef.current = macdHistSer

    // Resize observer
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

  // ─── Update candle + volume data ────────────────────────────────────────────
  useEffect(() => {
    if (!candleSerRef.current || !volSerRef.current || candleData.length === 0) return
    candleSerRef.current.setData(candleData)
    volSerRef.current.setData(volData)
    // Fit visible range to last 80 candles
    if (chartRef.current) {
      const from = Math.max(0, candleData.length - 80)
      chartRef.current.timeScale().setVisibleLogicalRange({ from, to: candleData.length + 1 })
    }
  }, [candleData, volData])

  // ─── Update EMA indicators ───────────────────────────────────────────────────
  useEffect(() => {
    if (!ema9Ref.current || times.length === 0) return
    const d9 = toLineData(ema9d)
    ema9Ref.current.setData(indicators.ema9 ? d9 : [])
    ema9Ref.current.applyOptions({ visible: indicators.ema9 })
  }, [ema9d, indicators.ema9, times])

  useEffect(() => {
    if (!ema21Ref.current || times.length === 0) return
    ema21Ref.current.setData(indicators.ema21 ? toLineData(ema21d) : [])
    ema21Ref.current.applyOptions({ visible: indicators.ema21 })
  }, [ema21d, indicators.ema21, times])

  useEffect(() => {
    if (!ema50Ref.current || times.length === 0) return
    ema50Ref.current.setData(indicators.ema50 ? toLineData(ema50d) : [])
    ema50Ref.current.applyOptions({ visible: indicators.ema50 })
  }, [ema50d, indicators.ema50, times])

  // ─── Update Bollinger Bands ──────────────────────────────────────────────────
  useEffect(() => {
    if (!bbUpperRef.current || !bbMidRef.current || !bbLowerRef.current || times.length === 0) return
    const show = indicators.bb
    bbUpperRef.current.setData(show ? toLineData(bbd.upper) : [])
    bbMidRef.current.setData(show ? toLineData(bbd.mid) : [])
    bbLowerRef.current.setData(show ? toLineData(bbd.lower) : [])
    bbUpperRef.current.applyOptions({ visible: show })
    bbMidRef.current.applyOptions({ visible: show })
    bbLowerRef.current.applyOptions({ visible: show })
  }, [bbd, indicators.bb, times])

  // ─── Update RSI pane ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!rsiSerRef.current || !rsiOb70Ref.current || !rsiOs30Ref.current || times.length === 0) return
    const show = indicators.rsi && chartPane === "rsi"
    rsiSerRef.current.setData(show ? toLineData(rsid) : [])
    rsiSerRef.current.applyOptions({ visible: show })
    // OB/OS reference lines
    const obData: LineData[] = times.map((t) => ({ time: t, value: 70 }))
    const osData: LineData[] = times.map((t) => ({ time: t, value: 30 }))
    rsiOb70Ref.current.setData(show ? obData : [])
    rsiOs30Ref.current.setData(show ? osData : [])
    rsiOb70Ref.current.applyOptions({ visible: show })
    rsiOs30Ref.current.applyOptions({ visible: show })
    if (chartRef.current) {
      chartRef.current.priceScale("rsi").applyOptions({
        scaleMargins: show ? { top: 0.72, bottom: 0.02 } : { top: 0.99, bottom: 0 },
      })
    }
  }, [rsid, indicators.rsi, chartPane, times])

  // ─── Update MACD pane ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!macdSerRef.current || !macdSigRef.current || !macdHistRef.current || times.length === 0) return
    const show = indicators.macd && chartPane === "macd"
    macdSerRef.current.setData(show ? toLineData(macdd.macd) : [])
    macdSigRef.current.setData(show ? toLineData(macdd.signal) : [])
    macdHistRef.current.setData(show ? toHistData(macdd.hist, "rgba(34,211,238,0.55)", "rgba(248,113,113,0.55)") : [])
    macdSerRef.current.applyOptions({ visible: show })
    macdSigRef.current.applyOptions({ visible: show })
    macdHistRef.current.applyOptions({ visible: show })
    if (chartRef.current) {
      chartRef.current.priceScale("macd").applyOptions({
        scaleMargins: show ? { top: 0.72, bottom: 0.02 } : { top: 0.99, bottom: 0 },
      })
    }
  }, [macdd, indicators.macd, chartPane, times])

  // ─── Open trade price lines ──────────────────────────────────────────────────
  useEffect(() => {
    if (!candleSerRef.current) return
    // TradingView lightweight charts doesn't support removing individual price lines easily,
    // so we recreate them via series price line options on candle series
    // (price lines are managed separately per trade via priceLine API)
    openTrades.forEach((t) => {
      if (!candleSerRef.current) return
      candleSerRef.current.createPriceLine({
        price: t.openPrice,
        color: t.direction === "BUY" ? "#22d3ee" : "#f87171",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `${t.direction} ${t.pair}`,
      })
      if (t.sl) candleSerRef.current.createPriceLine({ price: t.sl, color: "#f87171", lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: "SL" })
      if (t.tp) candleSerRef.current.createPriceLine({ price: t.tp, color: "#34d399", lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: "TP" })
    })
  }, [openTrades])

  const toggle = (key: keyof IndicatorSet) => setIndicators((p) => ({ ...p, [key]: !p[key] }))
  const isLoading = candles.length === 0

  return (
    <div className="flex flex-col w-full h-full select-none bg-[#070d1a]">

      {/* ── Toolbar ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center flex-wrap gap-1 px-2 py-1.5 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>

        {/* Indicator toggles */}
        {([
          { key: "ema9",  label: "EMA9",  color: "#fbbf24" },
          { key: "ema21", label: "EMA21", color: "#60a5fa" },
          { key: "ema50", label: "EMA50", color: "#f472b6" },
          { key: "bb",    label: "BB",    color: "#818cf8" },
          { key: "volume",label: "VOL",   color: "#22d3ee" },
        ] as { key: keyof IndicatorSet; label: string; color: string }[]).map(({ key, label, color }) => (
          <button key={key} onClick={() => toggle(key)}
            className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider transition-all"
            style={indicators[key]
              ? { background: `${color}22`, color, border: `1px solid ${color}55` }
              : { background: "rgba(255,255,255,0.03)", color: "rgba(100,116,139,0.4)", border: "1px solid rgba(255,255,255,0.06)" }
            }>
            {label}
          </button>
        ))}

        <div className="w-px h-3 self-center mx-0.5" style={{ background: "rgba(255,255,255,0.08)" }} />

        {/* Sub-pane toggle */}
        {([
          { id: "rsi",  label: "RSI",  color: "#34d399" },
          { id: "macd", label: "MACD", color: "#fb923c" },
        ] as { id: "rsi" | "macd"; label: string; color: string }[]).map(({ id, label, color }) => {
          const active = chartPane === id && indicators[id as keyof IndicatorSet]
          return (
            <button key={id} onClick={() => {
              if (chartPane === id && indicators[id as keyof IndicatorSet]) {
                setChartPane("none")
                setIndicators((p) => ({ ...p, [id]: false }))
              } else {
                setChartPane(id)
                setIndicators((p) => ({ ...p, rsi: id === "rsi", macd: id === "macd" }))
              }
            }}
              className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider transition-all"
              style={active
                ? { background: `${color}22`, color, border: `1px solid ${color}55` }
                : { background: "rgba(255,255,255,0.03)", color: "rgba(100,116,139,0.4)", border: "1px solid rgba(255,255,255,0.06)" }
              }>
              {label}
            </button>
          )
        })}

        {/* Powered by label */}
        <span className="ml-auto text-[8px] tracking-widest font-black opacity-30"
          style={{ color: "#3d5573" }}>
          TRADINGVIEW
        </span>
      </div>

      {/* ── Chart container ────────────────────────────────────────────────────── */}
      <div ref={containerRef} className="relative flex-1 min-h-0 w-full">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center"
            style={{ background: "rgba(7,13,26,0.85)", backdropFilter: "blur(4px)" }}>
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-[10px] font-mono tracking-widest" style={{ color: "rgba(100,116,139,0.6)" }}>
                LOADING CHART...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
