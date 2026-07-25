"use client"
// layout — staking section removed
import type React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, User, TrendingUp, Wallet, Gift, Settings, ChevronRight } from "lucide-react"
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
    { href: "/participant/dashboard/predict", icon: TrendingUp, label: "Predict", shortLabel: "Pred", color: "#10B981", gradient: "from-emerald-400 to-teal-500", glow: "shadow-emerald-500/40" },
    { href: "/participant/dashboard", icon: Home, label: "Dashboard", shortLabel: "Home", color: "#7c3aed", gradient: "from-purple-500 to-indigo-600", glow: "shadow-purple-500/40" },
    { href: "/participant/dashboard/profile", icon: User, label: "Profile", shortLabel: "Prof", color: "#22d3ee", gradient: "from-cyan-400 to-blue-500", glow: "shadow-cyan-500/40" },
    { href: "/participant/dashboard/payout", icon: Wallet, label: "Payout", shortLabel: "Pay", color: "#F59E0B", gradient: "from-amber-400 to-yellow-500", glow: "shadow-amber-500/40" },
    { href: "/participant/dashboard/refer", icon: Gift, label: "Refer & Earn", shortLabel: "Refer", color: "#E85D3B", gradient: "from-orange-400 to-red-500", glow: "shadow-orange-500/40" },
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

  // ── BACKGROUND LAYERS (shared across breakpoints) ─────────────────────
  const BgLayers = () => (
    <>
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 120% 60% at 50% -10%, rgba(124,58,237,0.18) 0%, transparent 55%)" }} />
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at -20% 60%, rgba(34,211,238,0.06) 0%, transparent 50%)" }} />
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 50% at 120% 80%, rgba(16,185,129,0.06) 0%, transparent 50%)" }} />
      <div className="fixed inset-0 pointer-events-none depth-grid opacity-40" />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb absolute w-[600px] h-[600px] -top-48 -left-32 bg-gradient-to-br from-violet-600/12 to-transparent" style={{ animationDelay: "0s" }} />
        <div className="glow-orb absolute w-[500px] h-[500px] top-1/2 -right-48 bg-gradient-to-br from-cyan-500/8 to-transparent" style={{ animationDelay: "2s" }} />
        <div className="glow-orb absolute w-[400px] h-[400px] bottom-0 left-1/3 bg-gradient-to-br from-indigo-500/8 to-transparent" style={{ animationDelay: "4s" }} />
      </div>
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[5]">
        {particles.map((p) => (
          <div key={p.id} className="floating-particle" style={{ left: p.left, width: p.size, height: p.size, backgroundColor: p.color, animationDelay: p.delay, animationDuration: p.duration, opacity: 0.25 }} />
        ))}
      </div>
    </>
  )

  // ── SHARED NAV ITEM RENDERER ───────────────────────────────────────────
  const NavItem = ({ item, index, vertical = false }: { item: typeof navItems[0]; index: number; vertical?: boolean }) => {
    const active = isActive(item.href)
    const isBouncing = bouncingIndex === index
    if (vertical) {
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => handleNavClick(index)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative mx-2"
          style={active ? {
            background: `linear-gradient(135deg, ${item.color}22 0%, ${item.color}10 100%)`,
            border: `1px solid ${item.color}35`,
            boxShadow: `0 2px 12px ${item.color}30`,
          } : {
            background: "transparent",
            border: "1px solid transparent",
          }}
        >
          {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }} />}
          <div className="relative p-2 rounded-xl flex-shrink-0" style={active ? {
            background: `linear-gradient(135deg, ${item.color}30 0%, ${item.color}18 100%)`,
            border: `1px solid ${item.color}40`,
            boxShadow: `0 2px 12px ${item.color}40`,
          } : {
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <item.icon className="h-4 w-4" style={{ color: active ? item.color : "rgba(148,163,184,0.6)" }} strokeWidth={active ? 2.5 : 1.8} />
          </div>
          <span className="text-sm font-semibold" style={{ color: active ? item.color : "rgba(148,163,184,0.7)" }}>{item.label}</span>
          {active && <ChevronRight className="ml-auto h-4 w-4 opacity-50" style={{ color: item.color }} />}
        </Link>
      )
    }
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => handleNavClick(index)}
        className="flex flex-col items-center justify-center w-full h-full transition-all duration-300 group relative"
      >
        {active && <div className="absolute top-1 w-14 h-14 rounded-full opacity-30 blur-2xl pointer-events-none" style={{ background: `radial-gradient(circle, ${item.color} 0%, transparent 70%)` }} />}
        <div className={`relative p-2.5 rounded-2xl transition-all duration-300 ${isBouncing ? "animate-bounce" : ""}`} style={active ? {
          background: `linear-gradient(135deg, ${item.color}33 0%, ${item.color}18 100%)`,
          border: `1px solid ${item.color}40`,
          boxShadow: `0 4px 20px ${item.color}40, inset 0 1px 0 rgba(255,255,255,0.1)`,
          transform: "translateY(-2px) scale(1.08)",
        } : {
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <item.icon className="h-[20px] w-[20px] transition-all duration-300" style={{ color: active ? item.color : "rgba(148,163,184,0.7)" }} strokeWidth={active ? 2.5 : 1.8} />
          {active && <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"><div className="absolute inset-0 bg-gradient-to-tr from-white/15 via-transparent to-transparent" /></div>}
        </div>
        <span className="text-[10px] mt-1 font-bold tracking-wide transition-all duration-300" style={{ color: active ? item.color : "rgba(100,116,139,0.8)" }}>{item.shortLabel}</span>
        {active && <div className="absolute bottom-0.5 w-1 h-1 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}` }} />}
      </Link>
    )
  }

  return (
    <div className="min-h-screen min-h-dvh" style={{ background: "#030712" }}>
      <BgLayers />

      {/* ── DESKTOP LAYOUT (lg+): Sidebar + Content ─────────────────── */}
      <div className="hidden lg:flex h-screen h-dvh overflow-hidden relative z-10">
        {/* Left Sidebar */}
        <aside className="flex-shrink-0 flex flex-col" style={{ width: 220, background: "rgba(3,7,18,0.9)", borderRight: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(24px)" }}>
          {/* Logo area */}
          <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-800 flex items-center justify-center flex-shrink-0" style={{ boxShadow: "0 0 16px rgba(124,58,237,0.5)" }}>
              <span className="text-white text-sm font-black">FC</span>
            </div>
            <div>
              <p className="text-white text-sm font-black tracking-wide">FlowChain</p>
              <p className="text-slate-500 text-[10px] font-medium tracking-widest uppercase">Trading</p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item, index) => (
              <NavItem key={item.href} item={item} index={index} vertical />
            ))}
          </nav>

          {/* Bottom info */}
          <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: "0 0 6px rgba(52,211,153,0.9)" }} />
              <span className="text-slate-500 text-[11px] font-medium">Markets Live</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ background: "transparent" }}>
          <div className="relative z-10 page-slide-enter h-full">
            {children}
          </div>
        </main>
      </div>

      {/* ── TABLET LAYOUT (md): Compact sidebar ─────────────────────── */}
      <div className="hidden md:flex lg:hidden h-screen h-dvh overflow-hidden relative z-10">
        {/* Icon-only sidebar */}
        <aside className="flex-shrink-0 flex flex-col items-center py-4 gap-2" style={{ width: 68, background: "rgba(3,7,18,0.9)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-800 flex items-center justify-center mb-3" style={{ boxShadow: "0 0 12px rgba(124,58,237,0.4)" }}>
            <span className="text-white text-sm font-black">FC</span>
          </div>
          {navItems.map((item, index) => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href} onClick={() => handleNavClick(index)}
                className="relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200"
                style={active ? {
                  background: `linear-gradient(135deg, ${item.color}25 0%, ${item.color}12 100%)`,
                  border: `1px solid ${item.color}40`,
                  boxShadow: `0 2px 12px ${item.color}30`,
                } : {
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full" style={{ background: item.color }} />}
                <item.icon className="h-5 w-5" style={{ color: active ? item.color : "rgba(148,163,184,0.5)" }} strokeWidth={active ? 2.5 : 1.8} />
              </Link>
            )
          })}
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="relative z-10 page-slide-enter h-full">{children}</div>
        </main>
      </div>

      {/* ── MOBILE LAYOUT (< md): Bottom nav ────────────────────────── */}
      <div className="flex md:hidden flex-col min-h-screen min-h-dvh relative z-10">
        <div className="flex-1 pb-20">
          <div className="relative page-slide-enter">{children}</div>
        </div>

        {/* Bottom Nav */}
        <nav
          ref={navRef}
          className="fixed bottom-0 z-50"
          style={{
            left: 0, right: 0,
            background: "linear-gradient(180deg, rgba(3,7,18,0.0) 0%, rgba(3,7,18,0.97) 20%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.6)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {/* Active indicator line */}
          <div className="absolute top-0 h-[2px] rounded-b-full transition-all duration-500 ease-out"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
              background: (() => {
                const activeIndex = navItems.findIndex((item) => isActive(item.href))
                const color = activeIndex >= 0 ? navItems[activeIndex].color : "#7c3aed"
                return `linear-gradient(90deg, ${color}, ${color}88)`
              })(),
            }}
          />
          <div className="flex items-center justify-around h-[62px] px-1">
            {navItems.map((item, index) => (
              <NavItem key={item.href} item={item} index={index} vertical={false} />
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
