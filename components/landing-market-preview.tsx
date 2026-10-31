"use client"

import { useState } from "react"
import { ArrowDownRight, ArrowUpRight, CandlestickChart } from "lucide-react"

const marketGroups = {
  Forex: [
    { symbol: "EUR/USD", bid: "1.0850", ask: "1.0852", move: "+0.45%", direction: "up" },
    { symbol: "GBP/USD", bid: "1.2780", ask: "1.2782", move: "+1.12%", direction: "up" },
    { symbol: "USD/JPY", bid: "149.45", ask: "149.47", move: "−0.23%", direction: "down" },
  ],
  Metals: [
    { symbol: "XAU/USD", bid: "2,385.50", ask: "2,385.70", move: "+0.12%", direction: "up" },
    { symbol: "XAG/USD", bid: "28.43", ask: "28.46", move: "−0.18%", direction: "down" },
    { symbol: "XPT/USD", bid: "958.20", ask: "958.70", move: "+0.31%", direction: "up" },
  ],
  Digital: [
    { symbol: "BTC/USD", bid: "64,250", ask: "64,281", move: "+1.18%", direction: "up" },
    { symbol: "ETH/USD", bid: "3,412", ask: "3,415", move: "+0.62%", direction: "up" },
    { symbol: "SOL/USD", bid: "148.20", ask: "148.55", move: "−0.34%", direction: "down" },
  ],
} as const

type MarketGroup = keyof typeof marketGroups

export function MarketPreview() {
  const [activeGroup, setActiveGroup] = useState<MarketGroup>("Forex")

  return (
    <aside className="elite-market-card" aria-label="Illustrative market interface preview">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CandlestickChart className="elite-brand-text size-4" aria-hidden="true" />
            <p className="elite-market-kicker">Workspace preview</p>
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Market watch</h2>
        </div>
        <span className="elite-preview-tag">Demo view</span>
      </div>

      <div className="elite-market-tabs mt-6" role="group" aria-label="Choose market category">
        {(Object.keys(marketGroups) as MarketGroup[]).map((group) => (
          <button
            key={group}
            type="button"
            aria-pressed={activeGroup === group}
            className={activeGroup === group ? "is-selected" : ""}
            onClick={() => setActiveGroup(group)}
          >
            {group}
          </button>
        ))}
      </div>

      <div className="mt-4" aria-live="polite" aria-atomic="true">
        {marketGroups[activeGroup].map((market) => (
          <div key={market.symbol} className="elite-market-row">
            <div>
              <p className="font-semibold">{market.symbol}</p>
              <p className="elite-market-detail">BID {market.bid} <span aria-hidden="true">·</span> ASK {market.ask}</p>
            </div>
            <span className={`elite-market-change ${market.direction === "up" ? "is-positive" : "is-negative"}`}>
              {market.direction === "up" ? <ArrowUpRight aria-hidden="true" /> : <ArrowDownRight aria-hidden="true" />}
              {market.move}
            </span>
          </div>
        ))}
      </div>

      <div className="elite-market-footnote mt-4">
        <span className="elite-positive" aria-hidden="true">●</span>
        Illustrative values only — not live quotes
      </div>
    </aside>
  )
}
