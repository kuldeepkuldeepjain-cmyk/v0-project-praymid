import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight, BarChart3, Gauge, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DEFAULT_CHALLENGE_PLANS } from "@/lib/challenge-account"

export const metadata: Metadata = {
  title: "Account guide",
  description: "Compare EliteFund account types, published limits, and key terms.",
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

const challengePlans = DEFAULT_CHALLENGE_PLANS
const challengeBalanceRange = [
  Math.min(...challengePlans.map((plan) => plan.startingBalance)),
  Math.max(...challengePlans.map((plan) => plan.startingBalance)),
]
const challengeFeeRange = [
  Math.min(...challengePlans.map((plan) => plan.fee)),
  Math.max(...challengePlans.map((plan) => plan.fee)),
]
const challengeRules = challengePlans[0]

const accountDetails = [
  {
    id: "normal",
    title: "Normal account",
    subtitle: "Standard platform access",
    icon: BarChart3,
    facts: [
      { label: "Leverage", value: "Up to 1,000×", numeric: true },
      { label: "Risk tools", value: "Stop-loss · take-profit · margin", numeric: false },
      { label: "Records", value: "Activity and trade history", numeric: false },
    ],
    note: "Actual leverage depends on instrument margin and the terms for your account.",
  },
  {
    id: "challenge",
    title: "Challenge account",
    subtitle: "Structured trading evaluation",
    icon: Gauge,
    facts: [
      { label: "Plans and fees", value: `${currency.format(challengeBalanceRange[0])}–${currency.format(challengeBalanceRange[1])} · ${currency.format(challengeFeeRange[0])}–${currency.format(challengeFeeRange[1])}`, numeric: true },
      { label: "Profit target", value: `${challengeRules.profitTargetPercent}%`, numeric: true },
      { label: "Loss limits", value: `${challengeRules.dailyLossLimitPercent}% daily · ${challengeRules.maxDrawdownPercent}% max drawdown`, numeric: true },
      { label: "Requirements", value: `${challengeRules.minimumTradingDays} minimum days · ${challengeRules.leverage}× leverage`, numeric: true },
    ],
    note: "Review the selected plan’s full rules and eligibility before registering.",
  },
  {
    id: "funded",
    title: "Funded account",
    subtitle: "Trade within published capacity",
    icon: ShieldCheck,
    facts: [
      { label: "Capacity tiers", value: "$5,000–$100,000", numeric: true },
      { label: "Drawdown rule", value: "Fixed 2% threshold", numeric: true },
      { label: "Eligible profit share", value: "Up to 90%", numeric: true },
    ],
    note: "Capacity is not a guaranteed payout. Program fees, verification, and terms apply.",
  },
]

export default function AccountGuidePage() {
  return (
    <main className="min-h-dvh bg-[#111315] px-3 pb-28 pt-4 font-sans text-slate-100 sm:px-5 md:pb-8 md:pt-7">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <Link
          href="/participant/dashboard"
          className="inline-flex min-h-10 items-center gap-2 self-start rounded-lg pr-2 text-sm font-semibold text-slate-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Dashboard
        </Link>

        <header className="rounded-2xl border border-slate-700/80 bg-slate-950/75 p-4 sm:p-6">
          <p className="text-sm font-semibold text-amber-300">EliteFund</p>
          <h1 className="mt-1 text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl">Account guide</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">Compare account types and key rules.</p>
        </header>

        <div className="grid gap-3 lg:grid-cols-3">
          {accountDetails.map(({ id, title, subtitle, icon: Icon, facts, note }) => (
            <Card key={id} id={id} className="scroll-mt-4 gap-0 rounded-2xl border-slate-700/80 bg-slate-950/70 py-0 text-slate-100 shadow-sm">
              <CardHeader className="flex flex-row items-center gap-3 p-4 pb-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <CardTitle className="text-base font-semibold text-white">{title}</CardTitle>
                  <CardDescription className="mt-1 text-sm text-slate-400">{subtitle}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <dl className="flex flex-col divide-y divide-slate-700/60 rounded-xl border border-slate-700/70 bg-slate-900/50 px-3">
                  {facts.map(({ label, value, numeric }) => (
                    <div key={label} className="flex min-w-0 flex-col gap-1 py-3">
                      <dt className="text-sm font-medium text-slate-400">{label}</dt>
                      <dd className={`break-words text-sm font-semibold leading-relaxed text-slate-100 ${numeric ? "font-mono tabular-nums" : ""}`}>{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{note}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Link
          href="/terms"
          className="inline-flex min-h-11 items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-900/60 px-4 text-sm font-semibold text-slate-200 transition-colors hover:border-amber-300/30 hover:text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          Platform terms <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
        </Link>
      </div>
    </main>
  )
}
