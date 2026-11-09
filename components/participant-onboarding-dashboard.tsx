"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { Activity, ArrowRight, ArrowUpRight, CheckCircle2, CircleHelp, Compass, Eye, EyeOff, Gift, Plus, ShieldCheck, TrendingUp, UserRound, Wallet, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ParticipantDashboardHero } from "@/components/participant-dashboard-hero"

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

function formatDashboardCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0)
}

function formatDashboardCount(value: number) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))).toLocaleString() : "0"
}

const shortcuts = [
  { href: "/participant/dashboard/activity", icon: Activity, label: "Activity", detail: "Follow your journey" },
  { href: "/participant/dashboard/payout", icon: ArrowUpRight, label: "Payouts", detail: "Request & track" },
  { href: "/participant/dashboard/profile", icon: UserRound, label: "Profile", detail: "Make it yours" },
  { href: "/participant/dashboard/refer", icon: Gift, label: "Referrals", detail: "Grow your network" },
  { href: "/participant/dashboard/predict", icon: Compass, label: "Predictions", detail: "Explore a perspective" },
]

export function ParticipantOnboardingDashboard({
  displayName, email, isVerified, verificationStatus, accountBalance, accountType, accountStatus,
  bonusBalance, totalEarnings, tradeCount, referralCount, referralEarnings, accountNotice,
  onExploreTerminal, onAddFunds, onHelp,
}: ParticipantOnboardingDashboardProps) {
  const [showTour, setShowTour] = useState(true)
  const [balancesVisible, setBalancesVisible] = useState(true)
  const money = (value: number) => balancesVisible ? formatDashboardCurrency(value) : "••••••"
  const metrics = [
    { label: "Total earnings", value: money(totalEarnings), detail: "Your recorded earnings", icon: TrendingUp },
    { label: "Trades", value: formatDashboardCount(tradeCount), detail: "Your trading activity", icon: Activity },
    { label: "Referrals", value: formatDashboardCount(referralCount), detail: `${money(referralEarnings)} rewards`, icon: Gift },
    { label: "Bonus balance", value: money(bonusBalance), detail: "Separate from your wallet", icon: Wallet },
  ]

  return (
    <div className="participant-home-workspace mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 font-sans md:px-7 md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="participant-home-eyebrow">EliteFund / Overview</p>
          <p className="text-sm text-muted-foreground">A little clarity. A different kind of edge.</p>
        </div>
        <Link href="/participant/dashboard/profile" className="participant-home-text-link"><ShieldCheck className="size-4" aria-hidden="true" /> {verificationStatus}<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
      </div>

      <div className="participant-home-top-grid">
        <ParticipantDashboardHero displayName={displayName} onExploreTerminal={onExploreTerminal} />
        <section className="participant-home-wallet" aria-labelledby="home-wallet-title">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-muted-foreground"><Wallet className="size-4" aria-hidden="true" /><h2 id="home-wallet-title" className="text-sm">Account balance</h2></div>
            <Button type="button" variant="ghost" size="icon" aria-label={balancesVisible ? "Hide overview balances" : "Show overview balances"} aria-pressed={!balancesVisible} onClick={() => setBalancesVisible(!balancesVisible)}>
              {balancesVisible ? <Eye data-icon="inline-start" /> : <EyeOff data-icon="inline-start" />}
            </Button>
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <p className="participant-home-balance font-mono" aria-label={balancesVisible ? `Account balance ${formatDashboardCurrency(accountBalance)}` : "Account balance hidden"}>{money(accountBalance)}</p>
            <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{accountType} account</Badge><Badge variant="outline">{accountStatus === "Frozen" ? <><ShieldCheck aria-hidden="true" /> Frozen</> : "Active"}</Badge></div>
          </div>
          <div className="participant-home-wallet-actions">
            <Button type="button" onClick={onAddFunds} size="lg" className="w-full rounded-xl"><Plus data-icon="inline-start" /> Add funds</Button>
            <Button asChild variant="outline" size="lg" className="w-full rounded-xl"><Link href="/participant/dashboard/payout">Withdraw <ArrowUpRight data-icon="inline-end" /></Link></Button>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4 text-sm text-muted-foreground"><span>Wallet currency</span><span className="font-mono text-foreground">USDT</span></div>
        </section>
      </div>

      <section className="participant-home-metrics" aria-label="Account at a glance">
        {metrics.map(({ label, value, detail, icon: Icon }) => (
          <div className="participant-home-metric" key={label}>
            <div className="flex items-center justify-between gap-2"><p className="text-sm text-muted-foreground">{label}</p><Icon className="size-4 shrink-0 text-primary" aria-hidden="true" /></div>
            <p className="truncate font-mono text-2xl font-medium tracking-tight text-foreground" title={value}>{value}</p>
            <p className="text-sm text-muted-foreground">{detail}</p>
          </div>
        ))}
      </section>

      {accountNotice}

      <section aria-labelledby="quick-access-title" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3"><h2 id="quick-access-title" className="text-lg font-medium tracking-tight text-foreground">Where to next?</h2><span className="text-sm text-muted-foreground">Your shortcuts</span></div>
        <div className="participant-home-shortcuts">
          {shortcuts.map(({ href, icon: Icon, label, detail }) => (
            <Link key={href} href={href} className={`participant-home-shortcut group${label === "Predictions" ? " participant-home-prediction" : ""}`}>
              <div className="flex items-center justify-between gap-2"><span className="participant-home-icon"><Icon className="size-5" aria-hidden="true" /></span><ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" /></div>
              <div className="flex flex-col gap-1"><span className="text-sm font-semibold text-foreground">{label}</span><span className="text-sm text-muted-foreground">{detail}</span></div>
            </Link>
          ))}
          <button type="button" onClick={onHelp} className="participant-home-shortcut group text-left">
            <div className="flex items-center justify-between gap-2"><span className="participant-home-icon"><CircleHelp className="size-5" aria-hidden="true" /></span><ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" /></div>
            <span className="flex flex-col gap-1"><span className="text-sm font-semibold text-foreground">Guidance</span><span className="text-sm text-muted-foreground">Find your bearings</span></span>
          </button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="participant-home-panel" aria-labelledby="guided-tour-title">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2"><p className="participant-home-eyebrow">The considered approach</p><h2 id="guided-tour-title" className="text-xl font-medium tracking-tight text-foreground">Before your next move.</h2></div>
            {showTour && <Button type="button" variant="ghost" size="icon" aria-label="Dismiss guided tour" onClick={() => setShowTour(false)}><X /></Button>}
          </div>
          {showTour ? <div className="flex flex-col">
            <Link href="/participant/dashboard/profile" className="participant-home-guide-row"><span className="participant-home-icon">{isVerified ? <CheckCircle2 className="size-5" /> : <ShieldCheck className="size-5" />}</span><span className="flex flex-1 flex-col gap-1"><span className="text-sm font-medium text-foreground">{isVerified ? "Identity verified" : "Verify your identity"}</span><span className="text-sm text-muted-foreground">{isVerified ? "Keep your account details up to date." : "Review your details for funding and payouts."}</span></span><ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></Link>
            <button type="button" onClick={onExploreTerminal} className="participant-home-guide-row text-left"><span className="participant-home-icon"><Compass className="size-5" /></span><span className="flex flex-1 flex-col gap-1"><span className="text-sm font-medium text-foreground">Get to know your markets</span><span className="text-sm text-muted-foreground">Explore the terminal before placing a trade.</span></span><ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></button>
            <Link href="/terms" className="participant-home-guide-row"><span className="participant-home-icon"><ShieldCheck className="size-5" /></span><span className="flex flex-1 flex-col gap-1"><span className="text-sm font-medium text-foreground">Understand the finer details</span><span className="text-sm text-muted-foreground">Read the risks, fees, and withdrawal terms.</span></span><ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></Link>
          </div> : <Button type="button" variant="outline" onClick={() => setShowTour(true)}>Show guided tour again <ArrowRight data-icon="inline-end" /></Button>}
        </section>
        <section className="participant-home-panel participant-home-perspective" aria-labelledby="home-perspective-title">
          <span className="participant-home-icon"><Compass className="size-5" aria-hidden="true" /></span>
          <div className="flex flex-col gap-3"><p className="participant-home-eyebrow">A different perspective</p><h2 id="home-perspective-title" className="max-w-72 text-balance text-2xl font-medium tracking-tight text-foreground">The best move starts<br />with a better question.</h2><p className="max-w-sm text-pretty text-sm leading-6 text-muted-foreground">What is your risk limit? What would change your view? Give every trade a plan before you give it capital.</p></div>
          <div><Button type="button" variant="outline" onClick={onHelp} className="rounded-xl">Talk it through <ArrowUpRight data-icon="inline-end" /></Button></div>
        </section>
      </div>
      <footer className="flex flex-col gap-2 border-t border-border pt-5 text-sm leading-6 text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><p>Capital at risk. Clarity before commitment.</p>{email && <span className="max-w-full truncate" title={email}>{email}</span>}</footer>
    </div>
  )
}
