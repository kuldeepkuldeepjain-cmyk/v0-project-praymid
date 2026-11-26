"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

export function DashboardFundingPreview({ balance, visible }: { balance: number; visible: boolean }) {
  const [amount, setAmount] = useState(25)
  return (
    <section aria-labelledby="funding-preview-title" className="rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-7">
      <div className="grid items-center gap-6 md:grid-cols-2">
        <div>
          <p className="participant-home-eyebrow">Wallet simulator</p>
          <h2 id="funding-preview-title" className="mt-2 text-balance text-2xl font-semibold tracking-tight">What would your next top-up change?</h2>
          <p className="mt-2 max-w-md text-pretty text-sm leading-6 text-muted-foreground">Try an amount to see how it would change your trading balance. Moving the slider does not transfer funds.</p>
          <details className="mt-4 text-sm leading-6">
            <summary className="cursor-pointer font-medium text-[var(--brand-primary)]">When does it reach my wallet?</summary>
            <p className="mt-2 max-w-md text-muted-foreground">Review the payment instructions in Add Funds and submit your payment proof. Your balance changes after approval, not when you open the form.</p>
          </details>
        </div>
        <div className="rounded-xl bg-muted/50 p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-2"><label className="text-sm font-medium" htmlFor="preview-topup">Try a top-up</label><span className="font-mono text-xl text-[var(--brand-primary)]">${amount}</span></div>
          <input className="mt-2 block h-8 w-full cursor-pointer accent-[var(--brand-primary)]" id="preview-topup" type="range" min={5} max={100} step={5} value={amount} aria-valuetext={`${amount} dollars`} onChange={event => setAmount(Number(event.target.value))} />
          <div className="flex justify-between text-sm text-muted-foreground" aria-hidden="true"><span>$5</span><span>$100</span></div>
          <div className="my-4 border-t border-border pt-4"><p className="text-sm text-muted-foreground">Balance if approved</p><output htmlFor="preview-topup" className="block break-words font-mono text-2xl font-semibold">{visible ? usd.format(balance + amount) : 'Balance hidden'}</output></div>
          <Link href={`/participant/dashboard/add-funds?mode=actual&amount=${amount}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-semibold text-[var(--terminal-graphite-bg)]">Review ${amount} top-up <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  )
}
