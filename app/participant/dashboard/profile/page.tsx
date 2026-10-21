"use client"

import React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  User,
  Mail,
  Wallet,
  CreditCard,
  Calendar,
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Edit2,
  Save,
  X,
  Camera,
  Trash2,
  FileCheck2,
  Upload,
  CheckCircle2,
  Clock3,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { isParticipantAuthenticated, clearParticipantAuth, participantFetch } from "@/lib/auth"
import { ParticipantLedger } from "@/components/participant-ledger"

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const selfieVideoRef = useRef<HTMLVideoElement>(null)
  const selfieStreamRef = useRef<MediaStream | null>(null)
  const selfieCanvasRef = useRef<HTMLCanvasElement>(null)
  const selfieMotionRef = useRef<number[]>([])
  const [mounted, setMounted] = useState(false)
  const [selfieCameraOpen, setSelfieCameraOpen] = useState(false)
  const [selfieLiveness, setSelfieLiveness] = useState<"idle" | "starting" | "move" | "blink" | "ready" | "error">("idle")
  const [selfieMessage, setSelfieMessage] = useState("Camera capture required — uploads are not accepted.")
  const [participantData, setParticipantData] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<any>({})
  const [isUploading, setIsUploading] = useState(false)
  const [kyc, setKyc] = useState<any>(null)
  const [kycForm, setKycForm] = useState({ legal_name: "", date_of_birth: "", country: "", document_type: "", document_number: "", document_front_url: "", document_back_url: "", selfie_url: "" })
  const [kycSubmitting, setKycSubmitting] = useState(false)

  const isAuthenticated = isParticipantAuthenticated()
  const isFundedAccount = participantData?.account_type === "funded"
  const accountTypeLabel = isFundedAccount ? "Funded Account" : "Normal Account"
  const kycStatus = String(kyc?.status ?? "").trim().toLowerCase()
  const isKycVerified = kycStatus === "approved" || kycStatus === "completed"

  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated) {
      router.push("/participant/login")
      return
    }
    
    const fetchParticipantData = async () => {
      try {
        // Get stored participant data from localStorage (set during login)
        const storedData = localStorage.getItem("participantData")
        
        if (!storedData) {
          router.push("/participant/login")
          return
        }

        const parsedData = JSON.parse(storedData)
        const email = parsedData?.email
        
        if (!email) {
          router.push("/participant/login")
          return
        }

        const res = await participantFetch(`/api/participant/me?email=${encodeURIComponent(email)}`)
        if (!res.ok) {
          toast({ title: "Error", description: "Failed to load profile data", variant: "destructive" })
          return
        }
        const json = await res.json()
        const data = json.participant
        if (data) {
          const merged = { ...parsedData, ...data }
          setParticipantData(merged)
          setEditedData(merged)
          localStorage.setItem("participantData", JSON.stringify(merged))
          const kycRes = await participantFetch(`/api/participant/kyc?email=${encodeURIComponent(email)}`)
          if (kycRes.ok) {
            const kycJson = await kycRes.json()
            setKyc(kycJson.verification)
            if (kycJson.verification) setKycForm((current) => ({ ...current, ...kycJson.verification }))
          }
        }
      } catch (err) {
        console.error("Exception in profile fetch:", err)
        toast({ 
          title: "Error", 
          description: "An unexpected error occurred", 
          variant: "destructive" 
        })
      }
    }

    fetchParticipantData()
  }, [router, isAuthenticated, toast])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid File", description: "Please select an image file", variant: "destructive" })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "Please select an image under 5MB", variant: "destructive" })
      return
    }

    uploadImage(file)
  }

  const uploadImage = async (file: File) => {
    setIsUploading(true)

    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Image = reader.result as string
        const res = await participantFetch("/api/participant/me", {
          method: "PATCH",
          body: JSON.stringify({ email: participantData.email, profile_image: base64Image }),
        })
        if (!res.ok) throw new Error("Failed to upload image")
        setParticipantData({ ...participantData, profile_image: base64Image })
        toast({ title: "Success", description: "Profile image updated" })
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast({ title: "Upload Failed", description: "Failed to update profile image", variant: "destructive" })
    } finally {
      setIsUploading(false)
    }
  }

  const removeImage = async () => {
    try {
      const res = await participantFetch("/api/participant/me", {
        method: "PATCH",
        body: JSON.stringify({ email: participantData.email, profile_image: null }),
      })
      if (!res.ok) throw new Error("Failed to remove image")
      setParticipantData({ ...participantData, profile_image: null })
      toast({ title: "Success", description: "Profile image removed" })
    } catch {
      toast({ title: "Error", description: "Failed to remove image", variant: "destructive" })
    }
  }

  const handleSave = async () => {
    try {
      const res = await participantFetch("/api/participant/me", {
        method: "PATCH",
        body: JSON.stringify({
          email: participantData.email,
          username: editedData.username,
          bep20_address: editedData.bep20_address,
        }),
      })
      if (!res.ok) throw new Error("Failed to update")
      setParticipantData({ ...participantData, username: editedData.username, bep20_address: editedData.bep20_address })
      setIsEditing(false)
      toast({ title: "Success", description: "Profile updated successfully" })
    } catch {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" })
    }
  }

  const stopSelfieCamera = () => {
    selfieStreamRef.current?.getTracks().forEach(track => track.stop())
    selfieStreamRef.current = null
    if (selfieVideoRef.current) selfieVideoRef.current.srcObject = null
    selfieMotionRef.current = []
    setSelfieCameraOpen(false)
    setSelfieLiveness("idle")
  }

  const startSelfieCamera = async () => {
    try {
      setSelfieLiveness("starting")
      selfieMotionRef.current = []
      setSelfieMessage("Allow camera access. Center your face inside the guide and hold your phone steady.")
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera is not supported")
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "user" }, width: { ideal: 960, min: 480 }, height: { ideal: 960, min: 480 } }, audio: false })
      selfieStreamRef.current = stream
      setSelfieCameraOpen(true)
      requestAnimationFrame(() => { if (selfieVideoRef.current) { selfieVideoRef.current.srcObject = stream; selfieVideoRef.current.play() } })
      setSelfieLiveness("move")
      setSelfieMessage("Slowly turn your face left and right. We will confirm you automatically.")
    } catch {
      setSelfieLiveness("error")
      setSelfieMessage("Camera access is required. Check your browser permissions and try again.")
    }
  }

  const captureLiveSelfie = () => {
    const video = selfieVideoRef.current
    const canvas = selfieCanvasRef.current
    if (!video || !canvas || selfieLiveness !== "ready") return
    canvas.width = video.videoWidth || 720
    canvas.height = video.videoHeight || 720
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height)
    setKycForm(current => ({ ...current, selfie_url: canvas.toDataURL("image/jpeg", 0.86) }))
    setSelfieMessage("Live selfie captured successfully.")
    stopSelfieCamera()
  }

  const registerSelfieMotion = () => {
    if (selfieLiveness !== "move") return
    const video = selfieVideoRef.current
    const canvas = selfieCanvasRef.current
    if (!video || !canvas || video.readyState < 2) return
    canvas.width = 32; canvas.height = 32
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) return
    context.drawImage(video, 0, 0, 32, 32)
    const pixels = context.getImageData(0, 0, 32, 32).data
    const average = pixels.reduce((sum, value, index) => index % 4 === 0 ? sum + value : sum, 0) / (32 * 32)
    selfieMotionRef.current.push(average)
    if (selfieMotionRef.current.length > 12) selfieMotionRef.current.shift()
    const spread = Math.max(...selfieMotionRef.current) - Math.min(...selfieMotionRef.current)
    if (selfieMotionRef.current.length >= 8 && spread > 8) {
      setSelfieLiveness("ready")
      setSelfieMessage("Liveness confirmed. Hold still, then tap Capture selfie.")
    }
  }

  useEffect(() => {
    if (!selfieCameraOpen || selfieLiveness !== "move") return
    const interval = window.setInterval(registerSelfieMotion, 250)
    return () => window.clearInterval(interval)
  }, [selfieCameraOpen, selfieLiveness])

  const confirmSelfieBlink = () => {
    if (selfieLiveness !== "blink") return
    setSelfieLiveness("ready")
    setSelfieMessage("Liveness confirmed. Capture your live selfie now.")
  }

  useEffect(() => () => selfieStreamRef.current?.getTracks().forEach(track => track.stop()), [])

  const readKycImage = (file: File, field: "document_front_url" | "document_back_url") => {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/) || file.size > 6 * 1024 * 1024) {
      toast({ title: "Invalid image", description: "Use a JPG, PNG, or WEBP image under 6 MB.", variant: "destructive" })
      return
    }
    const reader = new FileReader()
    reader.onload = () => setKycForm(current => ({ ...current, [field]: String(reader.result || "") }))
    reader.readAsDataURL(file)
  }

  const submitKyc = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!participantData?.email || kycSubmitting) return
    setKycSubmitting(true)
    try {
      const imageFields = [
        ["document_front_url", "kyc-front"],
        ["document_back_url", "kyc-back"],
        ["selfie_url", "kyc-selfie"],
      ] as const
      const uploaded = { ...kycForm }
      for (const [field, type] of imageFields) {
        const image = uploaded[field]
        if (!image) throw new Error("Please provide all required identity images")
        if (image.startsWith("data:")) {
          const uploadResponse = await participantFetch("/api/participant/upload-image", {
            method: "POST",
            body: JSON.stringify({ image, type }),
          })
          const uploadJson = await uploadResponse.json().catch(() => ({}))
          if (!uploadResponse.ok || !uploadJson.url) throw new Error(uploadJson.error || "Unable to save identity image")
          uploaded[field] = uploadJson.url
        }
      }
      const res = await participantFetch("/api/participant/kyc", {
        method: "POST",
        body: JSON.stringify({ email: participantData.email, ...uploaded }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || "Unable to submit KYC")
      setKyc(json.verification)
      setKycForm(uploaded)
      toast({ title: "KYC submitted", description: "Your documents are now securely awaiting verification." })
    } catch (error) {
      toast({ title: "KYC submission failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" })
    } finally {
      setKycSubmitting(false)
    }
  }

  const handleLogout = () => {
    clearParticipantAuth()
    toast({ title: "Signed Out", description: "You have been signed out successfully" })
    router.push("/")
  }

  if (!mounted || !participantData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 animate-pulse" />
      </div>
    )
  }

  const displayName = participantData.username || participantData.email?.split("@")[0] || "User"

  const settingsItems = [
    {
      icon: Shield,
      label: "Security",
      color: "text-[#7c3aed]",
      bg: "bg-slate-900/70",
      href: "/participant/dashboard/settings/security",
    },
    {
      icon: Bell,
      label: "Notifications",
      color: "text-[#E85D3B]",
      bg: "bg-orange-100",
      href: "/participant/dashboard/settings/notifications",
    },
    {
      icon: HelpCircle,
      label: "Help & Support",
      color: "text-amber-200",
      bg: "bg-cyan-100",
      href: "/participant/dashboard/settings/help",
    },
  ]

  return (
    <div className="min-h-screen min-h-dvh bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }
      `}</style>
      
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">

      </div>
      
      <header className="glass-card mx-0 rounded-none border-x-0 border-t-0 sticky top-0 z-40 backdrop-blur-xl bg-slate-900/90 border-amber-500/20 relative">
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <Link href="/participant/dashboard">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg hover:scale-110 transition-transform">
                <ArrowLeft className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
              </Button>
            </Link>
            <h1 className="text-base sm:text-lg font-semibold text-white">Profile</h1>
          </div>
          {isEditing ? (
            <div className="flex gap-1.5 sm:gap-2">
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)} className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 hover:scale-110 transition-transform">
                <X className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
              </Button>
              <Button size="icon" onClick={handleSave} className="bg-amber-500 h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 hover:scale-110 transition-transform">
                <Save className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 hover:scale-110 transition-transform">
              <Edit2 className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
            </Button>
          )}
        </div>
      </header>

      <main className="px-2 sm:px-3 md:px-4 lg:px-8 py-4 sm:py-5 md:py-6 lg:py-8 space-y-3 sm:space-y-4 md:space-y-6 relative z-10 max-w-4xl lg:mx-auto">
        {/* Profile Header - Mobile Optimized */}
        <div className="text-center relative animate-fade-in">
          {/* Avatar with glow and ring animation - Mobile Responsive */}
          <div className="relative inline-block mb-3 sm:mb-4">
            {/* Animated ring */}
            <div className="absolute inset-0 w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 -left-1 sm:-left-2 -top-1 sm:-top-2 rounded-full border-2 border-dashed border-amber-300 animate-spin" style={{ animationDuration: "10s" }} />
            {/* Glow effect */}
            <div className="absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-amber-300 to-amber-500 rounded-full blur-lg sm:blur-xl opacity-40 animate-pulse" />
            
            {/* Avatar */}
            {participantData?.profile_image ? (
              <img
                src={participantData.profile_image || "/placeholder.svg"}
                alt="Profile"
                className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full object-cover shadow-xl border-2 sm:border-4 border-white"
              />
            ) : (
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-xl shadow-amber-500/30">
                {displayName.charAt(0).toUpperCase()}
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-transparent" />
                </div>
              </div>
            )}

            {/* Camera Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-r from-amber-500 to-amber-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
              title="Upload Photo"
            >
              {isUploading ? (
                <div className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
              )}
            </button>

            {/* Remove Image Button */}
            {participantData?.profile_image && (
              <button
                onClick={removeImage}
                className="absolute top-0 right-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 hover:scale-110 transition-all"
                title="Remove Photo"
              >
                <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>
          
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-amber-500 to-amber-500 bg-clip-text text-transparent">
            @{displayName}
          </h2>
          <div className="mt-2 sm:mt-2.5 md:mt-3 flex flex-wrap items-center justify-center gap-2">
            <Badge
              className={`px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-medium animate-fade-in ${
  isKycVerified || participantData.activation_fee_paid
  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30"
  : "bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-500/30"
              }`}
            >
              {isKycVerified || participantData.activation_fee_paid ? "Verified" : "Pending Verification"}
            </Badge>
            <Badge className={`px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-semibold ${isFundedAccount ? "border border-amber-300/30 bg-amber-400/15 text-amber-200" : "border border-cyan-300/30 bg-cyan-400/15 text-amber-200"}`}>
              {accountTypeLabel}
            </Badge>
          </div>
        </div>

        {/* Account Information Card - Mobile Optimized */}
        <Card className="border-amber-500/20 shadow-lg sm:shadow-xl bg-slate-800/80 backdrop-blur-xl overflow-hidden relative animate-slide-up">
          {/* Card gradient border effect */}
          <div className="absolute inset-0 bg-amber-400/5 pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-0.5 sm:h-1 bg-gradient-to-r from-amber-300 to-amber-500" />
          
          <CardContent className="p-3 sm:p-4 md:p-5 space-y-2.5 sm:space-y-3 md:space-y-4 relative">
            <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-1.5 sm:gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
              </div>
              Account Information
            </h3>

            <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
              {/* Account type */}
              <div className={`flex items-center gap-2 sm:gap-2.5 md:gap-3 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl border hover:shadow-md transition-all hover:scale-[1.01] ${isFundedAccount ? "bg-amber-950/30 border-amber-400/25" : "bg-slate-900/60 border-cyan-400/25"}`}>
                <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md sm:shadow-lg flex-shrink-0 ${isFundedAccount ? "bg-gradient-to-br from-amber-500 to-amber-500 shadow-amber-500/30" : "bg-gradient-to-br from-amber-500 to-amber-500 shadow-amber-500/30"}`}>
                  <CreditCard className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0"><Label className="text-[10px] sm:text-xs text-slate-300 font-medium">Account type</Label><p className="text-sm sm:text-base text-white font-semibold">{accountTypeLabel}</p></div>
                <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${isFundedAccount ? "bg-amber-400/15 text-amber-200" : "bg-cyan-400/15 text-amber-200"}`}>{isFundedAccount ? "2% rule" : "Standard"}</span>
              </div>

              {/* Username */}
              <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl bg-slate-900/60 border border-amber-500/20 hover:shadow-md transition-all hover:scale-[1.01]">
                <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-md sm:shadow-lg shadow-amber-500/30 flex-shrink-0">
                  <User className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <Label className="text-[10px] sm:text-xs text-amber-200 font-medium">Username</Label>
                  {isEditing ? (
                    <Input
                      value={editedData.username || ""}
                      onChange={(e) => setEditedData({ ...editedData, username: e.target.value })}
                      className="h-8 sm:h-9 mt-0.5 sm:mt-1 border-purple-200 focus:border-purple-400 focus:ring-purple-400 text-sm"
                    />
                  ) : (
                    <p className="text-sm sm:text-base text-white font-semibold truncate">@{participantData.username}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl bg-slate-900/60 border border-amber-500/20 hover:shadow-md transition-all hover:scale-[1.01]">
                <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-md sm:shadow-lg shadow-amber-500/30 flex-shrink-0">
                  <Mail className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <Label className="text-[10px] sm:text-xs text-slate-300 font-medium">Email</Label>
                  <p className="text-sm sm:text-base text-white font-semibold truncate">{participantData.email}</p>
                </div>
              </div>

              {/* Wallet Address */}
              <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl bg-slate-900/60 border border-amber-500/20 hover:shadow-md transition-all hover:scale-[1.01]">
                <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md sm:shadow-lg shadow-emerald-500/30 flex-shrink-0">
                  <Wallet className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <Label className="text-[10px] sm:text-xs text-emerald-600 font-medium">BEP20 Address</Label>
                  {isEditing ? (
                    <Input
                      value={editedData.bep20_address || ""}
                      onChange={(e) => setEditedData({ ...editedData, bep20_address: e.target.value })}
                      className="h-8 sm:h-9 mt-0.5 sm:mt-1 font-mono text-[10px] sm:text-xs border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400"
                    />
                  ) : (
                    <p className="text-[10px] sm:text-xs text-white font-mono truncate font-bold">
                      {participantData.bep20_address || "Not set"}
                    </p>
                  )}
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-cyan-50 to-blue-100/50 border border-cyan-100 hover:shadow-md transition-all hover:scale-[1.01]">
                <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#22d3ee] to-amber-500 flex items-center justify-center shadow-md sm:shadow-lg shadow-amber-500/30 flex-shrink-0">
                  <Calendar className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-white" />
                </div>
                <div className="flex-1">
                  <Label className="text-[10px] sm:text-xs text-amber-200 font-medium">Member Since</Label>
                  <p className="text-sm sm:text-base text-white font-semibold">
                    {participantData.created_at ? new Date(participantData.created_at).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>

              {/* Referral Code */}
              <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl bg-emerald-950/30 border border-emerald-500/20 hover:shadow-md transition-all hover:scale-[1.01]">
                <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md sm:shadow-lg shadow-emerald-500/30 flex-shrink-0">
                  <span className="text-sm font-black text-white">$</span>
                </div>
                <div className="flex-1 min-w-0">
                  <Label className="text-[10px] sm:text-xs text-emerald-300 font-medium">Referral Code</Label>
                  <p className="text-sm sm:text-base text-white font-mono font-bold tracking-wider truncate">
                    {participantData.referral_code || "Not available"}
                  </p>
                  <p className="text-[10px] text-emerald-200/70">Earn $5 when a referred participant adds funds.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                  onClick={() => {
                    if (participantData.referral_code) {
                      navigator.clipboard.writeText(participantData.referral_code)
                      toast({ title: "Referral code copied" })
                    }
                  }}
                  disabled={!participantData.referral_code}
                >
                  Copy
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 shadow-lg sm:shadow-xl bg-slate-800/80 backdrop-blur-xl overflow-hidden relative animate-slide-up">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-300 to-amber-500" />
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15"><FileCheck2 className="h-5 w-5 text-cyan-300" /></div><div><h3 className="font-bold text-white">Identity verification</h3><p className="text-xs text-slate-400">Complete KYC to unlock your full account access.</p></div></div>
              {kyc ? <Badge className={kyc.status === "approved" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"}>{kyc.status === "under_review" ? "Under review" : kyc.status}</Badge> : <Badge variant="outline" className="border-amber-400/40 text-amber-300">Not submitted</Badge>}
            </div>
{kyc && ["pending", "under_review", "approved", "completed"].includes(kyc.status) ? (
  <div className="rounded-xl border border-amber-400/20 bg-slate-900/60 p-4 text-sm text-slate-300"><div className="flex items-center gap-2 font-semibold text-white"><Clock3 className="h-4 w-4 text-cyan-300" /> {kyc.status === "approved" || kyc.status === "completed" ? "Identity verified" : "Verification request received"}</div><p className="mt-2 text-xs leading-5 text-slate-400">{kyc.status === "approved" || kyc.status === "completed" ? "Your identity has been verified successfully." : "Our compliance team is reviewing your submitted information. You can continue using the dashboard while the review is in progress."}</p></div>
  ) : null}
  {kyc?.status === "rejected" ? <div className="mb-4 space-y-2 rounded-xl border border-red-400/30 bg-red-500/5 p-4"><p className="font-semibold text-red-200">KYC resubmission required</p><p className="text-xs leading-5 text-slate-400">{kyc.rejection_reason || "Please correct your information and submit the required documents again."}</p><p className="text-xs text-amber-200">Replace your documents and selfie below, then submit again.</p></div> : null}
  {!kyc || kyc.status === "rejected" ? (
              <form onSubmit={submitKyc} className="grid gap-3 sm:grid-cols-2">
                <div><Label className="text-xs text-slate-300">Legal name</Label><Input required value={kycForm.legal_name} onChange={(e) => setKycForm({ ...kycForm, legal_name: e.target.value })} placeholder="As shown on your ID" className="mt-1 border-slate-600 bg-slate-900 text-white" /></div>
                <div><Label className="text-xs text-slate-300">Country</Label><Input required value={kycForm.country} onChange={(e) => setKycForm({ ...kycForm, country: e.target.value })} placeholder="Country of residence" className="mt-1 border-slate-600 bg-slate-900 text-white" /></div>
                <div><Label className="text-xs text-slate-300">Date of birth</Label><Input type="date" value={kycForm.date_of_birth} onChange={(e) => setKycForm({ ...kycForm, date_of_birth: e.target.value })} className="mt-1 border-slate-600 bg-slate-900 text-white" /></div>
                <div><Label className="text-xs text-slate-300">Document type</Label><select required value={kycForm.document_type} onChange={(e) => setKycForm({ ...kycForm, document_type: e.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-white"><option value="">Select document</option><option value="passport">Passport</option><option value="national_id">National ID</option><option value="drivers_license">Driver&apos;s license</option></select></div>
                <div className="sm:col-span-2"><Label className="text-xs text-slate-300">Document number</Label><Input value={kycForm.document_number} onChange={(e) => setKycForm({ ...kycForm, document_number: e.target.value })} placeholder="Enter your document number" className="mt-1 border-slate-600 bg-slate-900 text-white" /></div>
                <div className="sm:col-span-2 rounded-xl border border-amber-400/20 bg-slate-900/60 p-4"><div className="mb-3"><p className="text-sm font-semibold text-white">Identity documents</p><p className="mt-1 text-xs text-slate-400">Upload clear images. Your front, back, and live selfie are reviewed securely by compliance.</p></div><div className="grid gap-3 md:grid-cols-3">{([['document_front_url','Document front','Front of your ID'],['document_back_url','Document back','Back of your ID']] as const).map(([field, label, hint]) => <div key={field} className="rounded-xl border border-dashed border-slate-600 bg-slate-950/70 p-4 transition hover:border-cyan-400/60"><span className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Upload className="h-4 w-4 text-cyan-300" />{label}</span><span className="mt-1 block text-[11px] text-slate-500">{kycForm[field] ? "Image ready to submit" : hint}</span><div className="mt-3 grid grid-cols-2 gap-2"><label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2 py-2 text-[10px] font-bold text-cyan-200 transition hover:bg-cyan-400/20"><Camera className="h-3.5 w-3.5" />Camera<input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) readKycImage(file, field) }} /></label><label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800/80 px-2 py-2 text-[10px] font-bold text-slate-200 transition hover:border-cyan-400/50"><Upload className="h-3.5 w-3.5" />Gallery<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) readKycImage(file, field) }} /></label></div></div>)}<div className="rounded-xl border border-dashed border-cyan-400/40 bg-slate-950/70 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Camera className="h-4 w-4 text-cyan-300" />Live selfie</div><p className="mt-1 text-[11px] text-slate-500">Camera only. Move and blink for liveness verification.</p>{selfieCameraOpen ? <div className="mt-3 space-y-2"><div className="relative overflow-hidden rounded-lg bg-black"><video ref={selfieVideoRef} muted playsInline className="aspect-square w-full object-cover" style={{ transform: "scaleX(-1)" }} /><div className="pointer-events-none absolute inset-5 rounded-[45%] border-2 border-dashed border-cyan-300/80" /><div className="absolute left-3 top-3 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200">Live camera · no uploads</div></div><div className="grid grid-cols-3 gap-2 text-center text-[10px] font-semibold uppercase tracking-wide"><span className={selfieLiveness === "move" || selfieLiveness === "blink" || selfieLiveness === "ready" ? "rounded-md bg-emerald-500/15 px-2 py-1 text-emerald-300" : "rounded-md bg-slate-800 px-2 py-1 text-slate-500"}>1 Move</span><span className={selfieLiveness === "blink" || selfieLiveness === "ready" ? "rounded-md bg-emerald-500/15 px-2 py-1 text-emerald-300" : "rounded-md bg-slate-800 px-2 py-1 text-slate-500"}>2 Blink</span><span className={selfieLiveness === "ready" ? "rounded-md bg-emerald-500/15 px-2 py-1 text-emerald-300" : "rounded-md bg-slate-800 px-2 py-1 text-slate-500"}>3 Capture</span></div><p className="text-xs text-amber-200">{selfieMessage}</p><div className="flex flex-wrap gap-2">{selfieLiveness === "blink" ? <Button type="button" size="sm" onClick={confirmSelfieBlink} className="bg-amber-500 text-slate-950">I blinked — continue</Button> : null}<Button type="button" size="sm" disabled={selfieLiveness !== "ready"} onClick={captureLiveSelfie} className="bg-cyan-600 text-white">Capture live selfie</Button><Button type="button" size="sm" variant="outline" onClick={stopSelfieCamera}>Cancel</Button></div></div> : <Button type="button" size="sm" variant="outline" onClick={startSelfieCamera} className="mt-3 border-cyan-400/40 text-amber-200"><Camera className="mr-2 h-4 w-4" />Open camera</Button>}{kycForm.selfie_url && !selfieCameraOpen ? <div className="mt-3 flex items-center gap-3 rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-2"><img src={kycForm.selfie_url} alt="Captured live selfie preview" className="h-14 w-14 rounded-md object-cover" /><p className="text-xs text-emerald-300">Live selfie captured and ready to submit.</p></div> : null}<canvas ref={selfieCanvasRef} className="hidden" /></div></div></div><div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-600 bg-slate-900/50 p-3"><p className="text-xs text-slate-400">All three images are required to submit.</p><Button type="submit" disabled={kycSubmitting || !kycForm.document_front_url || !kycForm.document_back_url || !kycForm.selfie_url} className="bg-cyan-600 text-white hover:bg-amber-500">{kycSubmitting ? "Submitting..." : "Submit KYC"}</Button></div>
              </form>
            ) : null}
          </CardContent>
        </Card>

        {/* Settings Card - Mobile Optimized */}
        <Card className="border-amber-500/20 shadow-lg sm:shadow-xl bg-slate-800/80 backdrop-blur-xl overflow-hidden relative animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="absolute top-0 left-0 right-0 h-0.5 sm:h-1 bg-gradient-to-r from-[#22d3ee] via-emerald-400 to-teal-500" />
          
          <CardContent className="p-3 sm:p-4 md:p-5 space-y-2 sm:space-y-2.5 md:space-y-3">
            <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 md:mb-4">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
              </div>
              Settings
            </h3>

            {settingsItems.map((item, i) => (
              <Link key={i} href={item.href}>
                <div className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl bg-slate-900/60 hover:bg-slate-900/60 border border-amber-500/20 hover:border-blue-400/40 hover:shadow-md transition-all group cursor-pointer hover:scale-[1.01]">
                  <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg sm:rounded-xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform shadow-md sm:shadow-lg`}>
                      <item.icon className={`h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 ${item.color}`} />
                    </div>
                    <span className="font-semibold text-sm sm:text-base text-white">{item.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Transaction Ledger */}
        <div className="mt-6 sm:mt-8 md:mt-10 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <ParticipantLedger participantId={participantData.id} />
        </div>

        {/* Sign Out Button - Mobile Optimized */}
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full h-11 sm:h-12 md:h-14 bg-red-950/40 text-red-300 border-red-500/30 hover:bg-red-900/50 hover:border-red-400/50 hover:shadow-lg hover:shadow-red-500/10 transition-all group hover:scale-[1.02] text-sm sm:text-base animate-slide-up" style={{ animationDelay: '0.2s' }}
        >
          <LogOut className="h-4 w-4 sm:h-5 sm:w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          Sign Out
        </Button>
      </main>
    </div>
  )
}
