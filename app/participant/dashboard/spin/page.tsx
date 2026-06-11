"use client"

import Link from "next/link"
import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Wallet, RotateCw, Trophy, Shield, Gem, ChevronDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { isParticipantAuthenticated, participantFetch } from "@/lib/auth"

interface Winner {
  email: string
  amount: number
  multiplier: string
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

// 8 segments matching the reference image exactly
// Order: top-right going clockwise: 3.0x, 5.0x, 0.5x, 4.0x, 1.5x, 2.0x, 10.0x, 2.5x
const WHEEL_SEGMENTS = [
  { label: "3.0x",  sublabel: "You get 3X",   multiplier: 3.0,  bgColor: "#FEF08A", textColor: "#D97706", icon: "trophy" },
  { label: "5.0x",  sublabel: "You get 5X",   multiplier: 5.0,  bgColor: "#DDD6FE", textColor: "#7C3AED", icon: "rocket" },
  { label: "0.5x",  sublabel: "You get 0.5X", multiplier: 0.5,  bgColor: "#BBF7D0", textColor: "#16A34A", icon: "lightning" },
  { label: "4.0x",  sublabel: "You get 4X",   multiplier: 4.0,  bgColor: "#FBCFE8", textColor: "#BE185D", icon: "target" },
  { label: "1.5x",  sublabel: "You get 1.5X", multiplier: 1.5,  bgColor: "#FEF08A", textColor: "#B45309", icon: "bars" },
  { label: "2.0x",  sublabel: "You get 2X",   multiplier: 2.0,  bgColor: "#BFDBFE", textColor: "#1D4ED8", icon: "diamond" },
  { label: "10.0x", sublabel: "You get 10X",  multiplier: 10.0, bgColor: "#BBF7D0", textColor: "#15803D", icon: "coins" },
  { label: "2.5x",  sublabel: "You get 2.5X", multiplier: 2.5,  bgColor: "#FBCFE8", textColor: "#DB2777", icon: "gift" },
]

const AMOUNT_PRESETS = [10, 25, 50, 100, 250, 500]

// Draw the icon for each segment
function SegmentIcon({ type, x, y }: { type: string; x: number; y: number }) {
  const size = 10
  switch (type) {
    case "trophy":
      return <text x={x} y={y} textAnchor="middle" fontSize={size + 2} fill="#D97706">🏆</text>
    case "rocket":
      return <text x={x} y={y} textAnchor="middle" fontSize={size + 2} fill="#7C3AED">🚀</text>
    case "lightning":
      return <text x={x} y={y} textAnchor="middle" fontSize={size + 2} fill="#16A34A">⚡</text>
    case "target":
      return <text x={x} y={y} textAnchor="middle" fontSize={size + 2} fill="#BE185D">🎯</text>
    case "bars":
      return <text x={x} y={y} textAnchor="middle" fontSize={size + 2} fill="#B45309">📊</text>
    case "diamond":
      return <text x={x} y={y} textAnchor="middle" fontSize={size + 2} fill="#1D4ED8">💎</text>
    case "coins":
      return <text x={x} y={y} textAnchor="middle" fontSize={size + 2} fill="#15803D">💰</text>
    case "gift":
      return <text x={x} y={y} textAnchor="middle" fontSize={size + 2} fill="#DB2777">🎁</text>
    default:
      return null
  }
}

function SpinWheel({ wheelRef }: { wheelRef: React.RefObject<HTMLDivElement> }) {
  const size = 340
  const cx = size / 2
  const cy = size / 2
  const outerR = 158
  const innerR = 50
  const rimR = 168
  const n = WHEEL_SEGMENTS.length
  const angleStep = (2 * Math.PI) / n

  // LED dot positions on rim
  const ledAngles = Array.from({ length: 16 }, (_, i) => (i * 2 * Math.PI) / 16)

  return (
    <div
      ref={wheelRef}
      style={{ width: size, height: size, transformOrigin: "center center", willChange: "transform" }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
        <defs>
          {/* Rainbow rim gradient */}
          <linearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#f97316" />
            <stop offset="30%"  stopColor="#ec4899" />
            <stop offset="60%"  stopColor="#a855f7" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          {/* Center button gradient */}
          <radialGradient id="centerGrad" cx="50%" cy="35%" r="65%">
            <stop offset="0%"   stopColor="#fb923c" />
            <stop offset="100%" stopColor="#dc2626" />
          </radialGradient>
          {/* Center glow */}
          <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="rgba(251,146,60,0.3)" />
            <stop offset="100%" stopColor="rgba(251,146,60,0)" />
          </radialGradient>
          {/* Drop shadow */}
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(0,0,0,0.25)" />
          </filter>
          <filter id="centerShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(0,0,0,0.35)" />
          </filter>
        </defs>

        {/* Outer glow ring */}
        <circle cx={cx} cy={cy} r={rimR + 14} fill="url(#glowGrad)" />

        {/* Thick rainbow rim */}
        <circle cx={cx} cy={cy} r={rimR} fill="none" stroke="url(#rimGrad)" strokeWidth={20} filter="url(#shadow)" />
        <circle cx={cx} cy={cy} r={rimR} fill="none" stroke="white"           strokeWidth={2.5} opacity={0.6} />

        {/* Segments */}
        {WHEEL_SEGMENTS.map((seg, i) => {
          const startAngle = i * angleStep - Math.PI / 2
          const endAngle   = startAngle + angleStep
          const midAngle   = startAngle + angleStep / 2

          const x1 = cx + outerR * Math.cos(startAngle)
          const y1 = cy + outerR * Math.sin(startAngle)
          const x2 = cx + outerR * Math.cos(endAngle)
          const y2 = cy + outerR * Math.sin(endAngle)

          const path = [
            `M ${cx} ${cy}`,
            `L ${x1} ${y1}`,
            `A ${outerR} ${outerR} 0 0 1 ${x2} ${y2}`,
            "Z",
          ].join(" ")

          // Text positions
          const textR1 = outerR * 0.62
          const textR2 = outerR * 0.78
          const textR3 = outerR * 0.90
          const iconR  = outerR * 0.45

          const tx1 = cx + textR1 * Math.cos(midAngle)
          const ty1 = cy + textR1 * Math.sin(midAngle)
          const tx2 = cx + textR2 * Math.cos(midAngle)
          const ty2 = cy + textR2 * Math.sin(midAngle)
          const tx3 = cx + textR3 * Math.cos(midAngle)
          const ty3 = cy + textR3 * Math.sin(midAngle)
          const ix  = cx + iconR  * Math.cos(midAngle)
          const iy  = cy + iconR  * Math.sin(midAngle)

          const rotateDeg = (midAngle * 180) / Math.PI + 90

          return (
            <g key={i}>
              {/* Segment fill */}
              <path d={path} fill={seg.bgColor} stroke="white" strokeWidth={2} />

              {/* Rotated text group */}
              <g transform={`rotate(${rotateDeg}, ${cx + outerR * 0.68 * Math.cos(midAngle)}, ${cy + outerR * 0.68 * Math.sin(midAngle)})`}>
                {/* Icon */}
                <SegmentIcon type={seg.icon} x={ix} y={iy + 4} />
                {/* Multiplier label - big bold */}
                <text
                  x={tx1} y={ty1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={13}
                  fontWeight="900"
                  fill={seg.textColor}
                  fontFamily="system-ui, sans-serif"
                >
                  {seg.label}
                </text>
                {/* Sublabel line 1 */}
                <text
                  x={tx2} y={ty2 - 5}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={7}
                  fontWeight="600"
                  fill={seg.textColor}
                  opacity={0.85}
                  fontFamily="system-ui, sans-serif"
                >
                  You get
                </text>
                {/* Sublabel line 2 */}
                <text
                  x={tx3} y={ty3 - 6}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={7.5}
                  fontWeight="800"
                  fill={seg.textColor}
                  fontFamily="system-ui, sans-serif"
                >
                  {seg.multiplier >= 1 ? `${seg.multiplier % 1 === 0 ? seg.multiplier.toFixed(0) : seg.multiplier}X` : `${seg.multiplier}X`}
                </text>
              </g>
            </g>
          )
        })}

        {/* Inner separator circle */}
        <circle cx={cx} cy={cy} r={innerR + 2} fill="white" />

        {/* LED dots on rim */}
        {ledAngles.map((a, i) => {
          const lx = cx + rimR * Math.cos(a)
          const ly = cy + rimR * Math.sin(a)
          return (
            <circle key={i} cx={lx} cy={ly} r={4}
              fill="white"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth={1}
              style={{ filter: "drop-shadow(0 0 3px rgba(255,255,255,0.9))" }}
            />
          )
        })}

        {/* Center button */}
        <circle cx={cx} cy={cy} r={innerR} fill="url(#centerGrad)" filter="url(#centerShadow)" />
        {/* Center highlight */}
        <ellipse cx={cx} cy={cy - 10} rx={28} ry={16} fill="rgba(255,255,255,0.25)" />
        {/* Spin icon - circular arrow */}
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize={18} fill="white" fontWeight="bold">↻</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize={13} fill="white" fontWeight="900" fontFamily="system-ui, sans-serif">SPIN</text>
        <text x={cx} y={cy + 22} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.85)" fontFamily="system-ui, sans-serif">Good luck!</text>
      </svg>
    </div>
  )
}

export default function SpinWheelPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)

  const [balance, setBalance]               = useState(0)
  const [participantEmail, setParticipantEmail] = useState("")

  const [spinAmount, setSpinAmount]         = useState(100)
  const [selectedPreset, setSelectedPreset] = useState(100)

  const [isSpinning, setIsSpinning]         = useState(false)
  const [lastWinners, setLastWinners]       = useState<Winner[]>([])
  const [showWinModal, setShowWinModal]     = useState(false)
  const [winResult, setWinResult]           = useState<SpinResult | null>(null)

  const wheelRef       = useRef<HTMLDivElement>(null)
  const currentRotation = useRef(0)

  // ── data loaders ──────────────────────────────────────────────────────────
  const loadParticipantData = useCallback(async () => {
    if (!isParticipantAuthenticated()) { router.push("/participant/login"); return }

    const storedData = localStorage.getItem("participantData")
    if (!storedData) { router.push("/participant/login"); return }

    try {
      const parsed = JSON.parse(storedData)
      // Optimistically show cached values while we fetch fresh data
      setParticipantEmail(parsed.email || "")
      setBalance(Number(parsed.account_balance) || 0)

      if (!parsed.email) return
      const res = await participantFetch(`/api/participant/me?email=${encodeURIComponent(parsed.email)}`)
      if (!res.ok) return
      const json = await res.json()
      if (json.participant) {
        setParticipantEmail(json.participant.email)
        setBalance(Number(json.participant.account_balance) || 0)
        localStorage.setItem("participantData", JSON.stringify({ ...parsed, ...json.participant }))
      }
    } catch (e) {
      console.error("loadParticipantData:", e)
    }
  }, [router])

  const loadLastWinners = useCallback(async () => {
    try {
      const res = await participantFetch("/api/participant/spin")
      if (!res.ok) return
      const json = await res.json()
      setLastWinners(json.winners || [])
    } catch (e) {
      console.error("loadLastWinners:", e)
    }
  }, [])

  // ── wheel animation ────────────────────────────────────────────────────────
  const spinWheelAnim = useCallback((targetSegmentIndex: number): Promise<void> => {
    return new Promise((resolve) => {
      if (!wheelRef.current) { resolve(); return }

      const extraSpins   = 5 + Math.floor(Math.random() * 4)
      const segmentAngle = 360 / WHEEL_SEGMENTS.length
      // We want the pointer (top = 0°) to land on targetSegmentIndex
      // Segment i occupies [i*segmentAngle, (i+1)*segmentAngle]
      const targetCenter = targetSegmentIndex * segmentAngle + segmentAngle / 2
      const totalRotation = extraSpins * 360 + (360 - targetCenter)

      const start  = currentRotation.current
      const end    = start + totalRotation
      const dur    = 4000
      const t0     = performance.now()

      function easeOut(t: number) {
        return 1 - Math.pow(1 - t, 4)
      }

      function frame(now: number) {
        const elapsed  = now - t0
        const progress = Math.min(elapsed / dur, 1)
        const angle    = start + (end - start) * easeOut(progress)
        if (wheelRef.current) {
          wheelRef.current.style.transform = `rotate(${angle}deg)`
        }
        if (progress < 1) {
          requestAnimationFrame(frame)
        } else {
          currentRotation.current = end % 360
          resolve()
        }
      }

      requestAnimationFrame(frame)
    })
  }, [])

  // ── spin handler ───────────────────────────────────────────────────────────
  const handleSpin = useCallback(async () => {
    if (!participantEmail || isSpinning) return

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
      const response = await participantFetch("/api/participant/spin", {
        method: "POST",
        body: JSON.stringify({ email: participantEmail, spinAmount }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || `Error ${response.status}`)
      }

      const result: SpinResult = await response.json()
      if (!result.success) throw new Error(result.error || "Spin failed")

      await spinWheelAnim(result.prize.segmentIndex)

      setWinResult(result)
      setShowWinModal(true)
      loadParticipantData()
      loadLastWinners()
    } catch (e) {
      toast({
        title: "Spin Failed",
        description: e instanceof Error ? e.message : "Unable to spin right now.",
        variant: "destructive",
      })
    } finally {
      setIsSpinning(false)
    }
  }, [participantEmail, isSpinning, balance, spinAmount, spinWheelAnim, loadParticipantData, loadLastWinners, toast])

  useEffect(() => {
    setMounted(true)
    loadParticipantData()
    loadLastWinners()
  }, [loadParticipantData, loadLastWinners])

  if (!mounted) return null

  const canSpin      = !isSpinning && balance >= spinAmount
  const minWinnings  = +(spinAmount * Math.min(...WHEEL_SEGMENTS.map(s => s.multiplier))).toFixed(2)
  const maxWinnings  = +(spinAmount * Math.max(...WHEEL_SEGMENTS.map(s => s.multiplier))).toFixed(2)

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/participant/dashboard"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight">Spin & Win</h1>
              <p className="text-[11px] text-slate-500">Multiply your amount</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-2">
            <Wallet className="h-4 w-4 text-slate-500" />
            <span className="font-bold text-slate-800">${balance.toFixed(2)}</span>
            <span className="text-xs text-slate-500">USDT</span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          <div className="flex flex-col lg:flex-row">

            {/* ── LEFT: Wheel ── */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 relative">
              {/* Decorative glow */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.15)_0%,transparent_70%)] pointer-events-none" />

              {/* Diamond pointer */}
              <div className="relative z-10 mb-[-16px] flex flex-col items-center">
                <div className="w-12 h-14 flex items-center justify-center">
                  <svg width="48" height="56" viewBox="0 0 48 56">
                    <defs>
                      <linearGradient id="pointerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f472b6" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                    {/* Teardrop / gem pointer shape */}
                    <ellipse cx="24" cy="22" rx="20" ry="20" fill="white" stroke="#f9a8d4" strokeWidth="2" />
                    <polygon points="8,36 40,36 24,56" fill="white" stroke="#f9a8d4" strokeWidth="1.5" />
                    {/* Diamond gem */}
                    <polygon points="24,8 34,20 24,32 14,20" fill="url(#pointerGrad)" />
                    <polygon points="24,8 34,20 24,14" fill="rgba(255,255,255,0.4)" />
                  </svg>
                </div>
              </div>

              {/* Wheel */}
              <div className="relative z-10">
                <SpinWheel wheelRef={wheelRef as React.RefObject<HTMLDivElement>} />
              </div>

              {/* Trust badges */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-sm border border-slate-100">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="font-bold text-slate-800">Provably Fair</p>
                    <p className="text-[10px] text-slate-500">100% Transparent</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-sm border border-slate-100">
                  <Gem className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="font-bold text-slate-800">Secured by Blockchain</p>
                    <p className="text-[10px] text-slate-500">Safe & Trusted</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Controls ── */}
            <div className="w-full lg:w-[420px] flex flex-col justify-between p-8 lg:p-10 gap-8">

              {/* Title */}
              <div>
                <h2 className="text-4xl font-black text-slate-900 leading-tight mb-2">
                  Spin &amp; <span className="text-orange-500">Win</span>
                  <span className="ml-3 text-yellow-400 text-3xl">✦</span>
                </h2>
                <p className="text-slate-500 text-base leading-relaxed">
                  Spin the wheel and{" "}
                  <span className="text-orange-500 font-semibold">multiply</span> your amount!
                </p>
              </div>

              <div className="flex flex-col gap-6">
                {/* ── SELECT AMOUNT ── */}
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3">
                    Select Amount
                  </p>

                  {/* Amount display box */}
                  <div className="flex items-center gap-3 border-2 border-slate-200 rounded-2xl px-4 py-3 mb-3 bg-slate-50 focus-within:border-orange-400 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-black text-sm">₮</span>
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={spinAmount}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        if (!isNaN(v) && v > 0) {
                          setSpinAmount(v)
                          setSelectedPreset(0)
                        }
                      }}
                      className="flex-1 bg-transparent text-2xl font-bold text-slate-900 outline-none w-full"
                    />
                    <div className="flex items-center gap-1 text-slate-600 font-semibold text-sm border-l border-slate-200 pl-3">
                      <span>USDT</span>
                      <ChevronDown className="h-3 w-3" />
                    </div>
                  </div>

                  {/* Preset chips */}
                  <div className="grid grid-cols-6 gap-2">
                    {AMOUNT_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => { setSpinAmount(preset); setSelectedPreset(preset) }}
                        className={`py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                          selectedPreset === preset
                            ? "bg-orange-500 text-white border-orange-500 shadow-md"
                            : "bg-white text-slate-700 border-slate-200 hover:border-orange-300 hover:text-orange-600"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── POSSIBLE WINNINGS ── */}
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3">
                    Possible Winnings
                  </p>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-black text-emerald-500">{minWinnings} USDT</span>
                      <span className="text-slate-400 font-semibold">—</span>
                      <span className="text-2xl font-black text-purple-600">{maxWinnings} USDT</span>
                    </div>
                    {/* Multiplier range bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-semibold w-8">0.5x</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden bg-gradient-to-r from-orange-400 via-pink-400 to-purple-500" />
                      <span className="text-xs text-slate-500 font-semibold w-6">10x</span>
                    </div>
                  </div>
                </div>

                {/* ── SPIN NOW Button ── */}
                <button
                  onClick={handleSpin}
                  disabled={!canSpin}
                  className={`relative w-full py-5 rounded-2xl font-black text-white text-lg tracking-widest uppercase flex items-center justify-center gap-3 transition-all duration-200 overflow-hidden ${
                    canSpin
                      ? "bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 shadow-lg hover:shadow-xl active:scale-[0.98]"
                      : "bg-gradient-to-r from-slate-300 to-slate-400 cursor-not-allowed"
                  }`}
                >
                  {/* Shimmer */}
                  {canSpin && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                  )}
                  <RotateCw className={`h-5 w-5 ${isSpinning ? "animate-spin" : ""}`} />
                  <span>{isSpinning ? "Spinning..." : "Spin Now"}</span>
                </button>

                {balance < spinAmount && (
                  <p className="text-center text-sm text-red-500 font-semibold -mt-4">
                    Need {(spinAmount - balance).toFixed(2)} more USDT
                  </p>
                )}
              </div>

              {/* ── Social proof ── */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex -space-x-2">
                  {[
                    "bg-orange-400", "bg-pink-400", "bg-purple-400", "bg-blue-400",
                  ].map((color, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full border-2 border-white ${color} flex items-center justify-center text-white text-xs font-bold`}
                    >
                      {["R", "A", "S", "V"][i]}
                    </div>
                  ))}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">50,000+ users spinning</p>
                  <p className="text-xs text-emerald-500 font-semibold flex items-center justify-end gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    Live
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Recent Winners ── */}
        {lastWinners.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow-md border border-slate-100 p-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-orange-500" />
              Recent Winners
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {lastWinners.map((w, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-pink-50 rounded-xl border border-orange-100"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800 truncate">{w.email.split("@")[0]}</p>
                    <p className="text-[10px] text-slate-500">Won {w.multiplier}</p>
                  </div>
                  <span className="text-sm font-black text-emerald-600">+${w.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Win Modal ── */}
      {showWinModal && winResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-[bounceIn_0.4s_ease]">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Congratulations!</h2>
            <p className="text-slate-500 mb-6">
              You won a{" "}
              <span className="font-black text-orange-500">{winResult.prize.label} multiplier</span>
            </p>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-6">
              <p className="text-sm text-emerald-600 mb-1 font-semibold">You Won</p>
              <p className="text-5xl font-black text-emerald-600">${winResult.prize.amount.toFixed(2)}</p>
              <p className="text-sm text-emerald-500 mt-1">USDT</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
              <div className="bg-slate-50 rounded-xl p-3 text-left">
                <p className="text-slate-500 text-xs mb-1">Previous Balance</p>
                <p className="font-black text-slate-800">${winResult.balanceBefore.toFixed(2)}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-left">
                <p className="text-emerald-600 text-xs mb-1">New Balance</p>
                <p className="font-black text-emerald-700">${winResult.balanceAfter.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowWinModal(false)}
                className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => { setShowWinModal(false); handleSpin() }}
                disabled={!canSpin}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-purple-600 text-white font-bold hover:from-orange-600 hover:to-purple-700 transition-all disabled:opacity-50"
              >
                Spin Again
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes bounceIn {
          0%   { opacity: 0; transform: scale(0.7); }
          60%  { transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
