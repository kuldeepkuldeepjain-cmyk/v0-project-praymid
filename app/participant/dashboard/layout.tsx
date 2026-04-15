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

  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 15}s`,
    size: Math.random() * 6 + 3,
    color: ["#E85D3B", "#7c3aed", "#22d3ee", "#10b981"][Math.floor(Math.random() * 4)],
    duration: `${15 + Math.random() * 10}s`,
  }))

  return (
    <div className="min-h-screen bg-white pb-20 relative overflow-hidden">
      <div className="fixed inset-0 aurora-bg" />
      <div className="fixed inset-0 mesh-gradient-light" />
      <div className="fixed inset-0 grid-pattern-light" />
      <div className="fixed inset-0 texture-overlay" />

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="blob animate-morph-enhanced absolute w-[800px] h-[800px] -top-48 -left-48 bg-gradient-to-br from-[#E85D3B]/25 to-orange-300/20 animate-float-slow" />
        <div
          className="blob animate-morph-enhanced absolute w-[700px] h-[700px] top-1/4 -right-32 bg-gradient-to-br from-purple-400/20 to-cyan-300/15 animate-float"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="blob animate-morph-enhanced absolute w-[600px] h-[600px] bottom-1/4 left-1/4 bg-gradient-to-br from-cyan-300/15 to-purple-300/15 animate-float-slow"
          style={{ animationDelay: "4s" }}
        />

        <div
          className="glow-orb absolute w-[500px] h-[500px] top-1/3 right-1/4 bg-gradient-to-br from-[#E85D3B]/30 to-yellow-300/20"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="glow-orb absolute w-[400px] h-[400px] bottom-1/3 left-1/3 bg-gradient-to-br from-purple-500/25 to-pink-400/15"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="glow-orb absolute w-[350px] h-[350px] top-2/3 left-1/2 bg-gradient-to-br from-cyan-400/20 to-green-300/15"
          style={{ animationDelay: "3s" }}
        />
      </div>

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
              opacity: 0.6,
            }}
          />
        ))}
      </div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[3]">
        <div className="flow-ribbon absolute w-full top-1/4" style={{ animationDelay: "0s" }} />
        <div className="flow-ribbon absolute w-full top-2/3" style={{ animationDelay: "3s" }} />
      </div>

      <div className="relative z-10 page-slide-enter">{children}</div>

      <nav
        ref={navRef}
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
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

        <div className="flex items-center justify-around h-[68px] max-w-lg mx-auto">
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
                {active && (
                  <div 
                    className={`absolute top-2 w-12 h-12 rounded-full bg-gradient-to-br ${item.gradient} opacity-20 blur-xl animate-pulse`}
                  />
                )}
                
                <div
                  className={`relative p-2.5 rounded-2xl transition-all duration-300 ${
                    active
                      ? `bg-gradient-to-br ${item.gradient} shadow-lg ${item.glow} scale-110 -translate-y-1`
                      : "bg-transparent group-hover:bg-slate-100"
                  } ${isBouncing ? "animate-bounce" : ""}`}
                  style={{
                    boxShadow: active ? `0 8px 20px -4px ${item.color}50` : "none",
                  }}
                >
                  <item.icon
                    className={`h-[22px] w-[22px] transition-all duration-300 ${
                      active ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  
                  {active && (
                    <div className="absolute inset-0 rounded-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-transparent" />
                      <div 
                        className="absolute -inset-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                        style={{ animationDuration: "2s" }}
                      />
                    </div>
                  )}
                </div>
                
                <span
                  className={`text-[10px] mt-1.5 font-bold tracking-wide transition-all duration-300 ${
                    active ? "opacity-100" : "text-slate-400 opacity-70 group-hover:opacity-100"
                  }`}
                  style={{ color: active ? item.color : undefined }}
                >
                  {item.label}
                </span>
                
                {active && (
                  <div 
                    className="absolute -bottom-0.5 w-1 h-1 rounded-full animate-pulse"
                    style={{ backgroundColor: item.color }}
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
