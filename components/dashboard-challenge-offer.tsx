"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DEFAULT_CHALLENGE_PLANS } from "@/lib/challenge-account"

let dismissedForThisVisit = false

export function DashboardChallengeOffer() {
  const [isVisible, setIsVisible] = useState(() => !dismissedForThisVisit)
  if (!isVisible) return null

  const entryPlan = DEFAULT_CHALLENGE_PLANS[0]

  return (
    <aside aria-label="Challenge account offer" className="fixed right-4 top-24 z-40 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-[color:var(--terminal-graphite-border)] bg-[color:var(--terminal-graphite-surface)] text-[color:var(--terminal-graphite-text)] shadow-2xl sm:right-6">
      <div className="relative h-24 overflow-hidden">
        <Image src="/images/elitefund-plans-campaign.png" fill sizes="384px" className="object-cover object-[center_35%]" alt="" aria-hidden="true" />
        <button type="button" onClick={() => { dismissedForThisVisit = true; setIsVisible(false) }} aria-label="Dismiss Challenge offer" className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full border border-[color:var(--terminal-graphite-border)] bg-[color:var(--terminal-graphite-surface)] text-[color:var(--terminal-graphite-text)] transition-colors hover:bg-[color:var(--terminal-graphite-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-primary)]"><X className="size-4" aria-hidden="true" /></button>
      </div>
      <div className="flex flex-col gap-3 p-5">
        <span className="text-xs font-semibold uppercase tracking-widest text-[color:var(--brand-primary)]">Discover Challenge 5K</span>
        <h2 className="text-balance text-xl font-semibold leading-snug tracking-tight">Take on a ${entryPlan.startingBalance.toLocaleString("en-US")} Challenge for around ₹1,000*</h2>
        <p className="text-sm leading-6 text-[color:var(--terminal-graphite-muted)]">A simulated trading evaluation with a ${entryPlan.fee} fee. See the rules and choose the right path before you commit.</p>
        <Button asChild className="h-10 bg-[color:var(--brand-primary)] font-semibold text-[color:var(--brand-primary-foreground)] hover:opacity-90">
          <Link href="/participant/dashboard/plans?category=challenge">View the offer <ArrowRight data-icon="inline-end" /></Link>
        </Button>
        <p className="text-xs leading-5 text-[color:var(--terminal-graphite-muted)]">*INR equivalent varies with the checkout rate. This is an evaluation, not a funded account; activation follows payment review.</p>
      </div>
    </aside>
  )
}
