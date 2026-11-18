"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ChevronDown, Gift, Home, LayoutGrid, PlusCircle, Sparkles, TrendingUp, User, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"

const profileHref = "/participant/dashboard/profile"

const navItems = [
  { href: "/participant/dashboard", icon: Home, label: "Overview", shortLabel: "Home", group: "Workspace" },
  { href: "/participant/dashboard?view=terminal", icon: TrendingUp, label: "Trading terminal", shortLabel: "Terminal", group: "Workspace" },
  { href: "/participant/dashboard/plans", icon: LayoutGrid, label: "Plans", shortLabel: "Plans", group: "Workspace" },
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
  const mobileNavigationRef = useRef<HTMLDivElement>(null)
  const [isMobileNavigationVisible, setIsMobileNavigationVisible] = useState(true)
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    getServerHydrationSnapshot,
  )

  const terminalActive = pathname === "/participant/dashboard" && searchParams.get("view") === "terminal"

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

  useEffect(() => {
    if (!isHydrated || terminalActive) return

    const activeItem = mobileNavigationRef.current?.querySelector<HTMLElement>("[aria-current='page']")
    activeItem?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    })
  }, [isHydrated, pathname, searchParams, terminalActive])

  return (
    <>
      <nav
        aria-label="Mobile dashboard navigation"
        className={cn(
          "fixed inset-x-3 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-50 overflow-hidden rounded-2xl border shadow-[0_18px_50px_rgba(0,0,0,0.38)] md:hidden",
          (!isMobileNavigationVisible || terminalActive) && "hidden",
        )}
        style={{
          background: "color-mix(in srgb, var(--terminal-graphite-surface) 92%, transparent)",
          borderColor: "color-mix(in srgb, var(--brand-primary) 18%, var(--terminal-graphite-border))",
          backdropFilter: "blur(22px) saturate(140%)",
        }}
      >
        <button
          type="button"
          onClick={() => setIsMobileNavigationVisible(false)}
          aria-label="Hide dashboard shortcuts"
          title="Hide dashboard shortcuts"
          className="absolute right-2 top-2 z-10 inline-flex size-6 items-center justify-center rounded-full text-[color:var(--terminal-graphite-muted)] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)]"
        >
          <ChevronDown className="size-4" aria-hidden="true" />
        </button>
        <div
          ref={mobileNavigationRef}
          className="flex h-[4.25rem] snap-x snap-mandatory items-stretch overflow-x-auto overscroll-x-contain px-1.5 py-1.5 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="relative flex w-[4.35rem] shrink-0 snap-center flex-col items-center justify-center gap-1 rounded-xl px-1 text-center transition duration-200 hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)]"
                style={active ? {
                  background: "color-mix(in srgb, var(--brand-primary) 14%, var(--terminal-graphite-surface-2))",
                  color: "var(--brand-primary)",
                  boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--brand-primary) 22%, transparent)",
                } : { color: "var(--terminal-graphite-muted)" }}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span className="w-full truncate text-[10px] font-semibold tracking-wide">{item.shortLabel}</span>
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-5 bottom-0.5 h-0.5 rounded-full bg-[color:var(--brand-primary)] shadow-[0_0_10px_var(--brand-primary)]"
                  />
                ) : null}
              </Link>
            )
          })}
        </div>
      </nav>
      {!isMobileNavigationVisible && !terminalActive ? (
        <button
          type="button"
          onClick={() => setIsMobileNavigationVisible(true)}
          aria-label="Show dashboard shortcuts"
          className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-3 z-50 inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold text-[color:var(--terminal-graphite-text)] shadow-lg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] md:hidden"
          style={{ background: "var(--terminal-graphite-surface)", borderColor: "var(--terminal-graphite-border)" }}
        >
          <LayoutGrid className="size-4" aria-hidden="true" />
          Shortcuts
        </button>
      ) : null}

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
