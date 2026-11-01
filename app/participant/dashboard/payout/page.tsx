"use client"

import { useState, useEffect, useId } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PageLoader } from "@/components/ui/page-loader"
import { ArrowLeft, Clock3, History, Info, ShieldAlert } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { isParticipantAuthenticated, participantFetch } from "@/lib/auth"
import { getFundedBaseAmount, getFundedPayoutAmount } from "@/lib/funded-account"
import { MIN_WITHDRAWAL, PAYOUT_NETWORKS, type NetworkId, type PayoutRecord } from "@/lib/payout-presentation"
import { TopUpModal } from "@/components/topup-modal"
import { PayoutRequestForm } from "@/components/participant-payout-form"
import { PayoutOverview, PayoutSummary } from "@/components/participant-payout-summary"
import { PayoutHistory } from "@/components/participant-payout-history"
import { PayoutConfirmationDialog, PayoutDisputeDialog } from "@/components/participant-payout-dialogs"

export default function PayoutPage() {
  const router = useRouter()
  const { toast } = useToast()
  const workspaceId = useId()
  const historyId = `${workspaceId}-history`
  const titleId = `${workspaceId}-title`
  const [mounted, setMounted] = useState(false)
  const [participantData, setParticipantData] = useState<any>(null)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [payoutHistory, setPayoutHistory] = useState<PayoutRecord[]>([])
  const [showPayoutDialog, setShowPayoutDialog] = useState(false)
  const [bep20Address, setBep20Address] = useState("")
  const [upiId, setUpiId] = useState("")
  const [bankAccountName, setBankAccountName] = useState("")
  const [bankAccountNumber, setBankAccountNumber] = useState("")
  const [bankIfsc, setBankIfsc] = useState("")
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkId | "INR">("BEP20")
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

  const selectedNetworkConfig = PAYOUT_NETWORKS.find((n) => n.id === selectedNetwork) ?? PAYOUT_NETWORKS[0]

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

  let payoutDestination = bep20Address.trim()
  if (selectedNetwork === "INR") {
    const validUpi = /^[\w.-]+@[\w.-]+$/.test(upiId.trim())
    const validIfsc = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfsc.trim().toUpperCase())
    if (!validUpi && !(bankAccountName.trim() && bankAccountNumber.trim().length >= 8 && validIfsc)) {
      toast({ title: "INR payout details required", description: "Enter a valid UPI ID, or complete the bank account and IFSC details.", variant: "destructive" })
      return
    }
    payoutDestination = JSON.stringify({ currency: "INR", upiId: upiId.trim() || null, accountName: bankAccountName.trim() || null, accountNumber: bankAccountNumber.trim() || null, ifsc: bankIfsc.trim().toUpperCase() || null })
  } else {
    if (!payoutDestination) {
      toast({ title: `${selectedNetwork} Address Required`, description: `Please enter your ${selectedNetwork} wallet address`, variant: "destructive" })
      return
    }
    const isEvmAddress = /^(0x)[a-fA-F0-9]{40}$/.test(payoutDestination)
    const isTronAddress = /^T[a-zA-Z0-9]{33}$/.test(payoutDestination)
    const validNetworkAddress = selectedNetwork === "TRC20" ? isTronAddress : isEvmAddress
    if (!validNetworkAddress) {
      toast({ title: "Invalid Address", description: selectedNetwork === "TRC20" ? "Please enter a valid TRC20 address starting with T" : `Please enter a valid ${selectedNetwork} address starting with 0x`, variant: "destructive" })
      return
    }
  }

    setIsWithdrawing(true)
    try {
      const response = await participantFetch("/api/participant/request-payout", {
        method: "POST",
        body: JSON.stringify({
          email: participantData?.email,
          amount: requestedAmount,
          bep20_address: payoutDestination,
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

  return (
    <div className="participant-payout-workspace payout-workspace font-sans">
      <header className="payout-topbar">
        <div className="payout-topbar-inner">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" asChild><Link href="/participant/dashboard" aria-label="Back to dashboard"><ArrowLeft data-icon="inline-start" aria-hidden="true" /></Link></Button>
            <div className="payout-topbar-label"><strong>Wallet</strong><span aria-hidden="true">/</span><span>Payouts</span></div>
          </div>
          <Button variant="outline" asChild><a href={`#${historyId}`}><History data-icon="inline-start" aria-hidden="true" />History</a></Button>
        </div>
      </header>
      <div className="payout-content">
        <section className="payout-page-heading" aria-labelledby={titleId}>
          <div><h1 id={titleId} className="payout-page-title text-balance">Your earnings. Your way.</h1><p className="text-pretty">Request a payout, review the details, and follow your funds from submission to receipt.</p></div>
          <Badge variant="outline">USDT &amp; INR payouts</Badge>
        </section>
        <PayoutOverview walletBalance={walletBalance} isFundedAccount={isFundedAccount} fundedBaseAmount={fundedBaseAmount} maximumFundedPayout={maximumFundedPayout} history={payoutHistory} />
        {isFrozenFundedAccount && (
          <Alert role="alert"><ShieldAlert aria-hidden="true" /><AlertTitle>Funded account breached</AlertTitle><AlertDescription><p>Trading, withdrawals, and all account functions are blocked until reactivation.</p><Button type="button" onClick={() => setShowTopUpModal(true)} className="payout-primary-action">Add funds to reactivate</Button></AlertDescription></Alert>
        )}
        {hasActivePayout && (
          <Alert role="status"><Clock3 aria-hidden="true" /><AlertTitle>A withdrawal is already in progress</AlertTitle><AlertDescription><p>You can place another request after your current withdrawal is completed. Your progress and transfer details are below.</p><a href={`#${historyId}`} className="text-primary underline underline-offset-4">View your active withdrawal</a></AlertDescription></Alert>
        )}
        {participantData?.account_type === "challenge" && (
          <Alert role="note"><Info aria-hidden="true" /><AlertTitle>Evaluation account</AlertTitle><AlertDescription>Payouts are not available during evaluation. Pass your challenge to become eligible for funded-account profit payouts.</AlertDescription></Alert>
        )}
        <div className="payout-main-grid">
          <PayoutRequestForm
            selectedNetwork={selectedNetwork}
            network={selectedNetworkConfig}
            onNetworkChange={setSelectedNetwork}
            walletBalance={walletBalance}
            withdrawAmount={withdrawAmount}
            onAmountChange={setWithdrawAmount}
            isFundedAccount={isFundedAccount}
            fundedBaseAmount={fundedBaseAmount}
            maximumFundedPayout={maximumFundedPayout}
            isFrozenFundedAccount={isFrozenFundedAccount}
            hasActivePayout={hasActivePayout}
            canWithdraw={canWithdraw}
            onRequestWithdrawal={handleRequestWithdrawal}
          />
          <PayoutSummary network={selectedNetworkConfig} amount={withdrawalAmount} networkFee={networkFee} amountAfterFee={amountAfterFee} isFundedAccount={isFundedAccount} />
        </div>
        <PayoutHistory id={historyId} payouts={payoutHistory} processingPayoutActionId={processingPayoutActionId} onConfirmReceipt={handleConfirmReceipt} onDispute={(payoutId) => { setDisputePayoutId(payoutId); setShowDisputeDialog(true) }} />
      </div>
      <PayoutDisputeDialog
        open={showDisputeDialog}
        onOpenChange={(open) => { setShowDisputeDialog(open); if (!open) { setDisputeReason(""); setDisputePayoutId(null) } }}
        reason={disputeReason}
        onReasonChange={setDisputeReason}
        processing={!!processingPayoutActionId}
        onSubmit={handleRaiseDispute}
        onCancel={() => { setShowDisputeDialog(false); setDisputeReason(""); setDisputePayoutId(null) }}
      />
      <PayoutConfirmationDialog
        open={showPayoutDialog}
        onOpenChange={setShowPayoutDialog}
        network={selectedNetworkConfig}
        values={{ bep20Address, upiId, bankAccountName, bankAccountNumber, bankIfsc }}
        onValueChange={(field, value) => { const setters = { bep20Address: setBep20Address, upiId: setUpiId, bankAccountName: setBankAccountName, bankAccountNumber: setBankAccountNumber, bankIfsc: setBankIfsc }; setters[field](value) }}
        isWithdrawing={isWithdrawing}
        amount={withdrawalAmount}
        networkFee={networkFee}
        amountAfterFee={amountAfterFee}
        onConfirm={handleWithdrawal}
      />
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
