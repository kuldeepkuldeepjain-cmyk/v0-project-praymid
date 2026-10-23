"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2, RefreshCw, Download, Trash2 } from "lucide-react"

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
      if (response.ok) {
        const { data } = await response.json()
        setParticipants(data.participants)
        setStats(data.stats)
        toast({ title: "Success", description: "Participants data loaded" })
      }
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
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Participants Management</h2>
          <p className="text-slate-400 text-sm">View and manage all participant accounts</p>
        </div>
        <Button onClick={fetchParticipantsData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-900/50 border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Total Participants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.total_participants}</div>
              <p className="text-xs text-slate-500 mt-1">Active: {stats.active_participants}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Total Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">${stats.total_balance.toFixed(2)}</div>
              <p className="text-xs text-slate-500 mt-1">Across all participants</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{stats.total_participants}</div>
              <p className="text-xs text-slate-500 mt-1">Total user accounts</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div>
        <Input
          placeholder="Search by email, name, or username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-800/50 border-slate-700 text-white placeholder-slate-500"
        />
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => handleExportCSV(filteredParticipants, "participants.csv")}
          size="sm"
          variant="outline"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Participants Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <h3 className="font-semibold text-white">Participant activity</h3>
            <p className="text-xs text-slate-500">Login time, current activity, network address, and profile location</p>
          </div>
          <span className="text-xs text-slate-500">{filteredParticipants.length} shown</span>
        </div>
        <div className="overflow-x-auto">
        <table className="min-w-[1500px] w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
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
              <tr key={participant.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                <td className="py-3 px-4 text-white font-medium">{participant.full_name || "-"}</td>
                <td className="py-3 px-4 text-white text-xs">{participant.email}</td>
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
                    className={participant.is_active ? "bg-green-500/20 text-green-300" : ""}
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
