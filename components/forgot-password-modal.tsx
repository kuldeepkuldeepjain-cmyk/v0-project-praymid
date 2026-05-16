"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Lock, Copy, Check, AlertCircle, Loader2, MessageCircle } from "lucide-react"

const ADMIN_WHATSAPP = "+995574450590"

interface ForgotPasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ForgotPasswordModal({ open, onOpenChange }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<"email" | "otp" | "password">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [generatedOtp, setGeneratedOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const handleSendOtp = async () => {
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your registered email address",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/participant/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedOtp(data.otp || "")
        setStep("otp")
        toast({
          title: "OTP Generated",
          description: "Send the 6-digit code to WhatsApp. Once admin approves, enter it below.",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to generate OTP",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const sendOtpOnWhatsApp = () => {
    if (!generatedOtp) {
      toast({
        title: "Error",
        description: "OTP not generated",
        variant: "destructive",
      })
      return
    }
    const msg = `My OTP: ${generatedOtp}`
    window.open(`https://wa.me/${ADMIN_WHATSAPP.replace(/\D/g, "")}?text=${msg}`, "_blank")
  }

  const copyOtp = () => {
    if (generatedOtp) {
      navigator.clipboard.writeText(generatedOtp)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "OTP Copied",
        description: "Paste it in WhatsApp message",
      })
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      toast({
        title: "OTP Required",
        description: "Please enter the OTP code",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/admin/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          purpose: "password_reset",
        }),
      })

      const data = await response.json()

      if (data.success) {
        setStep("password")
        toast({
          title: "OTP Verified",
          description: "Admin has approved your OTP. Now set your new password.",
        })
      } else {
        toast({
          title: "OTP Not Approved",
          description: data.error || "Admin has not approved your OTP yet. Please wait.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify OTP. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Password Required",
        description: "Please enter and confirm your new password",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/participant/forgot-password/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Password Changed",
          description: "Your password has been successfully updated. You can now login.",
        })
        setStep("email")
        setEmail("")
        setOtp("")
        setGeneratedOtp("")
        setNewPassword("")
        setConfirmPassword("")
        onOpenChange(false)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to change password",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change password. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-violet-600" />
            Reset Password
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Email Input */}
        {step === "email" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Registered Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-10 border-violet-300 focus:border-violet-500"
              />
            </div>

            <Button
              onClick={handleSendOtp}
              disabled={loading || !email.trim()}
              className="w-full bg-violet-600 hover:bg-violet-700 h-10"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating OTP...
                </>
              ) : (
                "Generate OTP"
              )}
            </Button>

            <p className="text-xs text-gray-600 text-center">
              Enter your email to generate a password reset code.
            </p>
          </div>
        )}

        {/* Step 2: OTP Entry */}
        {step === "otp" && (
          <div className="space-y-4">
            {/* Generated OTP Card */}
            <Card className="border-2 border-violet-200 bg-violet-50">
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-violet-700 mb-2">Your 6-Digit Code:</p>
                <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-violet-200">
                  <p className="text-lg font-bold text-gray-900 flex-1 font-mono tracking-widest">{generatedOtp}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={copyOtp}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-violet-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Send on WhatsApp Button */}
            <Button
              type="button"
              onClick={sendOtpOnWhatsApp}
              className="w-full bg-green-600 hover:bg-green-700 h-10"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Send on WhatsApp: {ADMIN_WHATSAPP}
            </Button>

            {/* Info Box */}
            <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                Send the above code to {ADMIN_WHATSAPP} on WhatsApp. Admin will approve it, then enter the code below.
              </p>
            </div>

            {/* OTP Input for Verification */}
            <div className="space-y-2">
              <Label htmlFor="otp-verify" className="text-sm font-medium">
                Enter the OTP Code (after admin approves)
              </Label>
              <Input
                id="otp-verify"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.toUpperCase())}
                disabled={loading}
                className="h-12 text-center text-2xl font-mono tracking-widest border-violet-300 focus:border-violet-500"
              />
            </div>

            {/* Wait Message */}
            <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                Waiting for admin approval. This may take a few minutes.
              </p>
            </div>

            <Button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full bg-violet-600 hover:bg-violet-700 h-10"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        )}

        {/* Step 3: Password Reset */}
        {step === "password" && (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex gap-2">
              <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">
                OTP approved! Now set your new password.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                New Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                className="h-10 border-violet-300 focus:border-violet-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-medium">
                Confirm Password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="h-10 border-violet-300 focus:border-violet-500"
              />
            </div>

            <Button
              onClick={handleSetPassword}
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full bg-violet-600 hover:bg-violet-700 h-10"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Change Password"
              )}
            </Button>

            <p className="text-xs text-gray-600 text-center">
              Password must be at least 6 characters long.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
