// layout — staking section removed
import type { ReactNode } from "react"
import { Suspense } from "react"
import { DashboardHeartbeat, DesktopDashboardNavigation } from "@/components/participant-dashboard-interactions"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="terminal-page min-h-screen min-h-dvh" style={{ background: "var(--terminal-graphite-bg)" }}>
      <DashboardHeartbeat />
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--terminal-graphite-bg)" }} />

      {/* Mount account content once; CSS switches the navigation at the breakpoint. */}
      <div className="relative z-10 flex min-h-screen min-h-dvh flex-col md:h-screen md:h-dvh md:min-h-0 md:overflow-hidden">
        <main aria-label="Participant dashboard" className="participant-dashboard-content flex-1 pb-20 md:overflow-y-auto md:overflow-x-hidden md:pb-0">
          <div className="relative z-10 page-slide-enter md:h-full">
            <Suspense fallback={<div className="h-full" aria-hidden="true" />}>
              {children}
            </Suspense>
          </div>
        </main>
        <div className="hidden shrink-0 md:block"><DesktopDashboardNavigation /></div>

        {/* Reserved mobile dock; terminal navigation is owned by the terminal. */}
        <div
          aria-hidden="true"
          className="fixed inset-x-0 bottom-0 z-50 participant-global-mobile-nav px-5 pt-3 md:hidden"
          style={{
            background: "var(--terminal-graphite-bg)",
            borderTop: "1px solid var(--terminal-graphite-border)",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
          }}
        >
          <div className="h-10" />
        </div>
      </div>
    </div>
  )
}
