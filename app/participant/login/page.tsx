"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FlowChainLogo } from "@/components/flowchain-logo"
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Clock,
  HelpCircle,
  CandlestickChart,
  TrendingUp,
  Shield,
  Zap,
  ArrowRight,
  Lock,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { setParticipantAuth } from "@/lib/auth"
import { ForgotPasswordModal } from "@/components/forgot-password-modal"

// Live market ticker data
const MARKET_PAIRS = [
  { symbol: "EUR/USD", price: "1.0852", change: "+0.45%", up: true },
  { symbol: "GBP/USD", price: "1.2782", change: "+1.12%", up: true },
  { symbol: "USD/JPY", price: "149.47", change: "-0.23%", up: false },
  { symbol: "BTC/USD", price: "62,862", change: "+2.15%", up: true },
  { symbol: "XAU/USD", price: "2,385.7", change: "+0.12%", up: true },
  { symbol: "ETH/USD", price: "2,452.0", change: "+1.85%", up: true },
]

const STATS = [
  { label: "Active Traders", value: "15,000+" },
  { label: "Daily Volume", value: "$2.4B+" },
  { label: "Instruments", value: "50+" },
  { label: "Uptime", value: "99.9%" },
]

const FEATURES = [
  { icon: CandlestickChart, label: "Real-time Charts", desc: "6 timeframes, live data" },
  { icon: Shield,           label: "Bank-grade Security", desc: "Enterprise encryption" },
  { icon: Zap,              label: "Instant Execution", desc: "Sub-second fills" },
]

export default function ParticipantLoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [showPassword, setShowPassword]             = useState(false)
  const [email, setEmail]                           = useState("")
  const [mobile_number, setMobileNumber]            = useState("")
  const [password, setPassword]                     = useState("")
  const [loading, setLoading]                       = useState(false)
  const [pendingVerification, setPendingVerification] = useState(false)
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
  const [loginMode, setLoginMode]                   = useState<"email" | "mobile">("email")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const identifier = loginMode === "email" ? email : mobile_number
    if (!identifier || !password) {
      toast({
        title: "Missing fields",
        description: loginMode === "email"
          ? "Please enter your email and password"
          : "Please enter your mobile number and password",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const body = loginMode === "email" ? { email, password } : { mobile_number, password }
      const response = await fetch("/api/auth/participant-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await response.json()

      if (!data.success && data.pendingVerification) {
        setPendingVerification(true)
        return
      }

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

        setParticipantAuth(
          data.participantId || `user-${Date.now()}`,
          data.walletAddress || data.bep20_address || "",
          data.email,
          data.username,
          data.name || data.full_name,
          data.activation_fee_paid || false,
          data.created_at,
          data.is_frozen || false,
        )

        localStorage.setItem("participantData", JSON.stringify(participantData))

        toast({ title: "Welcome back!", description: "Successfully signed in." })
        window.location.href = "/participant/dashboard"
      } else {
        toast({
          title: "Login Failed",
          description: data.pendingVerification
            ? data.error
            : "Invalid credentials. Please try again.",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Connection Error",
        description: "Unable to connect. Please check your internet and try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col lg:flex-row">

        {/* ── Left panel — brand / info ─────────────────────────────────────────── */}
        <div className="hidden lg:flex flex-col justify-between w-[52%] xl:w-[55%] relative overflow-hidden px-12 xl:px-16 py-10">

          {/* Background layers */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />

          {/* Grid overlay — subtle trading aesthetic */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(6,182,212,1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,1) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Content */}
          <div className="relative z-10 space-y-10">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <CandlestickChart className="w-7 h-7 text-cyan-400" />
              <span className="font-bold text-xl bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                FlowChain Trading
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-5 pt-8">
              <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-cyan-400 uppercase">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Professional Platform
              </div>
              <h1 className="text-4xl xl:text-5xl font-bold leading-tight text-white">
                Trade Smarter.<br />
                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Grow Faster.
                </span>
              </h1>
              <p className="text-slate-400 text-base leading-relaxed max-w-sm">
                Access professional-grade trading tools with real-time data,
                advanced charting, and lightning-fast execution.
              </p>
            </div>

            {/* Feature bullets */}
            <div className="space-y-3">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 shrink-0">
                    <Icon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{label}</p>
                    <p className="text-slate-500 text-xs">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div className="relative z-10">
            <div className="grid grid-cols-4 gap-4 pt-8 border-t border-slate-800">
              {STATS.map(({ label, value }) => (
                <div key={label}>
                  <p className="text-lg font-bold text-white">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Live ticker */}
            <div className="mt-6 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
              <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-2">Live Markets</p>
              <div className="grid grid-cols-3 gap-2">
                {MARKET_PAIRS.map((pair) => (
                  <div key={pair.symbol} className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-300">{pair.symbol}</span>
                    <span
                      className={`text-[10px] font-bold ${pair.up ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {pair.change}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right panel — login form ──────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-screen lg:min-h-0 relative">

          {/* Subtle right-panel separator */}
          <div className="hidden lg:block absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-slate-700/60 to-transparent" />

          {/* Top bar — mobile logo + back */}
          <div className="flex items-center justify-between px-6 pt-6 lg:px-10 lg:pt-8">
            <div className="flex lg:hidden items-center gap-2">
              <CandlestickChart className="w-5 h-5 text-cyan-400" />
              <span className="font-bold text-base bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                FlowChain Trading
              </span>
            </div>
            <div className="hidden lg:block" />
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to home
            </button>
          </div>

          {/* Form area */}
          <div className="flex-1 flex items-center justify-center px-6 py-10 lg:px-12 xl:px-16">
            <div className="w-full max-w-[400px] space-y-7">

              {/* Heading */}
              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold text-white">Sign in to your account</h2>
                <p className="text-sm text-slate-400">
                  Enter your credentials to access the trading terminal.
                </p>
              </div>

              {/* Pending Verification State */}
              {pendingVerification && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" />
                        Awaiting Admin Verification
                      </p>
                      <p className="text-xs text-amber-500/80 mt-0.5">
                        Your mobile OTP has not been verified yet.
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 pl-12">
                    Once admin verifies your mobile number you will be able to log in.
                  </p>
                  <button
                    onClick={() => setPendingVerification(false)}
                    className="ml-12 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Try again &rarr;
                  </button>
                </div>
              )}

              {/* Login Form */}
              {!pendingVerification && (
                <form onSubmit={handleLogin} className="space-y-5">

                  {/* Mode toggle */}
                  <div className="flex gap-1 p-1 bg-slate-800/60 border border-slate-700/50 rounded-lg">
                    {(["email", "mobile"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setLoginMode(mode)}
                        className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${
                          loginMode === mode
                            ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-300 shadow-sm"
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {mode === "email" ? "Email" : "Mobile"}
                      </button>
                    ))}
                  </div>

                  {/* Identifier field */}
                  {loginMode === "email" ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 bg-slate-800/60 border-slate-700/60 text-white placeholder:text-slate-600 focus:border-cyan-500/60 focus:ring-cyan-500/20 transition-all"
                        required
                        autoComplete="email"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="mobile" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Mobile Number
                      </Label>
                      <Input
                        id="mobile"
                        type="tel"
                        placeholder="+95 9 123 456 789"
                        value={mobile_number}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        className="h-11 bg-slate-800/60 border-slate-700/60 text-white placeholder:text-slate-600 focus:border-cyan-500/60 focus:ring-cyan-500/20 transition-all"
                        required
                        autoComplete="tel"
                      />
                    </div>
                  )}

                  {/* Password field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => setForgotPasswordOpen(true)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
                      >
                        <HelpCircle className="w-3 h-3" />
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 pr-10 bg-slate-800/60 border-slate-700/60 text-white placeholder:text-slate-600 focus:border-cyan-500/60 focus:ring-cyan-500/20 transition-all"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Security note */}
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
                    <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs text-slate-500">
                      Your connection is encrypted and secure.
                    </span>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-sm tracking-wide shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-xs text-slate-600">or</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              {/* Register link */}
              <p className="text-center text-sm text-slate-500">
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => router.push("/participant/register")}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                >
                  Create account
                </button>
              </p>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="px-6 pb-6 lg:px-10 lg:pb-8 flex items-center justify-between">
            <p className="text-[10px] text-slate-700">
              &copy; {new Date().getFullYear()} FlowChain Trading. All rights reserved.
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-700">
              <Shield className="w-3 h-3 text-emerald-700" />
              SSL Secured
            </div>
          </div>
        </div>
      </div>

      <ForgotPasswordModal open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen} />
    </>
  )
}
