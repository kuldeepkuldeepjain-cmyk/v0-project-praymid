"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2, CreditCard, Layers3, ShieldCheck, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface ParticipantFundingOpportunityProps {
  accountType: "Standard" | "Funded"
  onAddFunds: () => void
}

export function ParticipantFundingOpportunity({ accountType, onAddFunds }: ParticipantFundingOpportunityProps) {
  const isFunded = accountType === "Funded"

  return (
    <section className="participant-funding-opportunity" aria-labelledby="funding-opportunity-title">
      <div className="participant-funding-opportunity-copy">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="participant-funding-badge"><Sparkles aria-hidden="true" /> Capital workspace</Badge>
          <span className="text-xs font-medium text-muted-foreground">Clear steps. Secure review.</span>
        </div>
        <div className="flex flex-col gap-3">
          <p className="participant-home-eyebrow">Ready when you are</p>
          <h2 id="funding-opportunity-title" className="max-w-2xl text-balance text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {isFunded ? "Give your funded strategy more room to move." : "Turn market curiosity into a prepared trading plan."}
          </h2>
          <p className="max-w-2xl text-pretty text-sm leading-6 text-muted-foreground">
            {isFunded
              ? "Explore eligible funded-account tiers and choose the capacity that fits your risk plan."
              : "Add funds only when your limits are clear. Review the available payment routes before you commit capital."}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="button" size="lg" className="participant-funding-primary rounded-xl" onClick={onAddFunds}>
            {isFunded ? "Explore funded tiers" : "Explore funding options"}<ArrowRight data-icon="inline-end" />
          </Button>
          <Button asChild type="button" size="lg" variant="ghost" className="rounded-xl"><Link href="/terms">Review terms</Link></Button>
        </div>
      </div>

      <div className="participant-funding-steps" aria-label="Funding process">
        <div className="participant-funding-step">
          <span className="participant-funding-step-icon"><Layers3 aria-hidden="true" /></span>
          <div><strong>{isFunded ? "Choose your tier" : "Choose an amount"}</strong><p>{isFunded ? "Compare available account capacity." : "Start from the amount that suits your plan."}</p></div>
        </div>
        <div className="participant-funding-step">
          <span className="participant-funding-step-icon"><CreditCard aria-hidden="true" /></span>
          <div><strong>Select a payment route</strong><p>Use an available UPI, bank, or USDT option.</p></div>
        </div>
        <div className="participant-funding-step">
          <span className="participant-funding-step-icon"><ShieldCheck aria-hidden="true" /></span>
          <div><strong>Submit for review</strong><p>Your balance updates after payment approval.</p></div>
        </div>
        <div className="participant-funding-assurance"><CheckCircle2 aria-hidden="true" /><span>Capital remains at risk. Fund only what fits your plan.</span></div>
      </div>
    </section>
  )
}
