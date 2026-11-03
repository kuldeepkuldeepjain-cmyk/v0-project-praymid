import Link from "next/link"
import { ArrowRight, Check, Clock3, Wallet } from "lucide-react"

const fundingSteps = [
  { icon: Wallet, label: "Choose your amount", detail: "Decide what you are comfortable adding." },
  { icon: Clock3, label: "Submit for review", detail: "Follow the payment instructions in your account." },
  { icon: Check, label: "Track your status", detail: "See when your top-up is reviewed and credited." },
]

export function LandingFundingInvite() {
  return (
    <section id="add-funds" aria-labelledby="funding-invite-title" className="elite-funding-invite elite-section-divider scroll-mt-20">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[1fr_0.9fr] lg:gap-20 lg:px-10">
        <div className="max-w-xl">
          <p className="elite-eyebrow">A closer look at funding</p>
          <h2 id="funding-invite-title" className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Curious what happens when you add funds?
          </h2>
          <p className="elite-copy mt-4 text-base">
            Start with a normal account. Choose an amount, follow the payment instructions, and track your top-up through review. You can explore the process before committing to a trade.
          </p>
          <div className="mt-7 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link href="/participant/register" className="elite-button elite-button-primary">
              Explore adding funds <ArrowRight aria-hidden="true" />
            </Link>
            <Link href="/participant/login" className="elite-inline-link">
              Already have an account? Sign in <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <p className="elite-copy mt-5 text-sm">
            Top-ups are subject to payment review. Trading involves risk and returns are not guaranteed.
          </p>
        </div>

        <div className="elite-funding-flow" aria-label="Normal account top-up process">
          <div className="elite-funding-flow-header flex items-center justify-between gap-4">
            <span className="font-mono text-xs font-semibold tracking-wider uppercase">Normal account / Funding</span>
            <span className="elite-funding-flow-tag">How it works</span>
          </div>
          <ol className="flex flex-col">
            {fundingSteps.map(({ icon: Icon, label, detail }) => (
              <li key={label} className="elite-funding-flow-step flex items-start gap-4 py-4">
                <span className="elite-funding-flow-icon flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="flex flex-col gap-1">
                  <strong className="text-sm font-semibold">{label}</strong>
                  <span className="elite-copy text-sm">{detail}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="elite-funding-flow-footer text-sm">Your balance updates after approval, not at submission.</p>
        </div>
      </div>
    </section>
  )
}
