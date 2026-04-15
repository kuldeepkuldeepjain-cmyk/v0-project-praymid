"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Eye,
  AlertCircle,
  Wallet,
  ArrowRight,
  User,
  Hash,
  DollarSign,
  ImageIcon,
  Loader2,
} from "lucide-react"

interface ContributionWithPayout {
  // Contribution (payment_submission) fields
  contribution_id: string
  participant_name: string
  participant_email: string
  contribution_amount: number
  transaction_id: string
  screenshot_url: string | null
  contribution_status: string
  contribution_submitted_at: string
  // Payout fields (same participant)
  payout_id: string | null
  payout_amount: number | null
  payout_wallet: string | null
  payout_status: string | null
  payout_serial: string | null
  payout_requested_at: string | null
}

interface Stats {
  pending_contributions: number
  with_payout: number
  without_payout: number
  confirmed_today: number
}

export function ContributionPayoutPanel() {
  const { toast } = useToast()
  const [records, setRecords] = useState<ContributionWithPayout[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({ pending_contributions: 0, with_payout: 0, without_payout: 0, confirmed_today: 0 })
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"pending" | "all">("pending")
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set())
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [showScreenshot, setShowScreenshot] = useState(false)
  const [confirmRecord, setConfirmRecord] = useState<ContributionWithPayout | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectRecord, setRejectRecord] = useState<ContributionWithPayout | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Fetch all payment submissions with participant info
      const { data: contributions, error: contribError } = await supabase
        .from("payment_submissions")
        .select(`
          id,
          participant_email,
          amount,
          transaction_id,
          screenshot_url,
          status,
          created_at,
          participants(full_name, username)
        `)
        .order("created_at", { ascending: false })

      if (contribError) throw contribError

      // Fetch all payout requests with participant info
      const { data: payouts, error: payoutError } = await supabase
        .from("payout_requests")
        .select(`
          id,
          participant_email,
          amount,
          wallet_address,
          status,
          serial_number,
          created_at,
          participants(full_name, username)
        `)
        .order("created_at", { ascending: false })

      if (payoutError) throw payoutError

      // Build a map of email -> latest pending payout
      const payoutByEmail = new Map<string, any>()
      for (const payout of payouts || []) {
        const email = payout.participant_email
        // Prefer pending payout; if already have one, keep earliest pending
        const existing = payoutByEmail.get(email)
        if (!existing && payout.status === "pending") {
          payoutByEmail.set(email, payout)
        } else if (!existing) {
          payoutByEmail.set(email, payout)
        }
      }

      // Merge contributions with matching payout
      const merged: ContributionWithPayout[] = (contributions || []).map((c: any) => {
        const payout = payoutByEmail.get(c.participant_email) || null
        return {
          contribution_id: c.id,
          participant_name: c.participants?.full_name || c.participants?.username || c.participant_email,
          participant_email: c.participant_email,
          contribution_amount: c.amount,
          transaction_id: c.transaction_id,
          screenshot_url: c.screenshot_url || null,
          contribution_status: c.status,
          contribution_submitted_at: c.created_at,
          payout_id: payout?.id || null,
          payout_amount: payout?.amount || null,
          payout_wallet: payout?.wallet_address || null,
          payout_status: payout?.status || null,
          payout_serial: payout?.serial_number || null,
          payout_requested_at: payout?.created_at || null,
        }
      })

      setRecords(merged)

      // Compute stats
      const pending = merged.filter((r) => r.contribution_status === "pending" || r.contribution_status === "request_pending")
      const today = new Date().toISOString().split("T")[0]
      const confirmedToday = merged.filter(
        (r) => r.contribution_status === "approved" && r.contribution_submitted_at?.startsWith(today)
      ).length

      setStats({
        pending_contributions: pending.length,
        with_payout: pending.filter((r) => r.payout_id !== null).length,
        without_payout: pending.filter((r) => r.payout_id === null).length,
        confirmed_today: confirmedToday,
      })
    } catch (err) {
      console.error("Error fetching contribution+payout records:", err)
      toast({ title: "Error", description: "Failed to load records", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchRecords()
    // Real-time subscription on both tables
    const supabase = createClient()
    const channel = supabase
      .channel("contribution_payout_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_submissions" }, () => fetchRecords())
      .on("postgres_changes", { event: "*", schema: "public", table: "payout_requests" }, () => fetchRecords())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchRecords])

  const handleConfirm = async () => {
    if (!confirmRecord) return
    if (processedIds.has(confirmRecord.contribution_id)) return

    setProcessingId(confirmRecord.contribution_id)
    setShowConfirmDialog(false)

    try {
      // 1. Approve the contribution via existing API (credits participant $180)
      const res = await fetch("/api/admin/activation-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: confirmRecord.contribution_id, action: "approve" }),
      })
      const result = await res.json()

      if (!result.success && !result.alreadyProcessed) {
        throw new Error(result.error || "Failed to approve contribution")
      }

      // 2. If there is a matching payout, complete it atomically
      if (confirmRecord.payout_id && confirmRecord.payout_status !== "completed") {
        const supabase = createClient()
        const { error: payoutError } = await supabase
          .from("payout_requests")
          .update({ status: "completed", processed_at: new Date().toISOString() })
          .eq("id", confirmRecord.payout_id)
          .neq("status", "completed")

        if (payoutError) throw payoutError
      }

      setProcessedIds((prev) => new Set(prev).add(confirmRecord.contribution_id))
      toast({
        title: "Confirmed & Completed",
        description: confirmRecord.payout_id
          ? `Contribution approved and payout to ${confirmRecord.participant_name} marked as completed.`
          : `Contribution approved. No linked payout request found.`,
      })

      setTimeout(() => fetchRecords(), 500)
    } catch (err: any) {
      console.error("Confirm error:", err)
      toast({ title: "Error", description: err.message || "Failed to confirm", variant: "destructive" })
    } finally {
      setProcessingId(null)
      setConfirmRecord(null)
    }
  }

  const handleReject = async () => {
    if (!rejectRecord || !rejectReason.trim()) {
      toast({ title: "Missing reason", description: "Please enter a rejection reason", variant: "destructive" })
      return
    }
    if (processedIds.has(rejectRecord.contribution_id)) return

    setProcessingId(rejectRecord.contribution_id)
    setShowRejectDialog(false)

    try {
      const res = await fetch("/api/admin/activation-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: rejectRecord.contribution_id, action: "reject", reason: rejectReason }),
      })
      const result = await res.json()
      if (!result.success && !result.alreadyProcessed) throw new Error(result.error || "Failed to reject")

      setProcessedIds((prev) => new Set(prev).add(rejectRecord.contribution_id))
      toast({ title: "Contribution Rejected", description: "Participant has been notified." })
      setTimeout(() => fetchRecords(), 500)
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to reject", variant: "destructive" })
    } finally {
      setProcessingId(null)
      setRejectRecord(null)
      setRejectReason("")
    }
  }

  const filtered = records.filter((r) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && (r.contribution_status === "pending" || r.contribution_status === "request_pending"))
    
    const q = (searchQuery || "").toLowerCase()
    const matchesSearch =
      r.participant_name?.toLowerCase().includes(q) ||
      r.participant_email?.toLowerCase().includes(q) ||
      r.transaction_id?.toLowerCase().includes(q) ||
      r.contribution_amount?.toString().includes(q)
    
    return matchesStatus && matchesSearch
  })

  const getContributionBadge = (status: string) => {
    switch (status) {
      case "pending":
      case "request_pending":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case "in_process":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs"><Clock className="h-3 w-3 mr-1" />In Process</Badge>
      case "approved":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      default:
        return <Badge className="text-xs">{status}</Badge>
    }
  }

  const getPayoutBadge = (status: string | null) => {
    if (!status) return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs">No Payout</Badge>
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs"><Clock className="h-3 w-3 mr-1" />Pending Payout</Badge>
      case "completed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Payout Done</Badge>
      case "rejected":
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs"><XCircle className="h-3 w-3 mr-1" />Payout Rejected</Badge>
      default:
        return <Badge className="text-xs">{status}</Badge>
    }
  }

  const isPending = (r: ContributionWithPayout) =>
    r.contribution_status === "pending" || r.contribution_status === "request_pending"

  const isProcessed = (r: ContributionWithPayout) =>
    processedIds.has(r.contribution_id) || r.contribution_status === "approved" || r.contribution_status === "rejected"

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pending Contributions", value: stats.pending_contributions, color: "amber", icon: Clock },
          { label: "With Payout Request", value: stats.with_payout, color: "blue", icon: Wallet },
          { label: "No Payout Linked", value: stats.without_payout, color: "slate", icon: AlertCircle },
          { label: "Confirmed Today", value: stats.confirmed_today, color: "green", icon: CheckCircle2 },
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label} className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 mb-1">{label}</p>
                  <p className={`text-2xl font-bold ${
                    color === "amber" ? "text-amber-400" :
                    color === "blue" ? "text-blue-400" :
                    color === "green" ? "text-green-400" : "text-slate-300"
                  }`}>{value}</p>
                </div>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  color === "amber" ? "bg-amber-500/20" :
                  color === "blue" ? "bg-blue-500/20" :
                  color === "green" ? "bg-green-500/20" : "bg-slate-500/20"
                }`}>
                  <Icon className={`h-5 w-5 ${
                    color === "amber" ? "text-amber-400" :
                    color === "blue" ? "text-blue-400" :
                    color === "green" ? "text-green-400" : "text-slate-400"
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Table */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-white text-lg">Contributions & Linked Payouts</CardTitle>
              <CardDescription className="text-slate-400 text-sm mt-1">
                Each contribution row shows the same participant's pending payout. Confirm to approve contribution and complete payout together.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "pending" | "all")}
                className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="pending">Pending Only</option>
                <option value="all">All</option>
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search name, email, TxID..."
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
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle2 className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No contributions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((record) => {
                const processing = processingId === record.contribution_id
                const processed = isProcessed(record)
                const pending = isPending(record)

                return (
                  <div
                    key={record.contribution_id}
                    className={`rounded-xl border p-4 transition-all ${
                      processed
                        ? "border-slate-700/30 bg-slate-800/30 opacity-60"
                        : record.payout_id
                        ? "border-blue-500/30 bg-slate-800/50"
                        : "border-slate-700 bg-slate-800/50"
                    }`}
                  >
                    {/* Participant header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {(record.participant_name || record.participant_email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{record.participant_name || record.participant_email || "Unknown"}</p>
                          <p className="text-xs text-slate-400">{record.participant_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getContributionBadge(record.contribution_status)}
                        {record.payout_id && getPayoutBadge(record.payout_status)}
                      </div>
                    </div>

                    {/* Two-column layout: contribution | payout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Contribution details */}
                      <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700/50">
                        <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5" />
                          Contribution Submitted
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">Amount</span>
                            <span className="text-sm font-bold text-green-400">${record.contribution_amount}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400 flex items-center gap-1"><Hash className="h-3 w-3" />TxID</span>
                            <span className="text-xs text-slate-300 font-mono truncate max-w-[140px]" title={record.transaction_id}>
                              {record.transaction_id}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">Submitted</span>
                            <span className="text-xs text-slate-300">
                              {new Date(record.contribution_submitted_at).toLocaleDateString()}
                            </span>
                          </div>
                          {record.screenshot_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setScreenshotUrl(record.screenshot_url); setShowScreenshot(true) }}
                              className="w-full mt-2 bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 text-xs h-7"
                            >
                              <ImageIcon className="h-3 w-3 mr-1.5" />
                              View Screenshot
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Right: Payout details */}
                      <div className={`rounded-lg p-4 border ${
                        record.payout_id
                          ? "bg-blue-950/30 border-blue-500/30"
                          : "bg-slate-900/40 border-slate-700/30"
                      }`}>
                        <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Wallet className="h-3.5 w-3.5" />
                          Payout Request (Same Participant)
                        </p>
                        {record.payout_id ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-400">Payout Amount</span>
                              <span className="text-sm font-bold text-blue-400">${record.payout_amount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Hash className="h-3 w-3" />Serial
                              </span>
                              <span className="text-xs text-slate-300 font-mono">{record.payout_serial || "—"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-400">Requested</span>
                              <span className="text-xs text-slate-300">
                                {record.payout_requested_at ? new Date(record.payout_requested_at).toLocaleDateString() : "—"}
                              </span>
                            </div>
                            <div className="mt-2">
                              <span className="text-xs text-slate-400 block mb-1 flex items-center gap-1">
                                <Wallet className="h-3 w-3" />BEP20 Wallet
                              </span>
                              <p className="text-xs text-slate-200 font-mono bg-slate-800 rounded px-2 py-1.5 break-all">
                                {record.payout_wallet || "Not provided"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-24 gap-2">
                            <AlertCircle className="h-6 w-6 text-slate-500" />
                            <p className="text-xs text-slate-500 text-center">
                              No payout request found for this participant
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action row */}
                    {pending && !processed && (
                      <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-700/50">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setRejectRecord(record); setShowRejectDialog(true) }}
                          disabled={!!processingId}
                          className="bg-transparent border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1.5" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => { setConfirmRecord(record); setShowConfirmDialog(true) }}
                          disabled={!!processingId}
                          className={`text-xs font-semibold ${
                            record.payout_id
                              ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                              : "bg-green-600 hover:bg-green-700 text-white"
                          }`}
                        >
                          {processing ? (
                            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Processing...</>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                              {record.payout_id ? "Confirm & Complete Payout" : "Confirm Contribution"}
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {(processed || !pending) && (
                      <div className="flex items-center justify-end mt-4 pt-4 border-t border-slate-700/50">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          {record.contribution_status === "approved" ? (
                            <><CheckCircle2 className="h-4 w-4 text-green-400" /><span className="text-green-400">Contribution confirmed</span></>
                          ) : record.contribution_status === "rejected" ? (
                            <><XCircle className="h-4 w-4 text-red-400" /><span className="text-red-400">Contribution rejected</span></>
                          ) : (
                            <><Loader2 className="h-4 w-4 animate-spin text-slate-400" /><span>Processing...</span></>
                          )}
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

      {/* Screenshot Dialog */}
      <Dialog open={showScreenshot} onOpenChange={setShowScreenshot}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
          </DialogHeader>
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

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              {confirmRecord?.payout_id ? "Confirm Contribution & Complete Payout" : "Confirm Contribution"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {confirmRecord?.payout_id
                ? "This will approve the contribution, credit the participant's account, and mark their payout request as completed."
                : "This will approve the contribution and credit the participant's account. No payout request is linked."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Participant */}
            <div className="bg-slate-800 rounded-lg p-3 flex items-center gap-3">
              <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Participant</p>
                <p className="text-sm font-medium text-white">{confirmRecord?.participant_name}</p>
                <p className="text-xs text-slate-400">{confirmRecord?.participant_email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Contribution */}
              <div className="bg-green-950/40 border border-green-500/30 rounded-lg p-3">
                <p className="text-xs text-green-400 font-semibold mb-2">Contribution</p>
                <p className="text-lg font-bold text-green-400">${confirmRecord?.contribution_amount}</p>
                <p className="text-xs text-slate-400 font-mono truncate mt-1">{confirmRecord?.transaction_id}</p>
              </div>

              {/* Payout */}
              {confirmRecord?.payout_id ? (
                <div className="bg-blue-950/40 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-xs text-blue-400 font-semibold mb-2">Payout to Complete</p>
                  <p className="text-lg font-bold text-blue-400">${confirmRecord?.payout_amount}</p>
                  <p className="text-xs text-slate-400 font-mono break-all mt-1">
                    {confirmRecord?.payout_wallet?.substring(0, 18)}...
                  </p>
                </div>
              ) : (
                <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 flex items-center justify-center">
                  <p className="text-xs text-slate-500 text-center">No payout linked</p>
                </div>
              )}
            </div>

            {/* Payment Proof Check */}
            {confirmRecord?.screenshot_url ? (
              <div className="flex items-center gap-2 bg-green-900/20 border border-green-500/30 rounded-lg px-3 py-2">
                <ImageIcon className="h-4 w-4 text-green-400 flex-shrink-0" />
                <p className="text-xs text-green-300">✓ Payment proof (screenshot) provided</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-300">✗ No payment proof submitted - Cannot approve</p>
              </div>
            )}

            {confirmRecord?.payout_id && (
              <div className="flex items-center gap-2 bg-amber-900/20 border border-amber-500/20 rounded-lg px-3 py-2">
                <ArrowRight className="h-4 w-4 text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-300">
                  Payout will be sent to: <span className="font-mono">{confirmRecord?.payout_wallet}</span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowConfirmDialog(false); setConfirmRecord(null) }}
              className="bg-transparent border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!confirmRecord?.screenshot_url || processingId === confirmRecord?.contribution_id}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              title={!confirmRecord?.screenshot_url ? "Payment proof is required to approve" : ""}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {processingId === confirmRecord?.contribution_id ? "Processing..." : (confirmRecord?.payout_id ? "Confirm & Complete" : "Confirm")}
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
              Provide a reason for rejecting {rejectRecord?.participant_name}'s contribution of ${rejectRecord?.contribution_amount}.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm text-slate-300 block mb-2">Rejection Reason</label>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Screenshot unclear, wrong amount, duplicate submission..."
              className="bg-slate-800 border-slate-600 text-white"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowRejectDialog(false); setRejectRecord(null); setRejectReason("") }}
              className="bg-transparent border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={!rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject Contribution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
