"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { DEFAULT_CHALLENGE_PLANS } from "@/lib/challenge-account"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export type ParticipantAccountType = "normal" | "challenge" | "funded"

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

const challengePlans = DEFAULT_CHALLENGE_PLANS
const challengeRules = challengePlans[0]
const challengeBalanceRange = [
  Math.min(...challengePlans.map((plan) => plan.startingBalance)),
  Math.max(...challengePlans.map((plan) => plan.startingBalance)),
]
const challengeFeeRange = [
  Math.min(...challengePlans.map((plan) => plan.fee)),
  Math.max(...challengePlans.map((plan) => plan.fee)),
]

const accountTypes = {
  normal: "Normal account",
  challenge: "Challenge account",
  funded: "Funded account",
} satisfies Record<ParticipantAccountType, string>

const options = [
  {
    type: "normal" as const,
    title: "Normal account",
    subtitle: "Standard platform access",
    description: "Trade using your account balance with familiar platform tools and clear position visibility.",
    facts: [
      { label: "Leverage", value: "Up to 1,000×" },
      { label: "Risk tools", value: "Stop-loss · take-profit · margin" },
      { label: "Records", value: "Activity and trade history" },
    ],
    note: "Actual leverage depends on instrument margin and account terms.",
    href: "/#accounts",
    action: "Compare normal account",
  },
  {
    type: "challenge" as const,
    title: "Challenge account",
    subtitle: "Structured trading evaluation",
    description: "Work toward a published target while your daily loss and drawdown limits are monitored.",
    facts: [
      { label: "Plans and fees", value: `${currency.format(challengeBalanceRange[0])}–${currency.format(challengeBalanceRange[1])} · ${currency.format(challengeFeeRange[0])}–${currency.format(challengeFeeRange[1])}` },
      { label: "Target and daily loss", value: `${challengeRules.profitTargetPercent}% target · ${challengeRules.dailyLossLimitPercent}% daily limit` },
      { label: "Risk and activity", value: `${challengeRules.maxDrawdownPercent}% max drawdown · ${challengeRules.minimumTradingDays} minimum days` },
    ],
    note: `Challenge leverage is capped at ${challengeRules.leverage}×. Review all plan rules and eligibility before registering.`,
    href: "/#programs",
    action: "Review Challenge rules",
  },
  {
    type: "funded" as const,
    title: "Funded account",
    subtitle: "Trade published funded capacity",
    description: "Trade within a fixed drawdown framework, with payout eligibility governed by the applicable terms.",
    facts: [
      { label: "Capacity tiers", value: "$5,000–$100,000" },
      { label: "Drawdown rule", value: "Fixed 2% threshold" },
      { label: "Eligible profit share", value: "Up to 90%" },
    ],
    note: "Capacity is not a guaranteed payout. Program fees, verification, and terms apply.",
    href: "/#funded-accounts",
    action: "Review funded terms",
  },
]

export function ParticipantAccountPathways({ accountType }: { accountType: ParticipantAccountType }) {
  const otherOptions = options.filter((option) => option.type !== accountType)

  return (
    <section className="w-full min-w-0 max-w-7xl" aria-labelledby="account-pathways-title">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">Account guide</p>
          <h2 id="account-pathways-title" className="mt-1 text-lg font-semibold tracking-tight text-white">Explore other account types</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
            Current account: <span className="font-semibold text-slate-200">{accountTypes[accountType]}</span>. Here are the other two options.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-semibold text-amber-200">
          <span className="size-1.5 rounded-full bg-amber-300" aria-hidden="true" />
          {accountTypes[accountType]} active
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {otherOptions.map((option) => {
          return (
            <Card key={option.type} className="min-w-0 gap-0 rounded-2xl border-slate-700/80 bg-slate-900/80 py-0 text-slate-100 shadow-sm">
              <CardHeader className="flex flex-col items-start gap-2 px-4 py-4">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Alternative account</p>
                  <CardTitle id={`account-option-${option.type}-title`} role="heading" aria-level={3} className="mt-1 text-sm font-semibold text-white">
                    {option.title}
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs font-medium text-amber-200/90">{option.subtitle}</CardDescription>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{option.description}</p>
                </div>
              </CardHeader>

              <CardContent className="px-4 pb-3">
                <dl className="rounded-xl border border-slate-700/70 bg-slate-950/45 px-3">
                  {option.facts.map((fact) => (
                    <div key={fact.label} className="flex min-w-0 flex-col gap-0.5 border-b border-slate-700/60 py-2 last:border-0 last:pb-2">
                      <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">{fact.label}</dt>
                      <dd className="break-words text-xs font-semibold leading-5 text-slate-100">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-[11px] leading-4 text-slate-500">{option.note}</p>
              </CardContent>

              <CardFooter className="px-4 pb-4 pt-0">
                <Link href={option.href} className="inline-flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border border-amber-300/20 bg-amber-300/5 px-3 text-xs font-semibold text-amber-200 transition-colors hover:border-amber-300/40 hover:bg-amber-300/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
                  {option.action}
                  <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                </Link>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
