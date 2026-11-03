"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, LockKeyhole, RefreshCw } from "lucide-react"

const sampleProfiles = [
  { name: "Aarav S.", city: "Mumbai", amount: 12500 },
  { name: "Ananya R.", city: "Bengaluru", amount: 8400 },
  { name: "Kabir M.", city: "Delhi", amount: 19200 },
  { name: "Meera P.", city: "Pune", amount: 6750 },
  { name: "Ishaan K.", city: "Jaipur", amount: 15400 },
  { name: "Sana A.", city: "Hyderabad", amount: 9800 },
  { name: "Rohan D.", city: "Kolkata", amount: 11250 },
  { name: "Priya N.", city: "Chennai", amount: 7300 },
]

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

function nextSampleIndex(previous: number) {
  return (previous + 1 + Math.floor(Math.random() * (sampleProfiles.length - 1))) % sampleProfiles.length
}

export function LandingPayoutRecords() {
  const [startIndex, setStartIndex] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => setStartIndex(nextSampleIndex), 8000)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <section id="payout-records" aria-labelledby="payout-preview-title" className="elite-section elite-section-alt elite-section-divider">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="elite-eyebrow">A glimpse at the numbers</p>
            <h2 id="payout-preview-title" className="elite-heading mt-4 text-balance">Every outcome has a story. Know both sides.</h2>
            <p className="elite-copy mt-4">Explore what trade results and payout records might look like, without mistaking an example for a promise.</p>
          </div>
          <Link href="/participant/register" className="elite-inline-link shrink-0">
            Start with a normal account <ArrowRight aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-9 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="flex flex-col gap-4">
            <article className="elite-sample-outcome">
              <span className="elite-eyebrow">Example trade / gain</span>
              <p className="elite-sample-amount mt-3 font-mono">+{inr.format(6240)}</p>
              <p className="elite-copy mt-3 text-sm">An illustrative profitable result. Actual outcomes depend on the trade and market.</p>
            </article>
            <article className="elite-sample-outcome">
              <span className="elite-eyebrow">Example trade / loss</span>
              <p className="elite-sample-amount mt-3 font-mono">−{inr.format(2180)}</p>
              <p className="elite-copy mt-3 text-sm">Trading can also reduce your balance. No outcome or return is guaranteed.</p>
            </article>
          </div>

          <div className="elite-payout-ledger flex flex-col" role="group" aria-label="Rotating illustrative payout examples with fictional Indian profiles">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="elite-eyebrow">Illustrative preview</p>
                <h3 className="mt-2 text-xl font-semibold">Payout examples</h3>
              </div>
              <button type="button" onClick={() => setStartIndex(nextSampleIndex)} className="elite-payout-refresh inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold" aria-label="Show different example payouts">
                <RefreshCw className="size-4" aria-hidden="true" /> Refresh examples
              </button>
            </div>
            <p className="elite-payout-demo-label mt-4 text-sm">Demo rotation · fictional Indian profiles · not live transactions</p>
            <ul className="elite-payout-examples mt-5" aria-live="off">
              {Array.from({ length: 3 }, (_, offset) => {
                const profile = sampleProfiles[(startIndex + offset) % sampleProfiles.length]
                return (
                  <li key={profile.name} className="flex items-center justify-between gap-4 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="elite-payout-avatar flex size-10 shrink-0 items-center justify-center rounded-full font-semibold" aria-hidden="true">{profile.name.charAt(0)}</span>
                      <span className="min-w-0">
                        <strong className="block truncate text-sm font-semibold">{profile.name}</strong>
                        <span className="elite-copy text-sm">{profile.city} · Demo profile</span>
                      </span>
                    </div>
                    <span className="elite-payout-example-amount shrink-0 font-mono text-sm font-semibold">{inr.format(profile.amount)}</span>
                  </li>
                )
              })}
            </ul>
            <p className="elite-payout-ledger-note mt-auto flex items-start gap-2 pt-5">
              <LockKeyhole className="size-4 shrink-0" aria-hidden="true" />
              These are made-up examples, not customer payouts. Real payout history is private, subject to eligibility and visible only in your account.
            </p>
            <Link href="/participant/login" className="elite-inline-link mt-5">
              Sign in to see your actual records <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
