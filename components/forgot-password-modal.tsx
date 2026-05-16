"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Loader2, CheckCircle2, AlertCircle, Clock, Smartphone } from "lucide-react"
import { toast } from "@/hooks/use-toast"

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
  const [mobileMasked, setMobileMasked] = useState("")
  const [otpExpiry, setOtpExpiry] = useState(0)

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
        body: JSON.stringify({ email: email.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: "Error", description: data.error || "Failed to send OTP", variant: "destructive" })
        return
      }

      setMobileMasked(data.mobile_masked || "")
      setOtpExpiry(data.expiresIn || 600)
      setStep("otp")
      toast({ title: "Success", description: "OTP sent to your WhatsApp number" })
    } catch (err) {
      toast({ title: "Error", description: "Failed to send OTP", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSetPassword = async () => {
    if (!otp.trim()) {
      toast({ title: "Error", description: "Please enter the OTP code", variant: "destructive" })
      return
    }

    if (!newPassword.trim()) {
      toast({ title: "Error", description: "Please enter a new password", variant: "destructive" })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" })
      return
    }

    if (newPassword.length < 4) {
      toast({ title: "Error", description: "Password must be at least 4 characters", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/participant/forgot-password/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp, newPassword })
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 403) {
          toast({ title: "Pending", description: "Please wait for admin to approve your OTP", variant: "default" })
        } else {
          toast({ title: "Error", description: data.error || "Failed to update password", variant: "destructive" })
        }
        return
      }

      setStep("success")
      toast({ title: "Success", description: "Password updated successfully!" })
    } catch (err) {
      toast({ title: "Error", description: "Failed to update password", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep("email")
    setEmail("")
    setOtp("")
    setNewPassword("")
    setConfirmPassword("")
    setMobileMasked("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white">
        {/* Header */}
        <DialogHeader className="bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white p-6 pb-4">
          <DialogTitle className="text-xl font-bold">Reset Password</DialogTitle>
          <p className="text-sm text-purple-100 mt-2">Secure password recovery via WhatsApp OTP</p>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Step 1: Email */}
          {step === "email" && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
                  Email Address
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 border-2 border-slate-200 focus:border-[#7c3aed] focus:ring-[#7c3aed]/20 transition-all"
                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  />
                </div>
                <p className="text-xs text-slate-500">We'll send a 6-digit code to your registered WhatsApp number</p>
              </div>

              <Button
                onClick={handleSendOtp}
                disabled={loading || !email.trim()}
                className="w-full h-11 bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] hover:shadow-lg transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  "Send OTP via WhatsApp"
                )}
              </Button>
            </div>
          )}

          {/* Step 2: OTP */}
          {step === "otp" && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <Smartphone className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">OTP Sent</p>
                  <p className="text-sm text-blue-700">A 6-digit code has been sent to {mobileMasked}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp" className="text-sm font-semibold text-slate-700">
                  Enter 6-Digit Code
                </Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="h-11 text-center font-mono text-lg font-bold letter-spacing-wide border-2 border-slate-200 focus:border-[#7c3aed]"
                  autoFocus
                />
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Wait for admin approval (Code expires in {otpExpiry}s)
                </p>
              </div>

              <Button
                onClick={handleSetPassword}
                disabled={loading || otp.length !== 6}
                className="w-full h-11 bg-gradient-to-r from-[#7c3aed] to-[#6d28d9]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Proceed to Change Password"
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => setStep("email")}
                className="w-full"
                disabled={loading}
              >
                Try Different Email
              </Button>
            </div>
          )}

          {/* Step 3: New Password */}
          {step === "password" && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-sm font-semibold text-green-900">OTP Approved</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-semibold text-slate-700">
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-11 border-2 border-slate-200 focus:border-[#7c3aed]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 border-2 border-slate-200 focus:border-[#7c3aed]"
                />
              </div>

              <Button
                onClick={handleSetPassword}
                disabled={loading || !newPassword || newPassword !== confirmPassword}
                className="w-full h-11 bg-gradient-to-r from-[#7c3aed] to-[#6d28d9]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </div>
          )}

          {/* Step 4: Success */}
          {step === "success" && (
            <div className="space-y-4 text-center animate-fade-in">
              <div className="flex justify-center">
                <div className="bg-green-100 p-4 rounded-full">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">Password Updated!</p>
                <p className="text-sm text-slate-500 mt-2">Your password has been successfully reset.</p>
              </div>
              <Button
                onClick={handleClose}
                className="w-full h-11 bg-gradient-to-r from-[#7c3aed] to-[#6d28d9]"
              >
                Login with New Password
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
