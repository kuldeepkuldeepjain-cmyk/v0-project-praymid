"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Lock, Check, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react"

interface ForgotPasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ForgotPasswordModal({ open, onOpenChange }: ForgotPasswordModalProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<"email" | "otp" | "password">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [maskedEmail, setMaskedEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

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
        setMaskedEmail(data.maskedEmail || email.trim())
        setStep("otp")
        toast({ title: "Verification code sent", description: `Check ${data.maskedEmail || email.trim()} for your six-digit code.` })
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
        description: "Failed to generate OTP. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/participant/forgot-password/check-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp }),
      })

      const data = await response.json()

      if (data.approved) {
        setStep("password")
        toast({ title: "Email verified", description: "Create a new password for your account." })
      } else {
        toast({
          title: "Waiting for Admin",
          description: "Admin hasn't approved your OTP yet. Please try again in a moment.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check approval. Please try again.",
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
        description: "Please enter both passwords",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are the same",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
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
          otp,
          newPassword,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Password Changed",
          description: "Your password has been updated successfully",
        })
        setStep("email")
        setEmail("")
        setOtp("")
        setNewPassword("")
        setConfirmPassword("")
        onOpenChange(false)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update password",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set password. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setStep("email")
    setEmail("")
    setOtp("")
    setNewPassword("")
    setConfirmPassword("")
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
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
                Enter Your Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="border-violet-300"
              />
              <p className="text-xs text-gray-500">We&apos;ll send a secure six-digit code to your registered email address.</p>
            </div>

            <Button
              onClick={handleSendOtp}
              disabled={loading || !email.trim()}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Send verification code
            </Button>
          </div>
        )}

        {/* Step 2: Verify email OTP */}
        {step === "otp" && (
          <div className="space-y-4">
            {/* OTP Display Card */}
            <Card className="border-2 border-violet-200 bg-violet-50">
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-gray-600 mb-2">Enter the code sent to {maskedEmail || email}</p>
                <div className="text-center">
                  <Input inputMode="numeric" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" aria-label="Email verification code" className="mb-3 text-center font-mono text-xl tracking-[0.4em]" />
                </div>
              </CardContent>
            </Card>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Secure verification</p>
                <p className="text-xs">Enter the six-digit code from your email. The code expires in 10 minutes and can only be used once.</p>
              </div>
            </div>

            {/* Continue Button */}
            <Button
              onClick={handleContinue}
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Verify code and continue
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep("email")
                setOtp("")
              }}
              className="w-full"
            >
              Back
            </Button>
          </div>
        )}

        {/* Step 3: Set New Password */}
        {step === "password" && (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex gap-2">
              <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">Email verified. Create a new password.</p>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  className="pr-10 border-violet-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="pr-10 border-violet-300"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Set Password Button */}
            <Button
              onClick={handleSetPassword}
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Update Password
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
