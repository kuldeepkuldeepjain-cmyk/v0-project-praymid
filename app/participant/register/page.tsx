"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FlowChainLogo } from "@/components/flowchain-logo"
import { Eye, EyeOff, AtSign, Mail, Phone, MapPin, Globe, RefreshCcw, Gift, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

const COUNTRIES_DATA = [
  { name: "India", code: "+91", flag: "🇮🇳" },
  { name: "United States", code: "+1", flag: "🇺🇸" },
  { name: "United Kingdom", code: "+44", flag: "🇬🇧" },
  { name: "Canada", code: "+1", flag: "🇨🇦" },
  { name: "Australia", code: "+61", flag: "🇦🇺" },
  { name: "Germany", code: "+49", flag: "🇩🇪" },
  { name: "France", code: "+33", flag: "🇫🇷" },
  { name: "China", code: "+86", flag: "🇨🇳" },
  { name: "Japan", code: "+81", flag: "🇯🇵" },
  { name: "South Korea", code: "+82", flag: "🇰🇷" },
  { name: "Singapore", code: "+65", flag: "🇸🇬" },
  { name: "Malaysia", code: "+60", flag: "🇲🇾" },
  { name: "Indonesia", code: "+62", flag: "🇮🇩" },
  { name: "Thailand", code: "+66", flag: "🇹🇭" },
  { name: "Vietnam", code: "+84", flag: "🇻🇳" },
  { name: "Philippines", code: "+63", flag: "🇵🇭" },
  { name: "UAE", code: "+971", flag: "🇦🇪" },
  { name: "Saudi Arabia", code: "+966", flag: "🇸🇦" },
  { name: "Pakistan", code: "+92", flag: "🇵🇰" },
  { name: "Bangladesh", code: "+880", flag: "🇧🇩" },
  { name: "Nigeria", code: "+234", flag: "🇳🇬" },
  { name: "South Africa", code: "+27", flag: "🇿🇦" },
  { name: "Brazil", code: "+55", flag: "🇧🇷" },
  { name: "Mexico", code: "+52", flag: "🇲🇽" },
]

export default function ParticipantRegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [mobileVerified, setMobileVerified] = useState(false)
  const [otpStep, setOtpStep] = useState<"idle" | "sending" | "verifying" | "done">("idle")
  const [otpCode, setOtpCode] = useState("")
  const [otpCountdown, setOtpCountdown] = useState(0)
  const [previewOtp, setPreviewOtp] = useState<string | null>(null)

  const [captcha, setCaptcha] = useState({ text: "", answer: "" })
  const [captchaInput, setCaptchaInput] = useState("")

  const [referralApplied, setReferralApplied] = useState(false)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    countryCode: "+91",
    mobileNumber: "",
    password: "",
    confirmPassword: "",
    country: "India",
    state: "",
    pinCode: "",
    referralCode: "",
  })
  const [selectedCountryData, setSelectedCountryData] = useState(COUNTRIES_DATA[0])

  useEffect(() => {
    generateCaptcha()
  }, [])

  useEffect(() => {
    const refCode = searchParams.get("ref")
    if (refCode && !referralApplied) {
      setFormData((prev) => ({ ...prev, referralCode: refCode.toUpperCase() }))
      setReferralApplied(true)
      toast({
        title: "Referral Code Applied!",
        description: `You'll earn rewards when you sign up with code: ${refCode}`,
      })
    }
  }, [searchParams, referralApplied, toast])

  const generateCaptcha = () => {
    // Generate a random 6-character alphanumeric code
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Excluding similar looking characters like I, O, 0, 1
    let code = ""
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    setCaptcha({ text: code, answer: code })
    setCaptchaInput("")
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleCountryChange = (countryName: string) => {
    const countryData = COUNTRIES_DATA.find(c => c.name === countryName)
    if (countryData) {
      setSelectedCountryData(countryData)
      setFormData((prev) => ({ 
        ...prev, 
        country: countryName,
        countryCode: countryData.code 
      }))
    }
  }

  const sendOTP = async () => {
    if (!formData.mobileNumber || formData.mobileNumber.length < 7) {
      toast({ title: "Invalid Mobile Number", description: "Please enter a valid mobile number", variant: "destructive" })
      return
    }
    setOtpStep("sending")
    try {
      const fullMobile = `${formData.countryCode}${formData.mobileNumber}`
      const res = await fetch("/api/participant/send-mobile-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: fullMobile, email: formData.email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send OTP")
      setOtpStep("verifying")
      setOtpCode("")
      setOtpCountdown(600)
      // In preview mode the OTP is returned in the response
      if (data.otp) setPreviewOtp(data.otp)
      const interval = setInterval(() => {
        setOtpCountdown((prev) => {
          if (prev <= 1) { clearInterval(interval); setOtpStep("idle"); return 0 }
          return prev - 1
        })
      }, 1000)
      const desc = data.otp
        ? `Preview mode — your OTP is shown on screen`
        : "A 6-digit code has been sent to your mobile number"
      toast({ title: "OTP Sent!", description: desc })
    } catch (err) {
      setOtpStep("idle")
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to send OTP", variant: "destructive" })
    }
  }

  const verifyOTP = async (codeOverride?: string) => {
    const code = codeOverride ?? otpCode
    if (code.length !== 6) return
    try {
      const fullMobile = `${formData.countryCode}${formData.mobileNumber}`
      const res = await fetch("/api/participant/verify-mobile-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_number: fullMobile, otp_code: code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Verification failed")
      setMobileVerified(true)
      setOtpStep("done")
      toast({ title: "Mobile Verified!", description: "Your mobile number has been verified successfully" })
    } catch (err) {
      toast({ title: "Verification Failed", description: err instanceof Error ? err.message : "Invalid OTP", variant: "destructive" })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!mobileVerified) {
      toast({ title: "Mobile Verification Required", description: "Please verify your mobile number before registering", variant: "destructive" })
      return
    }

    if (captchaInput.toUpperCase() !== captcha.answer) {
      toast({
        title: "Security Check Failed",
        description: "Please enter the correct CAPTCHA code",
        variant: "destructive",
      })
      generateCaptcha()
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      })
      return
    }

    if (formData.username.length < 3) {
      toast({
        title: "Invalid Username",
        description: "Username must be at least 3 characters",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/participant/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username,
          email: formData.email,
          mobileNumber: `${formData.countryCode}${formData.mobileNumber}`,
          countryCode: formData.countryCode,
          password: formData.password,
          country: formData.country,
          state: formData.state,
          pinCode: formData.pinCode,
          referralCode: formData.referralCode,
        }),
      })

      const data = await response.json()

      if (data.success) {
        const participantData = {
          id: data.participantId,
          email: formData.email,
          username: data.username || formData.username,
          wallet_address: data.walletAddress,
          activation_fee_paid: false,
          created_at: new Date().toISOString(),
          is_frozen: false,
          referral_code: data.referralCode || "",
          wallet_balance: data.wallet_balance || 0,
          contributed_amount: data.contributed_amount || 0,
          participation_count: 0,
          referral_count: 0,
          referral_earnings: 0,
          activation_deadline: data.activation_deadline,
          bep20_address: "",
        }

        localStorage.setItem("participantData", JSON.stringify(participantData))
        localStorage.setItem("participant_token", data.token)

        console.log("[v0] Auth data stored in localStorage")

        toast({
          title: "Account Created!",
          description: `Welcome @${formData.username}! Redirecting to dashboard...`,
        })

        window.location.href = "/participant/dashboard"
      } else {
        throw new Error(data.error || "Registration failed")
      }
    } catch (error) {
      console.error("[v0] Registration error:", error)
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const stars = Array.from({ length: 15 }, (_, i) => ({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 3,
    size: 2 + Math.random() * 2,
  }))

  const particles = Array.from({ length: 10 }, (_, i) => ({
    delay: i * 0.4,
    size: 4 + Math.random() * 4,
    color: ["#E85D3B", "#7c3aed", "#22d3ee"][i % 3],
    left: `${5 + i * 9}%`,
    duration: 8 + Math.random() * 4,
  }))

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
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {stars.map((star, i) => (
          <AnimatedStar key={i} {...star} />
        ))}
      </div>

      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {particles.map((particle, i) => (
          <FloatingParticle key={i} {...particle} />
        ))}
      </div>

      {/* Main content */}
      <div className="w-full max-w-2xl space-y-6 relative z-10 my-8">
        <div className="text-center space-y-2 animate-fade-in-up">
          <FlowChainLogo size="lg" showTagline={true} className="justify-center mb-4" />
          <h1 className="text-3xl font-bold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-500">Join FlowChain in less than a minute</p>
        </div>

        <Card className="border-0 shadow-2xl shadow-slate-200/50 bg-white/90 backdrop-blur-xl animate-fade-in-up-delay-1 overflow-hidden relative group">
          {/* Animated gradient border */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#E85D3B] via-[#7c3aed] to-[#22d3ee] opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10" style={{ padding: "2px" }}>
            <div className="absolute inset-[2px] bg-white/90 backdrop-blur-xl rounded-lg" />
          </div>
          
          {/* Top gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E85D3B] via-orange-500 to-[#7c3aed] animate-gradient-shift" />
          
          {/* Floating gradient orbs inside card */}
          <div className="absolute top-10 right-10 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-2xl animate-pulse pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-40 h-40 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-2xl animate-pulse pointer-events-none" style={{ animationDelay: "1s" }} />
          
          <CardContent className="p-6 relative z-10">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name and Surname */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-slate-700 text-sm font-medium flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                      <User className="h-3 w-3 text-white" />
                    </div>
                    First Name *
                  </Label>
                  <div className="relative group">
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => handleChange("firstName", e.target.value.replace(/[^a-zA-Z\s]/g, ""))}
                      className="h-12 bg-gradient-to-r from-white to-emerald-50/30 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all hover:border-emerald-500/50 focus:shadow-lg focus:shadow-emerald-500/10"
                      required
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-slate-700 text-sm font-medium flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                      <User className="h-3 w-3 text-white" />
                    </div>
                    Last Name *
                  </Label>
                  <div className="relative group">
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => handleChange("lastName", e.target.value.replace(/[^a-zA-Z\s]/g, ""))}
                      className="h-12 bg-gradient-to-r from-white to-teal-50/30 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 transition-all hover:border-teal-500/50 focus:shadow-lg focus:shadow-teal-500/10"
                      required
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                  </div>
                </div>
              </div>

              <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                <Label htmlFor="username" className="text-slate-700 text-sm font-medium flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#7c3aed] to-purple-600 flex items-center justify-center">
                    <AtSign className="h-3 w-3 text-white" />
                  </div>
                  Username *
                </Label>
                <div className="relative group">
                  <Input
                    id="username"
                    placeholder="your_username"
                    value={formData.username}
                    onChange={(e) => handleChange("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    className="h-12 bg-gradient-to-r from-white to-purple-50/30 border-slate-200 focus:border-[#7c3aed] focus:ring-[#7c3aed]/20 transition-all hover:border-[#7c3aed]/50 focus:shadow-lg focus:shadow-[#7c3aed]/10"
                    maxLength={20}
                    required
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#7c3aed]/0 via-[#7c3aed]/5 to-[#7c3aed]/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                </div>
                <p className="text-xs text-slate-400">3-20 characters, letters, numbers, and underscores only</p>
              </div>

              <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
                <Label htmlFor="email" className="text-slate-700 text-sm font-medium flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#E85D3B] to-orange-500 flex items-center justify-center">
                    <Mail className="h-3 w-3 text-white" />
                  </div>
                  Email *
                </Label>
                <div className="relative group">
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter Gmail"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="h-12 bg-gradient-to-r from-white to-orange-50/30 border-slate-200 focus:border-[#E85D3B] focus:ring-[#E85D3B]/20 transition-all hover:border-[#E85D3B]/50 focus:shadow-lg focus:shadow-[#E85D3B]/10"
                    required
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#E85D3B]/0 via-[#E85D3B]/5 to-[#E85D3B]/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                </div>
              </div>

              {/* Compact Country Selector */}
              <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                <Label htmlFor="country" className="text-slate-700 text-sm font-medium flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Globe className="h-3 w-3 text-white" />
                  </div>
                  Country *
                </Label>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-2xl">{selectedCountryData.flag}</span>
                    <div className="min-w-0 flex-1">
                      <Select value={formData.country} onValueChange={handleCountryChange}>
                        <SelectTrigger className="h-10 bg-white border-slate-200 hover:border-blue-300 focus:border-blue-500 transition-all">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white max-h-[300px]">
                          {COUNTRIES_DATA.map((country) => (
                            <SelectItem key={country.name} value={country.name}>
                              <div className="flex items-center gap-2">
                                <span>{country.flag}</span>
                                <span className="font-medium">{country.name}</span>
                                <span className="text-slate-500 text-sm">({country.code})</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1 bg-white rounded-md border border-blue-300">
                    <span className="text-xs text-slate-500">Code:</span>
                    <span className="text-sm font-bold text-blue-600">{selectedCountryData.code}</span>
                  </div>
                </div>
              </div>

              {/* Mobile Number with Auto Country Code */}
              <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
                <Label htmlFor="mobileNumber" className="text-slate-700 text-sm font-medium flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#22d3ee] to-cyan-600 flex items-center justify-center">
                    <Phone className="h-3 w-3 text-white" />
                  </div>
                  Mobile Number {mobileVerified && <span className="text-emerald-600 text-xs ml-1">Verified</span>} *
                </Label>
                <div className="flex gap-2">
                  <div className="w-[110px] h-12 px-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center gap-1.5">
                    <span className="text-lg">{selectedCountryData.flag}</span>
                    <span className="text-sm font-bold text-slate-700">{formData.countryCode}</span>
                  </div>
                  <div className="relative flex-1 group">
                    <Input
                      id="mobileNumber"
                      type="tel"
                      placeholder="9876543210"
                      value={formData.mobileNumber}
                      onChange={(e) => handleChange("mobileNumber", e.target.value.replace(/\D/g, ""))}
                      disabled={mobileVerified}
                      className="h-12 bg-gradient-to-r from-white to-cyan-50/30 border-slate-200 focus:border-[#22d3ee] focus:ring-[#22d3ee]/20 transition-all hover:border-[#22d3ee]/50 focus:shadow-lg focus:shadow-[#22d3ee]/10 disabled:opacity-60"
                      maxLength={15}
                      required
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#22d3ee]/0 via-[#22d3ee]/5 to-[#22d3ee]/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                  </div>
                </div>

                {/* OTP Section */}
                {!mobileVerified && (
                  <div className="mt-3 p-4 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 space-y-3">
                    {otpStep === "idle" && (
                      <Button
                        type="button"
                        onClick={sendOTP}
                        disabled={!formData.mobileNumber || !formData.email}
                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold"
                      >
                        Send OTP via SMS
                      </Button>
                    )}
                    {otpStep === "sending" && (
                      <Button type="button" disabled className="w-full bg-blue-400 text-white font-semibold">
                        Sending OTP...
                      </Button>
                    )}
                    {otpStep === "verifying" && (
                      <div className="space-y-3">
                        <div className="flex gap-3 items-center">
                          <Input
                            type="text"
                            placeholder="Enter 6-digit OTP"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            maxLength={6}
                            className="h-12 flex-1 font-mono text-center text-2xl tracking-widest border-2 border-blue-300 focus:border-blue-500"
                            autoFocus
                          />
                          <div className="text-center min-w-[52px]">
                            <span className="text-lg font-bold text-blue-600">
                              {Math.floor(otpCountdown / 60)}:{String(otpCountdown % 60).padStart(2, "0")}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 text-center">
                          OTP sent to {formData.countryCode}{formData.mobileNumber}
                        </p>
                        {previewOtp && (
                          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-center space-y-2">
                            <p className="text-xs text-amber-700 font-medium">Preview Mode — Your OTP</p>
                            <p className="text-2xl font-bold text-amber-800 tracking-widest font-mono">{previewOtp}</p>
                            <Button
                              type="button"
                              size="sm"
                              className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
                              onClick={() => {
                                setOtpCode(previewOtp)
                                verifyOTP(previewOtp)
                              }}
                            >
                              Use this code &amp; verify
                            </Button>
                          </div>
                        )}
                        <Button
                          type="button"
                          onClick={verifyOTP}
                          disabled={otpCode.length !== 6}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-11"
                        >
                          Verify OTP
                        </Button>
                        <Button
                          type="button"
                          onClick={sendOTP}
                          variant="outline"
                          className="w-full text-blue-600 border-blue-300 hover:bg-blue-50 text-sm"
                        >
                          Resend OTP
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-slate-700 text-sm font-medium flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                      <MapPin className="h-3 w-3 text-white" />
                    </div>
                    State *
                  </Label>
                  <div className="relative group">
                    <Input
                      id="state"
                      placeholder="State"
                      value={formData.state}
                      onChange={(e) => handleChange("state", e.target.value)}
                      className="h-12 bg-gradient-to-r from-white to-pink-50/30 border-slate-200 focus:border-pink-500 focus:ring-pink-500/20 transition-all hover:border-pink-500/50 focus:shadow-lg focus:shadow-pink-500/10"
                      required
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/5 to-pink-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pinCode" className="text-slate-700 text-sm font-medium flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">#</span>
                    </div>
                    PIN Code *
                  </Label>
                  <div className="relative group">
                    <Input
                      id="pinCode"
                      placeholder="123456"
                      value={formData.pinCode}
                      onChange={(e) => handleChange("pinCode", e.target.value.replace(/\D/g, ""))}
                      className="h-12 bg-gradient-to-r from-white to-violet-50/30 border-slate-200 focus:border-violet-500 focus:ring-violet-500/20 transition-all hover:border-violet-500/50 focus:shadow-lg focus:shadow-violet-500/10 font-mono"
                      maxLength={10}
                      required
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/5 to-violet-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                  </div>
                </div>
              </div>

              <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
                <Label htmlFor="referralCode" className="text-slate-700 text-sm font-medium flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <Gift className="h-3 w-3 text-white" />
                  </div>
                  Referral Code (Optional)
                </Label>
                <div className="relative group">
                  <Input
                    id="referralCode"
                    placeholder="Enter referral code"
                    value={formData.referralCode}
                    onChange={(e) => handleChange("referralCode", e.target.value.toUpperCase())}
                    className="h-12 bg-gradient-to-r from-white to-amber-50/30 border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 transition-all hover:border-amber-400/50 focus:shadow-lg focus:shadow-amber-400/10 font-mono font-bold tracking-wider"
                    maxLength={10}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-400/5 to-amber-400/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                </div>
              </div>

              <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
                <Label htmlFor="password" className="text-slate-700 text-sm font-medium flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">🔒</span>
                  </div>
                  Password *
                </Label>
                <div className="relative group">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter Password"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    className="h-12 pr-10 bg-gradient-to-r from-white to-emerald-50/30 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all hover:border-emerald-500/50 focus:shadow-lg focus:shadow-emerald-500/10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors hover:scale-110"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                </div>
                <p className="text-xs text-slate-400">At least 6 characters</p>
              </div>

              <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
                <Label htmlFor="confirmPassword" className="text-slate-700 text-sm font-medium flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                  Confirm Password *
                </Label>
                <div className="relative group">
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    className="h-12 bg-gradient-to-r from-white to-emerald-50/30 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all hover:border-emerald-500/50 focus:shadow-lg focus:shadow-emerald-500/10"
                    required
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                </div>
              </div>

              <div className="space-y-3 p-5 bg-gradient-to-r from-violet-50/90 to-purple-50/90 rounded-xl border border-violet-200 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: "0.45s" }}>
                <Label className="text-slate-700 text-sm font-medium flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">🔒</span>
                  </div>
                  Security Verification *
                </Label>
                <div className="flex items-center gap-3">
                  {/* Clean CAPTCHA Display */}
                  <div className="relative flex-1 max-w-[180px] h-14 bg-white rounded-lg border-2 border-violet-300 shadow-md overflow-hidden flex items-center justify-center">
                    {/* CAPTCHA Text - Clean and readable */}
                    <div className="flex gap-1.5">
                      {captcha.text.split("").map((char, i) => (
                        <span
                          key={i}
                          className="font-mono select-none leading-7 text-sm font-bold tracking-widest text-[rgba(10,10,10,1)]"
                          style={{
                            letterSpacing: "0.05em",
                          }}
                        >
                          {char}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Input Field */}
                  <div className="relative flex-1 group">
                    <Input
                      type="text"
                      placeholder="Enter code"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                      className="h-14 bg-white border-2 border-violet-300 text-center font-mono text-lg font-bold tracking-widest focus:border-violet-500 focus:ring-violet-500/20 transition-all hover:border-violet-400 focus:shadow-lg focus:shadow-violet-500/10 uppercase"
                      maxLength={6}
                      required
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/5 to-violet-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                  </div>
                  
                  {/* Refresh Button */}
                  <Button
                    type="button"
                    onClick={generateCaptcha}
                    variant="outline"
                    size="icon"
                    className="h-14 w-14 border-2 border-violet-300 hover:bg-violet-100 hover:border-violet-400 bg-white transition-all hover:scale-105 hover:rotate-180 duration-300"
                  >
                    <RefreshCcw className="h-5 w-5 text-[#7c3aed]" />
                  </Button>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                  Enter the 6-character code shown above to verify you're human
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-gradient-to-r from-[#E85D3B] via-orange-500 to-[#7c3aed] hover:from-[#d14d2c] hover:via-orange-600 hover:to-purple-600 text-white rounded-xl shadow-2xl shadow-[#E85D3B]/40 font-bold text-base transition-all hover:scale-[1.02] hover:shadow-[#E85D3B]/60 animate-fade-in-up relative overflow-hidden group"
                style={{ animationDelay: "0.5s" }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <div className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating Account...
                    </div>
                  ) : (
                    "Create Account"
                  )}
                </div>
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-500 animate-fade-in-up-delay-2">
          Already have an account?{" "}
          <button
            onClick={() => router.push("/participant/login")}
            className="text-[#e85d3b] hover:underline font-medium"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
