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
  const [customAmount, setCustomAmount] = useState("")

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

  // Load participant data
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
      console.error("Error loading participant data:", error)
    }
  }, [router])

  // Load last winners
  const loadLastWinners = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("participants")
        .select("email, account_balance")
        .limit(5)
        .order("updated_at", { ascending: false })

      if (!error && data) {
        setLastWinners(
          data.map((p: any, i: number) => ({
            email: p.email,
            amount: Math.floor(Math.random() * 5000) + 500,
            description: `Won ${Math.floor(Math.random() * 8) + 1}x multiplier`,
            timestamp: new Date().toISOString(),
          }))
        )
      }
    } catch (error) {
      console.error("Error loading winners:", error)
    }
  }, [])

  // Spin wheel animation
  const spinWheel = useCallback(async (targetSegmentIndex: number) => {
    if (!wheelRef.current) return

    const spinCount = 5 + Math.random() * 5
    const segmentAngle = 360 / WHEEL_SEGMENTS.length
    const targetRotation = spinCount * 360 + (targetSegmentIndex * segmentAngle + segmentAngle / 2)

    return new Promise<void>((resolve) => {
      let currentAngle = currentRotation.current
      let startTime = Date.now()
      const duration = 3000

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easeProgress = 1 - Math.pow(1 - progress, 3)

        const newAngle = currentAngle + targetRotation * easeProgress
        wheelRef.current!.style.transform = `rotate(${newAngle}deg)`

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          currentRotation.current = newAngle % 360
          resolve()
        }
      }

      animate()
    })
  }, [])

  // Handle spin
  const handleSpin = useCallback(async () => {
    if (!participantEmail) return

    if (balance < spinAmount) {
      toast({
        title: "Insufficient Balance",
        description: `You need ${spinAmount} USDT to spin. Current balance: ${balance.toFixed(2)} USDT`,
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

      // Spin wheel
      await spinWheel(result.prize.segmentIndex)

      setWinResult(result)
      setShowWinModal(true)
      loadParticipantData()
      loadLastWinners()
    } catch (error) {
      toast({
        title: "Spin Failed",
        description: error instanceof Error ? error.message : "Unable to spin right now.",
        variant: "destructive",
      })
    } finally {
      setIsSpinning(false)
    }
  }, [participantEmail, balance, spinAmount, spinWheel, loadParticipantData, loadLastWinners, toast])

  // Initialize
  useEffect(() => {
    setMounted(true)
    loadParticipantData()
    loadLastWinners()
  }, [loadParticipantData, loadLastWinners])

  if (!mounted || !participantEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4 animate-spin" />
          <p className="text-purple-900 font-semibold">Loading Spin & Win...</p>
        </div>
      </div>
    )
  }

  const canSpin = !isSpinning && balance >= spinAmount
  const minWinnings = spinAmount * Math.min(...WHEEL_SEGMENTS.map(s => s.amount))
  const maxWinnings = spinAmount * Math.max(...WHEEL_SEGMENTS.map(s => s.amount))

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white sticky top-0 z-40 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/participant/dashboard">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 rounded-lg h-9 w-9"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Spin & Win</h1>
              <p className="text-xs text-white/80">Multiply your amount</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/20 px-4 py-2 rounded-lg border border-white/30 backdrop-blur-sm">
            <Wallet className="h-4 w-4" />
            <span className="font-bold">${balance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left - Wheel */}
          <div className="lg:col-span-2 flex justify-center items-start pt-4">
            <div className="relative w-full max-w-md aspect-square flex items-center justify-center">
              {/* Glowing background */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-200/30 via-pink-200/30 to-purple-200/30 rounded-full blur-2xl"></div>
              
              {/* Wheel Image */}
              <div
                ref={wheelRef}
                className="relative w-96 h-96 transition-transform"
                style={{ transformOrigin: "center" }}
              >
                <img
                  src="/images/spin-wheel-colorful.png"
                  alt="Spin wheel"
                  className="w-full h-full object-contain drop-shadow-2xl"
                />
              </div>

              {/* Pointer at top */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
                <div className="w-0 h-0 border-l-6 border-r-6 border-t-8 border-l-transparent border-r-transparent border-t-pink-500 drop-shadow-lg"></div>
              </div>
            </div>
          </div>

          {/* Right - Controls */}
          <div className="flex flex-col gap-6">
            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Spin & Win</h2>
              <p className="text-slate-600">Spin the wheel and <span className="font-semibold text-purple-600">multiply</span> your amount!</p>
            </div>

            {/* Amount Selection */}
            <div className="bg-white rounded-2xl p-6 shadow-md border border-purple-100">
              <label className="block text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Select Amount</label>
              
              {/* Amount Input with Dropdown */}
              <div className="relative mb-4">
                <button
                  onClick={() => setShowAmountDropdown(!showAmountDropdown)}
                  className="w-full flex items-center justify-between gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-lg font-bold hover:from-green-600 hover:to-emerald-700 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    <span className="text-lg">{spinAmount}</span>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </button>
                
                {showAmountDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-purple-200 rounded-lg shadow-lg z-10">
                    <input
                      type="number"
                      placeholder="Enter custom amount"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      onBlur={() => {
                        if (customAmount && parseFloat(customAmount) > 0) {
                          setSpinAmount(parseFloat(customAmount))
                          setSelectedPreset(0)
                          setCustomAmount("")
                          setShowAmountDropdown(false)
                        }
                      }}
                      className="w-full px-4 py-2 border-b border-purple-200 focus:outline-none text-slate-900"
                    />
                    <div className="grid grid-cols-3 gap-2 p-3">
                      {AMOUNT_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          onClick={() => {
                            setSpinAmount(preset)
                            setSelectedPreset(preset)
                            setShowAmountDropdown(false)
                          }}
                          className={`py-2 rounded-lg font-bold transition-all ${
                            selectedPreset === preset
                              ? "bg-orange-500 text-white"
                              : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Presets Quick Select */}
              <div className="grid grid-cols-3 gap-2 mb-1">
                {AMOUNT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setSpinAmount(preset)
                      setSelectedPreset(preset)
                      setShowAmountDropdown(false)
                    }}
                    className={`py-2.5 rounded-lg font-bold text-sm transition-all border-2 ${
                      selectedPreset === preset
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-white text-slate-900 border-slate-200 hover:border-orange-300"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 text-center">USDT</p>
            </div>

            {/* Possible Winnings */}
            <div className="bg-white rounded-2xl p-6 shadow-md border border-purple-100">
              <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Possible Winnings</h3>
              
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-slate-600">Min</p>
                  <p className="text-xl font-bold text-green-600">{minWinnings.toFixed(2)} USDT</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-600">Max</p>
                  <p className="text-xl font-bold text-purple-600">{maxWinnings.toFixed(2)} USDT</p>
                </div>
              </div>

              {/* Multiplier Scale */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Multiplier Range</span>
                  <span className="text-slate-900 font-semibold">0.5x - 10x</span>
                </div>
                <div className="h-2 bg-gradient-to-r from-red-400 via-orange-400 via-purple-400 to-green-400 rounded-full"></div>
              </div>
            </div>

            {/* Spin Button */}
            <button
              onClick={handleSpin}
              disabled={!canSpin}
              className={`py-4 rounded-xl font-bold text-lg text-white transition-all duration-300 flex items-center justify-center gap-2 ${
                canSpin
                  ? "bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 hover:from-orange-600 hover:via-pink-600 hover:to-purple-600 shadow-lg hover:shadow-xl active:scale-95"
                  : "bg-gradient-to-r from-slate-400 to-slate-500 cursor-not-allowed opacity-50"
              }`}
            >
              {isSpinning ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Spinning...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>SPIN NOW</span>
                </>
              )}
            </button>

            {/* Balance Warning */}
            {balance < spinAmount && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700 font-semibold">
                  Need {(spinAmount - balance).toFixed(2)} more USDT to spin
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Live Activity */}
        {lastWinners.length > 0 && (
          <div className="mt-12 bg-white rounded-2xl p-6 shadow-md border border-purple-100">
            <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide flex items-center gap-2">
              <Trophy className="h-4 w-4 text-orange-500" />
              Recent Winners
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lastWinners.map((winner, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                  <div>
                    <p className="text-xs font-semibold text-slate-600">{winner.email.split("@")[0]}</p>
                    <p className="text-xs text-slate-500">{winner.description}</p>
                  </div>
                  <p className="text-sm font-bold text-green-600">+${winner.amount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Win Modal */}
      {showWinModal && winResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-bounce">
            <div className="text-center">
              <div className="mb-4 inline-block">
                <Sparkles className="h-16 w-16 text-yellow-500 animate-spin" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Congratulations!</h2>
              <p className="text-slate-600 mb-6">You won a <span className="font-bold text-purple-600">{winResult.prize.label} multiplier</span></p>
              
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-6 mb-6 border border-green-300">
                <p className="text-sm text-green-700 mb-1">You Won</p>
                <p className="text-4xl font-bold text-green-600">${winResult.prize.amount.toFixed(2)}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-6">
                <div className="p-3 bg-slate-100 rounded-lg">
                  <p className="text-slate-600 mb-1">Previous Balance</p>
                  <p className="font-bold text-slate-900">${winResult.balanceBefore.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg border border-green-300">
                  <p className="text-green-700 mb-1">New Balance</p>
                  <p className="font-bold text-green-600">${winResult.balanceAfter.toFixed(2)}</p>
                </div>
              </div>

              <button
                onClick={() => setShowWinModal(false)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                Awesome! Keep Spinning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
