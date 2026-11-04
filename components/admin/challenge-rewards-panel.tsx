"use client"

import { useState } from "react"
import useSWR from "swr"
import { adminFetch } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

type Claim = {
  id: string
  email: string
  plan_key: string
  eligible_amount: string
  passed_equity: string
  payout_method: string
  wallet_address: string
  status: string
  admin_note: string | null
  transaction_hash: string | null
}

async function fetchReviews(url: string) {
  const response = await adminFetch(url)
  const data = await response.json()
  if (!response.ok || !data.success) throw new Error(data.message || "Unable to load reviews")
  return data as { claims: Claim[]; fundingReviews: { id: string; email: string; challenge_passed_at: string }[] }
}

export function ChallengeRewardsPanel() {
  const { data, error: loadError, mutate } = useSWR("/api/admin/challenge-rewards", fetchReviews, { refreshInterval: 30_000 })
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [hashes, setHashes] = useState<Record<string, string>>({})
  const [working, setWorking] = useState<string | null>(null)
  const [message, setMessage] = useState("")

  async function update(id: string, status: string) {
    setWorking(id)
    setMessage("")
    try {
      const response = await adminFetch("/api/admin/challenge-rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, note: notes[id], transactionHash: hashes[id] }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to update review")
      await mutate()
      setMessage(`Reward ${status}.`)
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to update review")
    } finally {
      setWorking(null)
    }
  }

  return (
    <section className="flex flex-col gap-5 text-[color:var(--terminal-graphite-text)]" aria-label="Challenge reward reviews">
      <div className="flex flex-col gap-1"><h2 className="text-xl font-semibold">Challenge reviews</h2><p className="text-sm text-[color:var(--terminal-graphite-muted)]">Manually review cash claims. Approving does not send money; transfer externally, then record the transaction hash to mark paid.</p></div>
      {message && <p role="status" className="text-sm text-[color:var(--brand-primary)]">{message}</p>}
      {loadError && <p role="alert" className="text-sm">{loadError.message}</p>}
      {data?.claims.length === 0 && <p className="text-sm text-[color:var(--terminal-graphite-muted)]">No cash reward claims yet.</p>}
      {data?.claims.map((claim) => (
        <Card key={claim.id} className="border-[color:var(--terminal-graphite-border)] bg-[color:var(--terminal-graphite-surface)] text-[color:var(--terminal-graphite-text)]">
          <CardHeader><CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base"><span className="break-all">{claim.email}</span><span className="font-mono text-[color:var(--brand-primary)]">{currency.format(Number(claim.eligible_amount))}</span></CardTitle><CardDescription className="text-[color:var(--terminal-graphite-muted)]">{claim.plan_key} · {claim.status} · passed equity {currency.format(Number(claim.passed_equity))}</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <p className="break-all">{claim.payout_method} · {claim.wallet_address}</p>
            {claim.admin_note && <p>Note: {claim.admin_note}</p>}
            {claim.transaction_hash && <p className="break-all">Transfer: {claim.transaction_hash}</p>}
            {claim.status === "pending" && <div className="flex flex-col gap-3"><div className="flex flex-col gap-2"><Label htmlFor={`note-${claim.id}`}>Review note (required for rejection)</Label><Input id={`note-${claim.id}`} value={notes[claim.id] || ""} maxLength={1000} onChange={(event) => setNotes((current) => ({ ...current, [claim.id]: event.target.value }))} /></div><div className="flex flex-wrap gap-2"><Button disabled={working !== null} onClick={() => update(claim.id, "approved")}>Approve claim</Button><Button variant="outline" disabled={working !== null || !notes[claim.id]?.trim()} onClick={() => update(claim.id, "rejected")}>Reject with reason</Button></div></div>}
            {claim.status === "approved" && <div className="flex flex-col gap-3"><div className="flex flex-col gap-2"><Label htmlFor={`hash-${claim.id}`}>Confirmed on-chain transfer hash</Label><Input id={`hash-${claim.id}`} value={hashes[claim.id] || ""} onChange={(event) => setHashes((current) => ({ ...current, [claim.id]: event.target.value }))} placeholder="0x…" maxLength={66} /></div><Button className="self-start" disabled={working !== null || !hashes[claim.id]?.trim()} onClick={() => update(claim.id, "paid")}>Mark paid after transfer</Button></div>}
          </CardContent>
        </Card>
      ))}
      <Card className="border-[color:var(--terminal-graphite-border)] bg-[color:var(--terminal-graphite-surface)] text-[color:var(--terminal-graphite-text)]"><CardHeader><CardTitle>$10 tier funding review</CardTitle><CardDescription className="text-[color:var(--terminal-graphite-muted)]">Passed evaluations for manual funded-account assessment. This queue does not convert accounts or create a cash payout.</CardDescription></CardHeader><CardContent className="flex flex-col gap-2 text-sm">{data?.fundingReviews.length === 0 && <p className="text-[color:var(--terminal-graphite-muted)]">No passed $10 evaluations listed.</p>}{data?.fundingReviews.map((review) => <p key={review.id} className="flex flex-wrap justify-between gap-2 border-t border-[color:var(--terminal-graphite-border)] pt-2"><span className="break-all">{review.email}</span><span className="text-[color:var(--terminal-graphite-muted)]">Passed {new Date(review.challenge_passed_at).toLocaleDateString()}</span></p>)}</CardContent></Card>
    </section>
  )
}
