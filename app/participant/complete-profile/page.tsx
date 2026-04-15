"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Loader2, User, Mail, Wallet, MapPin, CheckCircle } from "lucide-react"
import { FlowChainLogo } from "@/components/flowchain-logo"

export default function CompleteProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [participantEmail, setParticipantEmail] = useState("")
  
  const [formData, setFormData] = useState({
    fullName: "",
    gmail: "",
    bep20Address: "",
    fullAddress: "",
  })
  
  const [errors, setErrors] = useState({
    fullName: "",
    gmail: "",
    bep20Address: "",
    fullAddress: "",
  })

  useEffect(() => {
    checkAuthAndDetails()
  }, [])

  const checkAuthAndDetails = async () => {
    try {
      const participantData = localStorage.getItem("participantData")
      if (!participantData) {
        router.push("/participant/login")
        return
      }

      const data = JSON.parse(participantData)
      setParticipantEmail(data.email)

      // Check if user has already completed details
      const { data: participant, error } = await supabase
        .from("participants")
        .select("details_completed, full_name, email, wallet_address, full_address")
        .eq("email", data.email)
        .single()

      if (error) {
        console.error("[v0] Error checking participant details:", error)
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        })
        return
      }

      if (participant?.details_completed) {
        // Already completed, redirect to dashboard
        router.push("/participant/dashboard")
        return
      }

      // Pre-fill existing data if any
      setFormData({
        fullName: participant?.full_name || "",
        gmail: participant?.email || data.email,
        bep20Address: participant?.wallet_address || "",
        fullAddress: participant?.full_address || "",
      })
    } catch (error) {
      console.error("[v0] Error in checkAuthAndDetails:", error)
      router.push("/participant/login")
    } finally {
      setIsCheckingAuth(false)
    }
  }

  const validateForm = () => {
    const newErrors = {
      fullName: "",
      gmail: "",
      bep20Address: "",
      fullAddress: "",
    }

    let isValid = true

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required"
      isValid = false
    }

    if (!formData.gmail.trim()) {
      newErrors.gmail = "Gmail is required"
      isValid = false
    } else if (!/^[^\s@]+@gmail\.com$/.test(formData.gmail)) {
      newErrors.gmail = "Please enter a valid Gmail address"
      isValid = false
    }

    if (!formData.bep20Address.trim()) {
      newErrors.bep20Address = "BEP20 wallet address is required"
      isValid = false
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(formData.bep20Address)) {
      newErrors.bep20Address = "Please enter a valid BEP20 address (0x...)"
      isValid = false
    }

    if (!formData.fullAddress.trim()) {
      newErrors.fullAddress = "Full address is required"
      isValid = false
    } else if (formData.fullAddress.trim().length < 10) {
      newErrors.fullAddress = "Please enter a complete address"
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill all fields correctly",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase
        .from("participants")
        .update({
          full_name: formData.fullName.trim(),
          email: formData.gmail.trim(),
          wallet_address: formData.bep20Address.trim(),
          full_address: formData.fullAddress.trim(),
          details_completed: true,
          details_submitted_at: new Date().toISOString(),
        })
        .eq("email", participantEmail)

      if (error) throw error

      // Update localStorage with new email if changed
      const participantData = localStorage.getItem("participantData")
      if (participantData) {
        const data = JSON.parse(participantData)
        data.email = formData.gmail.trim()
        data.full_name = formData.fullName.trim()
        data.wallet_address = formData.bep20Address.trim()
        localStorage.setItem("participantData", JSON.stringify(data))
      }

      toast({
        title: "Profile Completed!",
        description: "Welcome to FlowChain! You can now access your dashboard.",
      })

      // Redirect to dashboard
      setTimeout(() => {
        router.push("/participant/dashboard")
      }, 1000)
    } catch (error) {
      console.error("[v0] Error submitting profile:", error)
      toast({
        title: "Submission Failed",
        description: "Please try again later",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-cyan-50">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-cyan-50 flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" style={{ animationDelay: '2s' }} />
      </div>

      <Card className="w-full max-w-2xl relative z-10 shadow-2xl border-2 border-purple-100">
        <CardContent className="p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <FlowChainLogo className="h-12 w-12" />
            </div>
            
            <div className="inline-block p-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-2xl mb-4">
              <User className="h-8 w-8 text-white" />
            </div>
            
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Complete Your Profile
            </h1>
            <p className="text-slate-600">
              Fill in your details to access the FlowChain platform
            </p>
            
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 font-medium">
                ⚠️ This information is mandatory to access your dashboard
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <Label htmlFor="fullName" className="text-slate-700 font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className={`mt-2 h-12 ${errors.fullName ? "border-red-500" : ""}`}
              />
              {errors.fullName && (
                <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
              )}
            </div>

            {/* Gmail */}
            <div>
              <Label htmlFor="gmail" className="text-slate-700 font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Gmail Address
              </Label>
              <Input
                id="gmail"
                type="email"
                placeholder="youremail@gmail.com"
                value={formData.gmail}
                onChange={(e) => setFormData({ ...formData, gmail: e.target.value })}
                className={`mt-2 h-12 ${errors.gmail ? "border-red-500" : ""}`}
              />
              {errors.gmail && (
                <p className="text-red-500 text-sm mt-1">{errors.gmail}</p>
              )}
            </div>

            {/* BEP20 Address */}
            <div>
              <Label htmlFor="bep20Address" className="text-slate-700 font-semibold flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                BEP20 Wallet Address
                <span className="text-xs text-slate-500 font-normal">(For Payouts)</span>
              </Label>
              <Input
                id="bep20Address"
                type="text"
                placeholder="0x..."
                value={formData.bep20Address}
                onChange={(e) => setFormData({ ...formData, bep20Address: e.target.value })}
                className={`mt-2 h-12 font-mono text-sm ${errors.bep20Address ? "border-red-500" : ""}`}
              />
              {errors.bep20Address && (
                <p className="text-red-500 text-sm mt-1">{errors.bep20Address}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                Your BEP20 (Binance Smart Chain) wallet address for receiving payouts
              </p>
            </div>

            {/* Full Address */}
            <div>
              <Label htmlFor="fullAddress" className="text-slate-700 font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Full Address
              </Label>
              <textarea
                id="fullAddress"
                placeholder="Enter your complete address with city, state, country, and postal code"
                value={formData.fullAddress}
                onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
                rows={4}
                className={`mt-2 w-full px-4 py-3 rounded-lg border ${
                  errors.fullAddress ? "border-red-500" : "border-slate-300"
                } focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none`}
              />
              {errors.fullAddress && (
                <p className="text-red-500 text-sm mt-1">{errors.fullAddress}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Submit & Continue
                </>
              )}
            </Button>
          </form>

          {/* Security Note */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-600 text-center">
              🔒 Your information is secure and will only be used for payout processing
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
