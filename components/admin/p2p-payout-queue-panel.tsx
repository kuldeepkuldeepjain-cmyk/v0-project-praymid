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

interface PayoutRequest {
  id: string
  participant_id: string
  participant_email: string
  participant_name: string
  serial_number: string
  amount: number
  wallet_address: string
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
    const interval = setInterval(() => {
      fetchPayoutRequests()
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  // Update countdown timers every second
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      const newCountdowns: Record<string, string> = {}
      payoutRequests.forEach((payout) => {
        const createdTime = new Date(payout.created_at).getTime()
        const thirtyMinutesLater = createdTime + 30 * 60 * 1000
        const now = Date.now()
        const timeRemaining = thirtyMinutesLater - now

        if (timeRemaining > 0) {
          const minutes = Math.floor((timeRemaining / 1000 / 60) % 60)
          const seconds = Math.floor((timeRemaining / 1000) % 60)
          newCountdowns[payout.id] = `${minutes}m ${seconds}s`
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
      const res = await fetch("/api/admin/payout-requests")
      const data = await res.json()
      if (data.success) setPayoutRequests(data.payouts || [])
      else throw new Error(data.error)
    } catch (error) {
      console.error("Error fetching payout requests:", error)
      toast({ title: "Error", description: "Failed to fetch payout requests", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "processing":
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>
      case "approved":
        return <Badge className="bg-purple-100 text-purple-800">Approved</Badge>
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-800">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const handleDeletePayout = async () => {
    if (!deleteConfirm) return

    setIsDeleting(true)
    try {
      console.log("[v0] Deleting payout request:", deleteConfirm.id)

      const response = await fetch("/api/admin/delete-payout-request", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutRequestId: deleteConfirm.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("[v0] Delete failed:", data)
        throw new Error(data.details || data.error || "Failed to delete payout request")
      }

      // Remove from list
      setPayoutRequests(payoutRequests.filter((p) => p.id !== deleteConfirm.id))
      setDeleteConfirm(null)

      toast({
        title: "Success",
        description: `Payout request #${data.serialNumber} deleted successfully`,
      })
    } catch (error) {
      console.error("[v0] Delete error:", error)
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete payout request",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredPayouts = payoutRequests.filter(
    (payout) =>
      (payout.serial_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (payout.participant_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (payout.participant_email || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    total: payoutRequests.length,
    pending: payoutRequests.filter((p) => p.status === "pending").length,
    processing: payoutRequests.filter((p) => p.status === "processing").length,
    completed: payoutRequests.filter((p) => p.status === "completed").length,
  }

  if (isLoading) {
    return (
      <Card className="border-slate-700 bg-slate-900">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin">
              <Clock className="h-8 w-8 text-slate-400" />
            </div>
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
              P2P Payout Requests
            </CardTitle>
            <CardDescription className="text-slate-400">
              All payout requests with number, date and time
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
            <p className="text-xs text-blue-400 mb-1">Processing</p>
            <p className="text-lg font-bold text-blue-400">{stats.processing}</p>
          </div>
          <div className="bg-green-900/20 rounded-lg p-3 border border-green-900/50">
            <p className="text-xs text-green-400 mb-1">Completed</p>
            <p className="text-lg font-bold text-green-400">{stats.completed}</p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by serial #, name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-700 hover:bg-transparent">
                <TableHead className="text-slate-300 font-semibold">Serial #</TableHead>
                <TableHead className="text-slate-300 font-semibold">Participant Name</TableHead>
                <TableHead className="text-slate-300 font-semibold">Email</TableHead>
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
                filteredPayouts.map((payout) => {
                  const createdDate = new Date(payout.created_at)
                  const dateStr = createdDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                  const timeStr = createdDate.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })

                  return (
                    <TableRow key={payout.id} className="border-b border-slate-700 hover:bg-slate-800/50">
                      <TableCell className="text-slate-200 font-mono font-semibold">#{payout.serial_number}</TableCell>
                      <TableCell className="text-slate-200 font-semibold">{payout.participant_name}</TableCell>
                      <TableCell className="text-slate-300 text-sm">{payout.participant_email}</TableCell>
                      <TableCell className="text-slate-300 text-sm">{dateStr}</TableCell>
                      <TableCell className="text-slate-300 text-sm">{timeStr}</TableCell>
                      <TableCell className="text-slate-200 font-semibold">${payout.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-300 text-sm">
                          <Hourglass className="h-4 w-4 text-orange-400" />
                          <span className="font-mono font-semibold text-orange-400">
                            {countdowns[payout.id] || "Calculating..."}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(payout.status)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteConfirm(payout)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow className="border-b border-slate-700">
                  <TableCell colSpan={9} className="text-center text-slate-400 py-8">
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
              Are you sure you want to permanently delete payout request #{deleteConfirm?.serial_number}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4 text-slate-300">
            <div className="flex justify-between">
              <span>Participant:</span>
              <span className="font-semibold text-slate-100">{deleteConfirm?.participant_name}</span>
            </div>
            <div className="flex justify-between">
              <span>Email:</span>
              <span className="font-semibold text-slate-100">{deleteConfirm?.participant_email}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-semibold text-slate-100">${deleteConfirm?.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-semibold text-slate-100">{deleteConfirm?.status}</span>
            </div>
            <div className="flex justify-between">
              <span>Created:</span>
              <span className="font-semibold text-slate-100">{formatDate(deleteConfirm?.created_at || "")}</span>
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
