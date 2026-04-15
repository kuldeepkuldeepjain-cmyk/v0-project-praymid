"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckCircle2, XCircle, Clock, Search, Eye, DollarSign, Wallet, CreditCard, ArrowRight, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface Participant {
  id: string
  username: string
  full_name: string
  email: string
  wallet_address: string
}

interface ActivationPayment {
  id: string
  email: string
  username: string
  wallet: string
  amount: number
  paymentMethod: "crypto" | "bank"
  screenshotUrl: string
  transactionHash?: string
  submittedAt: string
  status: "pending" | "approved" | "rejected"
}

interface Stats {
  pending: number
  approved_today: number
  rejected_today: number
  total_collected: number
}

export function ActivationPaymentsPanel() {
  const { toast } = useToast()
  const [payments, setPayments] = useState<ActivationPayment[]>([])
  const [stats, setStats] = useState<Stats>({ pending: 0, approved_today: 0, rejected_today: 0, total_collected: 0 })
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPayment, setSelectedPayment] = useState<ActivationPayment | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showRedirectDialog, setShowRedirectDialog] = useState(false)
  const [showTrackerDialog, setShowTrackerDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [selectedTargetUser, setSelectedTargetUser] = useState<string>("")
  const [trackerStatus, setTrackerStatus] = useState<string>("pending")

  useEffect(() => {
    fetchPayments()
    fetchParticipants()
  }, [])

  const fetchParticipants = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("participants")
        .select("id, username, full_name, email, wallet_address")
        .order("created_at", { ascending: false })
      
      if (!error && data) {
        setParticipants(data as any)
      }
    } catch (error) {
      console.error("Error fetching participants:", error)
    }
  }

  const fetchPayments = async () => {
    try {
      const response = await fetch("/api/admin/activation-payments")
      const data = await response.json()
      if (data.success) {
        setPayments(data.payments)
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Failed to fetch activation payments:", error)
    }
  }

  const handleAction = async (paymentId: string, action: "approve" | "reject", reason?: string) => {
    // Prevent duplicate clicks
    if (processingPaymentId === paymentId) {
      return
    }
    
    setIsProcessing(true)
    setProcessingPaymentId(paymentId)
    try {
      const response = await fetch("/api/admin/activation-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, action, reason }),
      })
      const data = await response.json()
      if (data.success) {
        toast({
          title: action === "approve" ? "Payment Approved" : "Payment Rejected",
          description: action === "approve"
            ? "User account credited with $180"
            : data.message,
        })
        
        // Update local state immediately for better UX
        if (action === "approve") {
          // Keep approved payments visible with confirmed badge
          setPayments((prev) => prev.map((p) => 
            p.id === paymentId 
              ? { ...p, status: "approved" as const }
              : p
          ))
          // Update stats - decrement pending, increment approved_today
          setStats((prev) => ({
            ...prev,
            pending: Math.max(0, prev.pending - 1),
            approved_today: prev.approved_today + 1,
          }))
        } else {
          // Remove rejected payments from view
          setPayments((prev) => prev.filter((p) => p.id !== paymentId))
          // Update stats - decrement pending, increment rejected_today
          setStats((prev) => ({
            ...prev,
            pending: Math.max(0, prev.pending - 1),
            rejected_today: prev.rejected_today + 1,
          }))
        }
        
        setSelectedPayment(null)
        setShowRejectDialog(false)
        setRejectReason("")
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to process payment", variant: "destructive" })
    } finally {
      setIsProcessing(false)
      setProcessingPaymentId(null)
    }
  }

  const handleUpdatePayoutTracker = async (payment: ActivationPayment, newStatus: string, targetUserId?: string) => {
    setIsProcessing(true)
    try {
      const supabase = createClient()
      
      // Update the payment submission with new tracker status
      const { error: updateError } = await supabase
        .from("payment_submissions")
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", payment.id)

      if (updateError) throw updateError

      // If redirecting to specific user, update their wallet address in wallet_pool
      if (targetUserId && newStatus === "redirected") {
        const targetUser = participants.find(p => p.id === targetUserId)
        if (targetUser) {
          // Add to wallet pool as contribution address
          await supabase.from("wallet_pool").upsert({
            participant_id: targetUserId,
            participant_email: targetUser.email,
            participant_username: targetUser.username,
            bep20_address: payment.wallet,
            is_active: true,
            contribution_amount: payment.amount,
          }, { onConflict: "participant_id" })

          // Create notification
          await supabase.from("notifications").insert({
            user_email: targetUser.email,
            type: "success",
            title: "Contribution Address Assigned",
            message: `A new contribution address has been assigned to you: ${payment.wallet}`,
            read_status: false,
          })
        }
      }

      toast({
        title: "Payout Tracker Updated",
        description: `Payment status changed to ${newStatus}`,
      })

      setShowTrackerDialog(false)
      setSelectedPayment(null)
      setSelectedTargetUser("")
      fetchPayments()
    } catch (error) {
      console.error("[v0] Error updating tracker:", error)
      toast({
        title: "Error",
        description: "Failed to update payout tracker",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRedirectToNewUser = async (payment: ActivationPayment) => {
    setIsProcessing(true)
    try {
      console.log("[v0] Redirecting activation payment to next participant:", payment.id)
      
      const response = await fetch("/api/admin/redirect-activation-to-new-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: payment.id,
          amount: payment.amount,
          email: payment.email,
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Activation Payment Redirected",
          description: `$${payment.amount} redirected to ${data.recipientName} for contributions`,
        })
        setPayments((prev) => prev.filter((p) => p.id !== payment.id))
        setSelectedPayment(null)
        setShowRedirectDialog(false)
        fetchPayments()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error("[v0] Error redirecting payment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to redirect payment",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const filteredPayments = payments.filter(
    (p) => {
      // Hide rejected payments
      if (p.status === "rejected") return false
      
      // Apply search filter
      return (
        p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.wallet.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
  )

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60)
    if (diff < 60) return `${diff}m ago`
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
    return `${Math.floor(diff / 1440)}d ago`
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-[#1e1b4b] to-[#2e1065] border-[#7c3aed]/30">
          <CardContent className="p-2.5 sm:p-3 md:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg bg-[#f59e0b]/20 flex items-center justify-center">
                <Clock className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-[#f59e0b]" />
              </div>
              <div>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-white">{stats.pending}</p>
                <p className="text-xs sm:text-sm text-[#9ca3af]">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1e1b4b] to-[#2e1065] border-[#7c3aed]/30">
          <CardContent className="p-2.5 sm:p-3 md:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg bg-[#10b981]/20 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-[#10b981]" />
              </div>
              <div>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-white">{stats.approved_today}</p>
                <p className="text-xs sm:text-sm text-[#9ca3af]">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1e1b4b] to-[#2e1065] border-[#7c3aed]/30">
          <CardContent className="p-2.5 sm:p-3 md:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg bg-[#ef4444]/20 flex items-center justify-center">
                <XCircle className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-[#ef4444]" />
              </div>
              <div>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-white">{stats.rejected_today}</p>
                <p className="text-xs sm:text-sm text-[#9ca3af]">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1e1b4b] to-[#2e1065] border-[#7c3aed]/30">
          <CardContent className="p-2.5 sm:p-3 md:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg bg-[#22d3ee]/20 flex items-center justify-center">
                <DollarSign className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-[#22d3ee]" />
              </div>
              <div>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-white">${stats.total_collected}</p>
                <p className="text-xs sm:text-sm text-[#9ca3af]">Collected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments List */}
      <Card className="bg-[#1f2937] border-[#374151]">
        <CardHeader className="border-b border-[#374151] p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <CardTitle className="text-white text-base sm:text-lg md:text-xl">Activation Payments</CardTitle>
              <CardDescription className="text-[#9ca3af] text-xs sm:text-sm">Review and approve activation fees</CardDescription>
            </div>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#6b7280]" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 sm:pl-9 w-full sm:w-48 md:w-64 h-8 sm:h-9 md:h-10 text-xs sm:text-sm bg-[#111827] border-[#374151] text-white"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPayments.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-[#10b981] mx-auto mb-4" />
              <p className="text-lg font-medium text-white">All caught up!</p>
              <p className="text-sm text-[#9ca3af]">No pending activation payments</p>
            </div>
          ) : (
            <div className="divide-y divide-[#374151]">
              {filteredPayments.map((payment) => (
                <div key={payment.id} className="p-4 hover:bg-[#374151]/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#22d3ee] flex items-center justify-center text-white font-bold">
                        {payment.username[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-white">
                            @{payment.username}
                          </p>
                          {payment.status === "request_pending" && (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                              <Clock className="h-3 w-3 mr-1" />
                              Contribution Request
                            </Badge>
                          )}
                          {payment.status === "approved" && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Confirmed
                            </Badge>
                          )}
                          {payment.status === "rejected" && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                              <XCircle className="h-3 w-3 mr-1" />
                              Rejected
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={
                              payment.paymentMethod === "crypto"
                                ? "bg-[#7c3aed]/10 text-[#7c3aed] border-[#7c3aed]/30"
                                : "bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/30"
                            }
                          >
                            {payment.paymentMethod === "crypto" ? (
                              <Wallet className="h-3 w-3 mr-1" />
                            ) : (
                              <CreditCard className="h-3 w-3 mr-1" />
                            )}
                            {payment.paymentMethod}
                          </Badge>
                        </div>
                        <p className="text-sm text-[#9ca3af]">{payment.email}</p>
                        <p className="text-xs text-[#6b7280] font-mono">{payment.wallet}</p>
                        {payment.transactionHash && (
                          <p className="text-xs text-[#6b7280] font-mono">
                            Transaction Hash: {payment.transactionHash}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-[#22d3ee]">${payment.amount}</p>
                        <p className="text-xs text-[#6b7280]">{formatTime(payment.submittedAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {(payment.status === "pending" || payment.status === "request_pending") ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleAction(payment.id, "approve")}
                              disabled={isProcessing || processingPaymentId === payment.id}
                              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processingPaymentId === payment.id ? (
                                <><span className="animate-spin mr-1">⏳</span> Processing</>
                              ) : (
                                <><CheckCircle2 className="h-4 w-4 mr-1" /> Confirm</>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedPayment(payment)
                                setShowRejectDialog(true)
                              }}
                              disabled={isProcessing || processingPaymentId === payment.id}
                              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        ) : (
                          <Badge variant="outline" className="bg-slate-700/50 text-slate-400 border-slate-600">
                            Processed
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPayment(payment)}
                          className="border-[#374151] text-[#9ca3af] hover:bg-[#374151] bg-transparent"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Screenshot Dialog */}
      <Dialog open={!!selectedPayment && !showRejectDialog} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent className="bg-[#1f2937] border-[#374151] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Payment Screenshot</DialogTitle>
            <DialogDescription className="text-[#9ca3af]">
              Review the payment proof from @{selectedPayment?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <img
              src={selectedPayment?.screenshotUrl || "/placeholder.svg"}
              alt="Payment Screenshot"
              className="w-full rounded-lg border border-[#374151]"
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg"
              }}
            />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[#6b7280]">Amount</p>
                <p className="text-white font-medium">${selectedPayment?.amount}</p>
              </div>
              <div>
                <p className="text-[#6b7280]">Method</p>
                <p className="text-white font-medium capitalize">{selectedPayment?.paymentMethod}</p>
              </div>
              {selectedPayment?.transactionHash && (
                <div className="col-span-2">
                  <p className="text-[#6b7280] mb-1">Transaction Hash</p>
                  <p className="text-white font-mono text-xs break-all bg-[#111827] p-2 rounded border border-[#374151]">
                    {selectedPayment.transactionHash}
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setSelectedPayment(null)}
              className="border-[#374151] bg-transparent text-white"
              disabled={isProcessing}
            >
              Close
            </Button>
            {selectedPayment?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowRejectDialog(true)
                  }}
                  disabled={isProcessing}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    handleAction(selectedPayment.id, "approve")
                    setSelectedPayment(null)
                  }}
                  disabled={isProcessing || processingPaymentId === selectedPayment?.id}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {processingPaymentId === selectedPayment?.id ? "Approving..." : "Approve & Credit $180"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redirect Dialog */}
      <Dialog open={showRedirectDialog} onOpenChange={setShowRedirectDialog}>
        <DialogContent className="bg-gradient-to-br from-[#1f2937] via-purple-900/20 to-[#1f2937] border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-400" />
              Redirect to New Participant
            </DialogTitle>
            <DialogDescription className="text-[#9ca3af]">
              This activation payment will be redirected to fund the next new participant's contribution
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-purple-500/30 bg-slate-600">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-purple-300 font-medium">Current User</p>
                    <p className="text-white">@{selectedPayment.username}</p>
                  </div>
                  <div>
                    <p className="text-purple-300 font-medium">Amount</p>
                    <p className="text-white font-bold">${selectedPayment.amount}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/20 to-violet-500/20 border border-purple-400/30 bg-slate-900">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <p className="text-sm font-semibold text-white">What will happen:</p>
                </div>
                <ul className="text-sm text-[#9ca3af] space-y-1 ml-6 list-disc">
                  <li>Payment will be marked as "redirected"</li>
                  <li>${selectedPayment.amount} will be credited to next new user</li>
                  <li>New user will see this as available contribution funds</li>
                  <li>Transaction will be logged in audit trail</li>
                </ul>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRedirectDialog(false)} 
              className="border-[#374151] bg-transparent"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedPayment && handleRedirectToNewUser(selectedPayment)}
              disabled={isProcessing}
              className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white"
            >
              {isProcessing ? "Redirecting..." : "Confirm Redirect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payout Tracker Dialog */}
      <Dialog open={showTrackerDialog} onOpenChange={setShowTrackerDialog}>
        <DialogContent className="bg-gradient-to-br from-[#1f2937] via-cyan-900/20 to-[#1f2937] border-cyan-500/30 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-cyan-400" />
              Change Payout Tracker
            </DialogTitle>
            <DialogDescription className="text-[#9ca3af]">
              Update the payout tracker status and optionally redirect wallet to another user
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              {/* Current Payment Info */}
              <div className="p-4 rounded-lg border border-cyan-500/30 bg-slate-700">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-cyan-300 font-medium">User</p>
                    <p className="text-white">@{selectedPayment.username}</p>
                  </div>
                  <div>
                    <p className="text-cyan-300 font-medium">Amount</p>
                    <p className="text-white font-bold">${selectedPayment.amount}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-cyan-300 font-medium">Wallet Address</p>
                    <p className="text-white font-mono text-xs break-all">{selectedPayment.wallet}</p>
                  </div>
                </div>
              </div>

              {/* Tracker Status Dropdown */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Payout Tracker Status</label>
                <Select value={trackerStatus} onValueChange={setTrackerStatus}>
                  <SelectTrigger className="bg-[#111827] border-[#374151] text-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1f2937] border-[#374151]">
                    <SelectItem value="pending" className="text-white hover:bg-[#374151]">Pending</SelectItem>
                    <SelectItem value="processing" className="text-white hover:bg-[#374151]">Processing</SelectItem>
                    <SelectItem value="approved" className="text-white hover:bg-[#374151]">Approved</SelectItem>
                    <SelectItem value="completed" className="text-white hover:bg-[#374151]">Completed</SelectItem>
                    <SelectItem value="redirected" className="text-white hover:bg-[#374151]">Redirected to User</SelectItem>
                    <SelectItem value="rejected" className="text-white hover:bg-[#374151]">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Target User Selection (only when redirecting) */}
              {trackerStatus === "redirected" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-cyan-400" />
                    Redirect Wallet to User
                  </label>
                  <Select value={selectedTargetUser} onValueChange={setSelectedTargetUser}>
                    <SelectTrigger className="bg-[#111827] border-[#374151] text-white">
                      <SelectValue placeholder="Select target user" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1f2937] border-[#374151] max-h-60">
                      {participants.map((participant) => (
                        <SelectItem 
                          key={participant.id} 
                          value={participant.id}
                          className="text-white hover:bg-[#374151]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">@{participant.username}</span>
                            <span className="text-[#9ca3af] text-xs">({participant.email})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#9ca3af]">
                    The wallet address will be assigned as the contribution address for this user
                  </p>
                </div>
              )}

              {/* Info Box */}
              <div className="p-4 rounded-lg border border-cyan-500/30 bg-slate-700">
                <p className="text-xs text-blue-300">
                  {trackerStatus === "redirected" 
                    ? "The wallet address will be added to the selected user's contribution pool. They will use this address to receive contributions."
                    : "This will update the payment's tracker status in the system."}
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowTrackerDialog(false)
                setSelectedTargetUser("")
              }} 
              className="border-[#374151] bg-transparent"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedPayment && handleUpdatePayoutTracker(selectedPayment, trackerStatus, selectedTargetUser)}
              disabled={isProcessing || (trackerStatus === "redirected" && !selectedTargetUser)}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
            >
              {isProcessing ? "Updating..." : "Update Tracker"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={(open) => {
        setShowRejectDialog(open)
        if (!open) {
          setRejectReason("")
        }
      }}>
        <DialogContent className="bg-[#1f2937] border-[#374151]">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Payment</DialogTitle>
            <DialogDescription className="text-[#9ca3af]">
              Provide a reason for rejecting this activation payment from @{selectedPayment?.username}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="bg-[#111827] border-[#374151] text-white min-h-[100px]"
          />
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRejectDialog(false)
                setRejectReason("")
              }} 
              className="border-[#374151] bg-transparent"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedPayment) {
                  handleAction(selectedPayment.id, "reject", rejectReason)
                }
              }}
              disabled={!rejectReason.trim() || isProcessing}
            >
              {isProcessing ? "Rejecting..." : "Reject Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
