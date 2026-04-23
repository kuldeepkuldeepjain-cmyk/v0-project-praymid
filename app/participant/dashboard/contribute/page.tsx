"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageLoader } from "@/components/ui/page-loader"
import {
  ArrowLeft, Loader2, Clock, User, Mail, Phone, Wallet,
  DollarSign, CheckCircle2, Upload, Send, AlertTriangle, Copy, X
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { isParticipantAuthenticated } from "@/lib/auth"
import { createClient } from "@/lib/supabase/client"

const CONTRIBUTION_WINDOW_HOURS = 24

const PLANS = [
  {
    id: "platinum",
    label: "P2P Contribution",
    amount: 100,
    reward: 150,
    color: "violet",
    accent: "from-violet-500 to-purple-600",
    border: "border-violet-300",
    bg: "bg-violet-50",
    badge: "bg-violet-200 text-violet-800",
    ring: "ring-violet-500",
    icon: "💎",
  },
] as const

type PlanId = (typeof PLANS)[number]["id"]

export default function ContributePage() {
  const router = useRouter()
  const { toast } = useToast()

  const [mounted, setMounted] = useState(false)
  const [participantData, setParticipantData] = useState<any>(null)

  // States: idle | pending | matched
  const [hasPendingSubmission, setHasPendingSubmission] = useState(false)
  const [pendingSubmissionTime, setPendingSubmissionTime] = useState<string>("")
  const [matchedContribution, setMatchedContribution] = useState<any>(null)

  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>("platinum")
  const [isRequestingContribution, setIsRequestingContribution] = useState(false)

  const handleContributeRequest = async () => {
    if (isOnCooldown) return
    // Block re-entrancy immediately using the loading flag
    if (isRequestingContribution) return

    const plan = PLANS.find((p) => p.id === selectedPlanId)
    if (!plan) return

    setIsRequestingContribution(true)
    try {
      const supabase = createClient()
      let participantId = participantData.participantId || participantData.id
      if (!participantId) {
        const { data: p } = await supabase
          .from("participants").select("id").eq("email", participantData.email).maybeSingle()
        if (!p) throw new Error("Participant account not found")
        participantId = p.id
      }

      // DB-level duplicate check — catches cases where local state hasn't loaded yet
      const { data: existing } = await supabase
        .from("payment_submissions")
        .select("id, status")
        .eq("participant_email", participantData.email)
        .in("status", ["request_pending", "pending", "in_process", "proof_submitted"])
        .limit(1)
        .maybeSingle()

      if (existing) {
        setHasPendingSubmission(true)
        toast({
          title: "Request Already Pending",
          description: "You already have an active contribution request awaiting admin approval.",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase
        .from("payment_submissions")
        .insert({
          participant_id: participantId,
          participant_email: participantData.email,
          amount: plan.amount,
          payment_method: "request",
          transaction_id: null,
          screenshot_url: null,
          admin_notes: null,
          status: "request_pending",
        })

      if (error) throw new Error(error.message)

      toast({ 
        title: "Request Submitted!", 
        description: `$${plan.amount} contribution request sent to admin. You will be notified when it is matched with a payout request.` 
      })
      setHasPendingSubmission(true)
      setPendingSubmissionTime("Just now")
    } catch (err: any) {
      toast({ title: "Failed", description: err.message || "Please try again.", variant: "destructive" })
    } finally {
      setIsRequestingContribution(false)
    }
  }

  const [timeRemaining, setTimeRemaining] = useState<string>("")

  // Payment proof form
  const [transactionHash, setTransactionHash] = useState("")
  const [paymentNote, setPaymentNote] = useState("")
  const [paymentSlip, setPaymentSlip] = useState<File | null>(null)
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
  const [paymentProofSubmitted, setPaymentProofSubmitted] = useState(false)

  const isAuthenticated = isParticipantAuthenticated()

  // ─── Data fetch (server-side API bypasses RLS on payout_requests) ────────────
  const checkPendingSubmission = useCallback(async () => {
    if (!participantData?.email) return
    try {
      const res = await fetch(
        `/api/participant/contributions/matched?email=${encodeURIComponent(participantData.email)}`,
        { cache: "no-store" }
      )
      if (!res.ok) return
      const data = await res.json()

      if (data.matched) {
        setMatchedContribution({
          id: data.contribution.id,
          amount: data.contribution.amount,
          status: data.contribution.status,
          created_at: data.contribution.created_at,
          payout: data.payout,
        })
        setHasPendingSubmission(false)
        return
      }

      if (data.pending && data.pendingCreatedAt) {
        setMatchedContribution(null)
        setHasPendingSubmission(true)
        const diffMinutes = Math.floor(
          (Date.now() - new Date(data.pendingCreatedAt).getTime()) / 60000
        )
        if (diffMinutes < 1) setPendingSubmissionTime("Just now")
        else if (diffMinutes < 60) setPendingSubmissionTime(`${diffMinutes} min ago`)
        else setPendingSubmissionTime(`${Math.floor(diffMinutes / 60)}h ago`)
        return
      }

      setMatchedContribution(null)
      setHasPendingSubmission(false)
    } catch {
      // silent retry on next poll
    }
  }, [participantData?.email])

  // ─── Countdown for matched window ────────────────────────────────────────────
  const calculateTimeRemaining = useCallback(() => {
    if (!matchedContribution) return
    const expiry = new Date(matchedContribution.created_at).getTime() + CONTRIBUTION_WINDOW_HOURS * 3600000
    const remaining = expiry - Date.now()
    if (remaining <= 0) { setTimeRemaining("Expired"); return }
    const h = Math.floor(remaining / 3600000)
    const m = Math.floor((remaining % 3600000) / 60000)
    const s = Math.floor((remaining % 60000) / 1000)
    setTimeRemaining(`${h}h ${m}m ${s}s`)
  }, [matchedContribution])

  // ─── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated) { router.push("/participant/login"); return }
    const storedData = localStorage.getItem("participantData")
    if (storedData) {
      const parsed = JSON.parse(storedData)
      setParticipantData(parsed)
      const supabase = createClient()
      supabase.from("participants")
        .select("next_contribution_date")
        .eq("email", parsed.email)
        .single()
        .then(({ data }) => {
          if (data?.next_contribution_date) {
            setParticipantData((prev: any) => ({ ...prev, next_contribution_date: data.next_contribution_date }))
          }
        })
    }
  }, [router, isAuthenticated])

  useEffect(() => {
    if (!participantData?.email) return
    checkPendingSubmission()
    // Poll every 15 seconds to detect when system matches the contribution
    const interval = setInterval(checkPendingSubmission, 15000)
    return () => clearInterval(interval)
  }, [participantData?.email, checkPendingSubmission])

  useEffect(() => {
    if (!matchedContribution) return
    calculateTimeRemaining()
    const t = setInterval(calculateTimeRemaining, 1000)
    return () => clearInterval(t)
  }, [matchedContribution, calculateTimeRemaining])

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handlePaymentSubmission = async () => {
    if (!transactionHash.trim()) {
      toast({ title: "Missing Info", description: "Please enter your transaction hash.", variant: "destructive" })
      return
    }
    if (!paymentSlip) {
      toast({ title: "Missing Info", description: "Please upload your payment screenshot.", variant: "destructive" })
      return
    }
    if (!matchedContribution?.id) {
      toast({ title: "Error", description: "No matched contribution found.", variant: "destructive" })
      return
    }

    setIsSubmittingPayment(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(paymentSlip)
      })

      if (base64.length > 10_000_000) {
        toast({ title: "File Too Large", description: "Screenshot must be under 10MB.", variant: "destructive" })
        return
      }

      const supabase = createClient()
      const { error } = await supabase
        .from("payment_submissions")
        .update({
          transaction_id: transactionHash,
          screenshot_url: base64,
          admin_notes: paymentNote || null,
          status: "proof_submitted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchedContribution.id)
        .in("status", ["in_process", "proof_submitted"])

      if (error) throw new Error(error.message)

      toast({ title: "Payment Proof Submitted!", description: "Your proof has been sent. Waiting for system approval." })
      setPaymentProofSubmitted(true)
      setTransactionHash("")
      setPaymentNote("")
      setPaymentSlip(null)
    } catch (err: any) {
      toast({ title: "Submission Failed", description: err.message || "Please try again.", variant: "destructive" })
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Copied", description: `${label} copied to clipboard.` })
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (!mounted || !participantData) {
    return <PageLoader variant="subpage" />
  }

  // ─── Cooldown check (notification only, no blocking) ─────────────────────────
  const isOnCooldown = participantData.next_contribution_date &&
    new Date(participantData.next_contribution_date) > new Date()

  const cooldownDate = isOnCooldown
    ? new Date(participantData.next_contribution_date).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      })
    : null

  // ─── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/participant/dashboard">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Contribution</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">

        {matchedContribution ? (
          /* ── MATCHED: Payout recipient details + payment proof form ── */
          <div className="space-y-5 animate-in fade-in duration-500">

            {/* Status banner */}
            <Card className={`border-2 ${paymentProofSubmitted ? "border-green-200 bg-green-50" : "border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50"}`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-11 w-11 rounded-full flex items-center justify-center ${paymentProofSubmitted ? "bg-green-500" : "bg-purple-500"}`}>
                    {paymentProofSubmitted
                      ? <CheckCircle2 className="h-6 w-6 text-white" />
                      : <Send className="h-6 w-6 text-white" />
                    }
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${paymentProofSubmitted ? "text-green-900" : "text-purple-900"}`}>
                      {paymentProofSubmitted ? "Payment Proof Submitted" : "Contribution Matched — Send Payment"}
                    </h2>
                    <p className={`text-sm ${paymentProofSubmitted ? "text-green-700" : "text-purple-700"}`}>
                      {paymentProofSubmitted
                        ? "Your proof has been received. Waiting for system approval."
                        : "Send exactly the amount shown to the recipient below, then submit proof."}
                    </p>
                  </div>
                </div>

                {/* Countdown */}
                <div className="flex items-center justify-center gap-3 p-4 bg-white rounded-xl border-2 border-purple-200">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <div className="text-center">
                    <p className="text-xs text-slate-500 font-medium">Time Remaining</p>
                    <p className="text-2xl font-black text-purple-600 font-mono">{timeRemaining}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Amount */}
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-purple-700 font-medium">Amount to Send</p>
                    <p className="text-3xl font-black text-purple-900">${matchedContribution.amount}</p>
                  </div>
                </div>
                <Badge className="bg-purple-600 text-white text-sm px-3 py-1">USDT (BEP20)</Badge>
              </CardContent>
            </Card>

            {/* Recipient details */}
            <Card className="border-2 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Payout Recipient — Send to this person
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <User className="h-5 w-5 text-slate-500 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Full Name</p>
                    <p className="font-bold text-slate-900">{matchedContribution.payout?.participants?.full_name || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <Mail className="h-5 w-5 text-slate-500 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Email Address</p>
                    <p className="font-semibold text-slate-900 text-sm">{matchedContribution.payout?.participants?.email || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <Phone className="h-5 w-5 text-slate-500 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Mobile Number</p>
                    <p className="font-bold text-slate-900">
                      {matchedContribution.payout?.participants?.mobile_number
                        ? `••••••${String(matchedContribution.payout.participants.mobile_number).slice(-4)}`
                        : "Not provided"}
                    </p>
                  </div>
                </div>

                {(matchedContribution.payout?.participants?.bep20_address || matchedContribution.payout?.participants?.wallet_address) && (
                  <div className="p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-blue-600" />
                        <p className="text-xs text-blue-700 font-semibold">BEP20 Wallet Address</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyToClipboard(
                          matchedContribution.payout?.participants?.bep20_address ||
                          matchedContribution.payout?.participants?.wallet_address,
                          "Wallet address"
                        )}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs font-mono font-bold text-blue-900 break-all bg-white p-2 rounded border border-blue-200">
                      {matchedContribution.payout?.participants?.bep20_address ||
                        matchedContribution.payout?.participants?.wallet_address}
                    </p>
                  </div>
                )}

                {matchedContribution.payout?.serial_number && (
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                    <DollarSign className="h-5 w-5 text-purple-600 shrink-0" />
                    <div>
                      <p className="text-xs text-purple-600 font-medium">Payout Serial Number</p>
                      <p className="text-lg font-black text-purple-900">{matchedContribution.payout.serial_number}</p>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Payment proof form */}
            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-5 w-5 text-green-600" />
                  Submit Payment Proof
                </CardTitle>
                {paymentProofSubmitted && (
                  <p className="text-sm text-green-700 font-medium">
                    Proof already submitted. Awaiting system approval.
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">

                <div className="space-y-2">
                  <Label htmlFor="transactionHash" className="text-slate-700 font-medium">
                    Transaction Hash / ID *
                  </Label>
                  <Input
                    id="transactionHash"
                    placeholder="0x1234567890abcdef..."
                    value={transactionHash}
                    onChange={(e) => setTransactionHash(e.target.value)}
                    disabled={paymentProofSubmitted}
                    className="h-11 font-mono text-sm border-green-300 focus:border-green-500 disabled:bg-slate-100 disabled:opacity-60"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Payment Screenshot *</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={paymentProofSubmitted}
                      onClick={() => document.getElementById("paymentSlip")?.click()}
                      className="flex-1 h-11 border-green-300 hover:border-green-500 hover:bg-green-50 disabled:opacity-60"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {paymentSlip ? paymentSlip.name : "Choose File"}
                    </Button>
                    <input
                      id="paymentSlip"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPaymentSlip(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-slate-500">Upload a screenshot of your transaction confirmation</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentNote" className="text-slate-700 font-medium">
                    Additional Note (Optional)
                  </Label>
                  <Textarea
                    id="paymentNote"
                    placeholder="Any extra info about your payment..."
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    disabled={paymentProofSubmitted}
                    className="min-h-[72px] border-green-300 focus:border-green-500 disabled:opacity-60 disabled:bg-slate-100"
                  />
                </div>

                <Button
                  onClick={handlePaymentSubmission}
                  disabled={isSubmittingPayment || !transactionHash || !paymentSlip || paymentProofSubmitted}
                  className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold text-base shadow-md disabled:opacity-60"
                >
                  {isSubmittingPayment ? (
                    <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Submitting...</>
                  ) : paymentProofSubmitted ? (
                    <><CheckCircle2 className="h-5 w-5 mr-2" />Proof Submitted</>
                  ) : (
                    <><Send className="h-5 w-5 mr-2" />Submit Payment Proof</>
                  )}
                </Button>

                {paymentProofSubmitted && (
                  <div className="flex items-start gap-2 bg-green-100 border border-green-300 rounded-lg p-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800">
                      Payment proof received. The system will review and approve your contribution shortly.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

        ) : hasPendingSubmission ? (
          /* ── PENDING: Waiting for system to match ── */
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-md">
              <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
                <CardContent className="p-8 text-center space-y-5">
                  <div className="h-16 w-16 rounded-full bg-amber-500 flex items-center justify-center mx-auto">
                    <Clock className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-amber-900 mb-2">Contribution Request Submitted</h2>
                    <p className="text-sm text-amber-800">
                      Your request was submitted <span className="font-semibold">{pendingSubmissionTime}</span>.
                      Waiting for admin to manually match it with a payout request of the same amount.
                    </p>
                  </div>
                  <div className="bg-white rounded-xl border border-amber-200 p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Amount</span>
                      <span className="font-bold text-slate-900">
                        ${PLANS.find((p) => p.id === selectedPlanId)?.amount ?? 100} USDT
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Status</span>
                      <Badge className="bg-amber-500/20 text-amber-700 border-amber-300">
                        <Clock className="h-3 w-3 mr-1" />
                        Awaiting Match
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-amber-700">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    <span>Checking for updates automatically...</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

        ) : (
          /* ── IDLE: Plan selector + request contribution ── */
          <div className="flex items-center justify-center min-h-[60vh] py-4">
            <div className="w-full max-w-lg space-y-6">

              {/* Cooldown notification bar */}
              {isOnCooldown && cooldownDate && (
                <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900">You have already contributed from this account</p>
                      <p className="text-xs text-amber-700 mt-1">
                        You will be eligible to contribute again on <span className="font-semibold">{cooldownDate}</span> (30-day cooldown period).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold text-slate-900">Choose Your Contribution Plan</h2>
                <p className="text-sm text-slate-500">Select a plan, contribute USDT, and earn 1.5x back upon approval</p>
              </div>

              {/* Plan cards */}
              <div className="grid grid-cols-1 gap-3">
                {PLANS.map((plan) => {
                  const isSelected = selectedPlanId === plan.id
                  return (
                    <button
                      key={plan.id}
                      onClick={() => !isOnCooldown && setSelectedPlanId(plan.id)}
                      className={`w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 ${
                        isSelected
                          ? `${plan.border} ${plan.bg} ring-2 ${plan.ring} ring-offset-2 shadow-md`
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                      } ${isOnCooldown ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Tier badge */}
                          <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${plan.accent} flex items-center justify-center text-xl shadow-sm`}>
                            {plan.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-slate-900">{plan.label}</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${plan.badge}`}>
                                {plan.label.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Contribute <span className="font-bold text-slate-700">${plan.amount} USDT</span> — earn back <span className="font-bold text-green-600">${plan.reward} USDT</span>
                            </p>
                          </div>
                        </div>
                        {/* Selection indicator + ROI */}
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            +80% ROI
                          </span>
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? `${plan.border} bg-gradient-to-br ${plan.accent}` : "border-slate-300 bg-white"
                          }`}>
                            {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                          </div>
                        </div>
                      </div>

                      {/* Progress bar showing reward vs contribution */}
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-3 gap-3 text-center">
                          <div>
                            <p className="text-xs text-slate-500">You Contribute</p>
                            <p className="text-sm font-bold text-slate-800">${plan.amount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">You Receive</p>
                            <p className="text-sm font-bold text-green-600">${plan.reward}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Net Gain</p>
                            <p className="text-sm font-bold text-emerald-600">+${plan.reward - plan.amount}</p>
                          </div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Submit button — disabled during cooldown, otherwise opens proof dialog */}
              {(() => {
                const plan = PLANS.find((p) => p.id === selectedPlanId) ?? PLANS[2]
                return (
                  <div className="space-y-2">
                    <Button
                      onClick={handleContributeRequest}
                      disabled={isRequestingContribution || !!isOnCooldown}
                      className={`w-full h-14 rounded-2xl font-semibold text-base shadow-lg transition-opacity ${
                        isOnCooldown
                          ? "bg-slate-200 text-slate-500 cursor-not-allowed shadow-none"
                          : `bg-gradient-to-r ${plan.accent} text-white hover:opacity-90`
                      }`}
                    >
                      {isOnCooldown ? (
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 flex-shrink-0" />
                          <span>Eligible again on {cooldownDate}</span>
                        </div>
                      ) : (
                        <>I Want to Contribute</>
                      )}
                    </Button>

                    {isOnCooldown && (
                      <p className="text-center text-xs text-amber-600 font-medium">
                        Your next contribution unlocks in{" "}
                        {Math.ceil(
                          (new Date(participantData.next_contribution_date).getTime() - Date.now()) / 86400000
                        )}{" "}
                        day(s)
                      </p>
                    )}
                  </div>
                )
              })()}

              <p className="text-center text-xs text-slate-400">
                Payment via USDT (BEP20). The system will match your request with an available payout.
              </p>

            </div>
          </div>
        )}

      </main>



    </div>
  )
}
