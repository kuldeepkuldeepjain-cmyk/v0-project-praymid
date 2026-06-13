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

// Refined inline SVG icons — bolder, more legible at small sizes
function SegmentIconSVG({ type, color }: { type: string; color: string }) {
  const s = color
  switch (type) {
    case "trophy":
      return (
        <g>
          <path d="M-5,-6 Q-5,4 0,6 Q5,4 5,-6Z" fill={s} />
          <path d="M-5,-6 Q-9,-5 -8,0 Q-7,3 -4,3" fill="none" stroke={s} strokeWidth="1.6" strokeLinecap="round"/>
          <path d="M5,-6 Q9,-5 8,0 Q7,3 4,3" fill="none" stroke={s} strokeWidth="1.6" strokeLinecap="round"/>
          <rect x="-2" y="6" width="4" height="2" rx="0.5" fill={s}/>
          <rect x="-4" y="8" width="8" height="1.8" rx="0.5" fill={s}/>
          <ellipse cx="0" cy="0" rx="2" ry="2.5" fill="rgba(255,255,255,0.4)"/>
        </g>
      )
    case "rocket":
      return (
        <g>
          <path d="M0,-9 C-4,-4 -4,3 0,7 C4,3 4,-4 0,-9Z" fill={s}/>
          <path d="M-4,2 L-7,8 L-1,6Z" fill={s}/>
          <path d="M4,2 L7,8 L1,6Z" fill={s}/>
          <circle cx="0" cy="-1" r="2" fill="white" opacity="0.6"/>
          <circle cx="0" cy="-1" r="1" fill={s}/>
        </g>
      )
    case "lightning":
      return (
        <g fill={s}>
          <polygon points="3,-9 -3,1 1.5,1 -3,9 5,-2 0,-2 4,-9"/>
          <polygon points="3,-9 -3,1 1.5,1 -3,9 5,-2 0,-2 4,-9" fill="rgba(255,255,255,0.25)" transform="translate(-0.5,-0.5)"/>
        </g>
      )
    case "target":
      return (
        <g>
          <circle cx="0" cy="0" r="8" fill="none" stroke={s} strokeWidth="2"/>
          <circle cx="0" cy="0" r="5" fill="none" stroke={s} strokeWidth="1.5"/>
          <circle cx="0" cy="0" r="2" fill={s}/>
          <line x1="5" y1="-5" x2="8" y2="-8" stroke={s} strokeWidth="1.5" strokeLinecap="round"/>
          <polygon points="8,-8 5,-7 7,-5" fill={s}/>
        </g>
      )
    case "bars":
      return (
        <g fill={s}>
          <rect x="-6" y="1"  width="3" height="6" rx="1"/>
          <rect x="-1.5" y="-2" width="3" height="9" rx="1"/>
          <rect x="3" y="-6" width="3" height="13" rx="1"/>
          <rect x="-6" y="1"  width="3" height="6" rx="1" fill="rgba(255,255,255,0.2)"/>
        </g>
      )
    case "diamond":
      return (
        <g>
          <polygon points="0,-9 7,0 0,9 -7,0" fill={s}/>
          <polygon points="0,-9 7,0 0,-1 -7,0" fill="rgba(255,255,255,0.45)"/>
          <polygon points="0,9 7,0 0,1 -7,0" fill="rgba(0,0,0,0.15)"/>
          <line x1="-7" y1="0" x2="7" y2="0" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8"/>
        </g>
      )
    case "coins":
      return (
        <g>
          <ellipse cx="0" cy="-5" rx="5" ry="2" fill={s}/>
          <rect x="-5" y="-5" width="10" height="4" fill={s}/>
          <ellipse cx="0" cy="-1" rx="5" ry="2" fill={s}/>
          <ellipse cx="1.5" cy="2" rx="5" ry="2" fill={s} opacity="0.8"/>
          <rect x="-3.5" y="0" width="10" height="4" fill={s} opacity="0.8"/>
          <ellipse cx="1.5" cy="4" rx="5" ry="2" fill={s} opacity="0.8"/>
          <text x="0" y="-3" textAnchor="middle" fontSize="4" fill="white" fontWeight="bold">$</text>
        </g>
      )
    case "gift":
      return (
        <g>
          <rect x="-6" y="-1" width="12" height="9" rx="1" fill={s}/>
          <rect x="-6" y="-4" width="12" height="3.5" rx="1" fill={s}/>
          <rect x="-1.2" y="-7" width="2.4" height="13" rx="1" fill={s}/>
          <rect x="-6" y="-4" width="12" height="3.5" rx="1" fill="rgba(255,255,255,0.2)"/>
          <path d="M0,-4 C-1,-6 -5,-8 -4,-4" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M0,-4 C1,-6 5,-8 4,-4" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
        </g>
      )
    default:
      return null
  }
}

function SpinWheel({ wheelRef }: { wheelRef: React.RefObject<HTMLDivElement> }) {
  const SIZE  = 380
  const CX    = SIZE / 2
  const CY    = SIZE / 2
  const OUTER = 158   // segment outer radius
  const INNER = 55    // center hub radius
  const RIM   = 175   // rim circle radius
  const STEP  = 360 / WHEEL_SEGMENTS.length

  const toRad = (d: number) => (d * Math.PI) / 180

  function slicePath(i: number): string {
    const s = i * STEP - 90
    const e = s + STEP
    const x1 = CX + OUTER * Math.cos(toRad(s))
    const y1 = CY + OUTER * Math.sin(toRad(s))
    const x2 = CX + OUTER * Math.cos(toRad(e))
    const y2 = CY + OUTER * Math.sin(toRad(e))
    return `M${CX},${CY} L${x1},${y1} A${OUTER},${OUTER} 0 0,1 ${x2},${y2} Z`
  }

  // 16 LED positions on the rim
  const ledAngles = Array.from({ length: 16 }, (_, i) => (i * 360) / 16)

  // Per-segment tint pairs: [light fill, dark shading, text color]
  const SEG_COLORS: [string, string, string][] = [
    ["#FFFBCF","#F6D860","#B45309"],  // 3.0x warm yellow
    ["#EDE9FE","#C4B5FD","#6D28D9"],  // 5.0x violet
    ["#DCFCE7","#86EFAC","#15803D"],  // 0.5x green
    ["#FCE7F3","#F9A8D4","#BE185D"],  // 4.0x pink
    ["#FFF9C4","#FDE047","#92400E"],  // 1.5x yellow
    ["#DBEAFE","#93C5FD","#1D4ED8"],  // 2.0x blue
    ["#D1FAE5","#6EE7B7","#065F46"],  // 10.0x emerald
    ["#FCE7F3","#F472B6","#9D174D"],  // 2.5x pink
  ]

  return (
    <div
      ref={wheelRef}
      style={{ width: SIZE, height: SIZE, transformOrigin: "50% 50%", willChange: "transform" }}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          {/* ── Per-segment radial shading (center bright → outer dark for 3D depth) ── */}
          {SEG_COLORS.map(([light, dark], i) => (
            <radialGradient key={i} id={`seg${i}`} cx="28%" cy="28%" r="85%">
              <stop offset="0%"   stopColor={light}/>
              <stop offset="60%"  stopColor={light}/>
              <stop offset="100%" stopColor={dark}/>
            </radialGradient>
          ))}

          {/* ── Chrome / metallic rim gradient ── */}
          <linearGradient id="rimChrome" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#ff7e36"/>
            <stop offset="18%"  stopColor="#f97316"/>
            <stop offset="36%"  stopColor="#f43f5e"/>
            <stop offset="54%"  stopColor="#ec4899"/>
            <stop offset="72%"  stopColor="#a855f7"/>
            <stop offset="90%"  stopColor="#6366f1"/>
            <stop offset="100%" stopColor="#3b82f6"/>
          </linearGradient>

          {/* Rim shine overlay */}
          <linearGradient id="rimShine" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.55)"/>
            <stop offset="40%"  stopColor="rgba(255,255,255,0.15)"/>
            <stop offset="100%" stopColor="rgba(0,0,0,0.18)"/>
          </linearGradient>

          {/* ── Center button 3D gradient ── */}
          <radialGradient id="centerGrad" cx="38%" cy="30%" r="75%">
            <stop offset="0%"   stopColor="#fcd34d"/>
            <stop offset="30%"  stopColor="#fb923c"/>
            <stop offset="65%"  stopColor="#ef4444"/>
            <stop offset="100%" stopColor="#991b1b"/>
          </radialGradient>

          {/* Center top gloss */}
          <radialGradient id="centerGloss" cx="50%" cy="20%" r="60%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.55)"/>
            <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
          </radialGradient>

          {/* Ambient outer glow */}
          <radialGradient id="outerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="55%"  stopColor="transparent"/>
            <stop offset="100%" stopColor="rgba(249,115,22,0.22)"/>
          </radialGradient>

          {/* Hub ring metallic */}
          <radialGradient id="hubRing" cx="30%" cy="25%" r="80%">
            <stop offset="0%"   stopColor="#f8fafc"/>
            <stop offset="40%"  stopColor="#e2e8f0"/>
            <stop offset="100%" stopColor="#94a3b8"/>
          </radialGradient>

          {/* ── Filters ── */}
          {/* Realistic drop shadow beneath entire wheel */}
          <filter id="wheelDrop" x="-15%" y="-15%" width="130%" height="145%">
            <feDropShadow dx="0" dy="10" stdDeviation="18" floodColor="rgba(0,0,0,0.35)" floodOpacity="1"/>
          </filter>
          {/* Soft inner shadow on rim */}
          <filter id="rimShadow" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(0,0,0,0.28)"/>
          </filter>
          {/* Center button shadow */}
          <filter id="hubDrop" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="5" stdDeviation="8" floodColor="rgba(0,0,0,0.45)"/>
          </filter>
          {/* LED glow bloom */}
          <filter id="ledBloom" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Text legibility shadow */}
          <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.25)"/>
          </filter>

          {/* Segment divider lines clip */}
          <clipPath id="wheelClip">
            <circle cx={CX} cy={CY} r={OUTER}/>
          </clipPath>
        </defs>

        {/* ── Ambient outer glow ── */}
        <circle cx={CX} cy={CY} r={RIM + 24} fill="url(#outerGlow)"/>

        {/* ── SHADOW beneath whole wheel ── */}
        <ellipse cx={CX} cy={CY + 12} rx={OUTER + 8} ry={18} fill="rgba(0,0,0,0.18)" filter="url(#wheelDrop)"/>

        {/* ══ SEGMENTS ════════════════════════════════════════════════════════════ */}
        {WHEEL_SEGMENTS.map((seg, i) => {
          const midDeg    = i * STEP + STEP / 2 - 90
          const textRot   = midDeg + 90

          const iconDist  = OUTER * 0.43
          const labelDist = OUTER * 0.65
          const sub1Dist  = OUTER * 0.79
          const sub2Dist  = OUTER * 0.91

          const [, , tc] = SEG_COLORS[i]

          const ix  = CX + iconDist  * Math.cos(toRad(midDeg))
          const iy  = CY + iconDist  * Math.sin(toRad(midDeg))
          const lx  = CX + labelDist * Math.cos(toRad(midDeg))
          const ly  = CY + labelDist * Math.sin(toRad(midDeg))
          const s1x = CX + sub1Dist  * Math.cos(toRad(midDeg))
          const s1y = CY + sub1Dist  * Math.sin(toRad(midDeg))
          const s2x = CX + sub2Dist  * Math.cos(toRad(midDeg))
          const s2y = CY + sub2Dist  * Math.sin(toRad(midDeg))

          return (
            <g key={i}>
              {/* Base fill with radial gradient giving 3D depth */}
              <path d={slicePath(i)} fill={`url(#seg${i})`} stroke="rgba(255,255,255,0.75)" strokeWidth={2.5}/>

              {/* Subtle inner bevel: a lighter wedge close to center */}
              <path
                d={slicePath(i)}
                fill="rgba(255,255,255,0.12)"
                clipPath="url(#wheelClip)"
                style={{ transform: `scale(0.42)`, transformOrigin: `${CX}px ${CY}px` }}
              />

              {/* Icon — translated & counter-rotated so it stays upright */}
              <g transform={`translate(${ix},${iy}) rotate(${textRot})`}>
                <SegmentIconSVG type={seg.icon} color={tc}/>
              </g>

              {/* Big multiplier label */}
              <g transform={`rotate(${textRot},${lx},${ly})`} filter="url(#textShadow)">
                <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                  fontSize={15} fontWeight="900" fill={tc}
                  fontFamily="'Arial Black', Arial, sans-serif" letterSpacing="-0.4">
                  {seg.label}
                </text>
              </g>

              {/* "You get" sub-line */}
              <g transform={`rotate(${textRot},${s1x},${s1y})`}>
                <text x={s1x} y={s1y - 3} textAnchor="middle" dominantBaseline="middle"
                  fontSize={7} fontWeight="600" fill={tc} opacity={0.8}
                  fontFamily="Arial, sans-serif">
                  You get
                </text>
              </g>

              {/* "NX" sub-line */}
              <g transform={`rotate(${textRot},${s2x},${s2y})`}>
                <text x={s2x} y={s2y - 3} textAnchor="middle" dominantBaseline="middle"
                  fontSize={8.5} fontWeight="900" fill={tc}
                  fontFamily="'Arial Black', Arial, sans-serif">
                  {seg.multiplier % 1 === 0 ? `${seg.multiplier.toFixed(0)}X` : `${seg.multiplier}X`}
                </text>
              </g>
            </g>
          )
        })}

        {/* ══ CHROME RIM ══════════════════════════════════════════════════════════ */}
        {/* Outer shadow ring */}
        <circle cx={CX} cy={CY} r={RIM + 14} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={5}/>
        {/* Main thick gradient ring */}
        <circle cx={CX} cy={CY} r={RIM} fill="none" stroke="url(#rimChrome)" strokeWidth={28}
          filter="url(#rimShadow)"/>
        {/* Shine overlay on rim */}
        <circle cx={CX} cy={CY} r={RIM} fill="none" stroke="url(#rimShine)" strokeWidth={28} opacity={0.55}/>
        {/* Inner crisp edge */}
        <circle cx={CX} cy={CY} r={RIM - 14} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={1.5}/>
        {/* Outer crisp edge */}
        <circle cx={CX} cy={CY} r={RIM + 14} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1}/>

        {/* ══ LED BULBS ════════════════════════════════════════════════════════════
             Each bulb has: shadow, outer bloom, white body, specular highlight       */}
        {ledAngles.map((deg, i) => {
          const r   = toRad(deg)
          const lx  = CX + RIM * Math.cos(r)
          const ly  = CY + RIM * Math.sin(r)
          const isAlt = i % 2 === 0   // alternate warm/cool tint
          const tint  = isAlt ? "rgba(255,240,180,1)" : "rgba(220,240,255,1)"
          return (
            <g key={i} filter="url(#ledBloom)">
              {/* Shadow beneath bulb */}
              <circle cx={lx} cy={ly + 1.5} r={7} fill="rgba(0,0,0,0.35)"/>
              {/* Bloom halo */}
              <circle cx={lx} cy={ly} r={8.5} fill={isAlt ? "rgba(255,200,80,0.25)" : "rgba(180,210,255,0.25)"}/>
              {/* Main bulb */}
              <circle cx={lx} cy={ly} r={6} fill={tint}/>
              {/* Glass dome ring */}
              <circle cx={lx} cy={ly} r={6} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1}/>
              {/* Specular highlight */}
              <circle cx={lx - 2} cy={ly - 2} r={2} fill="rgba(255,255,255,0.85)"/>
            </g>
          )
        })}

        {/* ══ HUB RING (metallic separator) ═══════════════════════════════════════ */}
        <circle cx={CX} cy={CY} r={INNER + 8}  fill="url(#hubRing)"/>
        <circle cx={CX} cy={CY} r={INNER + 8}  fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1.5}/>
        <circle cx={CX} cy={CY} r={INNER + 3}  fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth={2}/>

        {/* ══ CENTER BUTTON ════════════════════════════════════════════════════════ */}
        {/* Drop shadow */}
        <circle cx={CX} cy={CY + 4} r={INNER + 1} fill="rgba(0,0,0,0.3)" filter="url(#hubDrop)"/>
        {/* Body */}
        <circle cx={CX} cy={CY} r={INNER} fill="url(#centerGrad)"/>
        {/* Gloss highlight */}
        <circle cx={CX} cy={CY} r={INNER} fill="url(#centerGloss)"/>
        {/* Inner bevel ring */}
        <circle cx={CX} cy={CY} r={INNER}     fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5}/>
        <circle cx={CX} cy={CY} r={INNER - 4} fill="none" stroke="rgba(0,0,0,0.15)"       strokeWidth={1}/>
        {/* Oval gloss shape */}
        <ellipse cx={CX} cy={CY - 15} rx={28} ry={16} fill="rgba(255,255,255,0.3)"/>
        <ellipse cx={CX} cy={CY - 17} rx={18} ry={9}  fill="rgba(255,255,255,0.2)"/>

        {/* Refresh/spin circular arrow */}
        <path
          d="M-15,-3 A 15,15 0 1 1 15,-3"
          transform={`translate(${CX},${CY - 10})`}
          fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.8" strokeLinecap="round"
        />
        <polygon
          points="15,-3 11,-9 19,-9"
          transform={`translate(${CX},${CY - 10})`}
          fill="rgba(255,255,255,0.9)"
        />

        {/* SPIN text — with tight shadow for legibility */}
        <text x={CX} y={CY + 12} textAnchor="middle" dominantBaseline="middle"
          fontSize={17} fontWeight="900" fill="rgba(0,0,0,0.25)"
          fontFamily="'Arial Black', Arial, sans-serif" letterSpacing="2">
          SPIN
        </text>
        <text x={CX} y={CY + 10} textAnchor="middle" dominantBaseline="middle"
          fontSize={17} fontWeight="900" fill="white"
          fontFamily="'Arial Black', Arial, sans-serif" letterSpacing="2">
          SPIN
        </text>
        <text x={CX} y={CY + 28} textAnchor="middle" dominantBaseline="middle"
          fontSize={9} fill="rgba(255,255,255,0.85)" fontFamily="Arial, sans-serif">
          Good luck!
        </text>
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

  // ── wheel animation ─────────────────────────────���──────────────────────────
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
            <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 bg-gradient-to-br from-[#1a0533] via-[#2d0a4e] to-[#0f172a] relative overflow-hidden">
              {/* Starfield dots */}
              {[...Array(18)].map((_, i) => (
                <div key={i} className="absolute rounded-full bg-white opacity-20 animate-pulse"
                  style={{
                    width: `${2 + (i % 3)}px`, height: `${2 + (i % 3)}px`,
                    top: `${(i * 37 + 11) % 95}%`, left: `${(i * 53 + 7) % 95}%`,
                    animationDelay: `${(i * 0.4) % 3}s`, animationDuration: `${2 + (i % 3)}s`,
                  }}
                />
              ))}
              {/* Centre radial glow behind wheel */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.25)_0%,rgba(168,85,247,0.12)_45%,transparent_70%)] pointer-events-none" />
              {/* Bottom floor glow */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-20 bg-gradient-to-r from-orange-500/30 via-pink-500/20 to-purple-500/30 rounded-full blur-3xl pointer-events-none" />

              {/* Premium 3D Diamond pointer */}
              <div className="relative z-10 mb-[-18px] flex flex-col items-center drop-shadow-2xl">
                <svg width="56" height="68" viewBox="0 0 56 68">
                  <defs>
                    <linearGradient id="ptrBody" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%"   stopColor="#ffffff"/>
                      <stop offset="100%" stopColor="#e2e8f0"/>
                    </linearGradient>
                    <linearGradient id="ptrGem" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%"   stopColor="#f9a8d4"/>
                      <stop offset="40%"  stopColor="#ec4899"/>
                      <stop offset="100%" stopColor="#9d174d"/>
                    </linearGradient>
                    <filter id="ptrShadow">
                      <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(236,72,153,0.45)"/>
                    </filter>
                  </defs>
                  {/* White teardrop body */}
                  <ellipse cx="28" cy="24" rx="22" ry="22" fill="url(#ptrBody)" stroke="#f9a8d4" strokeWidth="2" filter="url(#ptrShadow)"/>
                  <polygon points="6,38 50,38 28,68" fill="url(#ptrBody)" stroke="#f9a8d4" strokeWidth="1.5" strokeLinejoin="round"/>
                  {/* Inner gem — 4-facet diamond */}
                  <polygon points="28,7 40,22 28,37 16,22" fill="url(#ptrGem)"/>
                  {/* Top facet highlight */}
                  <polygon points="28,7 40,22 28,16 16,22" fill="rgba(255,255,255,0.45)"/>
                  {/* Bottom facet shadow */}
                  <polygon points="28,37 40,22 28,28 16,22" fill="rgba(0,0,0,0.15)"/>
                  {/* Horizontal facet line */}
                  <line x1="16" y1="22" x2="40" y2="22" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
                  {/* Specular dot */}
                  <circle cx="23" cy="14" r="3" fill="rgba(255,255,255,0.6)"/>
                </svg>
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
