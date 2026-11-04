"use client"

import { useState, type MouseEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { participantFetch } from "@/lib/auth"
import { DEFAULT_CHALLENGE_PLANS } from "@/lib/challenge-account"

type DashboardChallengeOfferProps = {
  accountType: string
  balance: number
  bonusBalance: number
  onConverted: (account: Record<string, unknown>) => void
}

export function DashboardChallengeOffer({ accountType, balance, bonusBalance, onConverted }: DashboardChallengeOfferProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const isChallenge = accountType === "challenge" || accountType === "challengeaccount"
  const canConvert = balance === 0 && bonusBalance === 0
  const entryPlan = DEFAULT_CHALLENGE_PLANS[0]

  async function convertAccount(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setError("")
    try {
      const response = await participantFetch("/api/participant/challenge/convert", { method: "POST" })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.message || "Could not switch accounts.")
      onConverted(result.participant)
      setIsOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not switch accounts. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section aria-labelledby="challenge-offer-title" className="mx-3 mt-3 overflow-hidden rounded-2xl border border-[color:var(--terminal-graphite-border)] bg-[color:var(--terminal-graphite-surface)] text-[color:var(--terminal-graphite-text)] shadow-xl sm:mx-4">
      <div className="flex flex-col lg:flex-row">
        <div className="relative h-32 overflow-hidden border-b border-[color:var(--terminal-graphite-border)] lg:h-auto lg:w-48 lg:shrink-0 lg:border-b-0 lg:border-r">
          <Image src="/images/elitefund-plans-campaign.png" fill sizes="(min-width: 1024px) 192px, 100vw" className="object-cover object-center" alt="" aria-hidden="true" />
        </div>
        <div className="flex flex-1 flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[color:var(--brand-primary)]"><Sparkles className="size-4" aria-hidden="true" /> EliteFund Challenge</p>
            <h2 id="challenge-offer-title" className="text-balance text-xl font-bold tracking-tight sm:text-2xl">{isChallenge ? "Your Challenge starts here." : "A new way to prove your trading edge."}</h2>
            <p className="max-w-2xl text-sm leading-6 text-[color:var(--terminal-graphite-muted)]">
              {isChallenge
                ? "Explore your evaluation, plan and trading rules in your Challenge workspace."
                : `Switch your zero-balance account to a simulated Challenge. Choose a plan starting at $${entryPlan.fee} for $${entryPlan.startingBalance.toLocaleString("en-US")} in virtual trading capital after payment approval.`}
            </p>
            {!isChallenge && (
              <p className="flex items-start gap-2 text-sm leading-6 text-[color:var(--terminal-graphite-text)]"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[color:var(--brand-primary)]" aria-hidden="true" />
                {canConvert ? "Your balance is $0.00. You can switch now." : "Switching is available only when your account and bonus balances are both $0.00."}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            {isChallenge ? (
              <Button asChild className="bg-[color:var(--brand-primary)] text-[color:var(--brand-primary-foreground)] hover:opacity-90"><Link href="/participant/dashboard/challenge">Open Challenge <ArrowRight data-icon="inline-end" /></Link></Button>
            ) : canConvert ? (
              <AlertDialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setError("") }}>
                <AlertDialogTrigger asChild><Button className="bg-[color:var(--brand-primary)] text-[color:var(--brand-primary-foreground)] hover:opacity-90">Switch to Challenge <ArrowRight data-icon="inline-end" /></Button></AlertDialogTrigger>
                <AlertDialogContent className="border-[color:var(--terminal-graphite-border)] bg-[color:var(--terminal-graphite-surface)] text-[color:var(--terminal-graphite-text)]">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Switch this account to Challenge?</AlertDialogTitle>
                    <AlertDialogDescription className="text-[color:var(--terminal-graphite-muted)]">Your existing account becomes a Challenge account. No money is transferred and no virtual capital is activated yet. You will choose a plan and submit its fee for review separately. Your current account and bonus balances must both be $0.00.</AlertDialogDescription>
                  </AlertDialogHeader>
                  {error && <p role="alert" className="text-sm text-[color:var(--terminal-graphite-negative)]">{error}</p>}
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSubmitting}>Keep current account</AlertDialogCancel>
                    <AlertDialogAction onClick={convertAccount} disabled={isSubmitting}>{isSubmitting ? "Switching…" : "Confirm switch"}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button disabled aria-describedby="challenge-balance-requirement">Balance must be $0.00</Button>
            )}
            {!isChallenge && <Link href="/participant/dashboard/plans?category=challenge" className="text-sm font-medium text-[color:var(--brand-primary)] underline-offset-4 hover:underline focus-visible:underline">Explore plans &amp; rules</Link>}
          </div>
        </div>
      </div>
      {!isChallenge && <p id="challenge-balance-requirement" className="border-t border-[color:var(--terminal-graphite-border)] px-5 py-2 text-xs leading-5 text-[color:var(--terminal-graphite-muted)] sm:px-6">Challenge is a simulated evaluation, not a funded account. Open orders and pending deposits or payouts must also be cleared before switching.</p>}
    </section>
  )
}
