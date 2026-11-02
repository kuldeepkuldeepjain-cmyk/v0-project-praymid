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
      <div className="relative z-10 flex min-h-screen min-h-dvh flex-col md:h-screen md:h-dvh md:min-h-0 md:overflow-hidden lg:flex-row">
        <main aria-label="Participant dashboard" className="participant-dashboard-content order-1 min-w-0 flex-1 pb-0 md:overflow-y-auto md:overflow-x-hidden lg:order-2">
          <div className="relative z-10 page-slide-enter md:h-full">
            <Suspense fallback={<div className="h-full" aria-hidden="true" />}>
              {children}
            </Suspense>
          </div>
        </main>
        <div className="order-2 hidden shrink-0 md:block lg:order-1 lg:h-full">
          <Suspense
            fallback={
              <div
                aria-hidden="true"
                className="hidden h-16 w-full shrink-0 border-t md:block lg:h-full lg:w-60 lg:border-r lg:border-t-0 xl:w-64"
                style={{ background: "var(--terminal-graphite-surface)", borderColor: "var(--terminal-graphite-border)" }}
              />
            }
          >
            <DesktopDashboardNavigation />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
