"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"

import { DEFAULT_CHALLENGE_PLANS } from "@/lib/challenge-account"

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

export function ChallengePlanner() {
  const [selectedId, setSelectedId] = useState(DEFAULT_CHALLENGE_PLANS[1].key)
  const selected = DEFAULT_CHALLENGE_PLANS.find((account) => account.key === selectedId) ?? DEFAULT_CHALLENGE_PLANS[1]
  const target = selected.startingBalance * (selected.profitTargetPercent / 100)
  const dailyReference = selected.startingBalance * (selected.dailyLossLimitPercent / 100)
  const drawdown = selected.startingBalance * (selected.maxDrawdownPercent / 100)

  return (
    <div className="elite-planner">
      <div className="elite-planner-main">
        <div>
          <p className="elite-planner-label">Select Challenge account size</p>
          <div className="elite-plan-options mt-3" role="group" aria-label="Challenge account size">
            {DEFAULT_CHALLENGE_PLANS.map((account) => (
              <button
                key={account.key}
                type="button"
                aria-pressed={selectedId === account.key}
                className={selectedId === account.key ? "is-selected" : ""}
                onClick={() => setSelectedId(account.key)}
              >
                {money.format(account.startingBalance)}
              </button>
            ))}
          </div>
        </div>

        <div className="elite-planner-summary" aria-live="polite" aria-atomic="true">
          <p className="elite-planner-label">{selected.name} · {money.format(selected.fee)} program fee</p>
          <p className="elite-planner-balance">{money.format(selected.startingBalance)}</p>
          <p className="elite-copy text-sm">Reference values based on the published challenge rules.</p>
        </div>

        <div className="elite-plan-metrics">
          <div className="elite-plan-metric">
            <span>Profit target <span className="elite-muted">· {selected.profitTargetPercent}%</span></span>
            <strong>{money.format(target)}</strong>
          </div>
          <div className="elite-plan-metric">
            <span>Daily loss <span className="elite-muted">· {selected.dailyLossLimitPercent}%</span></span>
            <strong>{money.format(dailyReference)}</strong>
          </div>
          <div className="elite-plan-metric">
            <span>Max drawdown <span className="elite-muted">· {selected.maxDrawdownPercent}%</span></span>
            <strong>{money.format(drawdown)}</strong>
          </div>
        </div>
      </div>

      <aside className="elite-planner-aside">
        <p className="elite-eyebrow">Challenge snapshot</p>
        <h3 className="mt-3 text-xl font-semibold">A clear scorecard. A measured approach.</h3>
        <ul className="mt-5 flex flex-col gap-3 text-sm">
          <li className="flex items-start gap-2.5"><Check className="elite-positive mt-0.5 size-4 shrink-0" aria-hidden="true" />{selected.minimumTradingDays} minimum trading days</li>
          <li className="flex items-start gap-2.5"><Check className="elite-positive mt-0.5 size-4 shrink-0" aria-hidden="true" />Up to {selected.leverage}:1 leverage</li>
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
