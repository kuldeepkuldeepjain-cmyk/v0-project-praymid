"use client"

import { useEffect, useState } from "react"
import { Activity, AlertTriangle, CheckCircle2, Radio, RefreshCw, Server, ShieldCheck, WifiOff } from "lucide-react"

 type Venue = { id: string; name: string; venue: string; priority: number; connected: boolean; latencyMs?: number; message?: string }
 type ControlRoom = { summary?: Record<string, unknown>; positions?: Array<Record<string, unknown>>; riskFlags?: Array<Record<string, unknown>>; performance?: Record<string, unknown> }

function number(value: unknown) { return Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 }) }

export default function InstitutionalOperationsPage() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [room, setRoom] = useState<ControlRoom>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const [venueResponse, roomResponse] = await Promise.all([fetch("/api/admin/venues", { cache: "no-store" }), fetch("/api/admin/trading-control-room", { cache: "no-store" })])
      const venueData = await venueResponse.json()
      const roomData = await roomResponse.json()
      if (!venueResponse.ok || !venueData.success) throw new Error(venueData.error ?? "Venue health unavailable")
      if (!roomResponse.ok || !roomData.success) throw new Error(roomData.error ?? "Control room unavailable")
      setVenues(venueData.venues ?? [])
      setRoom(roomData)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Operations data unavailable")
    } finally { setLoading(false) }
  }

  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 15000); return () => window.clearInterval(timer) }, [])
  const summary = room.summary ?? {}
  const performance = room.performance ?? {}

  return (
    <main className="min-h-screen bg-[#07111f] text-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-5">
          <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">Elite Fund / Operations</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Institutional control room</h1><p className="mt-2 text-sm text-slate-400">Venue health, execution exposure, risk, and prop-firm account oversight.</p></div>
          <button onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-cyan-400"><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />Refresh</button>
        </header>
        {error && <div role="alert" className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"><WifiOff className="h-4 w-4" />{error}</div>}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[{ label: "Funded accounts", value: summary.funded_accounts }, { label: "Open positions", value: summary.open_positions }, { label: "Used margin", value: summary.used_margin }, { label: "30d net P&L", value: performance.net_pnl }].map(card => <div key={card.label} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4"><p className="text-xs uppercase tracking-wider text-slate-500">{card.label}</p><p className="mt-2 text-2xl font-semibold text-slate-100">{number(card.value)}</p></div>)}
        </section>
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60"><div className="flex items-center justify-between border-b border-slate-800 px-4 py-3"><h2 className="font-semibold">Venue connectivity</h2><Radio className="h-4 w-4 text-cyan-400" /></div><div className="divide-y divide-slate-800">{venues.map(venue => <div key={venue.id} className="flex items-center justify-between gap-4 px-4 py-4"><div className="flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${venue.connected ? "bg-emerald-400" : "bg-red-400"}`} /><div><p className="font-medium">{venue.name}</p><p className="text-xs text-slate-500">Priority {venue.priority} · {venue.venue}</p></div></div><div className="text-right text-xs">{venue.connected ? <><p className="text-emerald-300">Connected</p><p className="text-slate-500">{venue.latencyMs ?? "—"} ms</p></> : <p className="text-red-300">{venue.message ?? "Offline"}</p>}</div></div>)}{!venues.length && <p className="px-4 py-8 text-sm text-slate-500">No venue adapters configured.</p>}</div></div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60"><div className="border-b border-slate-800 px-4 py-3"><h2 className="font-semibold">Risk posture</h2></div><div className="space-y-4 p-4"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-slate-400"><ShieldCheck className="h-4 w-4 text-emerald-400" />Open risk flags</span><strong>{number(summary.open_risk_flags)}</strong></div><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-slate-400"><AlertTriangle className="h-4 w-4 text-amber-400" />Breached accounts</span><strong>{number(summary.breached_accounts)}</strong></div><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-slate-400"><Server className="h-4 w-4 text-cyan-400" />Pending orders</span><strong>{number(summary.pending_orders)}</strong></div></div></div>
        </section>
        <section className="rounded-lg border border-slate-800 bg-slate-900/60"><div className="flex items-center justify-between border-b border-slate-800 px-4 py-3"><h2 className="font-semibold">Execution snapshot</h2><Activity className="h-4 w-4 text-cyan-400" /></div><div className="grid gap-4 p-4 text-sm sm:grid-cols-3"><div><p className="text-slate-500">Positions monitored</p><p className="mt-1 text-xl font-semibold">{room.positions?.length ?? 0}</p></div><div><p className="text-slate-500">Winning trades / 30d</p><p className="mt-1 text-xl font-semibold text-emerald-300">{number(performance.wins)}</p></div><div><p className="text-slate-500">Account safety</p><p className="mt-1 flex items-center gap-2 text-xl font-semibold"><CheckCircle2 className="h-5 w-5 text-emerald-400" />Monitored</p></div></div></section>
      </div>
    </main>
  )
}
