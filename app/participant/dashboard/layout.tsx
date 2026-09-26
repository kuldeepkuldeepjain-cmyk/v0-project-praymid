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
    { href: "/participant/dashboard/predict", icon: TrendingUp, label: "Predict", shortLabel: "Pred", color: "#10B981", gradient: "from-emerald-400 to-teal-500", glow: "shadow-emerald-500/40" },
    { href: "/participant/dashboard", icon: Home, label: "Dashboard", shortLabel: "Home", color: "#3b82f6", gradient: "from-blue-500 to-blue-700", glow: "shadow-blue-500/40" },
    { href: "/participant/dashboard/profile", icon: User, label: "Profile", shortLabel: "Prof", color: "#22d3ee", gradient: "from-cyan-400 to-blue-500", glow: "shadow-cyan-500/40" },
    { href: "/participant/dashboard/contribute", icon: PlusCircle, label: "Add Fund", shortLabel: "Fund", color: "#14B8A6", gradient: "from-teal-400 to-cyan-500", glow: "shadow-teal-500/40" },
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

  // ── BACKGROUND LAYERS (shared across breakpoints) ─────────────────────
  const BgLayers = () => (
    <>
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 120% 60% at 50% -10%, rgba(59,130,246,0.18) 0%, transparent 55%)" }} />
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at -20% 60%, rgba(34,211,238,0.06) 0%, transparent 50%)" }} />
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 50% at 120% 80%, rgba(16,185,129,0.06) 0%, transparent 50%)" }} />
      <div className="fixed inset-0 pointer-events-none depth-grid opacity-40" />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb absolute w-[600px] h-[600px] -top-48 -left-32 bg-gradient-to-br from-blue-600/12 to-transparent" style={{ animationDelay: "0s" }} />
        <div className="glow-orb absolute w-[500px] h-[500px] top-1/2 -right-48 bg-gradient-to-br from-cyan-500/8 to-transparent" style={{ animationDelay: "2s" }} />
        <div className="glow-orb absolute w-[400px] h-[400px] bottom-0 left-1/3 bg-gradient-to-br from-blue-500/8 to-transparent" style={{ animationDelay: "4s" }} />
      </div>
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
    <div className="min-h-screen min-h-dvh" style={{ background: "#07111f" }}>
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
