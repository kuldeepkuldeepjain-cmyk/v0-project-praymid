"use client"

import { useState } from "react"
import { Clock, History, Layers, Wallet } from "lucide-react"
import type { ClosedTrade, OpenTrade, PendingOrder } from "@/components/forex-trading-platform"
import { TradeDetailsDialog } from "@/components/trade-details-dialog"

type PortfolioActivityViewProps = {
  openTrades: OpenTrade[]
  pendingOrders: PendingOrder[]
  closedTrades: ClosedTrade[]
  totalPnl: number
  walletBalance: number
  equity: number
  freeMargin: number
  totalMargin: number
  totalLots: number
  formatPrice: (price: number, pair: string) => string
  onCloseTrade: (tradeId: string) => void
  onCancelOrder: (orderId: string) => void
}

function SectionHeading({
  icon: Icon,
  title,
  count,
}: {
  icon: typeof Layers
  title: string
  count: number
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#1b2b3d] px-3 py-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-cyan-300" aria-hidden="true" />
        <h2 className="text-xs font-black uppercase tracking-[0.14em] text-slate-100">{title}</h2>
      </div>
      <span className="rounded-full border border-[#294057] bg-[#0c1928] px-2 py-0.5 font-mono text-[10px] font-bold text-slate-300">
        {count}
      </span>
    </div>
  )
}

function EmptySection({ children }: { children: string }) {
  return (
    <p className="px-3 py-5 text-center text-[11px] text-slate-500">{children}</p>
  )
}

export function PortfolioActivityView({
  openTrades,
  pendingOrders,
  closedTrades,
  totalPnl,
  walletBalance,
  equity,
  freeMargin,
  totalMargin,
  totalLots,
  formatPrice,
  onCloseTrade,
  onCancelOrder,
}: PortfolioActivityViewProps) {
  const [selectedTrade, setSelectedTrade] = useState<ClosedTrade | OpenTrade | PendingOrder | null>(null)
  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3 pb-6 text-slate-100">
      <header className="flex items-center justify-between gap-3 px-1 py-1">
        <div className="flex items-center gap-2">
          <Wallet className="size-5 text-cyan-300" aria-hidden="true" />
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.16em]">Portfolio</h1>
            <p className="text-[10px] text-slate-500">Your positions, working orders, and closed trades</p>
          </div>
        </div>
        <div className="text-right font-mono">
          <p className={`text-xs font-black ${totalPnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
          </p>
          <p className="text-[9px] uppercase tracking-wider text-slate-500">Live P&amp;L</p>
        </div>
      </header>

      <section className="overflow-hidden rounded-xl border border-[#22364d] bg-gradient-to-br from-[#0c1b2b] to-[#081321] shadow-lg shadow-black/20" aria-labelledby="wallet-overview-heading">
        <div className="flex items-center justify-between border-b border-[#1b2b3d] px-3 py-2.5">
          <h2 id="wallet-overview-heading" className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">Wallet overview</h2>
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-cyan-300">USD</span>
        </div>
        <dl className="grid grid-cols-3 divide-x divide-[#1b2b3d] px-1 py-3">
          <div className="min-w-0 px-2">
            <dt className="truncate text-[9px] font-bold uppercase tracking-wider text-slate-500">Balance</dt>
            <dd className="mt-1 truncate font-mono text-xs font-black text-slate-100">{formatCurrency(walletBalance)}</dd>
          </div>
          <div className="min-w-0 px-2">
            <dt className="truncate text-[9px] font-bold uppercase tracking-wider text-slate-500">Equity</dt>
            <dd className="mt-1 truncate font-mono text-xs font-black text-slate-100">{formatCurrency(equity)}</dd>
          </div>
          <div className="min-w-0 px-2">
            <dt className="truncate text-[9px] font-bold uppercase tracking-wider text-slate-500">Free margin</dt>
            <dd className={`mt-1 truncate font-mono text-xs font-black ${freeMargin >= 0 ? "text-cyan-200" : "text-rose-300"}`}>{formatCurrency(freeMargin)}</dd>
          </div>
        </dl>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#22364d] bg-[#081321] shadow-lg shadow-black/20" aria-labelledby="portfolio-positions-heading">
        <div id="portfolio-positions-heading">
          <SectionHeading icon={Layers} title="Positions" count={openTrades.length} />
        </div>
        <div className="flex items-center gap-4 border-b border-[#16263a] bg-[#07101b] px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-slate-500">
          <span>{totalLots.toFixed(2)} lots</span>
          <span>Margin ${totalMargin.toFixed(2)}</span>
        </div>
        {openTrades.length === 0 ? (
          <EmptySection>No open positions</EmptySection>
        ) : (
          <div className="divide-y divide-[#16263a]">
            {openTrades.map(trade => (
              <article key={trade.id} role="button" tabIndex={0} onClick={() => setSelectedTrade(trade)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedTrade(trade) } }} className="flex cursor-pointer items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-cyan-300/[0.04] focus-visible:bg-cyan-300/[0.06] focus-visible:outline-none">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`shrink-0 rounded border px-1.5 py-1 text-[8px] font-black uppercase ${trade.direction === "BUY" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-rose-400/30 bg-rose-400/10 text-rose-300"}`}>
                    {trade.direction}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black">{trade.pair}</p>
                    <p className="truncate font-mono text-[10px] text-slate-500">
                      {trade.lotSize.toFixed(2)} lots · {formatPrice(trade.openPrice, trade.pair)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`font-mono text-xs font-black ${trade.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); onCloseTrade(trade.id) }}
                    aria-label={`Close ${trade.pair} ${trade.direction} position`}
                    className="rounded border border-rose-400/25 bg-rose-400/10 px-2 py-1.5 text-[9px] font-bold text-rose-300 transition-colors hover:bg-rose-400/20"
                  >
                    Close
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-[#22364d] bg-[#081321] shadow-lg shadow-black/20" aria-labelledby="portfolio-orders-heading">
        <div id="portfolio-orders-heading">
          <SectionHeading icon={Clock} title="Orders" count={pendingOrders.length} />
        </div>
        {pendingOrders.length === 0 ? (
          <EmptySection>No working orders</EmptySection>
        ) : (
          <div className="divide-y divide-[#16263a]">
            {pendingOrders.map(order => (
              <article key={order.id} role="button" tabIndex={0} onClick={() => setSelectedTrade(order)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedTrade(order) } }} className="flex cursor-pointer items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-cyan-300/[0.04] focus-visible:bg-cyan-300/[0.06] focus-visible:outline-none">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 rounded border border-cyan-400/25 bg-cyan-400/10 px-1.5 py-1 text-[8px] font-black uppercase text-cyan-200">
                    {order.orderType.replace("_", " ")}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black">{order.pair} · {order.direction}</p>
                    <p className="truncate font-mono text-[10px] text-slate-500">
                      {order.lotSize.toFixed(2)} lots @ {formatPrice(order.targetPrice, order.pair)} · {order.expiry}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); onCancelOrder(order.id) }}
                  aria-label={`Cancel ${order.pair} ${order.orderType.replace("_", " ")} order`}
                  className="shrink-0 rounded border border-[#34465b] px-2 py-1.5 text-[9px] font-bold text-slate-300 transition-colors hover:border-rose-400/40 hover:text-rose-300"
                >
                  Cancel
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-[#22364d] bg-[#081321] shadow-lg shadow-black/20" aria-labelledby="portfolio-history-heading">
        <div id="portfolio-history-heading">
          <SectionHeading icon={History} title="History" count={closedTrades.length} />
        </div>
        {closedTrades.length === 0 ? (
          <EmptySection>Closed positions will appear here</EmptySection>
        ) : (
          <div className="divide-y divide-[#16263a]">
            {closedTrades.map(trade => (
              <article key={trade.id} role="button" tabIndex={0} onClick={() => setSelectedTrade(trade)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedTrade(trade) } }} className="flex cursor-pointer items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-cyan-300/[0.04] focus-visible:bg-cyan-300/[0.06] focus-visible:outline-none">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`shrink-0 rounded border px-1.5 py-1 text-[8px] font-black uppercase ${trade.direction === "BUY" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-rose-400/30 bg-rose-400/10 text-rose-300"}`}>
                    {trade.direction}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black">{trade.pair}</p>
                    <p className="truncate font-mono text-[10px] text-slate-500">
                      {trade.closeTime} · {trade.closeReason.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <span className={`shrink-0 font-mono text-xs font-black ${trade.finalPnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {trade.finalPnl >= 0 ? "+" : ""}${trade.finalPnl.toFixed(2)}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      <TradeDetailsDialog trade={selectedTrade} formatPrice={formatPrice} onClose={() => setSelectedTrade(null)} />
    </main>
  )
}
