"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, User, Mail, Wallet, MapPin, CheckCircle } from "lucide-react"
import { FlowChainLogo } from "@/components/flowchain-logo"

export default function CompleteProfilePage() {
  const router = useRouter()
  const { toast } = useToast()

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

      const res = await fetch("/api/participant/me")
      const json = await res.json()
      const participant: any = json.participant || null

      if (!participant) {
        toast({ title: "Unable to Load Profile", description: "Please try again or contact support.", variant: "destructive" })
        return
      }

      if (participant.details_completed) {
        router.push("/participant/dashboard")
        return
      }

      setFormData({
        fullName: participant.full_name || "",
        gmail: participant.email || data.email,
        bep20Address: participant.wallet_address || "",
        fullAddress: participant.full_address || "",
      })
    } catch {
      router.push("/participant/login")
    } finally {
      setIsCheckingAuth(false)
    }
  }

  const validateForm = () => {
    const newErrors = { fullName: "", gmail: "", bep20Address: "", fullAddress: "" }
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
    }

    if (!formData.fullAddress.trim()) {
      newErrors.fullAddress = "Full address is required"
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const res = await fetch("/api/participant/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: participantEmail,
          fullName: formData.fullName,
          gmail: formData.gmail,
          bep20Address: formData.bep20Address,
          fullAddress: formData.fullAddress,
        }),
      })
      const data = await res.json()

      if (!data.success) throw new Error(data.error || "Failed to update profile")

      toast({ title: "Profile Updated", description: "Your profile has been completed successfully!" })
      router.push("/participant/dashboard")
    } catch {
      toast({ title: "Update Failed", description: "Unable to save your profile. Please try again.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <FlowChainLogo size="md" className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">Complete Your Profile</h1>
          <p className="text-slate-600 mt-2">Please fill in your details to continue</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Full Name
                </Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="Enter your full name"
                  className={errors.fullName ? "border-red-500" : ""}
                />
                {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gmail" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Gmail Address
                </Label>
                <Input
                  id="gmail"
                  type="email"
                  value={formData.gmail}
                  onChange={(e) => setFormData((p) => ({ ...p, gmail: e.target.value }))}
                  placeholder="youremail@gmail.com"
                  className={errors.gmail ? "border-red-500" : ""}
                />
                {errors.gmail && <p className="text-xs text-red-500">{errors.gmail}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bep20Address" className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" /> BEP20 Wallet Address
                </Label>
                <Input
                  id="bep20Address"
                  value={formData.bep20Address}
                  onChange={(e) => setFormData((p) => ({ ...p, bep20Address: e.target.value }))}
                  placeholder="0x..."
                  className={errors.bep20Address ? "border-red-500" : ""}
                />
                {errors.bep20Address && <p className="text-xs text-red-500">{errors.bep20Address}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullAddress" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Full Address
                </Label>
                <Input
                  id="fullAddress"
                  value={formData.fullAddress}
                  onChange={(e) => setFormData((p) => ({ ...p, fullAddress: e.target.value }))}
                  placeholder="Enter your full address"
                  className={errors.fullAddress ? "border-red-500" : ""}
                />
                {errors.fullAddress && <p className="text-xs text-red-500">{errors.fullAddress}</p>}
              </div>

              <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-[#E85D3B] to-[#7c3aed] hover:opacity-90 text-white">
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><CheckCircle className="h-4 w-4 mr-2" /> Complete Profile</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
