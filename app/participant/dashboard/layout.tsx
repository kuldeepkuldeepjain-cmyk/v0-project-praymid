// layout — staking section removed
import type { ReactNode } from "react"
import { Suspense } from "react"
import Link from "next/link"
import { BarChart3, ChevronRight } from "lucide-react"
import { DashboardHeartbeat, DesktopDashboardNavigation } from "@/components/participant-dashboard-interactions"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="terminal-page min-h-screen min-h-dvh" style={{ background: "#111315" }}>
      <DashboardHeartbeat />
      <div className="fixed inset-0 pointer-events-none bg-[#111315]" />

      {/* ── TABLET & DESKTOP LAYOUT (md+): Full-width content + bottom nav ── */}
      <div className="hidden md:flex flex-col h-screen h-dvh overflow-hidden relative z-10">
        <main aria-label="Participant dashboard" className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="relative z-10 page-slide-enter h-full">
            <Suspense fallback={<div className="h-full" aria-hidden="true" />}>
              {children}
            </Suspense>
          </div>
        </main>
        <DesktopDashboardNavigation />
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

        {/* Mobile trade dock */}
        <nav
          aria-label="Dashboard trade action"
          className="fixed inset-x-0 bottom-0 z-50 participant-global-mobile-nav px-5 pt-3"
          style={{
            background: "linear-gradient(180deg, rgba(3,7,18,0) 0%, rgba(3,7,18,0.94) 38%, rgba(3,7,18,0.98) 100%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(214,182,107,0.14)",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.45)",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
          }}
        >
          <Link
            href="/participant/dashboard?view=terminal"
            aria-label="Open trading terminal"
            className="participant-dock-trade-button mx-auto grid h-16 w-full grid-cols-[1fr_auto_1fr] items-center rounded-[18px] px-5 text-[18px] font-semibold tracking-wide transition-transform active:scale-[0.99] focus-visible:outline-none motion-reduce:transition-none"
          >
            <span aria-hidden="true" />
            <span className="flex items-center justify-center gap-3">
              <BarChart3 className="participant-dock-trade-icon size-6" strokeWidth={2.6} aria-hidden="true" />
              <span>Trade</span>
            </span>
            <ChevronRight className="size-6 justify-self-end" strokeWidth={2} aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </div>
  )
}
