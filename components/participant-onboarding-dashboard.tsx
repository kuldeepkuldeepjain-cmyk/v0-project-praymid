"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowRight, ArrowUpRight, BarChart3, Gift, Sparkles, ShieldCheck, TrendingUp, UserRound, WalletCards } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ParticipantAccountType } from "@/components/participant-account-pathways"

interface ParticipantOnboardingDashboardProps {
  displayName: string
  isVerified: boolean
  accountType: ParticipantAccountType
  accountNotice?: ReactNode
  accountOptions?: ReactNode
  onExploreTerminal: () => void
  onAddFunds: () => void
  onHelp: () => void
}

const quickActions = [
  { href: "/participant/dashboard/refer", icon: Gift, label: "Refer" },
  { href: "/participant/dashboard/profile", icon: UserRound, label: "Profile" },
  { href: "/participant/dashboard/payout", icon: ArrowUpRight, label: "Payout" },
  { href: "/participant/dashboard/predict", icon: TrendingUp, label: "Predict" },
]

export function ParticipantOnboardingDashboard({
  displayName,
  isVerified,
  accountType,
  accountNotice,
  accountOptions,
  onExploreTerminal,
  onAddFunds,
  onHelp,
}: ParticipantOnboardingDashboardProps) {
  const accountTypeLabel = accountType === "funded" ? "Funded" : accountType === "challenge" ? "Challenge" : "Normal"

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-3 font-sans text-slate-100 sm:px-4 md:gap-4 md:px-6 md:py-5">
      <header className="rounded-2xl border border-slate-700/80 bg-slate-950/85 p-4 shadow-xl shadow-black/20 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-300">Welcome back</p>
            <h1 className="mt-1 break-words text-balance text-2xl font-semibold leading-tight tracking-tight text-white">
              {displayName}
            </h1>
          </div>
          <Button
            type="button"
            onClick={onExploreTerminal}
            className="hidden h-10 shrink-0 rounded-xl bg-amber-300 px-4 font-bold text-slate-950 hover:bg-amber-200 md:inline-flex"
          >
            <BarChart3 data-icon="inline-start" /> Trade
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full border-amber-300/25 bg-amber-300/10 px-3 py-1 text-sm font-semibold text-amber-100">
            <TrendingUp data-icon="inline-start" /> {accountTypeLabel} account
          </Badge>
          <Link
            href="/participant/dashboard/profile"
            aria-label={isVerified ? "Identity verified. Open profile" : "Verify your identity in profile"}
            className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${isVerified ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15" : "border-slate-600 bg-slate-800/70 text-slate-200 hover:border-amber-300/30"}`}
          >
            <ShieldCheck className="size-4" aria-hidden="true" />
            {isVerified ? "Verified" : "Verify identity"}
          </Link>
        </div>
      </header>

      {accountNotice}

      <section className="grid grid-cols-4 gap-2" aria-label="Dashboard shortcuts">
        {quickActions.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/70 px-1.5 py-2 text-center text-slate-200 transition-colors hover:border-amber-300/35 hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 active:scale-[0.98]"
          >
            <span className="flex size-9 items-center justify-center rounded-lg border border-amber-300/15 bg-amber-300/10 text-amber-200 transition-colors group-hover:bg-amber-300/15">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="truncate text-sm font-semibold">{label}</span>
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-2" aria-label="Account actions">
        <button
          type="button"
          onClick={onAddFunds}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-amber-300/35 bg-amber-300 px-3 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 active:scale-[0.99]"
        >
          <WalletCards className="size-4" aria-hidden="true" /> Add funds
        </button>
        <button
          type="button"
          onClick={onHelp}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/70 px-3 text-sm font-semibold text-slate-100 transition-colors hover:border-amber-300/30 hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 active:scale-[0.99]"
        >
          <Sparkles className="size-4 text-amber-200" aria-hidden="true" /> AI coach
        </button>
      </section>

      {accountOptions}
    </div>
  )
}

export default ParticipantOnboardingDashboard
