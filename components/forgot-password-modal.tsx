"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { Loader2, Mail, Lock, CheckCircle2, Phone, ArrowRight, ArrowLeft } from "lucide-react"

interface ForgotPasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ForgotPasswordModal({ open, onOpenChange }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<"email" | "otp" | "password" | "success">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [maskedMobile, setMaskedMobile] = useState("")

  const handleSendOtp = async () => {
    if (!email.trim()) {
      toast({ title: "Error", description: "Please enter your email", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/participant/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: "Error", description: data.error || "Failed to send OTP", variant: "destructive" })
        return
      }

      setMaskedMobile(data.mobile_masked)
      setStep("otp")
      toast({
        title: "Success",
        description: `OTP sent to ${data.mobile_masked}. Please wait for admin approval.`,
      })
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      toast({ title: "Error", description: "Please enter the OTP", variant: "destructive" })
      return
    }

    if (otp.length !== 6) {
      toast({ title: "Error", description: "OTP must be 6 digits", variant: "destructive" })
      return
    }

    setStep("password")
  }

  const handleSetPassword = async () => {
    if (!newPassword.trim()) {
      toast({ title: "Error", description: "Please enter a new password", variant: "destructive" })
      return
    }

    if (newPassword.length < 4) {
      toast({ title: "Error", description: "Password must be at least 4 characters", variant: "destructive" })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/participant/forgot-password/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword: newPassword.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: "Error", description: data.error || "Failed to reset password", variant: "destructive" })
        return
      }

      setStep("success")
      toast({ title: "Success", description: "Password reset successfully!" })

      setTimeout(() => {
        onOpenChange(false)
        setStep("email")
        setEmail("")
        setOtp("")
        setNewPassword("")
        setConfirmPassword("")
      }, 2000)
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (step !== "success") {
      onOpenChange(false)
      setStep("email")
      setEmail("")
      setOtp("")
      setNewPassword("")
      setConfirmPassword("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {step === "email" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-violet-600" />
                Forgot Password
              </DialogTitle>
              <DialogDescription>
                Enter your email address and we'll send an OTP to your registered WhatsApp number
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2"
                  disabled={loading}
                />
              </div>
              <Button
                onClick={handleSendOtp}
                disabled={loading || !email.trim()}
                className="w-full bg-violet-600 hover:bg-violet-700"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                Send OTP
              </Button>
            </div>
          </>
        )}

        {step === "otp" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-violet-600" />
                Verify OTP
              </DialogTitle>
              <DialogDescription>
                Enter the 6-digit OTP sent to {maskedMobile}. Admin approval is required.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="otp">OTP Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="mt-2 text-center text-2xl font-mono tracking-widest"
                  maxLength={6}
                  disabled={loading}
                />
                <p className="text-xs text-slate-500 mt-2">
                  Please ensure your OTP is approved by admin before proceeding
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("email")}
                  className="flex-1"
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length !== 6}
                  className="flex-1 bg-violet-600 hover:bg-violet-700"
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                  Next
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "password" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-violet-600" />
                Set New Password
              </DialogTitle>
              <DialogDescription>
                Create a new password for your account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-2"
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-2"
                  disabled={loading}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("otp")}
                  className="flex-1"
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSetPassword}
                  disabled={loading || !newPassword || newPassword !== confirmPassword}
                  className="flex-1 bg-violet-600 hover:bg-violet-700"
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Reset Password
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Success
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Password Reset Successful</p>
                <p className="text-sm text-slate-600">You can now login with your new password</p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
