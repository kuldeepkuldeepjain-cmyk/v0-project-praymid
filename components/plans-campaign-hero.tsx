"use client"

import Image from "next/image"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DEFAULT_CHALLENGE_PLANS, formatChallengeFee } from "@/lib/challenge-account"

export function PlansCampaignHero({ onExplore }: { onExplore: () => void }) {
  const entryPlan = DEFAULT_CHALLENGE_PLANS[0]

  return (
    <section aria-labelledby="plans-campaign-title" className="grid overflow-hidden rounded-2xl border border-[color:var(--terminal-graphite-border)] bg-[color:var(--terminal-graphite-surface)] md:grid-cols-[1.15fr_0.85fr]">
      <div className="flex flex-col items-start gap-5 p-6 sm:p-9 lg:p-12">
        <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-[color:var(--brand-primary)] text-[color:var(--brand-primary)]">A smarter way to start</Badge>{entryPlan.discountPercent && <Badge className="border-0 bg-[color:var(--brand-primary)] text-[color:var(--brand-primary-foreground)]">{entryPlan.discountPercent}% instant discount</Badge>}</div>
        <div className="flex flex-col gap-4">
          <h2 id="plans-campaign-title" className="max-w-xl text-balance text-3xl font-semibold leading-tight tracking-tight text-[color:var(--terminal-graphite-text)] sm:text-4xl lg:text-5xl">
            A bigger stage for your next move.
          </h2>
          <p className="max-w-lg text-pretty text-sm leading-6 text-[color:var(--terminal-graphite-muted)] sm:text-base">
            Explore a ${entryPlan.startingBalance.toLocaleString("en-US")} simulated Challenge account. Get ${entryPlan.discountPercent ?? 0}% off the standard ${formatChallengeFee(entryPlan.originalFee ?? entryPlan.fee)} fee and pay ${formatChallengeFee(entryPlan.fee)}. Clear rules, a focused starting point, and room to show what you can do.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex flex-col gap-1"><span className="text-xs font-medium text-[color:var(--terminal-graphite-muted)]">Standard fee <del>{formatChallengeFee(entryPlan.originalFee ?? entryPlan.fee)}</del></span><strong className="font-mono text-4xl font-bold tracking-tight text-[color:var(--brand-primary)]">{formatChallengeFee(entryPlan.fee)}</strong><span className="text-xs font-semibold text-[color:var(--brand-primary)]">Pay once · save {formatChallengeFee((entryPlan.originalFee ?? entryPlan.fee) - entryPlan.fee)}</span></div>
          <span className="text-sm leading-5 text-[color:var(--terminal-graphite-muted)]">≈ ₹{(entryPlan.fee * 104).toLocaleString("en-IN")} INR<span className="align-top">*</span><br />approximate at current rate</span>
        </div>
        <Button type="button" onClick={onExplore} className="h-11 bg-[color:var(--brand-primary)] font-semibold text-[color:var(--brand-primary-foreground)] hover:opacity-90">
          Explore Challenge 5K <ArrowRight data-icon="inline-end" />
        </Button>
        <p className="max-w-lg text-xs leading-5 text-[color:var(--terminal-graphite-muted)]">*Final INR amount depends on the checkout exchange rate. The Challenge is a simulated evaluation, not a funded account. Payment is reviewed before activation.</p>
      </div>
      <div className="relative min-h-52 overflow-hidden border-t border-[color:var(--terminal-graphite-border)] md:min-h-full md:border-l md:border-t-0">
        <Image src="/images/elitefund-plans-campaign.png" fill sizes="(max-width: 768px) 100vw, 40vw" className="object-cover" alt="Blue-lit trading desk with a candlestick chart on a monitor" priority />
        <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg border border-[color:var(--terminal-graphite-border)] bg-[color:var(--terminal-graphite-surface)] px-3 py-2 text-xs font-medium text-[color:var(--terminal-graphite-text)] sm:bottom-6 sm:left-6">
          <ShieldCheck className="size-4 text-[color:var(--brand-primary)]" aria-hidden="true" /> Choose your path with confidence
        </div>
      </div>
    </section>
  )
}
