"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  DollarSign,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Search,
  TrendingUp,
  Hash,
  Users,
  Eye,
  FileCheck,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface PayoutRequest {
  id: number
  serial_number: string
  participant_name: string
  participant_email: string
  participant_username?: string
  amount: number
  wallet_address: string
  status: string
  created_at: string
  processed_at?: string
  transaction_hash?: string
  admin_notes?: string
  wallet_balance_before: number
  wallet_balance_after: number
  priority?: string
  sequence_number?: number
  request_year?: number
  rejection_reason?: string
  attempts?: number
}

export function PayoutManagement() {
  const { toast } = useToast()
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [actionType, setActionType] = useState<"process" | "approve" | "confirm" | "reject" | "redirect">("process")
  const [transactionHash, setTransactionHash] = useState("")
  const [adminNotes, setAdminNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [allParticipants, setAllParticipants] = useState<any[]>([])
  const [selectedParticipantEmail, setSelectedParticipantEmail] = useState("")
  const [redirectTargetSerial, setRedirectTargetSerial] = useState("")
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [redirectTargetUser, setRedirectTargetUser] = useState<string>("")
  const [showProofDialog, setShowProofDialog] = useState(false)
  const [proofData, setProofData] = useState<{ screenshot_url: string; transaction_id: string; id: string; amount: number } | null>(null)
  const [loadingProof, setLoadingProof] = useState(false)
  const [approvingPayout, setApprovingPayout] = useState(false)

  useEffect(() => {
    fetchPayoutRequests()
    
    const supabase = createClient()
    const channel = supabase
      .channel("payout_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "payout_requests" }, () => {
        fetchPayoutRequests()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchPayoutRequests = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("payout_requests")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setPayoutRequests(data || [])
    } catch (error) {
      console.error("Error fetching payout requests:", error)
      toast({
        title: "Error",
        description: "Failed to fetch payout requests",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch the contribution proof for a payout creator and open the dialog
  const handleViewProof = async (payout: PayoutRequest) => {
    setSelectedPayout(payout)
    setLoadingProof(true)
    setShowProofDialog(true)
    setProofData(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("payment_submissions")
        .select("id, screenshot_url, transaction_id, amount")
        .eq("participant_email", payout.participant_email)
        .in("status", ["pending", "request_pending", "in_process"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (!error && data) {
        setProofData(data)
      } else {
        setProofData(null)
      }
    } catch {
      setProofData(null)
    } finally {
      setLoadingProof(false)
    }
  }

  // Approve contribution + complete payout atomically
  const handleApproveContributionAndPayout = async () => {
    if (!selectedPayout || !proofData) return
    setApprovingPayout(true)
    try {
      const response = await fetch("/api/admin/approve-contribution-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentSubmissionId: proofData.id,
          payoutRequestId: selectedPayout.id,
          participantEmail: selectedPayout.participant_email,
        }),
      })
      const result = await response.json()
      if (result.success) {
        toast({
          title: "Approved Successfully",
          description: `Contribution approved — $150 credited. Payout #${selectedPayout.serial_number} marked as completed.`,
        })
        setShowProofDialog(false)
        setProofData(null)
        fetchPayoutRequests()
      } else {
        throw new Error(result.error || "Approval failed")
      }
    } catch (err: unknown) {
      const e = err as Error
      toast({ title: "Approval Failed", description: e.message, variant: "destructive" })
    } finally {
      setApprovingPayout(false)
    }
  }

  const filteredRequests = payoutRequests.filter((req) => {
    const matchesSearch =
      req.participant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.participant_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.participant_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.wallet_address?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const stats = {
    pending: payoutRequests.filter((r) => r.status === "pending").length,
    processing: payoutRequests.filter((r) => r.status === "processing").length,
    approved: payoutRequests.filter((r) => r.status === "approved").length,
    totalPending: payoutRequests
      .filter((r) => r.status === "pending" || r.status === "processing" || r.status === "approved")
      .reduce((sum, r) => sum + Number(r.amount), 0),
  }

  const handleAction = async () => {
    if (!selectedPayout) return
    
    // Validate redirect action requires serial number input
    if (actionType === "redirect" && !redirectTargetSerial) {
      toast({
        title: "Validation Error",
        description: "Please enter a target serial number for redirection",
        variant: "destructive",
      })
      return
    }
    
    setIsProcessing(true)
    try {
      let newStatus = selectedPayout.status

      // Determine the new status based on action type
      switch (actionType) {
        case "process":
          newStatus = "processing"
          break
        case "approve":
          newStatus = "approved"
          break
        case "confirm":
          newStatus = "completed"
          break
        case "reject":
          newStatus = "rejected"
          break
        case "redirect":
          newStatus = "redirected"
          break
      }

      const response = await fetch("/api/admin/update-payout-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payoutId: selectedPayout.id,
          status: newStatus,
          transactionHash: transactionHash || undefined,
          adminNotes: adminNotes || undefined,
          redirectToSerial: actionType === "redirect" ? redirectTargetSerial : undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: data.message,
        })
        
        // If approved, show success animation and prepare redirect
        if (actionType === "approve") {
          toast({
            title: "✓ Payout Approved!",
            description: "Redirecting to matched participant's contribution page...",
            duration: 3000,
          })
          
          // Wait for animation, then redirect with payout creator details
          setTimeout(() => {
            const contributionUrl = `/admin/contribution-view?email=${encodeURIComponent(selectedPayout.participant_email)}&payoutId=${selectedPayout.id}&payoutSerial=${encodeURIComponent(selectedPayout.serial_number || '')}&payoutName=${encodeURIComponent(selectedPayout.participant_name)}&payoutAmount=${selectedPayout.amount}`
            window.open(contributionUrl, '_blank')
          }, 1500)
        }
        
        // Refresh the list
        await fetchPayoutRequests()
        
        // Reset dialog
        setShowActionDialog(false)
        setSelectedPayout(null)
        setTransactionHash("")
        setAdminNotes("")
        setSelectedParticipantEmail("")
        setRedirectTargetSerial("")
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("[v0] Error updating payout status:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update payout status",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const fetchAllParticipants = async () => {
    setLoadingParticipants(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("participants")
        .select("email, username, account_balance, serial_number")
        .order("serial_number", { ascending: false })

      if (error) throw error
      
      console.log("[v0] Fetched participants for redirect:", data?.length || 0)
      setAllParticipants(data || [])
    } catch (error) {
      console.error("[v0] Error fetching participants:", error)
      toast({
        title: "Error",
        description: "Failed to fetch participants list",
        variant: "destructive",
      })
    } finally {
      setLoadingParticipants(false)
    }
  }

  const openActionDialog = (payout: PayoutRequest, action: "process" | "approve" | "confirm" | "reject" | "redirect") => {
    setSelectedPayout(payout)
    setActionType(action)
    setTransactionHash(payout.transaction_hash || "")
    setAdminNotes(payout.admin_notes || "")
    setRedirectTargetUser("")
    setShowActionDialog(true)
    
    // If redirect action, fetch all participants
    if (action === "redirect") {
      fetchAllParticipants()
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-500/20 text-amber-600 border border-amber-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      case "processing":
        return (
          <Badge className="bg-cyan-500/20 text-cyan-600 border border-cyan-500/30">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        )
      case "approved":
        return (
          <Badge className="bg-blue-500/20 text-blue-600 border border-blue-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        )
      case "completed":
        return (
          <Badge className="bg-green-500/20 text-green-600 border border-green-500/30">
            <TrendingUp className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-red-500/20 text-red-600 border border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        )
      case "redirected":
        return (
          <Badge className="bg-purple-500/20 text-purple-600 border border-purple-500/30">
            <TrendingUp className="h-3 w-3 mr-1" />
            Redirected
          </Badge>
        )
      default:
        return null
    }
  }

  const getActionButtons = (payout: PayoutRequest) => {
    // "View Proof & Approve" button shown for pending and processing payouts
    const viewProofBtn = (
      <Button
        size="sm"
        className="bg-amber-600 hover:bg-amber-700 text-white"
        onClick={() => handleViewProof(payout)}
      >
        <FileCheck className="h-4 w-4 mr-1" />
        View Proof
      </Button>
    )

    switch (payout.status) {
      case "pending":
        return (
          <>
            {viewProofBtn}
            <Button
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
              onClick={() => openActionDialog(payout, "process")}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Process
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => openActionDialog(payout, "approve")}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => openActionDialog(payout, "confirm")}
            >
              <Send className="h-4 w-4 mr-1" />
              Complete
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white"
              onClick={() => openActionDialog(payout, "redirect")}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Redirect
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-50 bg-transparent"
              onClick={() => openActionDialog(payout, "reject")}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </>
        )
      case "processing":
        return (
          <>
            {viewProofBtn}
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => openActionDialog(payout, "approve")}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-50 bg-transparent"
              onClick={() => openActionDialog(payout, "reject")}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </>
        )
      case "approved":
        return (
          <>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => openActionDialog(payout, "confirm")}
            >
              <Send className="h-4 w-4 mr-1" />
              Confirm Sent
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-50 bg-transparent"
              onClick={() => openActionDialog(payout, "reject")}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </>
        )
      case "redirected":
        return (
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => openActionDialog(payout, "confirm")}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Complete
          </Button>
        )
      default:
        return (
          <Badge variant="secondary" className="bg-slate-100 text-slate-600">
            No Actions
          </Badge>
        )
    }
  }

  const getDialogContent = () => {
    switch (actionType) {
      case "process":
        return {
          title: "Process Payout Request",
          description: "Move this payout request to processing status",
          color: "cyan",
        }
      case "approve":
        return {
          title: "Approve Payout Request",
          description: "Approve this payout request for sending",
          color: "blue",
        }
      case "confirm":
        return {
          title: "Confirm Payout Sent",
          description: "Mark this payout as completed and credit the user's earnings",
          color: "green",
        }
      case "reject":
        return {
          title: "Reject Payout Request",
          description: "Reject this payout and refund the amount to user's wallet",
          color: "red",
        }
      case "redirect":
        return {
          title: "Redirect Payout Address",
          description: "Use this payout address for new user contributions",
          color: "purple",
        }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  const dialogContent = getDialogContent()

  return (
    <>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Processing</p>
                  <p className="text-2xl font-bold text-cyan-600">{stats.processing}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 text-cyan-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Approved</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.approved}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Pending</p>
                  <p className="text-2xl font-bold text-purple-600">${stats.totalPending.toFixed(2)}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payout Requests Table */}
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-900">Pending Payouts</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by serial #, name, email, address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-80 bg-gradient-to-r from-white to-orange-50/30 border-orange-200 focus:border-orange-400"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchPayoutRequests}
                  className="bg-transparent"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-orange-50 to-rose-50">
                  <TableHead className="font-semibold text-orange-600">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Serial #
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-purple-600">User</TableHead>
                  <TableHead className="font-semibold text-emerald-600">Amount</TableHead>
                  <TableHead className="font-semibold text-cyan-600">Wallet Address</TableHead>
                  <TableHead className="font-semibold text-blue-600">Status</TableHead>
                  <TableHead className="font-semibold text-slate-600">Requested</TableHead>
                  <TableHead className="text-right font-semibold text-rose-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                      No payout requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id} className="hover:bg-gradient-to-r hover:from-orange-50/30 hover:to-rose-50/30 transition-colors">
                      <TableCell>
                        <Badge className="bg-gradient-to-r from-orange-500 to-rose-500 text-white font-mono font-bold text-xs px-3 py-1.5">
                          {request.serial_number || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{request.participant_name}</p>
                          <p className="text-xs text-slate-500">{request.participant_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-900 font-semibold">
                        ${Number(request.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                          {request.wallet_address.slice(0, 8)}...{request.wallet_address.slice(-6)}
                        </code>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {new Date(request.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">{getActionButtons(request)}</div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogContent.title}</DialogTitle>
            <DialogDescription>{dialogContent.description}</DialogDescription>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600 text-sm">Recipient</span>
                  <span className="text-slate-900 font-medium">{selectedPayout.participant_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 text-sm">Amount</span>
                  <span className="text-green-600 font-bold text-lg">${Number(selectedPayout.amount).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-600 text-xs">Wallet Address</span>
                  <code className="block text-xs text-purple-600 mt-1 break-all bg-purple-50 p-2 rounded">
                    {selectedPayout.wallet_address}
                  </code>
                </div>
              </div>

              {/* Transaction Hash Input (only for Confirm Sent) */}
              {actionType === "confirm" && (
                <div className="space-y-2">
                  <Label htmlFor="txHash" className="text-sm font-semibold text-slate-700">
                    <Hash className="h-4 w-4 inline mr-1" />
                    Transaction Hash
                  </Label>
                  <Input
                    id="txHash"
                    placeholder="0x..."
                    value={transactionHash}
                    onChange={(e) => setTransactionHash(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500">
                    Enter the blockchain transaction hash as proof of payment
                  </p>
                </div>
              )}

              {/* Redirect Info (only for redirect action) */}
              {actionType === "redirect" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                      <h4 className="font-semibold text-purple-900">Pre-Assign Payout to User</h4>
                    </div>
                    <p className="text-sm text-purple-700">
                      Choose from existing users or enter a future serial number. The selected user will see this payout address on their contribution page.
                    </p>
                  </div>

                  {/* Existing Users Dropdown */}
                  <div className="space-y-2">
                    <Label htmlFor="existingUser" className="text-sm font-semibold text-slate-700">
                      <Users className="h-4 w-4 inline mr-1" />
                      Select Existing User
                    </Label>
                    {loadingParticipants ? (
                      <div className="p-3 text-center text-sm text-slate-500">
                        <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
                        Loading users...
                      </div>
                    ) : (
                      <select
                        id="existingUser"
                        value={selectedParticipantEmail}
                        onChange={(e) => {
                          setSelectedParticipantEmail(e.target.value)
                          const selectedUser = allParticipants.find(p => p.email === e.target.value)
                          if (selectedUser) {
                            setRedirectTargetSerial(selectedUser.serial_number)
                          }
                        }}
                        className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">-- Choose from existing users --</option>
                        {allParticipants.map((participant) => (
                          <option key={participant.email} value={participant.email}>
                            {participant.serial_number} - {participant.username} - Balance: ${participant.account_balance}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-300" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-slate-500">Or enter serial number manually</span>
                    </div>
                  </div>

                  {/* Serial Number Input */}
                  <div className="space-y-2">
                    <Label htmlFor="targetSerial" className="text-sm font-semibold text-slate-700">
                      <Hash className="h-4 w-4 inline mr-1" />
                      Target User Serial Number
                    </Label>
                    <Input
                      id="targetSerial"
                      value={redirectTargetSerial}
                      onChange={(e) => {
                        setRedirectTargetSerial(e.target.value)
                        setSelectedParticipantEmail("")
                      }}
                      placeholder="e.g., FLCN5050 or FLCN5100 (can be future user)"
                      className="w-full font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500">
                      💡 You can enter a serial number that doesn't exist yet. When a new user signs up with this serial number and clicks contribute, they'll see wallet address {selectedPayout.wallet_address.slice(0, 10)}...
                    </p>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded bg-gradient-to-r from-purple-100 to-violet-100 border border-purple-200">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-900">
                      User {redirectTargetSerial || "[Serial #]"} will fund this ${Number(selectedPayout.amount).toFixed(2)} payout
                    </span>
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-semibold text-slate-700">
                  Admin Notes {actionType === "reject" && "(Required for Rejection)"}
                </Label>
                <Textarea
                  id="notes"
                  placeholder={actionType === "reject" ? "Reason for rejection..." : actionType === "redirect" ? "Reason for redirecting to new user..." : "Optional notes..."}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
              </div>

              {actionType !== "reject" && actionType !== "redirect" && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700">This action will update the user's tracker in real-time</span>
                </div>
              )}

              {actionType === "reject" && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-700">
                    The amount will be refunded to user's wallet
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowActionDialog(false)}
              disabled={isProcessing}
              className="bg-transparent"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={isProcessing || (actionType === "reject" && !adminNotes)}
              className={`text-white ${
                actionType === "reject"
                  ? "bg-red-600 hover:bg-red-700"
                  : actionType === "confirm"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {actionType === "process" && "Process"}
                  {actionType === "approve" && "Approve"}
                  {actionType === "confirm" && "Confirm Sent"}
                  {actionType === "reject" && "Reject"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Proof & Approve Contribution Dialog */}
      <Dialog open={showProofDialog} onOpenChange={(open) => { if (!open) { setShowProofDialog(false); setProofData(null) } }}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <FileCheck className="h-5 w-5 text-amber-600" />
              Contribution Proof — Payout #{selectedPayout?.serial_number}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Review the payment proof submitted by <strong>{selectedPayout?.participant_name || selectedPayout?.participant_email}</strong> and approve to credit $150 + complete this payout.
            </DialogDescription>
          </DialogHeader>

          {loadingProof ? (
            <div className="flex items-center justify-center py-10 gap-3 text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading proof...</span>
            </div>
          ) : proofData ? (
            <div className="space-y-4">
              {/* Payout info */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm">
                <div>
                  <p className="text-slate-500">Payout Amount</p>
                  <p className="font-bold text-slate-900">${selectedPayout?.amount}</p>
                </div>
                <div>
                  <p className="text-slate-500">Wallet</p>
                  <p className="font-mono text-xs text-slate-700 break-all">{selectedPayout?.wallet_address || "—"}</p>
                </div>
              </div>

              {/* Transaction ID */}
              {proofData.transaction_id && proofData.transaction_id !== "CONTRIBUTION_REQUEST" && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Transaction Hash / ID</p>
                  <p className="font-mono text-xs text-slate-900 break-all">{proofData.transaction_id}</p>
                </div>
              )}

              {/* Screenshot */}
              {proofData.screenshot_url ? (
                <div className="rounded-lg overflow-hidden border border-slate-200">
                  <p className="text-xs text-slate-500 px-3 pt-2 pb-1">Payment Screenshot</p>
                  <img
                    src={proofData.screenshot_url}
                    alt="Payment proof"
                    className="w-full max-h-64 object-contain bg-slate-100"
                    onError={(e) => { e.currentTarget.src = "/placeholder.svg" }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  No screenshot uploaded yet. You can still approve the contribution.
                </div>
              )}

              {/* Contribution amount */}
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm">
                <p className="text-green-700 font-medium">On approval:</p>
                <ul className="text-green-600 text-xs mt-1 space-y-1 ml-3 list-disc">
                  <li>Contribution marked as <strong>approved</strong></li>
                  <li><strong>$150</strong> credited to participant wallet</li>
                  <li>Payout #{selectedPayout?.serial_number} marked as <strong>completed</strong></li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-8 justify-center text-slate-400">
              <Eye className="h-5 w-5" />
              <span>No pending contribution proof found for this participant.</span>
            </div>
          )}

          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => { setShowProofDialog(false); setProofData(null) }}
              disabled={approvingPayout}
              className="border-slate-300"
            >
              Close
            </Button>
            {proofData && (
              <Button
                onClick={handleApproveContributionAndPayout}
                disabled={approvingPayout}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {approvingPayout ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Approving...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-2" />Approve & Complete Payout</>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
