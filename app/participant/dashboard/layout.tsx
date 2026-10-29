// layout — staking section removed
import type { ReactNode } from "react"
import { Suspense } from "react"
import Link from "next/link"
import { TrendingUp } from "lucide-react"
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
            className="mx-auto flex h-14 w-full max-w-56 items-center justify-center gap-3 rounded-2xl border border-amber-100/60 px-8 text-sm font-black tracking-wide text-slate-950 shadow-[0_10px_30px_rgba(214,182,107,0.24)] transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            style={{ background: "linear-gradient(135deg, #f4d17d 0%, #d6b66b 58%, #bd913d 100%)" }}
          >
            <TrendingUp className="size-5" strokeWidth={2.5} aria-hidden="true" />
            <span>Trade</span>
          </Link>
        </nav>
      </div>
    </div>
  )
}
