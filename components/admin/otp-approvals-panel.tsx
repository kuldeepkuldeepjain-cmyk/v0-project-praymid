"use client"
import { adminFetch } from "@/lib/auth"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  ShieldCheck, RefreshCw, Search, Clock,
  CheckCircle2, Mail, KeyRound, Phone, Eye, EyeOff, Trash2,
} from "lucide-react"
import { getAdminData } from "@/lib/auth"

interface PendingParticipant {
  id: string
  full_name: string
  username: string
  email: string
  mobile_number: string
  whatsapp_otp: string
  otp_verified: boolean
  created_at: string
  otp_type?: "registration" | "password_reset"
}

export function OtpApprovalsPanel() {
  const { toast } = useToast()
  const [participants, setParticipants] = useState<PendingParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({})
  const [approving, setApproving] = useState<Record<string, boolean>>({})
  const [approved, setApproved] = useState<Record<string, boolean>>({})
  const [showOtp, setShowOtp] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminFetch("/api/admin/pending-otp-approvals")
      const data = await res.json()
      if (data.success) setParticipants(data.pending || [])
    } catch {
      toast({ title: "Error", description: "Failed to fetch pending approvals", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchPending()
    const interval = setInterval(fetchPending, 15000)
    return () => clearInterval(interval)
  }, [fetchPending])

  const handleApprove = async (participant: PendingParticipant) => {
    const enteredOtp = otpInputs[participant.id]?.trim()
    if (!enteredOtp) {
      toast({ title: "OTP Required", description: "Enter the OTP to verify.", variant: "destructive" })
      return
    }

    setApproving(prev => ({ ...prev, [participant.id]: true }))
    try {
      const adminData = getAdminData()
      const res = await adminFetch("/api/admin/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: participant.id,
          otp: enteredOtp,
          adminEmail: adminData?.email || "admin",
        }),
      })
      const data = await res.json()

      if (data.success) {
        setApproved(prev => ({ ...prev, [participant.id]: true }))
        toast({
          title: "OTP Verified!",
          description: `${participant.full_name || participant.username} can now log in.`,
        })
        setTimeout(() => {
          setParticipants(prev => prev.filter(p => p.id !== participant.id))
        }, 2500)
      } else {
        toast({ title: "Verification Failed", description: data.error || "Invalid OTP", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to verify OTP", variant: "destructive" })
    } finally {
      setApproving(prev => ({ ...prev, [participant.id]: false }))
    }
  }

  // Auto-fill OTP from DB if admin wants to approve directly
  const handleAutoFill = (participant: PendingParticipant) => {
    if (participant.whatsapp_otp) {
      setOtpInputs(prev => ({ ...prev, [participant.id]: participant.whatsapp_otp }))
    }
  }

  const handleDelete = async (participant: PendingParticipant) => {
    if (!confirm(`Are you sure you want to delete the pending OTP approval for ${participant.full_name || participant.username}?`)) {
      return
    }

    setDeleting(prev => ({ ...prev, [participant.id]: true }))
    try {
      const res = await adminFetch("/api/admin/delete-otp-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: participant.id }),
      })
      const data = await res.json()

      if (data.success) {
        toast({
          title: "Deleted",
          description: `Pending approval for ${participant.full_name || participant.username} has been removed.`,
        })
        setParticipants(prev => prev.filter(p => p.id !== participant.id))
      } else {
        toast({ title: "Error", description: data.error || "Failed to delete", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete approval", variant: "destructive" })
    } finally {
      setDeleting(prev => ({ ...prev, [participant.id]: false }))
    }
  }

  const filtered = participants.filter(p => {
    const q = searchQuery.toLowerCase()
    return (
      !q ||
      p.email.toLowerCase().includes(q) ||
      (p.full_name || "").toLowerCase().includes(q) ||
      (p.username || "").toLowerCase().includes(q) ||
      (p.mobile_number || "").includes(q)
    )
  })

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const diffMins = Math.floor((Date.now() - d.getTime()) / 60000)
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    return d.toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
            OTP Approvals
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Verify mobile OTP to allow new participants to log in
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-sm px-3 py-1">
            {participants.length} pending
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPending}
            disabled={loading}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by name, email, or mobile..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500"
        />
      </div>

      {/* Loading */}
      {loading && participants.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 text-slate-400 animate-spin mr-3" />
          <span className="text-slate-400">Loading pending approvals...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <p className="text-slate-300 font-medium">All caught up!</p>
          <p className="text-slate-500 text-sm mt-1">
            {searchQuery ? "No results for your search." : "No participants waiting for OTP approval."}
          </p>
        </div>
      )}

      {/* Participant cards */}
      <div className="space-y-4">
        {filtered.map(participant => {
          const isApproved = approved[participant.id] || participant.otp_verified
          const isApproving = approving[participant.id]
          const otpVisible = showOtp[participant.id]

          return (
            <div
              key={participant.id}
              className={`rounded-xl border p-5 transition-colors ${
                isApproved
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-slate-800/60 border-slate-700 hover:border-slate-600"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start gap-5">
                {/* Left: participant info */}
                <div className="flex-1 space-y-3">
                  {/* Avatar + name */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {(participant.full_name || participant.username || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-semibold text-sm leading-tight">
                            {participant.full_name || participant.username}
                          </p>
                          <Badge className={`text-xs px-2 py-0.5 ${
                            participant.otp_type === "password_reset"
                              ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                              : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                          }`}>
                            {participant.otp_type === "password_reset" ? "Password Reset" : "Registration"}
                          </Badge>
                        </div>
                        <p className="text-slate-400 text-xs">@{participant.username}</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      {formatTime(participant.created_at)}
                    </span>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Mail className="h-3 w-3 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{participant.email}</span>
                  </div>

                  {/* Mobile */}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Phone className="h-3 w-3 text-slate-500 flex-shrink-0" />
                    <span className={participant.mobile_number ? "text-slate-200 font-medium" : "text-slate-600 italic"}>
                      {participant.mobile_number || "No mobile number"}
                    </span>
                  </div>

                  {/* Registered OTP or Password Reset OTP — admin can see it to verify */}
                  {(participant.whatsapp_otp) && (
                    <div className="flex items-center gap-2 bg-slate-900/80 rounded-lg px-3 py-2 border border-slate-700/60 w-fit">
                      <KeyRound className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0" />
                      <span className="text-xs text-slate-400 mr-1">{participant.otp_type === "password_reset" ? "Password Reset OTP:" : "Registered OTP:"}</span>
                      <span className={`font-mono text-sm font-bold tracking-widest ${otpVisible ? "text-cyan-300" : "text-slate-600"}`}>
                        {otpVisible ? participant.whatsapp_otp : "••••••"}
                      </span>
                      <button
                        onClick={() => setShowOtp(prev => ({ ...prev, [participant.id]: !prev[participant.id] }))}
                        className="text-slate-500 hover:text-slate-300 ml-1"
                      >
                        {otpVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => handleAutoFill(participant)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 ml-2 underline underline-offset-2"
                      >
                        Auto-fill
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: OTP input + approve */}
                <div className="flex flex-col gap-3 md:w-56 flex-shrink-0">
                  {isApproved ? (
                    <div className="flex items-center gap-2 justify-center py-4 text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm font-semibold">Approved! Can now log in.</span>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs text-slate-400 font-medium">Enter OTP to verify</label>
                        <Input
                          placeholder="6-digit OTP"
                          maxLength={6}
                          value={otpInputs[participant.id] || ""}
                          onChange={e => setOtpInputs(prev => ({ ...prev, [participant.id]: e.target.value.replace(/\D/g, "") }))}
                          className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-600 font-mono text-center tracking-widest text-lg focus:border-cyan-500"
                          onKeyDown={e => { if (e.key === "Enter") handleApprove(participant) }}
                        />
                      </div>
                      <Button
                        onClick={() => handleApprove(participant)}
                        disabled={isApproving || !otpInputs[participant.id]}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold w-full"
                      >
                        {isApproving ? (
                          <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Verifying...</>
                        ) : (
                          <><ShieldCheck className="h-4 w-4 mr-2" />Verify & Approve</>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleDelete(participant)}
                        disabled={deleting[participant.id]}
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-950/20 w-full border border-red-500/20"
                      >
                        {deleting[participant.id] ? (
                          <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Deleting...</>
                        ) : (
                          <><Trash2 className="h-4 w-4 mr-2" />Delete</>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
