"use client"

import Link from "next/link"
import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Wallet, RotateCw, Trophy, Shield, Gem, ChevronDown, X } from "lucide-react"
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
    multiplier: number
    amount: number
    segmentIndex: number
  }
  balanceBefore: number
  balanceAfter: number
  error?: string
}

// 5 segments — MUST match server-side order and probabilities
const WHEEL_SEGMENTS = [
  { label: "0.5x", multiplier: 0.5, light: "#DCFCE7", dark: "#86EFAC", text: "#15803D", icon: "lightning", probability: "72%" },
  { label: "1x",   multiplier: 1.0, light: "#FFF9C4", dark: "#FDE047", text: "#92400E", icon: "target",    probability: "20%" },
  { label: "1.5x", multiplier: 1.5, light: "#DBEAFE", dark: "#93C5FD", text: "#1D4ED8", icon: "diamond",   probability: "4%" },
  { label: "2x",   multiplier: 2.0, light: "#FCE7F3", dark: "#F9A8D4", text: "#BE185D", icon: "bars",      probability: "3%" },
  { label: "3x",   multiplier: 3.0, light: "#FFFBCF", dark: "#F6D860", text: "#B45309", icon: "trophy",    probability: "1%" },
]

const N     = WHEEL_SEGMENTS.length
const STEP  = 360 / N          // 72° per segment
const AMOUNT_PRESETS = [10, 25, 50, 100, 250, 500]

// ─── Segment icons ────────────────────────────────────────────────────────────
function Icon({ type, color }: { type: string; color: string }) {
  switch (type) {
    case "trophy":
      return (
        <g>
          <path d="M-5,-6 Q-5,4 0,6 Q5,4 5,-6Z" fill={color}/>
          <path d="M-5,-6 Q-9,-5 -8,0 Q-7,3 -4,3" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
          <path d="M5,-6 Q9,-5 8,0 Q7,3 4,3"     fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
          <rect x="-2" y="6" width="4" height="2"   rx="0.5" fill={color}/>
          <rect x="-4" y="8" width="8" height="1.8" rx="0.5" fill={color}/>
          <ellipse cx="0" cy="0" rx="2" ry="2.5" fill="rgba(255,255,255,0.4)"/>
        </g>
      )
    case "target":
      return (
        <g>
          <circle cx="0" cy="0" r="8" fill="none" stroke={color} strokeWidth="2"/>
          <circle cx="0" cy="0" r="5" fill="none" stroke={color} strokeWidth="1.5"/>
          <circle cx="0" cy="0" r="2" fill={color}/>
          <line x1="5" y1="-5" x2="8" y2="-8" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
          <polygon points="8,-8 5,-7 7,-5" fill={color}/>
        </g>
      )
    case "diamond":
      return (
        <g>
          <polygon points="0,-9 7,0 0,9 -7,0"  fill={color}/>
          <polygon points="0,-9 7,0 0,-1 -7,0" fill="rgba(255,255,255,0.45)"/>
          <polygon points="0,9 7,0 0,1 -7,0"   fill="rgba(0,0,0,0.15)"/>
          <line x1="-7" y1="0" x2="7" y2="0" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8"/>
        </g>
      )
    case "bars":
      return (
        <g fill={color}>
          <rect x="-6" y="1"   width="3" height="6"  rx="1"/>
          <rect x="-1.5" y="-2" width="3" height="9" rx="1"/>
          <rect x="3" y="-6"   width="3" height="13" rx="1"/>
          <rect x="-6" y="1"   width="3" height="6"  rx="1" fill="rgba(255,255,255,0.2)"/>
        </g>
      )
    case "lightning":
      return (
        <g fill={color}>
          <polygon points="3,-9 -3,1 1.5,1 -3,9 5,-2 0,-2 4,-9"/>
          <polygon points="3,-9 -3,1 1.5,1 -3,9 5,-2 0,-2 4,-9" fill="rgba(255,255,255,0.25)" transform="translate(-0.5,-0.5)"/>
        </g>
      )
    default:
      return null
  }
}

// ─── Wheel SVG ────────────────────────────────────────────────────────────────
function WheelSVG() {
  const SIZE   = 340
  const CX     = SIZE / 2
  const CY     = SIZE / 2
  const OUTER  = 138
  const INNER  = 46
  const RIM    = 152
  const toRad  = (d: number) => (d * Math.PI) / 180

  function slicePath(i: number): string {
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
      style={{ overflow: "visible" }}
    >
      <defs>
        {/* Per-segment radial gradient for 3D depth */}
        {WHEEL_SEGMENTS.map((seg, i) => (
          <radialGradient key={i} id={`wg${i}`} cx="30%" cy="28%" r="82%">
            <stop offset="0%"   stopColor={seg.light} stopOpacity="1"/>
            <stop offset="55%"  stopColor={seg.light} stopOpacity="1"/>
            <stop offset="100%" stopColor={seg.dark} stopOpacity="1"/>
          </radialGradient>
        ))}
        {/* Chrome rim gradient */}
        <linearGradient id="wRimChr" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#ff7e36"/>
          <stop offset="20%"  stopColor="#f97316"/>
          <stop offset="38%"  stopColor="#f43f5e"/>
          <stop offset="55%"  stopColor="#ec4899"/>
          <stop offset="72%"  stopColor="#a855f7"/>
          <stop offset="88%"  stopColor="#6366f1"/>
          <stop offset="100%" stopColor="#3b82f6"/>
        </linearGradient>
        {/* Rim shine */}
        <linearGradient id="wRimSh" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.55)"/>
          <stop offset="45%"  stopColor="rgba(255,255,255,0.12)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0.18)"/>
        </linearGradient>
        {/* Center button gradient */}
        <radialGradient id="wCtrGr" cx="38%" cy="30%" r="75%">
          <stop offset="0%"   stopColor="#fcd34d"/>
          <stop offset="30%"  stopColor="#fb923c"/>
          <stop offset="65%"  stopColor="#ef4444"/>
          <stop offset="100%" stopColor="#991b1b"/>
        </radialGradient>
        {/* Center gloss */}
        <radialGradient id="wCtrGl" cx="50%" cy="22%" r="58%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.5)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
        </radialGradient>
        {/* Hub ring */}
        <radialGradient id="wHub" cx="30%" cy="25%" r="80%">
          <stop offset="0%"   stopColor="#f8fafc"/>
          <stop offset="45%"  stopColor="#e2e8f0"/>
          <stop offset="100%" stopColor="#94a3b8"/>
        </radialGradient>
        {/* Outer glow */}
        <radialGradient id="wOGlow" cx="50%" cy="50%" r="50%">
          <stop offset="55%"  stopColor="transparent"/>
          <stop offset="100%" stopColor="rgba(249,115,22,0.2)"/>
        </radialGradient>
        {/* Filters */}
        <filter id="wDrop"  x="-15%" y="-15%" width="130%" height="145%">
          <feDropShadow dx="0" dy="10" stdDeviation="16" floodColor="rgba(0,0,0,0.35)"/>
        </filter>
        <filter id="wRimSd" x="-5%"  y="-5%"  width="110%" height="110%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="rgba(0,0,0,0.28)"/>
        </filter>
        <filter id="wHubSd" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="rgba(0,0,0,0.45)"/>
        </filter>
        <filter id="wLed"   x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="wTxt"   x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.3)"/>
        </filter>
      </defs>

      {/* Ambient outer glow */}
      <circle cx={CX} cy={CY} r={RIM + 24} fill="url(#wOGlow)"/>
      {/* Drop shadow */}
      <ellipse cx={CX} cy={CY + 10} rx={OUTER + 6} ry={16} fill="rgba(0,0,0,0.18)" filter="url(#wDrop)"/>

      {/* ── SEGMENTS ── */}
      {WHEEL_SEGMENTS.map((seg, i) => {
        const midDeg  = i * STEP + STEP / 2 - 90
        const textRot = midDeg + 90
        const toR = (d: number) => (d * Math.PI) / 180

        const labelDist = OUTER * 0.62
        const iconDist  = OUTER * 0.84
        const probDist  = OUTER * 0.76

        const lx  = CX + labelDist * Math.cos(toR(midDeg))
        const ly  = CY + labelDist * Math.sin(toR(midDeg))
        const ix  = CX + iconDist  * Math.cos(toR(midDeg))
        const iy  = CY + iconDist  * Math.sin(toR(midDeg))
        const px  = CX + probDist  * Math.cos(toR(midDeg))
        const py  = CY + probDist  * Math.sin(toR(midDeg))

        return (
          <g key={i}>
            <path d={slicePath(i)} fill={`url(#wg${i})`} stroke="rgba(255,255,255,0.65)" strokeWidth={2.5}/>
            {/* Bevel inner highlight */}
            <path d={slicePath(i)} fill="rgba(255,255,255,0.1)"
              style={{ transform: `scale(0.38)`, transformOrigin: `${CX}px ${CY}px` }}
            />
            {/* Main multiplier label */}
            <g transform={`rotate(${textRot},${lx},${ly})`} filter="url(#wTxt)">
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                fontSize={16} fontWeight="900" fill={seg.text}
                fontFamily="'Arial Black', Arial, sans-serif" letterSpacing="-0.4">
                {seg.label}
              </text>
            </g>
            {/* Probability label */}
            <g transform={`rotate(${textRot},${px},${py})`}>
              <text x={px} y={py} textAnchor="middle" dominantBaseline="middle"
                fontSize={7} fontWeight="600" fill={seg.text} opacity={0.75}
                fontFamily="Arial, sans-serif">
                {seg.probability}
              </text>
            </g>
            {/* Icon near rim */}
            <g transform={`translate(${ix},${iy}) rotate(${textRot})`}>
              <Icon type={seg.icon} color={seg.text}/>
            </g>
          </g>
        )
      })}

      {/* ── CHROME RIM ── */}
      <circle cx={CX} cy={CY} r={RIM + 12} fill="none" stroke="rgba(0,0,0,0.16)" strokeWidth={4}/>
      <circle cx={CX} cy={CY} r={RIM}      fill="none" stroke="url(#wRimChr)"     strokeWidth={28} filter="url(#wRimSd)"/>
      <circle cx={CX} cy={CY} r={RIM}      fill="none" stroke="url(#wRimSh)"      strokeWidth={28} opacity={0.5}/>
      <circle cx={CX} cy={CY} r={RIM - 14} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5}/>
      <circle cx={CX} cy={CY} r={RIM + 14} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1}/>

      {/* ── LED BULBS ── */}
      {ledAngles.map((deg, i) => {
        const r   = toRad(deg)
        const lx  = CX + RIM * Math.cos(r)
        const ly  = CY + RIM * Math.sin(r)
        const isA = i % 2 === 0
        return (
          <g key={i} filter="url(#wLed)">
            <circle cx={lx} cy={ly + 1.5} r={6}   fill="rgba(0,0,0,0.32)"/>
            <circle cx={lx} cy={ly}        r={7.5} fill={isA ? "rgba(255,200,80,0.22)" : "rgba(180,210,255,0.22)"}/>
            <circle cx={lx} cy={ly}        r={5.5} fill={isA ? "rgba(255,240,180,1)" : "rgba(220,240,255,1)"}/>
            <circle cx={lx} cy={ly}        r={5.5} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={0.9}/>
            <circle cx={lx - 1.8} cy={ly - 1.8} r={1.8} fill="rgba(255,255,255,0.82)"/>
          </g>
        )
      })}

      {/* ── HUB RING ── */}
      <circle cx={CX} cy={CY} r={INNER + 7} fill="url(#wHub)"/>
      <circle cx={CX} cy={CY} r={INNER + 7} fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth={1.5}/>
      <circle cx={CX} cy={CY} r={INNER + 2} fill="none" stroke="rgba(0,0,0,0.1)"        strokeWidth={2}/>

      {/* ── CENTER BUTTON ── */}
      <circle cx={CX} cy={CY + 4} r={INNER + 1} fill="rgba(0,0,0,0.28)" filter="url(#wHubSd)"/>
      <circle cx={CX} cy={CY}     r={INNER}     fill="url(#wCtrGr)"/>
      <circle cx={CX} cy={CY}     r={INNER}     fill="url(#wCtrGl)"/>
      <circle cx={CX} cy={CY}     r={INNER}     fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth={1.5}/>
      <ellipse cx={CX}     cy={CY - 12} rx={24} ry={13} fill="rgba(255,255,255,0.28)"/>
      <ellipse cx={CX - 1} cy={CY - 14} rx={15} ry={8}  fill="rgba(255,255,255,0.2)"/>
      {/* SPIN text */}
      <text x={CX} y={CY + 2}  textAnchor="middle" dominantBaseline="middle"
        fontSize={16} fontWeight="900" fill="rgba(0,0,0,0.22)"
        fontFamily="'Arial Black', Arial, sans-serif" letterSpacing="2">SPIN</text>
      <text x={CX} y={CY}      textAnchor="middle" dominantBaseline="middle"
        fontSize={16} fontWeight="900" fill="white"
        fontFamily="'Arial Black', Arial, sans-serif" letterSpacing="2">SPIN</text>
      <text x={CX} y={CY + 18} textAnchor="middle" dominantBaseline="middle"
        fontSize={9} fill="rgba(255,255,255,0.85)" fontFamily="Arial, sans-serif">
        Good luck!
      </text>
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SpinWheelPage() {
  const router      = useRouter()
  const { toast }   = useToast()

  const [balance, setBalance]                     = useState(0)
  const [participantEmail, setParticipantEmail]   = useState("")
  const [spinAmount, setSpinAmount]               = useState(100)
  const [selectedPreset, setSelectedPreset]       = useState(100)
  const [isSpinning, setIsSpinning]               = useState(false)
  const [rotation, setRotation]                   = useState(0)
  const [lastWinners, setLastWinners]             = useState<Winner[]>([])
  const [showWinModal, setShowWinModal]           = useState(false)
  const [winResult, setWinResult]                 = useState<SpinResult | null>(null)

  // Accumulated rotation so the wheel never "resets" visually
  const totalRotation = useRef(0)

  // ── Derived values ────────────────────────────────────────────────────────
  const minWinnings = spinAmount * 0.5 // min multiplier
  const maxWinnings = spinAmount * 3   // max multiplier
  const canSpin = balance >= spinAmount && !isSpinning

  // ── data loaders ──────────────────────────────────────────────────────────
  const loadParticipantData = useCallback(async () => {
    if (!isParticipantAuthenticated()) { router.push("/participant/login"); return }
    const storedData = localStorage.getItem("participantData")
    if (!storedData) { router.push("/participant/login"); return }
    try {
      const parsed = JSON.parse(storedData)
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

  // ── spin handler ──────────────────────────────────────────────────────────
  const handleSpin = useCallback(async () => {
    if (!participantEmail || isSpinning) return

    if (balance < spinAmount) {
      toast({
        title: "Insufficient Balance",
        description: `You need ${spinAmount} USDT to spin.`,
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

      // Update balance immediately
      setBalance(result.balanceAfter)
      localStorage.setItem("participantData", JSON.stringify({
        email: participantEmail,
        account_balance: result.balanceAfter
      }))

      // Store result for display
      setWinResult(result)

      // Animate wheel to landing position
      const segmentIndex = result.prize.segmentIndex
      const segmentAngle = 360 / WHEEL_SEGMENTS.length
      const spins = 5 + Math.floor(Math.random() * 3)

      // Correct rotation math: bring winning segment to top pointer
      const mid = ((segmentIndex * segmentAngle + segmentAngle / 2 - 90) % 360 + 360) % 360
      const stopAt = (360 - mid) % 360
      const finalRotation = totalRotation.current + spins * 360 + stopAt

      // Update rotation with smooth animation
      totalRotation.current = finalRotation
      setRotation(finalRotation)

      // Show result after animation
      setTimeout(() => {
        setShowWinModal(true)
        setIsSpinning(false)
        loadLastWinners()
      }, 4200)

    } catch (error: any) {
      console.error("handleSpin error:", error)
      toast({
        title: "Spin Error",
        description: error.message || "Failed to spin",
        variant: "destructive",
      })
      setIsSpinning(false)
    }
  }, [participantEmail, spinAmount, balance, isSpinning, toast, loadLastWinners])

  // ── effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadParticipantData()
    loadLastWinners()
  }, [loadParticipantData, loadLastWinners])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0f0720] via-[#1a0533] to-[#0d1526]">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-3 sm:p-5 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <Link href="/participant/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <ArrowLeft className="h-5 w-5 text-white" />
          <span className="text-white font-bold hidden sm:inline">Dashboard</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 text-sm">
            <RotateCw className="h-4 w-4 text-purple-400 animate-spin" />
            <span className="font-bold text-white">Spin Wheel</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
            <Wallet className="h-4 w-4 text-orange-300" />
            <span className="font-bold text-white">${balance.toFixed(2)}</span>
            <span className="text-xs text-white/60">USDT</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-8 lg:py-12 flex-1">
        <div className="bg-white/5 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/10">
          <div className="flex flex-col lg:flex-row">

            {/* ── LEFT: Wheel panel ── */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 relative overflow-hidden">
              {/* Starfield */}
              {[...Array(20)].map((_, i) => (
                <div key={i} className="absolute rounded-full bg-white"
                  style={{
                    width:  `${1.5 + (i % 3)}px`,
                    height: `${1.5 + (i % 3)}px`,
                    top:    `${(i * 41 + 9)  % 96}%`,
                    left:   `${(i * 57 + 5) % 96}%`,
                    opacity: 0.1 + (i % 4) * 0.06,
                    animation: `pulse ${2 + (i % 3)}s ease-in-out infinite`,
                    animationDelay: `${(i * 0.35) % 3}s`,
                  }}
                />
              ))}
              {/* Radial glow behind wheel */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.28)_0%,rgba(168,85,247,0.14)_45%,transparent_70%)] pointer-events-none"/>
              {/* Floor glow */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-72 h-20 pointer-events-none"
                style={{ background: "linear-gradient(to right, rgba(249,115,22,0.4), rgba(236,72,153,0.3), rgba(168,85,247,0.35))", borderRadius: "50%", filter: "blur(30px)" }}
              />

              {/* Diamond pointer */}
              <div className="relative z-20 mb-[-20px]" style={{ filter: "drop-shadow(0 6px 14px rgba(236,72,153,0.6))" }}>
                <svg width="52" height="64" viewBox="0 0 52 64">
                  <defs>
                    <linearGradient id="pBody" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%"   stopColor="#ffffff"/>
                      <stop offset="100%" stopColor="#e2e8f0"/>
                    </linearGradient>
                    <linearGradient id="pGem" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%"   stopColor="#fda4af"/>
                      <stop offset="40%"  stopColor="#ec4899"/>
                      <stop offset="100%" stopColor="#9d174d"/>
                    </linearGradient>
                  </defs>
                  <ellipse cx="26" cy="22" rx="20" ry="20" fill="url(#pBody)" stroke="#fda4af" strokeWidth="1.8"/>
                  <polygon points="6,34 46,34 26,64"  fill="url(#pBody)" stroke="#fda4af" strokeWidth="1.5" strokeLinejoin="round"/>
                  <polygon points="26,6 38,20 26,34 14,20" fill="url(#pGem)"/>
                  <polygon points="26,6 38,20 26,15 14,20" fill="rgba(255,255,255,0.42)"/>
                  <polygon points="26,34 38,20 26,26 14,20" fill="rgba(0,0,0,0.14)"/>
                  <line x1="14" y1="20" x2="38" y2="20" stroke="rgba(255,255,255,0.45)" strokeWidth="0.9"/>
                  <circle cx="21" cy="13" r="2.8" fill="rgba(255,255,255,0.58)"/>
                </svg>
              </div>

              {/* Spinning wheel wrapper — CSS transition drives the animation */}
              <div
                className="relative z-10"
                style={{
                  transform:  `rotate(${rotation}deg)`,
                  transition: isSpinning
                    ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)"
                    : "none",
                  willChange: "transform",
                  transformOrigin: "50% 50%",
                }}
              >
                <WheelSVG />
              </div>

              {/* Trust badges */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2 border border-white/10">
                  <Shield className="h-4 w-4 text-blue-400" />
                  <div>
                    <p className="font-bold text-white">Provably Fair</p>
                    <p className="text-[10px] text-white/50">100% Transparent</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2 border border-white/10">
                  <Gem className="h-4 w-4 text-purple-400" />
                  <div>
                    <p className="font-bold text-white">Secured by Blockchain</p>
                    <p className="text-[10px] text-white/50">Safe &amp; Trusted</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Controls ── */}
            <div className="w-full lg:w-[420px] flex flex-col justify-between p-8 lg:p-10 gap-8 bg-white/3">

              {/* Title */}
              <div>
                <h2 className="text-4xl font-black text-white leading-tight mb-2">
                  Spin &amp; <span className="text-orange-400">Win</span>
                  <span className="ml-3 text-yellow-400 text-3xl">✦</span>
                </h2>
                <p className="text-white/60 text-base leading-relaxed">
                  Spin the wheel and{" "}
                  <span className="text-orange-400 font-semibold">multiply</span> your amount!
                </p>
              </div>

              <div className="flex flex-col gap-6">
                {/* Amount input */}
                <div>
                  <p className="text-xs font-black text-white/80 uppercase tracking-widest mb-3">Select Amount</p>
                  <div className="flex items-center gap-3 border-2 border-white/20 rounded-2xl px-4 py-3 mb-3 bg-white/5 focus-within:border-orange-400 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-black text-sm">₮</span>
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={spinAmount}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        if (!isNaN(v) && v > 0) { setSpinAmount(v); setSelectedPreset(0) }
                      }}
                      className="flex-1 bg-transparent text-2xl font-bold text-white outline-none w-full"
                    />
                    <div className="flex items-center gap-1 text-white/60 font-semibold text-sm border-l border-white/20 pl-3">
                      <span>USDT</span>
                      <ChevronDown className="h-3 w-3" />
                    </div>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {AMOUNT_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => { setSpinAmount(preset); setSelectedPreset(preset) }}
                        className={`py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                          selectedPreset === preset
                            ? "bg-orange-500 text-white border-orange-500 shadow-md"
                            : "bg-white/5 text-white/70 border-white/20 hover:border-orange-400 hover:text-orange-400"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Possible winnings */}
                <div>
                  <p className="text-xs font-black text-white/80 uppercase tracking-widest mb-3">Possible Winnings</p>
                  <div className="bg-white/5 border border-white/20 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-black text-emerald-400">${minWinnings.toFixed(0)} USDT</span>
                      <span className="text-white/40 font-semibold">—</span>
                      <span className="text-2xl font-black text-purple-400">${maxWinnings.toFixed(0)} USDT</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/50 font-semibold w-8">0.5x</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden bg-gradient-to-r from-orange-400 via-pink-400 to-purple-500"/>
                      <span className="text-xs text-white/50 font-semibold w-6">3x</span>
                    </div>
                  </div>
                </div>

                {/* Spin button */}
                <button
                  onClick={handleSpin}
                  disabled={!canSpin}
                  className={`relative w-full py-5 rounded-2xl font-black text-white text-lg tracking-widest uppercase flex items-center justify-center gap-3 transition-all duration-200 overflow-hidden ${
                    canSpin
                      ? "bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 shadow-lg hover:shadow-orange-500/30 hover:shadow-2xl active:scale-[0.98]"
                      : "bg-gradient-to-r from-slate-600 to-slate-700 cursor-not-allowed opacity-60"
                  }`}
                >
                  {canSpin && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"/>
                  )}
                  <span className="relative">
                    {isSpinning ? "Spinning..." : `SPIN NOW (${spinAmount})`}
                  </span>
                </button>

                {/* Probabilities */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-xs font-bold text-white/70 mb-3 uppercase tracking-wider">Win Probabilities</p>
                  <div className="space-y-2">
                    {WHEEL_SEGMENTS.map((seg) => (
                      <div key={seg.label} className="flex items-center justify-between">
                        <span className="text-sm text-white/80 font-semibold">{seg.label}</span>
                        <div className="flex items-center gap-2 flex-1 ml-3">
                          <div className="h-1.5 rounded-full bg-white/20 flex-1" style={{ background: `linear-gradient(90deg, ${seg.light}, ${seg.dark})` }}>
                            <div style={{ width: seg.probability, height: '100%', borderRadius: '9999px', background: `linear-gradient(90deg, ${seg.light}, ${seg.dark})` }} />
                          </div>
                          <span className="text-xs text-white/60 font-bold w-10 text-right">{seg.probability}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent winners */}
        <div className="mt-8 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-8">
          <h3 className="text-2xl font-black text-white mb-6">Recent Winners</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {lastWinners.map((winner, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs text-white/50 mb-2">User</p>
                <p className="text-white font-bold text-sm mb-3">{winner.email}</p>
                <p className="text-emerald-400 text-2xl font-black">${winner.amount.toFixed(0)} USDT</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Win Modal */}
      {showWinModal && winResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-white/10 via-white/5 to-white/10 border-2 border-white/20 rounded-3xl shadow-2xl max-w-sm w-full p-8 backdrop-blur-xl">
            {/* Close button */}
            <button
              onClick={() => setShowWinModal(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>

            {/* Trophy icon */}
            <div className="flex justify-center mb-6">
              <Trophy className="h-16 w-16 text-yellow-400 animate-pulse" />
            </div>

            {/* Title */}
            <h2 className="text-center text-3xl font-black text-white mb-2">Congratulations!</h2>
            <p className="text-center text-white/60 mb-8">You won with a lucky spin!</p>

            {/* Results */}
            <div className="space-y-4 mb-8">
              <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                <p className="text-xs text-white/50 mb-1 uppercase tracking-wider">Multiplier</p>
                <p className="text-3xl font-black text-orange-400">{winResult.prize.label}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                <p className="text-xs text-white/50 mb-1 uppercase tracking-wider">Bet Amount</p>
                <p className="text-3xl font-black text-white">${spinAmount.toFixed(2)} USDT</p>
              </div>
              <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-400/20 rounded-xl p-4 border-2 border-emerald-400/50">
                <p className="text-xs text-emerald-300 mb-1 uppercase tracking-wider font-bold">You Won</p>
                <p className="text-4xl font-black text-emerald-400">${winResult.prize.amount.toFixed(2)} USDT</p>
              </div>
            </div>

            {/* New balance */}
            <div className="text-center mb-6">
              <p className="text-white/60 text-sm mb-1">New Balance</p>
              <p className="text-2xl font-black text-white">${balance.toFixed(2)} USDT</p>
            </div>

            {/* Action button */}
            <button
              onClick={() => setShowWinModal(false)}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white font-black rounded-xl transition-all hover:shadow-lg active:scale-95"
            >
              Spin Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
