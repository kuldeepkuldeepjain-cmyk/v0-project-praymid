"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { participantFetch } from "@/lib/auth"
import { getChallengeRewardAmount, type ChallengePlan } from "@/lib/challenge-account"

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

type RewardRequest = {
  status: string
  eligible_amount: string
  payout_method: string
  wallet_address: string
  admin_note: string | null
  transaction_hash: string | null
}

export function ChallengeRewardCard({ plan, passedEquity, rewardRequest, onSubmitted }: {
  plan: ChallengePlan
  passedEquity: number | null
  rewardRequest: RewardRequest | null
  onSubmitted: () => void
}) {
  const [network, setNetwork] = useState("BEP20")
  const [address, setAddress] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const amount = passedEquity == null ? 0 : getChallengeRewardAmount(plan, Number(passedEquity))
  const fundingOnly = plan.key === "challenge_5k"

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      const response = await participantFetch("/api/participant/challenge-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network, address: address.trim() }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to submit your claim.")
      onSubmitted()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit your claim.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-[color:var(--terminal-graphite-border)] bg-[color:var(--terminal-graphite-surface)] text-[color:var(--terminal-graphite-text)]">
      <CardHeader>
        <CardTitle>{fundingOnly ? "Funding review" : "Your Challenge reward"}</CardTitle>
        <CardDescription className="text-[color:var(--terminal-graphite-muted)]">
          {fundingOnly ? "The $10 tier is eligible for manual funding review only, not a cash reward. Passing does not automatically create a funded account." : "A separate reward based on 50% of positive simulated profit at the recorded moment of passing. Virtual capital itself stays non-withdrawable."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm leading-6">
        {fundingOnly ? (
          <p className="text-[color:var(--terminal-graphite-muted)]">Your passing result is listed for admin funding review. No action or payment is required to request this review.</p>
        ) : rewardRequest ? (
          <div className="flex flex-col gap-2">
            <p><strong className="font-mono text-xl text-[color:var(--brand-primary)]">{money.format(Number(rewardRequest.eligible_amount))}</strong> <span className="text-[color:var(--terminal-graphite-muted)]">· {rewardRequest.status === "paid" ? "Paid" : rewardRequest.status === "approved" ? "Approved, awaiting manual transfer" : rewardRequest.status === "rejected" ? "Rejected" : "Pending review"}</span></p>
            <p className="break-all text-xs text-[color:var(--terminal-graphite-muted)]">{rewardRequest.payout_method} · {rewardRequest.wallet_address}</p>
            {rewardRequest.admin_note && <p className="text-[color:var(--terminal-graphite-muted)]">Reviewer note: {rewardRequest.admin_note}</p>}
            {rewardRequest.transaction_hash && <p className="break-all text-[color:var(--terminal-graphite-muted)]">Transfer hash: {rewardRequest.transaction_hash}</p>}
          </div>
        ) : passedEquity == null ? (
          <p className="text-[color:var(--terminal-graphite-muted)]">Your evaluation predates recorded reward snapshots. Contact support for a manual review; no cash claim can be calculated automatically.</p>
        ) : amount <= 0 ? (
          <p className="text-[color:var(--terminal-graphite-muted)]">No positive net profit was recorded at passing. Contact support if you think this is incorrect.</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <p className="text-[color:var(--terminal-graphite-muted)]">Recorded equity: {money.format(Number(passedEquity))}. Maximum one-time claim: <strong className="font-mono text-lg text-[color:var(--brand-primary)]">{money.format(amount)}</strong>. Subject to manual review; submitting does not transfer funds.</p>
            <div className="flex flex-col gap-2"><Label htmlFor="challenge-reward-network">USDT network</Label><Select value={network} onValueChange={setNetwork}><SelectTrigger id="challenge-reward-network"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{["BEP20", "TRC20", "ERC20"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
            <div className="flex flex-col gap-2"><Label htmlFor="challenge-reward-address">Receiving wallet address</Label><Input id="challenge-reward-address" value={address} onChange={(event) => setAddress(event.target.value)} autoComplete="off" placeholder={network === "TRC20" ? "T…" : "0x…"} required minLength={34} maxLength={42} /></div>
            {error && <p role="alert" className="text-[color:var(--brand-primary)]">{error}</p>}
            <Button type="submit" disabled={submitting || !address.trim()} className="self-start">{submitting ? "Submitting…" : "Request manual review"}</Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
