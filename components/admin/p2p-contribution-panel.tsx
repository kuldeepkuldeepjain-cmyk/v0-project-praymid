"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { CheckCircle2, XCircle, Clock, Search, ImageIcon, ExternalLink, Users, DollarSign } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface ContributionSubmission {
  id: string
  participant_id: string
  participant_email: string
  participant_name: string
  amount: number
  payment_method: string
  transaction_id: string
  screenshot_url: string | null
  status: string
  created_at: string
  matched_payout_id?: string
  reviewed_at?: string
}

interface Stats {
  pending: number
  proof_submitted: number
  approved_today: number
  rejected_today: number
  total_platform_revenue: number
}

export function P2PContributionPanel() {
  const { toast } = useToast()
  const [contributions, setContributions] = useState<ContributionSubmission[]>([])
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    proof_submitted: 0,
    approved_today: 0,
    rejected_today: 0,
    total_platform_revenue: 0,
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedContribution, setSelectedContribution] = useState<ContributionSubmission | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showScreenshotDialog, setShowScreenshotDialog] = useState(false)
  const [showMatchDialog, setShowMatchDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [availablePayouts, setAvailablePayouts] = useState<any[]>([])
  const [selectedPayoutId, setSelectedPayoutId] = useState<string>("")
  const [processedIds, setProcessedIds] = useState<Set<string>>(() => {
    // Initialize from LocalStorage to persist across navigation
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("admin_processed_contributions")
      return stored ? new Set(JSON.parse(stored)) : new Set()
    }
    return new Set()
  })
  const [statusFilter, setStatusFilter] = useState<string>("pending") // "pending", "all"

  useEffect(() => {
    fetchContributions()
    const interval = setInterval(fetchContributions, 10000)
    return () => clearInterval(interval)
  }, [])

  // Sync processedIds to LocalStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_processed_contributions", JSON.stringify(Array.from(processedIds)))
    }
  }, [processedIds])

  const fetchContributions = async () => {
    try {
      const supabase = createClient()

      // Fetch payment_submissions with participant details
      const { data: submissions, error } = await supabase
        .from("payment_submissions")
        .select(`
          *,
          participants(
            full_name,
            username,
            email
          ),
          matched_payout_id
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      const transformed = submissions?.map((sub: any) => ({
        id: sub.id,
        participant_id: sub.participant_id,
        participant_email: sub.participant_email,
        participant_name: sub.participants?.full_name || sub.participants?.username || "Unknown",
        amount: sub.amount,
        payment_method: sub.payment_method,
        transaction_id: sub.transaction_id || "N/A",
        screenshot_url: sub.screenshot_url,
        status: sub.status,
        created_at: sub.created_at,
        matched_payout_id: sub.matched_payout_id,
      })) || []


      setContributions(transformed)

      // Calculate stats
      const pending = transformed.filter((c) =>
        c.status === "pending" || c.status === "request_pending" ||
        c.status === "in_process" || c.status === "proof_submitted"
      ).length
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const approvedToday = transformed.filter(
        (c) => c.status === "approved" && new Date(c.created_at) >= today
      ).length

      const rejectedToday = transformed.filter(
        (c) => c.status === "rejected" && new Date(c.created_at) >= today
      ).length

      const proofSubmitted = transformed.filter((c) => c.status === "proof_submitted").length
      const totalApproved = transformed.filter((c) => c.status === "approved").length
      const platformRevenue = totalApproved * 10 // $10 per approved contribution

      setStats({
        pending,
        proof_submitted: proofSubmitted,
        approved_today: approvedToday,
        rejected_today: rejectedToday,
        total_platform_revenue: platformRevenue,
      })

      // Clean up processedIds - sync with database status
      setProcessedIds((prev) => {
        const newSet = new Set(prev)
        let changed = false
        transformed.forEach((c) => {
          if ((c.status === "approved" || c.status === "rejected") && !newSet.has(c.id)) {
            newSet.add(c.id)
            changed = true
          }
        })
        return changed ? newSet : prev
      })
    } catch (error) {
      console.error("Error fetching contributions:", error)
      toast({
        title: "Error",
        description: "Failed to fetch contributions",
        variant: "destructive",
      })
    }
  }

  const fetchAvailablePayouts = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("payout_requests")
        .select(`
          *,
          participants(full_name, email, mobile_number, wallet_address, bep20_address)
        `)
        .in("status", ["pending", "request_pending"])
        .is("matched_contribution_id", null)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Fetch payouts error:", error)
        toast({
          title: "Error",
          description: "Failed to fetch payout requests: " + error.message,
          variant: "destructive",
        })
        return
      }
      setAvailablePayouts(data || [])
    } catch (error) {
      console.error("Error fetching payouts:", error)
      toast({
        title: "Error",
        description: "Failed to fetch payout requests",
        variant: "destructive",
      })
    }
  }

  const handleMatchWithPayout = async () => {
    if (!selectedContribution || !selectedPayoutId) {
      toast({
        title: "Missing Selection",
        description: "Please select a payout request to match",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      const supabase = createClient()

      // Update contribution with matched payout ID
      const { data: updatedContribution, error: contributionError } = await supabase
        .from("payment_submissions")
        .update({ 
          matched_payout_id: selectedPayoutId,
          status: "in_process"
        })
        .eq("id", selectedContribution.id)
        .select()

      if (contributionError) throw contributionError

      // Update payout with matched contribution ID
      const { data: updatedPayout, error: payoutError } = await supabase
        .from("payout_requests")
        .update({ matched_contribution_id: selectedContribution.id })
        .eq("id", selectedPayoutId)
        .select()

      if (payoutError) throw payoutError

      toast({
        title: "Successfully Matched",
        description: "Contribution matched with payout request. Contributor can now see payout details.",
      })

      setShowMatchDialog(false)
      setSelectedPayoutId("")
      setSelectedContribution(null)
      fetchContributions()
    } catch (error) {
      console.error("Match error:", error)
      toast({
        title: "Error",
        description: "Failed to match contribution with payout",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApprove = async (contributionId: string) => {
    if (processedIds.has(contributionId) || processingId === contributionId) return

    setIsProcessing(true)
    setProcessingId(contributionId)

    try {
      const response = await fetch("/api/admin/p2p-contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contributionId, action: "approve" }),
      })

      const result = await response.json()

      if (result.success) {
        setProcessedIds((prev) => new Set(prev).add(contributionId))
        setShowScreenshotDialog(false)
        toast({
          title: "Contribution Approved",
          description: result.message,
        })
        setTimeout(() => fetchContributions(), 500)
      } else if (result.alreadyProcessed) {
        setProcessedIds((prev) => new Set(prev).add(contributionId))
        toast({ title: "Already Processed", description: result.error, variant: "destructive" })
        fetchContributions()
      } else {
        throw new Error(result.error || "Failed to approve")
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to approve contribution", variant: "destructive" })
    } finally {
      setIsProcessing(false)
      setProcessingId(null)
    }
  }

  const handleReject = async () => {
    if (!selectedContribution || !rejectReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a rejection reason",
        variant: "destructive",
      })
      return
    }

    // IMMEDIATE STATE LOCK - Prevent double clicks
    if (processedIds.has(selectedContribution.id)) {
      console.log("[v0] DUPLICATE REJECT BLOCKED - Already processed:", selectedContribution.id)
      return
    }

    setIsProcessing(true)

    try {
      const response = await fetch("/api/admin/p2p-contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contributionId: selectedContribution.id,
          action: "reject",
          reason: rejectReason,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setProcessedIds((prev) => new Set(prev).add(selectedContribution.id))
        toast({ title: "Contribution Rejected", description: result.message })
        setShowRejectDialog(false)
        setShowScreenshotDialog(false)
        setRejectReason("")
        setSelectedContribution(null)
        setTimeout(() => fetchContributions(), 500)
      } else if (result.alreadyProcessed) {
        setProcessedIds((prev) => new Set(prev).add(selectedContribution.id))
        toast({ title: "Already Processed", description: result.error, variant: "destructive" })
        setShowRejectDialog(false)
        fetchContributions()
      } else {
        throw new Error(result.error || "Failed to reject")
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to reject contribution", variant: "destructive" })
    } finally {
      setIsProcessing(false)
    }
  }

  const filterByAmountAndStatus = (amount: number) =>
    contributions.filter((c) => {
      if (c.amount !== amount) return false

      let matchesStatus = false
      if (statusFilter === "all") {
        matchesStatus = true
      } else if (statusFilter === "pending") {
        matchesStatus = c.status === "pending" || c.status === "request_pending"
      } else if (statusFilter === "proof_submitted") {
        matchesStatus = c.status === "proof_submitted"
      } else if (statusFilter === "in_process") {
        matchesStatus = c.status === "in_process"
      } else {
        matchesStatus = c.status === statusFilter
      }

      const matchesSearch =
        c.participant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.participant_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.transaction_id.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesStatus && matchesSearch
    })

  const contributions100 = filterByAmountAndStatus(100)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        )
      case "request_pending":
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Request Only
          </Badge>
        )
      case "in_process":
        return (
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
            <Users className="h-3 w-3 mr-1" />
            Matched - In Process
          </Badge>
        )
      case "proof_submitted":
        return (
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
            <ImageIcon className="h-3 w-3 mr-1" />
            Proof Submitted
          </Badge>
        )
      case "approved":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Pending</p>
                <p className="text-3xl font-bold text-white">{stats.pending}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-orange-500/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-400 mb-1">Proof Submitted</p>
                <p className="text-3xl font-bold text-orange-400">{stats.proof_submitted}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Approved Today</p>
                <p className="text-3xl font-bold text-green-400">{stats.approved_today}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Rejected Today</p>
                <p className="text-3xl font-bold text-red-400">{stats.rejected_today}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Platform Revenue</p>
                <p className="text-3xl font-bold text-purple-400">${stats.total_platform_revenue}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="pending">Pending Only</option>
          <option value="proof_submitted">Proof Submitted</option>
          <option value="in_process">Matched (In Process)</option>
          <option value="all">All Contributions</option>
        </select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, email, or TxID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-600 text-white"
          />
        </div>
      </div>

      {/* $100 Matching Pool Section */}
      {[
        { amount: 100, label: "$100 ↔ $100", accent: "border-green-500/50", badge: "bg-green-500/20 text-green-300", icon: "💚", list: contributions100 },
      ].map(({ amount, label, accent, badge, list }) => (
        <Card key={amount} className={`bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 border-l-4 ${accent}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-white text-lg">{label} Matching Pool</CardTitle>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge}`}>
                  {list.length} request{list.length !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-slate-400">Contributor sends ${amount} · Payout recipient gets ${amount}</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Contributor</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Transaction ID</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Screenshot</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Submitted</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((contribution) => (
                    <tr
                      key={contribution.id}
                      className={`border-b border-slate-700/50 hover:bg-slate-800/50 ${
                        contribution.status === "proof_submitted"
                          ? "bg-orange-950/20 border-l-2 border-l-orange-500"
                          : ""
                      }`}
                    >
                      <td className="py-4 px-4">
                        <p className="text-sm font-medium text-white">{contribution.participant_name}</p>
                        <p className="text-xs text-slate-400">{contribution.participant_email}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-slate-300 font-mono truncate max-w-[160px]">{contribution.transaction_id}</p>
                      </td>
                      <td className="py-4 px-4">
                        {contribution.screenshot_url ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedContribution(contribution)
                              setShowScreenshotDialog(true)
                            }}
                            className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            <ImageIcon className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-500">No screenshot</span>
                        )}
                      </td>
                      <td className="py-4 px-4">{getStatusBadge(contribution.status)}</td>
                      <td className="py-4 px-4">
                        <p className="text-xs text-slate-400">{new Date(contribution.created_at).toLocaleString()}</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {processedIds.has(contribution.id) || contribution.status === "approved" ? (
                            <Button size="sm" disabled className="bg-slate-600 text-slate-300 cursor-not-allowed">
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Confirmed
                            </Button>
                          ) : contribution.status === "rejected" ? (
                            <Button size="sm" disabled className="bg-slate-600 text-slate-300 cursor-not-allowed">
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejected
                            </Button>
                          ) : (
                            contribution.status === "pending" ||
                            contribution.status === "request_pending" ||
                            contribution.status === "in_process" ||
                            contribution.status === "proof_submitted"
                          ) ? (
                            <>
                              {(contribution.status === "pending" || contribution.status === "request_pending") && !contribution.matched_payout_id && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedContribution(contribution)
                                    fetchAvailablePayouts()
                                    setShowMatchDialog(true)
                                  }}
                                  disabled={isProcessing}
                                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                                >
                                  Match
                                </Button>
                              )}
                              {contribution.status === "proof_submitted" && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedContribution(contribution)
                                      setShowScreenshotDialog(true)
                                    }}
                                    className="bg-orange-600 hover:bg-orange-700 text-white text-xs"
                                  >
                                    <ImageIcon className="h-3.5 w-3.5 mr-1" />
                                    View Proof
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(contribution.id)}
                                    disabled={isProcessing || processingId === contribution.id || processedIds.has(contribution.id)}
                                    className="bg-green-600 hover:bg-green-700 text-white disabled:bg-slate-600 disabled:text-slate-300 text-xs"
                                  >
                                    {processingId === contribution.id ? "Processing..." : "Approve"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      setSelectedContribution(contribution)
                                      setShowRejectDialog(true)
                                    }}
                                    disabled={isProcessing || processedIds.has(contribution.id)}
                                    className="text-xs"
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              {contribution.status === "in_process" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedContribution(contribution)
                                    setShowRejectDialog(true)
                                  }}
                                  disabled={isProcessing || processedIds.has(contribution.id)}
                                  className="text-xs"
                                >
                                  Reject
                                </Button>
                              )}
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {list.length === 0 && (
                <div className="text-center py-10">
                  <Users className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No ${amount} contributions found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Reject Contribution</DialogTitle>
            <DialogDescription className="text-slate-400">
              Provide a reason for rejecting this contribution. The user will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason (e.g., Invalid transaction ID, fake screenshot, etc.)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="bg-slate-800 border-slate-600 text-white min-h-24"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false)
                setRejectReason("")
                setSelectedContribution(null)
              }}
              className="bg-transparent border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing || !rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? "Rejecting..." : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Screenshot / Proof Verification Dialog */}
      <Dialog open={showScreenshotDialog} onOpenChange={(open) => {
        setShowScreenshotDialog(open)
        if (!open) setSelectedContribution(null)
      }}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-orange-400" />
              Payment Proof Verification
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Review the submitted payment proof and approve or reject this contribution.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Contributor + amount summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-400 mb-0.5">Contributor</p>
                <p className="text-white font-semibold text-sm">{selectedContribution?.participant_name}</p>
                <p className="text-slate-400 text-xs">{selectedContribution?.participant_email}</p>
              </div>
              <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-400 mb-0.5">Amount</p>
                <p className="text-green-400 font-bold text-xl">${selectedContribution?.amount}</p>
                <p className="text-xs text-slate-500 mt-0.5 font-mono truncate">
                  TxID: {selectedContribution?.transaction_id || "N/A"}
                </p>
              </div>
            </div>

            {/* Screenshot */}
            {selectedContribution?.screenshot_url ? (
              <div className="rounded-lg overflow-hidden border-2 border-orange-500/40">
                <div className="bg-orange-500/10 px-3 py-2 flex items-center justify-between border-b border-orange-500/30">
                  <span className="text-xs text-orange-400 font-medium">Payment Screenshot</span>
                  <a
                    href={selectedContribution.screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open full size
                  </a>
                </div>
                <img
                  src={selectedContribution.screenshot_url}
                  alt="Payment proof screenshot"
                  className="w-full h-auto max-h-80 object-contain bg-slate-950"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-slate-500 text-sm">No screenshot uploaded</p>
              </div>
            )}
          </div>

          {/* Inline Approve / Reject — only for proof_submitted */}
          {selectedContribution?.status === "proof_submitted" && (
            <DialogFooter className="mt-4 gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowScreenshotDialog(false)
                  setSelectedContribution(null)
                }}
                className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800"
                disabled={isProcessing}
              >
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setShowScreenshotDialog(false)
                  setShowRejectDialog(true)
                }}
                disabled={isProcessing || (selectedContribution ? processedIds.has(selectedContribution.id) : false)}
                className="bg-red-600 hover:bg-red-700"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Reject
              </Button>
              <Button
                onClick={() => selectedContribution && handleApprove(selectedContribution.id)}
                disabled={
                  isProcessing ||
                  processingId === selectedContribution?.id ||
                  (selectedContribution ? processedIds.has(selectedContribution.id) : false)
                }
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                {processingId === selectedContribution?.id ? "Approving..." : "Approve"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Match with Payout Dialog */}
      <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-white">Match Contribution with Payout Request</DialogTitle>
            <DialogDescription className="text-slate-400">
              Select a payout request to match with this contribution
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Current Contribution Info */}
            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <p className="text-sm text-slate-400 mb-2">Contributor</p>
              <p className="text-white font-semibold">{selectedContribution?.participant_name}</p>
              <p className="text-slate-400 text-sm">{selectedContribution?.participant_email}</p>
              <p className="text-green-400 font-bold mt-2">${selectedContribution?.amount}</p>
            </div>

            {/* Available Payouts */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <p className="text-sm text-slate-300 font-medium">Available Payout Requests:</p>
              {availablePayouts.length === 0 ? (
                <p className="text-slate-500 text-sm py-4 text-center">No unmatched payout requests available</p>
              ) : (
                availablePayouts.map((payout) => (
                  <div
                    key={payout.id}
                    onClick={() => setSelectedPayoutId(payout.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedPayoutId === payout.id
                        ? "bg-purple-900/30 border-purple-500"
                        : "bg-slate-800 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-white font-semibold">{payout.participants?.full_name}</p>
                        <p className="text-slate-400 text-sm">{payout.participants?.email}</p>
                        <p className="text-slate-400 text-xs mt-1">Mobile: {payout.participants?.mobile_number || "N/A"}</p>
                        <p className="text-slate-400 text-xs">
                          Wallet: {
                            (payout.participants?.bep20_address || payout.participants?.wallet_address)
                              ? `${(payout.participants.bep20_address || payout.participants.wallet_address).substring(0, 16)}...`
                              : "N/A"
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-400">${payout.amount}</p>
                        <p className="text-xs text-slate-500 mt-1">Serial: {payout.serial_number || "N/A"}</p>
                        <Badge className="mt-2 bg-amber-500/20 text-amber-400">
                          {payout.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowMatchDialog(false)
                setSelectedPayoutId("")
              }}
              disabled={isProcessing}
              className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMatchWithPayout}
              disabled={isProcessing || !selectedPayoutId}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isProcessing ? "Matching..." : "Confirm Match"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
