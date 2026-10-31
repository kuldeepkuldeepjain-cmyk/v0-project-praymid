"use client"

import Link from "next/link"
import useSWR from "swr"
import { ArrowUpRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { participantFetch } from "@/lib/auth"
import { getChallengeStatusLabel } from "@/lib/challenge-account"

async function fetchChallengeSummary(url: string) {
  const response = await participantFetch(url, { cache: "no-store" })
  const data = await response.json()
  if (!response.ok || !data.success) throw new Error(data.message || "Unable to load Challenge status")
  return data
}

export function ChallengeStatusCard() {
  const { data } = useSWR("/api/participant/challenge", fetchChallengeSummary, {
    refreshInterval: 20_000,
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  })

  const participant = data?.participant
  const plan = data?.plan
  if (!participant || participant.account_type !== "challenge") return null

  const status = participant.challenge_status || "not_started"
  const metrics = data?.metrics
  const progress = Math.max(0, Math.min(100, Number(metrics?.progressPercent) || 0))
  const statusText = getChallengeStatusLabel(status)

  return (
    <section aria-label="Challenge account status" className="mx-3 mt-3 sm:mx-4 sm:mt-4">
      <Card className="overflow-hidden border border-amber-400/20 bg-[#141820] text-slate-100 shadow-lg shadow-black/10">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <ShieldCheck aria-hidden="true" className="size-4 text-[#d6b66b]" />
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d6b66b]">{plan?.name || "EliteFund Challenge"}</p>
              <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-xs font-semibold text-amber-100">{statusText}</span>
            </div>
            {status === "active" && metrics ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-400">Evaluation equity</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-white">${Number(metrics.equity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Profit target</p>
                  <p className="mt-0.5 text-sm font-semibold text-white">+{Number(metrics.profitPercent).toFixed(2)}% / +{plan.profitTargetPercent}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Trading days</p>
                  <p className="mt-0.5 text-sm font-semibold text-white">{Number(participant.challenge_trading_days) || 0} / {plan.minimumTradingDays}</p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {status === "pending_payment"
                  ? "Your Challenge fee is under review. The virtual balance activates when approved."
                  : status === "payment_rejected"
                    ? "Your payment needs attention. Review the note and resubmit from the Challenge dashboard."
                    : status === "passed"
                      ? "Evaluation passed. Your account is ready for the next-stage review."
                      : status === "failed"
                        ? "The evaluation has ended. Review your rule results and restart from the Challenge dashboard."
                        : "Choose a plan, submit the Challenge fee, and start your evaluation."}
              </p>
            )}
            {status === "active" && metrics && (
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700" role="progressbar" aria-label="Profit target progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
                  <div className="h-full rounded-full bg-[#d6b66b] transition-[width]" style={{ width: `${progress}%` }} />
                </div>
                <span className="font-mono text-xs text-amber-100">{progress.toFixed(0)}%</span>
              </div>
            )}
          </div>
          <Button asChild variant="outline" className="shrink-0 border-amber-300/30 bg-amber-300/5 text-amber-100 hover:bg-amber-300/10 hover:text-white">
            <Link href="/participant/dashboard/challenge">
              Open Challenge
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
