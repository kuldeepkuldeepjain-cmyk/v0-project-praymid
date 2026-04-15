"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FlowChainLogo } from "@/components/flowchain-logo"
import { AlertCircle, Loader2, Lock, Eye, EyeOff, Crown, Wallet } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { setAdminAuth } from "@/lib/auth"

export default function SuperAdminLoginPage() {
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
        body: JSON.stringify({ email, otp: password, loginType: "superadmin" }),
      })

      const data = await response.json()

      if (data.success) {
        setAdminAuth(data.token, email, data.role, data.permissions)
        router.push("/superadmin/dashboard")
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
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />

      <div className="w-full max-w-sm space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <FlowChainLogo size="lg" showTagline={false} className="justify-center mb-4" />
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-2">
            <Crown className="h-5 w-5 text-amber-400" />
            <span className="text-sm font-bold text-amber-300">Super Admin Portal</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">Wallet Approval Center</h1>
          <p className="text-sm text-purple-300">Access wallet approvals and token collection</p>
        </div>

        <Card className="bg-white/10 backdrop-blur-sm border-purple-500/30">
          <CardContent className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-purple-200 text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="bitcoin890@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-white/10 border-purple-500/30 text-white placeholder:text-purple-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-purple-200 text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pl-10 pr-10 bg-white/10 border-purple-500/30 text-white placeholder:text-purple-400"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-500/20 border-red-500/30">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-sm text-red-300">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl shadow-lg shadow-amber-500/30 font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Wallet className="h-4 w-4 mr-2" />
                    Access Wallet Approvals
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-purple-400">Authorized Super Administrators only</p>
      </div>
    </div>
  )
}
