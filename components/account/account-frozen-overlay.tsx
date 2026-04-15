"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FlowChainLogo } from "@/components/flowchain-logo"
import {
  Lock,
  AlertTriangle,
  CreditCard,
  Wallet,
  Copy,
  Check,
  Upload,
  X,
  QrCode,
  Clock,
  ShieldAlert,
  HelpCircle,
  Mail,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AccountFrozenOverlayProps {
  activationFee: number
  onPaymentSubmit: (screenshot: File, paymentMethod: "crypto" | "bank") => Promise<void>
  pendingPayment?: boolean
  rejectionReason?: string
}

const ADMIN_WALLET_ADDRESS = "0xFlowChain1234567890abcdef1234567890abcdef"
const BANK_DETAILS = {
  bankName: "FlowChain International Bank",
  accountName: "FlowChain Holdings Ltd",
  accountNumber: "1234567890",
  routingNumber: "021000021",
  swiftCode: "FLOWUS33",
}

export function AccountFrozenOverlay({
  activationFee,
  onPaymentSubmit,
  pendingPayment = false,
  rejectionReason,
}: AccountFrozenOverlayProps) {
  const { toast } = useToast()
  const [paymentMethod, setPaymentMethod] = useState<"crypto" | "bank">("crypto")
  const [copied, setCopied] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast({ title: "Copied", description: "Address copied to clipboard" })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: "Copy failed", description: "Please copy manually", variant: "destructive" })
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid file", description: "Please upload an image", variant: "destructive" })
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max 5MB allowed", variant: "destructive" })
        return
      }
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast({ title: "Screenshot required", description: "Please upload payment proof", variant: "destructive" })
      return
    }
    setIsSubmitting(true)
    try {
      await onPaymentSubmit(selectedFile, paymentMethod)
      toast({ title: "Submitted", description: "Your payment is being reviewed" })
    } catch (error) {
      toast({ title: "Failed", description: "Please try again", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto mesh-gradient-light">
      <div className="max-w-2xl w-full space-y-6 py-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#e85d3b] to-[#d94a2b] flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Lock className="h-10 w-10 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Account Activation Required</h1>
            <p className="text-slate-500 max-w-md mx-auto">
              To access all FlowChain features and start participating, a one-time activation fee is required.
            </p>
          </div>
        </div>

        {/* Warning Alert */}
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-800 font-semibold">Account Restricted</AlertTitle>
          <AlertDescription className="text-amber-700">
            Your account is currently frozen. All activities are restricted until the activation fee is paid.
          </AlertDescription>
        </Alert>

        {/* Rejection Notice */}
        {rejectionReason && (
          <Alert className="bg-red-50 border-red-200">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-red-800 font-semibold">Previous Payment Rejected</AlertTitle>
            <AlertDescription className="text-red-700">{rejectionReason}</AlertDescription>
          </Alert>
        )}

        {/* Pending Status */}
        {pendingPayment && (
          <Card className="card-elevated border-violet-200">
            <CardContent className="p-6 text-center">
              <div className="h-16 w-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-violet-600 animate-pulse" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Payment Under Review</h3>
              <p className="text-slate-500 mb-4">
                Your activation payment is being verified. This usually takes 1-24 hours.
              </p>
              <Badge className="bg-violet-100 text-violet-700 border border-violet-200">Processing</Badge>
            </CardContent>
          </Card>
        )}

        {/* Payment Form */}
        {!pendingPayment && (
          <Card className="card-elevated">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-slate-900">Activation Fee Payment</CardTitle>
                  <CardDescription className="text-slate-500">
                    One-time payment to activate your account
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-[#e85d3b]">${activationFee}</p>
                  <p className="text-sm text-slate-500">One-time fee</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Payment Method Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700">Select Payment Method</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setPaymentMethod("crypto")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === "crypto"
                        ? "bg-violet-50 border-violet-400 text-slate-900"
                        : "bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:bg-violet-50/50"
                    }`}
                  >
                    <Wallet className="h-6 w-6 mx-auto mb-2" />
                    <p className="font-medium">Cryptocurrency</p>
                    <p className="text-xs opacity-70">USDT (BEP20/ERC20)</p>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("bank")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === "bank"
                        ? "bg-violet-50 border-violet-400 text-slate-900"
                        : "bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:bg-violet-50/50"
                    }`}
                  >
                    <CreditCard className="h-6 w-6 mx-auto mb-2" />
                    <p className="font-medium">Bank Transfer</p>
                    <p className="text-xs opacity-70">Wire Transfer</p>
                  </button>
                </div>
              </div>

              {/* Payment Details */}
              {paymentMethod === "crypto" ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-slate-600">Wallet Address (USDT)</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(ADMIN_WALLET_ADDRESS)}
                        className="h-8 text-violet-600 hover:bg-violet-50"
                      >
                        {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <code className="text-sm font-mono text-slate-900 break-all">{ADMIN_WALLET_ADDRESS}</code>
                  </div>
                  <div className="flex items-center justify-center p-6 bg-white rounded-xl border border-slate-200">
                    <QrCode className="h-32 w-32 text-slate-800" />
                  </div>
                  <p className="text-center text-sm text-slate-600">
                    Send exactly <span className="text-[#e85d3b] font-semibold">${activationFee} USDT</span> to the
                    address above
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    {Object.entries({
                      "Bank Name": BANK_DETAILS.bankName,
                      "Account Name": BANK_DETAILS.accountName,
                      "Account Number": BANK_DETAILS.accountNumber,
                      "Routing Number": BANK_DETAILS.routingNumber,
                      "SWIFT Code": BANK_DETAILS.swiftCode,
                    }).map(([label, value]) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">{label}</span>
                        <span className="text-sm font-medium text-slate-900">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Screenshot Upload */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700">Upload Payment Screenshot</label>
                {!selectedFile ? (
                  <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-violet-400 hover:bg-violet-50/50 transition-all">
                    <Upload className="h-10 w-10 text-slate-400 mb-2" />
                    <p className="text-sm text-slate-600">Click to upload screenshot</p>
                    <p className="text-xs text-slate-400">PNG, JPG up to 5MB</p>
                    <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  </label>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200">
                    <img src={previewUrl! || "/placeholder.svg"} alt="Preview" className="w-full h-48 object-cover" />
                    <button
                      onClick={removeFile}
                      className="absolute top-2 right-2 h-8 w-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={!selectedFile || isSubmitting}
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-[#e85d3b] to-[#d94a2b] hover:from-[#d94a2b] hover:to-[#c4422a] text-white rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  `Submit Payment ($${activationFee} USD)`
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Need Help?</p>
                <p className="text-xs text-slate-500">Contact support for payment issues</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-200 text-slate-600 hover:bg-slate-50 bg-transparent"
              >
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <FlowChainLogo size="sm" />
          <p className="text-xs text-slate-400 mt-2">Secure payment processing</p>
        </div>
      </div>
    </div>
  )
}
