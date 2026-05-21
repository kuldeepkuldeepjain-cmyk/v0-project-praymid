"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Download } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface PayoutRecord {
  id: string
  participant_email: string
  amount: number
  status: string
  serial_number: string
  payout_method: string
  wallet_address: string
  redirect_to_email: string
  created_at: string
  updated_at: string
  full_name: string
  phone: string | null
  bep20_address: string | null
  account_balance: number
  contributed_amount: number
}

export function AllPayoutsPanel() {
  const [payouts, setPayouts] = useState<PayoutRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")

  useEffect(() => {
    const fetchPayouts = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          loadAll: "true",
        })
        if (statusFilter) params.append("status", statusFilter)

        const response = await fetch(`/api/admin/all-payouts?${params}`)
        const data = await response.json()

        if (data.success) {
          setPayouts(data.payouts)
        } else {
          toast({
            title: "Error",
            description: "Failed to fetch payout records",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Failed to fetch payouts:", error)
        toast({
          title: "Error",
          description: "Failed to fetch payout records",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPayouts()
  }, [statusFilter])

  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Participant Serial",
      "Participant Email",
      "Full Name",
      "Phone",
      "Amount",
      "Status",
      "Payout Method",
      "Wallet Address",
      "Redirect Email",
      "Account Balance",
      "Contributed Amount",
      "Created At",
      "Updated At",
    ]

    const rows = payouts.map((p) => [
      p.id,
      p.serial_number || "N/A",
      p.participant_email,
      p.full_name,
      p.phone || "N/A",
      p.amount.toFixed(2),
      p.status,
      p.payout_method,
      p.wallet_address || "N/A",
      p.redirect_to_email || "N/A",
      p.account_balance.toFixed(2),
      p.contributed_amount.toFixed(2),
      new Date(p.created_at).toLocaleString(),
      new Date(p.updated_at).toLocaleString(),
    ])

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `all-payouts-${new Date().toISOString().split("T")[0]}.csv`
    a.click()

    toast({
      title: "Exported",
      description: `${payouts.length} payout records exported to CSV`,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "matched":
        return "bg-blue-100 text-blue-800"
      case "approved":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-emerald-100 text-emerald-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "cancelled":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-slate-100 text-slate-800"
    }
  }

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
      <CardHeader className="border-b border-slate-200 bg-white rounded-t-lg">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-2xl font-bold text-slate-900">All Payout Records</CardTitle>
            <CardDescription className="text-slate-600">
              Total payouts: {payouts.length.toLocaleString()} records
            </CardDescription>
          </div>
          <Button onClick={handleExportCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="mb-6 flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
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
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead className="font-semibold text-slate-900">Serial #</TableHead>
                <TableHead className="font-semibold text-slate-900">Email</TableHead>
                <TableHead className="font-semibold text-slate-900">Full Name</TableHead>
                <TableHead className="font-semibold text-slate-900">Amount</TableHead>
                <TableHead className="font-semibold text-slate-900">Status</TableHead>
                <TableHead className="font-semibold text-slate-900">Method</TableHead>
                <TableHead className="font-semibold text-slate-900">Balance</TableHead>
                <TableHead className="font-semibold text-slate-900">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading payouts...
                    </div>
                  </TableCell>
                </TableRow>
              ) : payouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    No payout records found
                  </TableCell>
                </TableRow>
              ) : (
                payouts.map((payout) => (
                  <TableRow key={payout.id} className="hover:bg-slate-50 border-b border-slate-200">
                    <TableCell className="font-medium text-slate-900">{payout.serial_number || "—"}</TableCell>
                    <TableCell className="text-sm text-slate-600 font-mono">{payout.participant_email}</TableCell>
                    <TableCell className="text-sm text-slate-900">{payout.full_name}</TableCell>
                    <TableCell className="font-semibold text-green-700">${payout.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(payout.status)} border-0`}>
                        {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{payout.payout_method || "—"}</TableCell>
                    <TableCell className="font-semibold text-blue-700">${payout.account_balance.toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {new Date(payout.created_at).toLocaleDateString()}
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
