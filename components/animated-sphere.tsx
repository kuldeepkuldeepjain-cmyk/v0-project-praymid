"use client"

import React, { useEffect, useRef } from "react"
import { FlowChainLogo } from "@/components/flowchain-logo"

// ─── Reward Card Component ───────────────────────────────────────────────────────
function RewardCard({
  icon,
  title,
  value,
  sub,
  bg,
  delay,
  dark = false,
}: {
  icon: React.ReactNode
  title?: string
  value: string
  sub?: string
  bg: string
  delay: number
  dark?: boolean
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3 shadow-xl"
      style={{
        background: bg,
        border: dark ? "1.5px solid rgba(255,255,255,0.15)" : "1.5px solid rgba(255,255,255,0.6)",
        backdropFilter: "blur(12px)",
        animation: `cardFloat 3.5s ease-in-out ${delay}s infinite alternate`,
        boxShadow: dark
          ? "0 8px 32px 0 rgba(100,60,200,0.4), inset 0 1px 0 rgba(255,255,255,0.1)"
          : "0 8px 32px 0 rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.7)",
        width: "220px",
      }}
    >
      <div className="flex-shrink-0 text-2xl">{icon}</div>
      <div className="flex-1 min-w-0">
        {title && (
          <div
            className="text-xs font-semibold mb-0.5"
            style={{ color: dark ? "rgba(255,255,255,0.7)" : "#64748b" }}
          >
            {title}
          </div>
        )}
        <div
          className="font-black leading-tight"
          style={{
            fontSize: "1.15rem",
            color: dark ? "#fbbf24" : "#c2410c",
          }}
        >
          {value}
        </div>
        {sub && (
          <div
            className="text-xs font-medium"
            style={{ color: dark ? "rgba(255,255,255,0.6)" : "#64748b" }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Glowing Orb Light Spot ───────────────────────────────────────────────────
function OrbLightSpot({ angle, distance, delay }: { angle: number; distance: number; delay: number }) {
  const x = Math.cos((angle * Math.PI) / 180) * distance
  const y = Math.sin((angle * Math.PI) / 180) * distance

  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: 8,
        height: 8,
        background: "radial-gradient(circle, rgba(255,220,120,0.95) 0%, rgba(255,150,80,0.5) 100%)",
        boxShadow: "0 0 16px 3px rgba(255,150,80,0.7)",
        left: "50%",
        top: "50%",
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
        animation: `lightPulse 3s ease-in-out ${delay}s infinite`,
      }}
    />
  )
}

// ─── Sparkle Particle ─────────────────────────────────────────────────────────────
function Sparkle({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute rounded-full bg-white pointer-events-none"
      style={{
        width: 3,
        height: 3,
        boxShadow: "0 0 8px 1.5px rgba(255,255,255,0.9)",
        ...style,
      }}
    />
  )
}

// ─── Crypto Coin ──────────────────────────────────────────────────────────────
function CryptoCoin({
  label,
  bg,
  color,
  symbol,
  orbitRadius,
  orbitDuration,
  orbitDelay,
  size = 56,
}: {
  label: string
  bg: string
  color: string
  symbol: string
  orbitRadius: number
  orbitDuration: number
  orbitDelay: number
  size?: number
}) {
  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        width: 0,
        height: 0,
        animation: `orbit ${orbitDuration}s linear ${orbitDelay}s infinite`,
      }}
    >
      {/* Coin placed at orbit radius */}
      <div
        className="absolute flex flex-col items-center justify-center rounded-full shadow-lg font-black text-center border-2 border-white/40"
        style={{
          width: size,
          height: size,
          background: bg,
          color,
          left: orbitRadius,
          top: -size / 2,
          transform: "translateX(-50%)",
          boxShadow: `0 0 24px 8px ${color}77, inset -2px -2px 8px rgba(0,0,0,0.4), inset 2px 2px 8px rgba(255,255,255,0.5)`,
          fontSize: size * 0.36,
          animation: `coinBob 2.5s ease-in-out infinite alternate`,
          animationDelay: `${orbitDelay}s`,
          position: "relative",
        }}
      >
        <div style={{ position: "relative", zIndex: 2 }}>{symbol}</div>
        {/* Inner highlight for 3D effect */}
        <div
          className="absolute rounded-full"
          style={{
            width: size * 0.6,
            height: size * 0.6,
            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5) 0%, transparent 70%)`,
            top: size * 0.1,
            left: size * 0.1,
            pointerEvents: "none",
          }}
        />
        <span
          className="absolute -bottom-6 whitespace-nowrap text-white font-bold drop-shadow-md"
          style={{ fontSize: 10, letterSpacing: "0.04em" }}
        >
          {label}
        </span>
      </div>
    </div>
  )
}

// ─── Network Globe Lines (SVG) ────────────────────────────────────────────────
function NetworkGlobeLines() {
  return (
    <svg
      viewBox="0 0 100 100"
      width={320}
      height={320}
      className="absolute pointer-events-none"
      style={{
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        animation: "globeSpin 20s linear infinite",
        opacity: 0.7,
      }}
    >
      {/* Latitude lines */}
      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(147,51,234,0.3)" strokeWidth="0.4" />
      <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(147,51,234,0.25)" strokeWidth="0.4" />
      <circle cx="50" cy="50" r="25" fill="none" stroke="rgba(147,51,234,0.2)" strokeWidth="0.4" />

      {/* Longitude lines */}
      <line x1="50" y1="5" x2="50" y2="95" stroke="rgba(147,51,234,0.2)" strokeWidth="0.4" />
      <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(147,51,234,0.2)" strokeWidth="0.4" />
      <line x1="25" y1="14" x2="75" y2="86" stroke="rgba(147,51,234,0.15)" strokeWidth="0.4" />
      <line x1="75" y1="14" x2="25" y2="86" stroke="rgba(147,51,234,0.15)" strokeWidth="0.4" />

      {/* Connection dots and nodes */}
      {[20, 50, 80].map((x) =>
        [20, 50, 80].map((y) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r="1.5"
            fill="rgba(220,180,255,0.7)"
            className="animate-pulse"
          />
        ))
      )}

      {/* Glowing connection lines */}
      <line x1="20" y1="20" x2="80" y2="80" stroke="rgba(168,85,247,0.4)" strokeWidth="0.5" />
      <line x1="80" y1="20" x2="20" y2="80" stroke="rgba(168,85,247,0.4)" strokeWidth="0.5" />
    </svg>
  )
}

// ─── Main AnimatedSphere Component ────────────────────────────────────────────
export function AnimatedSphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    resize()
    window.addEventListener("resize", resize)

    let animationId: number
    const startTime = Date.now()

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000
      const width = canvas.offsetWidth
      const height = canvas.offsetHeight
      const centerX = width / 2
      const centerY = height / 2

      ctx.clearRect(0, 0, width, height)

      // Draw dynamic sparkles
      const sparkleCount = 32
      for (let i = 0; i < sparkleCount; i++) {
        const angle = (i / sparkleCount) * Math.PI * 2 + elapsed * 0.3
        const distance = 200 + Math.sin(elapsed * 0.8 + i) * 40
        const x = centerX + Math.cos(angle) * distance
        const y = centerY + Math.sin(angle) * distance

        const opacity = Math.sin(elapsed * 2 + i) * 0.3 + 0.5
        ctx.fillStyle = `rgba(255,255,255,${opacity})`
        ctx.beginPath()
        ctx.arc(x, y, 1.5, 0, Math.PI * 2)
        ctx.fill()

        // Sparkle glow
        ctx.strokeStyle = `rgba(255,255,255,${opacity * 0.4})`
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.stroke()
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <style>{`
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes coinBob {
          from { transform: translateX(-50%) translateY(0px) scale(1); }
          to   { transform: translateX(-50%) translateY(-12px) scale(1.1); }
        }
        @keyframes cardFloat {
          from { transform: translateY(0px); }
          to   { transform: translateY(-10px); }
        }
        @keyframes globeSpin {
          from { transform: translate(-50%, -50%) rotateZ(0deg); }
          to   { transform: translate(-50%, -50%) rotateZ(360deg); }
        }
        @keyframes orbitRingSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbitNodePulse {
          0%, 100% { r: 2.5; opacity: 0.6; }
          50% { r: 4; opacity: 1; }
        }
        @keyframes lightPulse {
          0%, 100% { opacity: 0.4; transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.8); }
          50% { opacity: 1; transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.2); }
        }
        @keyframes orbPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 40px 15px rgba(239,68,68,0.3); }
          50% { transform: translate(-50%, -50%) scale(1.05); box-shadow: 0 0 60px 25px rgba(239,68,68,0.5); }
        }
        @keyframes giftBounce {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
      `}</style>

      {/* Canvas for dynamic sparkles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Main sphere container */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        style={{ perspective: "1000px" }}
      >
        {/* Network Globe background */}
        <NetworkGlobeLines />

        {/* Orbiting crypto coins */}
        {/* USDT — green, fast inner */}
        <CryptoCoin
          label="USDT"
          bg="linear-gradient(135deg, #065f46 0%, #10b981 100%)"
          color="#d1fae5"
          symbol="₮"
          orbitRadius={140}
          orbitDuration={20}
          orbitDelay={0}
          size={52}
        />

        {/* TRX — red, medium-fast */}
        <CryptoCoin
          label="TRX"
          bg="linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)"
          color="#fecaca"
          symbol="⟡"
          orbitRadius={165}
          orbitDuration={24}
          orbitDelay={-2}
          size={54}
        />

        {/* BTC — gold, medium-slow */}
        <CryptoCoin
          label="BTC"
          bg="linear-gradient(135deg, #78350f 0%, #f59e0b 100%)"
          color="#fde68a"
          symbol="₿"
          orbitRadius={175}
          orbitDuration={26}
          orbitDelay={-3}
          size={56}
        />

        {/* ETH — blue, slow outer */}
        <CryptoCoin
          label="ETH"
          bg="linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)"
          color="#bfdbfe"
          symbol="Ξ"
          orbitRadius={195}
          orbitDuration={28}
          orbitDelay={-4}
          size={54}
        />

        {/* Equatorial glowing ring with nodes */}
        <div
          className="absolute rounded-full border-2"
          style={{
            width: 300,
            height: 300,
            borderColor: "rgba(168,85,247,0.5)",
            boxShadow: "0 0 24px 3px rgba(168,85,247,0.6)",
            animation: "orbitRingSpin 30s linear infinite",
          }}
        >
          {/* Bright nodes on ring */}
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <div
              key={angle}
              className="absolute w-3 h-3 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(244,114,182,1) 0%, rgba(168,85,247,0.7) 100%)",
                boxShadow: "0 0 12px 2px rgba(244,114,182,0.8)",
                left: "50%",
                top: "50%",
                transform: `rotate(${angle}deg) translateX(150px) translate(-50%, -50%)`,
                animation: `orbitNodePulse 1.8s ease-in-out ${angle / 60}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Main orb shell */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 280,
            height: 280,
            background:
              "radial-gradient(circle at 35% 35%, rgba(200,100,255,0.8) 0%, rgba(100,50,200,0.6) 40%, rgba(50,20,150,0.4) 100%)",
            boxShadow:
              "0 0 60px 20px rgba(168,85,247,0.5), inset -20px -20px 60px rgba(0,0,0,0.4), inset 20px 20px 60px rgba(255,255,255,0.2)",
            animation: "orbPulse 4s ease-in-out infinite",
          }}
        >
          {/* Inner highlight */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: "70%",
              height: "55%",
              top: "8%",
              left: "15%",
              background:
                "radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.22) 0%, transparent 70%)",
            }}
          />

          {/* Glowing light spots on orb surface */}
          <OrbLightSpot angle={45} distance={130} delay={0} />
          <OrbLightSpot angle={135} distance={135} delay={0.3} />
          <OrbLightSpot angle={225} distance={132} delay={0.6} />
          <OrbLightSpot angle={315} distance={136} delay={0.9} />
          <OrbLightSpot angle={90} distance={138} delay={1.2} />
          <OrbLightSpot angle={180} distance={134} delay={1.5} />
          <OrbLightSpot angle={270} distance={137} delay={1.8} />
          <OrbLightSpot angle={0} distance={135} delay={0.15} />

          {/* ── FlowChain branding with logo and reward cards ── */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ marginTop: -16 }}>
            {/* FlowChain Logo Component */}
            <div className="filter drop-shadow-[0_0_16px_rgba(239,68,68,0.5)] transform scale-110">
              <FlowChainLogo variant="icon" size="lg" />
            </div>

            {/* Reward cards stacked inside orb */}
            <div className="flex flex-col gap-2">
              {/* Card 1: Instant Bonus */}
              <RewardCard
                icon="🎁"
                title="Instant Bonus"
                value="$50 USDT"
                bg="rgba(255,248,235,0.94)"
                delay={0}
              />
              {/* Card 2: Spin & Win */}
              <RewardCard
                icon="🎡"
                title="Spin & Win Up To"
                value="20x REWARDS"
                bg="linear-gradient(135deg, rgba(76,29,149,0.94) 0%, rgba(109,40,217,0.94) 100%)"
                delay={0.5}
                dark
              />
              {/* Card 3: 0% Fees */}
              <RewardCard
                icon="🛡️"
                value="0% PLATFORM FEES"
                bg="linear-gradient(135deg, rgba(15,23,42,0.88) 0%, rgba(30,58,138,0.88) 100%)"
                delay={1}
                dark
              />
            </div>

            {/* Central glow point */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 14,
                height: 14,
                background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(239,68,68,0.7) 100%)",
                boxShadow: "0 0 24px 10px rgba(239,68,68,0.6)",
                animation: "orbPulse 4s ease-in-out infinite",
                bottom: 20,
              }}
            />
          </div>
        </div>

        {/* Pedestal with multiple rings */}
        <div className="absolute bottom-0 pointer-events-none">
          {/* Base ring 1 */}
          <div
            className="rounded-full border-4"
            style={{
              width: 200,
              height: 60,
              borderColor: "rgba(200,150,255,0.6)",
              boxShadow: "0 8px 20px rgba(168,85,247,0.4), inset 0 2px 8px rgba(255,255,255,0.2)",
              transform: "skewY(-3deg) translateZ(0)",
            }}
          />
          {/* Base ring 2 */}
          <div
            className="rounded-full border-4 absolute"
            style={{
              width: 240,
              height: 70,
              borderColor: "rgba(168,85,247,0.5)",
              boxShadow: "0 12px 30px rgba(168,85,247,0.3), inset 0 2px 8px rgba(255,255,255,0.15)",
              transform: "translateY(8px) skewY(-3deg) translateZ(0)",
              left: "-20px",
            }}
          />
          {/* Base ring 3 */}
          <div
            className="rounded-full border-4 absolute"
            style={{
              width: 280,
              height: 80,
              borderColor: "rgba(139,92,246,0.4)",
              boxShadow: "0 16px 40px rgba(139,92,246,0.3), inset 0 2px 8px rgba(255,255,255,0.1)",
              transform: "translateY(16px) skewY(-3deg) translateZ(0)",
              left: "-40px",
            }}
          />
          {/* Ground glow */}
          <div
            className="rounded-full pointer-events-none"
            style={{
              width: 320,
              height: 80,
              background:
                "radial-gradient(ellipse at center, rgba(168,85,247,0.4) 0%, rgba(168,85,247,0.2) 40%, transparent 100%)",
              filter: "blur(20px)",
              transform: "translateY(30px)",
            }}
          />
        </div>

        {/* Gift box (bottom right) */}
        <div
          className="absolute pointer-points-none rounded-xl flex items-center justify-center font-black shadow-xl relative"
          style={{
            right: "8%",
            bottom: "12%",
            width: 56,
            height: 56,
            background: "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)",
            border: "3px solid rgba(255,255,255,0.4)",
            boxShadow: "0 8px 24px rgba(147,51,234,0.6), inset -2px -2px 6px rgba(0,0,0,0.2), inset 2px 2px 6px rgba(255,255,255,0.3)",
            fontSize: 28,
            animation: "giftBounce 2.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite",
          }}
        >
          🎁
          {/* Gift box highlight */}
          <div
            className="absolute rounded-xl"
            style={{
              inset: 0,
              background: "radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 60%)",
              pointerEvents: "none",
            }}
          />
          {/* Gold ribbon bow */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -top-3 rounded-full"
            style={{
              width: 14,
              height: 14,
              background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
              boxShadow: "0 0 8px 1.5px rgba(251,191,36,0.7)",
            }}
          />
          {/* Horizontal ribbon */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2"
            style={{
              width: 56,
              height: 5,
              background: "linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)",
              boxShadow: "0 2px 6px rgba(251,191,36,0.5)",
            }}
          />
          {/* Vertical ribbon */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2"
            style={{
              width: 5,
              height: 56,
              background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)",
              boxShadow: "0 2px 6px rgba(251,191,36,0.5)",
            }}
          />
        </div>

        {/* Small floating mini coin (bottom left) */}
        <div
          className="absolute pointer-events-none rounded-full flex items-center justify-center font-black shadow-xl relative"
          style={{
            left: "6%",
            bottom: "14%",
            width: 46,
            height: 46,
            background: "linear-gradient(135deg, #78350f 0%, #f59e0b 100%)",
            color: "#fde68a",
            fontSize: 22,
            boxShadow: "0 0 18px 5px rgba(245,158,11,0.7), inset -1.5px -1.5px 6px rgba(0,0,0,0.4), inset 1.5px 1.5px 6px rgba(255,255,255,0.3)",
            animation: "giftBounce 2.8s ease-in-out 0.4s infinite",
          }}
        >
          ₿
          {/* Coin highlight */}
          <div
            className="absolute rounded-full"
            style={{
              inset: 0,
              background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </div>
  )
}
