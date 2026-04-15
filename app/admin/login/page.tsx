"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FlowChainLogo } from "@/components/flowchain-logo"
import { AlertCircle, Loader2, Lock, Eye, EyeOff, Shield, Users } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { setAdminAuth } from "@/lib/auth"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/secure-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: password, loginType: "admin" }),
      })

      const data = await response.json()

      if (data.success) {
        setAdminAuth(data.token, email, data.role, data.permissions)
        router.push("/admin/dashboard")
      } else {
        setError(data.error || "Login failed. Please try again.")
      }
    } catch (err) {
      setError("Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-gradient-to-br from-[#085078] via-[#6968A6] to-[#CF9893]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(105,104,166,0.3),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(207,152,147,0.3),transparent_50%)]" />

      <div className="w-full max-w-sm space-y-6 relative z-10">
        <div className="text-center space-y-2 animate-[fadeInUp_0.5s_ease-out]">
          <FlowChainLogo size="lg" showTagline={false} className="justify-center mb-4" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-2">
            <Shield className="h-4 w-4 text-white" />
            <span className="text-xs font-semibold text-white">Admin Access</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">Admin Portal</h1>
          <p className="text-sm text-white/70">Manage participants and platform data</p>
        </div>

        <Card className="animate-[fadeInUp_0.6s_ease-out] border-0 shadow-2xl bg-white/95 backdrop-blur-xl rounded-2xl">
          <CardContent className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#085078] text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="admin@123"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 border-[#6968A6]/30 focus:border-[#6968A6] focus:ring-[#6968A6]/20 rounded-xl transition-all duration-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#085078] text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6968A6]" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pl-10 pr-10 border-[#6968A6]/30 focus:border-[#6968A6] focus:ring-[#6968A6]/20 rounded-xl transition-all duration-200"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6968A6] hover:text-[#085078] transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-[#CF9893]/20 border-[#CF9893]">
                  <AlertCircle className="h-4 w-4 text-[#CF9893]" />
                  <AlertDescription className="text-sm text-[#085078]">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-[#6968A6] to-[#085078] hover:from-[#5a5995] hover:to-[#074068] text-white rounded-xl shadow-lg shadow-[#6968A6]/30 font-semibold transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#6968A6]/40"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Access Admin Dashboard
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-white/60">Authorized Administrators only</p>
      </div>
    </div>
  )
}
