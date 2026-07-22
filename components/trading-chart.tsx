"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

export type Candle = {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type OpenTrade = {
  id: string
  pair: string
  direction: "BUY" | "SELL"
  openPrice: number
  sl: number | null
  tp: number | null
}

type DrawingTool = "none" | "hline" | "trendline" | "rect"

type Drawing =
  | { type: "hline"; price: number; color: string }
  | { type: "trendline"; x1: number; y1: number; x2: number; y2: number; color: string }
  | { type: "rect"; x1: number; y1: number; x2: number; y2: number; color: string }

type IndicatorSet = {
  ema9: boolean
  ema21: boolean
  ema50: boolean
  bb: boolean
  rsi: boolean
  macd: boolean
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

function calcEMA(closes: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1)
  const result: (number | null)[] = new Array(closes.length).fill(null)
  let ema: number | null = null
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result[i] = null; continue }
    if (ema === null) {
      ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
    } else {
      ema = closes[i] * k + ema * (1 - k)
    }
    result[i] = ema
  }
  return result
}

function calcBB(closes: number[], period = 20, multiplier = 2): { upper: (number | null)[]; mid: (number | null)[]; lower: (number | null)[] } {
  const upper: (number | null)[] = []
  const mid: (number | null)[] = []
  const lower: (number | null)[] = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { upper.push(null); mid.push(null); lower.push(null); continue }
    const slice = closes.slice(i - period + 1, i + 1)
    const sma = slice.reduce((a, b) => a + b, 0) / period
    const variance = slice.reduce((s, v) => s + (v - sma) ** 2, 0) / period
    const sd = Math.sqrt(variance)
    upper.push(sma + multiplier * sd)
    mid.push(sma)
    lower.push(sma - multiplier * sd)
  }
  return { upper, mid, lower }
}

function calcRSI(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null)
  if (closes.length < period + 1) return result
  let avgGain = 0, avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) avgGain += diff; else avgLoss -= diff
  }
  avgGain /= period; avgLoss /= period
  result[period] = 100 - 100 / (1 + (avgLoss === 0 ? Infinity : avgGain / avgLoss))
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    result[i] = 100 - 100 / (1 + (avgLoss === 0 ? Infinity : avgGain / avgLoss))
  }
  return result
}

function calcMACD(closes: number[]): {
  macd: (number | null)[]; signal: (number | null)[]; hist: (number | null)[]
} {
  const ema12 = calcEMA(closes, 12)
  const ema26 = calcEMA(closes, 26)
  const macd: (number | null)[] = closes.map((_, i) =>
    ema12[i] !== null && ema26[i] !== null ? ema12[i]! - ema26[i]! : null
  )
  // signal = EMA9 of MACD (only where macd is not null)
  const macdValid = macd.map((v) => v ?? 0)
  const rawSignal = calcEMA(macdValid, 9)
  const signal: (number | null)[] = macd.map((v, i) => (v !== null ? rawSignal[i] : null))
  const hist: (number | null)[] = macd.map((v, i) =>
    v !== null && signal[i] !== null ? v - signal[i]! : null
  )
  return { macd, signal, hist }
}

// ─── SVG polyline from nullable series ────────────────────────────────────────

function seriesToPolyline(
  data: (number | null)[],
  toX: (i: number) => number,
  toY: (v: number) => number
): string {
  const segments: string[] = []
  let current = ""
  for (let i = 0; i < data.length; i++) {
    if (data[i] === null) {
      if (current) { segments.push(current); current = "" }
      continue
    }
    const x = toX(i).toFixed(1)
    const y = toY(data[i]!).toFixed(1)
    current += current ? ` L${x},${y}` : `M${x},${y}`
  }
  if (current) segments.push(current)
  return segments.join(" ")
}

// ─── Pad helpers ──────────────────────────────────────────────────────────────

function isJpy(sym: string): boolean { return sym.includes("JPY") }
function fmtP(price: number, sym: string): string { return price.toFixed(isJpy(sym) ? 3 : 5) }
function pipS(sym: string): number { return isJpy(sym) ? 0.01 : 0.0001 }

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
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 340, h: 340 })
  const [hovered, setHovered] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; candle: Candle } | null>(null)
  const [activeTool, setActiveTool] = useState<DrawingTool>("none")
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [inProgress, setInProgress] = useState<Drawing | null>(null)
  const [mouseDownPos, setMouseDownPos] = useState<{ svgX: number; svgY: number; price: number } | null>(null)
  const [indicators, setIndicators] = useState<IndicatorSet>({
    ema9: true, ema21: true, ema50: false, bb: false, rsi: true, macd: false,
  })
  const [drawColor, setDrawColor] = useState("#f59e0b")

  // Resize observer
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

  // ── Layout ─────────────────────────────────────────────────────────────────
  const { w, h } = size
  const visible = candles.slice(-70)

  const showRsi = indicators.rsi
  const showMacd = indicators.macd

  const padL = 58, padR = 10, padT = 10, padB = 20
  const volH = 28
  const rsiH = showRsi ? 52 : 0
  const macdH = showMacd ? 52 : 0
  const subGap = (showRsi || showMacd) ? 6 : 0
  const candleH = h - padT - padB - volH - rsiH - macdH - subGap * ((showRsi ? 1 : 0) + (showMacd ? 1 : 0))
  const volY = padT + candleH
  const rsiY = showRsi ? volY + volH + subGap : volY + volH
  const macdY = showMacd ? rsiY + rsiH + (showRsi ? subGap : 0) : rsiY

  const chartW = w - padL - padR
  const colW = chartW / Math.max(visible.length, 1)
  const candleW = Math.max(2, colW - 1.5)

  // Price range for candle area
  const allHigh = Math.max(...visible.map((c) => c.high))
  const allLow = Math.min(...visible.map((c) => c.low))
  const priceRange = allHigh - allLow || pipS(sym) * 10

  // Closes for indicator calc (use all candles for accurate indicators, map to visible indices)
  const allCloses = candles.map((c) => c.close)
  const visibleStartIdx = candles.length - visible.length
  const slice = (arr: (number | null)[]) => arr.slice(visibleStartIdx)

  const ema9All = useMemo(() => calcEMA(allCloses, 9), [allCloses])
  const ema21All = useMemo(() => calcEMA(allCloses, 21), [allCloses])
  const ema50All = useMemo(() => calcEMA(allCloses, 50), [allCloses])
  const bbAll = useMemo(() => calcBB(allCloses, 20, 2), [allCloses])
  const rsiAll = useMemo(() => calcRSI(allCloses, 14), [allCloses])
  const macdAll = useMemo(() => calcMACD(allCloses), [allCloses])

  const ema9 = slice(ema9All)
  const ema21 = slice(ema21All)
  const ema50 = slice(ema50All)
  const bb = { upper: slice(bbAll.upper), mid: slice(bbAll.mid), lower: slice(bbAll.lower) }
  const rsi = slice(rsiAll)
  const macd = { macd: slice(macdAll.macd), signal: slice(macdAll.signal), hist: slice(macdAll.hist) }

  // Coord transforms
  function toY(price: number): number {
    return padT + ((allHigh - price) / priceRange) * candleH
  }
  function toX(i: number): number {
    return padL + (i + 0.5) * colW
  }
  function toPrice(svgY: number): number {
    return allHigh - ((svgY - padT) / candleH) * priceRange
  }

  // RSI y-transform (0–100 range)
  function toRsiY(val: number): number {
    return rsiY + (1 - val / 100) * rsiH
  }

  // MACD y-transform
  const macdVals = macd.macd.filter((v) => v !== null) as number[]
  const macdSigVals = macd.signal.filter((v) => v !== null) as number[]
  const macdAllVals = [...macdVals, ...macdSigVals]
  const macdMin = macdAllVals.length ? Math.min(...macdAllVals) * 1.2 : -0.001
  const macdMax = macdAllVals.length ? Math.max(...macdAllVals) * 1.2 : 0.001
  const macdRange = macdMax - macdMin || 0.001
  function toMacdY(val: number): number {
    return macdY + ((macdMax - val) / macdRange) * macdH
  }

  // Volume
  const maxVol = Math.max(...visible.map((c) => c.volume), 1)

  // Grid prices
  const gridPrices: number[] = []
  const step = priceRange / 5
  for (let i = 0; i <= 5; i++) gridPrices.push(allLow + step * i)

  // Drawing SVG pos from mouse event
  const getSvgPos = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return null
    const rect = svgRef.current.getBoundingClientRect()
    return { svgX: e.clientX - rect.left, svgY: e.clientY - rect.top }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const pos = getSvgPos(e)
    if (!pos) return

    // Candle hover
    const idx = Math.floor((pos.svgX - padL) / colW)
    if (idx >= 0 && idx < visible.length) {
      setHovered(idx)
      setTooltip({ x: pos.svgX, y: pos.svgY, candle: visible[idx] })
    } else {
      setHovered(null); setTooltip(null)
    }

    // Drawing in-progress
    if (mouseDownPos && activeTool !== "none") {
      const { svgX: sx, svgY: sy, price: startPrice } = mouseDownPos
      if (activeTool === "hline") {
        setInProgress({ type: "hline", price: toPrice(pos.svgY), color: drawColor })
      } else if (activeTool === "trendline") {
        setInProgress({ type: "trendline", x1: sx, y1: sy, x2: pos.svgX, y2: pos.svgY, color: drawColor })
      } else if (activeTool === "rect") {
        setInProgress({ type: "rect", x1: sx, y1: sy, x2: pos.svgX, y2: pos.svgY, color: drawColor })
      }
    }
  }, [getSvgPos, mouseDownPos, activeTool, drawColor, visible, colW, padL, toPrice])

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === "none") return
    const pos = getSvgPos(e)
    if (!pos) return
    setMouseDownPos({ svgX: pos.svgX, svgY: pos.svgY, price: toPrice(pos.svgY) })
  }, [activeTool, getSvgPos, toPrice])

  const handleMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === "none" || !mouseDownPos) return
    const pos = getSvgPos(e)
    if (!pos) return
    const { svgX: sx, svgY: sy, price: startPrice } = mouseDownPos
    let newDrawing: Drawing | null = null
    if (activeTool === "hline") {
      newDrawing = { type: "hline", price: toPrice(pos.svgY), color: drawColor }
    } else if (activeTool === "trendline") {
      newDrawing = { type: "trendline", x1: sx, y1: sy, x2: pos.svgX, y2: pos.svgY, color: drawColor }
    } else if (activeTool === "rect") {
      newDrawing = { type: "rect", x1: sx, y1: sy, x2: pos.svgX, y2: pos.svgY, color: drawColor }
    }
    if (newDrawing) setDrawings((prev) => [...prev, newDrawing!])
    setInProgress(null)
    setMouseDownPos(null)
  }, [activeTool, mouseDownPos, getSvgPos, drawColor, toPrice])

  const toggleIndicator = (key: keyof IndicatorSet) => {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const currentClose = visible.length > 0 ? visible[visible.length - 1].close : 0
  const isUp = visible.length > 1 ? visible[visible.length - 1].close >= visible[visible.length - 2].close : true

  return (
    <div className="flex flex-col w-full h-full select-none" style={{ userSelect: "none" }}>

      {/* ── Indicator toolbar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-2 pt-1.5 pb-1 flex-wrap"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      >
        {/* Indicator toggles */}
        {([
          { key: "ema9",  label: "EMA9",  color: "#fbbf24" },
          { key: "ema21", label: "EMA21", color: "#60a5fa" },
          { key: "ema50", label: "EMA50", color: "#f472b6" },
          { key: "bb",    label: "BB",    color: "#818cf8" },
          { key: "rsi",   label: "RSI",   color: "#34d399" },
          { key: "macd",  label: "MACD",  color: "#fb923c" },
        ] as { key: keyof IndicatorSet; label: string; color: string }[]).map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => toggleIndicator(key)}
            className="px-1.5 py-0.5 rounded text-[9px] font-black transition-all"
            style={indicators[key]
              ? { background: `${color}22`, color, border: `1px solid ${color}55` }
              : { background: "rgba(255,255,255,0.03)", color: "rgba(100,116,139,0.4)", border: "1px solid rgba(255,255,255,0.06)" }
            }
          >
            {label}
          </button>
        ))}

        <div className="w-px h-3 self-center mx-0.5" style={{ background: "rgba(255,255,255,0.08)" }} />

        {/* Drawing tools */}
        {([
          { tool: "hline" as DrawingTool,     label: "—",  title: "Horizontal line" },
          { tool: "trendline" as DrawingTool,  label: "╱",  title: "Trendline" },
          { tool: "rect" as DrawingTool,       label: "▭",  title: "Rectangle" },
        ]).map(({ tool, label, title }) => (
          <button
            key={tool}
            onClick={() => setActiveTool((t) => t === tool ? "none" : tool)}
            title={title}
            className="px-1.5 py-0.5 rounded text-[10px] font-black transition-all"
            style={activeTool === tool
              ? { background: "rgba(251,146,60,0.18)", color: "#fb923c", border: "1px solid rgba(251,146,60,0.35)" }
              : { background: "rgba(255,255,255,0.03)", color: "rgba(100,116,139,0.5)", border: "1px solid rgba(255,255,255,0.06)" }
            }
          >
            {label}
          </button>
        ))}

        {/* Color picker */}
        {activeTool !== "none" && (
          <input
            type="color"
            value={drawColor}
            onChange={(e) => setDrawColor(e.target.value)}
            className="w-5 h-5 rounded cursor-pointer border-0 p-0"
            style={{ background: "transparent" }}
          />
        )}

        {/* Clear drawings */}
        {drawings.length > 0 && (
          <button
            onClick={() => setDrawings([])}
            className="px-1.5 py-0.5 rounded text-[9px] font-black ml-auto"
            style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Main SVG chart ─────────────────────────────────────────────────────── */}
      <div ref={containerRef} className="relative flex-1" style={{ cursor: activeTool !== "none" ? "crosshair" : "default" }}>
        <svg
          ref={svgRef}
          width={w}
          height={h}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setHovered(null); setTooltip(null); setMouseDownPos(null); setInProgress(null) }}
          style={{ display: "block" }}
        >
          {/* ── Background sections ───────────────────────────────────────────── */}
          <rect x={0} y={0} width={w} height={h} fill="transparent" />

          {/* RSI pane bg */}
          {showRsi && <rect x={padL} y={rsiY} width={chartW} height={rsiH}
            fill="rgba(52,211,153,0.02)" rx={2} />}

          {/* MACD pane bg */}
          {showMacd && <rect x={padL} y={macdY} width={chartW} height={macdH}
            fill="rgba(251,146,60,0.02)" rx={2} />}

          {/* ── Price grid lines ───────────────────────────────────────────────── */}
          {gridPrices.map((p, i) => (
            <g key={i}>
              <line x1={padL} x2={w - padR} y1={toY(p)} y2={toY(p)}
                stroke="rgba(255,255,255,0.035)" strokeWidth={1} />
              <text x={padL - 4} y={toY(p) + 3} fill="rgba(100,116,139,0.65)"
                fontSize={8} textAnchor="end" fontFamily="monospace">
                {fmtP(p, sym)}
              </text>
            </g>
          ))}

          {/* ── Bollinger Bands ───────────────────────────────────────────────── */}
          {indicators.bb && (() => {
            const upperPath = seriesToPolyline(bb.upper, toX, toY)
            const midPath = seriesToPolyline(bb.mid, toX, toY)
            const lowerPath = seriesToPolyline(bb.lower, toX, toY)
            // Fill band
            const upperPoints = bb.upper.map((v, i) => v !== null ? `${toX(i).toFixed(1)},${toY(v).toFixed(1)}` : null).filter(Boolean)
            const lowerPointsRev = [...bb.lower].reverse().map((v, i) => {
              const origI = bb.lower.length - 1 - i
              return v !== null ? `${toX(origI).toFixed(1)},${toY(v).toFixed(1)}` : null
            }).filter(Boolean)
            const fillPts = [...upperPoints, ...lowerPointsRev].join(" ")
            return (
              <g>
                <polygon points={fillPts} fill="rgba(129,140,248,0.06)" />
                <path d={upperPath} stroke="#818cf8" strokeWidth={0.8} fill="none" opacity={0.5} />
                <path d={midPath} stroke="#818cf8" strokeWidth={0.7} fill="none" opacity={0.35} strokeDasharray="3 2" />
                <path d={lowerPath} stroke="#818cf8" strokeWidth={0.8} fill="none" opacity={0.5} />
              </g>
            )
          })()}

          {/* ── EMA lines ─────────────────────────────────────────────────────── */}
          {indicators.ema50 && (
            <path d={seriesToPolyline(ema50, toX, toY)} stroke="#f472b6" strokeWidth={1} fill="none" opacity={0.7} />
          )}
          {indicators.ema21 && (
            <path d={seriesToPolyline(ema21, toX, toY)} stroke="#60a5fa" strokeWidth={1} fill="none" opacity={0.8} />
          )}
          {indicators.ema9 && (
            <path d={seriesToPolyline(ema9, toX, toY)} stroke="#fbbf24" strokeWidth={1} fill="none" opacity={0.85} />
          )}

          {/* ── SL/TP / Open price lines from trades ──────────────────────────── */}
          {openTrades.map((t) => (
            <g key={t.id}>
              {t.sl && (
                <>
                  <line x1={padL} x2={w - padR} y1={toY(t.sl)} y2={toY(t.sl)}
                    stroke="#f87171" strokeWidth={1} strokeDasharray="4 3" opacity={0.75} />
                  <rect x={padL} y={toY(t.sl) - 8} width={18} height={10} rx={2} fill="rgba(248,113,113,0.15)" />
                  <text x={padL + 9} y={toY(t.sl) - 1} fill="#f87171" fontSize={7} textAnchor="middle" fontFamily="monospace" fontWeight="bold">SL</text>
                </>
              )}
              {t.tp && (
                <>
                  <line x1={padL} x2={w - padR} y1={toY(t.tp)} y2={toY(t.tp)}
                    stroke="#34d399" strokeWidth={1} strokeDasharray="4 3" opacity={0.75} />
                  <rect x={padL} y={toY(t.tp) - 8} width={18} height={10} rx={2} fill="rgba(52,211,153,0.15)" />
                  <text x={padL + 9} y={toY(t.tp) - 1} fill="#34d399" fontSize={7} textAnchor="middle" fontFamily="monospace" fontWeight="bold">TP</text>
                </>
              )}
              <line
                x1={padL} x2={w - padR}
                y1={toY(t.openPrice)} y2={toY(t.openPrice)}
                stroke={t.direction === "BUY" ? "#34d399" : "#f87171"}
                strokeWidth={1} strokeDasharray="6 2" opacity={0.45}
              />
            </g>
          ))}

          {/* ── Candlesticks ──────────────────────────────────────────────────── */}
          {visible.map((c, i) => {
            const x = toX(i)
            const isGreen = c.close >= c.open
            const bodyTop = toY(Math.max(c.open, c.close))
            const bodyBot = toY(Math.min(c.open, c.close))
            const bodyH = Math.max(1, bodyBot - bodyTop)
            const isHov = hovered === i
            const color = isGreen ? "#22c55e" : "#ef4444"
            const fill = isGreen ? "rgba(34,197,94,0.82)" : "rgba(239,68,68,0.82)"
            const wickFill = isGreen ? "rgba(34,197,94,0.55)" : "rgba(239,68,68,0.55)"

            return (
              <g key={i}>
                <line x1={x} x2={x} y1={toY(c.high)} y2={bodyTop}
                  stroke={isHov ? color : wickFill} strokeWidth={isHov ? 1.5 : 1} />
                <line x1={x} x2={x} y1={bodyBot} y2={toY(c.low)}
                  stroke={isHov ? color : wickFill} strokeWidth={isHov ? 1.5 : 1} />
                <rect
                  x={x - candleW / 2} y={bodyTop}
                  width={candleW} height={bodyH}
                  fill={isHov ? color : fill}
                  rx={candleW > 4 ? 1.5 : 0}
                  style={{ filter: isHov ? `drop-shadow(0 0 3px ${color})` : undefined }}
                />
              </g>
            )
          })}

          {/* ── Current price dashed line ─────────────────────────────────────── */}
          {visible.length > 0 && (
            <g>
              <line x1={padL} x2={w - padR} y1={toY(currentClose)} y2={toY(currentClose)}
                stroke={isUp ? "#22c55e" : "#ef4444"} strokeWidth={1} strokeDasharray="3 2" opacity={0.8} />
              {/* Price label pill */}
              <rect x={w - padR - 52} y={toY(currentClose) - 8} width={52} height={14} rx={3}
                fill={isUp ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}
                stroke={isUp ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)"} strokeWidth={0.5} />
              <text x={w - padR - 26} y={toY(currentClose) + 3.5}
                fill={isUp ? "#22c55e" : "#ef4444"} fontSize={8} textAnchor="middle"
                fontFamily="monospace" fontWeight="bold">
                {fmtP(currentClose, sym)}
              </text>
            </g>
          )}

          {/* ── Crosshair ─────────────────────────────────────────────────────── */}
          {hovered !== null && (
            <>
              <line x1={toX(hovered)} x2={toX(hovered)} y1={padT} y2={h - padB}
                stroke="rgba(34,211,238,0.25)" strokeWidth={1} strokeDasharray="3 2" />
              {tooltip && (
                <line x1={padL} x2={w - padR} y1={tooltip.y} y2={tooltip.y}
                  stroke="rgba(34,211,238,0.18)" strokeWidth={1} strokeDasharray="3 2" />
              )}
            </>
          )}

          {/* ── Volume bars ───────────────────────────────────────────────────── */}
          {visible.map((c, i) => {
            const x = toX(i)
            const barH = (c.volume / maxVol) * volH
            const isGreen = c.close >= c.open
            return (
              <rect key={i}
                x={x - candleW / 2} y={volY + volH - barH}
                width={candleW} height={barH}
                fill={isGreen ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}
                rx={1}
              />
            )
          })}

          {/* ── RSI pane ──────────────────────────────────────────────────────── */}
          {showRsi && (() => {
            const rsiPath = seriesToPolyline(rsi, toX, toRsiY)
            // Overbought / oversold zones
            return (
              <g>
                <text x={padL - 4} y={rsiY + 5} fill="rgba(100,116,139,0.5)" fontSize={7} textAnchor="end" fontFamily="monospace">RSI</text>
                {/* Zone fills */}
                <rect x={padL} y={rsiY} width={chartW} height={rsiH * 0.3}
                  fill="rgba(239,68,68,0.04)" />
                <rect x={padL} y={rsiY + rsiH * 0.7} width={chartW} height={rsiH * 0.3}
                  fill="rgba(34,197,94,0.04)" />
                {/* 70 / 30 lines */}
                <line x1={padL} x2={w - padR} y1={toRsiY(70)} y2={toRsiY(70)}
                  stroke="rgba(239,68,68,0.25)" strokeWidth={0.5} strokeDasharray="3 2" />
                <line x1={padL} x2={w - padR} y1={toRsiY(30)} y2={toRsiY(30)}
                  stroke="rgba(34,197,94,0.25)" strokeWidth={0.5} strokeDasharray="3 2" />
                <line x1={padL} x2={w - padR} y1={toRsiY(50)} y2={toRsiY(50)}
                  stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
                {/* Labels */}
                <text x={padL - 4} y={toRsiY(70) + 3} fill="rgba(239,68,68,0.5)" fontSize={6} textAnchor="end" fontFamily="monospace">70</text>
                <text x={padL - 4} y={toRsiY(30) + 3} fill="rgba(34,197,94,0.5)" fontSize={6} textAnchor="end" fontFamily="monospace">30</text>
                {/* RSI line */}
                <path d={rsiPath} stroke="#34d399" strokeWidth={1.2} fill="none" opacity={0.85} />
                {/* Current RSI value */}
                {rsi[rsi.length - 1] !== null && (
                  <text x={w - padR - 2} y={toRsiY(rsi[rsi.length - 1]!) + 3}
                    fill="#34d399" fontSize={7} textAnchor="end" fontFamily="monospace" fontWeight="bold">
                    {(rsi[rsi.length - 1]!).toFixed(1)}
                  </text>
                )}
              </g>
            )
          })()}

          {/* ── MACD pane ─────────────────────────────────────────────────────── */}
          {showMacd && (() => {
            const macdPath = seriesToPolyline(macd.macd, toX, toMacdY)
            const signalPath = seriesToPolyline(macd.signal, toX, toMacdY)
            const zeroY = toMacdY(0)
            return (
              <g>
                <text x={padL - 4} y={macdY + 5} fill="rgba(100,116,139,0.5)" fontSize={7} textAnchor="end" fontFamily="monospace">MACD</text>
                {/* Zero line */}
                <line x1={padL} x2={w - padR} y1={zeroY} y2={zeroY}
                  stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
                {/* Histogram bars */}
                {macd.hist.map((v, i) => {
                  if (v === null) return null
                  const barY = v >= 0 ? toMacdY(v) : zeroY
                  const barH = Math.abs(toMacdY(v) - zeroY)
                  return (
                    <rect key={i}
                      x={toX(i) - candleW / 2} y={barY}
                      width={candleW} height={Math.max(1, barH)}
                      fill={v >= 0 ? "rgba(34,197,94,0.45)" : "rgba(239,68,68,0.45)"}
                      rx={0.5}
                    />
                  )
                })}
                {/* MACD & Signal lines */}
                <path d={macdPath} stroke="#fb923c" strokeWidth={1.2} fill="none" opacity={0.9} />
                <path d={signalPath} stroke="#60a5fa" strokeWidth={1} fill="none" opacity={0.8} />
              </g>
            )
          })()}

          {/* ── Drawings (committed) ───────────────────────────────────────────── */}
          {drawings.map((d, i) => {
            if (d.type === "hline") {
              const y = toY(d.price)
              if (y < padT || y > padT + candleH) return null
              return (
                <g key={i}>
                  <line x1={padL} x2={w - padR} y1={y} y2={y}
                    stroke={d.color} strokeWidth={1.2} strokeDasharray="5 3" opacity={0.9} />
                  <text x={padL + 4} y={y - 2} fill={d.color} fontSize={8} fontFamily="monospace" fontWeight="bold">
                    {fmtP(d.price, sym)}
                  </text>
                </g>
              )
            }
            if (d.type === "trendline") {
              return (
                <line key={i}
                  x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2}
                  stroke={d.color} strokeWidth={1.5} opacity={0.9}
                  markerEnd="url(#arrow)" />
              )
            }
            if (d.type === "rect") {
              const rx = Math.min(d.x1, d.x2)
              const ry = Math.min(d.y1, d.y2)
              const rw = Math.abs(d.x2 - d.x1)
              const rh = Math.abs(d.y2 - d.y1)
              return (
                <rect key={i} x={rx} y={ry} width={rw} height={rh}
                  stroke={d.color} strokeWidth={1.2} fill={`${d.color}10`} opacity={0.85} rx={2} />
              )
            }
            return null
          })}

          {/* ── In-progress drawing ───────────────────────────────────────────── */}
          {inProgress && (() => {
            if (inProgress.type === "hline") {
              const y = toY(inProgress.price)
              return (
                <line x1={padL} x2={w - padR} y1={y} y2={y}
                  stroke={inProgress.color} strokeWidth={1} strokeDasharray="5 3" opacity={0.6} />
              )
            }
            if (inProgress.type === "trendline") {
              return (
                <line x1={inProgress.x1} y1={inProgress.y1} x2={inProgress.x2} y2={inProgress.y2}
                  stroke={inProgress.color} strokeWidth={1.2} opacity={0.7} strokeDasharray="4 2" />
              )
            }
            if (inProgress.type === "rect") {
              const rx = Math.min(inProgress.x1, inProgress.x2)
              const ry = Math.min(inProgress.y1, inProgress.y2)
              const rw = Math.abs(inProgress.x2 - inProgress.x1)
              const rh = Math.abs(inProgress.y2 - inProgress.y1)
              return (
                <rect x={rx} y={ry} width={rw} height={rh}
                  stroke={inProgress.color} strokeWidth={1} fill={`${inProgress.color}0a`} opacity={0.7} rx={2} strokeDasharray="4 2" />
              )
            }
            return null
          })()}

          {/* ── X-axis time labels ─────────────────────────────────────────────── */}
          {visible.map((c, i) => {
            if (i % Math.ceil(visible.length / 7) !== 0) return null
            return (
              <text key={i} x={toX(i)} y={h - 6}
                fill="rgba(100,116,139,0.55)" fontSize={7} textAnchor="middle" fontFamily="monospace">
                {c.time}
              </text>
            )
          })}

          {/* ── Pane dividers ──────────────────────────────────────────────────── */}
          {showRsi && (
            <line x1={padL} x2={w - padR} y1={rsiY - 1} y2={rsiY - 1}
              stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          )}
          {showMacd && (
            <line x1={padL} x2={w - padR} y1={macdY - 1} y2={macdY - 1}
              stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          )}
        </svg>

        {/* ── Tooltip ──────────────────────────────────────────────────────────── */}
        {tooltip && hovered !== null && (
          <div
            className="absolute pointer-events-none z-20 rounded-xl text-[10px] font-mono"
            style={{
              left: tooltip.x > w * 0.6 ? tooltip.x - 130 : tooltip.x + 10,
              top: Math.max(8, Math.min(tooltip.y - 60, h - 130)),
              background: "rgba(3,7,18,0.97)",
              border: "1px solid rgba(34,211,238,0.2)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.7)",
              padding: "8px 10px",
              minWidth: 120,
            }}
          >
            <p className="text-cyan-400 mb-1.5 font-bold text-[9px] tracking-wider">
              {tooltip.candle.time}
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <span className="text-slate-500">O</span>
              <span className="text-white">{fmtP(tooltip.candle.open, sym)}</span>
              <span className="text-emerald-400">H</span>
              <span className="text-emerald-400">{fmtP(tooltip.candle.high, sym)}</span>
              <span className="text-red-400">L</span>
              <span className="text-red-400">{fmtP(tooltip.candle.low, sym)}</span>
              <span className="text-slate-300">C</span>
              <span className={tooltip.candle.close >= tooltip.candle.open ? "text-emerald-400" : "text-red-400"}>
                {fmtP(tooltip.candle.close, sym)}
              </span>
              <span className="text-slate-500">Vol</span>
              <span className="text-slate-400">{tooltip.candle.volume.toLocaleString()}</span>
            </div>
            {/* Live indicator values */}
            <div className="mt-1.5 pt-1.5 border-t border-white/5 grid grid-cols-2 gap-x-3 gap-y-0.5">
              {indicators.ema9 && ema9[hovered] !== null && (
                <><span className="text-yellow-400/70">EMA9</span>
                <span className="text-yellow-400">{fmtP(ema9[hovered]!, sym)}</span></>
              )}
              {indicators.ema21 && ema21[hovered] !== null && (
                <><span className="text-blue-400/70">EMA21</span>
                <span className="text-blue-400">{fmtP(ema21[hovered]!, sym)}</span></>
              )}
              {indicators.rsi && rsi[hovered] !== null && (
                <><span className="text-emerald-400/70">RSI</span>
                <span className={`font-black ${rsi[hovered]! > 70 ? "text-red-400" : rsi[hovered]! < 30 ? "text-emerald-400" : "text-emerald-300"}`}>
                  {(rsi[hovered]!).toFixed(1)}
                </span></>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
