"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, PlusCircle, User, TrendingUp, Trophy } from "lucide-react"
import { useState, useEffect, useRef } from "react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
  const navRef = useRef<HTMLDivElement>(null)

  const navItems = [
    { href: "/participant/dashboard/activity", icon: Trophy, label: "Lead", color: "#F59E0B", gradient: "from-amber-400 to-yellow-500", glow: "shadow-amber-500/40" },
    { href: "/participant/dashboard/predict", icon: TrendingUp, label: "Pred", color: "#10B981", gradient: "from-emerald-400 to-teal-500", glow: "shadow-emerald-500/40" },
    { href: "/participant/dashboard", icon: Home, label: "Home", color: "#7c3aed", gradient: "from-purple-500 to-indigo-600", glow: "shadow-purple-500/40" },
    { href: "/participant/dashboard/contribute", icon: PlusCircle, label: "Cont", color: "#E85D3B", gradient: "from-orange-400 to-red-500", glow: "shadow-orange-500/40" },
    { href: "/participant/dashboard/profile", icon: User, label: "Prof", color: "#22d3ee", gradient: "from-cyan-400 to-blue-500", glow: "shadow-cyan-500/40" },
  ]

  const isActive = (href: string) => {
    if (href === "/participant/dashboard") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  useEffect(() => {
    const index = navItems.findIndex((item) => isActive(item.href))
    const activeIndex = index >= 0 ? index : 2

    if (navRef.current) {
      const navWidth = navRef.current.offsetWidth
      const itemWidth = navWidth / navItems.length
      setIndicatorStyle({
        left: activeIndex * itemWidth + itemWidth / 2 - 24,
        width: 48,
      })
    }
  }, [pathname])

  const [bouncingIndex, setBouncingIndex] = useState<number | null>(null)

  const handleNavClick = (index: number) => {
    setBouncingIndex(index)
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
    setTimeout(() => setBouncingIndex(null), 300)
  }

  const [particles, setParticles] = useState<
    { id: number; left: string; delay: string; size: number; color: string; duration: string }[]
  >([])

  useEffect(() => {
    setParticles(
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 15}s`,
        size: Math.random() * 6 + 3,
        color: ["#E85D3B", "#7c3aed", "#22d3ee", "#10b981"][Math.floor(Math.random() * 4)],
        duration: `${15 + Math.random() * 10}s`,
      }))
    )
  }, [])

  return (
    <div className="min-h-screen pb-20 relative overflow-hidden w-full max-w-[430px] mx-auto" style={{ background: "#030712", boxShadow: "0 0 60px rgba(0,0,0,0.8)" }}>
      {/* Deep space ambient layers */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 120% 60% at 50% -10%, rgba(124,58,237,0.18) 0%, transparent 55%)" }} />
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at -20% 60%, rgba(34,211,238,0.06) 0%, transparent 50%)" }} />
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 50% at 120% 80%, rgba(16,185,129,0.06) 0%, transparent 50%)" }} />

      {/* Depth grid overlay */}
      <div className="fixed inset-0 pointer-events-none depth-grid opacity-60" />

      {/* Slow pulsing deep orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb absolute w-[600px] h-[600px] -top-48 -left-32 bg-gradient-to-br from-violet-600/12 to-transparent" style={{ animationDelay: "0s" }} />
        <div className="glow-orb absolute w-[500px] h-[500px] top-1/2 -right-48 bg-gradient-to-br from-cyan-500/8 to-transparent" style={{ animationDelay: "2s" }} />
        <div className="glow-orb absolute w-[400px] h-[400px] bottom-0 left-1/3 bg-gradient-to-br from-indigo-500/8 to-transparent" style={{ animationDelay: "4s" }} />
      </div>

      {/* Floating micro-particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[5]">
        {particles.map((p) => (
          <div
            key={p.id}
            className="floating-particle"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              animationDelay: p.delay,
              animationDuration: p.duration,
              opacity: 0.35,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 page-slide-enter">{children}</div>

      <nav
        ref={navRef}
        className="fixed bottom-0 z-50"
        style={{
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(430px, 100vw)",
          background: "linear-gradient(180deg, rgba(3,7,18,0.0) 0%, rgba(3,7,18,0.95) 20%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.6), 0 -1px 0 rgba(255,255,255,0.04)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div
          className="absolute top-0 h-[3px] rounded-b-full transition-all duration-500 ease-out"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
            background: `linear-gradient(90deg, ${(() => {
              const activeIndex = navItems.findIndex((item) => isActive(item.href))
              const color = activeIndex >= 0 ? navItems[activeIndex].color : "#7c3aed"
              return `${color}, ${color}88`
            })()}`,
            boxShadow: `0 2px 8px ${(() => {
              const activeIndex = navItems.findIndex((item) => isActive(item.href))
              return activeIndex >= 0 ? `${navItems[activeIndex].color}60` : "#7c3aed60"
            })()}`,
          }}
        />

        <div className="flex items-center justify-around h-[66px] max-w-lg mx-auto px-2">
          {navItems.map((item, index) => {
            const active = isActive(item.href)
            const isBouncing = bouncingIndex === index
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleNavClick(index)}
                className="flex flex-col items-center justify-center w-full h-full transition-all duration-300 group relative"
              >
                {/* Active background glow bloom */}
                {active && (
                  <div
                    className="absolute top-1 w-14 h-14 rounded-full opacity-30 blur-2xl pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${item.color} 0%, transparent 70%)` }}
                  />
                )}

                <div
                  className={`relative p-2.5 rounded-2xl transition-all duration-300 ${isBouncing ? "animate-bounce" : ""}`}
                  style={active ? {
                    background: `linear-gradient(135deg, ${item.color}33 0%, ${item.color}18 100%)`,
                    border: `1px solid ${item.color}40`,
                    boxShadow: `0 4px 20px ${item.color}40, inset 0 1px 0 rgba(255,255,255,0.1)`,
                    transform: "translateY(-2px) scale(1.08)",
                  } : {
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <item.icon
                    className="h-[20px] w-[20px] transition-all duration-300"
                    style={{ color: active ? item.color : "rgba(148,163,184,0.7)" }}
                    strokeWidth={active ? 2.5 : 1.8}
                  />
                  {active && (
                    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/15 via-transparent to-transparent" />
                    </div>
                  )}
                </div>

                <span
                  className="text-[10px] mt-1 font-bold tracking-wide transition-all duration-300"
                  style={{ color: active ? item.color : "rgba(100,116,139,0.8)" }}
                >
                  {item.label}
                </span>

                {/* Active dot */}
                {active && (
                  <div
                    className="absolute bottom-0.5 w-1 h-1 rounded-full"
                    style={{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}` }}
                  />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
