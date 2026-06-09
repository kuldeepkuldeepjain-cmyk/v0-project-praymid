"use client"

import React, { useEffect, useRef } from "react"

// ─── Sparkle Particle ─────────────────────────────────────────────────────────
function Sparkle({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute rounded-full bg-white pointer-events-none"
      style={{ width: 3, height: 3, ...style }}
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
  size = 52,
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
        className="absolute flex flex-col items-center justify-center rounded-full shadow-lg font-black text-center border-2 border-white/30"
        style={{
          width: size,
          height: size,
          background: bg,
          color,
          left: orbitRadius,
          top: -size / 2,
          transform: "translateX(-50%)",
          boxShadow: `0 0 16px 4px ${color}55`,
          fontSize: size * 0.36,
          animation: `coinBob 2.5s ease-in-out infinite alternate`,
          animationDelay: `${orbitDelay}s`,
        }}
      >
        {symbol}
        <span
          className="absolute -bottom-5 whitespace-nowrap text-white font-bold"
          style={{ fontSize: 9, letterSpacing: "0.04em" }}
        >
          {label}
        </span>
      </div>
    </div>
  )
}

// ─── Reward Card ──────────────────────────────────────────────────────────────
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
      className="flex items-center gap-3 rounded-xl px-4 py-3 shadow-xl w-full"
      style={{
        background: bg,
        border: dark ? "1.5px solid rgba(255,255,255,0.15)" : "1.5px solid rgba(255,255,255,0.6)",
        backdropFilter: "blur(12px)",
        animation: `cardFloat 3s ease-in-out ${delay}s infinite alternate`,
        boxShadow: dark
          ? "0 8px 32px 0 rgba(100,60,200,0.4), inset 0 1px 0 rgba(255,255,255,0.1)"
          : "0 8px 32px 0 rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.7)",
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

// ─── Network Globe Lines (SVG) ────────────────────────────────────────────────
function NetworkGlobe() {
  return (
    <svg
      viewBox="0 0 320 320"
      className="w-full h-full opacity-70"
      style={{ animation: "globeSpin 18s linear infinite" }}
    >
      {/* Globe outline */}
      <ellipse cx="160" cy="160" rx="130" ry="130" fill="none" stroke="rgba(147,112,219,0.4)" strokeWidth="1.5" />
      {/* Latitude lines */}
      {[0.35, 0.6, 0.82].map((ry, i) => (
        <ellipse key={i} cx="160" cy="160" rx="130" ry={130 * ry} fill="none" stroke="rgba(100,150,255,0.25)" strokeWidth="0.8" />
      ))}
      {/* Longitude arcs */}
      {[0, 30, 60, 90, 120, 150].map((angle, i) => (
        <ellipse
          key={i}
          cx="160"
          cy="160"
          rx={130 * Math.abs(Math.cos((angle * Math.PI) / 180))}
          ry="130"
          fill="none"
          stroke="rgba(147,112,219,0.2)"
          strokeWidth="0.8"
          transform={`rotate(${angle} 160 160)`}
        />
      ))}
      {/* Connection dots */}
      {[
        [100, 90], [190, 75], [230, 140], [200, 210],
        [120, 230], [70, 175], [155, 50], [255, 170],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="3" fill="rgba(220,180,255,0.8)" style={{ animation: `dotPulse 2s ease-in-out ${i * 0.25}s infinite alternate` }} />
      ))}
      {/* Connection lines between dots */}
      <line x1="100" y1="90" x2="190" y2="75" stroke="rgba(180,130,255,0.3)" strokeWidth="0.8" />
      <line x1="190" y1="75" x2="230" y2="140" stroke="rgba(180,130,255,0.3)" strokeWidth="0.8" />
      <line x1="230" y1="140" x2="200" y2="210" stroke="rgba(180,130,255,0.3)" strokeWidth="0.8" />
      <line x1="200" y1="210" x2="120" y2="230" stroke="rgba(180,130,255,0.3)" strokeWidth="0.8" />
      <line x1="120" y1="230" x2="70" y2="175" stroke="rgba(180,130,255,0.3)" strokeWidth="0.8" />
      <line x1="70" y1="175" x2="100" y2="90" stroke="rgba(180,130,255,0.3)" strokeWidth="0.8" />
      <line x1="155" y1="50" x2="255" y2="170" stroke="rgba(180,130,255,0.3)" strokeWidth="0.8" />
      <line x1="100" y1="90" x2="255" y2="170" stroke="rgba(180,130,255,0.3)" strokeWidth="0.8" />
    </svg>
  )
}

// ─── Pedestal ─────────────────────────────────────────────────────────────────
function Pedestal() {
  return (
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none" style={{ zIndex: 2 }}>
      {/* Glow pool at base */}
      <div
        className="rounded-full"
        style={{
          width: 180,
          height: 18,
          background: "radial-gradient(ellipse, rgba(168,85,247,0.7) 0%, transparent 80%)",
          filter: "blur(8px)",
          marginBottom: -6,
        }}
      />
      {/* Step 1 – widest */}
      <div
        className="rounded-full"
        style={{
          width: 200,
          height: 20,
          background: "linear-gradient(180deg, #a78bfa 0%, #7c3aed 60%, #4c1d95 100%)",
          boxShadow: "0 4px 20px rgba(124,58,237,0.5)",
        }}
      />
      {/* Step 2 */}
      <div
        className="rounded-full"
        style={{
          width: 160,
          height: 18,
          background: "linear-gradient(180deg, #c4b5fd 0%, #8b5cf6 60%, #5b21b6 100%)",
          boxShadow: "0 4px 16px rgba(139,92,246,0.4)",
        }}
      />
      {/* Step 3 – narrowest */}
      <div
        className="rounded-full"
        style={{
          width: 120,
          height: 16,
          background: "linear-gradient(180deg, #ddd6fe 0%, #a78bfa 60%, #7c3aed 100%)",
          boxShadow: "0 4px 12px rgba(167,139,250,0.4)",
        }}
      />
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function AnimatedSphere() {
  const sparkles = Array.from({ length: 24 }, (_, i) => ({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    opacity: Math.random() * 0.7 + 0.3,
    animation: `sparkleTwinkle ${1.2 + Math.random() * 2}s ease-in-out ${Math.random() * 2}s infinite alternate`,
    scale: 0.5 + Math.random() * 1.5,
  }))

  return (
    <>
      {/* CSS keyframes injected once */}
      <style>{`
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes orbitReverse {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes coinBob {
          from { transform: translateX(-50%) translateY(0px) scale(1); }
          to   { transform: translateX(-50%) translateY(-10px) scale(1.08); }
        }
        @keyframes cardFloat {
          from { transform: translateY(0px); }
          to   { transform: translateY(-8px); }
        }
        @keyframes globeSpin {
          from { transform: rotateY(0deg); }
          to   { transform: rotateY(360deg); }
        }
        @keyframes dotPulse {
          from { opacity: 0.4; r: 2; }
          to   { opacity: 1;   r: 4; }
        }
        @keyframes sparkleTwinkle {
          from { opacity: 0.2; transform: scale(0.5); }
          to   { opacity: 1;   transform: scale(1.5); }
        }
        @keyframes orbPulse {
          0%, 100% { box-shadow: 0 0 60px 20px rgba(168,85,247,0.35), 0 0 120px 40px rgba(109,40,217,0.2), inset 0 0 60px rgba(216,180,254,0.1); }
          50%       { box-shadow: 0 0 80px 30px rgba(168,85,247,0.55), 0 0 160px 60px rgba(109,40,217,0.3), inset 0 0 80px rgba(216,180,254,0.18); }
        }
        @keyframes ringRotate1 {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes ringRotate2 {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(-360deg); }
        }
        @keyframes giftBounce {
          0%, 100% { transform: translateY(0px) rotate(-6deg); }
          50%       { transform: translateY(-14px) rotate(6deg); }
        }
        @keyframes outerGlow {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.8; }
        }
      `}</style>

      <div className="relative w-full h-full min-h-[520px] flex items-center justify-center select-none">

        {/* ── Far background globe ─────────────────────────────── */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 280,
            height: 280,
            top: "10%",
            right: "2%",
            opacity: 0.5,
          }}
        >
          <NetworkGlobe />
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle at 40% 35%, rgba(100,149,255,0.18) 0%, transparent 70%)",
              animation: "outerGlow 4s ease-in-out infinite",
            }}
          />
        </div>

        {/* ── Outer ambient glow rings ──────────────────────────── */}
        <div
          className="absolute rounded-full pointer-events-none border border-purple-400/20"
          style={{
            width: 520,
            height: 520,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            animation: "orbPulse 4s ease-in-out infinite",
          }}
        />
        {/* Rotating dashed ring 1 */}
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            width: 460,
            height: 460,
            left: "50%",
            top: "50%",
            border: "1.5px dashed rgba(192,132,252,0.25)",
            animation: "ringRotate1 22s linear infinite",
          }}
        />
        {/* Rotating dashed ring 2 */}
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            width: 380,
            height: 380,
            left: "50%",
            top: "50%",
            border: "1px dashed rgba(147,197,253,0.2)",
            animation: "ringRotate2 34s linear infinite",
          }}
        />

        {/* ── Sparkle particles ────────────────────────────────── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {sparkles.map((s, i) => (
            <Sparkle
              key={i}
              style={{
                top: s.top,
                left: s.left,
                opacity: s.opacity,
                transform: `scale(${s.scale})`,
                animation: s.animation,
              }}
            />
          ))}
        </div>

        {/* ── Orbiting crypto coins ─────────────────────────────── */}
        <div className="absolute" style={{ width: 0, height: 0, left: "50%", top: "50%" }}>
          {/* USDT — green, outer orbit */}
          <CryptoCoin
            label="USDT"
            bg="linear-gradient(135deg, #064e3b 0%, #059669 100%)"
            color="#6ee7b7"
            symbol="₮"
            orbitRadius={200}
            orbitDuration={14}
            orbitDelay={0}
            size={52}
          />
          {/* TRX — red, medium orbit */}
          <CryptoCoin
            label="TRX"
            bg="linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)"
            color="#fca5a5"
            symbol="◈"
            orbitRadius={175}
            orbitDuration={18}
            orbitDelay={-6}
            size={48}
          />
          {/* BTC — gold, inner orbit */}
          <CryptoCoin
            label="BTC"
            bg="linear-gradient(135deg, #78350f 0%, #f59e0b 100%)"
            color="#fde68a"
            symbol="₿"
            orbitRadius={210}
            orbitDuration={22}
            orbitDelay={-12}
            size={54}
          />
          {/* ETH — blue, slow outer */}
          <CryptoCoin
            label="ETH"
            bg="linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)"
            color="#bfdbfe"
            symbol="Ξ"
            orbitRadius={190}
            orbitDuration={28}
            orbitDelay={-4}
            size={46}
          />
        </div>

        {/* ── Main orb shell ───────────────────────────────────── */}
        <div
          className="relative flex flex-col items-center"
          style={{ zIndex: 10, marginBottom: 54 }}
        >
          <div
            className="relative flex flex-col items-center justify-center rounded-full"
            style={{
              width: 310,
              height: 310,
              background:
                "radial-gradient(ellipse at 35% 28%, rgba(216,180,254,0.22) 0%, rgba(139,92,246,0.18) 35%, rgba(109,40,217,0.28) 70%, rgba(76,29,149,0.4) 100%)",
              border: "2px solid rgba(216,180,254,0.35)",
              backdropFilter: "blur(2px)",
              boxShadow:
                "0 0 60px 20px rgba(168,85,247,0.35), 0 0 120px 40px rgba(109,40,217,0.2), inset 0 0 60px rgba(216,180,254,0.1)",
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
                  "radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.18) 0%, transparent 70%)",
              }}
            />

            {/* ── FlowChain branding ── */}
            <div className="flex flex-col items-center mb-3" style={{ marginTop: -8 }}>
              {/* Logo mark */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-1 shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #ef4444 0%, #f97316 50%, #3b82f6 100%)",
                  boxShadow: "0 0 12px 4px rgba(239,68,68,0.4)",
                }}
              >
                <svg viewBox="0 0 32 32" width="22" height="22" fill="none">
                  <circle cx="10" cy="11" r="5" fill="#fff" opacity="0.9" />
                  <circle cx="22" cy="11" r="5" fill="#fff" opacity="0.9" />
                  <path d="M10 11 Q16 20 22 11" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  <path d="M8 14 Q16 24 24 14" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
              </div>
              <span
                className="font-black tracking-widest"
                style={{
                  fontSize: 11,
                  color: "#ef4444",
                  letterSpacing: "0.22em",
                  textShadow: "0 0 8px rgba(239,68,68,0.5)",
                }}
              >
                FLOWCHAIN
              </span>
            </div>

            {/* ── Reward cards stacked ── */}
            <div className="flex flex-col gap-2 w-56 px-1">
              {/* Card 1: Instant Bonus */}
              <RewardCard
                icon="🎁"
                title="Instant Bonus"
                value="$50 USDT"
                bg="rgba(255,248,235,0.92)"
                delay={0}
              />
              {/* Card 2: Spin & Win */}
              <RewardCard
                icon="🎡"
                title="Spin & Win Up To"
                value="20x REWARDS"
                bg="linear-gradient(135deg, rgba(76,29,149,0.92) 0%, rgba(109,40,217,0.92) 100%)"
                delay={0.5}
                dark
              />
              {/* Card 3: 0% Fees */}
              <RewardCard
                icon="🛡️"
                value="0% PLATFORM FEES"
                bg="linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(30,58,138,0.85) 100%)"
                delay={1}
                dark
              />
            </div>
          </div>

          {/* ── Pedestal ── */}
          <Pedestal />
        </div>

        {/* ── Floating gift box ─────────────────────────────────── */}
        <div
          className="absolute pointer-events-none"
          style={{
            right: "6%",
            bottom: "10%",
            animation: "giftBounce 3.5s ease-in-out infinite",
            zIndex: 12,
          }}
        >
          <div
            className="rounded-xl flex items-center justify-center shadow-xl"
            style={{
              width: 54,
              height: 54,
              background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
              border: "3px solid rgba(255,255,255,0.4)",
              boxShadow: "0 8px 24px rgba(124,58,237,0.5)",
              fontSize: 28,
            }}
          >
            🎁
          </div>
          {/* Ribbon */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -top-2"
            style={{
              width: 54,
              height: 6,
              background: "rgba(255,255,255,0.7)",
              borderRadius: 99,
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 left-0"
            style={{
              width: 6,
              height: 54,
              background: "rgba(255,255,255,0.7)",
              borderRadius: 99,
            }}
          />
        </div>

        {/* ── Small floating mini coin (bottom left) ────────────── */}
        <div
          className="absolute pointer-events-none rounded-full flex items-center justify-center font-black shadow-lg"
          style={{
            left: "8%",
            bottom: "22%",
            width: 38,
            height: 38,
            background: "linear-gradient(135deg, #78350f 0%, #f59e0b 100%)",
            color: "#fde68a",
            fontSize: 18,
            boxShadow: "0 0 12px 4px rgba(245,158,11,0.5)",
            animation: "giftBounce 2.8s ease-in-out 0.4s infinite",
          }}
        >
          ₿
        </div>

        {/* ── Bottom ambient ground glow ────────────────────────── */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none rounded-full"
          style={{
            width: 300,
            height: 30,
            background:
              "radial-gradient(ellipse, rgba(168,85,247,0.45) 0%, transparent 70%)",
            filter: "blur(12px)",
            animation: "outerGlow 3s ease-in-out infinite",
          }}
        />
      </div>
    </>
  )
}
