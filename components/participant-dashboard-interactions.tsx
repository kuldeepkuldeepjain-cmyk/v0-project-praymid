"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Gift, Home, PlusCircle, TrendingUp, User, Wallet } from "lucide-react"

const navItems = [
  { href: "/participant/dashboard", icon: Home, label: "Overview", shortLabel: "Home", color: "#d6b66b" },
  { href: "/participant/dashboard?view=terminal", icon: TrendingUp, label: "Trading Terminal", shortLabel: "Terminal", color: "#d6b66b" },
  { href: "/participant/dashboard/predict", icon: TrendingUp, label: "Prediction", shortLabel: "Predict", color: "#d6b66b" },
  { href: "/participant/dashboard/profile", icon: User, label: "Profile", shortLabel: "Profile", color: "#d6b66b" },
  { href: "/participant/dashboard/contribute", icon: PlusCircle, label: "Add funds", shortLabel: "Fund", color: "#d6b66b" },
  { href: "/participant/dashboard/payout", icon: Wallet, label: "Payout", shortLabel: "Payout", color: "#d6b66b" },
  { href: "/participant/dashboard/refer", icon: Gift, label: "Referrals", shortLabel: "Refer", color: "#d6b66b" },
]

const subscribeToHydration = () => () => undefined
const getHydrationSnapshot = () => true
const getServerHydrationSnapshot = () => false

export function DashboardHeartbeat() {
  useEffect(() => {
    let cancelled = false
    const sendHeartbeat = () => {
      if (cancelled || document.visibilityState !== "visible") return
      void fetch("/api/participant/update-last-seen", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
      }).catch(() => {})
    }

    sendHeartbeat()
    const interval = window.setInterval(sendHeartbeat, 30_000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  return null
}

export function DesktopDashboardNavigation() {
  const pathname = usePathname() ?? ""
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    getServerHydrationSnapshot,
  )
  const [bouncingIndex, setBouncingIndex] = useState<number | null>(null)

  const isActive = (href: string) => {
    if (!isHydrated) return false
    if (href === "/participant/dashboard") return pathname === href
    return pathname.startsWith(href)
  }

  const handleNavClick = (index: number) => {
    setBouncingIndex(index)
    if (navigator.vibrate) navigator.vibrate(10)
    window.setTimeout(() => setBouncingIndex(null), 300)
  }

  return (
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
        {navItems.map((item, index) => {
          const active = isActive(item.href)
          const bouncing = bouncingIndex === index
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => handleNavClick(index)}
              aria-current={active ? "page" : undefined}
              className="group relative flex h-full min-h-16 w-full flex-col items-center justify-center transition-all duration-300"
            >
              {active && <span className="pointer-events-none absolute top-1 h-14 w-14 rounded-full opacity-30 blur-2xl" style={{ background: `radial-gradient(circle, ${item.color} 0%, transparent 70%)` }} />}
              <span
                className={`relative rounded-2xl p-2.5 transition-all duration-300 ${bouncing ? "animate-bounce" : ""}`}
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
                <Icon className="h-[20px] w-[20px] transition-all duration-300" style={{ color: active ? item.color : "rgba(148,163,184,0.7)" }} strokeWidth={active ? 2.5 : 1.8} aria-hidden="true" />
                {active && <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"><span className="absolute inset-0 bg-gradient-to-tr from-white/15 via-transparent to-transparent" /></span>}
              </span>
              <span className="mt-1 text-[10px] font-bold tracking-wide transition-all duration-300" style={{ color: active ? item.color : "rgba(100,116,139,0.8)" }}>{item.shortLabel}</span>
              {active && <span className="absolute bottom-0.5 h-1 w-1 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}` }} />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
