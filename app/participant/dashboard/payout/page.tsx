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
import { isParticipantAuthenticated, participantFetch } from "@/lib/auth"
import { getFundedBaseAmount, getFundedPayoutAmount } from "@/lib/funded-account"
import { TopUpModal } from "@/components/topup-modal"


const MIN_WITHDRAWAL = 50

const NETWORKS = [
  {
    id: "BEP20",
    label: "BNB Smart Chain",
    ticker: "USDT (BEP20)",
    fee: 1,
    eta: "1 - 5 minutes",
    accent: "from-amber-400 to-yellow-500",
    border: "border-amber-300",
    bg: "bg-amber-50",
    ring: "ring-amber-500",
    addressHint: "Starts with 0x, 42 characters",
  },
  {
    id: "TRC20",
    label: "Tron Network",
    ticker: "USDT (TRC20)",
    fee: 1,
    eta: "1 - 5 minutes",
    accent: "from-red-500 to-rose-600",
    border: "border-red-300",
    bg: "bg-red-50",
    ring: "ring-red-500",
    addressHint: "Starts with T, 34 characters",
  },
  {
    id: "ERC20",
    label: "Ethereum",
    ticker: "USDT (ERC20)",
    fee: 5,
    eta: "5 - 30 minutes",
    accent: "from-indigo-500 to-blue-600",
    border: "border-indigo-300",
    bg: "bg-indigo-50",
    ring: "ring-indigo-500",
    addressHint: "Starts with 0x, 42 characters",
  },
] as const

type NetworkId = (typeof NETWORKS)[number]["id"]

const QUICK_PERCENTAGES = [25, 50, 75, 100] as const

export default function PayoutPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [participantData, setParticipantData] = useState<any>(null)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [payoutHistory, setPayoutHistory] = useState<any[]>([])
  const [queuePosition, setQueuePosition] = useState(15)
  const [payoutNumber] = useState(() => Math.floor(Math.random() * (34000 - 5000 + 1)) + 5000)
  const [showPayoutDialog, setShowPayoutDialog] = useState(false)
  const [bep20Address, setBep20Address] = useState("")
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkId>("BEP20")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [showDisputeDialog, setShowDisputeDialog] = useState(false)
  const [disputePayoutId, setDisputePayoutId] = useState<string | null>(null)
  const [disputeReason, setDisputeReason] = useState("")
  const [processingPayoutActionId, setProcessingPayoutActionId] = useState<string | null>(null)
  const [showTopUpModal, setShowTopUpModal] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    if (!isParticipantAuthenticated()) {
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

        // Fetch fresh participant data
        const meRes = await participantFetch(`/api/participant/me?email=${encodeURIComponent(parsedData.email)}`)
        const meJson = await meRes.json()
        const freshData: any = meJson.participant
        if (freshData) {
          setParticipantData(freshData)
          localStorage.setItem("participantData", JSON.stringify(freshData))
          if (freshData.bep20_address) setBep20Address(freshData.bep20_address)
        } else {
          setParticipantData(parsedData)
          if (parsedData.bep20_address) setBep20Address(parsedData.bep20_address)
        }

        // Fetch payout history
        const histRes = await participantFetch(`/api/participant/request-payout?email=${encodeURIComponent(parsedData.email)}`)
        const histJson = await histRes.json()
        if (histJson.payouts) setPayoutHistory(histJson.payouts)



      } catch {}
    }

    fetchData()
  }, [router, toast])

  // Check if user has an active (pending/processing/approved) payout
  const hasActivePayout = payoutHistory.some(
    (p) => p.status === "pending" || p.status === "processing" || p.status === "approved" || p.status === "assigned"
  )

  const isFrozenFundedAccount = participantData?.account_type === "funded" && participantData?.funded_breach_status === "breached"

  const selectedNetworkConfig = NETWORKS.find((n) => n.id === selectedNetwork) ?? NETWORKS[0]

  const handleRequestWithdrawal = () => {
    if (isFrozenFundedAccount) {
      setShowTopUpModal(true)
      return
    }

    const walletBalance = participantData?.account_balance || 0
    const requestedAmount = isFundedAccount
      ? getFundedPayoutAmount(walletBalance, participantData?.funded_amount)
      : Number(withdrawAmount) || 0

    if (hasActivePayout) {
      toast({
        title: "Active Withdrawal Exists",
        description: "You can only place a new withdrawal request after your current one is completed.",
        variant: "destructive",
      })
      return
    }

    if (isFundedAccount && requestedAmount <= 0) {
      toast({
        title: "No funded profit available",
        description: `Withdrawals are available only above your $${fundedBaseAmount.toFixed(2)} funded amount.`,
        variant: "destructive",
      })
      return
    }

    if (!isFundedAccount && requestedAmount < MIN_WITHDRAWAL) {
      toast({
        title: "Amount Too Low",
        description: `Minimum withdrawal amount is $${MIN_WITHDRAWAL}`,
        variant: "destructive",
      })
      return
    }

    if (!isFundedAccount && walletBalance < requestedAmount) {
      toast({
        title: "Insufficient Balance",
        description: `You need $${requestedAmount.toFixed(2)} to request this withdrawal`,
        variant: "destructive",
      })
      return
    }

    setShowPayoutDialog(true)
  }

  const handleWithdrawal = async () => {
    if (isFrozenFundedAccount) {
      setShowTopUpModal(true)
      return
    }

    const requestedAmount = isFundedAccount
      ? getFundedPayoutAmount(participantData?.account_balance, participantData?.funded_amount)
      : Number(withdrawAmount) || 0

  if (!bep20Address.trim()) {
  toast({
  title: `${selectedNetwork} Address Required`,
  description: `Please enter your ${selectedNetwork} wallet address`,
  variant: "destructive",
  })
  return
  }

  const isEvmAddress = /^(0x)[a-fA-F0-9]{40}$/.test(bep20Address.trim())
  const isTronAddress = /^T[a-zA-Z0-9]{33}$/.test(bep20Address.trim())
  const validNetworkAddress = selectedNetwork === "TRC20" ? isTronAddress : isEvmAddress
  if (!validNetworkAddress) {
  toast({
  title: "Invalid Address",
  description: selectedNetwork === "TRC20"
  ? "Please enter a valid TRC20 address starting with T"
  : `Please enter a valid ${selectedNetwork} address starting with 0x`,
  variant: "destructive",
  })
  return
  }

    setIsWithdrawing(true)
    try {
      const response = await participantFetch("/api/participant/request-payout", {
        method: "POST",
        body: JSON.stringify({
          email: participantData?.email,
          amount: requestedAmount,
          bep20_address: bep20Address,
          payout_method: selectedNetwork,
        }),
      })

      const data = await response.json()
      if (data.success) {
        // Close dialog
        setShowPayoutDialog(false)
        
        toast({ 
          title: "Withdrawal Submitted",
          description: "You’ll be notified when the withdrawal is settled to your address",
          duration: 5000,
        })
        
        // Refresh payout history
        const histRes = await participantFetch(`/api/participant/request-payout?email=${encodeURIComponent(participantData.email)}`)
        const histJson = await histRes.json()
        if (histJson.payouts) setPayoutHistory(histJson.payouts)
        
        // Update local balance (using account_balance)
        const updatedData = { ...participantData, account_balance: data.newBalance }
        setParticipantData(updatedData)
        localStorage.setItem("participantData", JSON.stringify(updatedData))
      } else {
        toast({
          title: "Request Failed",
          description: data.error || data.message || "Unable to submit withdrawal request. Please try again.",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Connection Error",
        description: "Unable to connect. Please check your connection and try again.",
        variant: "destructive",
      })
    }
    setIsWithdrawing(false)
  }

  const handleConfirmReceipt = async (payoutId: string) => {
    if (processingPayoutActionId) return
    setProcessingPayoutActionId(payoutId)
    try {
      const res = await participantFetch("/api/participant/payout/confirm", {
        method: "POST",
        body: JSON.stringify({ payoutId, action: "confirm", participantEmail: participantData.email }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Receipt Confirmed", description: data.message })
        setPayoutHistory((prev) =>
          prev.map((p) => p.id === payoutId ? { ...p, participant_confirmed: true, confirmed_at: new Date().toISOString() } : p)
        )
      } else {
        toast({ title: "Unable to Confirm", description: "Could not confirm receipt. Please try again.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Connection Error", description: "Please check your connection and try again.", variant: "destructive" })
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
      const res = await participantFetch("/api/participant/payout/confirm", {
        method: "POST",
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
        toast({ title: "Unable to Raise Dispute", description: "Could not submit dispute. Please try again.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Connection Error", description: "Please check your connection and try again.", variant: "destructive" })
    } finally {
      setProcessingPayoutActionId(null)
    }
  }

  if (!mounted || !participantData) {
    return <PageLoader variant="subpage" />
  }

  const walletBalance = Number(participantData?.account_balance) || 0
  const isFundedAccount = participantData?.account_type === "funded"
  const fundedBaseAmount = isFundedAccount
    ? getFundedBaseAmount(walletBalance, participantData?.funded_amount)
    : 0
  const maximumFundedPayout = isFundedAccount
    ? getFundedPayoutAmount(walletBalance, participantData?.funded_amount)
    : 0
  const enteredAmount = Number(withdrawAmount) || 0
  const withdrawalAmount = isFundedAccount ? maximumFundedPayout : enteredAmount
  const networkFee = selectedNetworkConfig.fee
  const amountAfterFee = Math.max(0, withdrawalAmount - networkFee)

  const canWithdraw = isFundedAccount
    ? maximumFundedPayout > 0 && !hasActivePayout
    : enteredAmount >= MIN_WITHDRAWAL && walletBalance >= enteredAmount && !hasActivePayout
  
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
  <div className="payout-page min-h-screen min-h-dvh relative overflow-hidden">
  {isFrozenFundedAccount && (
  <div className="mx-auto max-w-5xl px-4 pt-4">
  <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
  <p><strong>Funded account breached.</strong> Trading, withdrawals, and all account functions are blocked until reactivation.</p>
  <Button type="button" onClick={() => setShowTopUpModal(true)} className="shrink-0 bg-red-600 text-white hover:bg-red-700">Add funds to reactivate</Button>
  </div>
  </div>
  )}
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
        className="payout-header sticky top-0 z-40 border-b"
        style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}
      >
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/participant/dashboard">
              <button className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors bg-transparent">
                <ArrowLeft className="h-5 w-5 text-[#E85D3B]" />
              </button>
            </Link>
            <h1 className="text-lg font-semibold text-slate-900">Withdraw Funds</h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full">
            <Wallet className="h-4 w-4 text-[#10b981]" />
            <span className="text-sm font-semibold text-[#10b981]">${walletBalance.toFixed(2)}</span>
          </div>
        </div>
      </header>

      <main className="payout-main px-4 lg:px-8 py-6 lg:py-8 space-y-5 relative z-10 pb-24 max-w-4xl lg:mx-auto">
        {/* Queue Position */}
        <div 
          className="payout-queue rounded-xl p-3 backdrop-blur-md flex items-center justify-between"
          style={{
            background: "linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(34, 211, 238, 0.08) 100%)",
            border: "1px solid rgba(124, 58, 237, 0.15)",
          }}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-cyan-300" />
            <span className="text-sm font-medium text-slate-700">Withdrawal reference</span>
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



        {/* Withdrawal Request Card */}
        <Card className="payout-request-card border shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="p-5 sm:p-6">
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

  {/* Network selector */}
  <div className="space-y-2 mb-5">
    <p className="text-sm font-semibold text-slate-700">Withdrawal Network</p>
    <div className="grid grid-cols-3 gap-2">
      {NETWORKS.map((network) => {
        const isSelected = selectedNetwork === network.id
        const isDisabled = isFrozenFundedAccount || hasActivePayout
        return (
          <button
            key={network.id}
            type="button"
            onClick={() => !isDisabled && setSelectedNetwork(network.id)}
            disabled={isDisabled}
            className={`rounded-xl border-2 px-2.5 py-3 text-left transition-all duration-200 ${
              isDisabled
                ? "border-slate-200 bg-slate-50 cursor-not-allowed opacity-70"
                : isSelected
                ? `${network.border} ${network.bg} ring-2 ${network.ring} ring-offset-1 shadow-sm`
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`h-6 w-6 rounded-md bg-gradient-to-br ${network.accent} flex items-center justify-center text-[9px] font-bold text-white shadow-sm`}>
                {network.id.slice(0, 1)}
              </span>
              {isSelected && !isDisabled && (
                <CheckCircle2 className="h-4 w-4 text-slate-700" />
              )}
            </div>
            <p className="text-xs font-bold text-slate-900 mt-1.5">{network.id}</p>
            <p className="text-[10px] text-slate-500 leading-tight">{network.label}</p>
            <p className="text-[10px] font-semibold text-slate-600 mt-1">Fee ${network.fee.toFixed(2)}</p>
          </button>
        )
      })}
    </div>
    <p className="text-xs text-slate-400">Est. arrival: {selectedNetworkConfig.eta} on {selectedNetworkConfig.label}</p>
  </div>

  {/* Withdrawal amount */}
  <div className="space-y-2 mb-5">
  <p className="text-sm font-semibold text-slate-700">{isFundedAccount ? "Funded Account Withdrawal" : "Withdrawal Amount"}</p>
  {isFundedAccount ? (
  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
  {maximumFundedPayout > 0 ? (
  <>
  <div className="flex items-center justify-between gap-3">
  <span>Available profit above ${fundedBaseAmount.toFixed(2)}</span>
  <strong>${maximumFundedPayout.toFixed(2)}</strong>
  </div>
  <p className="mt-1 text-xs text-emerald-700">You receive 80% of total profit above your funded amount. Example: $250 profit = $200 withdrawal; $50 remains with the firm.</p>
  </>
  ) : (
  <p>Withdrawals unlock after your balance exceeds the ${fundedBaseAmount.toFixed(2)} funded amount.</p>
  )}
  </div>
  ) : (
  <>
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">$</span>
      <Input
        type="number"
        inputMode="decimal"
        placeholder={`Min. $${MIN_WITHDRAWAL}`}
        value={withdrawAmount}
        onChange={(e) => setWithdrawAmount(e.target.value)}
        disabled={isFrozenFundedAccount || hasActivePayout}
        className="h-14 pl-8 pr-20 text-lg font-bold rounded-xl"
      />
      <button
        type="button"
        onClick={() => setWithdrawAmount(String(walletBalance))}
        disabled={isFrozenFundedAccount || hasActivePayout}
        className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold hover:bg-emerald-200 disabled:opacity-50"
      >
        MAX
      </button>
    </div>
    <div className="flex items-center gap-2">
      {QUICK_PERCENTAGES.map((pct) => (
        <button
          key={pct}
          type="button"
          onClick={() => setWithdrawAmount(((walletBalance * pct) / 100).toFixed(2))}
          disabled={isFrozenFundedAccount || hasActivePayout}
          className="flex-1 h-8 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50"
        >
          {pct}%
        </button>
      ))}
    </div>
    {enteredAmount > 0 && enteredAmount < MIN_WITHDRAWAL && (
      <p className="text-xs text-red-500 font-medium">Minimum withdrawal is ${MIN_WITHDRAWAL}</p>
    )}
    {enteredAmount > walletBalance && (
      <p className="text-xs text-red-500 font-medium">Amount exceeds available balance</p>
    )}
  </>
  )}
  </div>

  {/* Fee breakdown */}
  {withdrawalAmount > 0 && (
    <div className="bg-slate-50 rounded-xl p-4 space-y-2 mb-5 border border-slate-100">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">Withdrawal amount</span>
        <span className="font-semibold text-slate-800">${withdrawalAmount.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">Network fee ({selectedNetworkConfig.id})</span>
        <span className="font-semibold text-slate-800">-${networkFee.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-200">
        <span className="text-slate-600 font-medium">You will receive</span>
        <span className="font-bold text-emerald-600">${amountAfterFee.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between text-xs pt-1">
        <span className="text-slate-400">Estimated arrival</span>
        <span className="text-slate-500 font-medium">{selectedNetworkConfig.eta}</span>
      </div>
    </div>
  )}

            <button
              onClick={handleRequestWithdrawal}
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
              {isFundedAccount
                ? `Withdraw $${maximumFundedPayout.toFixed(2)} Funded Profit`
                : `Withdraw via ${selectedNetworkConfig.id}`}
            </button>

            {!canWithdraw && (
              <p className="text-center text-xs text-red-400 mt-3 font-medium">
                {hasActivePayout
                  ? "Complete your current withdrawal before placing a new one"
                  : isFundedAccount
                  ? `Your balance must exceed $${fundedBaseAmount.toFixed(2)} to unlock an 80% excess-profit withdrawal`
                  : `Enter an amount of at least $${MIN_WITHDRAWAL} to continue`}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card className="payout-history-card border shadow-lg rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-cyan-300" />
              <h3 className="font-semibold text-slate-900">Withdrawal History</h3>
            </div>

            {payoutHistory.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No withdrawal history yet</p>
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
                        {new Date(payout.created_at || payout.requested_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                      {(payout.wallet_address || payout.bep20_address) && (
                        <span className="text-slate-500 font-mono">
                          {(payout.wallet_address || payout.bep20_address).substring(0, 6)}...{(payout.wallet_address || payout.bep20_address).slice(-4)}
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

      {/* Wallet Address Confirmation Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Confirm Withdrawal Details</DialogTitle>
            <DialogDescription className="text-slate-600">
              Enter your {selectedNetworkConfig.id} wallet address to receive this withdrawal
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
  {/* Network summary (read-only, chosen on the main screen) */}
  <div className={`flex items-center justify-between rounded-xl border-2 ${selectedNetworkConfig.border} ${selectedNetworkConfig.bg} px-4 py-3`}>
    <div className="flex items-center gap-3">
      <span className={`h-8 w-8 rounded-lg bg-gradient-to-br ${selectedNetworkConfig.accent} flex items-center justify-center text-xs font-bold text-white shadow-sm`}>
        {selectedNetworkConfig.id.slice(0, 1)}
      </span>
      <div>
        <p className="text-sm font-bold text-slate-900">{selectedNetworkConfig.ticker}</p>
        <p className="text-xs text-slate-500">{selectedNetworkConfig.label}</p>
      </div>
    </div>
    <button
      type="button"
      onClick={() => setShowPayoutDialog(false)}
      disabled={isWithdrawing}
      className="text-xs font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-900"
    >
      Change
    </button>
  </div>

  {/* Wallet Address Input */}
  <div className="space-y-2">
  <Label htmlFor="bep20Address" className="text-sm font-semibold text-slate-700">
  {selectedNetworkConfig.id} Wallet Address
  </Label>
              <Input
                id="bep20Address"
                type="text"
                placeholder={`Enter your ${selectedNetworkConfig.id} wallet address here`}
                value={bep20Address}
                onChange={(e) => setBep20Address(e.target.value)}
                className="h-12 text-sm font-mono"
                disabled={isWithdrawing}
              />
              <p className="text-xs text-slate-500">
                {selectedNetworkConfig.addressHint}. Make sure your address is correct — funds sent to the wrong address cannot be recovered.
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
                    After the withdrawal is successfully sent to your address, you&apos;ll be notified via email and the status will be updated to "Completed" in your withdrawal history.
                  </p>
                </div>
              </div>
            </div>

            {/* Payout Summary */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Withdrawal amount</span>
                <span className="font-semibold text-slate-900">${withdrawalAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Network fee</span>
                <span className="font-semibold text-slate-900">-${networkFee.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-sm text-slate-600">You will receive</span>
                <span className="text-lg font-bold text-[#10b981]">${amountAfterFee.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-sm text-slate-600">Estimated arrival</span>
                <span className="text-sm font-medium text-slate-900">{selectedNetworkConfig.eta}</span>
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
                "Confirm Withdrawal"
              )}
            </Button>
          </div>
        </DialogContent>
  </Dialog>

  <TopUpModal
    isOpen={showTopUpModal}
    onClose={() => setShowTopUpModal(false)}
    currentBalance={Number(participantData?.account_balance) || 0}
    userId={participantData?.username || participantData?.email || ""}
    userEmail={participantData?.email || ""}
    isFundedAccount={participantData?.account_type === "funded"}
    isInitialFundedTopUp={participantData?.account_type === "funded" && (Number(participantData?.account_balance) || 0) <= 0}
    onSuccess={async () => {
      setShowTopUpModal(false)
      if (participantData?.email) router.refresh()
    }}
  />
  </div>
  )
  }
