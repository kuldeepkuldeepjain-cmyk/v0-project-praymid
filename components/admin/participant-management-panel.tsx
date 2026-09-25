"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, CircleDollarSign, Filter, Loader2, LockKeyhole, Play, RefreshCw, Search, ShieldAlert, UserCog, Users, XCircle } from "lucide-react"
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
  is_active?: boolean
  account_frozen?: boolean
  funded_breach_status?: string
  otp_verified?: boolean
  last_login?: string | null
}

type Action = "deduct" | "close" | "status" | "bulk"

export function ParticipantManagementPanel() {
  const { toast } = useToast()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedEmail, setSelectedEmail] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<Action | null>(null)

  const loadParticipants = async () => {
    setLoading(true)
    try {
      const response = await adminFetch("/api/admin/participants")
      const data = await response.json()
      setParticipants(data.participants || [])
    } catch {
      toast({ title: "Unable to load participants", description: "Please refresh and try again.", variant: "destructive" })
    } finally { setLoading(false) }
  }

  useEffect(() => { loadParticipants() }, [])

  const filteredParticipants = useMemo(() => {
    const query = search.trim().toLowerCase()
    return participants.filter((participant) => {
      const matchesSearch = !query || `${participant.name} ${participant.email}`.toLowerCase().includes(query)
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? participant.is_active !== false && participant.status !== "suspended" : statusFilter === "suspended" ? participant.status === "suspended" || participant.account_frozen : statusFilter === "pending" ? participant.status === "pending" : participant.otp_verified === false)
      return matchesSearch && matchesStatus
    })
  }, [participants, search, statusFilter])

  const selected = participants.find((participant) => participant.email === selectedEmail)
  const selectedParticipants = participants.filter((participant) => selectedIds.includes(participant.id))
  const activeCount = participants.filter((participant) => participant.is_active !== false && participant.status !== "suspended").length
  const restrictedCount = participants.filter((participant) => participant.status === "suspended" || participant.account_frozen || participant.funded_breach_status === "breached").length
  const pendingCount = participants.filter((participant) => participant.status === "pending" || participant.otp_verified === false).length

  const updateStatus = async (participant: Participant, action: "activate" | "deactivate" | "suspend") => {
    const response = await adminFetch("/api/admin/activate-participant", { method: "POST", body: JSON.stringify({ participantId: participant.id, action }) })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || "Status update failed")
    return data
  }

  const quickStatus = async (action: "activate" | "deactivate" | "suspend") => {
    if (!selected) return
    const label = action === "activate" ? "activate" : action === "suspend" ? "suspend" : "deactivate"
    if (!window.confirm(`${label[0].toUpperCase() + label.slice(1)} ${selected.email}? This action will be audited.`)) return
    setBusy("status")
    try {
      await updateStatus(selected, action)
      setParticipants(current => current.map(item => item.id === selected.id ? { ...item, status: action === "activate" ? "active" : action === "suspend" ? "suspended" : "pending", is_active: action === "activate" } : item))
      toast({ title: `Participant ${label}d`, description: selected.email })
    } catch (error) { toast({ title: "Status update failed", description: error instanceof Error ? error.message : "Unable to update status.", variant: "destructive" }) }
    finally { setBusy(null) }
  }

  const bulkStatus = async (action: "activate" | "deactivate" | "suspend") => {
    if (!selectedParticipants.length) return
    if (!window.confirm(`${action[0].toUpperCase() + action.slice(1)} ${selectedParticipants.length} selected participant(s)?`)) return
    setBusy("bulk")
    try {
      await Promise.all(selectedParticipants.map(participant => updateStatus(participant, action)))
      await loadParticipants()
      setSelectedIds([])
      toast({ title: "Bulk action completed", description: `${selectedParticipants.length} participant(s) updated.` })
    } catch (error) { toast({ title: "Bulk action failed", description: error instanceof Error ? error.message : "Some accounts could not be updated.", variant: "destructive" }) }
    finally { setBusy(null) }
  }

  const deductBalance = async () => {
    const deduction = Number(amount)
    if (!selected || !Number.isFinite(deduction) || deduction <= 0 || !reason.trim()) { toast({ title: "Complete all fields", description: "Select an account, enter a valid amount, and provide a reason.", variant: "destructive" }); return }
    if (!window.confirm(`Deduct $${deduction.toFixed(2)} from ${selected.email}? This cannot be undone.`)) return
    setBusy("deduct")
    try {
      const response = await adminFetch("/api/admin/deduct-balance", { method: "POST", body: JSON.stringify({ email: selected.email, amount: deduction, reason }) })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Deduction failed")
      setParticipants(current => current.map(item => item.email === selected.email ? { ...item, account_balance: data.balanceAfter } : item))
      setAmount(""); setReason(""); toast({ title: "Balance deducted", description: `${selected.email} now has $${Number(data.balanceAfter).toFixed(2)}.` })
    } catch (error) { toast({ title: "Deduction failed", description: error instanceof Error ? error.message : "Unable to deduct balance.", variant: "destructive" }) }
    finally { setBusy(null) }
  }

  const closeTrades = async () => {
    if (!selected || !window.confirm(`Force-close all running trades for ${selected.email}?`)) return
    setBusy("close")
    try {
      const response = await adminFetch("/api/admin/close-participant-trades", { method: "POST", body: JSON.stringify({ email: selected.email }) })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Trade close failed")
      toast({ title: "Running trades closed", description: `${data.closedCount} trade(s) closed for ${selected.email}.` })
    } catch (error) { toast({ title: "Trade close failed", description: error instanceof Error ? error.message : "Unable to close trades.", variant: "destructive" }) }
    finally { setBusy(null) }
  }

  const toggleSelected = (id: string) => setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  const selectAll = () => setSelectedIds(selectedIds.length === filteredParticipants.length ? [] : filteredParticipants.map(item => item.id))

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-300"><UserCog className="size-5" /><p className="text-xs font-semibold uppercase tracking-[0.18em]">Operations control</p></div>
          <h3 className="mt-2 text-2xl font-semibold text-white">Participant management</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">One workspace for account status, trading controls, balance operations, verification readiness, and security review.</p>
        </div>
        <Button variant="outline" onClick={loadParticipants} disabled={loading} className="gap-2 border-slate-700 text-slate-300"><RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />Refresh</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900/70 text-white"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs uppercase tracking-wider text-slate-500">Total accounts</p><p className="mt-1 text-2xl font-semibold">{participants.length}</p></div><Users className="size-5 text-cyan-300" /></CardContent></Card>
        <Card className="border-emerald-500/20 bg-slate-900/70 text-white"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs uppercase tracking-wider text-slate-500">Operational</p><p className="mt-1 text-2xl font-semibold text-emerald-300">{activeCount}</p></div><CheckCircle2 className="size-5 text-emerald-300" /></CardContent></Card>
        <Card className="border-amber-500/20 bg-slate-900/70 text-white"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs uppercase tracking-wider text-slate-500">Needs attention</p><p className="mt-1 text-2xl font-semibold text-amber-300">{restrictedCount + pendingCount}</p></div><ShieldAlert className="size-5 text-amber-300" /></CardContent></Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="border-slate-800 bg-slate-900/70 text-white">
          <CardHeader className="border-b border-slate-800 pb-4"><CardTitle className="text-base">Accounts</CardTitle><CardDescription className="text-slate-400">Search, filter, multi-select, and apply audited actions in one click.</CardDescription>
            <div className="flex flex-wrap gap-2 pt-2"><div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name or email" className="border-slate-700 bg-slate-950 pl-9 text-white placeholder:text-slate-500" /></div><div className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-950 p-1"><Filter className="ml-2 size-3.5 text-slate-500" />{["all", "active", "suspended", "pending", "unverified"].map(filter => <button key={filter} type="button" onClick={() => setStatusFilter(filter)} className={`rounded px-2 py-1 text-[10px] capitalize ${statusFilter === filter ? "bg-cyan-500/20 text-cyan-200" : "text-slate-500 hover:text-slate-200"}`}>{filter}</button>)}</div></div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2"><button type="button" onClick={selectAll} className="text-xs text-cyan-300 hover:text-cyan-200">{selectedIds.length === filteredParticipants.length && filteredParticipants.length ? "Clear selection" : "Select all visible"}</button><span className="text-xs text-slate-500">{filteredParticipants.length} visible · {selectedIds.length} selected</span></div>
          </CardHeader>
          <CardContent className="max-h-[610px] overflow-y-auto p-2">
            {loading ? <div className="flex justify-center p-10"><Loader2 className="size-5 animate-spin text-cyan-300" /></div> : filteredParticipants.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No participants found.</p> : filteredParticipants.map(participant => <div key={participant.id} className={`flex items-center gap-2 rounded-lg border px-2 py-2 transition ${selectedEmail === participant.email ? "border-cyan-500/60 bg-cyan-500/10" : "border-transparent hover:border-slate-700 hover:bg-slate-800/70"}`}><input type="checkbox" checked={selectedIds.includes(participant.id)} onChange={() => toggleSelected(participant.id)} aria-label={`Select ${participant.email}`} className="accent-cyan-400" /><button type="button" onClick={() => setSelectedEmail(participant.email)} className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-100">{participant.name || participant.email}</p><p className="truncate text-xs text-slate-400">{participant.email}</p></div><div className="flex shrink-0 items-center gap-2"><Badge variant="outline" className="border-slate-700 text-[10px] text-slate-400">{participant.status || "active"}</Badge><span className="text-sm font-semibold text-emerald-300">${Number(participant.account_balance || 0).toFixed(2)}</span></div></button></div>)}
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-slate-900/70 text-white"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="size-4 text-amber-300" />Control center</CardTitle><CardDescription className="text-slate-400">{selected ? selected.email : "Select a participant first."}</CardDescription></CardHeader><CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2"><div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3"><p className="text-xs uppercase tracking-wider text-slate-500">Balance</p><p className="mt-1 text-xl font-semibold text-emerald-300">${Number(selected?.account_balance || 0).toFixed(2)}</p></div><div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3"><p className="text-xs uppercase tracking-wider text-slate-500">Status</p><p className="mt-1 text-sm font-semibold text-slate-100">{selected?.status || "—"}</p></div></div>
          <div className="grid grid-cols-3 gap-2"><Button size="sm" onClick={() => quickStatus("activate")} disabled={!selected || busy !== null} className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700"><Play className="size-3" />Activate</Button><Button size="sm" onClick={() => quickStatus("suspend")} disabled={!selected || busy !== null} variant="outline" className="gap-1 border-amber-500/40 text-amber-300 hover:bg-amber-500/10"><LockKeyhole className="size-3" />Suspend</Button><Button size="sm" onClick={() => quickStatus("deactivate")} disabled={!selected || busy !== null} variant="outline" className="gap-1 border-slate-700 text-slate-300"><XCircle className="size-3" />Pending</Button></div>
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-200">Bulk actions · {selectedParticipants.length} selected</p><div className="grid grid-cols-3 gap-2"><Button size="sm" variant="outline" onClick={() => bulkStatus("activate")} disabled={!selectedParticipants.length || busy !== null} className="border-slate-700 text-slate-300">Activate</Button><Button size="sm" variant="outline" onClick={() => bulkStatus("suspend")} disabled={!selectedParticipants.length || busy !== null} className="border-slate-700 text-slate-300">Suspend</Button><Button size="sm" variant="outline" onClick={() => bulkStatus("deactivate")} disabled={!selectedParticipants.length || busy !== null} className="border-slate-700 text-slate-300">Pending</Button></div></div>
          <div className="flex flex-col gap-3"><label className="text-xs font-medium text-slate-300" htmlFor="deduction-amount">Balance deduction</label><Input id="deduction-amount" type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} disabled={!selected || busy !== null} placeholder="Amount" className="border-slate-700 bg-slate-950 text-white" /><textarea id="deduction-reason" value={reason} onChange={event => setReason(event.target.value)} disabled={!selected || busy !== null} placeholder="Required audit reason" className="min-h-16 w-full resize-y rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500" /><Button type="button" onClick={deductBalance} disabled={!selected || busy !== null} className="w-full gap-2 bg-amber-600 text-white hover:bg-amber-700"><CircleDollarSign className="size-4" />{busy === "deduct" ? "Deducting..." : "Deduct balance"}</Button></div>
          <div className="border-t border-slate-800 pt-4"><p className="mb-3 text-xs leading-5 text-slate-500">Force-close open trades at stored open price with zero realized P&L. Every action is audited.</p><Button type="button" onClick={closeTrades} disabled={!selected || busy !== null} variant="outline" className="w-full gap-2 border-red-500/40 text-red-300 hover:bg-red-500/10"><XCircle className="size-4" />{busy === "close" ? "Closing trades..." : "Close running trades"}</Button></div>
        </CardContent></Card>
      </div>
    </section>
  )
}
