"use client"

import { useEffect, useSyncExternalStore } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Gift, Home, PlusCircle, Sparkles, TrendingUp, User, Wallet } from "lucide-react"

const profileHref = "/participant/dashboard/profile"

const navItems = [
  { href: "/participant/dashboard", icon: Home, label: "Overview", shortLabel: "Home", group: "Workspace" },
  { href: "/participant/dashboard?view=terminal", icon: TrendingUp, label: "Trading terminal", shortLabel: "Terminal", group: "Workspace" },
  { href: "/participant/dashboard/predict", icon: Sparkles, label: "Prediction", shortLabel: "Predict", group: "Workspace" },
  { href: profileHref, icon: User, label: "Profile", shortLabel: "Profile", group: "Account" },
  { href: "/participant/dashboard/contribute", icon: PlusCircle, label: "Add funds", shortLabel: "Fund", group: "Account" },
  { href: "/participant/dashboard/payout", icon: Wallet, label: "Payouts", shortLabel: "Payout", group: "Account" },
  { href: "/participant/dashboard/refer", icon: Gift, label: "Referrals", shortLabel: "Refer", group: "Account" },
] as const

const navigationGroups = ["Workspace", "Account"] as const

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
  const searchParams = useSearchParams()
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    getServerHydrationSnapshot,
  )

  const isActive = (href: string) => {
    if (!isHydrated) return false
    if (href === "/participant/dashboard?view=terminal") {
      return pathname === "/participant/dashboard" && searchParams.get("view") === "terminal"
    }
    if (href === "/participant/dashboard") {
      return pathname === href && searchParams.get("view") !== "terminal"
    }
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <>
      <nav
        aria-label="Dashboard navigation"
        className="hidden shrink-0 border-t md:block lg:hidden"
        style={{ background: "var(--terminal-graphite-surface)", borderColor: "var(--terminal-graphite-border)" }}
      >
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-around px-2">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="group flex h-full min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-center transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)]"
                style={active ? {
                  background: "color-mix(in srgb, var(--brand-primary) 12%, var(--terminal-graphite-surface))",
                  color: "var(--brand-primary)",
                } : { color: "var(--terminal-graphite-muted)" }}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span className="truncate text-sm font-semibold tracking-wide">{item.shortLabel}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <aside
        aria-label="Dashboard side rail"
        className="hidden h-full w-60 shrink-0 flex-col border-r xl:w-64 lg:flex"
        style={{ background: "var(--terminal-graphite-surface)", borderColor: "var(--terminal-graphite-border)" }}
      >
        <div className="px-4 py-5">
          <Link href="/participant/dashboard" aria-label="EliteFund dashboard home" className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)]">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border text-sm font-black tracking-tight"
              style={{
                color: "var(--brand-primary)",
                background: "color-mix(in srgb, var(--brand-primary) 12%, var(--terminal-graphite-surface-2))",
                borderColor: "color-mix(in srgb, var(--brand-primary) 28%, var(--terminal-graphite-border))",
              }}
            >
              EF
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-wide text-[color:var(--terminal-graphite-text)]">EliteFund</span>
              <span className="mt-0.5 block truncate text-sm text-[color:var(--terminal-graphite-muted)]">Member workspace</span>
            </span>
          </Link>
        </div>

        <nav aria-label="Dashboard navigation" className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
          {navigationGroups.map((group) => (
            <div key={group} className="flex flex-col gap-2">
              <p className="px-3 text-sm font-bold uppercase tracking-[0.16em] text-[color:var(--terminal-graphite-muted)]">{group}</p>
              <div className="flex flex-col gap-1">
                {navItems.filter((item) => item.group === group && item.href !== profileHref).map((item) => {
                  const active = isActive(item.href)
                  const featured = item.href === "/participant/dashboard/contribute"
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className="group flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 text-sm font-semibold transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)]"
                      style={active ? {
                        background: "color-mix(in srgb, var(--brand-primary) 12%, var(--terminal-graphite-surface))",
                        borderColor: "color-mix(in srgb, var(--brand-primary) 34%, var(--terminal-graphite-border))",
                        color: "var(--brand-primary)",
                      } : featured ? {
                        background: "color-mix(in srgb, var(--brand-primary) 6%, var(--terminal-graphite-surface-2))",
                        borderColor: "color-mix(in srgb, var(--brand-primary) 22%, var(--terminal-graphite-border))",
                        color: "var(--brand-primary)",
                      } : {
                        background: "transparent",
                        borderColor: "transparent",
                        color: "var(--terminal-graphite-muted)",
                      }}
                    >
                      <Icon className="size-5 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t p-3" style={{ borderColor: "var(--terminal-graphite-border)" }}>
          <Link
            href={profileHref}
            aria-current={isActive(profileHref) ? "page" : undefined}
            className="flex min-h-14 items-center gap-3 rounded-xl border p-3 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)]"
            style={isActive(profileHref) ? {
              background: "color-mix(in srgb, var(--brand-primary) 12%, var(--terminal-graphite-surface))",
              borderColor: "color-mix(in srgb, var(--brand-primary) 34%, var(--terminal-graphite-border))",
              color: "var(--brand-primary)",
            } : {
              background: "var(--terminal-graphite-surface-2)",
              borderColor: "var(--terminal-graphite-border)",
              color: "var(--terminal-graphite-text)",
            }}
          >
            <User className="size-5 shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">Profile &amp; settings</span>
              <span className="mt-0.5 block truncate text-sm text-[color:var(--terminal-graphite-muted)]">Personal details and security</span>
            </span>
          </Link>
        </div>
      </aside>
    </>
  )
}
