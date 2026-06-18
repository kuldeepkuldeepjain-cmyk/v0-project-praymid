"use client"
import { adminFetch } from "@/lib/auth"

import { useState, useEffect, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  AlertCircle,
  Wallet,
  Hash,
  DollarSign,
  ImageIcon,
  Loader2,
  Link2,
  Phone,
  Mail,
} from "lucide-react"

interface Contribution {
  id: string
  participant_name: string
  participant_email: string
  mobile_number?: string | null
  amount: number
  transaction_id: string
  screenshot_url: string | null
  status: string
  created_at: string
}

interface PendingPayout {
  id: number
  serial_number: string
  participant_name: string
  participant_email: string
  mobile_number?: string | null
  amount: number
  wallet_address: string
  status: string
  created_at: string
}

interface Stats {
  pending_contributions: number
  pending_payouts: number
}

export function ContributionPayoutPanel() {
  const { toast } = useToast()
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({ pending_contributions: 0, pending_payouts: 0 })
  const [searchQuery, setSearchQuery] = useState("")
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set())
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [showScreenshot, setShowScreenshot] = useState(false)

  // Manual match state
  const [matchDialog, setMatchDialog] = useState(false)
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null)
  const [selectedPayoutId, setSelectedPayoutId] = useState<string>("")

  // Reject state
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectRecord, setRejectRecord] = useState<Contribution | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const [contribRes, payoutRes] = await Promise.all([
        adminFetch("/api/admin/activation-payments"),
        adminFetch("/api/admin/pending-payout-requests"),
      ])
      const contribJson = await contribRes.json()
      const payoutJson = await payoutRes.json()

      const contribs: Contribution[] = (contribJson.payments || []).map((c: any) => ({
        id: c.id,
        participant_name: c.full_name || c.username || c.participant_email,
        participant_email: c.participant_email,
        mobile_number: c.mobile_number || null,
        amount: c.amount,
        transaction_id: c.transaction_id,
        screenshot_url: c.screenshot_url || null,
        status: c.status,
        created_at: c.created_at,
      }))

      const payouts: PendingPayout[] = (payoutJson.payouts || []).map((p: any) => ({
        id: p.id,
        serial_number: p.serial_number,
        participant_name: p.participant_name || p.participant_email,
        participant_email: p.participant_email,
        mobile_number: p.mobile_number || null,
        amount: p.amount,
        wallet_address: p.wallet_address || p.bep20_address || "",
        status: p.status,
        created_at: p.created_at,
      }))

      setContributions(contribs)
      setPendingPayouts(payouts)
      setStats({
        pending_contributions: contribs.filter(c => c.status === "pending" || c.status === "request_pending").length,
        pending_payouts: payouts.filter(p => p.status === "pending").length,
      })
    } catch (err) {
      toast({ title: "Error", description: "Failed to load records", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchRecords()
    const interval = setInterval(fetchRecords, 30000)
    return () => clearInterval(interval)
  }, [fetchRecords])

  const handleManualMatch = async () => {
    if (!selectedContribution || !selectedPayoutId) return
    setProcessingId(selectedContribution.id)
    setMatchDialog(false)

    try {
      const res = await adminFetch("/api/admin/manual-match-contribution-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contributionId: selectedContribution.id,
          payoutId: Number(selectedPayoutId),
        }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error || "Failed to match")

      setProcessedIds(prev => new Set(prev).add(selectedContribution.id))
      toast({
        title: "Matched & Completed",
        description: result.message,
      })
      setTimeout(() => fetchRecords(), 500)
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to match", variant: "destructive" })
    } finally {
      setProcessingId(null)
      setSelectedContribution(null)
      setSelectedPayoutId("")
    }
  }

  const handleApproveOnly = async (contribution: Contribution) => {
    if (processedIds.has(contribution.id)) return
    setProcessingId(contribution.id)
    try {
      const res = await adminFetch("/api/admin/activation-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: contribution.id, action: "approve" }),
      })
      const result = await res.json()
      if (!result.success && !result.alreadyProcessed) throw new Error(result.error || "Failed to approve")
      setProcessedIds(prev => new Set(prev).add(contribution.id))
      toast({ title: "Contribution Approved", description: "No payout was linked." })
      setTimeout(() => fetchRecords(), 500)
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async () => {
    if (!rejectRecord || !rejectReason.trim()) {
      toast({ title: "Missing reason", description: "Please enter a rejection reason", variant: "destructive" })
      return
    }
    setProcessingId(rejectRecord.id)
    setShowRejectDialog(false)
    try {
      const res = await adminFetch("/api/admin/activation-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: rejectRecord.id, action: "reject", reason: rejectReason }),
      })
      const result = await res.json()
      if (!result.success && !result.alreadyProcessed) throw new Error(result.error || "Failed to reject")
      setProcessedIds(prev => new Set(prev).add(rejectRecord.id))
      toast({ title: "Contribution Rejected", description: "Participant has been notified." })
      setTimeout(() => fetchRecords(), 500)
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setProcessingId(null)
      setRejectRecord(null)
      setRejectReason("")
    }
  }

  const filteredContributions = contributions.filter(c => {
    const q = searchQuery.toLowerCase()
    return (
      c.participant_name?.toLowerCase().includes(q) ||
      c.participant_email?.toLowerCase().includes(q) ||
      c.mobile_number?.includes(q) ||
      c.transaction_id?.toLowerCase().includes(q)
    )
  })

  const isPending = (c: Contribution) => c.status === "pending" || c.status === "request_pending"
  const isProcessed = (c: Contribution) => processedIds.has(c.id) || c.status === "approved" || c.status === "rejected"

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
      case "request_pending":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case "approved":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      default:
        return <Badge className="text-xs">{status}</Badge>
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Pending Contributions</p>
              <p className="text-2xl font-bold text-amber-400">{stats.pending_contributions}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Pending Payouts</p>
              <p className="text-2xl font-bold text-blue-400">{stats.pending_payouts}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contributions List */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-white text-lg">Pending Contributions</CardTitle>
              <CardDescription className="text-slate-400 text-sm mt-1">
                Manually match a contribution with any pending payout request.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search name, email, mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-800 border-slate-600 text-white text-sm w-56"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchRecords}
                className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : filteredContributions.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle2 className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No contributions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredContributions.map((c) => {
                const processing = processingId === c.id
                const processed = isProcessed(c)
                const pending = isPending(c)

                return (
                  <div
                    key={c.id}
                    className={`rounded-xl border p-4 transition-all ${
                      processed ? "border-slate-700/30 bg-slate-800/30 opacity-60" : "border-slate-700 bg-slate-800/50"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {(c.participant_name || c.participant_email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{c.participant_name}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Mail className="h-3 w-3" />{c.participant_email}
                            </span>
                            {c.mobile_number && (
                              <span className="flex items-center gap-1 text-xs text-cyan-400">
                                <Phone className="h-3 w-3" />{c.mobile_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(c.status)}
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-3 gap-3 mb-3 bg-slate-900/50 rounded-lg p-3">
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Amount</p>
                        <p className="text-sm font-bold text-green-400">${c.amount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><Hash className="h-3 w-3" />TxID</p>
                        <p className="text-xs text-slate-300 font-mono truncate" title={c.transaction_id}>{c.transaction_id || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Submitted</p>
                        <p className="text-xs text-slate-300">{new Date(c.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {c.screenshot_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setScreenshotUrl(c.screenshot_url); setShowScreenshot(true) }}
                        className="w-full mb-3 bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 text-xs h-7"
                      >
                        <ImageIcon className="h-3 w-3 mr-1.5" />View Screenshot
                      </Button>
                    )}

                    {/* Actions */}
                    {pending && !processed && (
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700/50">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setRejectRecord(c); setShowRejectDialog(true) }}
                          disabled={!!processingId}
                          className="bg-transparent border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1.5" />Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApproveOnly(c)}
                          disabled={!!processingId}
                          className="bg-transparent border-green-500/40 text-green-400 hover:bg-green-500/10 text-xs"
                        >
                          {processing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                          Approve Only
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedContribution(c)
                            setSelectedPayoutId("")
                            setMatchDialog(true)
                          }}
                          disabled={!!processingId || pendingPayouts.length === 0}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                        >
                          <Link2 className="h-3.5 w-3.5 mr-1.5" />
                          Match with Payout
                        </Button>
                      </div>
                    )}

                    {(processed || !pending) && (
                      <div className="flex items-center justify-end mt-3 pt-3 border-t border-slate-700/50">
                        <div className="flex items-center gap-2 text-xs">
                          {c.status === "approved"
                            ? <><CheckCircle2 className="h-4 w-4 text-green-400" /><span className="text-green-400">Approved</span></>
                            : c.status === "rejected"
                            ? <><XCircle className="h-4 w-4 text-red-400" /><span className="text-red-400">Rejected</span></>
                            : <><Loader2 className="h-4 w-4 animate-spin text-slate-400" /><span className="text-slate-400">Processing...</span></>
                          }
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Payouts Reference List */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Pending Payout Requests</CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            These are available to be matched with a contribution above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingPayouts.filter(p => p.status === "pending").length === 0 ? (
            <div className="text-center py-10">
              <Wallet className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No pending payout requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPayouts.filter(p => p.status === "pending").map((p) => (
                <div key={p.id} className="rounded-lg border border-blue-500/20 bg-blue-950/20 p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm flex-shrink-0">
                      {(p.participant_name || p.participant_email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{p.participant_name}</p>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs text-slate-400"><Mail className="h-3 w-3" />{p.participant_email}</span>
                        {p.mobile_number && (
                          <span className="flex items-center gap-1 text-xs text-cyan-400"><Phone className="h-3 w-3" />{p.mobile_number}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-blue-400">${p.amount}</p>
                    <p className="text-xs text-slate-400">#{p.serial_number}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Screenshot Dialog */}
      <Dialog open={showScreenshot} onOpenChange={setShowScreenshot}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader><DialogTitle>Payment Screenshot</DialogTitle></DialogHeader>
          {screenshotUrl ? (
            <div className="rounded-lg overflow-hidden border border-slate-700">
              <img src={screenshotUrl} alt="Payment proof" className="w-full object-contain max-h-[70vh]" />
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No screenshot available</p>
          )}
          <DialogFooter>
            <Button onClick={() => setShowScreenshot(false)} className="bg-slate-700 hover:bg-slate-600 text-white">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Match Dialog */}
      <Dialog open={matchDialog} onOpenChange={setMatchDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-blue-400" />
              Manually Match with Payout
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Select a pending payout request to match with this contribution. Both will be completed together.
            </DialogDescription>
          </DialogHeader>

          {selectedContribution && (
            <div className="space-y-4">
              {/* Contribution summary */}
              <div className="bg-slate-800 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Contribution from</p>
                <p className="text-sm font-semibold text-white">{selectedContribution.participant_name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-slate-400"><Mail className="h-3 w-3" />{selectedContribution.participant_email}</span>
                  {selectedContribution.mobile_number && (
                    <span className="flex items-center gap-1 text-xs text-cyan-400"><Phone className="h-3 w-3" />{selectedContribution.mobile_number}</span>
                  )}
                </div>
                <p className="text-lg font-bold text-green-400 mt-2">${selectedContribution.amount}</p>
              </div>

              {/* Payout selector */}
              <div>
                <p className="text-sm font-medium text-slate-300 mb-2">Select Payout to Complete</p>
                {pendingPayouts.filter(p => p.status === "pending").length === 0 ? (
                  <div className="text-center py-4 text-slate-500 text-sm border border-slate-700 rounded-lg">
                    No pending payout requests available
                  </div>
                ) : (
                  <Select value={selectedPayoutId} onValueChange={setSelectedPayoutId}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue placeholder="Choose a payout request..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {pendingPayouts.filter(p => p.status === "pending").map((p) => (
                        <SelectItem key={p.id} value={String(p.id)} className="text-white focus:bg-slate-700">
                          <div className="flex flex-col">
                            <span className="font-medium">{p.participant_name} — ${p.amount}</span>
                            <span className="text-xs text-slate-400">{p.participant_email} {p.mobile_number ? `• ${p.mobile_number}` : ""} • #{p.serial_number}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Selected payout preview */}
              {selectedPayoutId && (() => {
                const payout = pendingPayouts.find(p => String(p.id) === selectedPayoutId)
                if (!payout) return null
                return (
                  <div className="bg-blue-950/40 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-xs text-blue-400 font-semibold mb-2">Selected Payout</p>
                    <p className="text-sm font-semibold text-white">{payout.participant_name}</p>
                    <div className="flex items-center gap-3 mt-0.5 mb-2">
                      <span className="flex items-center gap-1 text-xs text-slate-400"><Mail className="h-3 w-3" />{payout.participant_email}</span>
                      {payout.mobile_number && (
                        <span className="flex items-center gap-1 text-xs text-cyan-400"><Phone className="h-3 w-3" />{payout.mobile_number}</span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-blue-400">${payout.amount} — #{payout.serial_number}</p>
                    <p className="text-xs text-slate-400 font-mono mt-1 break-all">{payout.wallet_address}</p>
                  </div>
                )
              })()}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMatchDialog(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancel
            </Button>
            <Button
              onClick={handleManualMatch}
              disabled={!selectedPayoutId || !!processingId}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
            >
              <Link2 className="h-4 w-4 mr-2" />
              Confirm Match & Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-400" />
              Reject Contribution
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Provide a reason for rejection. The participant will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-400">Participant</p>
              <p className="text-sm font-medium text-white">{rejectRecord?.participant_name}</p>
              <p className="text-xs text-slate-400">{rejectRecord?.participant_email}</p>
            </div>
            <Input
              placeholder="Rejection reason..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancel
            </Button>
            <Button onClick={handleReject} className="bg-red-600 hover:bg-red-500 text-white">
              <XCircle className="h-4 w-4 mr-2" />Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
