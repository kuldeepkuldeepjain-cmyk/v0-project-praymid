"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2, RefreshCw, Download } from "lucide-react"

interface Participant {
  id: string
  full_name: string
  username: string
  email: string
  account_balance: number
  status: string
  is_active: boolean
  created_at: string
  referral_code: string
  total_referrals: number
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Name</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Email</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Username</th>
              <th className="text-right py-3 px-4 text-slate-400 font-medium">Balance</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Referrals</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">Joined</th>
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
                <td className="py-3 px-4 text-white">{participant.total_referrals || 0}</td>
                <td className="py-3 px-4">
                  <Badge 
                    variant={participant.is_active ? "default" : "secondary"}
                    className={participant.is_active ? "bg-green-500/20 text-green-300" : ""}
                  >
                    {participant.status}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-slate-400 text-xs">
                  {new Date(participant.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
