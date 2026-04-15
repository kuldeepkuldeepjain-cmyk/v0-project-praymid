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
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { isParticipantAuthenticated, clearParticipantAuth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/client"
import { ParticipantLedger } from "@/components/participant-ledger"

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mounted, setMounted] = useState(false)
  const [participantData, setParticipantData] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<any>({})
  const [isUploading, setIsUploading] = useState(false)

  const isAuthenticated = isParticipantAuthenticated()

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

        const supabase = createClient()
        
        const { data, error } = await supabase
          .from("participants")
          .select("*")
          .eq("email", email)
          .single()

        if (error) {
          console.error("Error fetching profile data:", error)
          toast({ 
            title: "Error", 
            description: "Failed to load profile data", 
            variant: "destructive" 
          })
          return
        }

        if (data) {
          setParticipantData(data)
          setEditedData(data)
          localStorage.setItem("participantData", JSON.stringify(data))
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

        const supabase = createClient()
        const { error } = await supabase
          .from("participants")
          .update({ profile_image: base64Image })
          .eq("email", participantData.email)

        if (error) throw new Error("Failed to upload image")

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
      const supabase = createClient()
      const { error } = await supabase
        .from("participants")
        .update({ profile_image: null })
        .eq("email", participantData.email)

      if (error) throw new Error("Failed to remove image")

      setParticipantData({ ...participantData, profile_image: null })
      toast({ title: "Success", description: "Profile image removed" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove image", variant: "destructive" })
    }
  }

  const handleSave = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("participants")
        .update({ username: editedData.username, bep20_address: editedData.bep20_address })
        .eq("email", participantData.email)

      if (error) throw error

      setParticipantData(editedData)
      setIsEditing(false)
      toast({ title: "Success", description: "Profile updated successfully" })
    } catch {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" })
    }
  }

  const handleLogout = () => {
    clearParticipantAuth()
    toast({ title: "Signed Out", description: "You have been signed out successfully" })
    router.push("/")
  }

  if (!mounted || !participantData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#E85D3B] animate-pulse" />
      </div>
    )
  }

  const displayName = participantData.username || participantData.email?.split("@")[0] || "User"

  const settingsItems = [
    {
      icon: Shield,
      label: "Security",
      color: "text-[#7c3aed]",
      bg: "bg-purple-100",
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
      color: "text-cyan-600",
      bg: "bg-cyan-100",
      href: "/participant/dashboard/settings/help",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/60 to-blue-50/60 relative overflow-hidden">
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
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-orange-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s' }} />
      </div>
      
      <header className="glass-card mx-0 rounded-none border-x-0 border-t-0 sticky top-0 z-40 backdrop-blur-xl bg-white/95 relative">
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <Link href="/participant/dashboard">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg hover:scale-110 transition-transform">
                <ArrowLeft className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
              </Button>
            </Link>
            <h1 className="text-base sm:text-lg font-semibold text-slate-900">Profile</h1>
          </div>
          {isEditing ? (
            <div className="flex gap-1.5 sm:gap-2">
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)} className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 hover:scale-110 transition-transform">
                <X className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
              </Button>
              <Button size="icon" onClick={handleSave} className="bg-[#7c3aed] h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 hover:scale-110 transition-transform">
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

      <main className="px-2 sm:px-3 md:px-4 py-4 sm:py-5 md:py-6 space-y-3 sm:space-y-4 md:space-y-6 relative z-10">
        {/* Profile Header - Mobile Optimized */}
        <div className="text-center relative animate-fade-in">
          {/* Avatar with glow and ring animation - Mobile Responsive */}
          <div className="relative inline-block mb-3 sm:mb-4">
            {/* Animated ring */}
            <div className="absolute inset-0 w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 -left-1 sm:-left-2 -top-1 sm:-top-2 rounded-full border-2 border-dashed border-purple-300 animate-spin" style={{ animationDuration: "10s" }} />
            {/* Glow effect */}
            <div className="absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-[#7c3aed] to-[#E85D3B] rounded-full blur-lg sm:blur-xl opacity-40 animate-pulse" />
            
            {/* Avatar */}
            {participantData?.profile_image ? (
              <img
                src={participantData.profile_image || "/placeholder.svg"}
                alt="Profile"
                className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full object-cover shadow-xl border-2 sm:border-4 border-white"
              />
            ) : (
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-[#7c3aed] via-purple-500 to-[#E85D3B] flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-xl shadow-purple-500/30">
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
              className="absolute bottom-0 right-0 w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#E85D3B] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
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
          
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#E85D3B] bg-clip-text text-transparent">
            @{displayName}
          </h2>
          <Badge
            className={`mt-2 sm:mt-2.5 md:mt-3 px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-medium animate-fade-in ${
              participantData.activation_fee_paid 
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30" 
                : "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30"
            }`}
          >
            {participantData.activation_fee_paid ? "Verified Account" : "Pending Verification"}
          </Badge>
        </div>

        {/* Account Information Card - Mobile Optimized */}
        <Card className="border-0 shadow-lg sm:shadow-xl bg-white/90 backdrop-blur-xl overflow-hidden relative animate-slide-up">
          {/* Card gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-orange-500/10 pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-0.5 sm:h-1 bg-gradient-to-r from-[#7c3aed] via-purple-400 to-[#E85D3B]" />
          
          <CardContent className="p-3 sm:p-4 md:p-5 space-y-2.5 sm:space-y-3 md:space-y-4 relative">
            <h3 className="font-bold text-sm sm:text-base text-slate-800 flex items-center gap-1.5 sm:gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-[#7c3aed] to-purple-600 flex items-center justify-center">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
              </div>
              Account Information
            </h3>

            <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
              {/* Username */}
              <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-purple-50 to-purple-100/50 border border-purple-100 hover:shadow-md transition-all hover:scale-[1.01]">
                <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#7c3aed] to-purple-600 flex items-center justify-center shadow-md sm:shadow-lg shadow-purple-500/30 flex-shrink-0">
                  <User className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <Label className="text-[10px] sm:text-xs text-purple-600 font-medium">Username</Label>
                  {isEditing ? (
                    <Input
                      value={editedData.username || ""}
                      onChange={(e) => setEditedData({ ...editedData, username: e.target.value })}
                      className="h-8 sm:h-9 mt-0.5 sm:mt-1 border-purple-200 focus:border-purple-400 focus:ring-purple-400 text-sm"
                    />
                  ) : (
                    <p className="text-sm sm:text-base text-slate-800 font-semibold truncate">@{participantData.username}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-orange-50 to-orange-100/50 border border-orange-100 hover:shadow-md transition-all hover:scale-[1.01]">
                <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#E85D3B] to-orange-500 flex items-center justify-center shadow-md sm:shadow-lg shadow-orange-500/30 flex-shrink-0">
                  <Mail className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <Label className="text-[10px] sm:text-xs text-orange-600 font-medium">Email</Label>
                  <p className="text-sm sm:text-base text-slate-800 font-semibold truncate">{participantData.email}</p>
                </div>
              </div>

              {/* Wallet Address */}
              <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-50 to-teal-100/50 border border-emerald-100 hover:shadow-md transition-all hover:scale-[1.01]">
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
                    <p className="text-[10px] sm:text-xs text-slate-800 font-mono truncate font-bold">
                      {participantData.bep20_address || "Not set"}
                    </p>
                  )}
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-cyan-50 to-blue-100/50 border border-cyan-100 hover:shadow-md transition-all hover:scale-[1.01]">
                <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#22d3ee] to-blue-500 flex items-center justify-center shadow-md sm:shadow-lg shadow-cyan-500/30 flex-shrink-0">
                  <Calendar className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-white" />
                </div>
                <div className="flex-1">
                  <Label className="text-[10px] sm:text-xs text-cyan-600 font-medium">Member Since</Label>
                  <p className="text-sm sm:text-base text-slate-800 font-semibold">
                    {participantData.created_at ? new Date(participantData.created_at).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Card - Mobile Optimized */}
        <Card className="border-0 shadow-lg sm:shadow-xl bg-white/90 backdrop-blur-xl overflow-hidden relative animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="absolute top-0 left-0 right-0 h-0.5 sm:h-1 bg-gradient-to-r from-[#22d3ee] via-emerald-400 to-teal-500" />
          
          <CardContent className="p-3 sm:p-4 md:p-5 space-y-2 sm:space-y-2.5 md:space-y-3">
            <h3 className="font-bold text-sm sm:text-base text-slate-800 flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 md:mb-4">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
              </div>
              Settings
            </h3>

            {settingsItems.map((item, i) => (
              <Link key={i} href={item.href}>
                <div className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl bg-slate-50 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50 border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all group cursor-pointer hover:scale-[1.01]">
                  <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg sm:rounded-xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform shadow-md sm:shadow-lg`}>
                      <item.icon className={`h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 ${item.color}`} />
                    </div>
                    <span className="font-semibold text-sm sm:text-base text-slate-800">{item.label}</span>
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
          className="w-full h-11 sm:h-12 md:h-14 bg-gradient-to-r from-red-50 to-rose-50 text-red-600 border-red-200 hover:from-red-100 hover:to-rose-100 hover:border-red-300 hover:shadow-lg hover:shadow-red-500/10 transition-all group hover:scale-[1.02] text-sm sm:text-base animate-slide-up" style={{ animationDelay: '0.2s' }}
        >
          <LogOut className="h-4 w-4 sm:h-5 sm:w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          Sign Out
        </Button>
      </main>
    </div>
  )
}
