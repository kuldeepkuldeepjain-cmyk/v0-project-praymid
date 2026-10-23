"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2, RefreshCw, Download, Trash2, Search, UsersRound, WalletCards, Activity, ShieldCheck } from "lucide-react"

interface Participant {
  id: string
  full_name: string
  username: string
  email: string
  mobile_number?: string | null
  account_balance: number
  account_type?: string
  status: string
  is_active: boolean
  created_at: string
  last_login?: string | null
  last_seen?: string | null
  active_in_at?: string | null
  referral_code: string
  total_referrals: number
  last_ip_address?: string | null
  last_seen_at?: string | null
  last_user_agent?: string | null
  country?: string | null
  state?: string | null
  pin_code?: string | null
  full_address?: string | null
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not available"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString()
}

function formatLocation(participant: Participant) {
  return [participant.country, participant.state, participant.pin_code].filter(Boolean).join(", ") || "Not available"
}

export function ParticipantsAdminPanel() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [stats, setStats] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchParticipantsData()
  }, [])

  const fetchParticipantsData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/all-participants-data")
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(payload?.error || `Unable to load participants (${response.status})`)
      }
      setParticipants(payload.data.participants ?? [])
      setStats(payload.data.stats ?? null)
    } catch (error) {
      console.error("Error fetching participants data:", error)
      toast({ title: "Error", description: "Failed to load participants data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteParticipant = async (participant: Participant) => {
    if (!window.confirm(`Permanently delete ${participant.full_name || participant.email} and all related database records? This cannot be undone.`)) return
    try {
      const response = await fetch("/api/admin/delete-participant", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: participant.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Unable to delete participant")
      setParticipants((current) => current.filter((item) => item.id !== participant.id))
      toast({ title: "Participant deleted", description: "The participant and related database records were removed." })
    } catch (error) {
      toast({ title: "Delete failed", description: error instanceof Error ? error.message : "Unable to delete participant", variant: "destructive" })
    }
  }

  const handleExportCSV = (data: any[], filename: string) => {
    const csv = [
      Object.keys(data[0] || {}).join(","),
      ...data.map((item) => Object.values(item).join(",")),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
  }

  const filteredParticipants = participants.filter(
    (p) =>
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.username?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="size-8 animate-spin text-cyan-300" /></div>
  }

  if (!participants.length && !stats) {
    return (
      <div className="rounded-2xl border border-rose-400/30 bg-rose-950/20 p-8 text-center">
        <p className="font-semibold text-rose-200">Participant data could not be loaded.</p>
        <p className="mt-2 text-sm text-rose-100/70">Check the database connection or try again.</p>
        <Button onClick={fetchParticipantsData} className="mt-4">Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-700/80 bg-slate-950/80 p-5 shadow-2xl shadow-black/20 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
            <UsersRound className="size-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-white">Participants</h2>
              <Badge className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200">Admin view</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-400">Account, financial, profile, and access activity in one view.</p>
          </div>
        </div>
        <Button onClick={fetchParticipantsData} variant="outline" size="sm" className="border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800">
          <RefreshCw className="mr-2 size-4" />
          Refresh data
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-slate-700/80 bg-slate-900/75 shadow-lg shadow-black/10">
            <CardContent className="flex items-center justify-between p-4">
              <div><p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Total participants</p><p className="mt-2 text-2xl font-semibold text-white">{stats.total_participants}</p><p className="mt-1 text-xs text-emerald-300">{stats.active_participants} active accounts</p></div>
              <UsersRound className="size-5 text-cyan-300" />
            </CardContent>
          </Card>
          <Card className="border-slate-700/80 bg-slate-900/75 shadow-lg shadow-black/10">
            <CardContent className="flex items-center justify-between p-4">
              <div><p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Total balance</p><p className="mt-2 text-2xl font-semibold text-emerald-300">${stats.total_balance.toFixed(2)}</p><p className="mt-1 text-xs text-slate-500">Across all accounts</p></div>
              <WalletCards className="size-5 text-emerald-300" />
            </CardContent>
          </Card>
          <Card className="border-slate-700/80 bg-slate-900/75 shadow-lg shadow-black/10">
            <CardContent className="flex items-center justify-between p-4">
              <div><p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Active rate</p><p className="mt-2 text-2xl font-semibold text-sky-300">{stats.total_participants ? Math.round((stats.active_participants / stats.total_participants) * 100) : 0}%</p><p className="mt-1 text-xs text-slate-500">Currently enabled</p></div>
              <Activity className="size-5 text-sky-300" />
            </CardContent>
          </Card>
          <Card className="border-slate-700/80 bg-slate-900/75 shadow-lg shadow-black/10">
            <CardContent className="flex items-center justify-between p-4">
              <div><p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Visible now</p><p className="mt-2 text-2xl font-semibold text-white">{filteredParticipants.length}</p><p className="mt-1 text-xs text-slate-500">Matches current search</p></div>
              <ShieldCheck className="size-5 text-amber-300" />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-slate-700/80 bg-slate-900/60 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <Input
            aria-label="Search participants"
            placeholder="Search name, email, or username"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 border-slate-700 bg-slate-950/70 pl-9 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-400"
          />
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-xs text-slate-500">{filteredParticipants.length} of {participants.length} participants</span>
          <Button onClick={() => handleExportCSV(filteredParticipants, "participants.csv")} size="sm" variant="outline" className="border-slate-600 bg-slate-950 text-slate-200 hover:bg-slate-800">
            <Download className="mr-2 size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Participants Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/80 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-2 border-b border-slate-700/80 bg-slate-900/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2"><Activity className="size-4 text-cyan-300" /><h3 className="font-semibold text-white">Participant activity</h3></div>
            <p className="mt-1 text-xs text-slate-400">Identity, account health, access history, and network details</p>
          </div>
          <span className="w-fit rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-300">{filteredParticipants.length} shown</span>
        </div>
        <div className="overflow-x-auto">
        <table className="min-w-[1500px] w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-950/90">
              <th colSpan={7} className="border-r border-slate-800 px-4 pb-2 pt-3 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">Participant & account</th>
              <th colSpan={5} className="border-r border-slate-800 px-4 pb-2 pt-3 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">Access & activity</th>
              <th className="px-4 pb-2 pt-3 text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Manage</th>
            </tr>
            <tr className="border-b border-slate-700 bg-slate-900/70">
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Name</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Email</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Username</th>
              <th className="text-right py-3 px-4 text-slate-400 font-medium">Balance</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Account Type</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Referrals</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
              <th className="whitespace-nowrap text-left py-3 px-4 text-slate-400 font-medium">Location</th>
              <th className="whitespace-nowrap text-left py-3 px-4 text-slate-400 font-medium">Last login</th>
              <th className="whitespace-nowrap text-left py-3 px-4 text-slate-400 font-medium">Active time</th>
              <th className="whitespace-nowrap text-left py-3 px-4 text-slate-400 font-medium">IP address</th>
              <th className="whitespace-nowrap text-left py-3 px-4 text-slate-400 font-medium">Joined</th>
              <th className="text-right py-3 px-4 text-slate-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredParticipants.map((participant) => (
              <tr key={participant.id} className="border-b border-slate-800/80 align-middle transition-colors hover:bg-cyan-400/[0.04]">
                <td className="py-3 px-4 text-white font-medium">{participant.full_name || "-"}</td>
                <td className="max-w-[220px] truncate py-3 px-4 text-slate-200 text-xs" title={participant.email}>{participant.email}</td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className="font-mono">
                    {participant.username || "-"}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-right text-green-400 font-mono">
                  ${participant.account_balance.toFixed(2)}
                </td>
                <td className="py-3 px-4">
                  <Badge
                    variant="outline"
                    className={participant.account_type?.toLowerCase() === "funded"
                      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                      : "border-slate-600 bg-slate-800/60 text-slate-300"}
                  >
                    {participant.account_type?.toLowerCase() === "funded" ? "Funded" : "Normal"}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-white">{participant.total_referrals || 0}</td>
                <td className="py-3 px-4">
                  <Badge 
                    variant={participant.is_active ? "default" : "secondary"}
                    className={participant.is_active ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-slate-600 bg-slate-800 text-slate-300"}
                  >
                    {participant.status}
                  </Badge>
                </td>
                <td className="whitespace-nowrap py-3 px-4 text-slate-300 text-xs">{formatLocation(participant)}</td>
                <td className="whitespace-nowrap py-3 px-4 text-slate-300 text-xs">{formatDateTime(participant.last_login)}</td>
                <td className="whitespace-nowrap py-3 px-4 text-slate-300 text-xs">{formatDateTime(participant.active_in_at || participant.last_seen_at)}</td>
                <td className="whitespace-nowrap py-3 px-4 font-mono text-slate-300 text-xs">{participant.last_ip_address || "Not available"}</td>
                <td className="whitespace-nowrap py-3 px-4 text-slate-400 text-xs">{formatDateTime(participant.created_at)}</td>
                <td className="py-3 px-4 text-right">
                  <Button type="button" variant="outline" size="sm" onClick={() => handleDeleteParticipant(participant)} className="border-red-500/30 text-red-300 hover:bg-red-500/15 hover:text-red-200">
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {filteredParticipants.length === 0 && (
        <Card className="bg-slate-900/50 border-slate-700">
          <CardContent className="p-8 text-center text-slate-400">
            No participants found matching your search
          </CardContent>
        </Card>
      )}
    </div>
  )
}
