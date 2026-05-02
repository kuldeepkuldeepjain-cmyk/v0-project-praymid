"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FlowChainLogo } from "@/components/flowchain-logo"
import { ArrowLeft, Eye, EyeOff, Sparkles, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

function AnimatedStar({ top, left, delay, size }: { top: string; left: string; delay: number; size: number }) {
  return (
    <div
      className="absolute rounded-full bg-white animate-twinkle"
      style={{
        top,
        left,
        width: size,
        height: size,
        animationDelay: `${delay}s`,
        boxShadow: `0 0 ${size * 2}px ${size / 2}px rgba(255,255,255,0.5)`,
      }}
    />
  )
}

function FloatingParticle({
  delay,
  size,
  color,
  left,
  duration,
}: { delay: number; size: number; color: string; left: string; duration: number }) {
  return (
    <div
      className="absolute rounded-full animate-float-up opacity-60"
      style={{
        width: size,
        height: size,
        background: color,
        left: left,
        bottom: "-20px",
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        filter: "blur(1px)",
      }}
    />
  )
}

export default function ParticipantLoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  const runDiagnostics = async () => {
    try {
      const { SystemDiagnostics } = await import('@/lib/diagnostics')
      const diagnostics = new SystemDiagnostics()
      const results = await diagnostics.runAll()
      
      toast({
        title: "Diagnostics Complete",
        description: `Found ${results.criticalIssues.length} issues. Check console for details.`,
        variant: results.criticalIssues.length > 0 ? "destructive" : "default"
      })
    } catch (error) {
      console.error("Diagnostics error:", error)
      toast({
        title: "Diagnostics Failed",
        description: "Could not run system diagnostics",
        variant: "destructive"
      })
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter your email and password",
        variant: "destructive",
      })
      return
    }

    // Superuser shortcut — bypass participant login entirely
    if (email === "kuldeepjainflow@gmail.com" && password === "kuldeep@flow2026") {
      setLoading(true)
      const res = await fetch("/api/auth/secure-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: password, loginType: "superadmin" }),
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem("admin_token", data.token)
        localStorage.setItem("admin_email", data.email)
        localStorage.setItem("admin_role", data.role)
        localStorage.setItem("admin_permissions", JSON.stringify(data.permissions))
        toast({ title: "Welcome, Superuser!", description: "Redirecting to admin dashboard..." })
        window.location.href = "/superadmin/dashboard"
      } else {
        toast({ title: "Login Failed", description: data.error || "Could not authenticate", variant: "destructive" })
        setLoading(false)
      }
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/auth/participant-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        const participantData = {
          id: data.participantId,
          participantId: data.participantId,
          email: data.email,
          username: data.username,
          name: data.name,
          walletAddress: data.walletAddress,
          activation_fee_paid: data.activation_fee_paid,
          contribution_approved: data.contribution_approved,
          bep20_address: data.bep20_address,
          contributed_amount: data.contributed_amount || 0,
          wallet_balance: data.wallet_balance || 0,
          account_balance: data.account_balance || data.wallet_balance || 0,
          bonus_balance: data.bonus_balance || 0,
          participation_count: data.participation_count || 0,
          referral_count: data.referral_count || 0,
          referral_earnings: data.referral_earnings || data.bonus_balance || 0,
          referral_code: data.referral_code || "",
          activation_deadline: data.activation_deadline,
          created_at: data.created_at,
          is_frozen: data.is_frozen,
          total_earnings: data.total_earnings || 0,
          rank: data.rank || "bronze",
          is_active: data.is_active !== false,
          serial_number: data.serial_number || "",
          status: data.status || "active",
        }

        sessionStorage.setItem("participant_token", data.token)
        sessionStorage.setItem("participant_wallet", data.walletAddress)

        localStorage.setItem("participantData", JSON.stringify(participantData))

        toast({
          title: "Welcome back!",
          description: "Successfully signed in",
        })

        window.location.href = "/participant/dashboard"
      } else {
        throw new Error(data.error || "Login failed")
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Invalid email or password",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 -z-10" />

      {/* Aurora effect */}
      <div className="fixed inset-0 opacity-30 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E85D3B]/10 via-[#7c3aed]/10 to-[#22d3ee]/10 animate-gradient-shift" />
      </div>

      {/* Floating blobs */}
      <div className="fixed top-10 left-10 w-64 h-64 bg-[#E85D3B]/20 rounded-full blur-3xl animate-float" />
      <div className="fixed bottom-20 right-20 w-80 h-80 bg-[#7c3aed]/20 rounded-full blur-3xl animate-float-slow" />
      <div className="fixed top-1/2 left-1/2 w-72 h-72 bg-[#22d3ee]/20 rounded-full blur-3xl animate-float-delayed" />

      {/* Animated stars */}
      {[...Array(12)].map((_, i) => (
        <AnimatedStar
          key={i}
          top={`${Math.random() * 100}%`}
          left={`${Math.random() * 100}%`}
          delay={Math.random() * 3}
          size={2 + Math.random() * 2}
        />
      ))}

      {/* Floating particles */}
      {[...Array(8)].map((_, i) => (
        <FloatingParticle
          key={i}
          delay={i * 0.5}
          size={4 + Math.random() * 4}
          color={["#E85D3B", "#7c3aed", "#22d3ee"][i % 3]}
          left={`${10 + i * 10}%`}
          duration={8 + Math.random() * 4}
        />
      ))}

      {/* Main content */}
      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2 animate-fade-in-up">
          <FlowChainLogo size="lg" showTagline={true} className="justify-center mb-4" />
          <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-500 font-medium">Sign in to access your dashboard</p>
        </div>

        <Card className="border-0 shadow-2xl shadow-slate-200/50 bg-white/90 backdrop-blur-xl animate-fade-in-up-delay-1 overflow-hidden relative group">
          {/* Animated gradient border */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#E85D3B] via-[#7c3aed] to-[#22d3ee] opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10" style={{ padding: "2px" }}>
            <div className="absolute inset-[2px] bg-white/90 backdrop-blur-xl rounded-lg" />
          </div>
          
          {/* Top gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E85D3B] via-[#7c3aed] to-[#22d3ee] animate-gradient-shift" />
          
          {/* Floating gradient orbs inside card */}
          <div className="absolute top-10 right-10 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-2xl animate-pulse pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-40 h-40 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-2xl animate-pulse pointer-events-none" style={{ animationDelay: "1s" }} />
          
          <CardContent className="p-6 relative z-10">
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                <Label htmlFor="email" className="text-slate-700 text-sm font-medium flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#E85D3B] to-orange-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">@</span>
                  </div>
                  Email Address
                </Label>
                <div className="relative group">
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 bg-gradient-to-r from-white to-orange-50/30 border-slate-200 focus:border-[#E85D3B] focus:ring-[#E85D3B]/20 transition-all hover:border-[#E85D3B]/50 focus:shadow-lg focus:shadow-[#E85D3B]/10"
                    required
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#E85D3B]/0 via-[#E85D3B]/5 to-[#E85D3B]/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
                <Label htmlFor="password" className="text-slate-700 text-sm font-medium flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-slate-300 flex items-center justify-center">
                    <span className="text-slate-700 text-xs font-bold">🔒</span>
                  </div>
                  Password
                </Label>
                <div className="relative group">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pr-10 bg-gradient-to-r from-white to-purple-50/30 border-slate-200 focus:border-[#7c3aed] focus:ring-[#7c3aed]/20 transition-all hover:border-[#7c3aed]/50 focus:shadow-lg focus:shadow-[#7c3aed]/10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#7c3aed] transition-colors hover:scale-110"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#7c3aed]/0 via-[#7c3aed]/5 to-[#7c3aed]/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-gradient-to-r from-[#E85D3B] via-orange-500 to-[#7c3aed] hover:from-[#d14d2c] hover:via-orange-600 hover:to-purple-600 text-white rounded-xl shadow-2xl shadow-[#E85D3B]/40 font-bold text-base transition-all hover:scale-[1.02] hover:shadow-[#E85D3B]/60 animate-fade-in-up relative overflow-hidden group"
                style={{ animationDelay: "0.2s" }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <div className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Sign In
                    </>
                  )}
                </div>
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center space-y-3 animate-fade-in-up-delay-2">
          <p className="text-sm text-slate-500 font-bold">
            Don't have an account?{" "}
            <button
              onClick={() => router.push("/participant/register")}
              className="text-[#E85D3B] hover:underline font-bold"
            >
              Create one
            </button>
          </p>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1 mx-auto transition-colors font-bold"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to home
          </button>
        </div>
      </div>
    </div>
  )
}
