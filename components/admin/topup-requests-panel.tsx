"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Wallet,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Eye,
  X,
  Loader2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { getAdminData } from "@/lib/auth"

interface TopupRequest {
  id: string
  participant_id: string
  participant_email: string
  amount: number
  transaction_id: string
  screenshot_url: string | null
  admin_notes: string | null
  rejection_reason: string | null
  reviewed_at: string | null
  reviewed_by_email: string | null
  payment_method: string
  status: "pending" | "completed" | "rejected"
  created_at: string
}

const STATUS_CONFIG = {
  pending:   { label: "Pending",   bg: "bg-amber-100",  text: "text-amber-800",  border: "border-amber-300",  icon: Clock },
  completed: { label: "Approved",  bg: "bg-green-100",  text: "text-green-800",  border: "border-green-300",  icon: CheckCircle2 },
  rejected:  { label: "Rejected",  bg: "bg-red-100",    text: "text-red-800",    border: "border-red-300",    icon: XCircle },
}

export function TopUpRequestsPanel() {
  const { toast } = useToast()
  const [requests, setRequests] = useState<TopupRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed" | "rejected">("all")
  const [selectedRequest, setSelectedRequest] = useState<TopupRequest | null>(null)
  const [showScreenshot, setShowScreenshot] = useState(false)
  const [isActioning, setIsActioning] = useState(false)
  const [adminNoteInput, setAdminNoteInput] = useState("")
  const [rejectionInput, setRejectionInput] = useState("")
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)

  const adminData = getAdminData()

  const fetchRequests = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    else setIsRefreshing(true)
    try {
      const res = await fetch("/api/admin/topup-requests")
      const data = await res.json()
      if (data.success) {
        setRequests(data.requests || [])
      }
    } catch (err) {
      console.error("Failed to fetch topup requests:", err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleApprove = async () => {
    if (!selectedRequest) return
    setIsActioning(true)
    try {
      const res = await fetch("/api/admin/topup-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          action: "approve",
          adminEmail: adminData?.email,
          adminNotes: adminNoteInput.trim() || null,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)

      toast({ title: "Approved", description: `$${selectedRequest.amount} credited to ${selectedRequest.participant_email}` })
      setSelectedRequest(null)
      setAdminNoteInput("")
      fetchRequests(true)
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to approve", variant: "destructive" })
    } finally {
      setIsActioning(false)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest) return
    setIsActioning(true)
    try {
      const res = await fetch("/api/admin/topup-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          action: "reject",
          adminEmail: adminData?.email,
          adminNotes: adminNoteInput.trim() || null,
          rejectionReason: rejectionInput.trim() || "Not specified",
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)

      toast({ title: "Rejected", description: `Request from ${selectedRequest.participant_email} has been rejected.` })
      setSelectedRequest(null)
      setAdminNoteInput("")
      setRejectionInput("")
      setShowRejectConfirm(false)
      fetchRequests(true)
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to reject", variant: "destructive" })
    } finally {
      setIsActioning(false)
    }
  }

  // Filter logic
  const filtered = requests.filter((r) => {
    const matchesSearch =
      !search ||
      r.participant_email.toLowerCase().includes(search.toLowerCase()) ||
      (r.transaction_id || "").toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const pendingCount = requests.filter((r) => r.status === "pending").length

  // Summary stats
  const totalApproved = requests.filter((r) => r.status === "completed").reduce((s, r) => s + r.amount, 0)
  const totalPending = requests.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-600 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">TOP UP Requests</h2>
            <p className="text-sm text-slate-400">Review and approve participant wallet top-up requests</p>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-amber-500 text-white font-bold px-2.5">{pendingCount} pending</Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchRequests(true)}
          disabled={isRefreshing}
          className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Requests", value: requests.length, color: "text-cyan-400" },
          { label: "Pending Amount", value: `$${totalPending.toFixed(2)}`, color: "text-amber-400" },
          { label: "Total Approved", value: `$${totalApproved.toFixed(2)}`, color: "text-green-400" },
        ].map((stat) => (
          <Card key={stat.label} className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by email or transaction hash..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "completed", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                statusFilter === s
                  ? "bg-violet-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {s === "completed" ? "approved" : s}
              {s === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white rounded-full px-1.5 py-0.5 text-[10px]">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-16 text-center">
            <Wallet className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No top-up requests found</p>
            <p className="text-slate-500 text-sm mt-1">
              {statusFilter !== "all" ? "Try changing the filter" : "Requests will appear here once submitted"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((req) => {
            const cfg = STATUS_CONFIG[req.status]
            const StatusIcon = cfg.icon
            return (
              <Card key={req.id} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <StatusIcon className={`h-4 w-4 ${cfg.text}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{req.participant_email}</p>
                        <p className="text-xs text-slate-400 font-mono truncate">
                          {req.transaction_id ? `${req.transaction_id.slice(0, 18)}...` : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-base font-bold text-green-400">${req.amount.toFixed(2)}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(req.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      <Badge className={`${cfg.bg} ${cfg.text} border ${cfg.border} capitalize text-xs`}>
                        {cfg.label}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelectedRequest(req); setAdminNoteInput(""); setRejectionInput(""); setShowRejectConfirm(false) }}
                        className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Review
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => { if (!open && !isActioning) setSelectedRequest(null) }}>
        <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700 text-white p-0 overflow-hidden">
          {selectedRequest && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-violet-600 flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Top-Up Request</h3>
                    <p className="text-xs text-slate-400">{selectedRequest.participant_email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                  disabled={isActioning}
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Status badge */}
                <div className="flex items-center justify-between">
                  <Badge className={`${STATUS_CONFIG[selectedRequest.status].bg} ${STATUS_CONFIG[selectedRequest.status].text} border ${STATUS_CONFIG[selectedRequest.status].border} text-sm px-3 py-1`}>
                    {STATUS_CONFIG[selectedRequest.status].label}
                  </Badge>
                  <span className="text-2xl font-black text-green-400">${selectedRequest.amount.toFixed(2)} USDT</span>
                </div>

                {/* Request details */}
                <div className="rounded-xl bg-slate-800 border border-slate-700 divide-y divide-slate-700">
                  {[
                    { label: "Participant", value: selectedRequest.participant_email },
                    { label: "Amount", value: `$${selectedRequest.amount.toFixed(2)} USDT` },
                    { label: "Submitted", value: new Date(selectedRequest.created_at).toLocaleString() },
                    { label: "Payment Method", value: "Crypto (BEP20 USDT)" },
                    ...(selectedRequest.reviewed_at ? [
                      { label: "Reviewed At", value: new Date(selectedRequest.reviewed_at).toLocaleString() },
                      { label: "Reviewed By", value: selectedRequest.reviewed_by_email || "—" },
                    ] : []),
                    ...(selectedRequest.rejection_reason ? [
                      { label: "Rejection Reason", value: selectedRequest.rejection_reason },
                    ] : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start justify-between px-4 py-2.5 gap-3">
                      <span className="text-sm text-slate-400 flex-shrink-0">{label}</span>
                      <span className="text-sm font-medium text-white text-right">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Transaction Hash */}
                <div className="space-y-1.5">
                  <Label className="text-sm text-slate-400">Transaction Hash</Label>
                  <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5">
                    <code className="flex-1 text-xs text-slate-300 font-mono break-all">
                      {selectedRequest.transaction_id || "Not provided"}
                    </code>
                    {selectedRequest.transaction_id && (
                      <a
                        href={`https://bscscan.com/tx/${selectedRequest.transaction_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 p-1 rounded hover:bg-slate-700 transition-colors"
                        title="View on BscScan"
                      >
                        <ExternalLink className="h-4 w-4 text-cyan-400" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Screenshot */}
                {selectedRequest.screenshot_url && (
                  <div className="space-y-1.5">
                    <Label className="text-sm text-slate-400">Payment Screenshot</Label>
                    <button
                      onClick={() => setShowScreenshot(true)}
                      className="w-full rounded-xl border border-slate-700 overflow-hidden hover:border-violet-500 transition-colors"
                    >
                      <img
                        src={selectedRequest.screenshot_url}
                        alt="Payment screenshot"
                        className="w-full max-h-48 object-contain bg-slate-950"
                      />
                      <p className="text-xs text-slate-400 py-2 text-center">Click to view full size</p>
                    </button>
                  </div>
                )}

                {/* Participant note */}
                {selectedRequest.admin_notes && (
                  <div className="space-y-1.5">
                    <Label className="text-sm text-slate-400">Participant Note</Label>
                    <p className="text-sm text-slate-300 bg-slate-800 rounded-xl px-4 py-3 border border-slate-700">
                      {selectedRequest.admin_notes}
                    </p>
                  </div>
                )}

                {/* Action area — only for pending requests */}
                {selectedRequest.status === "pending" && (
                  <div className="space-y-3 border-t border-slate-700 pt-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm text-slate-400">Admin Note (optional)</Label>
                      <Input
                        placeholder="Add an internal note..."
                        value={adminNoteInput}
                        onChange={(e) => setAdminNoteInput(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500"
                        disabled={isActioning}
                      />
                    </div>

                    {/* Reject confirm flow */}
                    {showRejectConfirm && (
                      <div className="rounded-xl bg-red-950 border border-red-700 p-4 space-y-3">
                        <div className="flex items-center gap-2 text-red-400">
                          <AlertTriangle className="h-4 w-4" />
                          <p className="text-sm font-semibold">Confirm Rejection</p>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-red-300">Reason for rejection</Label>
                          <Input
                            placeholder="e.g. Invalid transaction, duplicate request..."
                            value={rejectionInput}
                            onChange={(e) => setRejectionInput(e.target.value)}
                            className="bg-red-900/30 border-red-700 text-white placeholder:text-red-400 focus:border-red-500"
                            disabled={isActioning}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowRejectConfirm(false)}
                            disabled={isActioning}
                            className="flex-1 bg-transparent border-red-700 text-red-300 hover:bg-red-900/30"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleReject}
                            disabled={isActioning}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                          >
                            {isActioning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                            Confirm Reject
                          </Button>
                        </div>
                      </div>
                    )}

                    {!showRejectConfirm && (
                      <div className="flex gap-3">
                        <Button
                          onClick={() => setShowRejectConfirm(true)}
                          disabled={isActioning}
                          variant="outline"
                          className="flex-1 h-11 bg-transparent border-red-700 text-red-400 hover:bg-red-900/30"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          onClick={handleApprove}
                          disabled={isActioning}
                          className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white font-semibold"
                        >
                          {isActioning
                            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</>
                            : <><CheckCircle2 className="h-4 w-4 mr-2" />Approve & Credit</>
                          }
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Full-size screenshot dialog */}
      <Dialog open={showScreenshot} onOpenChange={setShowScreenshot}>
        <DialogContent className="max-w-2xl bg-slate-950 border-slate-700 p-2">
          {selectedRequest?.screenshot_url && (
            <img
              src={selectedRequest.screenshot_url}
              alt="Payment screenshot full size"
              className="w-full max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
