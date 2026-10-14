"use client"

import { useCallback, useEffect, useState } from "react"
import { Activity, RefreshCw, Search, ShieldCheck, Wallet, ArrowDownToLine, ArrowUpFromLine, LogIn, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type ActivityEvent = { id: string | number; actor_email?: string; action: string; target_type?: string; details?: string; created_at: string }

const icons: Record<string, typeof Activity> = { participant_login: LogIn, wallet_topup: Wallet, topup_requested: ArrowDownToLine, payout_requested: ArrowUpFromLine, kyc_submitted: ShieldCheck }

export function ParticipantActivityMonitor() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const load = useCallback(async () => {
    setLoading(true)
    try { const response = await fetch(`/api/admin/participant-activity?search=${encodeURIComponent(search)}`); const data = await response.json(); if (!response.ok) throw new Error(data.error); setEvents(data.events || []); setError("") } catch (err) { setError(err instanceof Error ? err.message : "Unable to load activity") } finally { setLoading(false) }
  }, [search])
  useEffect(() => { void load() }, [load])
  return <div className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300" /><Input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void load() }} placeholder="Search participant, action, or details" className="border-slate-700 bg-slate-950 pl-9 text-white placeholder:text-slate-500" /></div><Button type="button" onClick={() => void load()} disabled={loading} variant="outline" className="border-cyan-500/40 text-cyan-200"><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button></div>
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80"><div className="flex items-center justify-between border-b border-slate-800 px-4 py-3"><div><p className="text-sm font-semibold text-white">Participant activity stream</p><p className="text-xs text-slate-500">Funding, withdrawals, sign-ins, KYC, and account events</p></div><Badge variant="outline" className="border-cyan-500/30 text-cyan-300">{events.length} events</Badge></div>{error ? <p className="p-6 text-sm text-red-300">{error}</p> : events.length === 0 && !loading ? <p className="p-6 text-sm text-slate-500">No participant activity found.</p> : <div className="max-h-[460px] overflow-y-auto">{events.map((event) => { const Icon = icons[event.action] || UserRound; return <div key={`${event.id}-${event.created_at}`} className="flex gap-3 border-b border-slate-900 px-4 py-3 last:border-0"><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-300"><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold text-white">{event.action.replaceAll("_", " ")}</p><span className="text-[10px] text-slate-500">{event.actor_email || "System"}</span></div><p className="mt-1 truncate text-xs text-slate-400">{event.details || event.target_type || "Participant account activity"}</p></div><time className="shrink-0 text-[10px] text-slate-600">{new Date(event.created_at).toLocaleString()}</time></div> })}</div>}</div>
  </div>
}
