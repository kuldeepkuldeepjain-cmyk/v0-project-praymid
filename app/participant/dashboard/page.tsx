"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageLoader } from "@/components/ui/page-loader"
import {
  TrendingUp,
  ChevronRight,
  ArrowUpRight,
  Send,
  Wallet,
  Gift,
  Clock,
  Bell,
  X,
  Settings,
  HelpCircle,
  LogOut,
  Smartphone,
  User,
  Home,
  Trophy,
  Plus,
  Menu,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { isParticipantAuthenticated } from "@/lib/auth"
import type { UserRank } from "@/lib/types"
import { TopUpModal } from "@/components/topup-modal"
import { UserNotificationsBell } from "@/components/user-notifications-bell"

interface LeaderboardEntry {
  position: number
  username: string
  participantNumber: number
  rank: UserRank
  participation_count: number
  contributedAmount: number
}

const SAMPLE_USERNAMES = [
  "amit.k", "rohit92", "ankit.patel", "deepak.s", "john.miller",
  "neha", "ghostx", "sanjay.mehta", "ravi23", "manish.j",
]

// Simple hamburger menu component (inline to avoid import issues)
function HamburgerMenu({ 
  isOpen, 
  onClose, 
  participantData 
}: { 
  isOpen: boolean
  onClose: () => void
  participantData: any 
}) {
  const router = useRouter()
  
  const handleLogout = () => {
    localStorage.removeItem("participantData")
    sessionStorage.removeItem("participantAuthenticated")
    router.push("/participant/login")
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-0 left-0 bottom-0 w-80 bg-white z-50 shadow-2xl">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-lg">Menu</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-2">
          <Link href="/participant/dashboard/profile" onClick={onClose}>
            <div className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl">
              <User className="h-5 w-5 text-slate-600" />
              <span className="text-slate-700">My Profile</span>
            </div>
          </Link>
          <Link href="/participant/dashboard/refer" onClick={onClose}>
            <div className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl">
              <Gift className="h-5 w-5 text-slate-600" />
              <span className="text-slate-700">Earn $5 Per Referral</span>
            </div>
          </Link>
          <Link href="/participant/dashboard/settings" onClick={onClose}>
            <div className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl">
              <Settings className="h-5 w-5 text-slate-600" />
              <span className="text-slate-700">Settings</span>
            </div>
          </Link>
          <Link href="/participant/dashboard/help" onClick={onClose}>
            <div className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl">
              <HelpCircle className="h-5 w-5 text-slate-600" />
              <span className="text-slate-700">Help & Support</span>
            </div>
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 text-slate-500 mb-2">
            <Smartphone className="h-4 w-4" />
            <span className="text-sm">App Version 2.1.0</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 p-3 w-full hover:bg-red-50 rounded-xl transition-colors text-red-600"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  )
}

export default function ParticipantDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [participantData, setParticipantData] = useState<any>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showTopUpModal, setShowTopUpModal] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  const refreshParticipantData = useCallback(async (email: string) => {
    try {
      const response = await fetch(`/api/participant/me?email=${encodeURIComponent(email)}`)
      if (response.ok) {
        const data = await response.json()
        if (data.participant) {
          setParticipantData(data.participant)
          localStorage.setItem("participantData", JSON.stringify(data.participant))
        }
      }
    } catch {
      // Silently fail - user will see cached data
    }
  }, [])

  useEffect(() => {
    setMounted(true)

    if (!isParticipantAuthenticated()) {
      router.push("/participant/login")
      return
    }

    const storedData = localStorage.getItem("participantData")
    if (storedData) {
      try {
        const data = JSON.parse(storedData)
        setParticipantData(data)

        if (data.email) {
          refreshParticipantData(data.email)
        }
      } catch {}
    }

    // Generate mock leaderboard data (client-side only)
    const mockLeaderboard: LeaderboardEntry[] = SAMPLE_USERNAMES.map((username, index) => ({
      position: index + 1,
      username,
      participantNumber: Math.floor(Math.random() * 9000) + 1000,
      rank: (index < 2 ? "Platinum" : index < 5 ? "Gold" : "Silver") as UserRank,
      participation_count: Math.floor(Math.random() * 50) + (10 - index) * 5,
      contributedAmount: 100,
    }))
    setLeaderboard(mockLeaderboard)
  }, [router, refreshParticipantData])

  if (!mounted || !participantData) {
    return <PageLoader variant="dashboard" />
  }

  const displayName = participantData.username || participantData.email?.split("@")[0] || "User"
  const walletBalance = participantData.account_balance || 0
  const referralCode = participantData.referral_code || ""

  return (
    <div className="pb-24 page-fade-enter">
      <HamburgerMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        participantData={participantData} 
      />

      <TopUpModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        currentBalance={walletBalance}
      />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu className="h-5 w-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">Hi, {displayName}</p>
                <p className="text-xs text-slate-500">Welcome back!</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UserNotificationsBell userEmail={participantData.email ?? ""} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 space-y-4">
        {/* Balance Card */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 text-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-violet-200 text-sm mb-1">Total Balance</p>
                <h2 className="text-3xl font-bold">${walletBalance.toFixed(2)}</h2>
              </div>
              <Wallet className="h-8 w-8 text-violet-200" />
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => setShowTopUpModal(true)}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Funds
              </Button>
              <Link href="/participant/dashboard/payout" className="flex-1">
                <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-0">
                  <Send className="h-4 w-4 mr-2" />
                  Withdraw
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Link href="/participant/dashboard/contribute">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center mb-2">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-medium text-slate-700">Contribute</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/participant/dashboard/predict">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center mb-2">
                  <ArrowUpRight className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-medium text-slate-700">Predict</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/participant/dashboard/refer">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-500 rounded-xl flex items-center justify-center mb-2">
                  <Gift className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-medium text-slate-700">Refer</span>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Referral Card */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                  <Gift className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Earn $5 Per Referral</h3>
                  <p className="text-xs text-slate-500">Your code: {referralCode}</p>
                </div>
              </div>
              <Link href="/participant/dashboard/refer">
                <Button variant="ghost" size="sm">
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard Preview */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Top Contributors</h3>
              <Link href="/participant/dashboard/activity">
                <Button variant="ghost" size="sm" className="text-violet-600">
                  See All
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {leaderboard.slice(0, 3).map((entry, index) => (
                <div key={entry.username} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    index === 0 ? "bg-amber-500" : index === 1 ? "bg-slate-400" : "bg-orange-400"
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 text-sm">{entry.username}</p>
                    <p className="text-xs text-slate-500">{entry.participation_count} contributions</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {entry.rank}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
