"use client"

import { useState, type MouseEvent } from "react"
import Link from "next/link"
import { ArrowRight, Check, CircleDollarSign, ShieldCheck, Sparkles, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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
  onOpenFundedPlans: () => void
}

export function DashboardChallengeOffer({ accountType, balance, bonusBalance, onConverted, onFundedConverted, onOpenFundedPlans }: DashboardChallengeOfferProps) {
  const isChallenge = accountType === "challenge" || accountType === "challengeaccount"
  const isFunded = accountType === "funded" || accountType === "fundedaccount" || accountType === "fundingtier"
  const [selectedPath, setSelectedPath] = useState<ConversionTarget>(isFunded ? "funded" : "challenge")
  const [conversionTarget, setConversionTarget] = useState<ConversionTarget | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const canConvert = balance === 0 && bonusBalance === 0
  const entryChallenge = DEFAULT_CHALLENGE_PLANS[0]
  const entryFunded = FUNDED_PLANS[0]
  const currentAccountLabel = isChallenge ? "Challenge" : isFunded ? "Funded" : "Normal"
  const selectedIsCurrent = (selectedPath === "challenge" && isChallenge) || (selectedPath === "funded" && isFunded)
  const requiresClearBalances = selectedPath === "challenge" ? !isChallenge : !isChallenge && !isFunded

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

  function handlePrimaryAction() {
    if (selectedPath === "funded" && isChallenge) {
      onOpenFundedPlans()
      return
    }
    setConversionTarget(selectedPath)
  }

  const targetLabel = conversionTarget === "funded" ? "Funded" : "Challenge"
  const challengeBenefits = ["Simulated evaluation account", "Clear profit and risk targets", "Trade with virtual capital"]
  const fundedBenefits = ["No Challenge evaluation", "3% maximum drawdown", "1% max risk per trade"]

  return (
    <section aria-labelledby="account-paths-title" className="mx-auto mt-3 w-[calc(100%-1.5rem)] max-w-7xl overflow-hidden rounded-2xl border border-[color:var(--terminal-graphite-border)] bg-[color:var(--terminal-graphite-surface)] text-[color:var(--terminal-graphite-text)] shadow-xl sm:w-[calc(100%-2rem)]">
      <header className="flex flex-col gap-3 border-b border-[color:var(--terminal-graphite-border)] p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-6">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[color:var(--brand-primary)]"><Sparkles aria-hidden="true" /> Account options</p>
          <h2 id="account-paths-title" className="text-balance text-xl font-bold tracking-tight sm:text-2xl">Challenge or Funded? Compare before you switch.</h2>
          <p className="max-w-3xl text-sm leading-6 text-[color:var(--terminal-graphite-muted)]">Choose the account experience that matches how you want to trade. Review the rules, cost, and activation steps below.</p>
        </div>
        <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--brand-primary)_45%,var(--terminal-graphite-border))] bg-[color:color-mix(in_srgb,var(--brand-primary)_10%,transparent)] px-3 py-1.5 text-xs font-bold text-[color:var(--brand-primary)]">
          <ShieldCheck aria-hidden="true" /> Current: {currentAccountLabel}
        </span>
      </header>

      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <ToggleGroup type="single" value={selectedPath} onValueChange={(value) => value && setSelectedPath(value as ConversionTarget)} variant="outline" className="grid w-full grid-cols-2" aria-label="Compare account types">
          <ToggleGroupItem value="challenge" aria-label="Show Challenge account information" className="h-auto min-h-14 gap-2 px-3 py-2.5">
            <Target aria-hidden="true" />
            <span className="flex flex-col items-start text-left leading-tight"><strong>Challenge</strong><small className="font-normal text-muted-foreground">Pass an evaluation</small></span>
          </ToggleGroupItem>
          <ToggleGroupItem value="funded" aria-label="Show Funded account information" className="h-auto min-h-14 gap-2 px-3 py-2.5">
            <CircleDollarSign aria-hidden="true" />
            <span className="flex flex-col items-start text-left leading-tight"><strong>Funded</strong><small className="font-normal text-muted-foreground">Start with capacity</small></span>
          </ToggleGroupItem>
        </ToggleGroup>

        <article className="grid gap-5 rounded-xl border border-[color:color-mix(in_srgb,var(--brand-primary)_35%,var(--terminal-graphite-border))] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--brand-primary)_10%,var(--terminal-graphite-surface-2)),var(--terminal-graphite-surface-2))] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold">{selectedPath === "challenge" ? "Challenge account" : "Instant Funded account"}</h3>
                {selectedIsCurrent && <span className="rounded-full bg-[color:var(--brand-primary)] px-2.5 py-1 text-xs font-bold text-[color:var(--brand-primary-foreground)]">Your current account</span>}
              </div>
              <p className="max-w-2xl text-sm leading-6 text-[color:var(--terminal-graphite-muted)]">
                {selectedPath === "challenge"
                  ? "Prove your strategy in a simulated evaluation. Meet the trading target while staying inside the daily loss and drawdown rules."
                  : "Skip the evaluation. Choose a funded capacity, submit the one-time plan payment, and activate the account after approval."}
              </p>
            </div>

            <ul className="grid gap-2 text-sm sm:grid-cols-3">
              {(selectedPath === "challenge" ? challengeBenefits : fundedBenefits).map((benefit) => (
                <li key={benefit} className="flex items-center gap-2 text-[color:var(--terminal-graphite-muted)]"><Check className="text-[color:var(--brand-primary)]" aria-hidden="true" /> {benefit}</li>
              ))}
            </ul>
          </div>

          <div className="flex min-w-44 flex-col gap-3 rounded-xl border border-[color:var(--terminal-graphite-border)] bg-[color:var(--terminal-graphite-surface)] p-4 sm:text-right">
            <div>
              <span className="block text-xs text-[color:var(--terminal-graphite-muted)]">{selectedPath === "challenge" ? "Evaluation fee from" : "Plan payment from"}</span>
              <strong className="font-mono text-2xl">${selectedPath === "challenge" ? entryChallenge.fee : entryFunded.topUpAmount}</strong>
              <span className="block text-xs text-[color:var(--terminal-graphite-muted)]">{selectedPath === "challenge" ? `$${entryChallenge.startingBalance.toLocaleString("en-US")} virtual balance` : `$${entryFunded.baseAmount.toLocaleString("en-US")} funded capacity`}</span>
            </div>
            {selectedIsCurrent ? (
              selectedPath === "challenge" ? <Button asChild><Link href="/participant/dashboard/challenge">Open Challenge <ArrowRight data-icon="inline-end" /></Link></Button> : <Button type="button" disabled>Current account</Button>
            ) : (
              <Button type="button" onClick={handlePrimaryAction} disabled={requiresClearBalances && !canConvert} aria-describedby={requiresClearBalances && !canConvert ? "account-conversion-requirement" : undefined}>
                Switch to {selectedPath === "challenge" ? "Challenge" : "Funded"} <ArrowRight data-icon="inline-end" />
              </Button>
            )}
            <Button asChild variant="ghost"><Link href={`/participant/dashboard/plans?category=${selectedPath}`}>View {selectedPath === "challenge" ? "rules" : "plans"}</Link></Button>
          </div>
        </article>
      </div>

      <p id="account-conversion-requirement" className="border-t border-[color:var(--terminal-graphite-border)] px-4 py-3 text-xs leading-5 text-[color:var(--terminal-graphite-muted)] sm:px-6">
        {requiresClearBalances
          ? canConvert
            ? "Ready to switch. Your available and bonus balances are both clear. Open orders and pending deposits or payouts must also be cleared."
            : `Switching is locked until your available balance ($${balance.toFixed(2)}) and bonus balance ($${bonusBalance.toFixed(2)}) are both $0.00.`
          : selectedIsCurrent
            ? `You are viewing your current ${currentAccountLabel} account.`
            : "Choose a funded capacity and submit its plan payment. Your Funded account activates after approval."}
      </p>

      <AlertDialog open={conversionTarget !== null} onOpenChange={(open) => { if (!open && !isSubmitting) { setConversionTarget(null); setError("") } }}>
        <AlertDialogContent className="border-[color:var(--terminal-graphite-border)] bg-[color:var(--terminal-graphite-surface)] text-[color:var(--terminal-graphite-text)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Switch this account to {targetLabel}?</AlertDialogTitle>
            <AlertDialogDescription className="text-[color:var(--terminal-graphite-muted)]">{conversionTarget === "funded" ? "Your Normal account will become a Funded account. Next, choose a capacity and submit its one-time plan payment for approval. Funded capital is activated only after approval." : `Your ${currentAccountLabel} account will become a Challenge account. Next, choose an evaluation plan and submit its fee for approval. Virtual capital is activated only after approval.`}</AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p role="alert" className="text-sm text-[color:var(--terminal-graphite-negative)]">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Keep {currentAccountLabel} account</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => conversionTarget && convertAccount(event, conversionTarget)} disabled={isSubmitting || !conversionTarget}>{isSubmitting ? "Switching…" : `Confirm ${targetLabel} switch`}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
