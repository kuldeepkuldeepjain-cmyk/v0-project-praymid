"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"

const accountSizes = [
  { id: "5000", label: "$5,000", balance: 5_000 },
  { id: "10000", label: "$10,000", balance: 10_000 },
  { id: "25000", label: "$25,000", balance: 25_000 },
] as const

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

export function ChallengePlanner() {
  const [selectedId, setSelectedId] = useState<(typeof accountSizes)[number]["id"]>("10000")
  const selected = accountSizes.find((account) => account.id === selectedId) ?? accountSizes[1]
  const target = selected.balance * 0.08
  const dailyReference = selected.balance * 0.05
  const drawdown = selected.balance * 0.1

  return (
    <div className="elite-planner">
      <div className="elite-planner-main">
        <div>
          <p className="elite-planner-label">Select account size</p>
          <div className="elite-plan-options mt-3" role="group" aria-label="Challenge account size">
            {accountSizes.map((account) => (
              <button
                key={account.id}
                type="button"
                aria-pressed={selectedId === account.id}
                className={selectedId === account.id ? "is-selected" : ""}
                onClick={() => setSelectedId(account.id)}
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>

        <div className="elite-planner-summary" aria-live="polite" aria-atomic="true">
          <p className="elite-planner-label">Selected challenge balance</p>
          <p className="elite-planner-balance">{money.format(selected.balance)}</p>
          <p className="elite-copy text-sm">Reference values based on the published challenge rules.</p>
        </div>

        <div className="elite-plan-metrics">
          <div className="elite-plan-metric">
            <span>Profit target <span className="elite-muted">· 8%</span></span>
            <strong>{money.format(target)}</strong>
          </div>
          <div className="elite-plan-metric">
            <span>Daily loss <span className="elite-muted">· 5%</span></span>
            <strong>{money.format(dailyReference)}</strong>
          </div>
          <div className="elite-plan-metric">
            <span>Max drawdown <span className="elite-muted">· 10%</span></span>
            <strong>{money.format(drawdown)}</strong>
          </div>
        </div>
      </div>

      <aside className="elite-planner-aside">
        <p className="elite-eyebrow">Challenge snapshot</p>
        <h3 className="mt-3 text-xl font-semibold">A clear scorecard. A measured approach.</h3>
        <ul className="mt-5 flex flex-col gap-3 text-sm">
          <li className="flex items-start gap-2.5"><Check className="elite-positive mt-0.5 size-4 shrink-0" aria-hidden="true" />5 minimum trading days</li>
          <li className="flex items-start gap-2.5"><Check className="elite-positive mt-0.5 size-4 shrink-0" aria-hidden="true" />Risk limits visible before registration</li>
          <li className="flex items-start gap-2.5"><Check className="elite-positive mt-0.5 size-4 shrink-0" aria-hidden="true" />Eligibility and terms apply</li>
        </ul>
        <Link href="/participant/register" className="elite-button elite-button-primary mt-7 w-full">
          Review and register <ArrowRight aria-hidden="true" />
        </Link>
      </aside>

      <p className="elite-planner-note">
        Reference amounts are calculations from the listed percentages. The daily loss rule is measured against day-start equity; account terms determine the applicable limits.
      </p>
    </div>
  )
}
