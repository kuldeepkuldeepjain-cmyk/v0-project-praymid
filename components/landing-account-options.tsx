import Link from "next/link"
import { ArrowRight, Check, Gauge, Shield } from "lucide-react"
import { DEFAULT_CHALLENGE_PLANS } from "@/lib/challenge-account"

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
    detail: "Maximum funded-account leverage; instrument limits still apply.",
  },
  {
    label: "Minimum position",
    value: "0.01 lots",
    detail: "Smallest funded-account position size accepted by the platform.",
  },
  {
    label: "Minimum order",
    value: "$3,000",
    detail: "Platform minimum for a funded-account order amount.",
  },
  {
    label: "Eligible profit share",
    value: "Up to 90%",
    detail: "Payouts depend on plan rules, verification, and eligibility.",
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
          <h2 className="elite-heading mt-4 text-balance">Choose the account that fits your approach.</h2>
          <p className="elite-copy mt-4 max-w-2xl">
            Compare standard platform access, Challenge evaluations, and the published funded account tiers before registering.
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
              Normal accounts offer up to 1,000:1 leverage. Actual leverage depends on the instrument, margin requirements, and account terms.
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
              Current Challenge plans list a {challengeRules.profitTargetPercent}% target, {challengeRules.dailyLossLimitPercent}% daily loss limit, {challengeRules.maxDrawdownPercent}% maximum drawdown, {challengeRules.minimumTradingDays} minimum trading days, and up to {challengeRules.leverage}:1 leverage.
            </p>
            <Link href="#programs" className="elite-inline-link mt-auto pt-4">
              Calculate Challenge rules <ArrowRight aria-hidden="true" />
            </Link>
          </article>
        </div>

        <div className="mt-10">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="elite-eyebrow">Funded accounts</p>
              <h3 className="mt-3 text-2xl font-semibold text-balance">Choose your capacity. Know the terms.</h3>
            </div>
            <p className="elite-copy max-w-xl text-sm">
              Five published account sizes, each paired with its matching program fee. The key trading and payout details are just below.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {fundedAccountTiers.map((tier, index) => (
              <article
                key={tier.balance}
                className="elite-funded-tier"
                style={{ animationDelay: `${index * 85}ms` }}
              >
                <span className="elite-funded-tier-label">Funded capacity</span>
                <strong className="elite-funded-tier-balance font-mono">{currency.format(tier.balance)}</strong>
                <div className="elite-funded-tier-fee">
                  <span>Program fee</span>
                  <strong>{currency.format(tier.fee)}</strong>
                </div>
              </article>
            ))}
          </div>

          <div className="elite-funded-details-heading mt-8">
            <p className="elite-eyebrow">The details behind each tier</p>
            <p className="elite-copy mt-2 max-w-2xl text-sm">
              Compare the operating limits and payout framework before choosing your funded account.
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
            Advertised balances represent account or trading capacity, not cash paid to you or a guaranteed withdrawal. Review the applicable loss, drawdown, and payout conditions before trading. Fees, availability, eligibility, and plan terms apply. <Link href="/terms" className="elite-terms-link">Read the Terms</Link>.
          </p>
        </div>
      </div>
    </section>
  )
}
