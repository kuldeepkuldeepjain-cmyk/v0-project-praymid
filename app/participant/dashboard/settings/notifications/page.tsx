"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Bell, DollarSign, Users, TrendingUp, Megaphone } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { isParticipantAuthenticated } from "@/lib/auth"

interface NotificationSettings {
  contributions: boolean
  payouts: boolean
  referrals: boolean
  predictions: boolean
  announcements: boolean
}

export default function NotificationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState<NotificationSettings>({
    contributions: true,
    payouts: true,
    referrals: true,
    predictions: false,
    announcements: true,
  })

  const isAuthenticated = isParticipantAuthenticated()

  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated) {
      router.push("/participant/login")
    }
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem("notificationSettings")
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [router, isAuthenticated])

  const handleToggle = async (key: keyof NotificationSettings, value: boolean) => {
    setIsLoading(true)
    try {
      const newSettings = { ...settings, [key]: value }
      // Save to localStorage (would be API call in production)
      localStorage.setItem("notificationSettings", JSON.stringify(newSettings))
      setSettings(newSettings)
      toast({ title: "Saved", description: "Notification preferences updated" })
    } catch {
      toast({ title: "Error", description: "Failed to update preferences", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const notificationOptions = [
    {
      key: "contributions" as const,
      icon: DollarSign,
      label: "Contribution Confirmations",
      description: "Get notified when your contributions are processed",
      color: "text-[#7c3aed]",
      bg: "bg-purple-100",
    },
    {
      key: "payouts" as const,
      icon: DollarSign,
      label: "Payout Alerts",
      description: "Get notified when you receive payouts",
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      key: "referrals" as const,
      icon: Users,
      label: "Referral Notifications",
      description: "Get notified when someone uses your referral code",
      color: "text-[#E85D3B]",
      bg: "bg-orange-100",
    },
    {
      key: "predictions" as const,
      icon: TrendingUp,
      label: "Prediction Results",
      description: "Get notified about your prediction market results",
      color: "text-cyan-600",
      bg: "bg-cyan-100",
    },
    {
      key: "announcements" as const,
      icon: Megaphone,
      label: "Platform Announcements",
      description: "Important updates and announcements from FlowChain",
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
  ]

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#E85D3B] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-20 left-0 w-64 h-64 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 right-0 w-48 h-48 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-1/2 w-56 h-56 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-40">
        <div className="px-4 py-4 flex items-center gap-4">
          <Link href="/participant/dashboard/profile">
            <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-slate-100 rounded-xl transition-all hover:scale-105">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E85D3B] to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Notifications</h1>
              <p className="text-xs text-slate-500">Manage your alerts</p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6 relative z-10">
        {/* Status Card */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-[#E85D3B] to-orange-500 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Notifications Status</p>
                <p className="text-2xl font-bold mt-1">
                  {Object.values(settings).filter(Boolean).length} of {Object.keys(settings).length} Active
                </p>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Bell className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="mt-4 flex gap-1">
              {Object.values(settings).map((enabled, i) => (
                <div 
                  key={i} 
                  className={`flex-1 h-2 rounded-full transition-all ${enabled ? "bg-white" : "bg-white/30"}`} 
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notification Options Card */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-xl overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#7c3aed] via-[#E85D3B] to-[#22d3ee]" />
          
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Notification Preferences</h3>
                <p className="text-sm text-slate-500">Choose what notifications you receive</p>
              </div>
            </div>

            <div className="space-y-3">
              {notificationOptions.map((option, index) => (
                <div 
                  key={option.key} 
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 hover:shadow-lg group cursor-pointer ${
                    settings[option.key] 
                      ? `bg-gradient-to-r ${
                          option.key === "contributions" ? "from-purple-50 to-purple-100/50 border-purple-200 hover:border-purple-300" :
                          option.key === "payouts" ? "from-emerald-50 to-teal-100/50 border-emerald-200 hover:border-emerald-300" :
                          option.key === "referrals" ? "from-orange-50 to-red-100/50 border-orange-200 hover:border-orange-300" :
                          option.key === "predictions" ? "from-cyan-50 to-blue-100/50 border-cyan-200 hover:border-cyan-300" :
                          "from-amber-50 to-yellow-100/50 border-amber-200 hover:border-amber-300"
                        }`
                      : "bg-slate-50 border-slate-100 hover:border-slate-200"
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
                        settings[option.key]
                          ? `bg-gradient-to-br ${
                              option.key === "contributions" ? "from-[#7c3aed] to-purple-600 shadow-lg shadow-purple-500/30" :
                              option.key === "payouts" ? "from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30" :
                              option.key === "referrals" ? "from-[#E85D3B] to-orange-500 shadow-lg shadow-orange-500/30" :
                              option.key === "predictions" ? "from-[#22d3ee] to-blue-500 shadow-lg shadow-cyan-500/30" :
                              "from-amber-500 to-yellow-500 shadow-lg shadow-amber-500/30"
                            }`
                          : option.bg
                      }`}
                    >
                      <option.icon className={`h-5 w-5 transition-colors ${settings[option.key] ? "text-white" : option.color}`} />
                    </div>
                    <div>
                      <p className={`font-semibold transition-colors ${settings[option.key] ? "text-slate-800" : "text-slate-600"}`}>
                        {option.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Switch
                      checked={settings[option.key]}
                      onCheckedChange={(value) => handleToggle(option.key, value)}
                      disabled={isLoading}
                      className={`${
                        settings[option.key] 
                          ? option.key === "contributions" ? "data-[state=checked]:bg-[#7c3aed]" :
                            option.key === "payouts" ? "data-[state=checked]:bg-emerald-500" :
                            option.key === "referrals" ? "data-[state=checked]:bg-[#E85D3B]" :
                            option.key === "predictions" ? "data-[state=checked]:bg-[#22d3ee]" :
                            "data-[state=checked]:bg-amber-500"
                          : ""
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline"
            onClick={() => {
              const allOn = { contributions: true, payouts: true, referrals: true, predictions: true, announcements: true }
              localStorage.setItem("notificationSettings", JSON.stringify(allOn))
              setSettings(allOn)
              toast({ title: "Enabled All", description: "All notifications are now active" })
            }}
            className="h-14 bg-white/80 backdrop-blur border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all"
          >
            <Bell className="h-4 w-4 mr-2" />
            Enable All
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              const allOff = { contributions: false, payouts: false, referrals: false, predictions: false, announcements: false }
              localStorage.setItem("notificationSettings", JSON.stringify(allOff))
              setSettings(allOff)
              toast({ title: "Disabled All", description: "All notifications are now off" })
            }}
            className="h-14 bg-white/80 backdrop-blur border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all"
          >
            <Bell className="h-4 w-4 mr-2" />
            Disable All
          </Button>
        </div>
      </main>
    </div>
  )
}
