"use client"

/**
 * PageLoader — shared loading skeleton used across all participant pages.
 *
 * Usage:
 *   <PageLoader variant="dashboard" />   — main dashboard shimmer
 *   <PageLoader variant="subpage" />     — inner page (contribute, payout, etc.)
 *   <PageLoader variant="detail" />      — detail / matched view
 *   <PageLoader variant="list" />        — list / leaderboard view
 */

interface PageLoaderProps {
  variant?: "dashboard" | "subpage" | "detail" | "list"
  label?: string
}

function Shimmer({ className }: { className: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-slate-100 ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  )
}

function ProgressBar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-slate-100 overflow-hidden">
      <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-cyan-500 animate-[progress_1.4s_ease-in-out_infinite]" />
    </div>
  )
}

/* ── Dashboard variant ── */
function DashboardSkeleton() {
  return (
    <div className="pb-24">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 border-b border-slate-100 h-14">
        <div className="px-4 h-full flex items-center justify-between">
          <Shimmer className="h-5 w-20" />
          <div className="flex items-center gap-3">
            <Shimmer className="h-8 w-8 !rounded-full" />
            <Shimmer className="h-8 w-8" />
          </div>
        </div>
      </header>
      <main className="px-4 py-4 space-y-3">
        {/* Balance card */}
        <Shimmer className="h-44 !rounded-2xl" />
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <Shimmer className="h-24 !rounded-2xl" />
          <Shimmer className="h-24 !rounded-2xl" />
        </div>
        {/* Wide banner */}
        <Shimmer className="h-20 !rounded-2xl" />
        {/* Action tiles */}
        <div className="grid grid-cols-3 gap-3">
          <Shimmer className="h-20 !rounded-2xl" />
          <Shimmer className="h-20 !rounded-2xl" />
          <Shimmer className="h-20 !rounded-2xl" />
        </div>
        {/* Recent activity */}
        <Shimmer className="h-5 w-32 !rounded-lg" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Shimmer className="h-10 w-10 !rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Shimmer className="h-3.5 w-3/4 !rounded-md" />
              <Shimmer className="h-3 w-1/2 !rounded-md" />
            </div>
            <Shimmer className="h-4 w-14 !rounded-md" />
          </div>
        ))}
      </main>
    </div>
  )
}

/* ── Sub-page variant (contribute, payout, predict, etc.) ── */
function SubpageSkeleton({ label }: { label?: string }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header bar */}
      <header className="bg-white border-b border-slate-100 h-14">
        <div className="px-4 h-full flex items-center gap-3">
          <Shimmer className="h-9 w-9 !rounded-lg" />
          <Shimmer className="h-5 w-36 !rounded-lg" />
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Top info card */}
        <Shimmer className="h-28 !rounded-2xl" />
        {/* Three plan cards */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4 border border-slate-100 rounded-2xl">
            <Shimmer className="h-12 w-12 !rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-4 w-24 !rounded-md" />
              <Shimmer className="h-3 w-40 !rounded-md" />
            </div>
            <Shimmer className="h-5 w-5 !rounded-full" />
          </div>
        ))}
        {/* CTA button */}
        <Shimmer className="h-14 !rounded-2xl" />
      </main>
    </div>
  )
}

/* ── Detail / matched view ── */
function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-slate-100 h-14">
        <div className="px-4 h-full flex items-center gap-3">
          <Shimmer className="h-9 w-9 !rounded-lg" />
          <Shimmer className="h-5 w-44 !rounded-lg" />
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Shimmer className="h-32 !rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <Shimmer className="h-28 !rounded-2xl" />
          <Shimmer className="h-28 !rounded-2xl" />
        </div>
        <Shimmer className="h-48 !rounded-2xl" />
        <Shimmer className="h-14 !rounded-2xl" />
      </main>
    </div>
  )
}

/* ── List / leaderboard variant ── */
function ListSkeleton({ label }: { label?: string }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-slate-100 h-14">
        <div className="px-4 h-full flex items-center gap-3">
          <Shimmer className="h-9 w-9 !rounded-lg" />
          <Shimmer className="h-5 w-40 !rounded-lg" />
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {/* Filter tabs */}
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <Shimmer key={i} className="h-8 w-20 !rounded-full" />
          ))}
        </div>
        {/* Rows */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl">
            <Shimmer className="h-6 w-6 !rounded-md flex-shrink-0" />
            <Shimmer className="h-9 w-9 !rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Shimmer className="h-3.5 w-28 !rounded-md" />
              <Shimmer className="h-3 w-20 !rounded-md" />
            </div>
            <Shimmer className="h-4 w-16 !rounded-md" />
          </div>
        ))}
      </main>
    </div>
  )
}

export function PageLoader({ variant = "subpage", label }: PageLoaderProps) {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes progress {
          0%   { transform: translateX(-100%); }
          60%  { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
      <ProgressBar />
      {variant === "dashboard" && <DashboardSkeleton />}
      {variant === "subpage"   && <SubpageSkeleton label={label} />}
      {variant === "detail"    && <DetailSkeleton />}
      {variant === "list"      && <ListSkeleton label={label} />}
    </>
  )
}
