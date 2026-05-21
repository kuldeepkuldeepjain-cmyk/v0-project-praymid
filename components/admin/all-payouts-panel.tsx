"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Download } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface PayoutRecord {
  id: string
  serial_number: string
  participant_email: string
  amount: number
  status: string
  payout_method: string
  wallet_address: string
  redirect_to_email: string
  redirect_to_serial: string
  admin_notes: string
  created_at: string
  updated_at: string
  full_name: string
  mobile_number: string
  account_balance: number
}

export function AllPayoutsPanel() {
  const [payouts, setPayouts] = useState<PayoutRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("")

  useEffect(() => {
    const fetchPayouts = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (statusFilter) params.append("status", statusFilter)

        const response = await fetch(`/api/admin/all-payouts?${params.toString()}`)
        const data = await response.json()

        if (data.success) {
          setPayouts(data.payouts || [])
        } else {
          setError(data.error || "Failed to fetch payout records")
        }
      } catch (err) {
        console.error("[v0] Failed to fetch payouts:", err)
        setError("Network error. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchPayouts()
  }, [statusFilter])

  const handleExportCSV = () => {
    const headers = [
      "Serial #",
      "Participant Email",
      "Full Name",
      "Mobile",
      "Amount",
      "Status",
      "Payout Method",
      "Wallet Address",
      "Redirect Email",
      "Redirect Serial",
      "Account Balance",
      "Admin Notes",
      "Created At",
      "Updated At",
    ]

    const rows = payouts.map((p) => [
      p.serial_number,
      p.participant_email,
      p.full_name,
      p.mobile_number || "N/A",
      p.amount.toFixed(2),
      p.status,
      p.payout_method,
      p.wallet_address || "N/A",
      p.redirect_to_email || "N/A",
      p.redirect_to_serial || "N/A",
      p.account_balance.toFixed(2),
      p.admin_notes || "",
      p.created_at ? new Date(p.created_at).toLocaleString() : "N/A",
      p.updated_at ? new Date(p.updated_at).toLocaleString() : "N/A",
    ])

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `all-payouts-${new Date().toISOString().split("T")[0]}.csv`
    a.click()

    toast({ title: "Exported", description: `${payouts.length} payout records exported to CSV` })
  }

  const getStatusBadgeClass = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "pending":   return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "matched":   return "bg-blue-100 text-blue-800 border-blue-200"
      case "approved":  return "bg-green-100 text-green-800 border-green-200"
      case "completed": return "bg-emerald-100 text-emerald-800 border-emerald-200"
      case "rejected":  return "bg-red-100 text-red-800 border-red-200"
      case "cancelled": return "bg-gray-100 text-gray-800 border-gray-200"
      default:          return "bg-slate-100 text-slate-800 border-slate-200"
    }
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="border-b border-slate-200 bg-white rounded-t-lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900">All Payout Records</CardTitle>
            <CardDescription className="text-slate-600 mt-1">
              {loading ? "Loading..." : `${payouts.length.toLocaleString()} total records`}
            </CardDescription>
          </div>
          <Button onClick={handleExportCSV} variant="outline" className="gap-2" disabled={loading || payouts.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Filter */}
        <div className="mb-5">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="matched">Matched</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Serial #</TableHead>
                <TableHead className="font-semibold text-slate-700">Email</TableHead>
                <TableHead className="font-semibold text-slate-700">Full Name</TableHead>
                <TableHead className="font-semibold text-slate-700">Amount</TableHead>
                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                <TableHead className="font-semibold text-slate-700">Method</TableHead>
                <TableHead className="font-semibold text-slate-700">Balance</TableHead>
                <TableHead className="font-semibold text-slate-700">Redirect To</TableHead>
                <TableHead className="font-semibold text-slate-700">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading all payout records...
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-red-500">
                    {error}
                  </TableCell>
                </TableRow>
              ) : payouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                    No payout records found
                  </TableCell>
                </TableRow>
              ) : (
                payouts.map((payout) => (
                  <TableRow key={payout.id} className="hover:bg-slate-50 border-b border-slate-100">
                    <TableCell className="font-mono text-xs text-slate-700">{payout.serial_number}</TableCell>
                    <TableCell className="text-sm text-slate-600 font-mono max-w-[180px] truncate">{payout.participant_email}</TableCell>
                    <TableCell className="text-sm text-slate-900 font-medium">{payout.full_name}</TableCell>
                    <TableCell className="font-bold text-green-700">${payout.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={`${getStatusBadgeClass(payout.status)} border text-xs font-medium`}>
                        {(payout.status || "").charAt(0).toUpperCase() + (payout.status || "").slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{payout.payout_method || "—"}</TableCell>
                    <TableCell className="font-semibold text-blue-700">${payout.account_balance.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {payout.redirect_to_email || payout.redirect_to_serial || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {payout.created_at ? new Date(payout.created_at).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
