"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  BadgeCheck,
  ChartCandlestick,
  CheckCircle2,
  CircleHelp,
  Compass,
  Eye,
  EyeOff,
  Gift,
  Plus,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { DashboardFundingPreview } from "@/components/dashboard-funding-preview"
import { ParticipantSessionAtlas } from "@/components/participant-session-atlas"
import { ParticipantDashboardHero } from "@/components/participant-dashboard-hero"

interface ParticipantOnboardingDashboardProps {
  displayName: string
  email?: string
  isVerified: boolean
  verificationStatus: string
  accountBalance: number
  accountType: "Standard" | "Funded"
  accountStatus: "Active" | "Frozen" | "Breached"
  balanceResetReason?: string
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
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

function formatDashboardCount(value: number) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))).toLocaleString() : "0"
}

const shortcuts = [
  { href: "/participant/dashboard/activity", icon: Activity, label: "Activity", detail: "Transactions and account events" },
  { href: "/participant/dashboard/payout", icon: ArrowDownToLine, label: "Payouts", detail: "Request and track withdrawals" },
  { href: "/participant/dashboard/profile", icon: UserRound, label: "Profile", detail: "Identity and account details" },
  { href: "/participant/dashboard/refer", icon: Gift, label: "Referrals", detail: "Invite traders and view rewards" },
  { href: "/participant/dashboard/predict", icon: Compass, label: "Predictions", detail: "Review market opportunities" },
]

export function ParticipantOnboardingDashboard({
  displayName,
  email,
  isVerified,
  verificationStatus,
  accountBalance,
  accountType,
  accountStatus,
  balanceResetReason,
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
  const [balancesVisible, setBalancesVisible] = useState(true)
  const money = (value: number) => balancesVisible ? formatDashboardCurrency(value) : "••••••"
  const hasFundedWallet = accountBalance > 0
  const readinessScore = Math.round(((isVerified ? 1 : 0) + (hasFundedWallet ? 1 : 0) + 1) / 3 * 100)
  const metrics = [
    { label: "Total earnings", value: money(totalEarnings), detail: "All-time recorded", icon: Sparkles },
    { label: "Executed trades", value: formatDashboardCount(tradeCount), detail: "Trading history", icon: ChartCandlestick },
    { label: "Referral network", value: formatDashboardCount(referralCount), detail: `${money(referralEarnings)} earned`, icon: Gift },
    { label: "Bonus balance", value: money(bonusBalance), detail: "Promotional funds", icon: Wallet },
  ]

  return (
    <div className="participant-home-workspace participant-command-workspace mx-auto flex w-full max-w-7xl flex-col gap-5 px-3 py-5 font-sans sm:px-5 md:gap-6 md:px-7 md:py-8">
      <header className="participant-command-intro">
        <div className="min-w-0">
          <p className="participant-home-eyebrow">Participant command center</p>
          <h1 className="mt-1 text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Welcome back, {displayName}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Monitor your capital, review performance, and move directly to the tools you use most.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={accountStatus !== "Active" ? "destructive" : "secondary"}>{accountStatus}</Badge>
          <Badge asChild variant="outline">
            <Link href="/participant/dashboard/profile">
              {isVerified ? <BadgeCheck data-icon="inline-start" aria-hidden="true" /> : <ShieldCheck data-icon="inline-start" aria-hidden="true" />}
              {verificationStatus}
            </Link>
          </Badge>
        </div>
      </header>

      <div className="participant-command-top-grid">
        <ParticipantDashboardHero displayName={displayName} onExploreTerminal={onExploreTerminal} />

        <Card className="participant-command-wallet">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wallet className="size-4" aria-hidden="true" /> Available balance
            </CardTitle>
            <CardAction>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={balancesVisible ? "Hide account balances" : "Show account balances"} aria-pressed={!balancesVisible} onClick={() => setBalancesVisible(!balancesVisible)}>
                {balancesVisible ? <Eye /> : <EyeOff />}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="min-w-0">
              <p className="participant-command-balance font-mono" aria-label={balancesVisible ? `Account balance ${formatDashboardCurrency(accountBalance)}` : "Account balance hidden"}>{money(accountBalance)}</p>
              {balanceResetReason && <p role="status" className="mt-3 text-pretty text-sm leading-6 text-muted-foreground">{balanceResetReason}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{accountType} account</Badge>
                <span className="text-xs text-muted-foreground">USDT wallet</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" size="lg" onClick={onAddFunds} className="rounded-xl"><Plus data-icon="inline-start" /> Add funds</Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl"><Link href="/participant/dashboard/payout">Withdraw <ArrowUpRight data-icon="inline-end" /></Link></Button>
            </div>
          </CardContent>
          <CardFooter className="justify-between border-t pr-20 text-xs text-muted-foreground sm:pr-6">
            <span>Bonus funds</span>
            <span className="font-mono text-foreground">{money(bonusBalance)}</span>
          </CardFooter>
        </Card>
      </div>

      {accountType === "Standard" && accountStatus === "Active" && (
        <DashboardFundingPreview balance={accountBalance} visible={balancesVisible} />
      )}
      <ParticipantSessionAtlas />

      <section className="participant-command-metrics" aria-label="Performance overview">
        {metrics.map(({ label, value, detail, icon: Icon }) => (
          <Card className="participant-command-metric" key={label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <CardAction><span className="participant-command-icon"><Icon className="size-4" aria-hidden="true" /></span></CardAction>
            </CardHeader>
            <CardContent>
              <p className="truncate font-mono text-xl font-semibold tracking-tight text-foreground sm:text-2xl" title={value}>{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {accountNotice}

      <div className="participant-command-grid">
        <Card className="participant-command-actions">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Move from overview to execution without searching through menus.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={onExploreTerminal} className="participant-command-action group">
              <span className="participant-command-icon"><ChartCandlestick className="size-5" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1"><strong>Trading terminal</strong><small>Charts, orders, and positions</small></span>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
            <button type="button" onClick={onAddFunds} className="participant-command-action group">
              <span className="participant-command-icon"><Plus className="size-5" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1"><strong>Add funds</strong><small>Choose a secure payment route</small></span>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
            <Link href="/participant/dashboard/payout" className="participant-command-action group">
              <span className="participant-command-icon"><ArrowDownToLine className="size-5" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1"><strong>Request payout</strong><small>Withdraw and track status</small></span>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link href="/participant/dashboard/predict" className="participant-command-action group participant-command-action-featured">
              <span className="participant-command-icon"><Compass className="size-5" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1"><strong>Market predictions</strong><small>Explore upcoming opportunities</small></span>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>

        <Card className="participant-command-readiness">
          <CardHeader>
            <CardTitle>Account readiness</CardTitle>
            <CardDescription>Complete the essentials for uninterrupted funding and payouts.</CardDescription>
            <CardAction><Badge variant="secondary">{readinessScore}%</Badge></CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Progress value={readinessScore} aria-label={`Account readiness ${readinessScore}%`} />
            <div className="flex flex-col gap-1">
              <Link href="/participant/dashboard/profile" className="participant-command-check">
                {isVerified ? <CheckCircle2 className="size-4 text-primary" aria-hidden="true" /> : <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />}
                <span><strong>Identity verification</strong><small>{isVerified ? "Completed" : "Action required"}</small></span>
                <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </Link>
              <Separator />
              <button type="button" onClick={onAddFunds} className="participant-command-check text-left">
                {hasFundedWallet ? <CheckCircle2 className="size-4 text-primary" aria-hidden="true" /> : <Wallet className="size-4 text-muted-foreground" aria-hidden="true" />}
                <span><strong>Trading capital</strong><small>{hasFundedWallet ? "Wallet funded" : "Add funds when ready"}</small></span>
                <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </button>
              <Separator />
              <button type="button" onClick={onExploreTerminal} className="participant-command-check text-left">
                <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                <span><strong>Trading workspace</strong><small>Terminal available</small></span>
                <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="dashboard-shortcuts-title" className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div><p className="participant-home-eyebrow">Workspace</p><h2 id="dashboard-shortcuts-title" className="mt-1 text-lg font-semibold tracking-tight text-foreground">Everything in reach</h2></div>
          <span className="hidden text-xs text-muted-foreground sm:inline">Frequently used pages</span>
        </div>
        <div className="participant-command-shortcuts">
          {shortcuts.map(({ href, icon: Icon, label, detail }) => (
            <Link key={href} href={href} className="participant-command-shortcut group">
              <span className="participant-command-icon"><Icon className="size-5" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1"><strong>{label}</strong><small>{detail}</small></span>
              <span className="participant-command-shortcut-arrow" aria-hidden="true"><ArrowUpRight /></span>
            </Link>
          ))}
          <button type="button" onClick={onHelp} className="participant-command-shortcut group text-left">
            <span className="participant-command-icon"><CircleHelp className="size-5" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1"><strong>Help center</strong><small>Get support and guidance</small></span>
            <span className="participant-command-shortcut-arrow" aria-hidden="true"><ArrowUpRight /></span>
          </button>
        </div>
      </section>

      <footer className="flex flex-col gap-2 border-t border-border pt-5 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Trading involves risk. Review your limits before opening a position.</p>
        {email && <span className="max-w-full truncate" title={email}>{email}</span>}
      </footer>
    </div>
  )
}
