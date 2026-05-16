import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { AlertTriangle, CheckCircle2, XCircle, Copy, Check, Loader2 } from "lucide-react"

interface PasswordResetOTP {
  id: string
  participant_email: string
  otp_code: string
  otp_purpose: string
  created_at: string
  expires_at: string
  is_approved: boolean
  approved_at: string | null
  approved_by: string | null
}

export function PasswordResetOTPsPanel() {
  const [otps, setOtps] = useState<PasswordResetOTP[]>([])
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchOTPs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/password-reset-otps", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch OTPs")
      setOtps(data.otps || [])
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOTPs()
    const interval = setInterval(fetchOTPs, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [fetchOTPs])

  const handleApprove = async (otpId: string) => {
    setProcessingId(otpId)
    try {
      const res = await fetch("/api/admin/password-reset-otps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpId, action: "approve" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to approve OTP")

      setOtps((prev) => prev.filter((o) => o.id !== otpId))
      toast({
        title: "Success",
        description: `Password reset OTP approved for ${data.participantEmail}`,
      })
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (otpId: string) => {
    setProcessingId(otpId)
    try {
      const res = await fetch("/api/admin/password-reset-otps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpId, action: "reject" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to reject OTP")

      setOtps((prev) => prev.filter((o) => o.id !== otpId))
      toast({
        title: "Success",
        description: `Password reset OTP rejected for ${data.participantEmail}`,
      })
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setProcessingId(null)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading && otps.length === 0) {
    return (
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="pt-6 text-center text-slate-600">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
          Loading password reset OTPs...
        </CardContent>
      </Card>
    )
  }

  if (otps.length === 0) {
    return (
      <Card className="border-2 border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-900 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Password Reset OTPs
          </CardTitle>
          <CardDescription>All pending password reset requests</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-slate-600">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600 opacity-50" />
          <p>No pending password reset OTPs</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-amber-200">
      <CardHeader className="bg-amber-50 border-b-2 border-amber-200">
        <CardTitle className="text-amber-900 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Password Reset OTPs ({otps.length})
        </CardTitle>
        <CardDescription>Pending password reset requests requiring approval</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-3 max-h-96 overflow-y-auto">
        {otps.map((otp) => (
          <div key={otp.id} className="border-2 border-amber-200 rounded-lg p-4 bg-white hover:bg-amber-50 transition">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-slate-900 truncate">{otp.participant_email}</p>
                  <Badge className="bg-amber-100 text-amber-800 border border-amber-300 flex-shrink-0">
                    Password Reset
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Requested {new Date(otp.created_at).toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            {/* OTP Code Display */}
            <div className="flex items-center gap-2 mb-3 p-2 bg-slate-100 rounded border border-slate-300">
              <code className="text-lg font-mono font-bold text-slate-900 flex-1">{otp.otp_code}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
                onClick={() => copyToClipboard(otp.otp_code, otp.id)}
              >
                {copiedId === otp.id ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-slate-600" />
                )}
              </Button>
            </div>

            {/* Expires At */}
            <p className="text-xs text-slate-500 mb-3">
              Expires: {new Date(otp.expires_at).toLocaleString("en-IN")}
            </p>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => handleApprove(otp.id)}
                disabled={processingId === otp.id}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {processingId === otp.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleReject(otp.id)}
                disabled={processingId === otp.id}
                variant="destructive"
                className="flex-1"
              >
                {processingId === otp.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
