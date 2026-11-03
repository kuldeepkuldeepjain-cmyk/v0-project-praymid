"use client"

type Quote = { mid: number; change: number }
type MarketStatus = "live" | "stale" | "offline"

const INSTRUMENTS = ["EUR/USD", "GBP/USD", "USD/JPY", "BTC/USD", "ETH/USD", "XAU/USD", "USD/CHF", "AUD/USD"] as const

function InstrumentList({ rates }: { rates: Record<string, Quote> }) {
  return (
    <>
      {INSTRUMENTS.map((symbol) => {
        const quote = rates[symbol]
        const digits = symbol === "USD/JPY" || symbol === "XAU/USD" ? 3 : symbol === "BTC/USD" || symbol === "ETH/USD" ? 2 : 5
        const price = quote?.mid.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }) ?? "—"
        return (
          <span key={symbol} className="flex shrink-0 items-center gap-2 px-5 font-mono text-sm tabular-nums">
            <span className="font-semibold text-slate-300">{symbol}</span>
            <span className="text-slate-100">{price}</span>
            {quote && <span className={quote.change >= 0 ? "text-emerald-300" : "text-red-300"}>{quote.change >= 0 ? "+" : ""}{quote.change.toFixed(2)}%</span>}
          </span>
        )
      })}
    </>
  )
}

export function ParticipantMarketTicker({ rates, status }: { rates: Record<string, Quote>; status: MarketStatus }) {
  const label = status === "live" ? "Live market rates" : status === "stale" ? "Market rates delayed" : "Market rates unavailable"

  return (
    <section className="mx-3 overflow-hidden rounded-xl border sm:mx-4" aria-label="Market instrument rates" style={{ background: "var(--terminal-graphite-surface)", borderColor: "var(--terminal-graphite-border)" }}>
      <div className="flex min-h-12 items-center">
        <div className="flex shrink-0 items-center gap-2 border-r px-3 py-2 sm:px-4" style={{ borderColor: "var(--terminal-graphite-border)" }} role="status" aria-label={label}>
          <span className={`size-2 rounded-full ${status === "live" ? "bg-emerald-300" : status === "stale" ? "bg-amber-300" : "bg-slate-500"}`} aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">{status === "live" ? "Live rates" : status === "stale" ? "Delayed" : "Unavailable"}</span>
        </div>
        <div className="ticker-wrap min-w-0 flex-1" aria-label="Instrument prices">
          <div className="ticker-tape py-2">
            <div className="flex shrink-0 items-center"><InstrumentList rates={rates} /></div>
            <div className="flex shrink-0 items-center" aria-hidden="true"><InstrumentList rates={rates} /></div>
          </div>
        </div>
      </div>
    </section>
  )
}
