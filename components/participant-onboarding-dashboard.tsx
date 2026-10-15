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
  { title: "Verify", description: "Protect your account.", icon: ShieldCheck },
  { title: "Explore", description: "Try the terminal before funding.", icon: BarChart3 },
  { title: "Understand", description: "Review risks, fees, and payouts.", icon: Gauge },
]

export function ParticipantOnboardingDashboard({ displayName, isVerified, onExploreTerminal, onAddFunds, onHelp }: ParticipantOnboardingDashboardProps) {
  const [showTour, setShowTour] = useState(true)
  const completed = isVerified ? 1 : 0

  return (
    <div className="mx-auto max-w-7xl space-y-3 px-3 py-3 text-slate-100 md:px-6 md:py-5">
      <section className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-slate-950/80 p-4 shadow-xl shadow-amber-950/20 md:p-6">
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200"><Sparkles className="h-3.5 w-3.5" /> EliteFund</div>
            <h1 className="text-balance text-2xl font-black tracking-tight md:text-4xl">Welcome, {displayName}.</h1>
            <p className="mt-1 max-w-xl text-sm leading-5 text-slate-400">Explore first. Fund when ready.</p>
            </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onExploreTerminal} className="bg-amber-400 font-bold text-slate-950 hover:bg-amber-300"><PlayCircle className="mr-2 h-4 w-4" /> Explore terminal</Button>
            <Button onClick={onAddFunds} variant="outline" className="border-amber-300/30 bg-amber-300/5 font-bold text-amber-100 hover:bg-amber-300/15"><WalletCards className="mr-2 h-4 w-4" /> Add funds</Button>
          </div>
        </div>
      </section>

      {showTour ? <section className="rounded-2xl border border-white/10 bg-slate-900/75 p-4 md:p-5" aria-labelledby="guided-tour-title">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">Quick start</p><h2 id="guided-tour-title" className="mt-1 text-lg font-bold">Before you trade</h2></div><button onClick={() => setShowTour(false)} className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white" aria-label="Dismiss guided tour"><X className="h-4 w-4" /></button></div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">{steps.map(({ title, description, icon: Icon }, index) => <div key={title} className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2.5"><div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${index < completed ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>{index < completed ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</div><div><span className="text-xs font-bold">{title}</span><p className="text-[11px] leading-4 text-slate-400">{description}</p></div></div>)}</div>
      </section> : <button onClick={() => setShowTour(true)} className="text-left text-xs font-bold text-amber-300 hover:text-amber-200">Show guided tour again</button>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-white/10 bg-slate-900/70 text-slate-100"><CardContent className="p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-emerald-300" /><h2 className="font-bold">Verification</h2></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${isVerified ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-200"}`}>{isVerified ? "Verified" : "Action needed"}</span></div><p className="mt-3 text-xs leading-5 text-slate-400">Verification protects your account and helps us process funding and payouts safely.</p><Link href="/participant/dashboard/profile" className="mt-4 inline-flex items-center text-xs font-bold text-amber-300">Review status <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></CardContent></Card>
        <Card className="border-white/10 bg-slate-900/70 text-slate-100"><CardContent className="p-5"><div className="flex items-center gap-3"><CreditCard className="h-5 w-5 text-amber-300" /><h2 className="font-bold">Fees, explained</h2></div><p className="mt-3 text-xs leading-5 text-slate-400">No surprise charges. Review the funding amount, any applicable fees, and the amount you can withdraw before confirming.</p><Link href="/terms" className="mt-4 inline-flex items-center text-xs font-bold text-amber-300">View platform terms <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></CardContent></Card>
        <Card className="border-white/10 bg-slate-900/70 text-slate-100"><CardContent className="p-5"><div className="flex items-center gap-3"><LockKeyhole className="h-5 w-5 text-amber-300" /><h2 className="font-bold">Trade with context</h2></div><p className="mt-3 text-xs leading-5 text-slate-400">Markets move quickly. Use the demo terminal first, set a clear risk limit, and never fund more than you understand.</p><button onClick={onHelp} className="mt-4 inline-flex items-center text-xs font-bold text-amber-300">Get help <CircleHelp className="ml-1 h-3.5 w-3.5" /></button></CardContent></Card>
      </div>

      <section className="rounded-xl border border-amber-300/20 bg-amber-300/5 px-4 py-3"><h2 className="text-sm font-bold text-amber-100">How it works</h2><p className="mt-1 text-xs leading-5 text-slate-300">Choose a market, set your size, review risk, then place a trade. Try demo mode first.</p></section>
    </div>
  )
}

export default ParticipantOnboardingDashboard
