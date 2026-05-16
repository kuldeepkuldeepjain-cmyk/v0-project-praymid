"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Phone, MessageCircle, Lock, Copy, Check, AlertCircle, Loader2 } from "lucide-react"

interface ForgotPasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ForgotPasswordModal({ open, onOpenChange }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<"email" | "otp" | "password">("email")
  const [email, setEmail] = useState("")
  const [mobileNumber, setMobileNumber] = useState("")
  const [otp, setOtp] = useState("")
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
        setMobileNumber(data.mobileNumber)
        setStep("otp")
        toast({
          title: "OTP Generated",
          description: `A 6-digit code has been generated. Send it to the WhatsApp number shown.`,
          variant: "default",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Could not generate OTP",
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

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      toast({
        title: "OTP Required",
        description: "Please enter the OTP",
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
          otp: otp.trim(),
          purpose: "password_reset",
          email 
        }),
      })

      const data = await response.json()

      if (data.approved) {
        setStep("password")
        toast({
          title: "OTP Approved",
          description: "Admin approved your OTP. You can now change your password.",
          variant: "default",
        })
      } else {
        toast({
          title: "OTP Not Approved",
          description: data.message || "Admin has not approved this OTP yet. Please wait.",
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
          email,
          otp,
          newPassword,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Password Changed",
          description: "Your password has been successfully updated. You can now login.",
          variant: "default",
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
                Enter Your Registered Email
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
              disabled={loading || !email}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating OTP...
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Generate OTP
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 2: OTP Entry */}
        {step === "otp" && (
          <div className="space-y-4">
            {/* WhatsApp Number Card */}
            <Card className="border-2 border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-green-600" />
                  <p className="text-xs font-medium text-green-700">Send code to this WhatsApp number:</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-green-200">
                  <p className="text-base font-bold text-gray-900 flex-1">{mobileNumber}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(mobileNumber)}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Alert Box */}
            <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                Send a WhatsApp message with your 6-digit code to the number above, then enter it here.
              </p>
            </div>

            {/* OTP Input */}
            <div className="space-y-2">
              <Label htmlFor="otp" className="text-sm font-medium">
                Enter 6-Digit OTP Code
              </Label>
              <Input
                id="otp"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.toUpperCase())}
                disabled={loading}
                className="h-12 text-center text-2xl font-mono tracking-widest border-violet-300 focus:border-violet-500"
              />
            </div>

            {/* Info Message */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                Admin is reviewing your OTP. This may take a few minutes.
              </p>
            </div>

            <Button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking Approval...
                </>
              ) : (
                "Verify OTP"
              )}
            </Button>

            <Button
              onClick={() => {
                setStep("email")
                setOtp("")
              }}
              variant="outline"
              className="w-full"
            >
              Back
            </Button>
          </div>
        )}

        {/* Step 3: Password Reset */}
        {step === "password" && (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex gap-2">
              <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">OTP approved! You can now set a new password.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium">
                New Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                className="h-10 border-violet-300 focus:border-violet-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="h-10 border-violet-300 focus:border-violet-500"
              />
            </div>

            <Button
              onClick={handleSetPassword}
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating Password...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
