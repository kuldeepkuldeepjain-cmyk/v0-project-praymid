"use client"
// layout — staking section removed
import type React from "react"
import { Suspense, useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, User, TrendingUp, Wallet, Gift, Settings, PlusCircle } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
  const navRef = useRef<HTMLDivElement>(null)

  const navItems = [
    { href: "/participant/dashboard", icon: Home, label: "Overview", shortLabel: "Home", color: "#d6b66b", gradient: "from-amber-300 to-amber-500", glow: "shadow-amber-500/20" },
    { href: "/participant/dashboard?view=terminal", icon: TrendingUp, label: "Trading Terminal", shortLabel: "Terminal", color: "#d6b66b", gradient: "from-amber-300 to-amber-500", glow: "shadow-amber-500/20" },
    { href: "/participant/dashboard/predict", icon: TrendingUp, label: "Prediction", shortLabel: "Predict", color: "#d6b66b", gradient: "from-amber-300 to-amber-500", glow: "shadow-amber-500/20" },
    { href: "/participant/dashboard/profile", icon: User, label: "Profile", shortLabel: "Profile", color: "#d6b66b", gradient: "from-amber-300 to-amber-500", glow: "shadow-amber-500/20" },
    { href: "/participant/dashboard/contribute", icon: PlusCircle, label: "Add funds", shortLabel: "Fund", color: "#d6b66b", gradient: "from-amber-300 to-amber-500", glow: "shadow-amber-500/20" },
    { href: "/participant/dashboard/payout", icon: Wallet, label: "Payout", shortLabel: "Payout", color: "#d6b66b", gradient: "from-amber-300 to-amber-500", glow: "shadow-amber-500/20" },
    { href: "/participant/dashboard/refer", icon: Gift, label: "Referrals", shortLabel: "Refer", color: "#d6b66b", gradient: "from-amber-300 to-amber-500", glow: "shadow-amber-500/20" },
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

  // ── BACKGROUND LAYERS (shared across breakpoints) ─────────────────────
  const BgLayers = () => (
    <>
      <div className="fixed inset-0 pointer-events-none bg-[#111315]" />
    </>
  )

  // ── SHARED NAV ITEM RENDERER ───────────────────────────────────────────
  const NavItem = ({ item, index }: { item: typeof navItems[0]; index: number }) => {
    const active = isActive(item.href)
    const isBouncing = bouncingIndex === index
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => handleNavClick(index)}
        aria-current={active ? "page" : undefined}
        className="group relative flex h-full min-h-16 w-full flex-col items-center justify-center transition-all duration-300"
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
    <div className="terminal-page min-h-screen min-h-dvh" style={{ background: "#111315" }}>
      <BgLayers />

      {/* ── TABLET & DESKTOP LAYOUT (md+): Full-width content + bottom nav ── */}
      <div className="hidden md:flex flex-col h-screen h-dvh overflow-hidden relative z-10">
        <main aria-label="Participant dashboard" className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="relative z-10 page-slide-enter h-full">
            <Suspense fallback={<div className="h-full" aria-hidden="true" />}>
              {children}
            </Suspense>
          </div>
        </main>

        <nav
          aria-label="Dashboard navigation"
          className="flex-shrink-0"
          style={{
            background: "rgba(7,17,31,0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="mx-auto flex h-16 max-w-3xl items-center justify-around px-2">
            {navItems.map((item, index) => (
              <NavItem key={item.href} item={item} index={index} />
            ))}
          </div>
        </nav>
      </div>

      {/* ── MOBILE LAYOUT (< md): Bottom nav ────────────────────────── */}
      <div className="flex md:hidden flex-col min-h-screen min-h-dvh relative z-10">
        <div className="flex-1 pb-20">
          <div className="relative page-slide-enter">
            <Suspense fallback={<div className="h-full" aria-hidden="true" />}>
              {children}
            </Suspense>
          </div>
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
                const color = activeIndex >= 0 ? navItems[activeIndex].color : "#3b82f6"
                return `linear-gradient(90deg, ${color}, ${color}88)`
              })(),
            }}
          />
          <div className="flex items-center justify-around h-[62px] px-1">
            {navItems.map((item, index) => (
              <NavItem key={item.href} item={item} index={index} />
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
