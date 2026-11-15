"use client"

import { useState, type MouseEvent } from "react"
import Link from "next/link"
import { ArrowRight, CircleDollarSign, ShieldCheck, Sparkles, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { participantFetch } from "@/lib/auth"
import { DEFAULT_CHALLENGE_PLANS } from "@/lib/challenge-account"
import { FUNDED_PLANS } from "@/lib/funded-account"

type ConversionTarget = "challenge" | "funded"

type DashboardChallengeOfferProps = {
  accountType: string
  balance: number
  bonusBalance: number
  onConverted: (account: Record<string, unknown>) => void
  onFundedConverted: (account: Record<string, unknown>) => void
}

export function DashboardChallengeOffer({ accountType, balance, bonusBalance, onConverted, onFundedConverted }: DashboardChallengeOfferProps) {
  const [conversionTarget, setConversionTarget] = useState<ConversionTarget | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const isChallenge = accountType === "challenge" || accountType === "challengeaccount"
  const isFunded = accountType === "funded" || accountType === "fundedaccount" || accountType === "fundingtier"
  const canConvert = balance === 0 && bonusBalance === 0
  const entryChallenge = DEFAULT_CHALLENGE_PLANS[0]
  const entryFunded = FUNDED_PLANS[0]

  async function convertAccount(event: MouseEvent<HTMLButtonElement>, target: ConversionTarget) {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setError("")
    try {
      const response = await participantFetch(`/api/participant/${target}/convert`, { method: "POST" })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.message || "Could not switch accounts.")
      setConversionTarget(null)
      if (target === "funded") onFundedConverted(result.participant)
      else onConverted(result.participant)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not switch accounts. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isFunded) return null

  if (isChallenge) {
    return (
      <section aria-labelledby="challenge-offer-title" className="mx-3 mt-3 overflow-hidden rounded-2xl border border-[color:var(--terminal-graphite-border)] bg-[color:var(--terminal-graphite-surface)] p-5 text-[color:var(--terminal-graphite-text)] shadow-xl sm:mx-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[color:var(--brand-primary)]"><Sparkles className="size-4" aria-hidden="true" /> EliteFund Challenge</p>
            <h2 id="challenge-offer-title" className="text-balance text-xl font-bold tracking-tight sm:text-2xl">Your Challenge starts here.</h2>
            <p className="max-w-2xl text-sm leading-6 text-[color:var(--terminal-graphite-muted)]">Explore your evaluation, plan, and trading rules in your Challenge workspace.</p>
          </div>
          <Button asChild className="shrink-0"><Link href="/participant/dashboard/challenge">Open Challenge <ArrowRight data-icon="inline-end" /></Link></Button>
        </div>
      </section>
    )
  }

  const targetLabel = conversionTarget === "funded" ? "Funded" : "Challenge"

  return (
    <section aria-labelledby="account-paths-title" className="mx-3 mt-3 overflow-hidden rounded-2xl border border-[color:var(--terminal-graphite-border)] bg-[color:var(--terminal-graphite-surface)] text-[color:var(--terminal-graphite-text)] shadow-xl sm:mx-4">
      <header className="flex flex-col gap-2 border-b border-[color:var(--terminal-graphite-border)] p-5 sm:p-6">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[color:var(--brand-primary)]"><Sparkles className="size-4" aria-hidden="true" /> Upgrade your account</p>
        <h2 id="account-paths-title" className="text-balance text-xl font-bold tracking-tight sm:text-2xl">Choose your next trading path.</h2>
        <p className="max-w-3xl text-sm leading-6 text-[color:var(--terminal-graphite-muted)]">Keep your Normal account, switch to a simulated Challenge, or activate an Instant Funded plan. Your account and bonus balances must both be $0.00 before switching.</p>
      </header>

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
        <article className="flex flex-col gap-4 rounded-xl border border-[color:var(--terminal-graphite-border)] bg-[color:var(--terminal-graphite-surface-2)] p-5">
          <div className="flex items-start justify-between gap-4">
            <span className="flex size-11 items-center justify-center rounded-xl border border-[color:var(--terminal-graphite-border)] text-[color:var(--brand-primary)]"><Target className="size-5" aria-hidden="true" /></span>
            <span className="rounded-full border border-[color:var(--terminal-graphite-border)] px-3 py-1 text-xs font-semibold text-[color:var(--terminal-graphite-muted)]">Evaluation</span>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold">Challenge account</h3>
            <p className="text-sm leading-6 text-[color:var(--terminal-graphite-muted)]">Prove your strategy against clear targets and risk limits in a simulated evaluation.</p>
          </div>
          <div className="mt-auto flex items-end justify-between gap-3 border-t border-[color:var(--terminal-graphite-border)] pt-4">
            <div><strong className="font-mono text-2xl">${entryChallenge.fee}</strong><span className="block text-xs text-[color:var(--terminal-graphite-muted)]">for ${entryChallenge.startingBalance.toLocaleString("en-US")} virtual capital</span></div>
            <ShieldCheck className="size-5 text-[color:var(--brand-primary)]" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" className="flex-1" disabled={!canConvert} aria-describedby={!canConvert ? "account-conversion-requirement" : undefined} onClick={() => setConversionTarget("challenge")}>Switch to Challenge <ArrowRight data-icon="inline-end" /></Button>
            <Button asChild variant="ghost"><Link href="/participant/dashboard/plans?category=challenge">View rules</Link></Button>
          </div>
        </article>

        <article className="flex flex-col gap-4 rounded-xl border border-[color:color-mix(in_srgb,var(--brand-primary)_55%,var(--terminal-graphite-border))] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--brand-primary)_13%,var(--terminal-graphite-surface-2)),var(--terminal-graphite-surface-2))] p-5 shadow-[inset_0_1px_color-mix(in_srgb,var(--brand-primary)_22%,transparent)]">
          <div className="flex items-start justify-between gap-4">
            <span className="flex size-11 items-center justify-center rounded-xl border border-[color:color-mix(in_srgb,var(--brand-primary)_45%,var(--terminal-graphite-border))] bg-[color:color-mix(in_srgb,var(--brand-primary)_12%,transparent)] text-[color:var(--brand-primary)]"><CircleDollarSign className="size-5" aria-hidden="true" /></span>
            <span className="rounded-full bg-[color:var(--brand-primary)] px-3 py-1 text-xs font-bold text-[color:var(--brand-primary-foreground)]">Instant funded</span>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold">Funded account</h3>
            <p className="text-sm leading-6 text-[color:var(--terminal-graphite-muted)]">Skip the evaluation. Choose a funded capacity, submit the one-time plan payment, and activate after approval.</p>
          </div>
          <div className="mt-auto flex items-end justify-between gap-3 border-t border-[color:var(--terminal-graphite-border)] pt-4">
            <div><strong className="font-mono text-2xl">${entryFunded.topUpAmount}</strong><span className="block text-xs text-[color:var(--terminal-graphite-muted)]">for ${entryFunded.baseAmount.toLocaleString("en-US")} funded capacity</span></div>
            <ShieldCheck className="size-5 text-[color:var(--brand-primary)]" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="flex-1" disabled={!canConvert} aria-describedby={!canConvert ? "account-conversion-requirement" : undefined} onClick={() => setConversionTarget("funded")}>Switch to Funded <ArrowRight data-icon="inline-end" /></Button>
            <Button asChild variant="ghost"><Link href="/participant/dashboard/plans?category=funded">View plans</Link></Button>
          </div>
        </article>
      </div>

      <p id="account-conversion-requirement" className="border-t border-[color:var(--terminal-graphite-border)] px-5 py-3 text-xs leading-5 text-[color:var(--terminal-graphite-muted)] sm:px-6">{canConvert ? "Your balances are clear. Choose either path to continue." : `Switching is locked while your available balance is $${balance.toFixed(2)} or your bonus balance is $${bonusBalance.toFixed(2)}.`} Open orders and pending deposits or payouts must also be cleared.</p>

      <AlertDialog open={conversionTarget !== null} onOpenChange={(open) => { if (!open && !isSubmitting) { setConversionTarget(null); setError("") } }}>
        <AlertDialogContent className="border-[color:var(--terminal-graphite-border)] bg-[color:var(--terminal-graphite-surface)] text-[color:var(--terminal-graphite-text)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Switch this account to {targetLabel}?</AlertDialogTitle>
            <AlertDialogDescription className="text-[color:var(--terminal-graphite-muted)]">{conversionTarget === "funded" ? "Your Normal account will become a Funded account. Next, choose a capacity and submit its one-time plan payment for approval. Funded capital is activated only after approval." : "Your Normal account will become a Challenge account. Next, choose an evaluation plan and submit its fee for approval. Virtual capital is activated only after approval."}</AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p role="alert" className="text-sm text-[color:var(--terminal-graphite-negative)]">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Keep Normal account</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => conversionTarget && convertAccount(event, conversionTarget)} disabled={isSubmitting || !conversionTarget}>{isSubmitting ? "Switching…" : `Confirm ${targetLabel} switch`}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
