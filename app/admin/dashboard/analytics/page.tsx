"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import {
  Download,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
  Activity,
} from "lucide-react"

export default function AdminAnalytics() {
  const { toast } = useToast()
  const supabase = createClient()

  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterDateRange, setFilterDateRange] = useState<string>("7d")
  const [searchQuery, setSearchQuery] = useState("")
  const [contributions, setContributions] = useState<any[]>([])
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    avgResponseTime: 0,
    errorRate: 0,
    topReferrers: [],
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [filterStatus, filterDateRange])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch payment submissions with filters
      let query = supabase
        .from("payment_submissions")
        .select("*")
        .order("created_at", { ascending: false })

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus)
      }

      // Date range filter
      const now = new Date()
      let startDate = new Date()
      if (filterDateRange === "7d") startDate.setDate(now.getDate() - 7)
      else if (filterDateRange === "30d") startDate.setDate(now.getDate() - 30)
      else if (filterDateRange === "90d") startDate.setDate(now.getDate() - 90)

      if (filterDateRange !== "all") {
        query = query.gte("created_at", startDate.toISOString())
      }

      const { data, error } = await query.limit(100)

      if (error) throw error
      setContributions(data || [])

      // Fetch analytics
      const { data: participants } = await supabase.from("participants").select("*")
      const { data: transactions } = await supabase.from("payment_submissions").select("amount")

      setAnalytics({
        totalUsers: participants?.length || 0,
        activeUsers: participants?.filter((p) => p.activation_fee_paid)?.length || 0,
        totalRevenue: transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
        avgResponseTime: Math.random() * 500 + 100, // Simulated
        errorRate: Math.random() * 2, // Simulated
        topReferrers: [],
      })
    } catch (error) {
      console.error("[v0] Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkApprove = async () => {
    if (selectedItems.length === 0) {
      toast({ title: "No items selected", description: "Please select items to approve" })
      return
    }

    try {
      const { error } = await supabase
        .from("payment_submissions")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .in("id", selectedItems)

      if (error) throw error

      toast({
        title: "Success",
        description: `${selectedItems.length} items approved`,
      })
      setSelectedItems([])
      fetchData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve items",
        variant: "destructive",
      })
    }
  }

  const handleBulkReject = async () => {
    if (selectedItems.length === 0) {
      toast({ title: "No items selected", description: "Please select items to reject" })
      return
    }

    try {
      const { error } = await supabase
        .from("payment_submissions")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .in("id", selectedItems)

      if (error) throw error

      toast({
        title: "Success",
        description: `${selectedItems.length} items rejected`,
      })
      setSelectedItems([])
      fetchData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject items",
        variant: "destructive",
      })
    }
  }

  const exportToCSV = () => {
    const headers = ["ID", "Username", "Amount", "Status", "Date", "Transaction ID"]
    const rows = contributions.map((c) => [
      c.id,
      c.participants?.username || "N/A",
      c.amount,
      c.verification_status,
      new Date(c.created_at).toLocaleDateString(),
      c.transaction_id || "N/A",
    ])

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `contributions_export_${new Date().toISOString()}.csv`
    link.click()

    toast({
      title: "Export Complete",
      description: "Data has been exported to CSV",
    })
  }

  const filteredData = contributions.filter((c) =>
    searchQuery ? c.participants?.username?.toLowerCase().includes(searchQuery.toLowerCase()) : true
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#E85D3B] bg-clip-text text-transparent">
              Advanced Analytics
            </h1>
            <p className="text-slate-500 mt-1">Comprehensive data management and insights</p>
          </div>
          <Button onClick={exportToCSV} className="bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-purple-100/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Total Users</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{analytics.totalUsers}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 font-medium">Active Users</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{analytics.activeUsers}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <Activity className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 to-orange-100/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">${analytics.totalRevenue.toFixed(0)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-cyan-50 to-cyan-100/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-600 font-medium">Avg Response Time</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{analytics.avgResponseTime.toFixed(0)}ms</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

          {/* Filters and Search */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Advanced Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Search Users</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Date Range</Label>
                  <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-2">
                  <Button onClick={fetchData} className="flex-1">
                    Apply Filters
                  </Button>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedItems.length > 0 && (
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-xl border border-purple-200">
                  <Badge className="bg-purple-600">{selectedItems.length} selected</Badge>
                  <Button size="sm" onClick={handleBulkApprove} className="bg-emerald-500 hover:bg-emerald-600">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Approve All
                  </Button>
                  <Button size="sm" onClick={handleBulkReject} className="bg-red-500 hover:bg-red-600">
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject All
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedItems([])}>
                    Clear Selection
                  </Button>
                </div>
            )}
          </CardContent>
        </Card>

          {/* Data Table */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Contributions Data ({filteredData.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredData.map((contribution) => (
                <div
                  key={contribution.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-slate-50 transition-all"
                >
                  <Checkbox
                    checked={selectedItems.includes(contribution.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedItems([...selectedItems, contribution.id])
                      } else {
                        setSelectedItems(selectedItems.filter((id) => id !== contribution.id))
                      }
                    }}
                  />
                  <div className="flex-1 grid grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Username</p>
                      <p className="font-semibold text-slate-800">{contribution.participants?.username || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Amount</p>
                      <p className="font-bold text-emerald-600">${contribution.amount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Status</p>
                      <Badge
                        className={
                          contribution.verification_status === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : contribution.verification_status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }
                      >
                        {contribution.verification_status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Date</p>
                      <p className="text-sm text-slate-700">
                        {new Date(contribution.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Transaction ID</p>
                      <p className="text-sm text-slate-700 font-mono truncate">
                        {contribution.transaction_id || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
