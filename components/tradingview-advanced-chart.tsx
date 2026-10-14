"use client"

import { useEffect, useRef } from "react"

type TradingViewAdvancedChartProps = {
  symbol: string
  theme?: "light" | "dark"
  interval?: string
  height?: number
}

const SYMBOL_MAP: Record<string, string> = {
  "XAU/USD": "OANDA:XAUUSD",
  "XAG/USD": "OANDA:XAGUSD",
  "EUR/USD": "FX:EURUSD",
  "GBP/USD": "FX:GBPUSD",
  "USD/JPY": "FX:USDJPY",
  "USD/CHF": "FX:USDCHF",
  "AUD/USD": "FX:AUDUSD",
  "USD/CAD": "FX:USDCAD",
  "NZD/USD": "FX:NZDUSD",
  "EUR/GBP": "FX:EURGBP",
  "EUR/JPY": "FX:EURJPY",
  "GBP/JPY": "FX:GBPJPY",
  "BTC/USDT": "BINANCE:BTCUSDT",
  "ETH/USDT": "BINANCE:ETHUSDT",
}

export function TradingViewAdvancedChart({ symbol, theme = "dark", interval = "5", height = 560 }: TradingViewAdvancedChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tradingViewSymbol = SYMBOL_MAP[symbol] ?? symbol.replace("/", "")

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.replaceChildren()

    const widget = document.createElement("div")
    widget.className = "tradingview-widget-container__widget"
    widget.style.height = "100%"
    widget.style.width = "100%"
    container.appendChild(widget)

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.type = "text/javascript"
    script.async = true
    script.textContent = JSON.stringify({
      autosize: true,
      symbol: tradingViewSymbol,
      interval,
      timezone: "Etc/UTC",
      theme,
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      save_image: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
    })
    container.appendChild(script)

    return () => container.replaceChildren()
  }, [interval, theme, tradingViewSymbol])

  return (
    <section className="overflow-hidden rounded-xl border border-slate-700/70 bg-[#0b1220]" aria-label={`TradingView live chart for ${symbol}`}>
      <div className="flex items-center justify-between border-b border-slate-700/70 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)]" aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">TradingView Live</span>
        </div>
        <span className="text-[10px] text-slate-500">{tradingViewSymbol}</span>
      </div>
      <div ref={containerRef} className="tradingview-widget-container" style={{ height, width: "100%" }} />
    </section>
  )
}
