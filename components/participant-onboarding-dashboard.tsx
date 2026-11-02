"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowRight, ArrowUpRight, BarChart3, CheckCircle2, CircleHelp, CreditCard, Eye, FileCheck2, Gauge, Gift, LockKeyhole, PlayCircle, ShieldCheck, Sparkles, TrendingUp, UserRound, WalletCards, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ParticipantOnboardingDashboardProps {
  displayName: string
  email?: string
  isVerified: boolean
  verificationStatus: string
  accountBalance: number
  accountType: "Standard" | "Funded"
  accountStatus: "Active" | "Frozen"
  bonusBalance: number
  totalEarnings: number
  tradeCount: number
  referralCount: number
  referralEarnings: number
  accountNotice?: ReactNode
  onExploreTerminal: () => void
  onAddFunds: () => void
  onHelp: () => void
}

const steps = [
  { title: "Verify", description: "Confirm your identity.", icon: ShieldCheck },
  { title: "Explore", description: "Review markets and tools.", icon: BarChart3 },
  { title: "Understand", description: "Know the risks and fees.", icon: Gauge },
]

function formatDashboardCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

export function ParticipantOnboardingDashboard({
  displayName,
  email,
  isVerified,
  verificationStatus,
  accountBalance,
  accountType,
  accountStatus,
  bonusBalance,
  totalEarnings,
  tradeCount,
  referralCount,
  referralEarnings,
  accountNotice,
  onExploreTerminal,
  onAddFunds,
  onHelp,
}: ParticipantOnboardingDashboardProps) {
  const [showTour, setShowTour] = useState(true)
  const completed = isVerified ? 1 : 0
  const metrics = [
    { label: "Total earnings", value: formatDashboardCurrency(totalEarnings) },
    { label: "Trades", value: tradeCount.toLocaleString() },
    { label: "Referrals", value: referralCount.toLocaleString(), detail: `${formatDashboardCurrency(referralEarnings)} rewards` },
    { label: "Bonus balance", value: formatDashboardCurrency(bonusBalance) },
  ]

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-3 text-slate-100 sm:px-4 md:gap-4 md:px-6 md:py-5">
      <section className="participant-mobile-welcome relative isolate overflow-hidden rounded-2xl border bg-slate-950/85 p-4 shadow-xl shadow-black/20 md:p-6" aria-labelledby="participant-welcome-title" style={{ borderColor: "color-mix(in srgb, var(--brand-primary) 26%, var(--terminal-graphite-border))" }}>
        <div className="participant-welcome-dot-texture pointer-events-none absolute right-0 top-0 z-0 h-36 w-36 md:hidden" aria-hidden="true" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 max-w-2xl">
            <div className="mb-2 hidden items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-sky-300 md:inline-flex">
              <Sparkles className="h-3.5 w-3.5" /> EliteFund · Participant workspace
            </div>
            <p className="participant-welcome-eyebrow mb-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-300 md:hidden">WELCOME BACK</p>
            <h1 id="participant-welcome-title" className="participant-welcome-name text-balance text-[clamp(2.25rem,10.5vw,3rem)] font-bold leading-none tracking-tight text-white md:text-3xl md:leading-tight">
              <span className="md:hidden">{displayName}.</span>
              <span className="hidden md:inline">Welcome back, {displayName}.</span>
            </h1>
            <span className="participant-welcome-accent mt-5 block h-1 w-14 rounded-full md:hidden" style={{ background: "var(--brand-primary)" }} aria-hidden="true" />
            <p className="participant-welcome-copy mt-6 max-w-xl text-[15px] leading-7 text-slate-300 md:mt-2 md:text-sm md:leading-6">
              Balances, activity, and trading tools—at a glance.
            </p>
            <div className="mt-4 hidden flex-wrap items-center gap-x-4 gap-y-2 text-sm font-bold uppercase tracking-[0.12em] text-slate-400 md:flex">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Secure session</span>
              <span className="inline-flex items-center gap-1.5"><FileCheck2 className="h-3.5 w-3.5 text-sky-300" /> Clear records</span>
              <span className="inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-cyan-300" /> Full visibility</span>
            </div>
          </div>
          <div className="hidden flex-wrap gap-2 md:flex">
            <Button onClick={onExploreTerminal} className="h-10 rounded-xl px-4 font-bold" style={{ background: "var(--brand-primary)", color: "var(--brand-primary-foreground)" }}>
              <PlayCircle data-icon="inline-start" /> Explore terminal
            </Button>
            <Button onClick={onAddFunds} variant="outline" className="h-10 rounded-xl bg-slate-900/70 px-4 font-bold" style={{ borderColor: "var(--terminal-graphite-border)", color: "var(--brand-primary)" }}>
              <WalletCards data-icon="inline-start" /> Add funds
            </Button>
          </div>
        </div>
      </section>

      <section
        className="rounded-2xl border p-4 shadow-sm md:p-5"
        aria-labelledby="account-snapshot-title"
        style={{ background: "var(--terminal-graphite-surface)", borderColor: "var(--terminal-graphite-border)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="account-snapshot-title" className="text-sm font-bold uppercase tracking-[0.16em]" style={{ color: "var(--brand-primary)" }}>Account snapshot</h2>
            <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-slate-400">Account balance</p>
            <p className="mt-1 truncate font-mono text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">{formatDashboardCurrency(accountBalance)}</p>
            {email && <p className="mt-1 truncate text-sm text-slate-500">{email}</p>}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="rounded-full border px-2.5 py-1 text-sm font-bold uppercase tracking-wide" style={{ color: "var(--brand-primary)", borderColor: "color-mix(in srgb, var(--brand-primary) 30%, var(--terminal-graphite-border))", background: "color-mix(in srgb, var(--brand-primary) 10%, var(--terminal-graphite-surface-2))" }}>
              {accountType}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-sm font-bold uppercase tracking-wide ${accountStatus === "Frozen" ? "border-red-300/25 bg-red-400/10 text-red-300" : "border-emerald-300/25 bg-emerald-400/10 text-emerald-300"}`}>
              {accountStatus}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {metrics.map(({ label, value, detail }) => (
            <div key={label} className="min-w-0 rounded-xl border p-3" style={{ background: "var(--terminal-graphite-surface-2)", borderColor: "var(--terminal-graphite-border)" }}>
              <p className="truncate text-sm font-semibold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-1 truncate font-mono text-sm font-semibold text-slate-100" title={value}>{value}</p>
              {detail && <p className="mt-0.5 truncate text-sm text-slate-500">{detail}</p>}
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-700/60 pt-3 text-sm">
          <span className="text-slate-400">Identity</span>
          <span className={`font-semibold ${isVerified ? "text-emerald-300" : "text-slate-200"}`}>{verificationStatus}</span>
        </div>
      </section>

      {accountNotice}

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6" aria-label="Dashboard quick actions">
        {[
          { href: "/participant/dashboard/refer", icon: Gift, label: "Refer & earn" },
          { href: "/participant/dashboard/profile", icon: UserRound, label: "Profile" },
          { href: "/participant/dashboard/payout", icon: ArrowUpRight, label: "Payout" },
          { href: "/participant/dashboard/predict", icon: TrendingUp, label: "Predict" },
        ].map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="action-tile flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 active:scale-95"
            style={{ background: "var(--terminal-graphite-surface)", borderColor: "var(--terminal-graphite-border)" }}
          >
            <span className="flex size-8 items-center justify-center rounded-xl" style={{ background: "var(--terminal-graphite-surface-2)" }}>
              <Icon aria-hidden="true" className="size-4" style={{ color: "var(--brand-primary)" }} />
            </span>
            <span className="text-sm font-bold text-slate-300">{label}</span>
          </Link>
        ))}

        <button
          type="button"
          onClick={onAddFunds}
          className="mobile-dashboard-add-funds action-tile col-span-2 flex min-h-16 items-center justify-center gap-2 rounded-xl p-2 text-left transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 active:scale-[0.99] sm:col-span-3 md:col-span-2"
          style={{
            background: "color-mix(in srgb, var(--brand-primary) 10%, var(--terminal-graphite-surface))",
            border: "1px solid color-mix(in srgb, var(--brand-primary) 34%, var(--terminal-graphite-border))",
          }}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border" style={{ color: "var(--brand-primary)", background: "color-mix(in srgb, var(--brand-primary) 10%, transparent)", borderColor: "color-mix(in srgb, var(--brand-primary) 28%, var(--terminal-graphite-border))" }}>
            <WalletCards aria-hidden="true" className="size-4" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-black" style={{ color: "var(--brand-primary)" }}>Add funds</span>
        </button>
        <Link href="/participant/dashboard?view=terminal" className="mobile-dashboard-trade participant-dock-trade-button col-span-2 flex min-h-14 items-center justify-between rounded-xl px-5 font-sans text-base font-semibold sm:col-span-3 md:hidden">
          <BarChart3 className="participant-dock-trade-icon size-5" aria-hidden="true" />
          <span>Trade</span>
          <ArrowRight className="size-5" aria-hidden="true" />
        </Link>
      </section>

      {showTour ? (
        <section className="rounded-2xl border border-white/10 bg-slate-900/75 p-4 md:p-5" aria-labelledby="guided-tour-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-300">Quick start</p>
              <h2 id="guided-tour-title" className="mt-1 text-lg font-bold text-white">Before you trade</h2>
            </div>
            <button type="button" onClick={() => setShowTour(false)} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white" aria-label="Dismiss guided tour">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {steps.map(({ title, description, icon: Icon }, index) => (
              <div key={title} className="flex min-h-16 items-center gap-3 rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2.5">
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${index < completed ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300" : "border-sky-300/20 bg-sky-400/10 text-sky-300"}`}>
                  {index < completed ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-slate-100">{title}</span>
                  <p className="text-sm leading-5 text-slate-400">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <button type="button" onClick={() => setShowTour(true)} className="flex w-full items-center justify-between rounded-xl border border-sky-300/20 bg-slate-900/60 px-4 py-3 text-left text-sm font-semibold text-amber-200 transition hover:border-amber-300/30 hover:bg-slate-900">
          Show guided tour again <ArrowRight className="h-4 w-4" />
        </button>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="rounded-xl border-white/10 bg-slate-900/65 text-slate-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 p-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-300"><ShieldCheck className="h-4 w-4" /></div>
              <CardTitle className="text-sm font-bold">Verification</CardTitle>
            </div>
            <span className={`rounded-full px-2 py-1 text-sm font-bold uppercase tracking-wide ${isVerified ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-200"}`}>{isVerified ? "Verified" : "Action needed"}</span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <CardDescription className="text-sm leading-5 text-slate-400">Keep identity details current for funding and payouts.</CardDescription>
            <Link href="/participant/dashboard/profile" className="mt-4 inline-flex items-center text-sm font-bold text-sky-300 transition hover:text-sky-200">Review status <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-white/10 bg-slate-900/65 text-slate-100 shadow-sm">
          <CardHeader className="flex flex-row items-center gap-3 p-4 pb-3">
              <div className="flex size-9 items-center justify-center rounded-xl border border-sky-300/20 bg-sky-400/10 text-sky-300"><CreditCard className="h-4 w-4" /></div>

            <div>
              <CardTitle className="text-sm font-bold">Fees, explained</CardTitle>
              <CardDescription className="mt-0.5 text-sm text-slate-400">Deposits and withdrawals</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <CardDescription className="text-sm leading-5 text-slate-400">Check fees and withdrawal terms before confirming.</CardDescription>
            <Link href="/terms" className="mt-4 inline-flex items-center text-sm font-bold text-sky-300 transition hover:text-sky-200">View platform terms <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-white/10 bg-slate-900/65 text-slate-100 shadow-sm">
          <CardHeader className="flex flex-row items-center gap-3 p-4 pb-3">
              <div className="flex size-9 items-center justify-center rounded-xl border border-sky-300/20 bg-sky-400/10 text-sky-300"><LockKeyhole className="h-4 w-4" /></div>

            <div>
              <CardTitle className="text-sm font-bold">Trade with context</CardTitle>
              <CardDescription className="mt-0.5 text-sm text-slate-400">Start with a clear risk limit</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <CardDescription className="text-sm leading-5 text-slate-400">Try demo mode. Set a risk limit before trading.</CardDescription>
            <button type="button" onClick={onHelp} className="mt-4 inline-flex items-center text-sm font-bold text-sky-300 transition hover:text-sky-200">Get help <CircleHelp className="ml-1 h-3.5 w-3.5" /></button>
          </CardContent>
        </Card>
      </div>

      <section className="rounded-xl border px-4 py-3.5" aria-labelledby="how-it-works-title" style={{ borderColor: "color-mix(in srgb, var(--brand-primary) 24%, var(--terminal-graphite-border))", background: "color-mix(in srgb, var(--brand-primary) 6%, var(--terminal-graphite-surface))" }}>
        <h2 id="how-it-works-title" className="text-sm font-bold" style={{ color: "var(--brand-primary)" }}>How it works</h2>
        <p className="mt-1 text-sm leading-5 text-slate-300">Choose a market, size the trade, review risk, then confirm.</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-700/60 pt-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          <span>Capital at risk</span><span>Review before confirming</span><span>Support is available</span>
        </div>
      </section>
    </div>
  )
}

export default ParticipantOnboardingDashboard
