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
  accountNotice?: ReactNode
  onExploreTerminal: () => void
  onAddFunds: () => void
  onHelp: () => void
}

const steps = [
  { title: "Verify", description: "Protect your identity and account.", icon: ShieldCheck },
  { title: "Explore", description: "Use the terminal before funding.", icon: BarChart3 },
  { title: "Understand", description: "Review risk, fees, and payouts.", icon: Gauge },
]

export function ParticipantOnboardingDashboard({ displayName, isVerified, accountNotice, onExploreTerminal, onAddFunds, onHelp }: ParticipantOnboardingDashboardProps) {
  const [showTour, setShowTour] = useState(true)
  const completed = isVerified ? 1 : 0

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-3 text-slate-100 sm:px-4 md:gap-4 md:px-6 md:py-5">
      <section className="participant-mobile-welcome rounded-2xl border border-amber-300/20 bg-slate-950/85 p-4 shadow-xl shadow-black/20 md:p-6" aria-labelledby="participant-welcome-title">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
              <Sparkles className="h-3.5 w-3.5" /> EliteFund · Participant workspace
            </div>
            <h1 id="participant-welcome-title" className="text-balance text-2xl font-black tracking-tight text-white md:text-3xl">Welcome back, {displayName}.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Your trading workspace is ready. Review your account and activity at a glance.</p>
            <div className="mt-4 hidden flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 md:flex">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Secure session</span>
              <span className="inline-flex items-center gap-1.5"><FileCheck2 className="h-3.5 w-3.5 text-amber-300" /> Clear records</span>
              <span className="inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-cyan-300" /> Full visibility</span>
            </div>
          </div>
          <div className="hidden flex-wrap gap-2 md:flex">
            <Button onClick={onExploreTerminal} className="h-10 rounded-xl bg-amber-400 px-4 font-bold text-slate-950 hover:bg-amber-300">
              <PlayCircle data-icon="inline-start" /> Explore terminal
            </Button>
            <Button onClick={onAddFunds} variant="outline" className="h-10 rounded-xl border-amber-300/25 bg-slate-900/70 px-4 font-bold text-amber-100 hover:bg-amber-300/10">
              <WalletCards data-icon="inline-start" /> Add funds
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6" aria-label="Dashboard quick actions">
        {[
          { href: "/participant/dashboard/refer", icon: Gift, label: "Refer & earn", color: "#22c55e", glow: "rgba(34,197,94,0.3)" },
          { href: "/participant/dashboard/profile", icon: UserRound, label: "Profile", color: "#38bdf8", glow: "rgba(56,189,248,0.3)" },
          { href: "/participant/dashboard/payout", icon: ArrowUpRight, label: "Payout", color: "#a78bfa", glow: "rgba(167,139,250,0.3)" },
          { href: "/participant/dashboard/predict", icon: TrendingUp, label: "Predict", color: "#10B981", glow: "rgba(16,185,129,0.3)" },
        ].map(({ href, icon: Icon, label, color, glow }) => (
          <Link
            key={href}
            href={href}
            className="action-tile flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl p-2 text-center transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 active:scale-95"
            style={{
              background: `linear-gradient(145deg, ${color}14 0%, ${color}07 100%)`,
              border: `1px solid ${color}28`,
            }}
          >
            <span className="flex size-8 items-center justify-center rounded-xl" style={{ background: `${color}18`, boxShadow: `0 0 14px ${glow}, inset 0 1px 0 rgba(255,255,255,0.08)` }}>
              <Icon aria-hidden="true" className="size-4" style={{ color, filter: `drop-shadow(0 0 4px ${glow})` }} />
            </span>
            <span className="text-[10px] font-bold text-slate-300">{label}</span>
          </Link>
        ))}

        <button
          type="button"
          onClick={onAddFunds}
          className="action-tile col-span-2 flex min-h-16 items-center justify-center gap-2 rounded-xl p-2 text-left transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 active:scale-[0.99] sm:col-span-3 md:col-span-2"
          style={{
            background: "linear-gradient(145deg, rgba(214,182,107,0.18) 0%, rgba(214,182,107,0.08) 100%)",
            border: "1px solid rgba(214,182,107,0.35)",
          }}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-amber-200" style={{ boxShadow: "0 0 14px rgba(214,182,107,0.24)" }}>
            <WalletCards aria-hidden="true" className="size-4" />
          </span>
          <span className="min-w-0 flex-1 text-xs font-black text-amber-100">Add funds</span>
        </button>
      </section>

      {accountNotice}

      {showTour ? (
        <section className="rounded-2xl border border-white/10 bg-slate-900/75 p-4 md:p-5" aria-labelledby="guided-tour-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">Quick start</p>
              <h2 id="guided-tour-title" className="mt-1 text-lg font-bold text-white">Before you trade</h2>
            </div>
            <button type="button" onClick={() => setShowTour(false)} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white" aria-label="Dismiss guided tour">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {steps.map(({ title, description, icon: Icon }, index) => (
              <div key={title} className="flex min-h-16 items-center gap-3 rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2.5">
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${index < completed ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300" : "border-amber-300/15 bg-amber-400/10 text-amber-300"}`}>
                  {index < completed ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-100">{title}</span>
                  <p className="text-xs leading-4 text-slate-400">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <button type="button" onClick={() => setShowTour(true)} className="flex w-full items-center justify-between rounded-xl border border-amber-300/15 bg-slate-900/60 px-4 py-3 text-left text-sm font-semibold text-amber-200 transition hover:border-amber-300/30 hover:bg-slate-900">
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
            <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${isVerified ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-200"}`}>{isVerified ? "Verified" : "Action needed"}</span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <CardDescription className="text-xs leading-5 text-slate-400">Verification protects your account and helps us process funding and payouts safely.</CardDescription>
            <Link href="/participant/dashboard/profile" className="mt-4 inline-flex items-center text-xs font-bold text-amber-300 transition hover:text-amber-200">Review status <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-white/10 bg-slate-900/65 text-slate-100 shadow-sm">
          <CardHeader className="flex flex-row items-center gap-3 p-4 pb-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-400/10 text-amber-300"><CreditCard className="h-4 w-4" /></div>
            <div>
              <CardTitle className="text-sm font-bold">Fees, explained</CardTitle>
              <CardDescription className="mt-0.5 text-xs text-slate-400">Funding and withdrawals</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <CardDescription className="text-xs leading-5 text-slate-400">Review the funding amount, any applicable fees, and the amount you can withdraw before confirming.</CardDescription>
            <Link href="/terms" className="mt-4 inline-flex items-center text-xs font-bold text-amber-300 transition hover:text-amber-200">View platform terms <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-white/10 bg-slate-900/65 text-slate-100 shadow-sm">
          <CardHeader className="flex flex-row items-center gap-3 p-4 pb-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-300"><LockKeyhole className="h-4 w-4" /></div>
            <div>
              <CardTitle className="text-sm font-bold">Trade with context</CardTitle>
              <CardDescription className="mt-0.5 text-xs text-slate-400">Start with a clear risk limit</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <CardDescription className="text-xs leading-5 text-slate-400">Markets move quickly. Use the demo terminal first and never fund more than you understand.</CardDescription>
            <button type="button" onClick={onHelp} className="mt-4 inline-flex items-center text-xs font-bold text-amber-300 transition hover:text-amber-200">Get help <CircleHelp className="ml-1 h-3.5 w-3.5" /></button>
          </CardContent>
        </Card>
      </div>

      <section className="rounded-xl border border-amber-300/20 bg-amber-300/5 px-4 py-3.5" aria-labelledby="how-it-works-title">
        <h2 id="how-it-works-title" className="text-sm font-bold text-amber-100">How it works</h2>
        <p className="mt-1 text-sm leading-5 text-slate-300">Choose a market, set your size, review risk, then place a trade. Try demo mode first.</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-amber-200/10 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <span>Capital at risk</span><span>Review before confirming</span><span>Support is available</span>
        </div>
      </section>
    </div>
  )
}

export default ParticipantOnboardingDashboard
