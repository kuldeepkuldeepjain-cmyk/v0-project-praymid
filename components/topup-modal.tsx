"use client"

import { useState, useEffect } from "react"
import { X, Wallet, Copy, CheckCircle2, AlertCircle, Loader2, Send, ShieldCheck, Clock3, LockKeyhole, ArrowRight } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { participantFetch } from "@/lib/auth"

interface TopUpModalProps {
  isOpen: boolean
  onClose: () => void
  currentBalance: number
  userId: string
  userEmail?: string
  onSuccess?: (amount: number) => void
  isFundedAccount?: boolean
  isInitialFundedTopUp?: boolean
}

type Step = "form" | "submitting" | "success"

export function TopUpModal({ isOpen, onClose, currentBalance, userId, userEmail, onSuccess, isFundedAccount = false, isInitialFundedTopUp = false }: TopUpModalProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<Step>("form")
  const [amount, setAmount] = useState("")
  const [txHash, setTxHash] = useState("")
  const [note, setNote] = useState("")
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [walletAddresses, setWalletAddresses] = useState<{ TRC20: string | null; BEP20: string | null; ERC20: string | null }>({ TRC20: null, BEP20: null, ERC20: null })
  const [network, setNetwork] = useState<"ALL" | "TRC20" | "BEP20" | "ERC20">("ALL")
  const [loadingAddress, setLoadingAddress] = useState(false)
  const [fundingMode, setFundingMode] = useState<"actual" | "funded">(isFundedAccount && isInitialFundedTopUp ? "funded" : "actual")

  // Fetch BEP20 address from DB when modal opens
  useEffect(() => {
    if (!isOpen) return
    setStep("form")
    setAmount("")
    setTxHash("")
    setNote("")
    setCopiedAddress(false)
    setErrorMessage("")
    setNetwork("ALL")
    setFundingMode(isFundedAccount && isInitialFundedTopUp ? "funded" : "actual")
    const fetchAddress = async () => {
      setLoadingAddress(true)
      try {
        const res = await fetch("/api/public/settings")
        const data = await res.json()
        setWalletAddresses({ TRC20: data.trc20_address || null, BEP20: data.bep20_address || data.topup_address || null, ERC20: data.erc20_address || null })
      } catch {
        setWalletAddresses({ TRC20: null, BEP20: null, ERC20: null })
      } finally {
        setLoadingAddress(false)
      }
    }
    fetchAddress()
  }, [isOpen])

  const copyAddress = () => {
    const walletAddress = network === "TRC20" ? walletAddresses.TRC20 : network === "ERC20" ? walletAddresses.ERC20 : walletAddresses.BEP20
    if (!walletAddress) return
    navigator.clipboard.writeText(walletAddress)
    setCopiedAddress(true)
    setTimeout(() => setCopiedAddress(false), 2000)
  }

  const selectedWalletAddress = network === "TRC20" ? walletAddresses.TRC20 : network === "ERC20" ? walletAddresses.ERC20 : walletAddresses.BEP20
  const parsedAmount = parseFloat(amount)
  const fundedTiers = { 100: 10000, 250: 25000, 500: 50000, 1000: 100000 } as const
  const isFundedAmountValid = !isFundedAccount || fundingMode !== "funded" || parsedAmount in fundedTiers
  const isAmountValid = !isNaN(parsedAmount) && parsedAmount >= 5 && isFundedAmountValid

  const handleSubmit = async () => {
    setErrorMessage("")

    if (!isAmountValid) {
      setErrorMessage(isFundedAccount && isInitialFundedTopUp ? "The first funded top-up must be $100, $250, $500, or $1,000" : "Please enter a valid amount (minimum $5)")
      return
    }
    if (!txHash.trim()) {
      setErrorMessage("Please enter your transaction hash")
      return
    }
    setStep("submitting")

    try {
      const response = await participantFetch("/api/participant/topup/submit", {
        method: "POST",
        body: JSON.stringify({
          userId,
          userEmail: userEmail || userId,
          amount: parsedAmount,
          transactionHash: txHash.trim(),
          network,
          fundingMode: isFundedAccount && isInitialFundedTopUp ? fundingMode : "actual",
          note: `[Payment method: ${network}]${note.trim() ? ` ${note.trim()}` : ""}`,
        }),
      })

      const data = await response.json().catch(() => ({ message: "The server returned an invalid response." }))

      if (!response.ok || !data.success) {
        setErrorMessage(data.message || data.error || "Submission failed. Please try again.")
        setStep("form")
        return
      }

      setStep("success")
      if (onSuccess) onSuccess(parsedAmount)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong. Please check your connection and try again.")
      setStep("form")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && step !== "submitting") onClose() }}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-lg bg-slate-50 border border-slate-200 shadow-2xl p-0 overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Payment gateway header */}
        <div className="relative flex-shrink-0 overflow-hidden bg-[#102a43] px-5 py-5 text-white">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-cyan-400/10 to-transparent" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10">
                <Wallet className="size-5 text-cyan-200" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-200/75">Secure checkout</p>
                <h2 className="mt-1 text-lg font-bold leading-tight">Add funds</h2>
                <p className="mt-1 max-w-xs text-[11px] leading-4 text-slate-300">Choose how you want to fund your trading account.</p>
              </div>
            </div>
            {step !== "submitting" && (
              <button onClick={onClose} aria-label="Close funding checkout" className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="relative mt-4 flex items-center gap-2 text-[10px] font-semibold text-slate-300">
            <ShieldCheck className="size-3.5 text-emerald-300" />
            <span>Payment request reviewed manually</span>
            <span className="text-slate-500">•</span>
            <span>USDT supported</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-px border-b border-slate-200 bg-slate-200">
          <div className="flex items-center justify-center gap-1.5 bg-white px-2 py-2 text-[9px] font-semibold text-slate-600"><LockKeyhole className="h-3.5 w-3.5 text-emerald-600" /> Secure review</div>
          <div className="flex items-center justify-center gap-1.5 bg-white px-2 py-2 text-[9px] font-semibold text-slate-600"><ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> Verified payment</div>
          <div className="flex items-center justify-center gap-1.5 bg-white px-2 py-2 text-[9px] font-semibold text-slate-600"><Clock3 className="h-3.5 w-3.5 text-amber-600" /> Up to 24h</div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-5 sm:px-6">

          {/* FORM STEP */}
          {(step === "form" || step === "submitting") && (
            <div className="space-y-3">

              {isFundedAccount && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Funding method</p>
                      <h3 className="mt-1 text-sm font-bold text-slate-900">Choose an account option</h3>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">Available now</span>
                  </div>
                  <div className="mt-3">
                    <Label htmlFor="funding-option" className="text-xs font-semibold text-slate-700">
                      Activate account with <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="funding-option"
                      value={fundingMode}
                      onChange={(event) => {
                        const nextMode = event.target.value as "actual" | "funded"
                        setFundingMode(nextMode)
                        setAmount("")
                      }}
                      disabled={step === "submitting"}
                      className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition-colors focus:border-[#1769aa] focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="actual">Normal Fund — exact amount sent</option>
                      <option value="funded" disabled={!isInitialFundedTopUp}>Funded-tier Account — choose a funded tier</option>
                    </select>
                    <p className="mt-1.5 text-[10px] text-slate-500">
                      {fundingMode === "funded"
                        ? "Select one funded tier below. This option is available for first activation only."
                        : "Use Normal Fund for regular deposits and future top-ups."}
                    </p>
                  </div>
                  {fundingMode === "funded" && isInitialFundedTopUp && (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800">All funded tiers</p>
                        <span className="text-[10px] font-semibold text-emerald-700">Select one</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {[100, 250, 500, 1000].map((tier) => (
                          <button
                            key={tier}
                            type="button"
                            onClick={() => setAmount(String(tier))}
                            disabled={step === "submitting"}
                            className={`rounded-lg border px-3 py-2.5 text-left text-[11px] transition-colors ${Number(amount) === tier ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-200 bg-white text-emerald-900 hover:border-emerald-400"}`}
                          >
                            <span className="block font-bold">${tier.toLocaleString()} payment</span>
                            <span className="mt-0.5 block opacity-80">${(tier * 100).toLocaleString()} funded account</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Order summary</p>
                    <h3 className="mt-1 text-sm font-bold text-slate-900">Payment details</h3>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">Send USDT to the verified address, then submit your transfer hash for review.</p>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-right">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-blue-500">Current balance</p>
                    <p className="font-mono text-sm font-bold text-blue-900">${currentBalance.toFixed(2)}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                  <div><p className="text-[9px] uppercase tracking-wide text-slate-400">Selected option</p><p className="mt-1 text-xs font-bold text-slate-800">{isFundedAccount && fundingMode === "funded" ? "Funded-tier Account" : "Normal Fund"}</p></div>
                  <div className="text-right"><p className="text-[9px] uppercase tracking-wide text-slate-400">Settlement</p><p className="mt-1 text-xs font-bold text-emerald-700">Manual review</p></div>
                </div>
              </div>

              {/* Network selector */}
              <div className="space-y-1.5">
                <Label htmlFor="topup-network" className="text-xs font-semibold text-slate-700">
                  Deposit Network <span className="text-red-500">*</span>
                </Label>
                <select
                  id="topup-network"
                  value={network}
                  onChange={(event) => setNetwork(event.target.value as typeof network)}
                  disabled={step === "submitting"}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60"
                >
                  <option value="ALL">All networks</option>
                  <option value="TRC20">TRC20 (TRON)</option>
                  <option value="BEP20">BEP20 (BSC)</option>
                  <option value="ERC20">ERC20 (Ethereum)</option>
                </select>
                <p className="text-[10px] text-slate-500">
                  Select the USDT network used for your transfer.
                </p>
              </div>

              {/* Wallet Address */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">{network === "ALL" ? "USDT Deposit Address" : `${network} Deposit Address (USDT)`}</Label>
                {loadingAddress ? (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2.5 animate-pulse">
                    <div className="h-3 bg-slate-200 rounded flex-1" />
                    <div className="h-6 w-6 bg-slate-200 rounded" />
                  </div>
                ) : selectedWalletAddress ? (
                  <div className="rounded-xl border border-blue-200 bg-white overflow-hidden shadow-sm">
                    {/* QR-like header strip */}
                    <div className="px-3 py-2 bg-[#163e5c] flex items-center justify-between">
                      <span className="text-[10px] font-bold text-white tracking-widest uppercase">{network === "ALL" ? "All Networks" : `${network} Network`}</span>
                      <span className="text-[10px] text-white/80">USDT Only</span>
                    </div>
                    {/* Address row */}
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <code className="flex-1 text-[11px] text-violet-900 font-mono break-all leading-snug">
                        {selectedWalletAddress}
                      </code>
                      <button
                        onClick={copyAddress}
                        className="flex-shrink-0 p-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 transition-colors"
                        title="Copy address"
                      >
                        {copiedAddress
                          ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                          : <Copy className="h-4 w-4 text-violet-600" />}
                      </button>
                    </div>
                    {copiedAddress && (
                      <p className="text-[10px] text-green-700 font-medium text-center pb-1.5">Address copied!</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <p className="text-[11px] text-amber-700">
                      Deposit address not set. Please contact admin.
                    </p>
                  </div>
                )}
                <p className="text-[10px] text-slate-500">
                  Send USDT using the selected network to this address, then fill in your transaction details below.
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                  <Label htmlFor="topup-amount" className="text-xs font-semibold text-slate-700">
                  Amount Sent (USDT) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="topup-amount"
                    type="number"
                    placeholder="Exact amount sent"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-9 pr-14 text-sm border border-slate-200 focus:border-violet-500 rounded-lg"
                    disabled={step === "submitting"}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    USDT
                  </span>
                </div>
                {amount && !isAmountValid && (
                  <p className="text-[10px] text-red-500">
                    {isFundedAccount && isInitialFundedTopUp && fundingMode === "funded"
                      ? "Choose one funded amount: $100, $250, $500, or $1,000"
                      : "Minimum amount is $5 USDT"}
                  </p>
                )}
              </div>

              {/* Transaction Hash */}
              <div className="space-y-1">
                <Label htmlFor="topup-txhash" className="text-xs font-semibold text-slate-700">
                  Transaction Hash <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="topup-txhash"
                  placeholder="0x1234567890abcdef..."
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  className="h-9 font-mono text-xs border border-slate-200 focus:border-violet-500 rounded-lg"
                  disabled={step === "submitting"}
                />
              </div>

              {/* Optional note */}
              <div className="space-y-1">
                <Label htmlFor="topup-note" className="text-xs font-semibold text-slate-700">
                  Note <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <Input
                  id="topup-note"
                  placeholder="Additional info for admin..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-9 text-sm border border-slate-200 focus:border-violet-500 rounded-lg"
                  disabled={step === "submitting"}
                />
              </div>

              {/* Current balance info */}
              <div className="flex justify-between text-[10px] text-slate-500 border-t border-slate-100 pt-2">
                <span>Current balance</span>
                <span className="font-semibold text-slate-700">${currentBalance.toFixed(2)} USDT</span>
              </div>

              {/* Error */}
              {errorMessage && (
                <div className="rounded-lg p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={step === "submitting"}
                className="w-full h-10 rounded-lg font-semibold text-sm text-white"
                style={{
                  background: step === "submitting" ? "#cbd5e1" : "linear-gradient(135deg, #7c3aed, #6366f1)",
                  boxShadow: step !== "submitting" ? "0 4px 14px rgba(124,58,237,0.35)" : "none",
                }}
              >
                {step === "submitting" ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" />Submit Request</>
                )}
              </Button>
            </div>
          )}

          {/* SUCCESS STEP */}
          {step === "success" && (
            <div className="py-4 text-center space-y-4">
              <div
                className="w-14 h-14 mx-auto rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 6px 18px rgba(16,185,129,0.3)" }}
              >
                <CheckCircle2 className="h-7 w-7 text-white" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-emerald-600 mb-1">Request Submitted!</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your top-up of{" "}
                  <span className="font-bold text-slate-800">${parsedAmount.toFixed(2)} USDT</span>{" "}
                  is pending admin review. Your wallet will be credited within 24 hours.
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-left space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-semibold text-slate-800">${parsedAmount.toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Status</span>
                  <span className="font-semibold text-amber-600">Pending Review</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Processing</span>
                  <span className="font-semibold text-slate-800">Up to 24 hours</span>
                </div>
              </div>

              <Button
                onClick={onClose}
                className="w-full h-10 rounded-lg font-semibold text-sm text-white"
style={{ background: "linear-gradient(135deg, #0f2438, #163e5c)" }}
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
