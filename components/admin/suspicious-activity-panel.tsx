"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, Check, ChevronDown, ChevronUp, Clock3, Fingerprint, RefreshCw, ShieldAlert, ShieldCheck, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { adminFetch } from "@/lib/auth"

type Signal = {
  id: string
  type: string
  severity: "low" | "medium" | "high"
  score: number
  title: string
  summary: string
  traders: string[]
  evidence: string[]
  detectedAt: string
  status: "open" | "reviewed"
}
type Rule = { id: string; label: string; category: string; telemetry: string }

const severityStyles = {
  high: "border-red-500/40 bg-red-500/10 text-red-300",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  low: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

export function SuspiciousActivityPanel() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [summary, setSummary] = useState({ open: 0, high: 0, medium: 0, low: 0 })
  const [filter, setFilter] = useState("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadSignals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await adminFetch("/api/admin/suspicious-activity")
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Could not load signals")
      setSignals(data.signals)
      setRules(data.rules)
      setSummary(data.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load suspicious activity")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSignals() }, [loadSignals])

  const visibleSignals = useMemo(() => signals.filter((signal) => filter === "all" || signal.severity === filter || signal.status === filter), [filter, signals])

  async function review(signal: Signal, action: "reviewed" | "dismissed") {
    setReviewing(signal.id)
    try {
      const response = await adminFetch("/api/admin/suspicious-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalId: signal.id, action }),
      })
      if (!response.ok) throw new Error("Review could not be saved")
      await loadSignals()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review could not be saved")
    } finally {
      setReviewing(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400"><ShieldAlert className="size-4" /> Compliance review</div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Suspicious activity</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Review evidence across accounts, devices, sessions, and trade behaviour. Signals inform the team; they never automatically ban a trader.</p>
        </div>
        <Button onClick={loadSignals} variant="outline" className="w-fit border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" disabled={loading}><RefreshCw className={loading ? "mr-2 size-4 animate-spin" : "mr-2 size-4"} /> Refresh evidence</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Open reviews", value: summary.open, icon: AlertTriangle, style: "text-orange-300" }, { label: "High risk", value: summary.high, icon: ShieldAlert, style: "text-red-300" }, { label: "Medium risk", value: summary.medium, icon: Clock3, style: "text-amber-300" }, { label: "Low risk", value: summary.low, icon: ShieldCheck, style: "text-cyan-300" }].map((item) => (
          <Card key={item.label} className="border-slate-800 bg-slate-900/70"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs uppercase tracking-wider text-slate-500">{item.label}</p><p className="mt-1 text-2xl font-bold text-white">{item.value}</p></div><item.icon className={`size-5 ${item.style}`} /></CardContent></Card>
        ))}
      </div>

      <Card className="border-slate-800 bg-slate-900/70"><CardHeader className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-base text-white">Review queue</CardTitle><p className="mt-1 text-xs text-slate-500">Risk score is a triage signal, not a final decision.</p></div><Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-full border-slate-700 bg-slate-950 text-slate-200 sm:w-44"><SelectValue placeholder="Filter signals" /></SelectTrigger><SelectContent><SelectItem value="all">All signals</SelectItem><SelectItem value="high">High risk</SelectItem><SelectItem value="medium">Medium risk</SelectItem><SelectItem value="low">Low risk</SelectItem><SelectItem value="open">Open only</SelectItem><SelectItem value="reviewed">Reviewed</SelectItem></SelectContent></Select></CardHeader><CardContent className="p-0">
        {error && <div className="border-b border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-200">{error}</div>}
        {loading ? <div className="flex items-center gap-3 p-8 text-sm text-slate-400"><RefreshCw className="size-4 animate-spin" /> Loading live evidence…</div> : visibleSignals.length === 0 ? <div className="flex flex-col items-center gap-2 p-12 text-center"><ShieldCheck className="size-8 text-emerald-400" /><p className="font-medium text-white">No matching signals</p><p className="max-w-md text-sm text-slate-500">The queue is clear for this filter, or the connected activity telemetry has not produced a signal yet.</p></div> : <div className="divide-y divide-slate-800">{visibleSignals.map((signal) => { const expanded = selectedId === signal.id; return <div key={signal.id} className="p-4 sm:p-5"><button className="flex w-full items-start gap-3 text-left" onClick={() => setSelectedId(expanded ? null : signal.id)} aria-expanded={expanded}><div className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border ${severityStyles[signal.severity]}`}><Fingerprint className="size-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-white">{signal.title}</h3><Badge className={`border capitalize ${severityStyles[signal.severity]}`}>{signal.severity} · {signal.score}</Badge>{signal.status === "reviewed" && <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">Reviewed</Badge>}</div><p className="mt-1 text-sm text-slate-400">{signal.summary}</p><p className="mt-2 text-xs text-slate-500">Detected {formatTime(signal.detectedAt)} · {signal.traders.length} trader{signal.traders.length === 1 ? "" : "s"} involved</p></div>{expanded ? <ChevronUp className="size-4 text-slate-500" /> : <ChevronDown className="size-4 text-slate-500" />}</button>{expanded && <div className="mt-5 grid gap-5 rounded-xl border border-slate-800 bg-slate-950/70 p-4 lg:grid-cols-[1fr_1fr_auto]"><div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Risk score</p><div className="flex items-center gap-3"><Progress value={signal.score} className="h-2 bg-slate-800" /><span className="text-sm font-bold text-white">{signal.score}/100</span></div><p className="mt-2 text-xs leading-5 text-slate-500">{signal.severity === "high" ? "Prioritize review and corroborate with source records." : "Use this signal as a lead; look for confirming evidence."}</p></div><div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Evidence</p><ul className="flex flex-col gap-1 text-sm text-slate-300">{signal.evidence.map((item) => <li key={item} className="flex gap-2"><span className="text-cyan-400">•</span>{item}</li>)}</ul><div className="mt-3 flex flex-wrap gap-1">{signal.traders.map((trader) => <Badge key={trader} variant="outline" className="border-slate-700 text-slate-300"><Users className="mr-1 size-3" />{trader}</Badge>)}</div></div><div className="flex flex-col justify-end gap-2"><Button size="sm" className="bg-cyan-600 text-white hover:bg-cyan-500" disabled={reviewing === signal.id || signal.status === "reviewed"} onClick={() => review(signal, "reviewed")}><Check className="mr-2 size-4" /> Mark reviewed</Button><Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" disabled={reviewing === signal.id} onClick={() => review(signal, "dismissed")}>Dismiss signal</Button></div></div>}</div> })}</div>}
      </CardContent></Card>

      <Card className="border-slate-800 bg-slate-900/70"><CardHeader><CardTitle className="text-base text-white">Detection coverage</CardTitle><p className="text-xs text-slate-500">Rules are visible to compliance even when a feed is not yet connected.</p></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{rules.map((rule) => <div key={rule.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5"><div className="min-w-0"><p className="truncate text-sm text-slate-200">{rule.label}</p><p className="text-[11px] text-slate-600">{rule.category}</p></div><Badge variant="outline" className={rule.telemetry === "active" ? "shrink-0 border-emerald-500/40 text-emerald-300" : "shrink-0 border-slate-700 text-slate-500"}>{rule.telemetry === "active" ? "Active" : "Needs feed"}</Badge></div>)}</CardContent></Card>
    </div>
  )
}
