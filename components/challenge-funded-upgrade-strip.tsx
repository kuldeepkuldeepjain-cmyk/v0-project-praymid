"use client"

import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const fundedPlans = [
  { capacity: "$5K", fee: "$50" },
  { capacity: "$10K", fee: "$100" },
  { capacity: "$25K", fee: "$250" },
  { capacity: "$50K", fee: "$500" },
  { capacity: "$100K", fee: "$1,000" },
]

export function ChallengeFundedUpgradeStrip({ onChoosePlan }: { onChoosePlan: () => void }) {
  return (
    <section className="challenge-funded-strip" aria-labelledby="instant-funded-title">
      <div className="challenge-funded-strip-copy">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="challenge-funded-strip-badge"><Sparkles aria-hidden="true" /> Instant funded option</Badge>
          <span className="text-xs font-medium text-muted-foreground">No challenge evaluation</span>
        </div>
        <div className="flex flex-col gap-2">
          <h2 id="instant-funded-title" className="text-balance text-xl font-semibold tracking-tight text-foreground md:text-2xl">Don&apos;t want challenge rules? Start with an Instant Funded account.</h2>
          <p className="max-w-3xl text-pretty text-sm leading-6 text-muted-foreground">Choose your funded capacity, complete the one-time plan payment, and move to a funded account after approval. Funded-account risk and payout terms still apply.</p>
        </div>
      </div>

      <div className="challenge-funded-plans" role="list" aria-label="Instant funded account tiers">
        {fundedPlans.map((plan) => (
          <button type="button" className="challenge-funded-plan" key={plan.capacity} onClick={onChoosePlan} role="listitem">
            <span className="text-xs text-muted-foreground">Funded capacity</span>
            <strong className="font-mono text-lg text-foreground">{plan.capacity}</strong>
            <span className="text-xs font-medium text-primary">{plan.fee} fee</span>
          </button>
        ))}
      </div>

      <div className="challenge-funded-strip-action">
        <span className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-primary" aria-hidden="true" /> Approval required</span>
        <Button type="button" size="lg" className="rounded-xl" onClick={onChoosePlan}>View funded plans <ArrowRight data-icon="inline-end" /></Button>
      </div>
    </section>
  )
}
