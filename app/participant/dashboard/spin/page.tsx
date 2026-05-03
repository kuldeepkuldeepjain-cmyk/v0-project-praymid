"use client"

import Link from "next/link"
import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Sparkles, Trophy, TrendingUp, Volume2, VolumeX, Wallet, Info, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { isParticipantAuthenticated } from "@/lib/auth"


interface Winner {
  email: string
  amount: number
  description: string
  timestamp: string
}

interface SpinResult {
  success: boolean
  prize: {
    label: string
    amount: number
    segmentIndex: number
  }
  balanceBefore: number
  balanceAfter: number
  error?: string
}

// Wheel configuration - 8 segments
const WHEEL_SEGMENTS = [
  { label: "$2",     color: "#3B82F6", gradientEnd: "#2563EB", amount: 2  },
  { label: "$1",     color: "#F5F5F5", gradientEnd: "#E5E5E5", amount: 1  },
  { label: "$5",     color: "#FBBF24", gradientEnd: "#F59E0B", amount: 5  },
  { label: "Oops!",  color: "#EF4444", gradientEnd: "#DC2626", amount: 0  },
  { label: "$3",     color: "#8B5CF6", gradientEnd: "#7C3AED", amount: 3  },
  { label: "$10",    color: "#10B981", gradientEnd: "#059669", amount: 10 },
  { label: "Refer",  color: "#EC4899", gradientEnd: "#DB2777", amount: 10 },
  { label: "JACKPOT",color: "#F97316", gradientEnd: "#EA580C", amount: 50 },
]

const SPIN_COST = 5

export default function SpinWheelPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)

  // Separate participant data from winners to avoid re-rendering the wheel
  const [balance, setBalance]           = useState(0)
  const [availableSpins, setAvailableSpins] = useState(0)
  const [participantEmail, setParticipantEmail] = useState("")
  const [isActive, setIsActive]         = useState(false)

  const [isSpinning, setIsSpinning]     = useState(false)
  const [lastWinners, setLastWinners]   = useState<Winner[]>([])
  const [showWinModal, setShowWinModal] = useState(false)
  const [winResult, setWinResult]       = useState<SpinResult | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Use a ref for the wheel element so rotation never causes React re-render
  const wheelRef = useRef<HTMLDivElement>(null)
  const currentRotation = useRef(0)
  const winnersIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setMounted(true)
    const email = isParticipantAuthenticated()
    if (!email) {
      router.push("/participant/login")
      return
    }
    loadParticipantData()
    loadLastWinners()

    winnersIntervalRef.current = setInterval(loadLastWinners, 15000)
    return () => {
      if (winnersIntervalRef.current) clearInterval(winnersIntervalRef.current)
    }
  }, [router])

  const loadParticipantData = useCallback(async () => {
    try {
      const storedData = localStorage.getItem("participantData")
      if (!storedData) {
        router.push("/participant/login")
        return
      }
      const parsed = JSON.parse(storedData)

      const res = await fetch(`/api/participant/me?email=${encodeURIComponent(parsed.email)}`)
      const json = await res.json()

      if (!json.success) {
        // Fallback to cached
        setParticipantEmail(parsed.email || "")
        setBalance(parsed.account_balance || 0)
        setAvailableSpins(parsed.available_spins || 0)
        setIsActive(parsed.is_active || false)
        return
      }

      const data = json.participant
      setParticipantEmail(data.email)
      setBalance(Number(data.account_balance) ?? 0)
      setAvailableSpins(parsed.available_spins || 0) // available_spins from cache
      setIsActive(data.is_active ?? false)
      localStorage.setItem("participantData", JSON.stringify({ ...parsed, ...data }))
    } catch (error) {
      console.error("Error in loadParticipantData:", error)
    }
  }, [router])

  const loadLastWinners = useCallback(async () => {
    try {
      const response = await fetch("/api/participant/spin", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
      if (!response.ok) return
      const data = await response.json()
      if (data.winners && Array.isArray(data.winners)) {
        setLastWinners(data.winners)
      }
    } catch {
      // silently fail — winners list is not critical
    }
  }, [])

  // Rotate the wheel imperatively via the DOM ref — never causes React re-render
  const spinWheel = useCallback((segmentIndex: number): Promise<void> => {
    return new Promise((resolve) => {
      const el = wheelRef.current
      if (!el) { resolve(); return }

      const segmentAngle = 360 / WHEEL_SEGMENTS.length
      const targetAngle  = segmentIndex * segmentAngle
      // Always spin at least 8 full rotations forward, land on target
      const spinAmount   = 360 * 8 + (360 - (currentRotation.current % 360)) + (360 - targetAngle)
      const finalRotation = currentRotation.current + spinAmount

      // Apply transition directly on the DOM element — no React state involved
      el.style.transition = "transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)"
      el.style.transform  = `rotate(${finalRotation}deg)`

      currentRotation.current = finalRotation

      const onEnd = () => {
        el.removeEventListener("transitionend", onEnd)
        // Remove transition so future renders don't re-trigger it
        el.style.transition = "none"
        resolve()
      }
      el.addEventListener("transitionend", onEnd)

      // Fallback timeout in case transitionend doesn't fire
      setTimeout(resolve, 5500)
    })
  }, [])

  const handleSpin = useCallback(async () => {
    if (!participantEmail) return

    if (availableSpins <= 0) {
      toast({
        title: "No Spins Available",
        description: "You have no spins left. Earn more by referring friends!",
        variant: "destructive",
      })
      return
    }

    if (balance < SPIN_COST) {
      toast({
        title: "Insufficient Balance",
        description: `You need $${SPIN_COST} to spin the wheel!`,
        variant: "destructive",
      })
      return
    }

    setIsSpinning(true)

    try {
      const response = await fetch("/api/participant/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: participantEmail }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const result: SpinResult = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Spin was not successful")
      }

      // Spin wheel imperatively — does NOT trigger React re-renders
      await spinWheel(result.prize.segmentIndex)

      setWinResult(result)
      setIsSpinning(false)
      setShowWinModal(true)
      // Refresh balance silently after spin completes
      loadParticipantData()
      loadLastWinners()
    } catch (error: any) {
      console.error("Spin error:", error)
      setIsSpinning(false)
      toast({
        title: "Spin Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    }
  }, [participantEmail, availableSpins, balance, spinWheel, loadParticipantData, loadLastWinners, toast])

  if (!mounted || !participantEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-amber-900 font-semibold">Loading Lucky Wheel...</p>
        </div>
      </div>
    )
  }

  const canSpin = !isSpinning && balance >= SPIN_COST && availableSpins > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">

      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white sticky top-0 z-40 shadow-lg">
        <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Link href="/participant/dashboard">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-8 w-8 sm:h-9 sm:w-9 rounded-lg"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-base md:text-lg font-bold truncate">Lucky Wheel</h1>
              <p className="text-[10px] sm:text-xs text-amber-100 hidden sm:block">Spin to win amazing prizes!</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="bg-white/20 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-white/30 text-center">
              <div className="text-[9px] sm:text-[10px] text-amber-100">Spins Left</div>
              <div className="text-base sm:text-lg font-black leading-tight">{availableSpins}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Balance + Sound row */}
      <div className="flex items-center justify-center gap-3 mt-4">
        <button
          onClick={() => setSoundEnabled((v) => !v)}
          className="rounded-full h-8 w-8 flex items-center justify-center text-amber-700 hover:bg-amber-100 transition-colors"
          aria-label="Toggle sound"
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-xl font-bold text-sm shadow-lg">
          <Wallet className="h-4 w-4" />
          ${balance.toFixed(2)}
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-3 sm:px-4 py-4 max-w-4xl">

        {/* Info banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 shadow-sm">
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Info className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-amber-900 mb-0.5">How to Play</h3>
              <p className="text-[10px] sm:text-xs text-amber-800 leading-relaxed">
                Each spin costs ${SPIN_COST}. You have{" "}
                <span className="font-bold">{availableSpins}</span>{" "}
                {availableSpins === 1 ? "spin" : "spins"} available.
                Win cash prizes instantly credited to your wallet.
              </p>
            </div>
          </div>
        </div>

        {/* Wheel — wrapped in a stable outer div, inner div moved by DOM ref only */}
        <div className="relative flex items-center justify-center mb-6">
          {/* Pointer / indicator at top */}
          <div
            className="absolute top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-1"
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }}
          >
            <svg width="24" height="30" viewBox="0 0 24 30">
              <polygon points="12,0 0,28 24,28" fill="#F59E0B" stroke="white" strokeWidth="2" />
            </svg>
          </div>

          {/* The wheel — rotated via ref, NEVER via React state */}
          <div
            ref={wheelRef}
            className="w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80"
            style={{ willChange: "transform", transform: "rotate(0deg)", transition: "none" }}
          >
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
              <defs>
                <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%"   stopColor="#FDE68A" />
                  <stop offset="50%"  stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#FDE68A" />
                </linearGradient>
                <linearGradient id="centerGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%"   stopColor="#FDE68A" />
                  <stop offset="50%"  stopColor="#FBBF24" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
                {WHEEL_SEGMENTS.map((seg, i) => (
                  <linearGradient key={`grad-${i}`} id={`segGrad${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%"   stopColor={seg.color} />
                    <stop offset="100%" stopColor={seg.gradientEnd} />
                  </linearGradient>
                ))}
                <radialGradient id="shine" cx="30%" cy="30%" r="60%">
                  <stop offset="0%"   stopColor="white" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="white" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Outer ring */}
              <circle cx="100" cy="100" r="98" fill="url(#goldRing)" />
              <circle cx="100" cy="100" r="94" fill="white" />
              <circle cx="100" cy="100" r="92" fill="none" stroke="#F59E0B" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />

              {/* Segments */}
              {WHEEL_SEGMENTS.map((segment, i) => {
                const angle      = 45
                const startAngle = i * angle - 90 - 22.5
                const endAngle   = startAngle + angle
                const startRad   = (startAngle * Math.PI) / 180
                const endRad     = (endAngle   * Math.PI) / 180
                const x1 = 100 + 88 * Math.cos(startRad)
                const y1 = 100 + 88 * Math.sin(startRad)
                const x2 = 100 + 88 * Math.cos(endRad)
                const y2 = 100 + 88 * Math.sin(endRad)
                const midAngle = startAngle + angle / 2
                const midRad   = (midAngle * Math.PI) / 180
                const textX    = 100 + 62 * Math.cos(midRad)
                const textY    = 100 + 62 * Math.sin(midRad)
                const isLight  = segment.color === "#F5F5F5"

                return (
                  <g key={i}>
                    <path
                      d={`M 100 100 L ${x1} ${y1} A 88 88 0 0 1 ${x2} ${y2} Z`}
                      fill={`url(#segGrad${i})`}
                      stroke="white"
                      strokeWidth="1.5"
                    />
                    <text
                      x={textX}
                      y={textY}
                      fill={isLight ? "#374151" : "white"}
                      fontSize={segment.label === "JACKPOT" || segment.label === "Refer" ? "8" : "13"}
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                    >
                      {segment.label}
                    </text>
                  </g>
                )
              })}

              {/* Center piece */}
              <circle cx="100" cy="100" r="28" fill="url(#centerGold)" stroke="#F59E0B" strokeWidth="3" />
              <circle cx="100" cy="100" r="22" fill="#FBBF24" />
              <circle cx="100" cy="100" r="18" fill="url(#centerGold)" />
              <text x="100" y="103" fontSize="20" textAnchor="middle" dominantBaseline="middle" fill="#F97316">★</text>

              {/* Shine */}
              <circle cx="100" cy="100" r="88" fill="url(#shine)" />
            </svg>
          </div>
        </div>

        {/* Spin button */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleSpin}
            disabled={!canSpin}
            className="relative h-12 sm:h-14 px-8 sm:px-10 text-sm sm:text-base font-bold rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden transition-transform active:scale-95"
            style={{
              background: canSpin
                ? "linear-gradient(135deg, #FDE68A 0%, #FBBF24 30%, #F59E0B 70%, #D97706 100%)"
                : "linear-gradient(135deg, #D1D5DB 0%, #9CA3AF 100%)",
              color: canSpin ? "#92400E" : "#ffffff",
              boxShadow: canSpin
                ? "0 6px 0 #B45309, 0 10px 20px rgba(251,191,36,0.35)"
                : "0 4px 0 #6B7280",
            }}
          >
            {isSpinning ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Spinning...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                SPIN FOR ${SPIN_COST}
              </span>
            )}
          </button>

          <p className="text-xs sm:text-sm text-gray-500">
            {balance < SPIN_COST
              ? `Need $${(SPIN_COST - balance).toFixed(2)} more to spin`
              : availableSpins <= 0
              ? "No spins left — earn more by referring friends!"
              : "Win prizes up to $50 JACKPOT!"}
          </p>
        </div>

        {/* Prize table + Winners */}
        <div className="grid md:grid-cols-2 gap-3 mt-6">
          {/* Prize table */}
          <div className="bg-white rounded-xl p-4 shadow-md border border-amber-100">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Prize Table
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {WHEEL_SEGMENTS.map((segment, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-gray-50"
                >
                  <span className="font-medium text-xs text-gray-700">{segment.label}</span>
                  <span
                    className="font-bold text-[10px] px-1.5 py-0.5 rounded-full text-white"
                    style={{
                      background:
                        segment.color === "#F5F5F5"
                          ? "linear-gradient(135deg, #8B5CF6, #7C3AED)"
                          : `linear-gradient(135deg, ${segment.color}, ${segment.gradientEnd})`,
                    }}
                  >
                    {segment.amount > 0 ? `$${segment.amount}` : "0"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Winners */}
          <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-xl p-4 shadow-md text-white">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Recent Winners
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {lastWinners.length > 0 ? (
                lastWinners.slice(0, 6).map((winner, idx) => (
                  <div key={idx} className="bg-white/20 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium truncate max-w-[130px]">
                        {winner.email.replace(/(.{3}).*(@.*)/, "$1***$2")}
                      </span>
                      <span className="text-sm font-bold text-yellow-200 flex-shrink-0">
                        +${winner.amount}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-white/70 text-center py-4">
                  No recent winners yet. Be the first!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Win Modal */}
      {showWinModal && winResult && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-3 bg-white rounded-full flex items-center justify-center shadow-lg">
                {winResult.prize.amount > 0 ? (
                  <Trophy className="h-8 w-8 text-amber-500" />
                ) : (
                  <X className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <h2 className="text-2xl font-black text-white mb-1">
                {winResult.prize.amount > 0 ? "Congratulations!" : "Try Again!"}
              </h2>
              <p className="text-white/90 text-base">
                {winResult.prize.amount > 0
                  ? `You won $${winResult.prize.amount}!`
                  : "Better luck next time!"}
              </p>
            </div>

            <div className="p-5">
              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-500">Previous Balance:</span>
                  <span className="font-bold">${winResult.balanceBefore.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">New Balance:</span>
                  <span className="font-bold text-green-600">${winResult.balanceAfter.toFixed(2)}</span>
                </div>
              </div>
              <Button
                onClick={() => {
                  setShowWinModal(false)
                  setWinResult(null)
                }}
                className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl"
              >
                {winResult.prize.amount > 0 ? "Spin Again" : "Try Again"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
