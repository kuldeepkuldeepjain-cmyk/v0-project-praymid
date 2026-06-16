"use client"
import { useEffect, useState, useCallback } from "react"
import { useRef } from "react"
import { PageLoader } from "@/components/ui/page-loader"

import type React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  ChevronRight,
  ArrowUpRight,
  Send,
  Wallet,
  Gift,
  AlertTriangle,
  Clock,
  Mail,
  Bell,
  X,
  History,
  Settings,
  CreditCard,
  HelpCircle,
  LogOut,
  Smartphone,
  Sparkles,
  User,
  AlertCircle,
  Home,
  Trophy,
  Plus,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { isParticipantAuthenticated, participantFetch } from "@/lib/auth"
import type { UserRank } from "@/lib/types"

import { TopUpModal } from "@/components/topup-modal"
import { AIChatbotDialog } from "@/components/ai-chatbot-dialog"
import { MessageCircle } from "lucide-react"
import { LeaderboardView } from "@/components/leaderboard-view"
import { UserNotificationsBell } from "@/components/user-notifications-bell"
import { StakingBanner } from "@/components/staking-banner"
import { NoticeBoard } from "@/components/notice-board"
import { MysteryBox } from "@/components/mystery-box"

interface LeaderboardEntry {
  position: number
  username: string
  participantNumber: number
  rank: UserRank
  participation_count: number
  contributedAmount: number
}

const SAMPLE_USERNAMES = [
  "amit.k",
  "rohit92",
  "ankit.patel",
  "deepak.s",
  "john.miller",
  "neha",
  "ghostx",
  "sanjay.mehta",
  "ravi23",
  "manish.j",
]

function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  duration = 1200,
  gradient = false,
  decimals = 2,
}: {
  value: number
  prefix?: string
  suffix?: string
  duration?: number
  gradient?: boolean
  decimals?: number
}) {
  const [displayValue, setDisplayValue] = useState(value)
  const previousValueRef = useRef(value)
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    const prevValue = previousValueRef.current

    // Skip animation if value hasn't actually changed
    if (Math.abs(prevValue - value) < 0.01) {
      setDisplayValue(value)
      return
    }

    previousValueRef.current = value

    // Cancel any in-flight animation
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
    }

    const startTime = Date.now()
    const startValue = prevValue

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 4)
      const current = startValue + (value - startValue) * easeOut

      setDisplayValue(current)

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
      }
    }

    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [value, duration])

  const formattedValue = decimals > 0 ? displayValue.toFixed(decimals) : Math.floor(displayValue).toLocaleString()

  return (
    <span
      className={
        gradient ? "bg-gradient-to-r from-[#E85D3B] via-[#7c3aed] to-[#22d3ee] bg-clip-text text-transparent" : ""
      }
      style={
        gradient
          ? {
              filter: "drop-shadow(0 0 20px rgba(124, 58, 237, 0.5))",
              textShadow: "0 0 40px rgba(232, 93, 59, 0.3)",
            }
          : {}
      }
    >
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  )
}

function useRipple() {
  const createRipple = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const button = event.currentTarget
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2
    const ripple = document.createElement("span")
    ripple.style.width = ripple.style.height = `${size}px`
    ripple.style.left = `${x}px`
    ripple.style.top = `${y}px`
    ripple.className = "ripple-effect"
    const existingRipple = button.querySelector(".ripple-effect")
    if (existingRipple) existingRipple.remove()
    button.appendChild(ripple)
    setTimeout(() => ripple.remove(), 600)
  }, [])
  return createRipple
}

function ContributionNotificationBar({
  deadline,
  onExpire,
}: {
  deadline: Date
  onExpire: () => void
}) {
  const [timeRemaining, setTimeRemaining] = useState({ hours: 48, minutes: 0 })

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime()
      const deadlineTime = new Date(deadline).getTime()
      const diff = deadlineTime - now

      if (diff <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0 })
        onExpire()
        return
      }

      const totalMinutes = Math.floor(diff / (1000 * 60))
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60

      setTimeRemaining({ hours, minutes })
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [deadline, onExpire])

  const isUrgent = timeRemaining.hours < 6

  return (
    <div
      className={`notification-bar px-4 py-3 flex items-center justify-between ${isUrgent ? "!bg-gradient-to-r !from-red-100 !to-red-50" : ""}`}
    >
      <div className="flex items-center gap-3">
        {/* Anticlockwise rotating clock */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${isUrgent ? "bg-red-200" : "bg-orange-200/80"}`}
        >
          <Clock className={`h-4 w-4 clock-anticlockwise ${isUrgent ? "text-red-600" : "text-orange-700"}`} />
        </div>
        <div>
          <p className={`text-sm font-medium ${isUrgent ? "text-red-800" : "text-orange-900"}`}>
            Contribute $100 in{" "}
            <span className="font-bold">
              {timeRemaining.hours}h {timeRemaining.minutes}m
            </span>
          </p>
        </div>
      </div>
      <Link href="/participant/dashboard/contribute">
        <Button
          size="sm"
          className={`h-8 px-4 text-xs font-semibold rounded-full btn-shine ${
            isUrgent
              ? "bg-red-500 hover:bg-red-600"
              : "bg-gradient-to-r from-[#E85D3B] to-[#f97316] hover:from-[#d54e2f] hover:to-[#ea580c]"
          } text-white shadow-md`}
        >
          Contribute
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </Link>
    </div>
  )
}

function FrozenAccountModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] frozen-overlay flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl bg-white">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Account Frozen</h2>
          <p className="text-slate-600 mb-6">
            Your account has been frozen because you did not make your first contribution within the 48-hour deadline.
          </p>

          <div className="space-y-3">
            <a
              href="https://wa.me/995574450590"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp Support
            </a>
            <a
              href="mailto:support@flowchain.club"
              className="flex items-center justify-center gap-2 w-full h-12 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold rounded-lg transition-colors"
            >
              <Mail className="h-4 w-4" />
              Email Support
            </a>
            <Button
              variant="outline"
              className="w-full h-12 bg-transparent border-2 border-slate-300 hover:bg-slate-50"
              onClick={async () => {
                localStorage.removeItem("participantData")
                localStorage.removeItem("participantToken")
                await fetch("/api/auth/participant-logout", { method: "POST" }).catch(() => {})
                router.push("/participant/register")
              }}
            >
              Create New Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CircularCountdown({
  deadline,
  onExpire,
}: {
  deadline: Date
  onExpire: () => void
}) {
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 })
  const [hasExpired, setHasExpired] = useState(false)

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime()
      const deadlineTime = new Date(deadline).getTime()
      const diff = deadlineTime - now

      if (diff <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 })
        setHasExpired(true)
        onExpire()
        return
      }

      const totalSeconds = Math.floor(diff / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      setTimeRemaining({ hours, minutes, seconds, totalSeconds })
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [deadline, onExpire])

  // Calculate progress for circular indicator (48 hours = 172800 seconds)
  const maxSeconds = 48 * 60 * 60
  const progress = Math.max(0, (timeRemaining.totalSeconds / maxSeconds) * 100)
  const circumference = 2 * Math.PI * 45 // radius = 45
  const strokeDashoffset = circumference - (progress / 100) * circumference

  // Color based on time remaining
  const getColor = () => {
    if (timeRemaining.hours >= 12) return { stroke: "#10b981", bg: "from-emerald-500 to-emerald-600" }
    if (timeRemaining.hours >= 6) return { stroke: "#f59e0b", bg: "from-amber-500 to-orange-500" }
    return { stroke: "#ef4444", bg: "from-red-500 to-red-600" }
  }

  const colors = getColor()
  const isUrgent = timeRemaining.hours < 6

  if (hasExpired) {
    return (
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-2 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        <p className="text-red-600 font-bold">Expired!</p>
      </div>
    )
  }

  return (
    <div className="relative w-28 h-28 mx-auto">
      {/* Background circle */}
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="6" />
        {/* Progress circle (anticlockwise) */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={colors.stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-linear"
          style={{ filter: `drop-shadow(0 0 8px ${colors.stroke}80)` }}
        />
      </svg>
      {/* Time display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">
          {String(timeRemaining.hours).padStart(2, "0")}:{String(timeRemaining.minutes).padStart(2, "0")}
        </span>
        <span className="text-xs text-white/80">{String(timeRemaining.seconds).padStart(2, "0")}s</span>
      </div>
    </div>
  )
}

function HamburgerMenu({
  isOpen,
  onClose,
  participantData,
}: {
  isOpen: boolean
  onClose: () => void
  participantData: any
}) {
  const router = useRouter()

  const handleLogout = async () => {
    localStorage.removeItem("participantData")
    localStorage.removeItem("participantToken")
    await fetch("/api/auth/participant-logout", { method: "POST" }).catch(() => {})
    router.push("/participant/login")
  }

  if (!isOpen) return null

  const displayName = participantData?.username || participantData?.email?.split("@")[0] || "User"

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm" onClick={onClose} />
      {/* Menu Panel */}
      <div className="fixed top-0 right-0 h-full w-[280px] bg-white z-[70] shadow-2xl animate-slide-in-right">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Menu</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="h-5 w-5 text-slate-600" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#E85D3B] flex items-center justify-center text-white font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-800">@{displayName}</p>
              <p className="text-sm text-slate-500">{participantData?.email}</p>
            </div>
          </div>
        </div>

        <div className="p-2">
          <Link href="/participant/dashboard/activity" onClick={onClose}>
            <div className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors">
              <History className="h-5 w-5 text-slate-600" />
              <span className="text-slate-700">Transaction History</span>
            </div>
          </Link>
          <Link href="/participant/dashboard/refer" onClick={onClose}>
            <div className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors">
              <Gift className="h-5 w-5 text-slate-600" />
              <span className="text-slate-700">Invite Friends & Earn Unlimited $5 Per Referral</span>
            </div>
          </Link>
          <Link href="/participant/dashboard/settings/security" onClick={onClose}>
            <div className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors">
              <Settings className="h-5 w-5 text-slate-600" />
              <span className="text-slate-700">Settings</span>
            </div>
          </Link>
          <Link href="/participant/dashboard/settings/notifications" onClick={onClose}>
            <div className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors">
              <Bell className="h-5 w-5 text-slate-600" />
              <span className="text-slate-700">Notifications</span>
            </div>
          </Link>
          <div className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer">
            <CreditCard className="h-5 w-5 text-slate-600" />
            <span className="text-slate-700">Payment Methods</span>
          </div>
          <Link href="/participant/dashboard/settings/help" onClick={onClose}>
            <div className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors">
              <HelpCircle className="h-5 w-5 text-slate-600" />
              <span className="text-slate-700">Help & Support</span>
            </div>
          </Link>

          {/* Support contacts */}
          <div className="mx-1 mt-2 rounded-xl bg-green-50 border border-green-100 overflow-hidden">
            <p className="text-[11px] font-semibold text-green-700 uppercase tracking-wide px-3 pt-2.5 pb-1">Contact Support</p>
            <a
              href="https://wa.me/995574450590"
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-green-100 transition-colors"
            >
              <MessageCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">WhatsApp</p>
                <p className="text-xs text-green-600">+995 574 450 590</p>
              </div>
            </a>
            <a
              href="mailto:support@flowchain.club"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-green-100 transition-colors border-t border-green-100"
            >
              <Mail className="h-4 w-4 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">Email</p>
                <p className="text-xs text-green-600">support@flowchain.club</p>
              </div>
            </a>
          </div>
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

// Segments ordered starting from TOP (12 o'clock) going CLOCKWISE
// This array order MUST match the visual wheel layout
const SPIN_SEGMENTS = [
  { label: "0x", multiplier: 0.0, color: "#ef4444", darkColor: "#991b1b", icon: "💔", type: "multiplier", probability: 0.45, textColor: "#7f1d1d", subtext: "Better Luck!" },      // 45% - Full loss
  { label: "0.25x", multiplier: 0.25, color: "#fca5a5", darkColor: "#dc2626", icon: "😅", type: "multiplier", probability: 0.25, textColor: "#7f1d1d", subtext: "Oops!" },         // 25% - Quarter loss
  { label: "0.5x", multiplier: 0.5, color: "#fef3c7", darkColor: "#f59e0b", icon: "🎲", type: "multiplier", probability: 0.10, textColor: "#92400e", subtext: "Close!" },       // 10% - Half loss
  { label: "1x", multiplier: 1.0, color: "#dbeafe", darkColor: "#3b82f6", icon: "⭐", type: "multiplier", probability: 0.08, textColor: "#1e40af", subtext: "Even!" },         // 8% - Break even
  { label: "1.5x", multiplier: 1.5, color: "#dcfce7", darkColor: "#22c55e", icon: "🌟", type: "multiplier", probability: 0.04, textColor: "#15803d", subtext: "Good!" },     // 4% - Good win
  { label: "2x", multiplier: 2.0, color: "#f5e5ff", darkColor: "#a855f7", icon: "💫", type: "multiplier", probability: 0.03, textColor: "#6d28d9", subtext: "Great!" },      // 3% - Great win
  { label: "3x", multiplier: 3.0, color: "#fee2e2", darkColor: "#ef4444", icon: "🎯", type: "multiplier", probability: 0.02, textColor: "#991b1b", subtext: "Jackpot!" },    // 2% - Jackpot
  { label: "5x", multiplier: 5.0, color: "#f87171", darkColor: "#b91c1c", icon: "💎", type: "multiplier", probability: 0.02, textColor: "#4c0519", subtext: "Mega!" },       // 2% - Mega
  { label: "10x", multiplier: 10.0, color: "#dc2626", darkColor: "#7f1d1d", icon: "👑", type: "multiplier", probability: 0.01, textColor: "#fca5a5", subtext: "Legend!" },    // 1% - Legendary
]

function DailySpinWheel({
  isOpen,
  onClose,
  onWin,
  userEmail,
  currentBalance,
  participantData,
  setParticipantData,
}: {
  isOpen: boolean
  onClose: () => void
  onWin: (amount: number, label: string, type: string, balanceAfter: number, balanceAfterDeduct: number) => void
  userEmail: string
  currentBalance: number
  participantData: any
  setParticipantData: (data: any) => void
}) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [spinKey, setSpinKey] = useState(0) // incremented each spin to remount wheel and reset CSS transition
  const [result, setResult] = useState<{ label: string; multiplier: number; icon: string; type: string; probability?: number; darkColor?: string; color?: string; subtext?: string } | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [canSpin, setCanSpin] = useState(true)
  const [streakDays, setStreakDays] = useState(0)
  const [spinAmount, setSpinAmount] = useState(10) // Default spin amount
  const { toast } = useToast()

  const spinWheel = async () => {
    if (isSpinning) return

    // Check if user has enough balance
    if (currentBalance < spinAmount || spinAmount <= 0) {
      toast({
        title: "Insufficient Balance",
        description: `You need $${spinAmount.toFixed(2)} USDT to spin. Please top up your wallet or select a lower amount.`,
        variant: "destructive",
      })
      return
    }

    setIsSpinning(true)
    setShowResult(false)
    setResult(null)

    // Reset rotation instantly by remounting the wheel (new key = no CSS transition on mount)
    const newKey = spinKey + 1
    setSpinKey(newKey)
    setRotation(0)

    // Call the spin API with the selected amount
    let apiResult: { prize: { label: string; amount: number; multiplier: number; segmentIndex: number }; balanceAfter: number; balanceBefore: number } | null = null
    try {
      const res = await participantFetch("/api/participant/spin", {
        method: "POST",
        body: JSON.stringify({ email: userEmail, spinAmount }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Spin Failed", description: data.error || "Could not process spin.", variant: "destructive" })
        setIsSpinning(false)
        return
      }
      apiResult = data
      const balanceAfterDeduct = parseFloat((data.balanceBefore - spinAmount).toFixed(2))
      onWin(0, "", "deduct", balanceAfterDeduct, balanceAfterDeduct)
    } catch {
      toast({ title: "Spin Failed", description: "Network error. Please try again.", variant: "destructive" })
      setIsSpinning(false)
      return
    }

    // Use the server-determined segment index so the wheel matches the actual prize
    const segmentIndex = apiResult!.prize.segmentIndex
    const N = SPIN_SEGMENTS.length
    const STEP = 360 / N  // 40° per segment
    const spins = 5 + Math.floor(Math.random() * 3)

    // Rotation to bring segment i's centre to the top (pointer at 0°):
    // slicePath draws segment i from angle (i*STEP - 90) to (i*STEP - 90 + STEP).
    // So the visual centre of segment i = i*STEP - 90 + STEP/2  (in SVG-angle space).
    // The wheel is then rotated by `rotation` degrees clockwise via CSS.
    // After CSS rotation, the segment centre sits at:  (i*STEP - 90 + STEP/2 + rotation) mod 360
    // We want that to equal 0° (pointer at top):
    //   rotation = 90 - i*STEP - STEP/2   (mod 360, always positive)
    const rawStop = 90 - segmentIndex * STEP - STEP / 2
    const stopAt = ((rawStop % 360) + 360) % 360   // normalise to [0, 360)
    const finalRotation = spins * 360 + stopAt

    // Give React one frame to render rotation=0 (no transition) before we set the target
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setRotation(finalRotation)
      })
    })

    // Capture for closure use in setTimeout
    const capturedResult = apiResult!

    // After spin animation completes (match the 3.5 s CSS transition)
    setTimeout(() => {
      setIsSpinning(false)
      const won = SPIN_SEGMENTS[segmentIndex]
      setResult(won)
      setShowResult(true)

      // Determine if it's a win based on multiplier value
      const isWin = won.multiplier >= 1.0
      const isMegaJackpot = won.multiplier >= 10.0
      const isUltraJackpot = won.multiplier >= 5.0
      const isJackpot = won.multiplier >= 3.0
      const isFullLoss = won.multiplier === 0.0
      const isQuarterLoss = won.multiplier === 0.25
      const isHalfLoss = won.multiplier === 0.5
      const winAmount = spinAmount * won.multiplier

      // Display appropriate toast message based on outcome
      if (isMegaJackpot) {
        toast({
          title: "👑 LEGENDARY WIN! 👑",
          description: `YOU HIT THE 10X MULTIPLIER! You won $${winAmount.toFixed(2)}! 🚀✨🎊`,
        })
      } else if (isUltraJackpot) {
        toast({
          title: "💎 MEGA JACKPOT! 💎",
          description: `You hit the 5x multiplier! You won $${winAmount.toFixed(2)}! 🎉`,
        })
      } else if (isJackpot) {
        toast({
          title: "🎊 JACKPOT! 🎊",
          description: `You hit the 3x multiplier! You won $${winAmount.toFixed(2)}!`,
        })
      } else if (isWin && won.multiplier >= 2.0) {
        toast({
          title: "🎉 AMAZING WIN! 🎉",
          description: `You won ${won.multiplier}x! You earned $${winAmount.toFixed(2)}!`,
        })
      } else if (isWin) {
        toast({
          title: "✨ Congratulations! ✨",
          description: `You won ${won.multiplier}x! You earned $${winAmount.toFixed(2)}!`,
        })
      } else if (isFullLoss) {
        toast({
          title: "Better Luck Next Time! 🍀",
          description: `Oh no! You lost your entire $${spinAmount.toFixed(2)} spin. Better luck next time!`,
        })
      } else if (isQuarterLoss) {
        toast({
          title: "Close One! 😅",
          description: `You got 0.25x. You lost $${(spinAmount * 0.75).toFixed(2)} on this spin. Try again!`,
        })
      } else if (isHalfLoss) {
        toast({
          title: "Better Luck Next Time! 🍀",
          description: `You got 0.5x. You lost $${(spinAmount * 0.5).toFixed(2)} on this spin. Try again!`,
        })
      } else {
        toast({
          title: "Better Luck Next Time! 🍀",
          description: "Keep spinning! The next one could be a winner.",
        })
      }

      // Notify parent with the final server-confirmed balance (after winnings added)
      onWin(winAmount, won.label, won.type, capturedResult.balanceAfter, capturedResult.balanceAfter)
    }, 3600) // slightly after 3.5s CSS animation ends
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f0720 0%, #1a0533 30%, #200a3e 60%, #0d1526 100%)' }}>
      {/* Premium CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(15px) rotate(-3deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 40px rgba(251, 191, 36, 0.5), 0 0 60px rgba(249, 168, 212, 0.3); }
          50% { box-shadow: 0 0 80px rgba(251, 191, 36, 0.8), 0 0 100px rgba(249, 168, 212, 0.6), 0 0 120px rgba(167, 139, 250, 0.4); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
        }
        @keyframes bounce-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes shimmer-bg {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes rainbow-border {
          0% { border-color: #fcd34d; }
          25% { border-color: #f9a8d4; }
          50% { border-color: #a5b4fc; }
          75% { border-color: #6ee7b7; }
          100% { border-color: #fcd34d; }
        }
        @keyframes spin-glow {
          0% { filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.6)); }
          50% { filter: drop-shadow(0 0 40px rgba(249, 168, 212, 0.8)); }
          100% { filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.6)); }
        }
      `}</style>
      
      {/* Starfield & Floating Background Decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Stars */}
        {[...Array(22)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{
              width: `${1.5 + (i % 3)}px`, height: `${1.5 + (i % 3)}px`,
              top: `${(i * 41 + 9) % 96}%`, left: `${(i * 57 + 5) % 96}%`,
              opacity: 0.12 + (i % 4) * 0.07,
              animation: `pulse ${2 + (i % 3)}s ease-in-out infinite`,
              animationDelay: `${(i * 0.35) % 3}s`,
            }}
          />
        ))}
        <div className="absolute top-5 left-5 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl hidden md:block" style={{ animation: 'float 4s ease-in-out infinite', willChange: 'transform' }} />
        <div className="absolute top-20 right-10 w-52 h-52 bg-pink-500/18 rounded-full blur-3xl hidden md:block" style={{ animation: 'float-reverse 5s ease-in-out infinite', willChange: 'transform' }} />
        <div className="absolute bottom-32 left-10 w-72 h-72 bg-purple-600/18 rounded-full blur-3xl hidden md:block" style={{ animation: 'float 6s ease-in-out infinite', animationDelay: '1s', willChange: 'transform' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/12 rounded-full blur-3xl" />
      </div>

      {/* Header - Mobile Optimized */}
      <div className="relative z-10 flex items-center justify-between p-3 sm:p-5 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div 
            className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #e85d3b, #f59e0b, #fbbf24)',
              boxShadow: '0 4px 20px rgba(232, 93, 59, 0.4)',
              animation: isSpinning ? 'pulse-glow 1.5s ease-in-out infinite' : 'none'
            }}
          >
            <Sparkles className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-2xl font-black bg-gradient-to-r from-[#fb923c] via-[#f59e0b] to-[#fbbf24] bg-clip-text text-transparent">LUCK WHEEL</h2>
            <p className="text-[10px] sm:text-xs text-orange-200/80 font-semibold tracking-wide truncate">Spin to win amazing rewards!</p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5 text-white/80" />
        </button>
      </div>

      {/* Content Container with Gradient Background - Mobile Optimized */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-3 sm:px-4 py-4 sm:py-6 overflow-y-auto">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-orange-900/10 to-pink-900/20 opacity-60" 
          style={{
            backgroundSize: '400% 400%',
            animation: 'gradient-shift 15s ease infinite'
          }}
        />
        
        {/* Compact Layout with Wheel and Actions - Responsive */}
        <div className="relative w-full max-w-4xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-4 sm:gap-8">
            
            {/* Wheel Section — Professional Premium Design */}
            <div className="relative flex flex-col items-center justify-center py-8">
              {/* Background card container for professional framing */}
              <div className="absolute inset-0 rounded-3xl opacity-0" />

              {/* Ambient glow layers - enhanced theatrical lighting */}
              <div className="absolute inset-0 rounded-full pointer-events-none"
                style={{ 
                  background: 'radial-gradient(circle, rgba(249,115,22,0.4) 0%, rgba(168,85,247,0.2) 45%, rgba(59,130,246,0.1) 65%, transparent 85%)', 
                  filter: 'blur(40px)',
                  transform: 'scale(1.1)'
                }}
              />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-20 pointer-events-none"
                style={{ 
                  background: 'linear-gradient(to right, rgba(249,115,22,0.6), rgba(236,72,153,0.5), rgba(168,85,247,0.5))', 
                  borderRadius: '50%', 
                  filter: 'blur(35px)',
                  opacity: 0.8
                }}
              />

              {/* Premium Diamond Pointer - Enhanced */}
              <div className="relative z-30 mb-[-24px]" style={{ filter: 'drop-shadow(0 8px 20px rgba(236,72,153,0.6))' }}>
                <svg width="56" height="72" viewBox="0 0 52 64">
                  <defs>
                    <linearGradient id="dPtrBody" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff"/>
                      <stop offset="100%" stopColor="#d1d5db"/>
                    </linearGradient>
                    <linearGradient id="dPtrGem" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%"   stopColor="#fda4af"/>
                      <stop offset="40%"  stopColor="#ec4899"/>
                      <stop offset="100%" stopColor="#be123c"/>
                    </linearGradient>
                  </defs>
                  <ellipse cx="26" cy="22" rx="20" ry="20" fill="url(#dPtrBody)" stroke="#fda4af" strokeWidth="2"/>
                  <polygon points="6,34 46,34 26,64" fill="url(#dPtrBody)" stroke="#fda4af" strokeWidth="1.8" strokeLinejoin="round"/>
                  <polygon points="26,6 38,20 26,34 14,20" fill="url(#dPtrGem)"/>
                  <polygon points="26,6 38,20 26,15 14,20" fill="rgba(255,255,255,0.5)"/>
                  <polygon points="26,34 38,20 26,26 14,20" fill="rgba(0,0,0,0.12)"/>
                  <line x1="14" y1="20" x2="38" y2="20" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
                  <circle cx="21" cy="13" r="2.8" fill="rgba(255,255,255,0.7)"/>
                </svg>
              </div>

              {/* Professional Wheel Container — key forces remount on each spin so CSS transition resets cleanly */}
              <div
                key={spinKey}
                className="relative rounded-full"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: rotation > 0 ? "transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
                  willChange: "transform",
                }}
              >
                {(() => {
                  const SIZE = 320
                  const CX = SIZE / 2
                  const CY = SIZE / 2
                  const OUTER = 138
                  const INNER = 46
                  const RIM   = 152
                  const N     = SPIN_SEGMENTS.length
                  const STEP  = 360 / N
                  const toRad = (d: number) => (d * Math.PI) / 180

                  const slicePath = (i: number) => {
                    const s = i * STEP - 90
                    const e = s + STEP
                    const x1 = CX + OUTER * Math.cos(toRad(s))
                    const y1 = CY + OUTER * Math.sin(toRad(s))
                    const x2 = CX + OUTER * Math.cos(toRad(e))
                    const y2 = CY + OUTER * Math.sin(toRad(e))
                    return `M${CX},${CY} L${x1},${y1} A${OUTER},${OUTER} 0 0,1 ${x2},${y2} Z`
                  }

                  const ledAngles = Array.from({ length: 16 }, (_, i) => (i * 360) / 16)

                  return (
                    <svg
                      width={SIZE} height={SIZE}
                      viewBox={`0 0 ${SIZE} ${SIZE}`}
                      style={{ overflow: "visible", filter: isSpinning ? "drop-shadow(0 0 28px rgba(249,115,22,0.7))" : "drop-shadow(0 8px 32px rgba(0,0,0,0.35))" }}
                    >
                      <defs>
                        {/* Per-segment radial gradient for 3D depth */}
                        {SPIN_SEGMENTS.map((seg, i) => (
                          <radialGradient key={i} id={`dseg${i}`} cx="30%" cy="28%" r="82%">
                            <stop offset="0%"   stopColor={seg.color} stopOpacity="1"/>
                            <stop offset="55%"  stopColor={seg.color} stopOpacity="1"/>
                            <stop offset="100%" stopColor={seg.darkColor} stopOpacity="1"/>
                          </radialGradient>
                        ))}
                        {/* Chrome rim gradient */}
                        <linearGradient id="dRimChrome" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%"   stopColor="#ff7e36"/>
                          <stop offset="20%"  stopColor="#f97316"/>
                          <stop offset="38%"  stopColor="#f43f5e"/>
                          <stop offset="55%"  stopColor="#ec4899"/>
                          <stop offset="72%"  stopColor="#a855f7"/>
                          <stop offset="88%"  stopColor="#6366f1"/>
                          <stop offset="100%" stopColor="#3b82f6"/>
                        </linearGradient>
                        {/* Rim shine */}
                        <linearGradient id="dRimShine" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%"   stopColor="rgba(255,255,255,0.55)"/>
                          <stop offset="45%"  stopColor="rgba(255,255,255,0.12)"/>
                          <stop offset="100%" stopColor="rgba(0,0,0,0.18)"/>
                        </linearGradient>
                        {/* Center button gradient */}
                        <radialGradient id="dCenterGrad" cx="38%" cy="30%" r="75%">
                          <stop offset="0%"   stopColor="#fcd34d"/>
                          <stop offset="30%"  stopColor="#fb923c"/>
                          <stop offset="65%"  stopColor="#ef4444"/>
                          <stop offset="100%" stopColor="#991b1b"/>
                        </radialGradient>
                        {/* Center gloss */}
                        <radialGradient id="dCenterGloss" cx="50%" cy="22%" r="58%">
                          <stop offset="0%"   stopColor="rgba(255,255,255,0.5)"/>
                          <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
                        </radialGradient>
                        {/* Hub ring metallic */}
                        <radialGradient id="dHubRing" cx="30%" cy="25%" r="80%">
                          <stop offset="0%"   stopColor="#f8fafc"/>
                          <stop offset="45%"  stopColor="#e2e8f0"/>
                          <stop offset="100%" stopColor="#94a3b8"/>
                        </radialGradient>
                        {/* Outer ambient glow */}
                        <radialGradient id="dOuterGlow" cx="50%" cy="50%" r="50%">
                          <stop offset="55%"  stopColor="transparent"/>
                          <stop offset="100%" stopColor="rgba(249,115,22,0.2)"/>
                        </radialGradient>
                        {/* Filters */}
                        <filter id="dWheelDrop" x="-15%" y="-15%" width="130%" height="145%">
                          <feDropShadow dx="0" dy="10" stdDeviation="16" floodColor="rgba(0,0,0,0.35)"/>
                        </filter>
                        <filter id="dRimShadow" x="-5%" y="-5%" width="110%" height="110%">
                          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="rgba(0,0,0,0.28)"/>
                        </filter>
                        <filter id="dHubDrop" x="-30%" y="-30%" width="160%" height="160%">
                          <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="rgba(0,0,0,0.45)"/>
                        </filter>
                        <filter id="dLedBloom" x="-150%" y="-150%" width="400%" height="400%">
                          <feGaussianBlur stdDeviation="2" result="blur"/>
                          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                        <filter id="dTextShadow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.3)"/>
                        </filter>
                      </defs>

                      {/* Ambient outer glow */}
                      <circle cx={CX} cy={CY} r={RIM + 20} fill="url(#dOuterGlow)"/>

                      {/* Wheel drop shadow */}
                      <ellipse cx={CX} cy={CY + 10} rx={OUTER + 6} ry={16} fill="rgba(0,0,0,0.18)" filter="url(#dWheelDrop)"/>

                      {/* === SEGMENTS === */}
                      {SPIN_SEGMENTS.map((seg, i) => {
                        const midDeg  = i * STEP + STEP / 2 - 90
                        const textRot = midDeg + 90
                        const toR = (d: number) => (d * Math.PI) / 180

                        const labelDist = OUTER * 0.62
                        const iconDist  = OUTER * 0.84
                        const lx = CX + labelDist * Math.cos(toR(midDeg))
                        const ly = CY + labelDist * Math.sin(toR(midDeg))
                        const ix = CX + iconDist  * Math.cos(toR(midDeg))
                        const iy = CY + iconDist  * Math.sin(toR(midDeg))
                        const textColor = seg.textColor || "#ffffff"

                        return (
                          <g key={i}>
                            {/* Segment with radial gradient for 3D depth */}
                            <path d={slicePath(i)} fill={`url(#dseg${i})`} stroke="rgba(255,255,255,0.75)" strokeWidth={2.5}/>
                            {/* Subtle inner bevel - enhanced 3D effect */}
                            <path d={slicePath(i)} fill="rgba(255,255,255,0.15)"
                              style={{ transform: `scale(0.38)`, transformOrigin: `${CX}px ${CY}px` }}
                            />
                            {/* Outer segment shadow - adds separation */}
                            <path d={slicePath(i)} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth={1.5}
                              style={{ transform: `scale(1.02)`, transformOrigin: `${CX}px ${CY}px` }}
                            />
                            
                            {/* === PROFESSIONAL LABEL LAYOUT === */}
                            {/* Main multiplier label with enhanced styling */}
                            <g transform={`rotate(${textRot},${lx},${ly - 6})`} filter="url(#dTextShadow)">
                              {/* Label shadow for depth */}
                              <text x={lx} y={ly - 6 + 1.5} textAnchor="middle" dominantBaseline="middle"
                                fontSize={16} fontWeight="900" fill="rgba(0,0,0,0.3)"
                                fontFamily="'Arial Black', Arial, sans-serif" letterSpacing="-0.5">
                                {seg.label}
                              </text>
                              {/* Main label */}
                              <text x={lx} y={ly - 6} textAnchor="middle" dominantBaseline="middle"
                                fontSize={16} fontWeight="900" fill={textColor}
                                fontFamily="'Arial Black', Arial, sans-serif" letterSpacing="-0.5"
                                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
                                {seg.label}
                              </text>
                            </g>
                            
                            {/* Lucky message / motivation text below main label */}
                            {seg.subtext && (
                              <g transform={`rotate(${textRot},${lx},${ly + 5})`} filter="url(#dTextShadow)">
                                <text x={lx} y={ly + 5} textAnchor="middle" dominantBaseline="middle"
                                  fontSize={9} fontWeight="700" fill={textColor}
                                  fontFamily="'Arial', sans-serif" opacity="0.85"
                                  style={{ letterSpacing: '0.3px' }}>
                                  {seg.subtext}
                                </text>
                              </g>
                            )}
                            
                            {/* Icon near rim with glow */}
                            <g transform={`rotate(${textRot},${ix},${iy})`}>
                              <text x={ix} y={iy} textAnchor="middle" dominantBaseline="middle"
                                fontSize={20} fontFamily="Arial, sans-serif" fontWeight="bold"
                                style={{ 
                                  filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3)) drop-shadow(0 0 8px rgba(255,255,255,0.4))',
                                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                                }}>
                                {seg.icon}
                              </text>
                            </g>
                          </g>
                        )
                      })}

                      {/* === ENHANCED EMBOSSED CHROME RIM === */}
                      {/* Outer shadow ring - gives 3D depth */}
                      <circle cx={CX} cy={CY} r={RIM + 16} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={3}/>
                      
                      {/* Bright outer edge - metallic highlight */}
                      <circle cx={CX} cy={CY} r={RIM + 14} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={2}/>
                      
                      {/* Main gradient rim - chrome metallic effect */}
                      <circle cx={CX} cy={CY} r={RIM} fill="none" stroke="url(#dRimChrome)" strokeWidth={28} filter="url(#dRimShadow)"/>
                      
                      {/* Shine overlay - reflective surface */}
                      <circle cx={CX} cy={CY} r={RIM} fill="none" stroke="url(#dRimShine)" strokeWidth={28} opacity={0.6}/>
                      
                      {/* Inner highlight - beveled edge effect */}
                      <circle cx={CX} cy={CY} r={RIM - 14} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2.5}/>
                      
                      {/* Inner shadow ring - adds depth */}
                      <circle cx={CX} cy={CY} r={RIM - 15} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={1.5}/>
                      
                      {/* Deep inner shadow - rim depression effect */}
                      <circle cx={CX} cy={CY} r={RIM - 20} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth={2}/>

                      {/* === LED BULBS === */}
                      {ledAngles.map((deg, i) => {
                        const r   = toRad(deg)
                        const lx  = CX + RIM * Math.cos(r)
                        const ly  = CY + RIM * Math.sin(r)
                        const isA = i % 2 === 0
                        return (
                          <g key={i} filter="url(#dLedBloom)">
                            <circle cx={lx} cy={ly + 1.5} r={6}   fill="rgba(0,0,0,0.32)"/>
                            <circle cx={lx} cy={ly}        r={7.5} fill={isA ? "rgba(255,200,80,0.22)" : "rgba(180,210,255,0.22)"}/>
                            <circle cx={lx} cy={ly}        r={5.5} fill={isA ? "rgba(255,240,180,1)" : "rgba(220,240,255,1)"}/>
                            <circle cx={lx} cy={ly}        r={5.5} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={0.9}/>
                            <circle cx={lx - 1.8} cy={ly - 1.8} r={1.8} fill="rgba(255,255,255,0.82)"/>
                          </g>
                        )
                      })}

                      {/* === HUB RING (metallic separator) === */}
                      <circle cx={CX} cy={CY} r={INNER + 7} fill="url(#dHubRing)"/>
                      <circle cx={CX} cy={CY} r={INNER + 7} fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth={1.5}/>
                      <circle cx={CX} cy={CY} r={INNER + 2} fill="none" stroke="rgba(0,0,0,0.1)"        strokeWidth={2}/>

                      {/* === CENTER BUTTON WITH LUCK THEME === */}
                      <circle cx={CX} cy={CY + 4} r={INNER + 1} fill="rgba(0,0,0,0.28)" filter="url(#dHubDrop)"/>
                      <circle cx={CX} cy={CY}     r={INNER}     fill="url(#dCenterGrad)"/>
                      <circle cx={CX} cy={CY}     r={INNER}     fill="url(#dCenterGloss)"/>
                      <circle cx={CX} cy={CY}     r={INNER}     fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth={1.5}/>
                      <ellipse cx={CX}     cy={CY - 12} rx={24} ry={13} fill="rgba(255,255,255,0.28)"/>
                      <ellipse cx={CX - 1} cy={CY - 14} rx={15} ry={8}  fill="rgba(255,255,255,0.2)"/>

                      {/* Decorative luck symbols around center */}
                      <g style={{ opacity: 0.7 }}>
                        <text x={CX - 28} y={CY} textAnchor="middle" dominantBaseline="middle" fontSize={14}>✨</text>
                        <text x={CX + 28} y={CY} textAnchor="middle" dominantBaseline="middle" fontSize={14}>✨</text>
                        <text x={CX} y={CY - 28} textAnchor="middle" dominantBaseline="middle" fontSize={14}>🍀</text>
                      </g>

                      {/* SPIN text with professional styling */}
                      <text x={CX} y={CY + 2}  textAnchor="middle" dominantBaseline="middle"
                        fontSize={16} fontWeight="900" fill="rgba(0,0,0,0.25)"
                        fontFamily="'Arial Black', Arial, sans-serif" letterSpacing="3"
                        style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}>
                        SPIN
                      </text>
                      <text x={CX} y={CY - 2}      textAnchor="middle" dominantBaseline="middle"
                        fontSize={16} fontWeight="900" fill="white"
                        fontFamily="'Arial Black', Arial, sans-serif" letterSpacing="3"
                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
                        SPIN
                      </text>
                    </svg>
                  )
                })()}
              </div>
            </div>
        
        {/* Action Section - Enhanced */}
        <div className="space-y-4 w-full max-w-sm relative">
          {/* Amount Selector - Professional with Custom Input */}
          <div className="relative rounded-2xl p-5 overflow-hidden border-2 border-blue-400"
            style={{
              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%)',
              boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3), inset 0 2px 10px rgba(255,255,255,0.5)'
            }}
          >
            <p className="text-slate-800 font-black text-sm mb-3">Select or Enter Spin Amount</p>
            
            {/* Preset Amount Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[10, 25, 50, 100, 250, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setSpinAmount(amt)}
                  className={`py-2 px-2 rounded-lg font-black text-sm transition-all ${
                    spinAmount === amt && typeof spinAmount === 'number'
                      ? 'bg-blue-600 text-white scale-105 shadow-lg' 
                      : 'bg-white text-slate-800 hover:scale-105'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>

            {/* Custom Amount Input */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 font-black">$</span>
                <input
                  type="number"
                  min="1"
                  max={currentBalance}
                  value={typeof spinAmount === 'number' && spinAmount > 0 && ![10, 25, 50, 100, 250, 500].includes(spinAmount) ? spinAmount : ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    if (val > 0 && val <= currentBalance) {
                      setSpinAmount(val)
                    }
                  }}
                  onFocus={() => {
                    // Clear when focusing to enter custom amount
                    if ([10, 25, 50, 100, 250, 500].includes(spinAmount)) {
                      setSpinAmount(0)
                    }
                  }}
                  placeholder="Custom"
                  className="w-full pl-7 pr-3 py-2 rounded-lg bg-white text-slate-800 font-black border-2 border-blue-300 focus:border-blue-600 focus:outline-none transition-colors"
                />
              </div>
              <button
                onClick={() => setSpinAmount(currentBalance)}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-lg transition-colors text-sm"
                title="Set to maximum available balance"
              >
                MAX
              </button>
            </div>

            {/* Amount Info */}
            <div className="mt-2 text-xs text-slate-700 font-semibold">
              Min: $1 | Max: ${Math.floor(currentBalance)}
            </div>
          </div>

          {/* Wallet Balance Display */}
          <div 
            className="relative rounded-2xl p-4 overflow-hidden border-2 border-emerald-400 transform hover:scale-105 transition-transform"
            style={{
              background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #34d399 100%)',
              boxShadow: '0 4px 20px rgba(52, 211, 153, 0.3), inset 0 2px 10px rgba(255,255,255,0.5)'
            }}
          >
            <div className="absolute inset-0 opacity-30"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                backgroundSize: '200% 100%',
                animation: 'shimmer-bg 2s infinite'
              }}
            />
            <div className="relative flex items-center justify-center gap-3">
                <Wallet className="h-5 w-5 text-slate-800" />
                <p className="text-slate-800 text-base font-black">
                  Your Balance: <span className="text-slate-900 text-2xl">${currentBalance.toFixed(2)}</span>
                </p>
                <Wallet className="h-5 w-5 text-slate-800" />
            </div>
          </div>

          {/* Possible Winnings Display - All 9 Multipliers */}
          <div className="relative rounded-2xl p-4 overflow-hidden border-2 border-purple-400"
            style={{
              background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 50%, #d8b4fe 100%)',
              boxShadow: '0 4px 20px rgba(168, 85, 247, 0.3), inset 0 2px 10px rgba(255,255,255,0.5)'
            }}
          >
            <div className="relative space-y-3">
              <p className="text-slate-800 text-xs font-black">Possible Winnings (All Multipliers)</p>
              
              {/* Compact Grid of All 9 Outcomes */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {/* Loss Tiers */}
                <div className="bg-red-50 rounded-lg p-2 border border-red-200">
                  <p className="text-xs font-bold text-red-700">0x</p>
                  <p className="text-sm font-black text-red-600">$0.00</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-2 border border-orange-200">
                  <p className="text-xs font-bold text-orange-700">0.25x</p>
                  <p className="text-sm font-black text-orange-600">${(spinAmount * 0.25).toFixed(2)}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-2 border border-yellow-200">
                  <p className="text-xs font-bold text-yellow-700">0.5x</p>
                  <p className="text-sm font-black text-yellow-600">${(spinAmount * 0.5).toFixed(2)}</p>
                </div>

                {/* Break Even & Win Tiers */}
                <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                  <p className="text-xs font-bold text-blue-700">1x</p>
                  <p className="text-sm font-black text-blue-600">${(spinAmount * 1).toFixed(2)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                  <p className="text-xs font-bold text-green-700">1.5x</p>
                  <p className="text-sm font-black text-green-600">${(spinAmount * 1.5).toFixed(2)}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-200">
                  <p className="text-xs font-bold text-emerald-700">2x</p>
                  <p className="text-sm font-black text-emerald-600">${(spinAmount * 2).toFixed(2)}</p>
                </div>

                {/* High Multiplier Tiers */}
                <div className="bg-red-50 rounded-lg p-2 border border-red-300">
                  <p className="text-xs font-bold text-red-800">3x</p>
                  <p className="text-sm font-black text-red-700">${(spinAmount * 3).toFixed(2)}</p>
                </div>
                <div className="bg-pink-50 rounded-lg p-2 border border-pink-300">
                  <p className="text-xs font-bold text-pink-800">5x</p>
                  <p className="text-sm font-black text-pink-700">${(spinAmount * 5).toFixed(2)}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-2 border border-purple-300">
                  <p className="text-xs font-bold text-purple-800">10x</p>
                  <p className="text-sm font-black text-purple-700">${(spinAmount * 10).toFixed(2)}</p>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="pt-2 border-t border-purple-300 space-y-1">
                <p className="text-xs text-slate-600">Min Return: <span className="font-bold text-red-600">$0.00</span> (0x)</p>
                <p className="text-xs text-slate-600">Max Return: <span className="font-bold text-purple-700">${(spinAmount * 10).toFixed(2)}</span> (10x)</p>
                <p className="text-xs text-slate-600">Spin Amount: <span className="font-bold text-purple-700">${spinAmount.toFixed(2)}</span></p>
              </div>
            </div>
          </div>

          {/* Spin Button - Enhanced with Better Effects */}
          <button
            onClick={spinWheel}
            disabled={isSpinning || currentBalance < spinAmount || spinAmount <= 0}
            className="w-full h-16 text-lg font-black rounded-2xl transition-all disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden transform hover:scale-105 active:scale-95"
            style={{
              background: !isSpinning && currentBalance >= spinAmount && spinAmount > 0
                ? 'linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fbbf24 100%)' 
                : 'linear-gradient(135deg, #94a3b8, #cbd5e1)',
              boxShadow: !isSpinning && currentBalance >= spinAmount && spinAmount > 0
                ? '0 6px 0 #ea580c, 0 12px 30px rgba(249, 115, 22, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)' 
                : '0 3px 0 #64748b',
              color: 'white',
              textShadow: '0 2px 4px rgba(0,0,0,0.4)',
              border: !isSpinning && currentBalance >= spinAmount && spinAmount > 0 ? '2px solid rgba(255,255,255,0.3)' : 'none'
            }}
          >
            {!isSpinning && currentBalance >= spinAmount && spinAmount > 0 && (
              <>
                <div 
                  className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer-bg 2s infinite',
                      willChange: 'background-position',
                    }}
                  />
                {/* Floating Sparkles */}
                <div className="absolute top-2 left-4 animate-ping">
                  <div className="w-2 h-2 bg-white rounded-full opacity-75" />
                </div>
                <div className="absolute bottom-3 right-6 animate-ping" style={{ animationDelay: '0.5s' }}>
                  <div className="w-2 h-2 bg-white rounded-full opacity-75" />
                </div>
              </>
            )}
            <span className="relative z-10 flex items-center justify-center gap-3">
              {isSpinning ? (
                <>
                  <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="font-black text-xl tracking-wider">SPINNING...</span>
                </>
              ) : currentBalance < spinAmount || spinAmount <= 0 ? (
              <>
                <AlertCircle className="h-6 w-6" />
                <span className="font-black text-lg">NEED ${spinAmount > currentBalance ? (spinAmount - currentBalance).toFixed(2) : 'Valid Amount'}</span>
              </>
              ) : (
                <>
                  <Sparkles className="h-6 w-6 animate-bounce" />
                  <span className="font-black text-xl tracking-wider">SPIN ${spinAmount.toFixed(2)}</span>
                  <Sparkles className="h-6 w-6 animate-bounce" style={{ animationDelay: '0.2s' }} />
                </>
              )}
            </span>
          </button>
        </div>
          </div>
        </div>
      </div>
      
      {/* ── Result Modal ── */}
      {showResult && result && (() => {
        const m = result.multiplier
        const bet = spinAmount
        const returned = parseFloat((bet * m).toFixed(2))
        const netChange = parseFloat((returned - bet).toFixed(2))

        const isWin       = m >= 1.0
        const isBreakEven = m === 1.0
        const isLoss      = m < 1.0 && m > 0
        const isZero      = m === 0.0

        // Background colour based on outcome
        const bgGradient = isWin && !isBreakEven
          ? 'linear-gradient(135deg, #15803d 0%, #16a34a 50%, #166534 100%)'   // green – profit
          : isBreakEven
          ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #1e40af 100%)'   // blue – break even
          : 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #6b0f0f 100%)'   // red – loss

        // Headline text
        const headline = (() => {
          if (m >= 10) return 'LEGENDARY 10X!'
          if (m >= 5)  return 'MEGA 5X JACKPOT!'
          if (m >= 3)  return 'JACKPOT — 3X WIN!'
          if (m >= 2)  return `GREAT WIN — ${m}X!`
          if (m >= 1.5) return `NICE WIN — ${m}X!`
          if (m === 1) return 'BREAK EVEN — 1X'
          if (m === 0.5) return 'HALF BACK — 0.5X'
          if (m === 0.25) return 'QUARTER BACK — 0.25X'
          return 'BETTER LUCK NEXT TIME'
        })()

        // Sub-message
        const subMessage = (() => {
          if (m >= 10) return `You turned $${bet.toFixed(2)} into $${returned.toFixed(2)} — incredible!`
          if (m >= 5)  return `$${bet.toFixed(2)} bet returned $${returned.toFixed(2)}. Amazing!`
          if (m >= 3)  return `$${bet.toFixed(2)} bet returned $${returned.toFixed(2)}. Well done!`
          if (m >= 2)  return `$${bet.toFixed(2)} bet returned $${returned.toFixed(2)}.`
          if (m >= 1.5) return `$${bet.toFixed(2)} bet returned $${returned.toFixed(2)}.`
          if (m === 1)  return `Your $${bet.toFixed(2)} was returned in full. No profit, no loss.`
          if (m === 0.5) return `You got half your bet back. Lost $${Math.abs(netChange).toFixed(2)}.`
          if (m === 0.25) return `You got a quarter back. Lost $${Math.abs(netChange).toFixed(2)}.`
          return `Your $${bet.toFixed(2)} bet was lost. Try again!`
        })()

        return (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowResult(false)}
          >
            <div
              className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
              style={{ animation: 'bounce-in 0.5s cubic-bezier(0.68,-0.55,0.265,1.55)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Coloured header band */}
              <div className="relative p-8 text-center" style={{ background: bgGradient }}>
                {/* Dot-pattern overlay */}
                <div className="absolute inset-0 opacity-10"
                  style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }}
                />

                {/* Icon */}
                <div className="text-6xl mb-3 relative z-10" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}>
                  {result.icon}
                </div>

                {/* Segment label badge */}
                <div className="inline-block mb-3 bg-white/20 rounded-full px-3 py-0.5 text-xs font-semibold text-white relative z-10">
                  Pointer landed on: <span className="font-black">{result.label}</span>
                </div>

                {/* Headline */}
                <h3 className="relative z-10 text-white font-black text-2xl leading-tight mb-1"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                  {headline}
                </h3>

                {/* Sub-message */}
                <p className="relative z-10 text-white/85 text-sm font-medium">
                  {subMessage}
                </p>
              </div>

              {/* White body */}
              <div className="bg-white px-6 py-5 space-y-3">

                {/* Bet / Returned / Net row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500 font-medium mb-0.5">Bet</p>
                    <p className="font-black text-slate-800 text-base">${bet.toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500 font-medium mb-0.5">Multiplier</p>
                    <p className="font-black text-slate-800 text-base">{m}x</p>
                  </div>
                  <div className={`rounded-xl p-3 ${isWin && !isBreakEven ? 'bg-green-50' : isBreakEven ? 'bg-blue-50' : 'bg-red-50'}`}>
                    <p className="text-xs text-slate-500 font-medium mb-0.5">Returned</p>
                    <p className={`font-black text-base ${isWin && !isBreakEven ? 'text-green-700' : isBreakEven ? 'text-blue-700' : 'text-red-700'}`}>
                      ${returned.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Net change bar */}
                <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                  isWin && !isBreakEven ? 'bg-green-50 border border-green-200'
                  : isBreakEven ? 'bg-blue-50 border border-blue-200'
                  : 'bg-red-50 border border-red-200'
                }`}>
                  <span className="text-sm font-semibold text-slate-600">
                    {isWin && !isBreakEven ? 'Profit' : isBreakEven ? 'Net Change' : 'Loss'}
                  </span>
                  <span className={`text-lg font-black ${
                    isWin && !isBreakEven ? 'text-green-700'
                    : isBreakEven ? 'text-blue-700'
                    : 'text-red-700'
                  }`}>
                    {isWin && !isBreakEven ? '+' : ''}{netChange.toFixed(2)} USDT
                  </span>
                </div>

                {/* Dismiss button */}
                <button
                  onClick={() => setShowResult(false)}
                  className="w-full py-3.5 rounded-2xl font-black text-white text-base transition-all active:scale-95"
                  style={{ background: bgGradient, boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}
                >
                  {isWin && !isBreakEven ? 'Collect Winnings' : isBreakEven ? 'Noted' : 'Try Again'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function QueuePositionRing({ position = 47, totalInQueue = 100 }: { position?: number; totalInQueue?: number }) {
  const progress = ((totalInQueue - position) / totalInQueue) * 100
  const circumference = 2 * Math.PI * 40
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="relative w-24 h-24">
          {/* Animated gradient border glow */}
          <div
            className="absolute inset-0 rounded-full animate-spin-slow"
            style={{
              background: "conic-gradient(from 0deg, #E85D3B, #7c3aed, #22d3ee, #E85D3B)",
              padding: "4px",
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              animationDuration: "3s",
            }}
          />
      {/* Background ring */}
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="white" stroke="rgba(124, 58, 237, 0.1)" strokeWidth="8" />
        {/* Progress ring with gradient */}
        <defs>
          <linearGradient id="queueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E85D3B" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="url(#queueGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000"
          style={{ filter: "drop-shadow(0 0 6px rgba(124, 58, 237, 0.5))" }}
        />
      </svg>
      {/* Position number */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black bg-gradient-to-br from-[#7c3aed] to-[#E85D3B] bg-clip-text text-transparent">
          #{position}
        </span>
        <span className="text-xs text-slate-500 font-medium">in queue</span>
      </div>
    </div>
  )
}

export default function DashboardHome() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState(false)
  const createRipple = useRipple()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSpinOpen, setIsSpinOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"dashboard" | "wheel" | "activity" | "leaderboard">("dashboard")
  const [participantData, setParticipantData] = useState<{
    wallet: string
    id?: string
    wallet_address?: string
    email?: string
    username?: string
    activation_fee_paid?: boolean
    account_balance?: number
    bonus_balance?: number
    contributed_amount?: number
    participation_count?: number
    referral_code?: string
    total_referrals?: number
    total_earnings?: number
    referral_earnings?: number
    activation_deadline?: string
    account_frozen?: boolean
    profile_image?: string
    details_completed?: boolean
    [key: string]: any
  } | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [showFrozenModal, setShowFrozenModal] = useState(false)
  const [hasContributed, setHasContributed] = useState(false)
  const [participantId, setParticipantId] = useState<string>("")
  const [showTopUpModal, setShowTopUpModal] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [queuePosition, setQueuePosition] = useState(47)
  const [queueData, setQueueData] = useState<any>(null)
  
  // Profile completion check removed — details_completed column does not exist in DB schema
  // Users should not be forced off the dashboard for missing this field

  const handleTimerExpire = useCallback(async () => {
    if (!participantData?.email) return
    try {
      await fetch("/api/participant/check-expired", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: participantData.email }),
      })
      setShowFrozenModal(true)
    } catch (error) {
      console.error("Error freezing account:", error)
    }
  }, [participantData?.email])

  const handleLogout = async () => {
    localStorage.removeItem("participantData")
    localStorage.removeItem("participantToken")
    await fetch("/api/auth/participant-logout", { method: "POST" }).catch(() => {})
    router.push("/participant/login")
  }

  const handleSpinWin = (_amount: number, _label: string, _type: string, balanceAfter?: number, _balanceAfterDeduct?: number) => {
    if (balanceAfter !== undefined) {
      // Directly update balance with the server-confirmed value — no round-trip needed
      setParticipantData((prev: any) => {
        const updated = { ...prev, account_balance: balanceAfter }
        localStorage.setItem("participantData", JSON.stringify(updated))
        return updated
      })
    }
  }

  // Refresh participant data from server
  const fetchParticipantData = async () => {
    try {
      const res = await fetch(`/api/participant/me?email=${encodeURIComponent(participantData?.email || "")}`)
      const data = await res.json()
      if (data.success && data.participant) {
        setParticipantData(data.participant)
        localStorage.setItem("participantData", JSON.stringify(data.participant))
      }
    } catch (error) {
      console.error("[v0] Error refreshing participant data:", error)
    }
  }

  // Function to fetch queue position
  const fetchQueuePosition = async (email: string) => {
    try {
      const response = await fetch(`/api/participant/queue-position?email=${encodeURIComponent(email)}`)
      const data = await response.json()
      
      if (data.success) {
        setQueuePosition(data.position)
        setQueueData(data)
      }
    } catch {}
  }

  // Function to fetch fresh participant data from database
  const refreshParticipantData = async (email: string) => {
    try {
      const res = await fetch(`/api/participant/me?email=${encodeURIComponent(email)}`)
      if (!res.ok) return
      const json = await res.json()
      const data: any = json.participant
      if (!data) return
      // Coerce PostgreSQL numeric strings to numbers to prevent .toFixed() crashes
      const updatedData = {
        ...data,
        participantId: data.id,
        walletAddress: data.wallet_address || data.bep20_address || "",
        bep20_address: data.wallet_address || data.bep20_address || "",
        account_balance: Number(data.account_balance) || 0,
        wallet_balance: Number(data.wallet_balance ?? data.account_balance) || 0,
        bonus_balance: Number(data.bonus_balance) || 0,
        total_earnings: Number(data.total_earnings) || 0,
        referral_earnings: Number(data.referral_earnings) || 0,
        contributed_amount: Number(data.contributed_amount) || 0,
        participation_count: Number(data.participation_count) || 0,
        referral_count: Number(data.referral_count) || 0,
        total_referrals: Number(data.total_referrals) || 0,
      }
      setParticipantData(updatedData)
      localStorage.setItem("participantData", JSON.stringify(updatedData))
    } catch {}
  }

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
        setParticipantId(data.id || "")

        if (data.account_frozen) {
          setShowFrozenModal(true)
        }

        if (data.contributed_amount && data.contributed_amount > 0) {
          setHasContributed(true)
        }

        // Refresh data from database to get latest balance
        if (data.email) {
          refreshParticipantData(data.email)
        }
      } catch {}
    }

    // Add listener for page visibility to refresh balance when user returns to this page
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const storedData = localStorage.getItem("participantData")
        if (storedData) {
          try {
            const data = JSON.parse(storedData)
            if (data.email) {
              refreshParticipantData(data.email)
            }
          } catch {}
        }
      }
    }

    const mockLeaderboard: LeaderboardEntry[] = SAMPLE_USERNAMES.map((username, index) => ({
      position: index + 1,
      username,
      participantNumber: Math.floor(Math.random() * 9000) + 1000,
      rank: (index < 2 ? "Platinum" : index < 5 ? "Gold" : "Silver") as UserRank,
      participation_count: Math.floor(Math.random() * 50) + (10 - index) * 5,
      contributedAmount: 100,
    }))
    setLeaderboard(mockLeaderboard)

    // Set up periodic refresh to sync balance updates
    const refreshInterval = setInterval(() => {
      const currentData = localStorage.getItem("participantData")
      if (currentData) {
        try {
          const data = JSON.parse(currentData)
          if (data.email) {
            refreshParticipantData(data.email)
          }
        } catch {}
      }
    }, 60000) // Refresh every 60 seconds to reduce load

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      clearInterval(refreshInterval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [router])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (navigator.vibrate) navigator.vibrate(50)
      toast({ title: "Copied!", description: "Referral code copied to clipboard" })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: "Copy failed", variant: "destructive" })
    }
  }

  if (!mounted || !participantData) {
    return <PageLoader variant="dashboard" />
  }



  const displayName = participantData.username || participantData.email?.split("@")[0] || "User"
  const walletBalance = parseFloat(participantData.account_balance) || 0
  // Referral earnings = $5 per referral (not total_earnings which includes prediction profits)
  const referralEarnings = (participantData.total_referrals || 0) * 5
  const referralCode = participantData.referral_code || ""
  const activationDeadline = participantData.activation_deadline
    ? new Date(participantData.activation_deadline)
    : new Date(Date.now() + 48 * 60 * 60 * 1000)

  return (
    <div className="pb-24 page-fade-enter">
      {/* Frozen Account Modal */}
      <FrozenAccountModal isOpen={showFrozenModal} onClose={() => setShowFrozenModal(false)} />

      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} participantData={participantData} />

      {/* Top Up Modal */}
      <TopUpModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        currentBalance={walletBalance}
        userId={participantData?.username || ""}
        userEmail={participantData?.email || ""}
        onSuccess={(amount) => {
          // Balance will be credited by admin — just close the modal
        }}
      />

      <header className="bg-gradient-to-r from-slate-50 to-purple-50 sticky top-0 z-40 border-b border-purple-100 h-14 shadow-sm">
        <div className="px-4 h-full flex items-center justify-between">
          {/* Left side - Profile Avatar */}
          <div className="flex items-center gap-2">
            <Link href="/participant/dashboard/profile">
              <button className="relative transition-transform hover:scale-105">
                {participantData?.profile_image ? (
                  <img
                    src={participantData.profile_image || "/placeholder.svg"}
                    alt="Profile"
                    className="h-9 w-9 rounded-full object-cover border-2 border-purple-400"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#E85D3B] flex items-center justify-center border-2 border-white shadow-md">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
              </button>
            </Link>
          </div>

          {/* Right side - Luck Wheel, Notifications, Logout */}
          <div className="flex items-center gap-2">
            {/* Luck Wheel Button */}
            <button
              onClick={() => setActiveTab("wheel")}
              className="relative group px-3 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                boxShadow: "0 4px 12px rgba(124, 58, 237, 0.4)",
              }}
            >
                <Sparkles className="h-4 w-4 text-white" />
                <span className="text-white text-xs font-bold tracking-wide">Spin</span>
              {/* Shine effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            
            {/* Functional Notification Bell */}
            <UserNotificationsBell userEmail={participantData.email ?? ""} />
            
            {/* Logout Button */}
            
          </div>
        </div>
      </header>

      <main className="px-3 sm:px-4 py-3 sm:py-4 pb-20 space-y-3 sm:space-y-5 bg-gradient-to-b from-white via-purple-50/30 to-slate-50">
        {activeTab === "dashboard" && (
          <>
            {/* Welcome Banner - Mobile Optimized */}
        <div className="bg-gradient-to-r from-purple-600/10 via-purple-500/5 to-transparent rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-center justify-between gap-2 border border-purple-200/40">
          <div className="flex-1 min-w-0">
            <p className="text-base sm:text-lg font-bold text-slate-800 truncate">Welcome back, {displayName}</p>
            <p className="text-xs sm:text-sm text-slate-600">Let's grow your network today</p>
          </div>
          <Link href="/participant/dashboard/profile">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#E85D3B] p-[2px] flex-shrink-0">
              <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-[#7c3aed] font-bold text-base sm:text-lg">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
          </Link>
        </div>

        <div
          className="relative py-6 px-4 sm:py-8 sm:px-5 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-purple-200/40"
          style={{
            background:
              "linear-gradient(135deg, rgba(124, 58, 237, 0.06) 0%, rgba(232, 93, 59, 0.04) 35%, rgba(16, 185, 129, 0.04) 100%)",
          }}
        >
          {/* Enhanced animated background with multiple orbs - Responsive */}
          <div className="absolute inset-0 overflow-hidden">
          {/* Top right purple orb */}
          <div className="absolute -top-8 -right-8 sm:-top-16 sm:-right-16 w-32 h-32 sm:w-56 sm:h-56 bg-gradient-to-br from-[#7c3aed]/15 via-purple-400/8 to-transparent rounded-full blur-2xl sm:blur-3xl" />
          
          {/* Bottom left orange orb */}
          <div
            className="absolute -bottom-8 -left-8 sm:-bottom-16 sm:-left-16 w-32 h-32 sm:w-56 sm:h-56 bg-gradient-to-br from-[#E85D3B]/15 via-orange-400/8 to-transparent rounded-full blur-2xl sm:blur-3xl"
          />
          
          {/* Middle emerald orb */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-48 sm:h-48 bg-gradient-to-br from-[#10b981]/12 via-emerald-400/6 to-transparent rounded-full blur-2xl sm:blur-3xl"
          />
            
            {/* Top left cyan accent */}
            <div
              className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-cyan-400/10 to-transparent rounded-full blur-2xl"
            />
            
            {/* Bottom right accent */}
            <div
              className="absolute bottom-10 right-10 w-32 h-32 bg-gradient-to-br from-purple-400/10 to-transparent rounded-full blur-2xl"
            />
            
            {/* Animated gradient lines */}
            <div className="absolute inset-0 opacity-20">
              <div
                className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400/50 to-transparent"
                style={{
                  animation: "shimmer 3s ease-in-out infinite",
                }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orange-400/50 to-transparent"
                style={{
                  animation: "shimmer 3s ease-in-out infinite",
                  animationDelay: "1.5s",
                }}
              />
            </div>
            
            {/* Subtle grid pattern overlay */}
            <div
              className="absolute inset-0 opacity-3"
              style={{
                backgroundImage: `linear-gradient(rgba(124, 58, 237, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 58, 237, 0.1) 1px, transparent 1px)`,
                backgroundSize: "20px 20px",
              }}
            />
          </div>

          <div className="relative space-y-2 sm:space-y-3">
            {/* Wallet Balance - Mobile Optimized */}
            <div className="text-center relative">
              {/* Top Up Button - Right Upper Side - Responsive */}
              <button
                onClick={() => setShowTopUpModal(true)}
                className="absolute -top-1 sm:-top-2 right-0 rounded-lg sm:rounded-xl font-bold text-white flex flex-col items-center gap-0.5 sm:gap-1 transition-all hover:scale-105 active:scale-95 shadow-lg text-[10px] sm:text-xs px-2 py-1 sm:px-3 sm:py-1.5"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                  boxShadow: "0 4px 12px rgba(124, 58, 237, 0.4)",
                }}
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-[8px] sm:text-[10px] font-bold tracking-wider">ADD FUND</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-1 sm:mb-2 font-semibold">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                <span className="text-xs sm:text-sm text-slate-600 uppercase tracking-wider font-bold">Wallet Balance</span>
              </div>
              <div className="text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-600 to-orange-600 bg-clip-text text-transparent">
                <AnimatedNumber value={walletBalance} prefix="$" gradient={false} decimals={2} />
              </div>
            </div>

            {/* Referral Earnings - Below Wallet Balance */}
            <div className="text-center relative">
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-1 sm:mb-2 font-semibold">
                <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                <span className="text-xs sm:text-sm text-slate-600 uppercase tracking-wider font-bold">Referral Earnings</span>
              </div>
              <div className="text-2xl sm:text-3xl md:text-4xl font-black text-emerald-600">
                <AnimatedNumber value={referralEarnings} prefix="$" gradient={false} decimals={2} />
            </div>

          </div>

          </div>
        </div>

        {/* Action Buttons - Side by Side with Professional 3D Effects */}
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(4px); opacity: 0.95; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes lift3d {
            0% { transform: translateY(0) perspective(1200px) rotateX(0deg) rotateY(0deg); }
            100% { transform: translateY(-8px) perspective(1200px) rotateX(4deg) rotateY(0deg); }
          }
          @keyframes shadowShift {
            0% { box-shadow: 0 12px 40px rgba(255, 100, 50, 0.3), 0 4px 12px rgba(150, 80, 200, 0.2), inset 0 1px 0 rgba(255,255,255,0.15); }
            100% { box-shadow: 0 24px 60px rgba(255, 100, 50, 0.5), 0 12px 30px rgba(150, 80, 200, 0.35), inset 0 1px 0 rgba(255,255,255,0.2); }
          }
          @keyframes shadowShiftGreen {
            0% { box-shadow: 0 12px 40px rgba(16, 185, 129, 0.3), 0 4px 12px rgba(52, 211, 153, 0.2), inset 0 1px 0 rgba(255,255,255,0.15); }
            100% { box-shadow: 0 24px 60px rgba(16, 185, 129, 0.5), 0 12px 30px rgba(52, 211, 153, 0.35), inset 0 1px 0 rgba(255,255,255,0.2); }
          }
          @keyframes iconBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
          .button-3d {
            animation: slideUp 0.4s ease-out;
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .button-3d:hover {
            animation: lift3d 0.4s ease-out forwards;
          }
          .button-3d-orange:hover {
            animation: lift3d 0.4s ease-out forwards, shadowShift 0.4s ease-out forwards;
          }
          .button-3d-green:hover {
            animation: lift3d 0.4s ease-out forwards, shadowShiftGreen 0.4s ease-out forwards;
          }
          .icon-animated {
            animation: iconBounce 2s ease-in-out infinite;
          }
          .button-3d:hover .icon-animated {
            animation: none;
            transform: scale(1.1);
          }
        `}</style>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Contribute Button - 3D Orange */}
          <Link href="/participant/dashboard/contribute">
            <button
              onClick={createRipple}
              className="button-3d button-3d-orange group w-full relative overflow-hidden active:scale-[0.96] rounded-2xl p-3 text-white"
              style={{
                background: "linear-gradient(90deg, rgba(255, 140, 80, 0.9) 0%, rgba(255, 100, 100, 0.7) 40%, rgba(150, 100, 200, 0.8) 100%)",
                boxShadow: "0 12px 40px rgba(255, 100, 50, 0.3), 0 4px 12px rgba(150, 80, 200, 0.2), inset 0 1px 0 rgba(255,255,255,0.15), -4px 8px 20px rgba(255, 100, 50, 0.15)",
                minHeight: "100px",
                transformStyle: "preserve-3d",
              }}
            >
              {/* Top highlight layer */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              
              <div className="relative z-10 flex items-center justify-between gap-3">
                {/* Left Icon */}
                <div className="flex-shrink-0">
                  <div className="icon-animated w-14 h-14 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center"
                    style={{
                      boxShadow: "0 6px 20px rgba(255, 100, 50, 0.4), inset 0 1px 0 rgba(255,255,255,0.3), inset -1px -1px 8px rgba(0,0,0,0.2)",
                      transition: "transform 0.3s ease"
                    }}>
                    <Send className="w-7 h-7 text-white" style={{filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))"}} />
                  </div>
                </div>

                {/* Center Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base tracking-wide text-white leading-none drop-shadow-lg">CONTRIBUTE</h3>
                  <p className="text-xs text-white/85 font-medium drop-shadow-md">Join Now</p>
                  <div className="mt-1 inline-flex items-center gap-1 bg-white/25 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] border border-white/20 shadow-lg">
                    <span className="text-white font-bold">+$50</span>
                  </div>
                </div>

                {/* Right Arrow Button */}
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-xl group-hover:shadow-2xl transition-all group-hover:scale-125 group-hover:bg-orange-100"
                  style={{boxShadow: "0 6px 20px rgba(255,255,255,0.6), inset 0 1px 0 rgba(255,255,255,0.8)"}}>
                  <ChevronRight className="w-5 h-5 text-orange-600 group-hover:text-orange-700 transition-colors" />
                </div>
              </div>
            </button>
          </Link>

          {/* Payout Button - 3D Green */}
          <Link href="/participant/dashboard/payout">
            <button
              onClick={createRipple}
              className="button-3d button-3d-green group w-full relative overflow-hidden active:scale-[0.96] rounded-2xl p-3 text-white"
              style={{
                background: "linear-gradient(90deg, rgba(16, 185, 129, 0.9) 0%, rgba(52, 211, 153, 0.7) 40%, rgba(5, 150, 100, 0.8) 100%)",
                boxShadow: "0 12px 40px rgba(16, 185, 129, 0.3), 0 4px 12px rgba(52, 211, 153, 0.2), inset 0 1px 0 rgba(255,255,255,0.15), -4px 8px 20px rgba(16, 185, 129, 0.15)",
                minHeight: "100px",
                transformStyle: "preserve-3d",
              }}
            >
              {/* Top highlight layer */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              
              <div className="relative z-10 flex items-center justify-between gap-3">
                {/* Left Icon */}
                <div className="flex-shrink-0">
                  <div className="icon-animated w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center"
                    style={{
                      boxShadow: "0 6px 20px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255,255,255,0.3), inset -1px -1px 8px rgba(0,0,0,0.2)",
                      transition: "transform 0.3s ease"
                    }}>
                    <ArrowUpRight className="w-7 h-7 text-white" style={{filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))"}} />
                  </div>
                </div>

                {/* Center Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base tracking-wide text-white leading-none drop-shadow-lg">PAYOUT</h3>
                  <p className="text-xs text-white/85 font-medium drop-shadow-md">Instant Claim</p>
                  <div className="mt-1 inline-flex items-center gap-1 bg-white/25 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] border border-white/20 shadow-lg">
                    <span className="text-white font-bold">Crypto</span>
                  </div>
                </div>

                {/* Right Arrow Button */}
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-xl group-hover:shadow-2xl transition-all group-hover:scale-125 group-hover:bg-emerald-100"
                  style={{boxShadow: "0 6px 20px rgba(255,255,255,0.6), inset 0 1px 0 rgba(255,255,255,0.8)"}}>
                  <ChevronRight className="w-5 h-5 text-emerald-600 group-hover:text-emerald-700 transition-colors" />
                </div>
              </div>
            </button>
          </Link>
        </div>

        {/* Staking Banner - New Feature */}
        <StakingBanner
          currentBalance={walletBalance}
          participantEmail={participantData?.email || ""}
          onBalanceUpdated={(newBalance) => {
            setParticipantData((prev: any) => ({
              ...prev,
              account_balance: newBalance,
            }))
          }}
        />

        {/* Lucky Spin Card - Mobile Optimized */}
        <button
          onClick={() => setActiveTab("wheel")}
          className="w-full text-left group"
        >
          <Card
            className="border-0 overflow-hidden relative transition-all hover:shadow-lg cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #fff5eb 0%, #fef3c7 100%)",
              boxShadow: "0 2px 10px rgba(249, 115, 22, 0.15)",
            }}
          >
            <CardContent className="p-2.5 sm:p-3 relative">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md flex-shrink-0">
                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base truncate">Lucky Spin</h3>
                    <p className="text-[10px] sm:text-xs text-slate-600">Only $5 per spin</p>
                  </div>
                </div>
                <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 cursor-pointer shadow-md text-[10px] sm:text-xs flex-shrink-0">
                  <span className="hidden xs:inline">Spin Now</span>
                  <span className="xs:hidden">Spin</span>
                  <ChevronRight className="h-3 w-3 ml-0.5 sm:ml-1" />
                </Badge>
              </div>
            </CardContent>
            </Card>
          </button>

          {/* Refer & Earn Card - Mobile Optimized */}
          <Link href="/participant/dashboard/refer" className="w-full block group">
            <Card
              className="border-0 overflow-hidden relative transition-all hover:shadow-lg cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                boxShadow: "0 2px 10px rgba(34, 197, 94, 0.15)",
              }}
            >
              <CardContent className="p-2.5 sm:p-3 md:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div
                      className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                        boxShadow: "0 2px 8px rgba(34, 197, 94, 0.3)",
                      }}
                    >
                      <Gift className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 text-sm sm:text-base truncate">Invite Friends & Earn Unlimited $5 Per Referral</h3>
                      <p className="text-[10px] sm:text-xs text-slate-600">Share your link & earn $5 per signup</p>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 cursor-pointer shadow-md text-[10px] sm:text-xs flex-shrink-0">
                    <span className="hidden xs:inline">Invite Now</span>
                    <span className="xs:hidden">Invite</span>
                    <ChevronRight className="h-3 w-3 ml-0.5 sm:ml-1" />
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Mystery Box Card - New Feature */}
          <MysteryBox
            currentBalance={walletBalance}
            participantEmail={participantData?.email || ""}
            onRewardWon={(amount) => {
              // Notify user of reward
              toast({
                title: "Mystery Box Reward!",
                description: `You won $${amount}!`,
              })
            }}
            onBalanceUpdated={(newBalance) => {
              // Update participant data with new balance
              setParticipantData((prev: any) => {
                const updated = { ...prev, account_balance: newBalance }
                localStorage.setItem("participantData", JSON.stringify(updated))
                return updated
              })
            }}
          />

        </>
        )}

        {/* Luck Wheel Tab Content */}
        {activeTab === "wheel" && (
          <DailySpinWheel 
            isOpen={true} 
            onClose={() => setActiveTab("dashboard")} 
            onWin={handleSpinWin} 
            userEmail={participantData?.email || ""} 
            currentBalance={walletBalance} 
            participantData={participantData} 
            setParticipantData={setParticipantData} 
          />
        )}

      {/* Activity Tab Content */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800">Activity History</h2>
          {/* Activity content would go here */}
        </div>
      )}

      {/* Leaderboard Tab Content */}
      {activeTab === "leaderboard" && (
        <div className="space-y-6 pb-20">
          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 blur-2xl opacity-30" />
              <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-xl">
                <Trophy className="h-10 w-10 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Global <span className="bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 bg-clip-text text-transparent">Leaderboard</span>
            </h2>
            <p className="text-sm text-slate-600">Top earners updated daily</p>
          </div>
          <LeaderboardView mode="compact" initialTab="contributors" />
        </div>
      )}
      
      {/* Notice Board - Display important announcements */}
      <NoticeBoard />
      
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-bottom">
        <nav className="flex items-center justify-around h-16 max-w-2xl mx-auto px-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center justify-center w-full h-full transition-all ${
              activeTab === "dashboard"
                ? "text-[#7c3aed]"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Home className={`h-6 w-6 mb-1 ${activeTab === "dashboard" ? "scale-110" : ""}`} />
            <span className="text-xs font-medium">Home</span>
          </button>
          
          <button
            onClick={() => setActiveTab("wheel")}
            className={`flex flex-col items-center justify-center w-full h-full transition-all ${
              activeTab === "wheel"
                ? "text-orange-500"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
              <Sparkles className={`h-6 w-6 mb-1 ${activeTab === "wheel" ? "scale-110" : ""}`} />
            <span className="text-xs font-medium">Luck Wheel</span>
          </button>
          
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex flex-col items-center justify-center w-full h-full transition-all ${
              activeTab === "activity"
                ? "text-amber-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Send className={`h-6 w-6 mb-1 ${activeTab === "activity" ? "scale-110" : ""}`} />
            <span className="text-xs font-medium">Contribute</span>
          </button>

          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex flex-col items-center justify-center w-full h-full transition-all ${
              activeTab === "leaderboard"
                ? "text-yellow-500"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
              <Trophy className={`h-6 w-6 mb-1 ${activeTab === "leaderboard" ? "scale-110" : ""}`} />
            <span className="text-xs font-medium">Leaderboard</span>
          </button>
        </nav>
      </footer>

      {/* Floating WhatsApp Support Button */}
      <a
        href="https://wa.me/995574450590"
        target="_blank"
        rel="noopener noreferrer"
        title="WhatsApp Support: +995 574 450 590"
        className="fixed bottom-40 right-6 z-50 h-14 w-14 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl hover:shadow-green-500/40 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 group"
      >
        <MessageCircle className="h-6 w-6 text-white" />
        {/* Tooltip */}
        <span className="absolute right-16 bg-slate-900 text-white text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
          <span className="block">WhatsApp Support</span>
          <span className="block text-green-400">+995 574 450 590</span>
        </span>
      </a>

      {/* Floating AI Chat Button */}
      <Button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 hover:from-purple-700 hover:via-pink-600 hover:to-cyan-600 border-0 z-50 transition-all hover:scale-110 active:scale-95 animate-float"
        size="icon"
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </Button>

      {/* AI Chat Dialog */}
      <AIChatbotDialog open={isChatOpen} onOpenChange={setIsChatOpen} />
    </div>
  )
}
