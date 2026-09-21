"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FlowChainLogo } from "@/components/flowchain-logo"
import { Eye, EyeOff, AtSign, Mail, Phone, MapPin, Globe, User, Gift, RefreshCcw, Sun, Moon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { setParticipantAuth } from "@/lib/auth"

const ADMIN_WHATSAPP = "+995574450590"

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
  const { theme, setTheme } = useTheme()
  const isLightTheme = theme === "light"
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [captcha, setCaptcha] = useState({ text: "", answer: "" })
  const [captchaInput, setCaptchaInput] = useState("")

  // Post-registration state
  const [referralApplied, setReferralApplied] = useState(false)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    countryCode: "",
    mobileNumber: "",
    password: "",
    confirmPassword: "",
    country: "",
    state: "",
    referralCode: "",
    accountType: "normal" as "normal" | "funded",
  })
  const [selectedCountryData, setSelectedCountryData] = useState<typeof COUNTRIES_DATA[0] | null>(null)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
    referralCode: formData.referralCode,
          accountType: formData.accountType,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Set sessionStorage auth so isParticipantAuthenticated() returns true
        const token = data.participantId || `preview-${Date.now()}`
        setParticipantAuth(
          token,
          data.walletAddress || "",
          data.email || formData.email,
          data.username || formData.username,
          data.full_name || `${formData.firstName} ${formData.lastName}`,
          false,
          data.created_at || new Date().toISOString(),
          false,
        )

        // Also persist extended data to localStorage for dashboard
        localStorage.setItem("participantData", JSON.stringify({
          id: data.participantId,
          email: data.email || formData.email,
          username: data.username || formData.username,
          wallet_address: data.walletAddress || "",
          referral_code: data.referralCode || "",
          account_balance: 0,
          bonus_balance: 0,
          total_earnings: 0,
          total_referrals: 0,
          status: "active",
          rank: "bronze",
          is_active: true,
          created_at: data.created_at || new Date().toISOString(),
        }))

        toast({
          title: "Account Created!",
          description: `Welcome @${formData.username}! Redirecting to your dashboard...`,
        })

        // Redirect to dashboard after short delay to show success message
        setTimeout(() => {
          router.push("/participant/dashboard")
        }, 1500)
      } else {
        toast({
          title: "Registration Failed",
          description: data.message || "Unable to complete registration. Please try again.",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Connection Error",
        description: "Unable to connect. Please check your connection and try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const stars = Array.from({ length: 15 }, (_, i) => ({
    top: `${8 + ((i * 37) % 84)}%`,
    left: `${5 + ((i * 61) % 90)}%`,
    delay: (i % 6) * 0.5,
    size: 2 + (i % 3) * 0.5,
  }))

  const particles = Array.from({ length: 10 }, (_, i) => ({
    delay: i * 0.4,
    size: 4 + (i % 4),
    color: ["#fbbf24", "#22d3ee", "#34d399"][i % 3],
    left: `${5 + i * 9}%`,
    duration: 8 + (i % 5),
  }))

  return (
    <div className={cn(
      "register-page min-h-screen min-h-dvh relative overflow-hidden flex items-center justify-center p-4 transition-colors duration-500",
      isLightTheme ? "theme-light bg-slate-100 text-slate-950" : "theme-dark bg-slate-950 text-white",
    )}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setTheme(isLightTheme ? "dark" : "light")}
        aria-label={isLightTheme ? "Switch to dark theme" : "Switch to light theme"}
        className={cn(
          "fixed right-4 top-4 z-50 gap-2 rounded-full shadow-lg backdrop-blur transition-colors",
          isLightTheme
            ? "border-slate-300 bg-white/90 text-slate-800 hover:bg-white"
            : "border-amber-400/30 bg-slate-900/90 text-amber-200 hover:bg-slate-800",
        )}
      >
        {isLightTheme ? <Moon data-icon="inline-start" /> : <Sun data-icon="inline-start" />}
        <span className="hidden sm:inline">{isLightTheme ? "Dark theme" : "Light theme"}</span>
      </Button>

      {/* Elite Fund dark trading atmosphere */}
      <div className={cn(
        "fixed inset-0 -z-10 transition-colors duration-500",
        isLightTheme ? "bg-gradient-to-br from-slate-100 via-white to-slate-200" : "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
      )} />
      <div className="fixed inset-0 opacity-40 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 via-transparent to-cyan-400/10 animate-gradient-shift" />
      </div>
      <div className="fixed top-10 left-10 size-64 bg-amber-400/10 rounded-full blur-3xl animate-float" />
      <div className="fixed bottom-20 right-20 size-80 bg-cyan-400/10 rounded-full blur-3xl animate-float-slow" />
      <div className="fixed top-1/2 left-1/2 size-72 bg-emerald-400/10 rounded-full blur-3xl animate-float-delayed" />

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
      <div className="w-full max-w-2xl relative z-10 my-8">
        <Card className={cn(
          "backdrop-blur-xl animate-fade-in-up-delay-1 overflow-hidden relative group transition-colors duration-500",
          isLightTheme
            ? "border-slate-200 bg-white/95 shadow-2xl shadow-slate-300/40"
            : "border border-amber-400/20 bg-slate-900/90 shadow-2xl shadow-black/40",
        )}>
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-amber-400/20 via-cyan-400/10 to-emerald-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600 animate-gradient-shift" />
          <div className="absolute top-10 right-10 size-32 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-2xl animate-pulse pointer-events-none" />
          <div className="absolute bottom-10 left-10 size-40 bg-gradient-to-br from-cyan-400/10 to-transparent rounded-full blur-2xl animate-pulse pointer-events-none" style={{ animationDelay: "1s" }} />
          
          <CardContent className="p-5 sm:p-6 relative z-10">
            <div className={cn(
              "mb-5 flex items-center gap-3 rounded-xl border px-3 py-3",
              isLightTheme ? "border-blue-200 bg-blue-50/80" : "border-blue-400/20 bg-blue-950/40",
            )}>
              <FlowChainLogo size="xs" showTagline={false} className="shrink-0" />
              <div>
                <h1 className={cn("text-2xl font-bold", isLightTheme ? "text-blue-950" : "text-white")}>Create your account</h1>
                <p className={cn("text-sm", isLightTheme ? "text-blue-700" : "text-blue-200/80")}>Join Elite Fund in less than a minute</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name and Surname */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-slate-200 text-sm font-medium flex items-center gap-2">
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
                      className="h-12 bg-gradient-to-r from-slate-950/80 to-slate-900/60 border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all hover:border-emerald-500/50 focus:shadow-lg focus:shadow-emerald-500/10"
                      required
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-slate-200 text-sm font-medium flex items-center gap-2">
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
                      className="h-12 bg-gradient-to-r from-slate-950/80 to-slate-900/60 border-slate-700 focus:border-teal-500 focus:ring-teal-500/20 transition-all hover:border-teal-500/50 focus:shadow-lg focus:shadow-teal-500/10"
                      required
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                  </div>
                </div>
              </div>

              <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: "0.08s" }}>
                <Label className="text-slate-200 text-sm font-medium">Account Type *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([
                    { value: "normal", title: "Normal Account", description: "Standard platform account" },
                    { value: "funded", title: "Funded Account", description: "Trade with a funded balance" },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={formData.accountType === option.value}
                      onClick={() => handleChange("accountType", option.value)}
                      className={`rounded-xl border p-4 text-left transition-all ${formData.accountType === option.value ? "border-amber-400 bg-amber-400/10 shadow-md shadow-amber-400/10" : "border-slate-700 bg-slate-950/60 hover:border-cyan-400/60"}`}
                    >
                      <span className={cn("block text-sm font-semibold", isLightTheme ? "text-slate-900" : "text-slate-200")}>{option.title}</span>
                      <span className={cn("mt-1 block text-xs", isLightTheme ? "text-slate-600" : "text-slate-500")}>{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                <Label htmlFor="username" className="text-slate-200 text-sm font-medium flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#fbbf24] to-purple-600 flex items-center justify-center">
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
                    className="h-12 bg-gradient-to-r from-slate-950/80 to-slate-900/60 border-slate-700 focus:border-[#fbbf24] focus:ring-[#fbbf24]/20 transition-all hover:border-[#fbbf24]/50 focus:shadow-lg focus:shadow-[#fbbf24]/10"
                    maxLength={20}
                    required
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#fbbf24]/0 via-[#fbbf24]/5 to-[#fbbf24]/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                </div>
                <p className="text-xs text-slate-500">3-20 characters, letters, numbers, and underscores only</p>
              </div>

              <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
                <Label htmlFor="email" className="text-slate-200 text-sm font-medium flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#fbbf24] to-orange-500 flex items-center justify-center">
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
                    className="h-12 bg-gradient-to-r from-slate-950/80 to-slate-900/60 border-slate-700 focus:border-[#fbbf24] focus:ring-[#fbbf24]/20 transition-all hover:border-[#fbbf24]/50 focus:shadow-lg focus:shadow-[#fbbf24]/10"
                    required
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#fbbf24]/0 via-[#fbbf24]/5 to-[#fbbf24]/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                </div>
              </div>

              {/* Compact Country Selector */}
              <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                <Label htmlFor="country" className="text-slate-200 text-sm font-medium flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Globe className="h-3 w-3 text-white" />
                  </div>
                  Country *
                </Label>
                
                <div className={cn("flex items-center gap-3 p-3 rounded-lg border", isLightTheme ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-cyan-400/20")}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-2xl">{selectedCountryData?.flag || "🌍"}</span>
                    <div className="min-w-0 flex-1">
                      <Select value={formData.country} onValueChange={handleCountryChange}>
                        <SelectTrigger className="h-10 bg-slate-900 border-slate-700 text-white hover:border-cyan-400/60 focus:border-cyan-400 transition-all">
                          <SelectValue placeholder="Choose a country" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 text-white max-h-[300px]">
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
                  <div className={cn("flex items-center gap-1 px-3 py-1 rounded-md border", isLightTheme ? "bg-white border-slate-200" : "bg-slate-900 border-cyan-400/30")}>
                    <span className="text-xs text-slate-500">Code:</span>
                    <span className="text-sm font-bold text-blue-600">{selectedCountryData?.code || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Mobile Number with Auto Country Code */}
              <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
                <Label htmlFor="mobileNumber" className="text-slate-200 text-sm font-medium flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#22d3ee] to-cyan-600 flex items-center justify-center">
                    <Phone className="h-3 w-3 text-white" />
                  </div>
                  Mobile Number *
                </Label>
                <div className="flex gap-2">
                <div className={cn("w-[110px] h-12 px-3 rounded-lg border flex items-center justify-center gap-1.5", isLightTheme ? "bg-white border-slate-200" : "bg-slate-950/80 border-slate-700")}>
                  <span className="text-lg">{selectedCountryData?.flag || "🌍"}</span>
                  <span className="text-sm font-bold text-slate-700">{formData.countryCode || "+00"}</span>
                </div>
                  <div className="relative flex-1 group">
                    <Input
                      id="mobileNumber"
                      type="tel"
                      placeholder="9876543210"
                      value={formData.mobileNumber}
                      onChange={(e) => handleChange("mobileNumber", e.target.value.replace(/\D/g, ""))}
                      className="h-12 bg-gradient-to-r from-slate-950/80 to-slate-900/60 border-slate-700 focus:border-[#22d3ee] focus:ring-[#22d3ee]/20 transition-all hover:border-[#22d3ee]/50 focus:shadow-lg focus:shadow-[#22d3ee]/10"
                      maxLength={15}
                      required
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#22d3ee]/0 via-[#22d3ee]/5 to-[#22d3ee]/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-slate-200 text-sm font-medium flex items-center gap-2">
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
                      className="h-12 bg-gradient-to-r from-slate-950/80 to-slate-900/60 border-slate-700 focus:border-pink-500 focus:ring-pink-500/20 transition-all hover:border-pink-500/50 focus:shadow-lg focus:shadow-pink-500/10"
                      required
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/5 to-pink-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                  </div>
                </div>

  </div>

              <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
                <Label htmlFor="referralCode" className="text-slate-200 text-sm font-medium flex items-center gap-2">
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
                    className="h-12 bg-gradient-to-r from-slate-950/80 to-slate-900/60 border-slate-700 focus:border-amber-400 focus:ring-amber-400/20 transition-all hover:border-amber-400/50 focus:shadow-lg focus:shadow-amber-400/10 font-mono font-bold tracking-wider"
                    maxLength={10}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-400/5 to-amber-400/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                </div>
              </div>

              <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
                <Label htmlFor="password" className="text-slate-200 text-sm font-medium flex items-center gap-2">
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
                    className="h-12 pr-10 bg-gradient-to-r from-slate-950/80 to-slate-900/60 border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all hover:border-emerald-500/50 focus:shadow-lg focus:shadow-emerald-500/10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-600 transition-colors hover:scale-110"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                </div>
                <p className="text-xs text-slate-500">At least 6 characters</p>
              </div>

              <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
                <Label htmlFor="confirmPassword" className="text-slate-200 text-sm font-medium flex items-center gap-2">
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
                    className="h-12 bg-gradient-to-r from-slate-950/80 to-slate-900/60 border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all hover:border-emerald-500/50 focus:shadow-lg focus:shadow-emerald-500/10"
                    required
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none rounded-md" />
                </div>
              </div>

              <div className="space-y-3 p-5 bg-gradient-to-r from-slate-950/90 to-slate-900/80 rounded-xl border border-amber-400/20 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: "0.45s" }}>
                <Label className="text-slate-200 text-sm font-medium flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">🔒</span>
                  </div>
                  Security Verification *
                </Label>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
                  {/* Clean CAPTCHA Display */}
                  <div className="flex-1 min-w-0 h-14 bg-slate-950 rounded-lg border-2 border-amber-400/30 shadow-md overflow-hidden flex items-center justify-center px-2 sm:px-3">
                    {/* CAPTCHA Text - Clean and readable */}
                    <div className="flex gap-0.5 sm:gap-1.5 flex-wrap justify-center">
                      {captcha.text.split("").map((char, i) => (
                        <span
                          key={i}
                          className="font-mono select-none leading-7 text-sm sm:text-base font-bold tracking-widest text-amber-200 flex-shrink-0"
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
                  <div className="flex-1 min-w-0 relative group">
                    <Input
                      type="text"
                      placeholder="Enter code"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                      className="h-14 bg-slate-950/80 border-2 border-amber-400/30 text-white text-center font-mono text-base sm:text-lg font-bold tracking-widest focus:border-amber-300 focus:ring-amber-300/20 transition-all hover:border-amber-300 focus:shadow-lg focus:shadow-amber-300/10 uppercase"
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
                    className="h-14 w-14 flex-shrink-0 border-2 border-amber-400/30 hover:bg-amber-400/10 hover:border-amber-300 bg-slate-950/80 transition-all hover:scale-105 hover:rotate-180 duration-300"
                  >
                    <RefreshCcw className="h-5 w-5 text-[#fbbf24]" />
                  </Button>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse flex-shrink-0" />
                  <span>Enter the 6-character code shown above to verify you&apos;re human</span>
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-gradient-to-r from-amber-300 via-yellow-500 to-cyan-400 hover:from-amber-200 hover:via-yellow-400 hover:to-cyan-300 text-slate-950 rounded-xl shadow-2xl shadow-amber-400/20 font-bold text-base transition-all hover:scale-[1.02] hover:shadow-amber-400/40 animate-fade-in-up relative overflow-hidden group"
                style={{ animationDelay: "0.5s" }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
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

        <p className="text-center text-sm text-slate-400 animate-fade-in-up-delay-2">
          Already have an account?{" "}
          <button
            onClick={() => router.push("/participant/login")}
            className="text-amber-300 hover:text-amber-200 hover:underline font-medium"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
