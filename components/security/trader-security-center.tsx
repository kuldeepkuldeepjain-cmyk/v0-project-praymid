"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, Clock3, KeyRound, LockKeyhole, ShieldCheck, Smartphone, UserCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { participantFetch } from "@/lib/auth"

const icons = { identity: UserCheck, two_factor: KeyRound, sessions: Smartphone }

export function TraderSecurityCenter() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    try {
      const response = await participantFetch("/api/participant/security")
      const body = await response.json()
      if (!response.ok || !body.success) throw new Error(body.error || "Security status unavailable")
      setData(body)
    } catch (err) { setError(err instanceof Error ? err.message : "Security status unavailable") }
  }, [])
  useEffect(() => { load() }, [load])

  if (error) return <Card className="border-red-500/30 bg-red-500/10"><CardContent className="p-5 text-sm text-red-200">{error}</CardContent></Card>
  if (!data) return <Card className="border-slate-800 bg-slate-900/70"><CardContent className="p-5 text-sm text-slate-400">Loading protected security status…</CardContent></Card>

  return <div className="flex flex-col gap-5">
    <Card className="border-cyan-500/30 bg-slate-900/80"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300"><ShieldCheck className="size-6" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Account protection</p><h2 className="mt-1 text-lg font-semibold text-slate-100">Your security controls are active</h2><p className="mt-1 text-sm text-slate-400">Sensitive fraud signals are protected from trader view.</p></div></div><Badge className="w-fit border-emerald-400/30 bg-emerald-400/10 text-emerald-300"><CheckCircle2 className="mr-1 size-3" /> Monitored</Badge></CardContent></Card>
    <div className="grid gap-3 md:grid-cols-3">{data.protectionItems.map((item: any) => { const Icon = icons[item.id as keyof typeof icons] || LockKeyhole; const good = ["verified", "enabled", "monitored"].includes(item.status); return <Card key={item.id} className="border-slate-800 bg-slate-900/70"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-slate-800 text-cyan-300"><Icon className="size-4" /></div><Badge variant="outline" className={good ? "border-emerald-400/30 text-emerald-300" : "border-amber-400/30 text-amber-300"}>{item.status.replace("_", " ")}</Badge></div><p className="mt-4 text-sm font-medium text-slate-100">{item.label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.id === "identity" ? "Complete verification to protect withdrawals and account recovery." : item.id === "two_factor" ? "Use an authenticator app for stronger sign-in protection." : `${data.activeSessionCount} active session${data.activeSessionCount === 1 ? "" : "s"} monitored.`}</p></CardContent></Card> })}</div>
    <Card className="border-slate-800 bg-slate-900/70"><CardHeader><CardTitle className="text-base text-slate-100">Recent security activity</CardTitle></CardHeader><CardContent className="flex flex-col gap-3">{data.recentActivity.length === 0 ? <p className="text-sm text-slate-500">No recent security activity.</p> : data.recentActivity.map((item: any) => <div key={`${item.event}-${item.occurredAt}`} className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3 last:border-0 last:pb-0"><div className="flex items-center gap-2"><Clock3 className="size-4 text-slate-500" /><span className="text-sm text-slate-300">{item.event.replaceAll("_", " ")}</span></div><span className="text-xs text-slate-500">{new Date(item.occurredAt).toLocaleString()}</span></div>)}</CardContent></Card>
    <p className="text-xs leading-5 text-slate-500">{data.privacy.message} Contact support if you do not recognize an activity entry. IP addresses, device fingerprints, risk scores, and review evidence are never displayed here.</p>
  </div>
}
