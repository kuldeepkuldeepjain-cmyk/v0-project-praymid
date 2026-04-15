"use client"

import { useState, useEffect } from "react"
import { X, Wallet, Copy, CheckCircle2, AlertCircle, Loader2, Upload, Send } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

const COMPANY_WALLET_ADDRESS = "0x77704a0FBD161F3f615e1D550bB0EE50a469B938"

interface TopUpModalProps {
  isOpen: boolean
  onClose: () => void
  currentBalance: number
  userId: string
  userEmail?: string
  onSuccess?: (amount: number) => void
}

type Step = "form" | "submitting" | "success"

export function TopUpModal({ isOpen, onClose, currentBalance, userId, userEmail, onSuccess }: TopUpModalProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<Step>("form")
  const [amount, setAmount] = useState("")
  const [txHash, setTxHash] = useState("")
  const [note, setNote] = useState("")
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("form")
      setAmount("")
      setTxHash("")
      setNote("")
      setScreenshot(null)
      setCopiedAddress(false)
      setErrorMessage("")
    }
  }, [isOpen])

  const copyAddress = () => {
    navigator.clipboard.writeText(COMPANY_WALLET_ADDRESS)
    setCopiedAddress(true)
    setTimeout(() => setCopiedAddress(false), 2000)
  }

  const parsedAmount = parseFloat(amount)
  const isAmountValid = !isNaN(parsedAmount) && parsedAmount >= 5

  const handleSubmit = async () => {
    setErrorMessage("")

    if (!isAmountValid) {
      setErrorMessage("Please enter a valid amount (minimum $5)")
      return
    }
    if (!txHash.trim()) {
      setErrorMessage("Please enter your transaction hash")
      return
    }
    if (!screenshot) {
      setErrorMessage("Please upload your payment screenshot")
      return
    }

    setStep("submitting")

    try {
      // Convert screenshot to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(screenshot)
      })

      if (base64.length > 10_000_000) {
        setErrorMessage("Screenshot must be under 10MB.")
        setStep("form")
        return
      }

      const response = await fetch("/api/participant/topup/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          userEmail: userEmail || userId,
          amount: parsedAmount,
          transactionHash: txHash.trim(),
          screenshotBase64: base64,
          note: note.trim() || null,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        setErrorMessage(data.message || "Submission failed. Please try again.")
        setStep("form")
        return
      }

      setStep("success")
      if (onSuccess) onSuccess(parsedAmount)
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong. Please try again.")
      setStep("form")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && step !== "submitting") onClose() }}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-sm bg-white border-none shadow-2xl p-0 overflow-hidden max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div
          className="relative flex items-center gap-2.5 px-4 py-3 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7c3aed, #6366f1)" }}
        >
          <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <Wallet className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white leading-tight">Top Up Wallet</h2>
            <p className="text-[10px] text-white/70">Send USDT (BEP20) and submit proof</p>
          </div>
          {step !== "submitting" && (
            <button
              onClick={onClose}
              className="absolute right-3 top-3 rounded-md p-1 bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          )}
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-4">

          {/* FORM STEP */}
          {(step === "form" || step === "submitting") && (
            <div className="space-y-3">

              {/* Network badge */}
              <div className="flex justify-center">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  BEP20 Network (BSC) — USDT only
                </span>
              </div>

              {/* Wallet Address */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">System Wallet Address</Label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2">
                  <code className="flex-1 text-[10px] text-slate-800 font-mono truncate">
                    {COMPANY_WALLET_ADDRESS}
                  </code>
                  <button
                    onClick={copyAddress}
                    className="flex-shrink-0 p-1 rounded hover:bg-slate-200 transition-colors"
                    title="Copy address"
                  >
                    {copiedAddress
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      : <Copy className="h-3.5 w-3.5 text-slate-500" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Send USDT (BEP20) to this address, then fill in the details below.
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <Label htmlFor="topup-amount" className="text-xs font-semibold text-slate-700">
                  Amount Sent <span className="text-red-500">*</span>
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
                  <p className="text-[10px] text-red-500">Minimum amount is $5 USDT</p>
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

              {/* Screenshot */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Payment Screenshot <span className="text-red-500">*</span>
                </Label>
                <label
                  htmlFor="topup-screenshot"
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border border-dashed cursor-pointer transition-colors ${
                    screenshot
                      ? "border-green-400 bg-green-50"
                      : "border-slate-300 bg-slate-50 hover:border-violet-400 hover:bg-violet-50"
                  } ${step === "submitting" ? "pointer-events-none opacity-60" : ""}`}
                >
                  <input
                    id="topup-screenshot"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={step === "submitting"}
                    onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                  />
                  {screenshot ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-green-700 font-semibold truncate">{screenshot.name}</p>
                        <p className="text-[10px] text-green-600">Tap to change</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-600 font-medium">Tap to upload screenshot</p>
                        <p className="text-[10px] text-slate-400">PNG, JPG up to 10MB</p>
                      </div>
                    </>
                  )}
                </label>
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
                disabled={step === "submitting" || !isAmountValid || !txHash.trim() || !screenshot}
                className="w-full h-10 rounded-lg font-semibold text-sm text-white"
                style={{
                  background: (step === "submitting" || !isAmountValid || !txHash.trim() || !screenshot)
                    ? "#cbd5e1"
                    : "linear-gradient(135deg, #7c3aed, #6366f1)",
                  boxShadow: (step !== "submitting" && isAmountValid && txHash.trim() && screenshot)
                    ? "0 4px 14px rgba(124,58,237,0.35)"
                    : "none",
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
                style={{ background: "linear-gradient(135deg, #7c3aed, #6366f1)" }}
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
