"use client"

import Link from "next/link"
import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Sparkles, Trophy, TrendingUp, Volume2, VolumeX, Wallet, Info, X, ChevronDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { isParticipantAuthenticated } from "@/lib/auth"
import { createClient } from "@/lib/supabase/client"

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

// Wheel configuration - 8 colorful segments with multipliers
const WHEEL_SEGMENTS = [
  { label: "2.5x", color: "#EC4899", gradientEnd: "#DB2777", amount: 2.5, icon: "🎁" },
  { label: "3.0x", color: "#FCD34D", gradientEnd: "#FBBF24", amount: 3.0, icon: "👑" },
  { label: "5.0x", color: "#A78BFA", gradientEnd: "#8B5CF6", amount: 5.0, icon: "🚀" },
  { label: "10.0x", color: "#86EFAC", gradientEnd: "#22C55E", amount: 10.0, icon: "💰" },
  { label: "0.5x", color: "#A5F3FC", gradientEnd: "#06B6D4", amount: 0.5, icon: "⚡" },
  { label: "4.0x", color: "#F472B6", gradientEnd: "#EC4899", amount: 4.0, icon: "🎯" },
  { label: "1.5x", color: "#FED7AA", gradientEnd: "#FDBA74", amount: 1.5, icon: "📊" },
  { label: "2.0x", color: "#93C5FD", gradientEnd: "#3B82F6", amount: 2.0, icon: "💎" },
]

const AMOUNT_PRESETS = [10, 25, 50, 100, 250, 500]

export default function SpinWheelPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)

  // Participant data
  const [balance, setBalance] = useState(0)
  const [participantEmail, setParticipantEmail] = useState("")
  const [isActive, setIsActive] = useState(false)

  // Spin amount and selection
  const [spinAmount, setSpinAmount] = useState(100)
  const [selectedPreset, setSelectedPreset] = useState(100)
  const [showAmountDropdown, setShowAmountDropdown] = useState(false)

  // Spin state
  const [isSpinning, setIsSpinning] = useState(false)
  const [lastWinners, setLastWinners] = useState<Winner[]>([])
  const [showWinModal, setShowWinModal] = useState(false)
  const [winResult, setWinResult] = useState<SpinResult | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Wheel ref
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

      const supabase = createClient()
      const { data, error } = await supabase
        .from("participants")
        .select("email, account_balance, is_active")
        .eq("email", parsed.email)
        .single()

      if (error) {
        setParticipantEmail(parsed.email || "")
        setBalance(parsed.account_balance || 0)
        setIsActive(parsed.is_active || false)
        return
      }

      if (data) {
        const d = data as any
        setParticipantEmail(d.email)
        setBalance(d.account_balance ?? 0)
        setIsActive(d.is_active ?? false)
        localStorage.setItem("participantData", JSON.stringify({ ...parsed, ...d }))
      }
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
      // silently fail
    }
  }, [])

  const spinWheel = useCallback((segmentIndex: number): Promise<void> => {
    return new Promise((resolve) => {
      const el = wheelRef.current
      if (!el) {
        resolve()
        return
      }

      const segmentAngle = 360 / WHEEL_SEGMENTS.length
      const targetAngle = segmentIndex * segmentAngle
      const spinAmount = 360 * 8 + (360 - (currentRotation.current % 360)) + (360 - targetAngle)
      const finalRotation = currentRotation.current + spinAmount

      el.style.transition = "transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)"
      el.style.transform = `rotate(${finalRotation}deg)`

      currentRotation.current = finalRotation

      const onEnd = () => {
        el.removeEventListener("transitionend", onEnd)
        el.style.transition = "none"
        resolve()
      }
      el.addEventListener("transitionend", onEnd)
      setTimeout(resolve, 5500)
    })
  }, [])

  const handleSpin = useCallback(async () => {
    if (!participantEmail) return

    if (balance < spinAmount) {
      toast({
        title: "Insufficient Balance",
        description: `You need ${spinAmount} USDT to spin the wheel!`,
        variant: "destructive",
      })
      return
    }

    setIsSpinning(true)

    try {
      const response = await fetch("/api/participant/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: participantEmail, spinAmount: spinAmount }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const result: SpinResult = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Spin was not successful")
      }

      await spinWheel(result.prize.segmentIndex)

      setWinResult(result)
      setIsSpinning(false)
      setShowWinModal(true)
      loadParticipantData()
      loadLastWinners()
    } catch {
      setIsSpinning(false)
      toast({
        title: "Spin Failed",
        description: "Unable to spin right now. Please try again in a moment.",
        variant: "destructive",
      })
    }
  }, [participantEmail, balance, spinAmount, spinWheel, loadParticipantData, loadLastWinners, toast])

  if (!mounted || !participantEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-purple-900 font-semibold">Loading Spin & Win...</p>
        </div>
      </div>
    )
  }

  const canSpin = !isSpinning && balance >= spinAmount
  const minWinnings = Math.round(spinAmount * Math.min(...WHEEL_SEGMENTS.map(s => s.amount)))
  const maxWinnings = Math.round(spinAmount * Math.max(...WHEEL_SEGMENTS.map(s => s.amount)))

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white sticky top-0 z-40 shadow-lg">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Link href="/participant/dashboard">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8 sm:h-9 sm:w-9 rounded-lg">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-bold truncate">Spin & Win</h1>
              <p className="text-[10px] sm:text-xs text-white/80 hidden sm:block">Multiply your amount</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-white/30 backdrop-blur-sm flex-shrink-0">
            <Wallet className="h-4 w-4" />
            <span className="font-bold text-sm">${balance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-start">
          {/* Left: Spin Wheel */}
          <div className="flex flex-col items-center gap-6">
            {/* Pointer */}
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 lg:static lg:translate-x-0" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}>
              <svg width="28" height="35" viewBox="0 0 28 35">
                <polygon points="14,0 0,35 28,35" fill="#EC4899" stroke="white" strokeWidth="2" />
              </svg>
            </div>

            {/* Wheel */}
            <div className="relative flex items-center justify-center">
              <div ref={wheelRef} className="w-64 h-64 sm:w-80 sm:h-80" style={{ willChange: "transform", transform: "rotate(0deg)", transition: "none" }}>
                <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
                  <defs>
                    {WHEEL_SEGMENTS.map((seg, i) => (
                      <linearGradient key={`grad-${i}`} id={`segGrad${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={seg.color} />
                        <stop offset="100%" stopColor={seg.gradientEnd} />
                      </linearGradient>
                    ))}
                    <radialGradient id="shine" cx="30%" cy="30%" r="60%">
                      <stop offset="0%" stopColor="white" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Outer colored rim */}
                  <circle cx="100" cy="100" r="98" fill="url(#rimGrad)" />

                  {/* Segments */}
                  {WHEEL_SEGMENTS.map((segment, i) => {
                    const angle = 45
                    const startAngle = i * angle - 90 - 22.5
                    const endAngle = startAngle + angle
                    const startRad = (startAngle * Math.PI) / 180
                    const endRad = (endAngle * Math.PI) / 180
                    const x1 = 100 + 88 * Math.cos(startRad)
                    const y1 = 100 + 88 * Math.sin(startRad)
                    const x2 = 100 + 88 * Math.cos(endRad)
                    const y2 = 100 + 88 * Math.sin(endRad)
                    const midAngle = startAngle + angle / 2
                    const midRad = (midAngle * Math.PI) / 180
                    const textX = 100 + 62 * Math.cos(midRad)
                    const textY = 100 + 62 * Math.sin(midRad)

                    return (
                      <g key={i}>
                        <path d={`M 100 100 L ${x1} ${y1} A 88 88 0 0 1 ${x2} ${y2} Z`} fill={`url(#segGrad${i})`} stroke="white" strokeWidth="2" />
                        <text x={textX} y={textY} fill="white" fontSize="13" fontWeight="bold" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}>
                          {segment.label}
                        </text>
                      </g>
                    )
                  })}

                  {/* Center button */}
                  <circle cx="100" cy="100" r="32" fill="url(#spinGrad)" stroke="white" strokeWidth="3" />
                  <circle cx="100" cy="100" r="28" fill="#FF4757" />
                  <text x="100" y="103" fontSize="22" fontWeight="bold" textAnchor="middle" dominantBaseline="middle" fill="white">
                    SPIN
                  </text>

                  {/* Shine */}
                  <circle cx="100" cy="100" r="88" fill="url(#shine)" />

                  <defs>
                    <linearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F97316" />
                      <stop offset="25%" stopColor="#EC4899" />
                      <stop offset="50%" stopColor="#8B5CF6" />
                      <stop offset="75%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                    <linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FF6B6B" />
                      <stop offset="100%" stopColor="#FF4757" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Sound toggle */}
            <button onClick={() => setSoundEnabled(v => !v)} className="rounded-full h-10 w-10 flex items-center justify-center text-purple-600 hover:bg-purple-100 transition-colors border border-purple-200">
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
          </div>

          {/* Right: Amount Selection & Info */}
          <div className="space-y-6">
            {/* Title */}
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                Spin & <span className="text-orange-500">Win</span>
              </h2>
              <p className="text-slate-600">Spin the wheel and <span className="text-orange-500 font-semibold">multiply</span> your amount!</p>
            </div>

            {/* Amount Selection */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-purple-100">
              <h3 className="text-sm font-bold text-slate-900 mb-4">SELECT AMOUNT</h3>

              {/* Amount Display */}
              <div className="flex items-center gap-3 mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white font-bold">Ⓣ</div>
                <div className="flex-1">
                  <input
                    type="number"
                    value={spinAmount}
                    onChange={(e) => setSpinAmount(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="text-3xl font-bold text-slate-900 bg-transparent border-none outline-none w-full"
                  />
                </div>
                <select className="px-4 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white">
                  <option>USDT</option>
                </select>
              </div>

              {/* Preset amounts */}
              <div className="grid grid-cols-6 gap-2 mb-4">
                {AMOUNT_PRESETS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => {
                      setSpinAmount(amount)
                      setSelectedPreset(amount)
                    }}
                    className={`py-2 px-2 rounded-lg font-bold text-sm transition-all ${
                      selectedPreset === amount
                        ? "bg-orange-500 text-white border-2 border-orange-500"
                        : "bg-white text-slate-900 border-2 border-slate-300 hover:border-orange-300"
                    }`}
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Possible Winnings */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
              <h3 className="text-sm font-bold text-slate-900 mb-4">POSSIBLE WINNINGS</h3>

              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-600">Min</p>
                  <p className="text-2xl font-bold text-green-600">{minWinnings} USDT</p>
                </div>
                <div className="text-center">
                  <span className="text-2xl">—</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-600">Max</p>
                  <p className="text-2xl font-bold text-purple-600">{maxWinnings} USDT</p>
                </div>
              </div>

              {/* Multiplier scale */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">0.5x</span>
                  <span className="text-slate-600">10x</span>
                </div>
                <div className="h-2 bg-gradient-to-r from-slate-300 via-orange-400 to-purple-600 rounded-full"></div>
              </div>
            </div>

            {/* Spin Button */}
            <button
              onClick={handleSpin}
              disabled={!canSpin}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-white text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                canSpin
                  ? "bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:shadow-xl"
                  : "bg-gradient-to-r from-slate-400 to-slate-500"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                {isSpinning ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Spinning...
                  </>
                ) : (
                  <>
                    🚀 SPIN NOW
                  </>
                )}
              </span>
            </button>

            {/* Info */}
            {balance < spinAmount && (
              <div className="text-center text-sm text-red-600 font-semibold">
                Need {(spinAmount - balance).toFixed(2)} more USDT
              </div>
            )}
          </div>
        </div>

        {/* Recent Winners - Bottom */}
        {lastWinners.length > 0 && (
          <div className="mt-12 pt-8 border-t border-purple-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
              Live Activity
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {lastWinners.slice(0, 4).map((winner, idx) => (
                <div key={idx} className="bg-white rounded-lg p-4 border border-purple-100 shadow-sm">
                  <p className="text-xs text-slate-600 mb-1">User {idx + 1}</p>
                  <p className="text-sm font-bold text-slate-900 mb-2">{winner.email.split("@")[0]}</p>
                  <p className="text-lg font-bold text-green-600">+${winner.amount.toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-2">Just now</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Win Modal */}
      {showWinModal && winResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-bounce-in">
            <button onClick={() => setShowWinModal(false)} className="ml-auto block text-slate-400 hover:text-slate-600 mb-4">
              <X className="w-6 h-6" />
            </button>
            <div className="text-center">
              <p className="text-6xl mb-4">🎉</p>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Congratulations!</h3>
              <p className="text-slate-600 mb-6">You won on {winResult.prize.label}</p>

              <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-4 mb-6">
                <p className="text-sm text-slate-600 mb-1">You Won</p>
                <p className="text-4xl font-bold text-green-600">${(winResult.prize.amount * spinAmount).toFixed(2)}</p>
              </div>

              <Button onClick={() => setShowWinModal(false)} className="w-full">
                Spin Again
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
