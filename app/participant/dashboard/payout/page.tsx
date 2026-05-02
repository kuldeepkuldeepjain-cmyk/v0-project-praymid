"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { PageLoader } from "@/components/ui/page-loader"
import { ArrowLeft, Clock, CheckCircle2, XCircle, Loader2, AlertTriangle, Wallet, TrendingUp, Bell, ThumbsUp, ShieldAlert } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { isParticipantAuthenticated } from "@/lib/auth"

const PAYOUT_PLANS = [
  {
    id: "platinum",
    label: "P2P Payout",
    amount: 100,
    accent: "from-violet-500 to-purple-600",
    border: "border-violet-300",
    bg: "bg-violet-50",
    badge: "bg-violet-200 text-violet-800",
    ring: "ring-violet-500",
    icon: "💎",
  },
] as const

type PayoutPlanId = (typeof PAYOUT_PLANS)[number]["id"]

export default function PayoutPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [participantData, setParticipantData] = useState<any>(null)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [payoutHistory, setPayoutHistory] = useState<any[]>([])
  const [queuePosition, setQueuePosition] = useState(15)
  const [payoutNumber] = useState(() => Math.floor(Math.random() * (34000 - 5000 + 1)) + 5000)
  const [selectedPayoutPlanId, setSelectedPayoutPlanId] = useState<PayoutPlanId>("platinum")
  const [showPayoutDialog, setShowPayoutDialog] = useState(false)
  const [bep20Address, setBep20Address] = useState("")
  const [showDisputeDialog, setShowDisputeDialog] = useState(false)
  const [disputePayoutId, setDisputePayoutId] = useState<string | null>(null)
  const [disputeReason, setDisputeReason] = useState("")
  const [processingPayoutActionId, setProcessingPayoutActionId] = useState<string | null>(null)
  const isAuthenticated = isParticipantAuthenticated()

  useEffect(() => {
    setMounted(true)
    
    if (!isAuthenticated) {
      router.push("/participant/login")
      return
    }
    
    const fetchData = async () => {
      try {
        const storedData = localStorage.getItem("participantData")
        
        if (!storedData) {
          router.push("/participant/login")
          return
        }
        
        const parsedData = JSON.parse(storedData)
        
        // Fetch fresh participant data from API
        const meRes = await fetch("/api/participant/me", {
          headers: { "x-participant-email": parsedData.email },
        })
        const meData = await meRes.json()
        if (meData.success && meData.participant) {
          setParticipantData(meData.participant)
          localStorage.setItem("participantData", JSON.stringify(meData.participant))
          if (meData.participant.bep20_address) setBep20Address(meData.participant.bep20_address)
        } else {
          setParticipantData(parsedData)
          if (parsedData.bep20_address) setBep20Address(parsedData.bep20_address)
        }

        // Fetch payout history
        const histRes = await fetch(`/api/participant/payout-history?email=${encodeURIComponent(parsedData.email)}`)
        const histData = await histRes.json()
        if (histData.success) setPayoutHistory(histData.payouts || [])

        // Poll for real-time payout updates every 15s
        const pollInterval = setInterval(async () => {
          const r = await fetch(`/api/participant/payout-history?email=${encodeURIComponent(parsedData.email)}`)
          const d = await r.json()
          if (d.success) setPayoutHistory(d.payouts || [])
        }, 15000)
        return () => clearInterval(pollInterval)
      } catch (err) {
        console.error("Error in fetchData:", err)
      }
    }
    
    fetchData()
  }, [router, isAuthenticated, toast])

  // Check if user has an active (pending/processing/approved) payout
  const hasActivePayout = payoutHistory.some(
    (p) => p.status === "pending" || p.status === "processing" || p.status === "approved" || p.status === "assigned"
  )

  const handleRequestPayout = () => {
    const walletBalance = participantData?.account_balance || 0
    const plan = PAYOUT_PLANS.find((p) => p.id === selectedPayoutPlanId) ?? PAYOUT_PLANS[2]

    if (hasActivePayout) {
      toast({
        title: "Active Payout Exists",
        description: "You can only place a new payout request after your current one is completed.",
        variant: "destructive",
      })
      return
    }

    if (walletBalance < plan.amount) {
      toast({
        title: "Insufficient Balance",
        description: `You need $${plan.amount} to request a ${plan.label} payout`,
        variant: "destructive",
      })
      return
    }

    setShowPayoutDialog(true)
  }

  const handleWithdrawal = async () => {
    const plan = PAYOUT_PLANS.find((p) => p.id === selectedPayoutPlanId) ?? PAYOUT_PLANS[2]

    if (!bep20Address || bep20Address.trim().length === 0) {
      toast({
        title: "BEP20 Address Required",
        description: "Please enter your BEP20 wallet address",
        variant: "destructive",
      })
      return
    }

    if (!bep20Address.startsWith("0x") || bep20Address.length !== 42) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid BEP20 address (starts with 0x)",
        variant: "destructive",
      })
      return
    }

    setIsWithdrawing(true)
    try {
      const response = await fetch("/api/participant/request-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: participantData?.email,
          amount: plan.amount,
          bep20_address: bep20Address,
        }),
      })

      const data = await response.json()
      if (data.success) {
        // Close dialog
        setShowPayoutDialog(false)
        
        toast({ 
          title: "Payout Requested!", 
          description: "You'll be notified when the payout is successfully sent to your address",
          duration: 5000,
        })
        
        // Refresh payout history
        const r = await fetch(`/api/participant/payout-history?email=${encodeURIComponent(participantData.email)}`)
        const d = await r.json()
        if (d.success) setPayoutHistory(d.payouts || [])
        
        // Update local balance (using account_balance)
        const updatedData = { ...participantData, account_balance: data.newBalance }
        setParticipantData(updatedData)
        localStorage.setItem("participantData", JSON.stringify(updatedData))
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: "Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
    setIsWithdrawing(false)
  }

  const handleConfirmReceipt = async (payoutId: string) => {
    if (processingPayoutActionId) return
    setProcessingPayoutActionId(payoutId)
    try {
      const res = await fetch("/api/participant/payout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId, action: "confirm", participantEmail: participantData.email }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Receipt Confirmed", description: data.message })
        setPayoutHistory((prev) =>
          prev.map((p) => p.id === payoutId ? { ...p, participant_confirmed: true, confirmed_at: new Date().toISOString() } : p)
        )
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" })
    } finally {
      setProcessingPayoutActionId(null)
    }
  }

  const handleRaiseDispute = async () => {
    if (!disputePayoutId || processingPayoutActionId) return
    if (disputeReason.trim().length < 10) {
      toast({ title: "Reason Required", description: "Please describe the issue in at least 10 characters.", variant: "destructive" })
      return
    }
    setProcessingPayoutActionId(disputePayoutId)
    try {
      const res = await fetch("/api/participant/payout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId: disputePayoutId, action: "dispute", disputeReason, participantEmail: participantData.email }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Dispute Raised", description: data.message })
        setPayoutHistory((prev) =>
          prev.map((p) => p.id === disputePayoutId ? { ...p, dispute_status: "open", dispute_raised_at: new Date().toISOString() } : p)
        )
        setShowDisputeDialog(false)
        setDisputeReason("")
        setDisputePayoutId(null)
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" })
    } finally {
      setProcessingPayoutActionId(null)
    }
  }

  if (!mounted || !participantData) {
    return <PageLoader variant="subpage" />
  }

  const walletBalance = participantData?.account_balance || 0
  const selectedPayoutPlan = PAYOUT_PLANS.find((p) => p.id === selectedPayoutPlanId) ?? PAYOUT_PLANS[2]
  const canWithdraw = walletBalance >= selectedPayoutPlan.amount && !hasActivePayout
  
  // Helper function to render horizontal status tracker
  const renderStatusTracker = (status: string, transactionHash?: string) => {
    // If rejected, show rejected status
    if (status === "rejected") {
      return (
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-100 border-2 border-red-500">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <span className="text-sm font-semibold mt-2 text-red-600">Rejected</span>
          </div>
        </div>
      )
    }

    const stages = [
      { key: "pending", label: "Requested", icon: Clock },
      { key: "processing", label: "Processing", icon: Loader2 },
      { key: "approved", label: "Approved", icon: CheckCircle2 },
      { key: "completed", label: "Sent", icon: TrendingUp },
    ]
    
    const currentIndex = stages.findIndex(s => s.key === status)
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          {stages.map((stage, index) => {
            const Icon = stage.icon
            const isActive = index === currentIndex
            const isCompleted = index < currentIndex
            
            return (
              <div key={stage.key} className="flex items-center flex-1">
                {/* Stage Circle */}
                <div className="relative flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isActive
                        ? "bg-gradient-to-br from-[#7c3aed] to-[#22d3ee] shadow-lg"
                        : isCompleted
                          ? "bg-[#7c3aed]"
                          : "bg-slate-200"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        isActive || isCompleted ? "text-white" : "text-slate-400"
                      } ${isActive && stage.key === "processing" ? "animate-spin" : ""}`}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-semibold mt-1.5 text-center whitespace-nowrap ${
                      isActive ? "text-[#7c3aed]" : isCompleted ? "text-[#7c3aed]" : "text-slate-400"
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
                
                {/* Connecting Line */}
                {index < stages.length - 1 && (
                  <div className="flex-1 h-1 mx-2 rounded-full bg-slate-200 relative overflow-hidden">
                    {isCompleted && (
                      <div className="absolute inset-0 bg-[#7c3aed]" />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        
        {/* Transaction Hash Display */}
        {status === "completed" && transactionHash && (
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-xs text-purple-700 font-semibold mb-1">Transaction Hash</p>
            <code className="text-xs text-purple-600 break-all font-mono">{transactionHash}</code>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(at 0% 0%, rgba(124, 58, 237, 0.03), transparent 50%),
              radial-gradient(at 100% 0%, rgba(34, 211, 238, 0.03), transparent 50%),
              radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.03), transparent 50%),
              radial-gradient(at 0% 100%, rgba(232, 93, 59, 0.03), transparent 50%)
            `,
          }}
        />
      </div>

      <header
        className="bg-white sticky top-0 z-40 border-b border-slate-100"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
      >
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/participant/dashboard">
              <button className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors bg-transparent">
                <ArrowLeft className="h-5 w-5 text-[#E85D3B]" />
              </button>
            </Link>
            <h1 className="text-lg font-semibold text-slate-900">Payout Requests</h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full">
            <Wallet className="h-4 w-4 text-[#10b981]" />
            <span className="text-sm font-semibold text-[#10b981]">${walletBalance.toFixed(2)}</span>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-5 relative z-10 pb-24">
        {/* Queue Position */}
        <div 
          className="rounded-xl p-3 backdrop-blur-md flex items-center justify-between"
          style={{
            background: "linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(34, 211, 238, 0.08) 100%)",
            border: "1px solid rgba(124, 58, 237, 0.15)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🎯</span>
            <span className="text-sm font-medium text-slate-700">Your payout number is</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 backdrop-blur-sm">
            <span 
              className="text-base font-bold"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #22d3ee)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              #{payoutNumber}
            </span>
          </div>
        </div>

        {/* Payout Request Card */}
        <Card className="border border-slate-100 shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="h-5 w-5 text-[#10b981]" />
              <p className="text-sm text-slate-500 font-medium">Available Balance</p>
            </div>

            {/* Large Balance Display */}
            <p
              className="text-center text-[42px] font-extrabold my-4"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              ${walletBalance.toFixed(2)}
            </p>

            {/* Payout Plan Selector */}
            <div className="space-y-2 mb-5">
              <p className="text-sm font-semibold text-slate-700">Select Payout Amount</p>
              {PAYOUT_PLANS.map((plan) => {
                const isSelected = selectedPayoutPlanId === plan.id
                const canAfford = walletBalance >= plan.amount
                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPayoutPlanId(plan.id)}
                    disabled={hasActivePayout}
                    className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all duration-200 ${
                      isSelected
                        ? `${plan.border} ${plan.bg} ring-2 ${plan.ring} ring-offset-1 shadow-sm`
                        : "border-slate-200 bg-white hover:border-slate-300"
                    } ${hasActivePayout ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${plan.accent} flex items-center justify-center text-base shadow-sm`}>
                          {plan.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{plan.label}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${plan.badge}`}>
                              {plan.label.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Request <span className="font-bold text-slate-700">${plan.amount} USDT</span> payout
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {!canAfford && (
                          <span className="text-xs text-red-500 font-medium">Need ${plan.amount - walletBalance > 0 ? (plan.amount - walletBalance).toFixed(2) : 0} more</span>
                        )}
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? `${plan.border} bg-gradient-to-br ${plan.accent}` : "border-slate-300 bg-white"
                        }`}>
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={handleRequestPayout}
              disabled={!canWithdraw}
              className="w-full h-14 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.97] bg-transparent"
              style={{
                background: canWithdraw ? "linear-gradient(135deg, #10b981, #34d399)" : "#cbd5e1",
                boxShadow: canWithdraw ? "0 4px 0 #047857, 0 8px 24px rgba(16, 185, 129, 0.4)" : "none",
                cursor: !canWithdraw ? "not-allowed" : "pointer",
                opacity: !canWithdraw ? 0.6 : 1,
              }}
            >
              <Wallet className="h-5 w-5" />
              Request ${selectedPayoutPlan.amount} {selectedPayoutPlan.label} Payout
            </button>

            {!canWithdraw && (
              <p className="text-center text-xs text-slate-400 mt-3">
                {hasActivePayout
                  ? "Complete your current payout request before placing a new one"
                  : `Need $${selectedPayoutPlan.amount} minimum balance for ${selectedPayoutPlan.label} payout`}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Payout History */}
        <Card className="border border-slate-100 shadow-lg rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">📜</span>
              <h3 className="font-semibold text-slate-900">Payout History</h3>
            </div>

            {payoutHistory.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No payout history yet</p>
            ) : (
              <div className="space-y-4">
                {payoutHistory.map((payout) => (
                  <div
                    key={payout.id}
                    className="p-4 bg-white rounded-xl border border-slate-100 transition-all hover:border-[#7c3aed] hover:shadow-md"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900 text-lg">${payout.amount}</span>
                      </div>
                      <Badge
                        className={
                          payout.status === "completed"
                            ? "bg-emerald-100 text-emerald-700 border border-[#10b981]"
                            : payout.status === "approved"
                              ? "bg-blue-100 text-blue-700 border border-blue-400"
                              : payout.status === "processing"
                                ? "bg-amber-100 text-amber-700 border border-amber-400"
                                : payout.status === "rejected"
                                  ? "bg-red-100 text-red-700 border border-[#ef4444]"
                                  : "bg-slate-100 text-slate-600 border border-slate-300"
                        }
                      >
                        {payout.status}
                      </Badge>
                    </div>
                    
                    {/* Horizontal Status Tracker */}
                    <div className="mb-3">
                      {renderStatusTracker(payout.status, payout.transaction_hash)}
                    </div>
                    
                    {payout.status === "rejected" && payout.admin_notes && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-xs font-semibold text-red-700 mb-1">Rejection Reason</p>
                        <p className="text-xs text-red-600">{payout.admin_notes}</p>
                      </div>
                    )}

                    {/* Confirm / Dispute — only for completed payouts not yet actioned */}
                    {payout.status === "completed" && !payout.participant_confirmed && !payout.dispute_status && (
                      <div className="mt-3 space-y-2">
                        <div className="p-3 rounded-xl bg-gradient-to-r from-purple-50 to-cyan-50 border border-purple-100">
                          <p className="text-xs font-semibold text-slate-700 mb-2">Did you receive this payout?</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleConfirmReceipt(payout.id)}
                              disabled={processingPayoutActionId === payout.id}
                              className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                            >
                              {processingPayoutActionId === payout.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
                                  Yes, Received
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setDisputePayoutId(payout.id)
                                setShowDisputeDialog(true)
                              }}
                              disabled={processingPayoutActionId === payout.id}
                              className="flex-1 h-9 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg"
                            >
                              <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
                              Not Received
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Already confirmed */}
                    {payout.status === "completed" && payout.participant_confirmed === true && (
                      <div className="mt-3 flex items-center gap-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        <p className="text-xs text-emerald-700 font-medium">
                          You confirmed receipt on {payout.confirmed_at ? new Date(payout.confirmed_at).toLocaleDateString() : "record"}
                        </p>
                      </div>
                    )}

                    {/* Dispute raised */}
                    {payout.status === "completed" && payout.dispute_status === "open" && (
                      <div className="mt-3 flex items-start gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                        <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-amber-700 font-semibold">Dispute Under Review</p>
                          <p className="text-xs text-amber-600 mt-0.5">Our team is investigating. You will be contacted shortly.</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 mt-3">
                      <span className="text-slate-400">
                        {new Date(payout.requested_at).toLocaleDateString()}
                      </span>
                      {payout.bep20_address && (
                        <span className="text-slate-500 font-mono">
                          {payout.bep20_address.substring(0, 6)}...{payout.bep20_address.substring(payout.bep20_address.length - 4)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Raise Dispute Dialog */}
      <Dialog open={showDisputeDialog} onOpenChange={(open) => {
        setShowDisputeDialog(open)
        if (!open) { setDisputeReason(""); setDisputePayoutId(null) }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              Raise a Payout Dispute
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Describe why you did not receive the payout. Our team will review and respond within 24 hours.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div
              className="p-3 rounded-xl border"
              style={{ background: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.2)" }}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 leading-relaxed">
                  Only raise a dispute if you genuinely did not receive the payout to your wallet. False disputes may result in account suspension.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="disputeReason" className="text-sm font-semibold text-slate-700">
                Reason for Dispute
              </Label>
              <Textarea
                id="disputeReason"
                placeholder="e.g. I checked my BEP20 wallet and no funds arrived. Transaction shows completed but balance unchanged..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={4}
                className="resize-none text-sm"
                disabled={!!processingPayoutActionId}
              />
              <p className="text-xs text-slate-400">{disputeReason.length}/10 characters minimum</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => { setShowDisputeDialog(false); setDisputeReason(""); setDisputePayoutId(null) }}
              disabled={!!processingPayoutActionId}
              className="flex-1 h-12 rounded-xl font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRaiseDispute}
              disabled={!!processingPayoutActionId || disputeReason.trim().length < 10}
              className="flex-1 h-12 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700"
            >
              {processingPayoutActionId ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting...</>
              ) : (
                <><ShieldAlert className="h-4 w-4 mr-2" />Submit Dispute</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* BEP20 Address Confirmation Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Confirm Payout Details</DialogTitle>
            <DialogDescription className="text-slate-600">
              Enter your BEP20 wallet address to receive ${selectedPayoutPlan.amount} {selectedPayoutPlan.label} payout
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* BEP20 Address Input */}
            <div className="space-y-2">
              <Label htmlFor="bep20Address" className="text-sm font-semibold text-slate-700">
                BEP20 Wallet Address
              </Label>
              <Input
                id="bep20Address"
                type="text"
                placeholder="0x..."
                value={bep20Address}
                onChange={(e) => setBep20Address(e.target.value)}
                className="h-12 text-sm font-mono"
                disabled={isWithdrawing}
              />
              <p className="text-xs text-slate-500">
                Make sure your address is correct. Funds sent to wrong address cannot be recovered.
              </p>
            </div>

            {/* Notification Alert */}
            <div 
              className="rounded-xl p-4"
              style={{
                background: "linear-gradient(135deg, rgba(34, 211, 238, 0.08) 0%, rgba(124, 58, 237, 0.08) 100%)",
                border: "1px solid rgba(124, 58, 237, 0.15)",
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Bell className="h-4 w-4 text-[#7c3aed]" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-slate-900 mb-1">Notification</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    After the payout is successfully sent to your address, you'll be notified via email and 
                    the status will be updated to "Completed" in your payout history.
                  </p>
                </div>
              </div>
            </div>

            {/* Payout Summary */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Payout Amount</span>
                <span className="text-lg font-bold text-[#10b981]">${selectedPayoutPlan.amount} ({selectedPayoutPlan.label})</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-sm text-slate-600">Processing Time</span>
                <span className="text-sm font-medium text-slate-900">1-24 hours</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPayoutDialog(false)}
              disabled={isWithdrawing}
              className="flex-1 h-12 rounded-xl font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleWithdrawal}
              disabled={isWithdrawing || !bep20Address}
              className="flex-1 h-12 rounded-xl font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, #10b981, #34d399)",
                boxShadow: "0 4px 0 #047857",
              }}
            >
              {isWithdrawing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                "Confirm Payout"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
