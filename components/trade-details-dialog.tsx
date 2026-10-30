"use client"

import { X, ArrowDownRight, ArrowUpRight, Clock3, ShieldCheck, Target, TrendingDown, TrendingUp } from "lucide-react"
import type { ClosedTrade, OpenTrade, PendingOrder } from "@/components/forex-trading-platform"

type TradeRecord = ClosedTrade | OpenTrade | PendingOrder

type TradeDetailsDialogProps = {
  trade: TradeRecord | null
  formatPrice: (price: number, pair: string) => string
  onClose: () => void
}

function isClosedTrade(trade: TradeRecord): trade is ClosedTrade {
  return "closePrice" in trade
}

function isPendingOrder(trade: TradeRecord): trade is PendingOrder {
  return "orderType" in trade
}

function money(value: number) {
  return `${value >= 0 ? "+" : "−"}$${Math.abs(value).toFixed(2)}`
}

export function TradeDetailsDialog({ trade, formatPrice, onClose }: TradeDetailsDialogProps) {
  if (!trade) return null

  const closed = isClosedTrade(trade)
  const pending = isPendingOrder(trade)
  const pnl = closed ? trade.finalPnl : !pending ? trade.pnl : 0
  const positive = pnl >= 0
  const status = closed ? "CLOSED" : pending ? "WORKING ORDER" : "OPEN POSITION"
  const statusColor = closed ? (positive ? "#34d399" : "#fb7185") : "#67e8f9"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#02060c]/80 p-3 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="trade-details-title"
        className="trade-details-dialog w-full max-w-[520px] overflow-hidden rounded-2xl border border-[#29445f] bg-[#081321] text-slate-100 shadow-[0_24px_80px_rgba(0,0,0,.55)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="relative overflow-hidden border-b border-[#1c3148] bg-gradient-to-br from-[#10263a] via-[#0b1b2c] to-[#081321] px-4 pb-4 pt-4">
          <div className="absolute -right-8 -top-12 size-32 rounded-full bg-cyan-400/10 blur-3xl" aria-hidden="true" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${trade.direction === "BUY" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-300" : "border-rose-300/30 bg-rose-300/10 text-rose-300"}`}>
                {trade.direction === "BUY" ? <ArrowUpRight className="size-5" aria-hidden="true" /> : <ArrowDownRight className="size-5" aria-hidden="true" />}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="trade-details-title" className="text-lg font-black tracking-tight">{trade.pair}</h2>
                  <span className="rounded-full border px-2 py-0.5 text-[9px] font-black tracking-[0.14em]" style={{ color: statusColor, borderColor: `${statusColor}55`, background: `${statusColor}12` }}>{status}</span>
                </div>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">{trade.direction} · {trade.lotSize.toFixed(2)} lots · {trade.id.slice(-8)}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Close trade details" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"><X className="size-4" /></button>
          </div>
          <div className="relative mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">{pending ? "Target price" : "Realized P&L"}</p>
              <p className="mt-0.5 font-mono text-2xl font-black tracking-tight" style={{ color: pending ? "#67e8f9" : positive ? "#34d399" : "#fb7185" }}>{pending ? formatPrice(trade.targetPrice, trade.pair) : money(pnl)}</p>
            </div>
            {!pending && <p className="font-mono text-xs font-bold" style={{ color: positive ? "#34d399" : "#fb7185" }}>{closed ? `${trade.finalPips >= 0 ? "+" : ""}${trade.finalPips.toFixed(1)} pips` : `${trade.pips >= 0 ? "+" : ""}${trade.pips.toFixed(1)} pips`}</p>}
          </div>
        </header>

        <div className="flex flex-col gap-4 p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Entry", value: formatPrice(pending ? trade.targetPrice : trade.openPrice, trade.pair), icon: TrendingUp },
              { label: "Exit", value: closed ? formatPrice(trade.closePrice, trade.pair) : pending ? "—" : "Live", icon: closed ? TrendingDown : Target },
              { label: "Margin", value: pending ? `$${((trade.lotSize * 100000) / trade.leverage).toFixed(2)}` : `$${trade.margin.toFixed(2)}`, icon: ShieldCheck },
              { label: "Duration", value: closed ? trade.closeDuration : pending ? trade.expiry : "Active", icon: Clock3 },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-[#1d344c] bg-[#0c1b2b] p-2.5">
                <div className="flex items-center gap-1.5 text-slate-500"><Icon className="size-3" aria-hidden="true" /><span className="text-[8px] font-bold uppercase tracking-wider">{label}</span></div>
                <p className="mt-1 truncate font-mono text-[11px] font-black text-slate-200">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[#1d344c] bg-[#07101b] p-3">
            <div className="mb-3 flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Order timeline</p><span className="font-mono text-[9px] text-slate-600">{closed ? trade.closeReason.replace("_", " ") : pending ? "awaiting fill" : "market live"}</span></div>
            <div className="flex flex-col gap-3">
              <TimelineRow label={pending ? "Order submitted" : "Position opened"} value={pending ? trade.createdTime : trade.openTime} color="#67e8f9" />
              <TimelineRow label={pending ? "Trigger level" : closed ? "Position closed" : "Current market"} value={pending ? formatPrice(trade.targetPrice, trade.pair) : closed ? `${trade.closeTime} · ${formatPrice(trade.closePrice, trade.pair)}` : formatPrice(trade.openPrice + (trade.direction === "BUY" ? trade.pips * 0.0001 : -trade.pips * 0.0001), trade.pair)} color={closed ? (positive ? "#34d399" : "#fb7185") : "#a78bfa"} />
            </div>
          </div>

          <footer className="flex items-center justify-between border-t border-[#1b3046] pt-3 text-[9px] text-slate-500"><span>Trade ID <span className="font-mono text-slate-300">{trade.id}</span></span><span className="uppercase tracking-wider">Tap outside to close</span></footer>
        </div>
      </section>
    </div>
  )
}

function TimelineRow({ label, value, color }: { label: string; value: string; color: string }) {
  return <div className="flex items-center gap-2"><span className="size-2 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 9px ${color}` }} /><div className="flex min-w-0 flex-1 items-center justify-between gap-3"><span className="text-[10px] font-semibold text-slate-300">{label}</span><span className="truncate text-right font-mono text-[9px] text-slate-500">{value}</span></div></div>
}
