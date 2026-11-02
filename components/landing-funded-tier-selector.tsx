"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

type FundedTier = {
  balance: number
  fee: number
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

export function LandingFundedTierSelector({ tiers }: { tiers: FundedTier[] }) {
  const [selectedBalance, setSelectedBalance] = useState(25_000)
  const selectedTier = tiers.find((tier) => tier.balance === selectedBalance) ?? tiers[0]

  if (!selectedTier) return null

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5" role="group" aria-label="Compare funded account sizes">
        {tiers.map((tier, index) => (
          <button
            type="button"
            key={tier.balance}
            className="elite-funded-tier last:col-span-2 lg:last:col-span-1"
            aria-pressed={selectedBalance === tier.balance}
            aria-label={`Compare ${currency.format(tier.balance)} funded account`}
            onClick={() => setSelectedBalance(tier.balance)}
            style={{ animationDelay: `${index * 85}ms` }}
          >
            <span className="elite-funded-tier-label">Funded capacity</span>
            <strong className="elite-funded-tier-balance font-mono">{currency.format(tier.balance)}</strong>
            <div className="elite-funded-tier-fee">
              <span>Program fee</span>
              <strong>{currency.format(tier.fee)}</strong>
            </div>
          </button>
        ))}
      </div>
      <div className="elite-selected-account mt-4">
        <p aria-live="polite" aria-atomic="true"><strong>{currency.format(selectedTier.balance)} capacity</strong><span>{currency.format(selectedTier.fee)} program fee · Eligibility and terms apply</span></p>
        <Link href="/participant/register" className="elite-inline-link">Review account <ArrowRight aria-hidden="true" /></Link>
      </div>
    </>
  )
}
