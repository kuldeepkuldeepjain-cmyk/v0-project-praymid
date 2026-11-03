"use client"

import Image from "next/image"
import useSWR from "swr"
import { decimals } from "@/lib/forex-instruments"

type Quote = { mid: number; change: number }
type MarketResponse = {
  rates: Record<string, Quote>
  sources: Record<string, string>
  source: string
  ts: number
}

const INSTRUMENTS = ["EUR/USD", "GBP/USD", "USD/JPY", "BTC/USD", "ETH/USD", "XAU/USD", "USD/CHF", "AUD/USD"] as const
const LIVE_SOURCES = new Set(["tiingo", "twelve-data", "yahoo", "gold-api"])

async function fetchMarketRates(url: string): Promise<MarketResponse> {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) })
  if (!response.ok) throw new Error("Market rates unavailable")
  const data: MarketResponse = await response.json()
  if (!data || typeof data !== "object" || !data.rates || typeof data.rates !== "object" || !data.sources || typeof data.sources !== "object") {
    throw new Error("Invalid market rates response")
  }
  return data
}

function InstrumentList({ rates }: { rates: Record<string, Quote> }) {
  return (
    <>
      {INSTRUMENTS.map((symbol) => {
        const quote = rates[symbol]
        const valid = quote && Number.isFinite(quote.mid) && quote.mid > 0 && Number.isFinite(quote.change)
        const price = valid ? quote.mid.toLocaleString("en-US", { minimumFractionDigits: decimals(symbol), maximumFractionDigits: decimals(symbol) }) : "—"
        return (
          <span key={symbol} className="flex shrink-0 items-center gap-2 border-r border-border/60 px-4 font-mono text-sm tabular-nums last:border-0">
            <span className="font-sans font-semibold text-muted-foreground">{symbol}</span>
            <span className="font-medium text-foreground">{price}</span>
            {valid && <span className={quote.change >= 0 ? "text-[var(--terminal-graphite-positive)]" : "text-[var(--terminal-graphite-negative)]"}>{quote.change >= 0 ? "+" : ""}{quote.change.toFixed(2)}%</span>}
          </span>
        )
      })}
    </>
  )
}

export function ParticipantMarketTicker() {
  const { data, error, isLoading } = useSWR("/api/forex/rates", fetchMarketRates, { refreshInterval: 5_000, revalidateOnFocus: true })
  const rates = data?.rates ?? {}
  const hasLiveQuote = Boolean(data && (data.source === "live" || data.source === "partial-live" || data.source === "cache")
    && Number.isFinite(data.ts) && Date.now() - data.ts < 15_000
    && INSTRUMENTS.some((symbol) => LIVE_SOURCES.has(data.sources[symbol]) && Number.isFinite(data.rates[symbol]?.mid) && data.rates[symbol].mid > 0))
  const status = isLoading && !data ? "Connecting" : hasLiveQuote && !error ? "Live" : Object.keys(rates).length ? "Delayed" : "Unavailable"

  return (
    <section className="mx-3 mt-3 overflow-hidden rounded-lg border border-border bg-card text-card-foreground sm:mx-4" aria-label="Market instrument rates">
      <div className="flex min-h-11 items-center">
        <div className="flex shrink-0 items-center gap-2 border-r border-border px-2 py-1 sm:px-3">
          <Image src="/elite-fund-terminal-logo.png" width={32} height={32} alt="" className="size-8 rounded-md border border-border object-cover" />
          <span className="hidden font-sans text-sm font-bold tracking-tight text-foreground sm:inline">EliteFund</span>
          <span role="status" aria-label={`${status} market rates`} className={`flex items-center gap-1.5 font-sans text-sm font-semibold ${status === "Live" ? "text-primary" : "text-muted-foreground"}`}>
            <span className={`size-1.5 rounded-full ${status === "Live" ? "bg-[var(--terminal-graphite-positive)]" : "bg-muted-foreground"}`} aria-hidden="true" />
            <span>{status}</span>
          </span>
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
