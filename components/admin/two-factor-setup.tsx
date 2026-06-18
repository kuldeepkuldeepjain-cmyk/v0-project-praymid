"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Copy, CheckCircle2, Key } from "lucide-react"

export function AdminTwoFactorSetup() {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [isEnabled, setIsEnabled] = useState(false)

  const generateSecret = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/admin/setup-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      })

      if (!response.ok) throw new Error("Failed to generate secret")

      const data = await response.json()
      setSecret(data.secret)
      setQrCode(data.qrCode)
      setVerificationCode("")
      toast({
        title: "Secret Generated",
        description: "Scan the QR code with Google Authenticator",
      })
    } catch (error) {
      console.error("[v0] Generate secret error:", error)
      toast({
        title: "Error",
        description: "Failed to generate secret",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const verifyCode = async () => {
    if (!secret || !verificationCode) {
      toast({
        title: "Error",
        description: "Please enter a verification code",
        variant: "destructive",
      })
      return
    }

    setIsVerifying(true)
    try {
      const response = await fetch("/api/admin/setup-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          secret,
          code: verificationCode.replace(/\s/g, ""),
        }),
      })

      if (!response.ok) throw new Error("Verification failed")

      const data = await response.json()

      if (data.success) {
        // Save secret to localStorage (in production, save to secure backend)
        localStorage.setItem("admin_2fa_secret", secret)
        localStorage.setItem("admin_2fa_enabled", "true")
        setIsEnabled(true)
        setSecret(null)
        setQrCode(null)
        setVerificationCode("")
        toast({
          title: "2FA Enabled",
          description: "Your authenticator is now active",
        })
      } else {
        toast({
          title: "Invalid Code",
          description: "The code you entered is incorrect. Try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Verify code error:", error)
      toast({
        title: "Error",
        description: "Verification failed",
        variant: "destructive",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret)
      toast({
        title: "Copied",
        description: "Secret key copied to clipboard",
      })
    }
  }

  const disableTwoFactor = () => {
    localStorage.removeItem("admin_2fa_secret")
    localStorage.removeItem("admin_2fa_enabled")
    setIsEnabled(false)
    toast({
      title: "2FA Disabled",
      description: "Two-factor authentication has been turned off",
    })
  }

  return (
    <Card className="border-yellow-600/30 bg-yellow-50/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-yellow-600" />
          <div>
            <CardTitle>Google Authenticator Setup</CardTitle>
            <CardDescription>
              Secure your admin account with two-factor authentication
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isEnabled ? (
          <>
            {!qrCode ? (
              <div>
                <p className="text-sm text-slate-600 mb-4">
                  Enable two-factor authentication by scanning the QR code with Google Authenticator.
                </p>
                <Button onClick={generateSecret} disabled={isGenerating} className="w-full">
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate QR Code"
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <img
                    src={qrCode}
                    alt="TOTP QR Code"
                    className="w-48 h-48 border border-slate-300 rounded-lg p-2 bg-white"
                  />
                </div>

                {/* Secret Key Display */}
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Manual Entry Key (if camera doesn&apos;t work):
                  </label>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-slate-100 p-3 rounded text-xs font-mono break-all border border-slate-200">
                      {secret}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copySecret}
                      className="flex-shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Save this key in a secure place</p>
                </div>

                {/* Verification Code Input */}
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Enter 6-digit code from your authenticator app:
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength="6"
                      className="text-center text-lg tracking-widest font-mono"
                    />
                    <Button onClick={verifyCode} disabled={isVerifying || verificationCode.length !== 6}>
                      {isVerifying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSecret(null)
                    setQrCode(null)
                    setVerificationCode("")
                  }}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Two-Factor Authentication Enabled</p>
                <p className="text-sm text-green-800">Your admin account is now protected with 2FA</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-2">
                Your authenticator has been successfully set up. You&apos;ll need to enter a code
                from your authenticator app each time you log in.
              </p>
            </div>

            <Button onClick={disableTwoFactor} variant="destructive" className="w-full">
              Disable 2FA
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
