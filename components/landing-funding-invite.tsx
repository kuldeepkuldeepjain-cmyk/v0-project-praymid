import Link from "next/link"
import { ArrowRight, ChartNoAxesCombined, ChevronDown, Eye, Wallet } from "lucide-react"

const moments = [
  { icon: Eye, label: "Watch the market", detail: "Follow the moves that matter to you." },
  { icon: Wallet, label: "Get ready", detail: "Add funds to your normal account when it feels right." },
  { icon: ChartNoAxesCombined, label: "Make it yours", detail: "Choose if and when to place a trade." },
]

export function LandingFundingInvite() {
  return (
    <section id="add-funds" aria-labelledby="funding-invite-title" className="elite-funding-invite elite-section-divider scroll-mt-20">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[1fr_0.9fr] lg:gap-20 lg:px-10">
        <div className="max-w-xl">
          <p className="elite-eyebrow">From watching to deciding</p>
          <h2 id="funding-invite-title" className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            You&apos;ve watched the moves. Now imagine making one on your terms.
          </h2>
          <p className="elite-copy mt-4 text-base">
            The best moment to start is the one you choose. Set up a normal account, add funds when you feel ready, and explore the market with your next decision firmly in your hands.
          </p>
          <div className="mt-7 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link href="/participant/register" className="elite-button elite-button-primary">
              Start with a normal account <ArrowRight aria-hidden="true" />
            </Link>
            <Link href="/participant/login" className="elite-inline-link">
              Already have an account? Sign in <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <p className="elite-copy mt-5 text-sm">
            Adding funds does not place a trade. Top-ups require payment review. Trading involves risk and returns are not guaranteed.
          </p>
        </div>

        <div className="elite-funding-flow" aria-label="A glimpse of the normal account journey">
          <div className="elite-funding-flow-header flex items-center justify-between gap-4">
            <span className="font-mono text-xs font-semibold tracking-wider uppercase">A glimpse inside</span>
            <span className="elite-funding-flow-tag">Normal account</span>
          </div>
          <p className="elite-funding-flow-lead mt-6 text-balance text-xl font-semibold">The next move stays yours.</p>
          <ol className="mt-3 flex flex-col">
            {moments.map(({ icon: Icon, label, detail }) => (
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
          <details className="elite-funding-flow-footer text-sm">
            <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold">
              What happens after I add funds? <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
            </summary>
            <p className="pt-3">Your top-up is reviewed first. Your balance updates only after approval, and you decide what to do next.</p>
          </details>
        </div>
      </div>
    </section>
  )
}
