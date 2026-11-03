import Link from "next/link"
import { ArrowRight, Check, Gauge, Shield } from "lucide-react"
import { DEFAULT_CHALLENGE_PLANS } from "@/lib/challenge-account"
import { LandingFundedTierSelector } from "@/components/landing-funded-tier-selector"

const fundedAccountTiers = [
  { balance: 5_000, fee: 50 },
  { balance: 10_000, fee: 100 },
  { balance: 25_000, fee: 250 },
  { balance: 50_000, fee: 500 },
  { balance: 100_000, fee: 1_000 },
]

const fundedAccountDetails = [
  {
    label: "Leverage cap",
    value: "Up to 100×",
    detail: "Actual leverage varies by instrument.",
  },
  {
    label: "Minimum position",
    value: "0.01 lots",
    detail: "Smallest allowed position.",
  },
  {
    label: "Minimum order",
    value: "$3,000",
    detail: "Minimum order amount.",
  },
  {
    label: "Eligible profit share",
    value: "Up to 90%",
    detail: "Subject to plan rules and eligibility.",
  },
]

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

export function LandingAccountOptions() {
  const challengeRules = DEFAULT_CHALLENGE_PLANS[0]

  return (
    <section id="accounts" className="elite-section elite-section-divider">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="elite-section-heading max-w-3xl">
          <p className="elite-eyebrow">Account options</p>
          <h2 className="elite-heading mt-4 text-balance">Compare funded trading accounts and Challenge plans.</h2>
          <p className="elite-copy mt-4 max-w-2xl">
            Compare standard access, Challenge plans, and funded accounts.
          </p>
        </div>

        <div className="mt-10 grid items-stretch gap-4 lg:grid-cols-2">
          <article className="elite-account-card elite-account-normal">
            <div className="elite-account-card-heading">
              <div className="elite-feature-icon"><Gauge aria-hidden="true" /></div>
              <div>
                <p className="elite-eyebrow">Normal account</p>
                <p className="elite-copy mt-1 text-sm">Standard platform access</p>
              </div>
            </div>

            <div className="elite-account-leverage">
              <span>Up to</span>
              <strong className="font-mono">1,000×</strong>
              <span>leverage</span>
            </div>
            <p className="elite-copy text-sm">
              Actual leverage varies by instrument and account terms.
            </p>

            <ul className="elite-account-feature-list">
              <li><Check aria-hidden="true" />Stop-loss and take-profit controls</li>
              <li><Check aria-hidden="true" />Margin and open-position visibility</li>
              <li><Check aria-hidden="true" />Account activity and trade history</li>
            </ul>

            <Link href="/participant/register" className="elite-inline-link mt-auto pt-4">
              Register a normal account <ArrowRight aria-hidden="true" />
            </Link>
          </article>

          <article className="elite-account-card">
            <div className="elite-account-card-heading">
              <div className="elite-feature-icon"><Shield aria-hidden="true" /></div>
              <div>
                <p className="elite-eyebrow">Challenge accounts</p>
                <p className="elite-copy mt-1 text-sm">Three evaluation sizes</p>
              </div>
            </div>

            <div className="elite-account-plan-list">
              {DEFAULT_CHALLENGE_PLANS.map((plan) => (
                <div key={plan.key} className="elite-account-plan-row">
                  <div>
                    <strong className="elite-account-plan-balance font-mono">{currency.format(plan.startingBalance)}</strong>
                    <span className="elite-account-plan-subtitle">{plan.name}</span>
                  </div>
                  <div className="elite-account-plan-price">
                    <span>Plan fee</span>
                    <strong>{currency.format(plan.fee)}</strong>
                  </div>
                </div>
              ))}
            </div>

            <p className="elite-copy text-sm">
              Target: {challengeRules.profitTargetPercent}%. Daily loss limit: {challengeRules.dailyLossLimitPercent}%. Max drawdown: {challengeRules.maxDrawdownPercent}%. Minimum trading days: {challengeRules.minimumTradingDays}. Leverage: up to {challengeRules.leverage}:1.
            </p>
            <p className="elite-copy mt-3 text-sm">
              Passing a Challenge may qualify you for funded-account review. Approval and funding are not guaranteed.
            </p>
            <Link href="#programs" className="elite-inline-link mt-auto pt-4">
              Calculate Challenge rules <ArrowRight aria-hidden="true" />
            </Link>
          </article>
        </div>

        <section id="funded-accounts" aria-labelledby="funded-accounts-heading" className="elite-funded-feature mt-10 scroll-mt-20">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="elite-eyebrow">Featured funded accounts</p>
              <h3 id="funded-accounts-heading" className="mt-3 text-3xl font-semibold tracking-tight text-balance">Choose your capacity. Know the terms.</h3>
            </div>
            <p className="elite-copy max-w-xl text-sm">
              Five account sizes, each with a clear fee and key details.
            </p>
          </div>

          <p className="elite-copy mt-5 text-sm">Choose a size to compare.</p>
          <LandingFundedTierSelector tiers={fundedAccountTiers} />

          <div className="elite-funded-details-heading mt-8">
            <p className="elite-eyebrow">Funded account details</p>
            <p className="elite-copy mt-2 max-w-2xl text-sm">
              See key limits and payout terms for each account size.
            </p>
          </div>

          <dl className="elite-funded-details mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {fundedAccountDetails.map((item) => (
              <div key={item.label} className="elite-funded-detail">
                <dt>{item.label}</dt>
                <dd className="font-mono">{item.value}</dd>
                <p>{item.detail}</p>
              </div>
            ))}
          </dl>

          <p className="elite-copy mt-4 max-w-5xl text-xs">
            Balances show trading capacity, not payouts. Fees, loss limits, and eligibility rules apply. <Link href="/terms" className="elite-terms-link">Read the Terms</Link>.
          </p>
        </section>
      </div>
    </section>
  )
}
