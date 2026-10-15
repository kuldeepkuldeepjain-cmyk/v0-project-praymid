"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, BarChart3, CheckCircle2, CircleHelp, CreditCard, Gauge, LockKeyhole, PlayCircle, ShieldCheck, Sparkles, WalletCards, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface ParticipantOnboardingDashboardProps {
  displayName: string
  email?: string
  isVerified: boolean
  onExploreTerminal: () => void
  onAddFunds: () => void
  onHelp: () => void
}

const steps = [
  { title: "Verify your account", description: "Confirm your identity so your account stays secure.", icon: ShieldCheck },
  { title: "Explore the terminal", description: "Review markets and practice with demo trades before funding.", icon: BarChart3 },
  { title: "Understand the rules", description: "Learn risk limits, fees, and how payouts work.", icon: Gauge },
]

export function ParticipantOnboardingDashboard({ displayName, email, isVerified, onExploreTerminal, onAddFunds, onHelp }: ParticipantOnboardingDashboardProps) {
  const [showTour, setShowTour] = useState(true)
  const completed = isVerified ? 1 : 0

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 text-slate-100 md:px-8 md:py-8">
      <section className="relative overflow-hidden rounded-3xl border border-amber-400/20 bg-slate-950/80 p-6 shadow-2xl shadow-amber-950/20 md:p-9">
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200"><Sparkles className="h-3.5 w-3.5" /> Your EliteFund workspace</div>
            <h1 className="text-balance text-3xl font-black tracking-tight md:text-5xl">Welcome, {displayName}.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400 md:text-base">Start at your own pace. Explore the platform, learn how each decision works, and add funds only when you feel ready.</p>
            {email ? <p className="mt-3 text-xs text-slate-500">Signed in as {email}</p> : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={onExploreTerminal} className="bg-amber-400 font-bold text-slate-950 hover:bg-amber-300"><PlayCircle className="mr-2 h-4 w-4" /> Explore demo terminal</Button>
            <Button onClick={onAddFunds} variant="outline" className="border-amber-300/30 bg-amber-300/5 font-bold text-amber-100 hover:bg-amber-300/15"><WalletCards className="mr-2 h-4 w-4" /> Add funds</Button>
          </div>
        </div>
      </section>

      {showTour ? <section className="rounded-2xl border border-white/10 bg-slate-900/75 p-5 md:p-6" aria-labelledby="guided-tour-title">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">A simple first tour</p><h2 id="guided-tour-title" className="mt-1 text-xl font-bold">Three things to know before you trade</h2></div><button onClick={() => setShowTour(false)} className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white" aria-label="Dismiss guided tour"><X className="h-4 w-4" /></button></div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">{steps.map(({ title, description, icon: Icon }, index) => <div key={title} className="rounded-xl border border-white/10 bg-slate-950/60 p-4"><div className="flex items-center gap-3"><div className={`flex h-9 w-9 items-center justify-center rounded-full ${index < completed ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>{index < completed ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}</div><span className="text-sm font-bold">{title}</span></div><p className="mt-3 text-xs leading-5 text-slate-400">{description}</p></div>)}</div>
      </section> : <button onClick={() => setShowTour(true)} className="text-left text-xs font-bold text-amber-300 hover:text-amber-200">Show guided tour again</button>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-white/10 bg-slate-900/70 text-slate-100"><CardContent className="p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-emerald-300" /><h2 className="font-bold">Account verification</h2></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${isVerified ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-200"}`}>{isVerified ? "Verified" : "Action needed"}</span></div><p className="mt-3 text-xs leading-5 text-slate-400">Verification protects your account and helps us process funding and payouts safely.</p><Link href="/participant/dashboard/profile" className="mt-4 inline-flex items-center text-xs font-bold text-amber-300">Review status <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></CardContent></Card>
        <Card className="border-white/10 bg-slate-900/70 text-slate-100"><CardContent className="p-5"><div className="flex items-center gap-3"><CreditCard className="h-5 w-5 text-amber-300" /><h2 className="font-bold">Fees, explained</h2></div><p className="mt-3 text-xs leading-5 text-slate-400">No surprise charges. Review the funding amount, any applicable fees, and the amount you can withdraw before confirming.</p><Link href="/terms" className="mt-4 inline-flex items-center text-xs font-bold text-amber-300">View platform terms <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></CardContent></Card>
        <Card className="border-white/10 bg-slate-900/70 text-slate-100"><CardContent className="p-5"><div className="flex items-center gap-3"><LockKeyhole className="h-5 w-5 text-amber-300" /><h2 className="font-bold">Trade with context</h2></div><p className="mt-3 text-xs leading-5 text-slate-400">Markets move quickly. Use the demo terminal first, set a clear risk limit, and never fund more than you understand.</p><button onClick={onHelp} className="mt-4 inline-flex items-center text-xs font-bold text-amber-300">Get help <CircleHelp className="ml-1 h-3.5 w-3.5" /></button></CardContent></Card>
      </div>

      <section className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5"><h2 className="font-bold text-amber-100">How trading works</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Choose a market, decide whether you expect the price to rise or fall, select your position size, and review the estimated risk before placing a trade. Your balance and open positions update as the market changes. Demo mode lets you learn the flow without using deposited funds.</p></section>
    </div>
  )
}

export default ParticipantOnboardingDashboard
