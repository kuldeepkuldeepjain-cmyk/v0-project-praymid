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
import { isParticipantAuthenticated } from "@/lib/auth"
import type { UserRank } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"

import { TopUpModal } from "@/components/topup-modal"
import { AIChatbotDialog } from "@/components/ai-chatbot-dialog"
import { MessageCircle } from "lucide-react"
import { LeaderboardView } from "@/components/leaderboard-view"
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
            <Link href="/participant/dashboard/settings/help" className="block">
              <Button className="w-full h-12 bg-[#7c3aed] hover:bg-[#6d28d9] btn-premium">
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </Link>
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
              <span className="text-slate-700">Invite 4 Friends, Get $20</span>
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
  { label: "$10", value: 10, color: "#eab308", darkColor: "#ca8a04", icon: "💎", type: "cash", probability: 1 },           // Index 0: TOP
  { label: "BETTER LUCK", value: 0, color: "#f5f5f5", darkColor: "#e5e5e5", icon: "🍀", type: "luck", textColor: "#64748b", probability: 1 }, // Index 1
  { label: "$4", value: 4, color: "#3b82f6", darkColor: "#2563eb", icon: "🎟️", type: "cash", probability: 1 },           // Index 2
  { label: "$1", value: 1, color: "#f97316", darkColor: "#ea580c", icon: "💵", type: "cash", probability: 1 },           // Index 3
  { label: "$50", value: 50, color: "#14b8a6", darkColor: "#0d9488", icon: "💰", type: "cash", probability: 0 },         // Index 4: JACKPOT (0% chance)
  { label: "$5", value: 5, color: "#ef4444", darkColor: "#dc2626", icon: "💰", type: "cash", probability: 1 },           // Index 5
  { label: "TRY AGAIN", value: 0, color: "#8b5cf6", darkColor: "#7c3aed", icon: "🔄", type: "luck", probability: 1 },   // Index 6
  { label: "$2", value: 2, color: "#10b981", darkColor: "#059669", icon: "💸", type: "cash", probability: 1 },           // Index 7
  { label: "$100", value: 100, color: "#f59e0b", darkColor: "#d97706", icon: "💎", type: "cash", probability: 0 },       // Index 8: MEGA JACKPOT (0% chance)
  { label: "$3", value: 3, color: "#ec4899", darkColor: "#db2777", icon: "🎁", type: "cash", probability: 1 },           // Index 9
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
  onWin: (amount: number, label: string, type: string) => void
  userEmail: string
  currentBalance: number
  participantData: any
  setParticipantData: (data: any) => void
}) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<{ label: string; value: number; icon: string; type: string } | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [canSpin, setCanSpin] = useState(true)
  const [streakDays, setStreakDays] = useState(0)
  const { toast } = useToast()
  const SPIN_COST = 5

  const spinWheel = async () => {
    if (isSpinning) return
    
    // Check if user has enough balance
    if (currentBalance < SPIN_COST) {
      toast({
        title: "Insufficient Balance",
        description: "You need $" + SPIN_COST + " to spin the wheel. Please top up your wallet.",
        variant: "destructive",
      })
      return
    }

    setIsSpinning(true)
    setShowResult(false)
    setResult(null)
    
    // IMPORTANT: Reset wheel to 0° before each spin to ensure full animation
    // This prevents the wheel from just slowly rotating between close angles
    setRotation(0)
    
  // Store original balance before deduction
  const originalBalance = participantData?.account_balance || 0
  
  // Deduct $5 from wallet immediately
  const balanceAfterDeduction = originalBalance - SPIN_COST
  setParticipantData({ ...participantData, account_balance: balanceAfterDeduction })
  localStorage.setItem("participantData", JSON.stringify({ ...participantData, account_balance: balanceAfterDeduction }))
    
    // Update database with deduction
    try {
      const supabase = createClient()
      await supabase
        .from("participants")
        .update({ account_balance: balanceAfterDeduction })
        .eq("email", userEmail)
    } catch (error) {
      console.error("[v0] Error updating wallet after deduction:", error)
    }

  // Pick random segment FIRST - only from segments with probability > 0
  const eligibleSegments = SPIN_SEGMENTS.map((seg, idx) => ({ seg, idx })).filter(item => item.seg.probability > 0)
  const randomEligible = eligibleSegments[Math.floor(Math.random() * eligibleSegments.length)]
  const segmentIndex = randomEligible.idx
  const wonSegment = SPIN_SEGMENTS[segmentIndex]
  
  const segmentAngle = 360 / SPIN_SEGMENTS.length // 36° for 10 segments
    const spins = 5 + Math.floor(Math.random() * 3) // 5-7 full rotations for excitement
    
    // FINAL SOLUTION: Calculate rotation based on pointer position
    // The pointer is at TOP. After wheel rotates, which segment is under the pointer?
    // 
    // In the SVG, segments are positioned at angles (measured from -90° at top):
    // Segment i is at angle: (i * 45) degrees from TOP, going CLOCKWISE
    // - Segment 0: 0° from top (AT top)
    // - Segment 1: 45° from top (clockwise)
    // - Segment 2: 90° from top (at right)
    // - Segment 3: 135° from top
    // - Segment 4: 180° from top (at bottom)
    // 
    // When we apply CSS rotate(R), the wheel rotates clockwise by R degrees
    // Pointer stays at top, but segments move
    // To determine which segment ends under pointer after rotation R:
    // The segment that was R degrees COUNTER-CLOCKWISE from top is now at top
    // That's segment at position (-R) from top
    // So segment (-R / 45) ends up at top
    // 
    // To get segment i at top: -R / 45 = i, so R = -i * 45
    // Convert to positive: R = 360 - (i * 45) = (8 - i) * 45
    
    const rotationForSegment = (SPIN_SEGMENTS.length - segmentIndex) * segmentAngle
    const finalRotation = spins * 360 + rotationForSegment
    
    console.log("[v0] Want segment:", segmentIndex, wonSegment.label, "| Rotation offset:", rotationForSegment, "| Total:", finalRotation)

    // Wait a tiny bit for state to update, then apply the rotation
    setTimeout(() => {
      setRotation(finalRotation)
    }, 50)

    // After spin completes (3 seconds)
    setTimeout(async () => {
      setIsSpinning(false)
      const won = SPIN_SEGMENTS[segmentIndex]
      setResult(won)
      setShowResult(true)

      console.log("[v0] Spin result:", won)

      // Handle different prize types
      if (won.type === "ticket") {
        // Create free ticket coupon in database
        try {
          const supabase = createClient()
          const expiresAt = new Date()
          expiresAt.setHours(expiresAt.getHours() + 24)
          
          await supabase.from("spin_coupons").insert({
            user_email: userEmail,
            coupon_type: "free_bet",
            amount: 5,
            expires_at: expiresAt.toISOString(),
            is_used: false,
          })
          
          toast({
            title: "Free Ticket Won!",
            description: "You can use this $5 free bet in predictions within 24 hours!",
          })
        } catch (error) {
          console.error("[v0] Error creating coupon:", error)
        }
      } else if (won.type === "cash" && won.value > 0) {
        // Credit cash winnings to wallet (add to balance AFTER deduction)
        const finalBalance = balanceAfterDeduction + won.value
        setParticipantData({ ...participantData, account_balance: finalBalance })
        localStorage.setItem("participantData", JSON.stringify({ ...participantData, account_balance: finalBalance }))
        
        // Update database with winnings
        try {
          const supabase = createClient()
          await supabase
            .from("participants")
            .update({ account_balance: finalBalance })
            .eq("email", userEmail)
          
          console.log("[v0] Wallet updated - Deducted: $5, Won: $" + won.value + ", Final Balance: $" + finalBalance)
        } catch (error) {
          console.error("[v0] Error updating wallet with winnings:", error)
        }
        
        toast({
          title: won.value >= 10 ? "Jackpot!" : "Congratulations!",
          description: `You won $${won.value}! It has been added to your wallet.`,
        })
      } else if (won.type === "luck") {
        // No credit for luck segments
        toast({
          title: "Better Luck Next Time!",
          description: "Try spinning again for a chance to win!",
        })
      }
      
      // Trigger balance refresh
      onWin(won.value, won.label, won.type)
    }, 3000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fce7f3 30%, #e0e7ff 60%, #f0fdf4 100%)' }}>
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
      
      {/* Floating Background Decorations - Hidden on mobile for performance */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden md:block">
        <div className="absolute top-5 left-5 w-64 h-64 bg-orange-300/40 rounded-full blur-3xl" style={{ animation: 'float 4s ease-in-out infinite', willChange: 'transform' }} />
        <div className="absolute top-20 right-10 w-52 h-52 bg-pink-300/35 rounded-full blur-3xl" style={{ animation: 'float-reverse 5s ease-in-out infinite', willChange: 'transform' }} />
        <div className="absolute bottom-32 left-10 w-72 h-72 bg-purple-300/30 rounded-full blur-3xl" style={{ animation: 'float 6s ease-in-out infinite', animationDelay: '1s', willChange: 'transform' }} />
        <div className="absolute bottom-10 right-5 w-56 h-56 bg-emerald-300/30 rounded-full blur-3xl" style={{ animation: 'float-reverse 4.5s ease-in-out infinite', animationDelay: '0.5s', willChange: 'transform' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-200/25 rounded-full blur-3xl" />
      </div>

      {/* Header - Mobile Optimized */}
      <div className="relative z-10 flex items-center justify-between p-3 sm:p-5 border-b border-slate-200 bg-white/80 backdrop-blur-md">
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
            <h2 className="text-lg sm:text-2xl font-black bg-gradient-to-r from-[#e85d3b] via-[#f59e0b] to-[#fbbf24] bg-clip-text text-transparent">LUCK WHEEL</h2>
            <p className="text-[10px] sm:text-xs text-slate-600 font-semibold tracking-wide truncate">Spin to win amazing rewards!</p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 transition-colors flex-shrink-0"
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />
        </button>
      </div>

      {/* Content Container with Gradient Background - Mobile Optimized */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-3 sm:px-4 py-4 sm:py-6 overflow-y-auto">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-orange-50 to-pink-50 opacity-60" 
          style={{
            backgroundSize: '400% 400%',
            animation: 'gradient-shift 15s ease infinite'
          }}
        />
        
        {/* Compact Layout with Wheel and Actions - Responsive */}
        <div className="relative w-full max-w-4xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-4 sm:gap-8">
            
            {/* Wheel Section with Glow Effect */}
            <div className="relative">
          {/* Glowing Ring Behind Wheel */}
          <div className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(249, 115, 22, 0.3) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
          />
              
              {/* Enhanced Triangle Pointer with Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-5 z-30 animate-bounce">
                <div 
                  className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[36px] border-l-transparent border-r-transparent"
                  style={{
                    borderTopColor: '#f97316',
                    filter: 'drop-shadow(0 4px 12px rgba(249, 115, 22, 0.8)) drop-shadow(0 0 20px rgba(249, 115, 22, 0.4))',
                  }}
                />
          {/* Golden circle under pointer */}
          <div
            className="absolute top-[34px] left-1/2 -translate-x-1/2 w-6 h-6 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              boxShadow: '0 0 20px rgba(251, 191, 36, 0.8)',
              filter: 'blur(2px)'
            }}
          />
              </div>

              {/* Wheel with SVG segments - Mobile Optimized */}
              <div
                className="relative w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-96 lg:h-96"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning ? "transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
                  filter: isSpinning 
                    ? 'drop-shadow(0 20px 50px rgba(249, 115, 22, 0.4)) blur(0.5px)' 
                    : 'drop-shadow(0 20px 50px rgba(0,0,0,0.2))',
                }}
              >
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Golden outer ring */}
              <defs>
                <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
                <linearGradient id="centerGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <filter id="segmentShadow">
                  <feDropShadow dx="0" dy="0.5" stdDeviation="0.3" floodOpacity="0.3"/>
                </filter>
              </defs>
              
              {/* Outer golden ring */}
              <circle cx="50" cy="50" r="49" fill="url(#goldRing)" />
              <circle cx="50" cy="50" r="46" fill="white" />
              
              {/* Wheel segments - 8 segments from SPIN_SEGMENTS */}
              {SPIN_SEGMENTS.map((segment, i) => {
                const angle = 360 / SPIN_SEGMENTS.length
                const startAngle = i * angle - 90 - angle / 2
                const endAngle = startAngle + angle
                const startRad = (startAngle * Math.PI) / 180
                const endRad = (endAngle * Math.PI) / 180
                const x1 = 50 + 44 * Math.cos(startRad)
                const y1 = 50 + 44 * Math.sin(startRad)
                const x2 = 50 + 44 * Math.cos(endRad)
                const y2 = 50 + 44 * Math.sin(endRad)
                const midAngle = startAngle + angle / 2
                const midRad = (midAngle * Math.PI) / 180
                const textX = 50 + 30 * Math.cos(midRad)
                const textY = 50 + 30 * Math.sin(midRad)

                return (
                  <g key={i}>
                    <path
                      d={`M 50 50 L ${x1} ${y1} A 44 44 0 0 1 ${x2} ${y2} Z`}
                      fill={segment.color}
                      stroke="rgba(255,255,255,0.5)"
                      strokeWidth="0.5"
                      filter="url(#segmentShadow)"
                    />
                    <text
                      x={textX}
                      y={textY}
                      fill={segment.textColor || "#ffffff"}
                      fontSize="6"
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                      style={{ textShadow: segment.textColor === "#64748b" ? "0 1px 3px rgba(0,0,0,0.2)" : "0 2px 6px rgba(0,0,0,0.6)", letterSpacing: "0.5px" }}
                    >
                      {segment.type === 'cash' ? `$${segment.value}` : segment.icon}
                    </text>
                  </g>
                )
              })}
              
              {/* Center golden circle */}
              <circle cx="50" cy="50" r="12" fill="url(#centerGold)" stroke="#f59e0b" strokeWidth="2" />
              <circle cx="50" cy="50" r="9" fill="#fbbf24" />
              {/* Star in center */}
              <text x="50" y="51" fontSize="10" textAnchor="middle" dominantBaseline="middle" fill="#f97316">★</text>
            </svg>
          </div>
        </div>
        
        {/* Action Section - Enhanced */}
        <div className="space-y-4 w-full max-w-sm relative">
          {/* Wallet Balance Display - New */}
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

          {/* Spin Cost Info - Enhanced with Animation */}
          <div 
            className="relative rounded-2xl p-4 overflow-hidden border-2 border-amber-400 transform hover:scale-105 transition-transform"
            style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fbbf24 100%)',
              boxShadow: '0 4px 20px rgba(251, 191, 36, 0.3), inset 0 2px 10px rgba(255,255,255,0.5)'
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
                <Sparkles className="h-5 w-5 text-orange-600" />
                <p className="text-slate-800 text-base font-black">
                  Spin Cost: <span className="text-orange-600 text-2xl">${SPIN_COST}</span>
                </p>
                <Sparkles className="h-5 w-5 text-orange-600" />
            </div>
          </div>

          {/* Spin Button - Enhanced with Better Effects */}
          <button
            onClick={spinWheel}
            disabled={isSpinning || currentBalance < SPIN_COST}
            className="w-full h-16 text-lg font-black rounded-2xl transition-all disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden transform hover:scale-105 active:scale-95"
            style={{
              background: !isSpinning && currentBalance >= SPIN_COST
                ? 'linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fbbf24 100%)' 
                : 'linear-gradient(135deg, #94a3b8, #cbd5e1)',
              boxShadow: !isSpinning && currentBalance >= SPIN_COST
                ? '0 6px 0 #ea580c, 0 12px 30px rgba(249, 115, 22, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)' 
                : '0 3px 0 #64748b',
              color: 'white',
              textShadow: '0 2px 4px rgba(0,0,0,0.4)',
              border: !isSpinning && currentBalance >= SPIN_COST ? '2px solid rgba(255,255,255,0.3)' : 'none'
            }}
          >
            {!isSpinning && currentBalance >= SPIN_COST && (
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
              ) : currentBalance < SPIN_COST ? (
              <>
                <AlertCircle className="h-6 w-6" />
                <span className="font-black text-lg">NEED ${SPIN_COST}</span>
              </>
              ) : (
                <>
                  <Sparkles className="h-6 w-6 animate-bounce" />
                  <span className="font-black text-xl tracking-wider">SPIN NOW!</span>
                  <Sparkles className="h-6 w-6 animate-bounce" style={{ animationDelay: '0.2s' }} />
                </>
              )}
            </span>
          </button>
        </div>
          </div>
        </div>
      </div>
      
      {/* Result Popup Modal - Enhanced with Better Animations */}
      {showResult && result && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-black/70 via-purple-900/20 to-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowResult(false)}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl transform"
            style={{
              animation: 'bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Confetti Effect for Wins */}
            {result.type === 'cash' && result.value > 0 && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: '-10px',
                      background: ['#fbbf24', '#f59e0b', '#f97316', '#ec4899', '#8b5cf6'][i % 5],
                      animation: `confetti-fall ${1 + Math.random()}s ease-out forwards`,
                      animationDelay: `${Math.random() * 0.5}s`
                    }}
                  />
                ))}
              </div>
            )}
            
            <div 
              className="relative w-full rounded-2xl p-10 text-center overflow-hidden"
              style={{
                background: result.type === 'cash' && result.value > 0
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)' 
                  : result.type === 'ticket'
                  ? 'linear-gradient(135deg, #e85d3b 0%, #f59e0b 50%, #fbbf24 100%)'
                  : 'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #4f46e5 100%)',
                boxShadow: 'inset 0 2px 30px rgba(255,255,255,0.3), 0 10px 40px rgba(0,0,0,0.3)',
              }}
            >
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                  animation: 'float 3s ease-in-out infinite'
                }}
              />
              
              {/* Glowing Ring */}
              <div className="absolute inset-0 rounded-2xl"
                style={{
                  boxShadow: result.type === 'cash' && result.value > 0 
                    ? 'inset 0 0 60px rgba(16, 185, 129, 0.5)' 
                    : 'inset 0 0 60px rgba(124, 58, 237, 0.5)',
                  animation: 'pulse 2s ease-in-out infinite'
                }}
              />
              
              <div className="relative z-10">
                <div className="text-7xl mb-6 animate-bounce" 
                  style={{ 
                    filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.3))',
                    animation: 'bounce 1s ease-in-out infinite'
                  }}
                >
                  {result.icon}
                </div>
                <h3 className="text-white font-black text-3xl mb-3 tracking-wide" 
                  style={{ 
                    textShadow: '0 3px 10px rgba(0,0,0,0.5), 0 0 30px rgba(255,255,255,0.3)',
                    animation: 'text-glow 2s ease-in-out infinite'
                  }}
                >
                  {result.type === 'cash' && result.value > 0 
                    ? result.value >= 10 
                      ? `🎊 JACKPOT! YOU WON $${result.value}! 🎊`
                      : `🎉 AWESOME! YOU WON $${result.value}! 🎉`
                    : result.type === 'ticket' 
                    ? '🎟️ FREE TICKET WON! 🎟️' 
                    : '🍀 BETTER LUCK NEXT TIME! 🍀'}
                </h3>
                {result.type === 'cash' && result.value > 0 && (
                  <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/30">
                    <p className="text-white text-base font-bold">
                      💰 ${result.value} has been added to your wallet!
                    </p>
                  </div>
                )}
                {result.type === 'ticket' && (
                  <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/30">
                    <p className="text-white/95 text-sm font-semibold">
                      ⏰ Use your $5 free bet within 24 hours!
                    </p>
                  </div>
                )}
                {result.type === 'luck' && (
                  <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/30">
                    <p className="text-white/95 text-sm font-semibold">
                      Try spinning again for another chance to win!
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={() => setShowResult(false)}
              className="w-full mt-6 py-4 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 rounded-2xl font-black text-slate-800 transition-all text-lg shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            >
              AWESOME! 🎊
            </button>
          </div>
        </div>
      )}
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
  const [activeTab, setActiveTab] = useState<"dashboard" | "wheel" | "activity">("dashboard")
  const [participantData, setParticipantData] = useState<{
    wallet: string
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
    activation_deadline?: string
    account_frozen?: boolean
  } | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [showFrozenModal, setShowFrozenModal] = useState(false)
  const [hasContributed, setHasContributed] = useState(false)
  const [participantId, setParticipantId] = useState<string>("")
  const [showTopUpModal, setShowTopUpModal] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [queuePosition, setQueuePosition] = useState(47)
  const [queueData, setQueueData] = useState<any>(null)
  
  const isAuthenticated = isParticipantAuthenticated()

  const checkProfileCompletion = async (email: string) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("participants")
        .select("details_completed")
        .eq("email", email)
        .single()

      if (error) {
        console.error("[v0] Error checking profile completion:", error)
        return
      }

      // If profile is not completed, redirect to complete profile page
      if (!data?.details_completed) {
        router.push("/participant/complete-profile")
        return
      }
    } catch (error) {
      console.error("[v0] Error in checkProfileCompletion:", error)
    }
  }

  const handleTimerExpire = useCallback(async () => {
    if (!participantData?.email) return

    try {
      const supabase = createClient()
      await supabase
        .from("participants")
        .update({ account_frozen: true, status: "frozen" })
        .eq("email", participantData.email)

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

  const handleSpinWin = (amount: number, label: string, type: string) => {
    // NOTE: Wallet transactions are now handled entirely within the SpinWheelModal component
    // This callback is kept for compatibility but no longer updates the wallet to prevent double-crediting
    // The spin wheel already: 1) Deducts $5, 2) Adds winnings, 3) Updates database
    console.log("[v0] Spin complete - amount:", amount, "label:", label, "type:", type)
  }

  // Function to fetch queue position
  const fetchQueuePosition = async (email: string) => {
    try {
      const response = await fetch(`/api/participant/queue-position?email=${encodeURIComponent(email)}`)
      const data = await response.json()
      
      if (data.success) {
        setQueuePosition(data.position)
        setQueueData(data)
        console.log("[v0] Queue position:", data.position, "Days elapsed:", data.daysElapsed)
      }
    } catch (error) {
      console.error("[v0] Error fetching queue position:", error)
    }
  }

  // Function to fetch fresh participant data from database
  const refreshParticipantData = async (email: string) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("participants")
        .select("*")
        .eq("email", email)
        .single()

      if (!error && data) {
        const updatedData = {
          ...data,
          participantId: data.id,
          walletAddress: data.wallet_address,
        }
        setParticipantData(updatedData)
        localStorage.setItem("participantData", JSON.stringify(updatedData))
        console.log("[v0] Refreshed participant data from database")
      }
    } catch (error) {
      console.error("[v0] Error refreshing participant data:", error)
    }
  }

  useEffect(() => {
    setMounted(true)

    if (!isAuthenticated) {
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
      } catch (error) {
        console.error("Error parsing participant data:", error)
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
        } catch (error) {
          console.error("[v0] Error in periodic refresh:", error)
        }
      }
    }, 60000) // Refresh every 60 seconds to reduce load

    return () => clearInterval(refreshInterval)
  }, [router, isAuthenticated])

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
  const walletBalance = participantData.account_balance || 0
  const bonusBalance = participantData.bonus_balance ?? participantData.referral_earnings ?? 0
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

      <header className="bg-white sticky top-0 z-40 border-b border-slate-100 h-14 shadow-sm">
        <div className="px-4 h-full flex items-center justify-between">
          {/* Left side - Profile Avatar */}
          <div className="flex items-center gap-2">
            <Link href="/participant/dashboard/profile">
              <button className="relative transition-transform hover:scale-105">
                {participantData?.profile_image ? (
                  <img
                    src={participantData.profile_image || "/placeholder.svg"}
                    alt="Profile"
                    className="h-9 w-9 rounded-full object-cover border-2 border-purple-500"
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
                background: "linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fbbf24 100%)",
                boxShadow: "0 2px 8px rgba(249, 115, 22, 0.3)",
              }}
            >
                <Sparkles className="h-4 w-4 text-white" />
                <span className="text-white text-xs font-bold tracking-wide">Luck Wheel</span>
              {/* Shine effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            
            {/* Functional Notification Bell */}
            <UserNotificationsBell userEmail={participantData.email} />
            
            {/* Logout Button */}
            
          </div>
        </div>
      </header>

      <main className="px-3 sm:px-4 py-3 sm:py-4 pb-20 space-y-3 sm:space-y-5">
        {activeTab === "dashboard" && (
          <>
            {/* Welcome Banner - Mobile Optimized */}
        <div className="bg-gradient-to-r from-purple-50 to-transparent rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-base sm:text-lg font-bold text-slate-800 truncate">Welcome back, {displayName}</p>
            <p className="text-xs sm:text-sm text-slate-500">Let's grow your network today</p>
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
          className="relative py-6 px-4 sm:py-8 sm:px-5 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/20"
          style={{
            background:
              "linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(232, 93, 59, 0.08) 35%, rgba(34, 211, 238, 0.08) 70%, rgba(16, 185, 129, 0.06) 100%)",
          }}
        >
          {/* Enhanced animated background with multiple orbs - Responsive */}
          <div className="absolute inset-0 overflow-hidden">
          {/* Top right purple orb */}
          <div className="absolute -top-8 -right-8 sm:-top-16 sm:-right-16 w-32 h-32 sm:w-56 sm:h-56 bg-gradient-to-br from-[#7c3aed]/20 via-purple-400/10 to-transparent rounded-full blur-2xl sm:blur-3xl" />
          
          {/* Bottom left orange orb */}
          <div
            className="absolute -bottom-8 -left-8 sm:-bottom-16 sm:-left-16 w-32 h-32 sm:w-56 sm:h-56 bg-gradient-to-br from-[#E85D3B]/20 via-orange-400/10 to-transparent rounded-full blur-2xl sm:blur-3xl"
          />
          
          {/* Middle cyan orb */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-48 sm:h-48 bg-gradient-to-br from-[#22d3ee]/15 via-cyan-400/8 to-transparent rounded-full blur-2xl sm:blur-3xl"
          />
            
            {/* Top left emerald accent */}
            <div
              className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-emerald-400/15 to-transparent rounded-full blur-2xl"
            />
            
            {/* Bottom right pink accent */}
            <div
              className="absolute bottom-10 right-10 w-32 h-32 bg-gradient-to-br from-pink-400/15 to-transparent rounded-full blur-2xl"
            />
            
            {/* Animated gradient lines */}
            <div className="absolute inset-0 opacity-30">
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
              className="absolute inset-0 opacity-5"
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
                  background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                  boxShadow: "0 4px 12px rgba(124, 58, 237, 0.4)",
                }}
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-[8px] sm:text-[10px] font-bold tracking-wider">ADD FUND</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-1 sm:mb-2 font-semibold">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-slate-800" />
                <span className="text-xs sm:text-sm text-slate-500 uppercase tracking-wider font-bold">Wallet Balance</span>
              </div>
              <div className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900">
                <AnimatedNumber value={walletBalance} prefix="$" gradient={false} decimals={2} />
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              <span className="text-slate-400 text-xs">+</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            </div>

            {/* Bonus Balance */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-[#22d3ee]" />
                <span className="text-sm text-slate-500 uppercase tracking-wider font-bold">Bonus Balance</span>
                
              </div>
              <div className="text-3xl font-bold text-slate-800">
                <AnimatedNumber value={bonusBalance} prefix="$" decimals={2} />
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              <span className="text-slate-400 text-xs">+</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            </div>

            {/* Referral Earnings */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Gift className="h-5 w-5 text-[#E85D3B]" />
                <span className="text-sm text-slate-500 uppercase tracking-wider font-bold">Referral Earnings</span>
              </div>
              <div className="text-3xl font-bold text-slate-800">
                <AnimatedNumber value={referralEarnings} prefix="$" decimals={2} />
              </div>
            </div>


          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link href="/participant/dashboard/contribute">
            <button
              onClick={createRipple}
              className="group w-full h-28 text-white flex flex-col items-center justify-center gap-2 relative overflow-hidden transition-all duration-300 active:scale-[0.97] leading-7 rounded-3xl"
              style={{
                background: "linear-gradient(145deg, #E85D3B 0%, #ff6b45 50%, #E85D3B 100%)",
                boxShadow:
                  "0 8px 32px rgba(232, 93, 59, 0.4), 0 4px 8px rgba(232, 93, 59, 0.3), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -2px 0 rgba(0,0,0,0.1)",
              }}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {/* Icon with animation */}
              <Send
                className="transition-transform group-hover:scale-110 group-hover:-rotate-12 w-9 h-9"
                style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}
              />
              <span className="font-bold text-lg tracking-wide leading-6" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
                CONTRIBUTE
              </span>
              <span className="text-xs text-white/80">Join $100</span>
            </button>
          </Link>
          <Link href="/participant/dashboard/payout">
            <button
              onClick={createRipple}
              className="group w-full h-28 text-white flex flex-col items-center justify-center gap-2 relative overflow-hidden transition-all duration-300 active:scale-[0.97] rounded-4xl"
              style={{
                background: "linear-gradient(145deg, #10b981 0%, #34d399 50%, #10b981 100%)",
                boxShadow:
                  "0 8px 32px rgba(16, 185, 129, 0.4), 0 4px 8px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -2px 0 rgba(0,0,0,0.1)",
              }}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {/* Icon with animation */}
              <ArrowUpRight
                className="h-10 w-10 transition-transform group-hover:scale-110 group-hover:translate-x-1 group-hover:-translate-y-1"
                style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}
              />
              <span className="font-bold text-lg tracking-wide leading-6" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
                PAYOUT
              </span>
              <span className="text-xs text-white/80">Claim Funds</span>
            </button>
          </Link>
        </div>

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
                      <h3 className="font-bold text-slate-800 text-sm sm:text-base truncate">Invite 4 Friends, Get $20</h3>
                      <p className="text-[10px] sm:text-xs text-slate-600">Share your link & earn instantly</p>
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

          <Card
            className="border-0 overflow-hidden relative"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(250,245,255,0.9) 100%)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 4px 20px rgba(124, 58, 237, 0.08), 0 0 0 1px rgba(124, 58, 237, 0.05)",
            }}
          >
            <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#7c3aed]" /> Recent Activity
              </h3>
              <Link href="/participant/dashboard/activity">
                
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-purple-50/50 transition-colors">
                <div className="w-2 h-2 rounded-full bg-[#7c3aed] mt-2" />
                <div className="flex-1">
                  <p className="text-sm text-slate-700">Joined queue at position #47</p>
                  <p className="text-xs text-slate-400">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-orange-50/50 transition-colors">
                <div className="w-2 h-2 rounded-full bg-[#E85D3B] mt-2" />
                <div className="flex-1">
                  <p className="text-sm text-slate-700">Contribution deadline active</p>
                  <p className="text-xs text-slate-400">11h 17m remaining</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50/50 transition-colors">
                <div className="w-2 h-2 rounded-full bg-slate-300 mt-2" />
                <div className="flex-1">
                  <p className="text-sm text-slate-700">Account created</p>
                  <p className="text-xs text-slate-400">3 days ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
                ? "text-[#E85D3B]"
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
