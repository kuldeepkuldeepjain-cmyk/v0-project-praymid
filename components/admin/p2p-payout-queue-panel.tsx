"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Clock, Search, Users, Trash2, Hourglass } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { adminFetch } from "@/lib/auth"

interface PayoutRequest {
  id: string
  participant_email: string
  full_name: string
  mobile_number: string | null
  serial_number: string
  participant_serial: string | null
  amount: number
  bep20_address: string | null
  payout_method: string | null
  status: string
  created_at: string
}

export function P2PPayoutQueuePanel() {
  const { toast } = useToast()
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<PayoutRequest | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [countdowns, setCountdowns] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchPayoutRequests()
    const interval = setInterval(fetchPayoutRequests, 10000)
    return () => clearInterval(interval)
  }, [])

  // Countdown timers per row
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      const newCountdowns: Record<string, string> = {}
      payoutRequests.forEach((payout) => {
        if (!payout.created_at) { newCountdowns[payout.id] = "—"; return }
        const createdMs = new Date(payout.created_at).getTime()
        if (isNaN(createdMs)) { newCountdowns[payout.id] = "—"; return }
        const remaining = createdMs + 30 * 60 * 1000 - Date.now()
        if (remaining > 0) {
          const m = Math.floor(remaining / 1000 / 60)
          const s = Math.floor(remaining / 1000) % 60
          newCountdowns[payout.id] = `${m}m ${s}s`
        } else {
          newCountdowns[payout.id] = "Expired"
        }
      })
      setCountdowns(newCountdowns)
    }, 1000)
    return () => clearInterval(countdownInterval)
  }, [payoutRequests])

  const fetchPayoutRequests = async () => {
    try {
      const res = await adminFetch("/api/admin/pending-payout-requests")
      if (!res.ok) {
        setIsLoading(false)
        return
      }
      const json = await res.json()
      setPayoutRequests(Array.isArray(json.payouts) ? json.payouts : [])
    } catch {
      // silently fail on network errors — no toast to avoid crashing error boundary
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":    return <Badge className="bg-yellow-100 text-yellow-800 border-0">Pending</Badge>
      case "matched":    return <Badge className="bg-blue-100 text-blue-800 border-0">Matched</Badge>
      case "processing": return <Badge className="bg-purple-100 text-purple-800 border-0">Processing</Badge>
      case "completed":  return <Badge className="bg-green-100 text-green-800 border-0">Completed</Badge>
      case "rejected":   return <Badge className="bg-red-100 text-red-800 border-0">Rejected</Badge>
      default:           return <Badge className="bg-slate-100 text-slate-800 border-0">{status}</Badge>
    }
  }

  const handleDeletePayout = async () => {
    if (!deleteConfirm) return
    setIsDeleting(true)
    try {
      const response = await adminFetch("/api/admin/delete-payout-request", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutRequestId: deleteConfirm.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to delete")
      setPayoutRequests((prev) => prev.filter((p) => p.id !== deleteConfirm.id))
      setDeleteConfirm(null)
      toast({ title: "Deleted", description: "Payout request removed successfully." })
    } catch {
      toast({ title: "Delete Failed", description: "Unable to delete. Please try again.", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredPayouts = payoutRequests.filter((p) =>
    (p.serial_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.participant_email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.mobile_number || "").includes(searchQuery)
  )

  const stats = {
    total:   payoutRequests.length,
    pending:  payoutRequests.filter((p) => p.status === "pending").length,
    matched:  payoutRequests.filter((p) => p.status === "matched").length,
    completed: payoutRequests.filter((p) => p.status === "completed").length,
  }

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "—"
    const dt = new Date(d)
    return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  }

  const fmtTime = (d: string | null | undefined) => {
    if (!d) return "—"
    const dt = new Date(d)
    return isNaN(dt.getTime()) ? "—" : dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
  }

  if (isLoading) {
    return (
      <Card className="border-slate-700 bg-slate-900">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin"><Clock className="h-8 w-8 text-slate-400" /></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-700 bg-slate-900">
      <CardHeader className="border-b border-slate-700 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-500" />
              P2P Payout Queue
            </CardTitle>
            <CardDescription className="text-slate-400">
              Pending &amp; matched payout requests awaiting contribution match
            </CardDescription>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="bg-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-1">Total</p>
            <p className="text-lg font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-yellow-900/20 rounded-lg p-3 border border-yellow-900/50">
            <p className="text-xs text-yellow-400 mb-1">Pending</p>
            <p className="text-lg font-bold text-yellow-400">{stats.pending}</p>
          </div>
          <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-900/50">
            <p className="text-xs text-blue-400 mb-1">Matched</p>
            <p className="text-lg font-bold text-blue-400">{stats.matched}</p>
          </div>
          <div className="bg-green-900/20 rounded-lg p-3 border border-green-900/50">
            <p className="text-xs text-green-400 mb-1">Completed</p>
            <p className="text-lg font-bold text-green-400">{stats.completed}</p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by name, email, mobile or serial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-700 hover:bg-transparent">
                <TableHead className="text-slate-300 font-semibold">Serial #</TableHead>
                <TableHead className="text-slate-300 font-semibold">Participant</TableHead>
                <TableHead className="text-slate-300 font-semibold">Date</TableHead>
                <TableHead className="text-slate-300 font-semibold">Time</TableHead>
                <TableHead className="text-slate-300 font-semibold">Amount</TableHead>
                <TableHead className="text-slate-300 font-semibold">Auto-Match In</TableHead>
                <TableHead className="text-slate-300 font-semibold">Status</TableHead>
                <TableHead className="text-slate-300 font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayouts.length > 0 ? (
                filteredPayouts.map((payout) => (
                  <TableRow key={payout.id} className="border-b border-slate-700 hover:bg-slate-800/50">

                    {/* Serial */}
                    <TableCell className="text-slate-200 font-mono font-semibold whitespace-nowrap">
                      #{payout.serial_number || payout.participant_serial || "—"}
                    </TableCell>

                    {/* Participant — Name + Email + Mobile stacked */}
                    <TableCell className="min-w-[180px]">
                      <p className="text-sm font-semibold text-white leading-tight">{payout.full_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{payout.participant_email}</p>
                      {payout.mobile_number && payout.mobile_number !== "N/A" && (
                        <p className="text-xs text-slate-500 mt-0.5">{payout.mobile_number}</p>
                      )}
                    </TableCell>

                    {/* Date */}
                    <TableCell className="min-w-[110px]">
                      <p className="text-sm font-medium text-slate-300 whitespace-nowrap">
                        {fmtDate(payout.created_at)}
                      </p>
                    </TableCell>

                    {/* Time */}
                    <TableCell className="min-w-[90px]">
                      <p className="text-sm text-slate-400 whitespace-nowrap">
                        {fmtTime(payout.created_at)}
                      </p>
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="text-slate-200 font-semibold whitespace-nowrap">
                      ${Number(payout.amount).toFixed(2)}
                    </TableCell>

                    {/* Countdown */}
                    <TableCell className="min-w-[110px]">
                      <div className="flex items-center gap-1.5">
                        <Hourglass className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
                        <span className={`text-xs font-mono font-semibold ${countdowns[payout.id] === "Expired" ? "text-red-400" : "text-orange-400"}`}>
                          {countdowns[payout.id] || "—"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>{getStatusBadge(payout.status)}</TableCell>

                    {/* Delete */}
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteConfirm(payout)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1.5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="border-b border-slate-700">
                  <TableCell colSpan={8} className="text-center text-slate-400 py-12">
                    No payout requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Payout Request</DialogTitle>
            <DialogDescription className="text-slate-400">
              This action permanently removes the payout request and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 py-4 text-sm">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Name</span>
              <span className="font-semibold text-slate-100">{deleteConfirm?.full_name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Email</span>
              <span className="font-semibold text-slate-100">{deleteConfirm?.participant_email}</span>
            </div>
            {deleteConfirm?.mobile_number && deleteConfirm.mobile_number !== "N/A" && (
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Mobile</span>
                <span className="font-semibold text-slate-100">{deleteConfirm.mobile_number}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Amount</span>
              <span className="font-semibold text-slate-100">${deleteConfirm?.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Status</span>
              <span className="font-semibold text-slate-100 capitalize">{deleteConfirm?.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Submitted</span>
              <span className="font-semibold text-slate-100">
                {deleteConfirm?.created_at && `${fmtDate(deleteConfirm.created_at)} ${fmtTime(deleteConfirm.created_at)}`}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePayout}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
