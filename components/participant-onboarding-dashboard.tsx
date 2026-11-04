"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowRight, ArrowUpRight, BarChart3, CheckCircle2, CircleHelp, CreditCard, Gauge, Gift, LockKeyhole, ShieldCheck, TrendingUp, UserRound, WalletCards, X } from "lucide-react"
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

function formatDashboardCount(value: number) {
  const count = Number(value)
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)).toLocaleString() : "0"
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
    { label: "Trades", value: formatDashboardCount(tradeCount) },
    { label: "Referrals", value: formatDashboardCount(referralCount), detail: `${formatDashboardCurrency(referralEarnings)} rewards` },
    { label: "Bonus balance", value: formatDashboardCurrency(bonusBalance) },
  ]

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 text-foreground md:gap-6 md:px-6 md:py-7">
      <section className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground" aria-labelledby="participant-welcome-title">
        <div className="flex flex-col gap-7 p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><span className="size-1.5 rounded-full bg-primary" aria-hidden="true" /> EliteFund / Participant overview</p>
            <h1 id="participant-welcome-title" className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Welcome back, {displayName}.</h1>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Your account, market tools, and next steps in one place.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={onExploreTerminal}><BarChart3 data-icon="inline-start" /> Open trading terminal</Button>
              <Button onClick={onAddFunds} variant="outline"><WalletCards data-icon="inline-start" /> Add funds</Button>
            </div>
          </div>
          <div className="min-w-0 border-t border-border pt-5 lg:min-w-64 lg:border-t-0 lg:border-l lg:py-1 lg:pl-8">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Account balance</p>
            <p className="mt-2 truncate font-mono text-3xl font-semibold tracking-tight text-foreground sm:text-4xl" title={formatDashboardCurrency(accountBalance)}>{formatDashboardCurrency(accountBalance)}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">{accountType} account</span>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${accountStatus === "Frozen" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/10 text-primary"}`}>{accountStatus}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
          {metrics.map(({ label, value, detail }, index) => (
            <div key={label} className={`min-w-0 border-border p-4 sm:p-5 ${index % 2 === 1 ? "border-l" : ""} ${index > 1 ? "border-t sm:border-t-0" : ""} ${index > 0 && index % 2 === 0 ? "sm:border-l" : ""}`}>
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="mt-1 truncate font-mono text-lg font-semibold text-foreground" title={value}>{value}</p>
              {detail && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground" role="status">
        <span className="inline-flex min-w-0 items-center gap-2"><ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden="true" /> Identity: <strong className="text-foreground">{verificationStatus}</strong></span>
        {email && <span className="max-w-full truncate text-xs sm:text-sm" title={email}>{email}</span>}
      </div>

      {accountNotice}

      <section aria-labelledby="quick-access-title" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="quick-access-title" className="text-base font-semibold text-foreground">Quick access</h2>
          <span className="text-xs text-muted-foreground">Everything you need, one tap away</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {[
            { href: "/participant/dashboard/activity", icon: BarChart3, label: "Activity", detail: "Your records" },
            { href: "/participant/dashboard/payout", icon: ArrowUpRight, label: "Payouts", detail: "Request & track" },
            { href: "/participant/dashboard/profile", icon: UserRound, label: "Profile", detail: "Account details" },
            { href: "/participant/dashboard/refer", icon: Gift, label: "Referrals", detail: "Invite & earn" },
            { href: "/participant/dashboard/predict", icon: TrendingUp, label: "Predictions", detail: "Explore markets" },
          ].map(({ href, icon: Icon, label, detail }) => (
            <Link key={href} href={href} className="group flex min-h-24 flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground transition-colors hover:border-primary/50 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <Icon className="size-5 text-primary" aria-hidden="true" />
              <span className="flex min-w-0 flex-col gap-0.5"><span className="text-sm font-semibold">{label}</span><span className="text-xs text-muted-foreground">{detail}</span></span>
            </Link>
          ))}
        </div>
      </section>

      {showTour ? (
        <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground md:p-5" aria-labelledby="guided-tour-title">
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
        <Card className="rounded-xl border-border bg-card text-card-foreground shadow-none">
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

        <Card className="rounded-xl border-border bg-card text-card-foreground shadow-none">
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

        <Card className="rounded-xl border-border bg-card text-card-foreground shadow-none">
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
