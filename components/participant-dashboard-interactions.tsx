"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Gift, Home, PlusCircle, TrendingUp, User, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/participant/dashboard", icon: Home, label: "Overview", shortLabel: "Home" },
  { href: "/participant/dashboard?view=terminal", icon: TrendingUp, label: "Trading Terminal", shortLabel: "Terminal" },
  { href: "/participant/dashboard/predict", icon: TrendingUp, label: "Prediction", shortLabel: "Predict" },
  { href: "/participant/dashboard/profile", icon: User, label: "Profile", shortLabel: "Profile" },
  { href: "/participant/dashboard/contribute", icon: PlusCircle, label: "Add funds", shortLabel: "Fund" },
  { href: "/participant/dashboard/payout", icon: Wallet, label: "Payout", shortLabel: "Payout" },
  { href: "/participant/dashboard/refer", icon: Gift, label: "Referrals", shortLabel: "Refer" },
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
        background: "var(--terminal-graphite-surface)",
        borderTop: "1px solid var(--terminal-graphite-border)",
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
              className="group relative flex h-full min-h-16 w-full flex-col items-center justify-center gap-1 transition-all duration-300"
            >
              <span
                className={cn("relative rounded-2xl p-2 transition-all duration-300", bouncing && "animate-bounce")}
                style={active ? {
                  background: "color-mix(in srgb, var(--brand-primary) 14%, var(--terminal-graphite-surface))",
                  border: "1px solid color-mix(in srgb, var(--brand-primary) 40%, var(--terminal-graphite-border))",
                  transform: "translateY(-2px) scale(1.08)",
                } : {
                  background: "var(--terminal-graphite-surface-2)",
                  border: "1px solid var(--terminal-graphite-border)",
                }}
              >
                <Icon className="size-5 transition-all duration-300" style={{ color: active ? "var(--brand-primary)" : "var(--terminal-graphite-muted)" }} strokeWidth={active ? 2.5 : 1.8} aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold tracking-wide transition-all duration-300" style={{ color: active ? "var(--brand-primary)" : "var(--terminal-graphite-muted)" }}>{item.shortLabel}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
