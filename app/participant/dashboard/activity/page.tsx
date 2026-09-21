"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowDownRight, ArrowLeft, ArrowUpRight, History, RefreshCw, TrendingDown, TrendingUp } from "lucide-react"
import { participantFetch } from "@/lib/auth"
import { Button } from "@/components/ui/button"

interface LedgerEntry {
  id: string
  type: string
  subType?: string
  amount: number
  status: string
  date: string
  description: string
  balanceBefore?: number | null
  balanceAfter?: number | null
  trade?: {
    pair: string
    direction: string
    lotSize: number
    openPrice: number
    closePrice: number
    pips: number
    swap: number
    closeReason?: string
  }
}

export default function ParticipantActivityPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadHistory = async () => {
    const raw = localStorage.getItem("participantData")
    const participant = raw ? JSON.parse(raw) : null
    const participantId = participant?.id
    const participantEmail = participant?.email
    if (!participantId || !participantEmail) {
      setError("Please sign in again to view your history.")
      setLoading(false)
      return
    }

    setEmail(participantEmail)
    setLoading(true)
    setError("")
    try {
      const response = await participantFetch(`/api/participant/ledger?participantId=${encodeURIComponent(participantId)}&limit=100`)
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Could not load history")
      setEntries(data.data || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load history")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadHistory()
  }, [])

  const tradeStats = useMemo(() => {
    const trades = entries.filter((entry) => entry.type === "forex_trade")
    return {
      trades: trades.length,
      profit: trades.filter((entry) => entry.amount > 0).reduce((sum, entry) => sum + entry.amount, 0),
      loss: trades.filter((entry) => entry.amount < 0).reduce((sum, entry) => sum + entry.amount, 0),
      net: trades.reduce((sum, entry) => sum + entry.amount, 0),
    }
  }, [entries])

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/participant/dashboard">
              <Button variant="outline" size="icon" aria-label="Back to dashboard"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{email || "Participant"}</p>
              <h1 className="text-2xl font-bold text-white">Participant History</h1>
            </div>
          </div>
          <Button variant="outline" onClick={() => void loadHistory()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </header>

        <section className="grid gap-3 sm:grid-cols-4" aria-label="Trading summary">
          <SummaryCard label="Closed trades" value={String(tradeStats.trades)} />
          <SummaryCard label="Profit" value={`+$${tradeStats.profit.toFixed(2)}`} tone="profit" />
          <SummaryCard label="Loss" value={`-$${Math.abs(tradeStats.loss).toFixed(2)}`} tone="loss" />
          <SummaryCard label="Net P/L" value={`${tradeStats.net >= 0 ? "+" : "-"}$${Math.abs(tradeStats.net).toFixed(2)}`} tone={tradeStats.net >= 0 ? "profit" : "loss"} />
        </section>

        {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">Loading participant history…</div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
            <History className="mx-auto mb-3 h-8 w-8 text-slate-500" />
            <p className="font-semibold text-white">No history yet</p>
            <p className="mt-1 text-sm text-slate-400">Completed trades and balance movements will appear here.</p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 px-4 py-4"><h2 className="font-semibold text-white">Balance movements and trades</h2></div>
            <div className="divide-y divide-slate-800">
              {entries.map((entry) => {
                const isTrade = entry.type === "forex_trade"
                const positive = entry.amount >= 0
                return (
                  <article key={entry.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={`mt-0.5 rounded-full p-2 ${positive ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                        {positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{entry.description}</p>
                        <p className="mt-1 text-xs text-slate-400">{new Date(entry.date).toLocaleString()} · {isTrade ? "Forex trade" : entry.type}</p>
                        {isTrade && entry.trade && <p className="mt-1 text-xs text-slate-500">{entry.trade.lotSize}L · Open {entry.trade.openPrice} · Close {entry.trade.closePrice} · {entry.trade.pips} pips</p>}
                        {entry.balanceBefore !== null && entry.balanceBefore !== undefined && <p className="mt-1 text-xs text-slate-500">Balance: ${Number(entry.balanceBefore).toFixed(2)} → ${Number(entry.balanceAfter).toFixed(2)}</p>}
                      </div>
                    </div>
                    <p className={`shrink-0 text-lg font-bold ${positive ? "text-emerald-300" : "text-red-300"}`}>{positive ? "+" : "-"}${Math.abs(entry.amount).toFixed(2)}</p>
                  </article>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

function SummaryCard({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "profit" | "loss" }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-2 text-xl font-bold ${tone === "profit" ? "text-emerald-300" : tone === "loss" ? "text-red-300" : "text-white"}`}>{value}</p></div>
}
