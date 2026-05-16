"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Phone, MessageCircle, Lock, Copy, Check, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react"

const ADMIN_WHATSAPP = "+995574450590"

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
  const [copied, setCopied] = useState(false)
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
        setOtp(data.otp)
        setStep("otp")
        toast({
          title: "OTP Generated",
          description: "Copy the code and send it to admin on WhatsApp",
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
        description: "Failed to generate OTP. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyOtp = () => {
    navigator.clipboard.writeText(otp)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({
      title: "Copied",
      description: "OTP copied to clipboard",
    })
  }

  const sendOtpOnWhatsApp = () => {
    const msg = `My OTP for password reset: ${otp}`
    window.open(`https://wa.me/${ADMIN_WHATSAPP.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank")
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
        toast({
          title: "OTP Approved",
          description: "Admin has approved your OTP. Set your new password.",
        })
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
              <p className="text-xs text-gray-500">We'll send an OTP to your registered WhatsApp number</p>
            </div>

            <Button
              onClick={handleSendOtp}
              disabled={loading || !email.trim()}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Generate OTP
            </Button>
          </div>
        )}

        {/* Step 2: Send OTP on WhatsApp */}
        {step === "otp" && (
          <div className="space-y-4">
            {/* OTP Display Card */}
            <Card className="border-2 border-violet-200 bg-violet-50">
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-gray-600 mb-2">Your OTP Code:</p>
                <div className="text-center">
                  <p className="text-3xl font-bold text-violet-700 font-mono tracking-widest mb-3">{otp}</p>
                  <Button
                    type="button"
                    onClick={copyOtp}
                    variant="outline"
                    size="sm"
                    className="w-full border-violet-300 hover:bg-violet-100"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-green-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy OTP
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp Number Card */}
            <Card className="border-2 border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-green-700 mb-2">Send to Admin:</p>
                <p className="text-lg font-bold text-green-900 text-center mb-3">{ADMIN_WHATSAPP}</p>
              </CardContent>
            </Card>

            {/* Send on WhatsApp Button */}
            <Button
              type="button"
              onClick={sendOtpOnWhatsApp}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Send OTP on WhatsApp
            </Button>

            {/* Instructions */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Instructions:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-xs">
                  <li>Copy the OTP code above</li>
                  <li>Send it to the admin on WhatsApp</li>
                  <li>Admin will approve it in the OTP panel</li>
                  <li>Click Continue once you've sent the OTP</li>
                </ol>
              </div>
            </div>

            {/* Continue Button */}
            <Button
              onClick={handleContinue}
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Continue (Waiting for Admin Approval)
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
              <p className="text-sm text-green-700">OTP approved! Set your new password.</p>
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
