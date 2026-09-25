"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Banknote, CircleDollarSign, Loader2, Search, XCircle } from "lucide-react"
import { adminFetch } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface Participant {
  id: string
  email: string
  name: string
  account_balance: number
  account_type: string
  status: string
}

export function ParticipantManagementPanel() {
  const { toast } = useToast()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [search, setSearch] = useState("")
  const [selectedEmail, setSelectedEmail] = useState("")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<"deduct" | "close" | null>(null)

  const loadParticipants = async () => {
    setLoading(true)
    try {
      const response = await adminFetch("/api/admin/participants")
      const data = await response.json()
      setParticipants(data.participants || [])
    } catch {
      toast({ title: "Unable to load participants", description: "Please refresh and try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadParticipants() }, [])

  const filteredParticipants = useMemo(() => {
    const query = search.trim().toLowerCase()
    return participants.filter((participant) => !query || `${participant.name} ${participant.email}`.toLowerCase().includes(query))
  }, [participants, search])

  const selected = participants.find((participant) => participant.email === selectedEmail)

  const deductBalance = async () => {
    const deduction = Number(amount)
    if (!selected || !Number.isFinite(deduction) || deduction <= 0 || !reason.trim()) {
      toast({ title: "Complete all fields", description: "Select a participant, enter a valid amount, and provide a reason.", variant: "destructive" })
      return
    }
    if (!window.confirm(`Deduct $${deduction.toFixed(2)} from ${selected.email}? This cannot be undone.`)) return
    setBusy("deduct")
    try {
      const response = await adminFetch("/api/admin/deduct-balance", { method: "POST", body: JSON.stringify({ email: selected.email, amount: deduction, reason }) })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Deduction failed")
      setParticipants((current) => current.map((participant) => participant.email === selected.email ? { ...participant, account_balance: data.balanceAfter } : participant))
      setAmount("")
      setReason("")
      toast({ title: "Balance deducted", description: `${selected.email} now has $${Number(data.balanceAfter).toFixed(2)}.` })
    } catch (error) {
      toast({ title: "Deduction failed", description: error instanceof Error ? error.message : "Unable to deduct balance.", variant: "destructive" })
    } finally { setBusy(null) }
  }

  const closeTrades = async () => {
    if (!selected) return
    if (!window.confirm(`Force-close all running trades for ${selected.email}? Trades will be closed at their stored open price with zero realized P&L.`)) return
    setBusy("close")
    try {
      const response = await adminFetch("/api/admin/close-participant-trades", { method: "POST", body: JSON.stringify({ email: selected.email }) })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Trade close failed")
      toast({ title: "Running trades closed", description: `${data.closedCount} trade(s) closed for ${selected.email}.` })
    } catch (error) {
      toast({ title: "Trade close failed", description: error instanceof Error ? error.message : "Unable to close trades.", variant: "destructive" })
    } finally { setBusy(null) }
  }

  return (
    <section className="space-y-5">
      <div>
        <div className="flex items-center gap-2 text-cyan-300"><Banknote className="size-5" /><p className="text-xs font-semibold uppercase tracking-[0.18em]">Operations control</p></div>
        <h3 className="mt-2 text-2xl font-semibold text-white">Participant management</h3>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">Perform audited balance deductions and close a participant&apos;s running trades from one admin-only workspace.</p>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-slate-800 bg-slate-900/70 text-white">
          <CardHeader className="border-b border-slate-800 pb-4"><CardTitle className="text-base">Participants</CardTitle><CardDescription className="text-slate-400">Select an account to manage.</CardDescription><div className="relative pt-2"><Search className="absolute left-3 top-4 size-4 text-slate-500" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" className="border-slate-700 bg-slate-950 pl-9 text-white placeholder:text-slate-500" /></div></CardHeader>
          <CardContent className="max-h-[560px] overflow-y-auto p-2">
            {loading ? <div className="flex justify-center p-10"><Loader2 className="size-5 animate-spin text-cyan-300" /></div> : filteredParticipants.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No participants found.</p> : filteredParticipants.map((participant) => <button key={participant.id} type="button" onClick={() => setSelectedEmail(participant.email)} className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left transition ${selectedEmail === participant.email ? "border-cyan-500/60 bg-cyan-500/10" : "border-transparent hover:border-slate-700 hover:bg-slate-800/70"}`}><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-100">{participant.name || participant.email}</p><p className="truncate text-xs text-slate-400">{participant.email}</p></div><div className="flex shrink-0 items-center gap-2"><Badge variant="outline" className="border-slate-700 text-[10px] text-slate-400">{participant.account_type || "normal"}</Badge><span className="text-sm font-semibold text-emerald-300">${Number(participant.account_balance || 0).toFixed(2)}</span></div></button>)}
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 bg-slate-900/70 text-white">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="size-4 text-amber-300" />Admin actions</CardTitle><CardDescription className="text-slate-400">{selected ? selected.email : "Select a participant first."}</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3"><p className="text-xs uppercase tracking-wider text-slate-500">Current balance</p><p className="mt-1 text-2xl font-semibold text-emerald-300">${Number(selected?.account_balance || 0).toFixed(2)}</p></div>
            <div className="space-y-3"><label className="text-xs font-medium text-slate-300" htmlFor="deduction-amount">Deduction amount</label><Input id="deduction-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={!selected || busy !== null} placeholder="0.00" className="border-slate-700 bg-slate-950 text-white" /><label className="text-xs font-medium text-slate-300" htmlFor="deduction-reason">Reason</label><textarea id="deduction-reason" value={reason} onChange={(event) => setReason(event.target.value)} disabled={!selected || busy !== null} placeholder="Required audit reason" className="min-h-20 w-full resize-y rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500" /></div>
            <Button type="button" onClick={deductBalance} disabled={!selected || busy !== null} className="w-full gap-2 bg-amber-600 text-white hover:bg-amber-700"><CircleDollarSign className="size-4" />{busy === "deduct" ? "Deducting..." : "Deduct balance"}</Button>
            <div className="border-t border-slate-800 pt-4"><p className="mb-3 text-xs leading-5 text-slate-500">This closes all open trades at their stored open price. No participant-facing trading request is created.</p><Button type="button" onClick={closeTrades} disabled={!selected || busy !== null} variant="outline" className="w-full gap-2 border-red-500/40 text-red-300 hover:bg-red-500/10"><XCircle className="size-4" />{busy === "close" ? "Closing trades..." : "Close running trades"}</Button></div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
