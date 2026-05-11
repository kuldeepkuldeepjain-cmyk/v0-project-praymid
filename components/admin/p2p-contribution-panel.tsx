"use client"
import { adminFetch } from "@/lib/auth"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ImageIcon,
  ExternalLink,
  Users,
  DollarSign,
  Link2,
  RefreshCw,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Contribution {
  id: string
  participant_email: string
  participant_name: string
  participant_mobile: string | null
  amount: number
  payment_method: string
  transaction_id: string
  screenshot_url: string | null
  status: string
  created_at: string
  matched_payout_id?: string | null
}

interface PayoutRequest {
  id: string
  participant_email: string
  full_name: string
  amount: number
  status: string
  serial_number: number | null
  payout_method: string | null
  mobile_number: string
  bep20_address: string | null
  participant_serial: number | null
  created_at: string
}

export function P2PContributionPanel() {
  const { toast } = useToast()
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [availablePayouts, setAvailablePayouts] = useState<PayoutRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("pending")
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null)
  const [selectedPayoutId, setSelectedPayoutId] = useState("")
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showScreenshotDialog, setShowScreenshotDialog] = useState(false)
  const [showMatchDialog, setShowMatchDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchContributions = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/activation-payments")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to fetch contributions")
      const submissions: any[] = json.payments || []
      setContributions(
        submissions.map((s: any) => ({
          id: s.id,
          participant_email: s.email || s.participant_email,
          participant_name: s.full_name || s.participants?.full_name || s.username || s.participants?.username || s.email?.split("@")[0] || "Unknown",
          participant_mobile: s.mobile_number || s.participants?.mobile_number || null,
          amount: Number(s.amount),
          payment_method: s.payment_method || s.paymentMethod || "BEP20",
          transaction_id: s.transaction_id || s.transactionHash || "N/A",
          screenshot_url: s.screenshot_url || s.screenshotUrl || null,
          status: s.status,
          created_at: s.created_at || s.submittedAt,
          matched_payout_id: s.matched_payout_id || null,
        }))
      )
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchAvailablePayouts = useCallback(async (amount?: number) => {
    try {
      const url = amount
        ? `/api/admin/pending-payout-requests?amount=${amount}`
        : `/api/admin/pending-payout-requests`
      const res = await adminFetch(url)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to fetch payout requests")
      setAvailablePayouts(json.payouts || [])
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  }, [toast])

  useEffect(() => {
    fetchContributions()
    const iv = setInterval(fetchContributions, 15000)
    return () => clearInterval(iv)
  }, [fetchContributions])

  // Stats
  const stats = {
    pending: contributions.filter(c => ["pending", "request_pending", "in_process"].includes(c.status)).length,
    proof_submitted: contributions.filter(c => c.status === "proof_submitted").length,
    approved_today: contributions.filter(c => {
      const today = new Date(); today.setHours(0,0,0,0)
      return c.status === "approved" && new Date(c.created_at) >= today
    }).length,
    rejected_today: contributions.filter(c => {
      const today = new Date(); today.setHours(0,0,0,0)
      return c.status === "rejected" && new Date(c.created_at) >= today
    }).length,
  }

  const filteredContributions = contributions.filter(c => {
    const matchesStatus =
      statusFilter === "all" ? true :
      statusFilter === "pending" ? ["pending", "request_pending"].includes(c.status) :
      c.status === statusFilter

    const q = searchQuery.toLowerCase()
    const matchesSearch = !q ||
      c.participant_name.toLowerCase().includes(q) ||
      c.participant_email.toLowerCase().includes(q) ||
      c.transaction_id.toLowerCase().includes(q)

    return matchesStatus && matchesSearch
  })

  const handleMatchWithPayout = async () => {
    if (!selectedContribution || !selectedPayoutId) {
      toast({ title: "Select a payout request first", variant: "destructive" })
      return
    }
    setIsProcessing(true)
    try {
      const res = await adminFetch("/api/admin/auto-match-single-contribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contributionId: selectedContribution.id,
          payoutId: selectedPayoutId,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Match failed")
      toast({ title: "Matched", description: "Contribution matched with payout request." })
      setShowMatchDialog(false)
      setSelectedPayoutId("")
      setSelectedContribution(null)
      fetchContributions()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApprove = async (id: string) => {
    if (processingId === id) return
    setIsProcessing(true)
    setProcessingId(id)
    try {
      const res = await adminFetch("/api/admin/p2p-contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contributionId: id, action: "approve" }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Approval failed")
      toast({ title: "Approved", description: json.message })
      setShowScreenshotDialog(false)
      setSelectedContribution(null)
      fetchContributions()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setIsProcessing(false)
      setProcessingId(null)
    }
  }

  const handleReject = async () => {
    if (!selectedContribution || !rejectReason.trim()) {
      toast({ title: "Enter a rejection reason", variant: "destructive" })
      return
    }
    setIsProcessing(true)
    try {
      const res = await adminFetch("/api/admin/p2p-contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contributionId: selectedContribution.id, action: "reject", reason: rejectReason }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Rejection failed")
      toast({ title: "Rejected", description: json.message })
      setShowRejectDialog(false)
      setShowScreenshotDialog(false)
      setRejectReason("")
      setSelectedContribution(null)
      fetchContributions()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
      pending:        { label: "Pending Review",    cls: "bg-blue-500/20 text-blue-400 border-blue-500/30",   icon: <Clock className="h-3 w-3 mr-1" /> },
      request_pending:{ label: "Request Only",      cls: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: <Clock className="h-3 w-3 mr-1" /> },
      in_process:     { label: "Matched — In Process", cls: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: <Link2 className="h-3 w-3 mr-1" /> },
      proof_submitted:{ label: "Proof Submitted",   cls: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: <ImageIcon className="h-3 w-3 mr-1" /> },
      approved:       { label: "Approved",          cls: "bg-green-500/20 text-green-400 border-green-500/30",   icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
      rejected:       { label: "Rejected",          cls: "bg-red-500/20 text-red-400 border-red-500/30",        icon: <XCircle className="h-3 w-3 mr-1" /> },
    }
    const s = map[status] || { label: status, cls: "bg-slate-500/20 text-slate-400", icon: null }
    return <Badge className={s.cls}>{s.icon}{s.label}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pending", value: stats.pending, color: "text-blue-400", bg: "bg-blue-500/10", icon: <Clock className="h-5 w-5 text-blue-400" /> },
          { label: "Proof Submitted", value: stats.proof_submitted, color: "text-orange-400", bg: "bg-orange-500/10", icon: <ImageIcon className="h-5 w-5 text-orange-400" /> },
          { label: "Approved Today", value: stats.approved_today, color: "text-green-400", bg: "bg-green-500/10", icon: <CheckCircle2 className="h-5 w-5 text-green-400" /> },
          { label: "Rejected Today", value: stats.rejected_today, color: "text-red-400", bg: "bg-red-500/10", icon: <XCircle className="h-5 w-5 text-red-400" /> },
        ].map(s => (
          <Card key={s.label} className="bg-slate-900 border-slate-700">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              </div>
              <div className={`h-11 w-11 rounded-full ${s.bg} flex items-center justify-center`}>{s.icon}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="pending">Pending Only</option>
          <option value="proof_submitted">Proof Submitted</option>
          <option value="in_process">Matched (In Process)</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, email or TxID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-600 text-white"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchContributions}
          className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Contributions Table */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-lg">
              Contributions
              <span className="ml-2 text-sm font-normal text-slate-400">
                ({filteredContributions.length} shown)
              </span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  {["Contributor", "Amount", "Transaction ID", "Screenshot", "Status", "Matched Payout", "Date", "Actions"].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-10 text-slate-500">Loading...</td></tr>
                ) : filteredContributions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10">
                      <Users className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">No contributions found</p>
                    </td>
                  </tr>
                ) : filteredContributions.map(c => (
                  <tr
                    key={c.id}
                    className={`border-b border-slate-700/50 hover:bg-slate-800/40 ${
                      c.status === "proof_submitted" ? "bg-orange-950/10 border-l-2 border-l-orange-500" : ""
                    }`}
                  >
                    {/* Contributor */}
                    <td className="py-3 px-4 min-w-[160px]">
                      <p className="text-sm font-semibold text-white leading-tight">{c.participant_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{c.participant_email}</p>
                      {c.participant_mobile && (
                        <p className="text-xs text-slate-500 mt-0.5">{c.participant_mobile}</p>
                      )}
                    </td>
                    {/* Amount */}
                    <td className="py-3 px-4">
                      <span className="text-green-400 font-bold">${c.amount}</span>
                    </td>
                    {/* TxID */}
                    <td className="py-3 px-4">
                      <p className="text-xs text-slate-300 font-mono truncate max-w-[140px]">{c.transaction_id}</p>
                    </td>
                    {/* Screenshot */}
                    <td className="py-3 px-4">
                      {c.screenshot_url ? (
                        <Button size="sm" variant="outline"
                          onClick={() => { setSelectedContribution(c); setShowScreenshotDialog(true) }}
                          className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 text-xs"
                        >
                          <ImageIcon className="h-3.5 w-3.5 mr-1" /> View
                        </Button>
                      ) : <span className="text-xs text-slate-600">None</span>}
                    </td>
                    {/* Status */}
                    <td className="py-3 px-4">{statusBadge(c.status)}</td>
                    {/* Matched payout */}
                    <td className="py-3 px-4">
                      {c.matched_payout_id
                        ? <span className="text-xs text-purple-400 font-mono">{c.matched_payout_id.slice(0, 8)}...</span>
                        : <span className="text-xs text-slate-600">Not matched</span>}
                    </td>
                    {/* Date & Time */}
                    <td className="py-3 px-4 min-w-[110px]">
                      <p className="text-xs font-medium text-slate-300 whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                      <p className="text-xs text-slate-500 whitespace-nowrap mt-0.5">
                        {new Date(c.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                      </p>
                    </td>
                    {/* Actions */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 justify-end">
                        {c.status === "approved" ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
                          </Badge>
                        ) : c.status === "rejected" ? (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                            <XCircle className="h-3 w-3 mr-1" /> Rejected
                          </Badge>
                        ) : (
                          <>
                            {/* Match button — for unmatched pending contributions */}
                            {["pending", "request_pending"].includes(c.status) && !c.matched_payout_id && (
                              <Button size="sm"
                                onClick={() => {
                                  setSelectedContribution(c)
                                  fetchAvailablePayouts(c.amount)
                                  setShowMatchDialog(true)
                                }}
                                disabled={isProcessing}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                              >
                                <Link2 className="h-3.5 w-3.5 mr-1" /> Match
                              </Button>
                            )}
                            {/* Approve / Reject for proof_submitted or in_process */}
                            {["proof_submitted", "in_process", "pending"].includes(c.status) && (
                              <>
                                {c.screenshot_url && c.status === "proof_submitted" && (
                                  <Button size="sm"
                                    onClick={() => { setSelectedContribution(c); setShowScreenshotDialog(true) }}
                                    className="bg-orange-600 hover:bg-orange-700 text-white text-xs"
                                  >
                                    <ImageIcon className="h-3.5 w-3.5 mr-1" /> Proof
                                  </Button>
                                )}
                                <Button size="sm"
                                  onClick={() => handleApprove(c.id)}
                                  disabled={isProcessing || processingId === c.id}
                                  className="bg-green-600 hover:bg-green-700 text-white text-xs disabled:bg-slate-600"
                                >
                                  {processingId === c.id ? "..." : "Approve"}
                                </Button>
                                <Button size="sm" variant="destructive"
                                  onClick={() => { setSelectedContribution(c); setShowRejectDialog(true) }}
                                  disabled={isProcessing}
                                  className="text-xs"
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={open => { setShowRejectDialog(open); if (!open) { setRejectReason(""); setSelectedContribution(null) } }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Reject Contribution</DialogTitle>
            <DialogDescription className="text-slate-400">
              Provide a reason. The user will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g. Invalid transaction ID, fake screenshot..."
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            className="bg-slate-800 border-slate-600 text-white min-h-24"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectReason(""); setSelectedContribution(null) }}
              className="bg-transparent border-slate-600 text-slate-300">Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing || !rejectReason.trim()}>
              {isProcessing ? "Rejecting..." : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Screenshot / Proof Dialog */}
      <Dialog open={showScreenshotDialog} onOpenChange={open => { setShowScreenshotDialog(open); if (!open) setSelectedContribution(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-orange-400" /> Payment Proof Verification
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Review the submitted proof then approve or reject.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">Contributor</p>
                <p className="text-white font-semibold text-sm leading-tight">{selectedContribution?.participant_name}</p>
                <p className="text-slate-400 text-xs mt-0.5">{selectedContribution?.participant_email}</p>
                {selectedContribution?.participant_mobile && (
                  <p className="text-slate-500 text-xs mt-0.5">{selectedContribution.participant_mobile}</p>
                )}
                <p className="text-slate-600 text-[10px] mt-1">
                  {selectedContribution?.created_at && new Date(selectedContribution.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  {" "}
                  {selectedContribution?.created_at && new Date(selectedContribution.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                </p>
              </div>
              <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-400 mb-0.5">Amount</p>
                <p className="text-green-400 font-bold text-xl">${selectedContribution?.amount}</p>
                <p className="text-xs text-slate-500 mt-0.5 font-mono truncate">TxID: {selectedContribution?.transaction_id}</p>
              </div>
            </div>
            {selectedContribution?.screenshot_url ? (
              <div className="rounded-lg overflow-hidden border-2 border-orange-500/40">
                <div className="bg-orange-500/10 px-3 py-2 flex items-center justify-between border-b border-orange-500/30">
                  <span className="text-xs text-orange-400 font-medium">Payment Screenshot</span>
                  <a href={selectedContribution.screenshot_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> Open full size
                  </a>
                </div>
                <img src={selectedContribution.screenshot_url} alt="Payment proof"
                  className="w-full h-auto max-h-80 object-contain bg-slate-950" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-slate-500 text-sm">No screenshot uploaded</p>
              </div>
            )}
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => { setShowScreenshotDialog(false); setSelectedContribution(null) }}
              className="bg-transparent border-slate-600 text-slate-300">Close</Button>
            <Button variant="destructive"
              onClick={() => { setShowScreenshotDialog(false); setShowRejectDialog(true) }}
              disabled={isProcessing}>
              <XCircle className="h-4 w-4 mr-1.5" /> Reject
            </Button>
            <Button onClick={() => selectedContribution && handleApprove(selectedContribution.id)}
              disabled={isProcessing || processingId === selectedContribution?.id}
              className="bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {processingId === selectedContribution?.id ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Match with Payout Dialog */}
      <Dialog open={showMatchDialog} onOpenChange={open => { setShowMatchDialog(open); if (!open) { setSelectedPayoutId(""); setSelectedContribution(null) } }}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-white">Match Contribution with Payout Request</DialogTitle>
            <DialogDescription className="text-slate-400">
              Select a pending payout request to assign to this contribution.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Contribution summary */}
            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Contributor</p>
                <p className="text-white font-semibold">{selectedContribution?.participant_name}</p>
                <p className="text-slate-400 text-sm">{selectedContribution?.participant_email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 mb-0.5">Contribution Amount</p>
                <p className="text-green-400 font-bold text-2xl">${selectedContribution?.amount}</p>
              </div>
            </div>

            {/* Pending payout requests */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-300 font-medium">
                  Pending Payout Requests
                  {selectedContribution && (
                    <span className="ml-2 text-xs text-slate-500">(amount: ${selectedContribution.amount})</span>
                  )}
                </p>
                <Button size="sm" variant="ghost"
                  onClick={() => fetchAvailablePayouts(selectedContribution?.amount)}
                  className="text-slate-400 hover:text-white text-xs">
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
                </Button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {availablePayouts.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">No pending payout requests found</p>
                  </div>
                ) : availablePayouts.map(payout => (
                  <div
                    key={payout.id}
                    onClick={() => setSelectedPayoutId(payout.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedPayoutId === payout.id
                        ? "bg-purple-900/30 border-purple-500"
                        : "bg-slate-800 border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold truncate">{payout.full_name}</p>
                        <p className="text-slate-400 text-sm truncate">{payout.participant_email}</p>
                        <div className="flex gap-4 mt-1.5 flex-wrap">
                          <p className="text-xs text-slate-500">Mobile: {payout.mobile_number}</p>
                          {payout.bep20_address && (
                            <p className="text-xs text-slate-500 font-mono">
                              Wallet: {payout.bep20_address.slice(0, 16)}...
                            </p>
                          )}
                          {payout.participant_serial && (
                            <p className="text-xs text-slate-500">Serial: #{payout.participant_serial}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold text-purple-400">${payout.amount}</p>
                        <Badge className={`mt-1 text-xs ${
                          payout.status === "pending"
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            : "bg-purple-500/20 text-purple-400 border-purple-500/30"
                        }`}>
                          {payout.status}
                        </Badge>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(payout.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline"
              onClick={() => { setShowMatchDialog(false); setSelectedPayoutId(""); setSelectedContribution(null) }}
              disabled={isProcessing}
              className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800">Cancel</Button>
            <Button onClick={handleMatchWithPayout} disabled={isProcessing || !selectedPayoutId}
              className="bg-purple-600 hover:bg-purple-700 text-white">
              {isProcessing ? "Matching..." : "Confirm Match"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
