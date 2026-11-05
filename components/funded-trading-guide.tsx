import Link from "next/link"
import { LandingFooter } from "@/components/landing-footer"

const sections = [
  { id: "meaning", title: "What is a funded trading account?", paragraphs: ["A funded trading account is a trading program in which access to an advertised trading allocation is subject to a provider’s rules. The allocation is not necessarily cash deposited in your name. Depending on the program, trading may be simulated or use live execution; check the account-specific agreement before paying.", "A prop trading challenge is an evaluation route used by some providers. It measures performance against a profit target and risk limits. Passing an evaluation and receiving a funded account are separate steps, and neither guarantees earnings."] },
  { id: "evaluation", title: "How does a funded trading challenge work?", paragraphs: ["Start by comparing the evaluation fee, account size, profit target, daily loss limit, maximum drawdown, and minimum trading days. Then review eligible instruments, position limits, trading hours, and any restricted strategies. A plan with a lower fee is not necessarily better if its rules do not suit your trading process.", "During an evaluation, monitor both closed trades and open-position exposure. Meeting the profit target does not cancel a risk-rule breach. After completing the requirements, eligibility and account review still apply. EliteFund’s Challenge and funded-account programs are separate products; do not assume one purchase includes the other."] },
  { id: "drawdown", title: "Daily loss limits vs. maximum drawdown", paragraphs: ["A daily loss limit restricts losses within a defined trading day. Maximum drawdown restricts the account’s overall decline using the plan’s stated calculation. A static limit uses a fixed reference, while a trailing limit can move as the account grows. These approaches can produce different breach levels even when the advertised percentage is the same.", "Before choosing a challenge, check whether limits use balance or equity, whether open losses and trading costs count, and when the daily calculation resets. EliteFund’s published Challenge terms describe a daily floor based on day-start equity and an overall floor based on the starting balance. Funded-account rules may differ; review the selected product rather than applying another plan’s limits."] },
  { id: "fees", title: "How to compare funded account fees", paragraphs: ["Compare the total cost, not just the advertised account allocation. Look for evaluation charges, a separate funded-program fee, reset costs, refund conditions, and payout charges where applicable. The advertised allocation is trading capacity, not an amount you can automatically withdraw.", "Read the checkout terms before purchase and save the conditions applicable to your plan. A refundable fee may have eligibility conditions; it should not be treated as a guaranteed refund. EliteFund publishes its current advertised fees and risk rules in its account comparison and Terms and Conditions."] },
  { id: "payouts", title: "Profit share and USDT payouts", paragraphs: ["A profit-share percentage describes the share of eligible profits under the program rules. It does not promise a return on the fee you pay. Payout eligibility can depend on verification, trading compliance, timing, minimum amounts, and review of account activity.", "For a USDT payout, confirm the supported blockchain network, receiving-wallet compatibility, minimum request amount, and any fees before submitting. USDT on different networks is not interchangeable at the address-entry stage. Sending to an incompatible address or network can cause irreversible loss.", "EliteFund’s public payout totals summarize completed account-ledger records with transfer references. They are not independent on-chain verification or a promise of future payouts. Your personal payout status and available transaction reference belong in your signed-in account history."] },
  { id: "checklist", title: "What to check before joining a funded trading program", paragraphs: ["Confirm who operates the program, how support and complaints are handled, whether you are eligible in your jurisdiction, and whether trading is simulated or live. Ask for clarification before paying if the provider’s identity, execution model, rules, or withdrawal conditions are unclear.", "Look for understandable terms and verifiable records rather than guaranteed-profit claims, selected winning trades, or unexplained payout screenshots. Trading can produce losses. Do not spend money on evaluation or program fees that you cannot afford to lose."] },
]

export function FundedTradingGuide() {
  return (
    <div className="elite-landing min-h-screen font-sans">
      <header className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <Link href="/" className="elite-inline-link">EliteFund / Home</Link>
      </header>
      <main id="main-content" className="elite-section">
        <article className="mx-auto max-w-3xl px-5 sm:px-8">
          <nav aria-label="Breadcrumb" className="elite-copy text-sm"><Link href="/">Home</Link> / <span aria-current="page">Funded trading guide</span></nav>
          <p className="elite-eyebrow mt-8">Understand the rules before you trade</p>
          <h1 className="elite-heading mt-4 text-balance">Funded trading accounts: challenges, fees, drawdown and payouts</h1>
          <p className="elite-copy mt-6 leading-relaxed">A practical guide to evaluating a funded trading program, understanding prop trading challenges, and reviewing the conditions behind an advertised account balance.</p>
          <p className="elite-copy mt-4 text-sm">Published by EliteFund · Educational information, not personalized investment advice.</p>
          <nav aria-label="Guide contents" className="mt-8 flex flex-col gap-3">
            {sections.map((section) => <Link className="elite-inline-link" key={section.id} href={`#${section.id}`}>{section.title}</Link>)}
          </nav>
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="mt-12 scroll-mt-8">
              <h2 className="text-balance text-2xl font-semibold">{section.title}</h2>
              <div className="mt-4 flex flex-col gap-4">{section.paragraphs.map((paragraph) => <p key={paragraph} className="elite-copy leading-relaxed">{paragraph}</p>)}</div>
            </section>
          ))}
          <aside aria-label="Review EliteFund program information" className="elite-section-divider mt-12 flex flex-col gap-4 py-8">
            <h2 className="text-xl font-semibold">Review the current EliteFund programs</h2>
            <Link href="/#funded-accounts" className="elite-inline-link">Compare funded account plans and fees</Link>
            <Link href="/#programs" className="elite-inline-link">Explore the trading challenge planner</Link>
            <Link href="/terms" className="elite-inline-link">Read full trading rules, payout conditions and risk disclosures</Link>
            <a href="mailto:support@elitefund.sbs" className="elite-inline-link">Ask support about a plan before purchasing</a>
          </aside>
        </article>
      </main>
      <LandingFooter />
    </div>
  )
}
