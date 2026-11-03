"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Check, ShieldCheck, Target, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DEFAULT_CHALLENGE_PLANS } from "@/lib/challenge-account"
import { FUNDED_PLANS } from "@/lib/funded-account"

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
type PlanCategory = "funded" | "challenge" | "normal"

const categories = [
  { id: "funded", title: "Funded", eyebrow: "For eligible first deposits", description: "Explore five account capacities, each with a clear upfront funding amount.", Icon: ShieldCheck },
  { id: "challenge", title: "Challenge", eyebrow: "Trade an evaluation", description: "Choose a virtual account size and see the targets and limits before you begin.", Icon: Target },
  { id: "normal", title: "Normal", eyebrow: "Fund on your terms", description: "Add to your trading balance with a flexible deposit, starting from $5.", Icon: Wallet },
] as const

export function DashboardPlanExplorer({
  accountType,
  onFund,
}: {
  accountType: PlanCategory
  onFund: (mode: "funded" | "normal", amount: number) => void
}) {
  const [category, setCategory] = useState<PlanCategory>(accountType)
  const [fundedIndex, setFundedIndex] = useState(2)
  const [challengeIndex, setChallengeIndex] = useState(0)
  const [normalAmount, setNormalAmount] = useState(100)
  const funded = FUNDED_PLANS[fundedIndex]
  const challenge = DEFAULT_CHALLENGE_PLANS[challengeIndex]

  const registerUrl = category === "challenge"
    ? `/participant/register?account=challenge&plan=${challenge.key}`
    : `/participant/register?account=${category}`
  const needsNewAccount = accountType === "challenge" ? category !== "challenge" : category === "challenge" || (category === "funded" && accountType !== "funded")

  return (
    <section className="mx-3 mt-3 overflow-hidden rounded-2xl border sm:mx-4" aria-labelledby="dashboard-plans-title" style={{ background: "var(--terminal-graphite-surface)", borderColor: "var(--terminal-graphite-border)" }}>
      <div className="flex flex-col gap-3 border-b p-4 sm:p-6" style={{ borderColor: "var(--terminal-graphite-border)" }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--brand-primary)" }}>Find your next step</p>
        <h2 id="dashboard-plans-title" className="text-balance text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">Which way do you want to trade?</h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-400">Compare what each route includes, then review the details before committing. No guesswork on fees or account rules.</p>
      </div>

      <div className="grid gap-3 p-4 sm:p-6 md:grid-cols-3" role="group" aria-label="Choose a plan category">
        {categories.map(({ id, title, eyebrow, description, Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={category === id}
            onClick={() => setCategory(id)}
            className="group flex min-h-44 flex-col items-start gap-4 rounded-xl border p-5 text-left transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
            style={{ background: category === id ? "color-mix(in srgb, var(--brand-primary) 11%, var(--terminal-graphite-surface-2))" : "var(--terminal-graphite-surface-2)", borderColor: category === id ? "var(--brand-primary)" : "var(--terminal-graphite-border)" }}
          >
            <span className="flex w-full items-start justify-between gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg border" style={{ color: "var(--brand-primary)", borderColor: "color-mix(in srgb, var(--brand-primary) 28%, var(--terminal-graphite-border))" }}><Icon className="size-5" aria-hidden="true" /></span>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{eyebrow}</span>
            </span>
            <span className="flex flex-col gap-1"><strong className="text-lg font-semibold text-slate-100">{title}</strong><span className="text-sm leading-6 text-slate-400">{description}</span></span>
            <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--brand-primary)" }}>{category === id ? "Selected" : "Explore plans"} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
          </button>
        ))}
      </div>

      <div className="border-t p-4 sm:p-6" style={{ background: "var(--terminal-graphite-surface-2)", borderColor: "var(--terminal-graphite-border)" }}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-slate-100">{category === "funded" ? "Choose your funded capacity" : category === "challenge" ? "Choose your evaluation" : "Start with an amount that suits you"}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-400">{category === "funded" ? "Available to eligible funded accounts on their first funded-tier deposit. Eligibility is confirmed in checkout." : category === "challenge" ? "A simulated evaluation. Review its rules and fee before submitting payment for approval." : "These are quick-start amounts, not fixed plans. You can enter another amount in checkout."}</p>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={category === "funded" ? "Funded capacities" : category === "challenge" ? "Challenge sizes" : "Suggested deposit amounts"}>
              {category === "funded" && FUNDED_PLANS.map((plan, index) => <Choice key={plan.baseAmount} selected={fundedIndex === index} onClick={() => setFundedIndex(index)} label={currency.format(plan.baseAmount)} />)}
              {category === "challenge" && DEFAULT_CHALLENGE_PLANS.map((plan, index) => <Choice key={plan.key} selected={challengeIndex === index} onClick={() => setChallengeIndex(index)} label={currency.format(plan.startingBalance)} />)}
              {category === "normal" && [25, 100, 250].map((amount) => <Choice key={amount} selected={normalAmount === amount} onClick={() => setNormalAmount(amount)} label={currency.format(amount)} />)}
            </div>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300" aria-live="polite" aria-atomic="true">
              {category === "funded" && <><span><Check className="mr-1 inline size-4" aria-hidden="true" />{currency.format(funded.baseAmount)} account capacity</span><span><Check className="mr-1 inline size-4" aria-hidden="true" />{currency.format(funded.topUpAmount)} first deposit</span><span><Check className="mr-1 inline size-4" aria-hidden="true" />2% funded drawdown rule</span></>}
              {category === "challenge" && <><span><Check className="mr-1 inline size-4" aria-hidden="true" />{currency.format(challenge.fee)} evaluation fee</span><span><Check className="mr-1 inline size-4" aria-hidden="true" />{challenge.profitTargetPercent}% profit target</span><span><Check className="mr-1 inline size-4" aria-hidden="true" />{challenge.dailyLossLimitPercent}% daily loss / {challenge.maxDrawdownPercent}% max drawdown</span></>}
              {category === "normal" && <><span><Check className="mr-1 inline size-4" aria-hidden="true" />{currency.format(normalAmount)} suggested deposit</span><span><Check className="mr-1 inline size-4" aria-hidden="true" />Choose your actual amount in checkout</span></>}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 lg:items-end">
            {needsNewAccount ? (
              <Button asChild className="h-11 font-semibold" style={{ background: "var(--brand-primary)", color: "var(--brand-primary-foreground)" }}><Link href={registerUrl}>Create a {category} account <ArrowRight data-icon="inline-end" /></Link></Button>
            ) : category === "challenge" ? (
              <Button asChild className="h-11 font-semibold" style={{ background: "var(--brand-primary)", color: "var(--brand-primary-foreground)" }}><Link href={`/participant/dashboard/challenge?plan=${challenge.key}`}>Review &amp; continue <ArrowRight data-icon="inline-end" /></Link></Button>
            ) : (
              <Button type="button" className="h-11 font-semibold" style={{ background: "var(--brand-primary)", color: "var(--brand-primary-foreground)" }} onClick={() => onFund(category, category === "funded" ? funded.topUpAmount : normalAmount)}>Review &amp; continue <ArrowRight data-icon="inline-end" /></Button>
            )}
            <span className="text-xs leading-5 text-slate-400">{needsNewAccount ? "This plan requires its own account type." : category === "challenge" ? "Payment is reviewed before evaluation starts." : "Payment instructions and eligibility appear next."}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function Choice({ selected, onClick, label }: { selected: boolean; onClick: () => void; label: string }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className="min-h-10 rounded-lg border px-4 py-2 font-mono text-sm font-semibold transition-colors hover:border-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300" style={{ background: selected ? "var(--brand-primary)" : "var(--terminal-graphite-surface)", color: selected ? "var(--brand-primary-foreground)" : "var(--terminal-graphite-text)", borderColor: selected ? "var(--brand-primary)" : "var(--terminal-graphite-border)" }}>{label}</button>
}
