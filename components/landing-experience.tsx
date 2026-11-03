import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  BarChart2,
  CandlestickChart,
  Check,
  Lock,
  Shield,
  Users,
  Wallet,
} from "lucide-react"
import { ChallengePlanner } from "@/components/landing-challenge-planner"
import { LandingAccountOptions } from "@/components/landing-account-options"
import { LandingFooter } from "@/components/landing-footer"
import { LandingFundingInvite } from "@/components/landing-funding-invite"
import { LandingHeader } from "@/components/landing-header"
import { LandingPayoutRecords } from "@/components/landing-payout-records"
import { MarketPreview } from "@/components/landing-market-preview"

const features = [
  {
    icon: CandlestickChart,
    title: "Read the market",
    description: "See supported markets and charts in one focused workspace.",
    detail: "Preview Forex, metals, and digital markets above.",
  },
  {
    icon: Shield,
    title: "Define risk first",
    description: "Set trade size, stop-loss, and take-profit before entry.",
    detail: "Compare each Challenge plan’s target and loss limits below.",
  },
  {
    icon: BarChart2,
    title: "See your exposure",
    description: "See open positions, margin, and activity together.",
    detail: "Review your margin, positions, and trade history in one place.",
  },
  {
    icon: Users,
    title: "Build consistency",
    description: "Use clear records to improve your trading process.",
    detail: "Track your trades and evaluation rules to stay consistent.",
  },
]

const steps = [
  {
    number: "01",
    title: "Choose an account",
    description: "Compare plans, fees, and rules before you sign up.",
  },
  {
    number: "02",
    title: "Trade your process",
    description: "Assess the market, set your risk, and manage each trade.",
  },
  {
    number: "03",
    title: "Review your progress",
    description: "Track your progress against your account rules.",
  },
]

const faqs = [
  {
    question: "What is EliteFund?",
    answer:
      "EliteFund offers a trading workspace with optional funded trading challenge programs. Compare account sizes, evaluation fees, profit targets, and drawdown rules; eligibility varies by plan.",
  },
  {
    question: "How does a funded trading challenge work?",
    answer:
      "Choose a plan, review its fee and published rules, and track trading against the profit target, daily loss limit, maximum drawdown, and minimum trading days. Passing may qualify you for funded-account review; funding, profits, and payouts are not guaranteed.",
  },
  {
    question: "What are the challenge rules?",
    answer:
      "Compare plans before signing up: check the target, loss limits, drawdown, and required trading days.",
  },
  {
    question: "How much leverage is available?",
    answer:
      "Normal accounts offer up to 1,000:1. Challenge leverage varies by plan. Instrument limits apply.",
  },
  {
    question: "Where can I review payout records?",
    answer:
      "See your payout amount, status, payment method, and transaction reference if available. Terms apply.",
  },
  {
    question: "Are the market prices shown live?",
    answer:
      "No. These are illustrative values, not live prices. Don’t use them to trade.",
  },
  {
    question: "Does a challenge guarantee funding or profits?",
    answer:
      "No. Passing a Challenge does not guarantee funding or profits. Eligibility and program rules apply.",
  },
  {
    question: "Where can I read the full risk and account terms?",
    answer:
      "Read the Terms and Privacy pages before registering. Trading can result in significant losses.",
  },
]

export default function LandingExperience() {
  return (
    <div className="elite-landing min-h-screen overflow-x-hidden font-sans">
      <LandingHeader />

      <main id="main-content">
        <section id="platform" className="elite-hero relative isolate overflow-hidden">
          <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:gap-12 sm:px-8 sm:py-20 lg:min-h-[620px] lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:px-10 lg:py-20">
            <div className="elite-hero-copy max-w-2xl">
              <p className="elite-eyebrow mb-5 inline-flex items-center gap-2.5">
                <span className="elite-eyebrow-dot" aria-hidden="true" />
                Funded programs for disciplined traders
              </p>
              <h1 className="elite-display text-balance">
                Funded trading challenges
                <span className="block elite-brand-text">with clear rules.</span>
              </h1>
              <p className="elite-copy mt-5 max-w-xl text-base sm:mt-6 sm:text-lg">
                Compare funded trading accounts, prop trading challenge fees, profit targets, and drawdown rules before choosing a plan.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
                <Link href="#funded-accounts" className="elite-button elite-button-primary">
                  Compare funded accounts <ArrowRight aria-hidden="true" />
                </Link>
                <Link href="/participant/login" className="elite-button elite-button-secondary">
                  Trader login
                </Link>
              </div>
              <Link href="#add-funds" className="elite-inline-link mt-5">
                Your next move starts here <ArrowRight aria-hidden="true" />
              </Link>
              <div className="elite-hero-trust mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t pt-5 text-sm">
                <span className="inline-flex items-center gap-2"><Shield className="elite-brand-text size-4" aria-hidden="true" /> Risk rules in view</span>
                <span className="inline-flex items-center gap-2"><Lock className="elite-brand-text size-4" aria-hidden="true" /> Secure account access</span>
              </div>
            </div>

            <MarketPreview />
          </div>
        </section>

        <LandingFundingInvite />
        <LandingPayoutRecords />

        <section id="features" className="elite-section elite-section-divider">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="elite-section-heading max-w-3xl">
              <p className="elite-eyebrow">A workspace with purpose</p>
              <h2 className="elite-heading mt-4 text-balance">The essentials, without the noise.</h2>
              <p className="elite-copy mt-4 max-w-2xl">
                Plan trades, manage risk, and focus on what matters.
              </p>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, description, detail }, index) => (
                <details key={title} className="elite-feature-card elite-interactive-tile" style={{ animationDelay: `${index * 80}ms` }}>
                  <summary>
                    <span className="elite-tile-top"><span className="elite-feature-icon"><Icon aria-hidden="true" /></span><span className="elite-tile-toggle" aria-hidden="true">+</span></span>
                    <h3 className="mt-6 text-lg font-semibold">{title}</h3>
                    <span className="elite-copy mt-2 block text-sm">{description}</span>
                    <span className="elite-tile-prompt">Explore this tool <ArrowRight className="size-4" aria-hidden="true" /></span>
                  </summary>
                  <p className="elite-tile-detail">{detail}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="elite-section elite-section-alt">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-10">
            <div className="elite-workspace-visual relative overflow-hidden">
              <Image
                src="/images/elitefund-workspace-detail.png"
                alt="A trader reviewing a chart at a modern workstation"
                fill
                sizes="(max-width: 1023px) 100vw, 50vw"
                className="object-cover"
              />
              <span className="elite-image-caption">A clearer view of your trading workflow</span>
            </div>
            <div className="max-w-xl">
              <p className="elite-eyebrow">Designed around the decision</p>
              <h2 className="elite-heading mt-4 text-balance">From market context to a considered order.</h2>
              <p className="elite-copy mt-5">
                See markets, trade size, and risk controls together. You make the decisions.
              </p>
              <ul className="mt-7 flex flex-col gap-4">
                {[
                  "Review the instrument and available market context",
                  "Set order size and risk controls before entry",
                  "Track open positions and account activity",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-6">
                    <Check className="elite-positive mt-1 size-4 shrink-0" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/participant/register" className="elite-inline-link mt-8">
                Explore the platform <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <LandingAccountOptions />

        <section id="programs" className="elite-section elite-section-divider">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="elite-eyebrow">Challenge account planner</p>
              <h2 className="elite-heading mt-4 text-balance">Know the numbers before you begin.</h2>
              <p className="elite-copy mx-auto mt-4 max-w-2xl">
                Choose a Challenge plan to compare its fee and key limits.
              </p>
            </div>
            <div className="mt-10">
              <ChallengePlanner />
            </div>
          </div>
        </section>

        <section id="how-it-works" className="elite-section elite-section-alt">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="elite-eyebrow">A straightforward path</p>
                <h2 className="elite-heading mt-4 text-balance">Understand the steps. Then make your move.</h2>
              </div>
              <p className="elite-copy max-w-md text-sm">Rules and verification vary by account.</p>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {steps.map((step) => (
                <article key={step.number} className="elite-step-card">
                  <span className="elite-step-number">{step.number}</span>
                  <h3 className="mt-8 text-xl font-semibold">{step.title}</h3>
                  <p className="elite-copy mt-3 text-sm">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="security" className="elite-section elite-section-divider">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:px-10">
            <div>
              <p className="elite-eyebrow">Clarity is part of control</p>
              <h2 className="elite-heading mt-4 text-balance">Know what you are agreeing to.</h2>
              <p className="elite-copy mt-5 max-w-xl">
                Review account rules and risk disclosures before signing up. Challenges do not guarantee funding or profits.
              </p>
            </div>
            <div className="elite-trust-panel grid gap-5 sm:grid-cols-2">
              <div>
                <Shield className="elite-brand-text size-6" aria-hidden="true" />
                <h3 className="mt-4 font-semibold">Account controls</h3>
                <p className="elite-copy mt-2 text-sm">Verify your account and review its activity.</p>
              </div>
              <div>
                <Wallet className="elite-brand-text size-6" aria-hidden="true" />
                <h3 className="mt-4 font-semibold">Risk information</h3>
                <p className="elite-copy mt-2 text-sm">Check margin, trade size, and account limits before trading.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="elite-section elite-section-alt">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:px-10">
            <div className="max-w-md">
              <p className="elite-eyebrow">Good to know</p>
              <h2 className="elite-heading mt-4 text-balance">Questions, answered.</h2>
              <p className="elite-copy mt-4">Quick answers about accounts, payouts, and trading risk.</p>
            </div>
            <div className="elite-faq-list">
              {faqs.map(({ question, answer }) => (
                <details key={question} className="elite-faq-item">
                  <summary>{question}</summary>
                  <p className="elite-copy mt-3 pr-8 text-sm">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="elite-final-cta">
          <div className="mx-auto flex max-w-7xl flex-col gap-7 px-5 py-16 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10 lg:py-20">
            <div className="max-w-2xl">
              <p className="elite-eyebrow">Your next step</p>
              <h2 className="elite-heading mt-4 text-balance">Start with the rules. Trade with intention.</h2>
              <p className="elite-copy mt-4">Compare programs. Review the terms. Then decide.</p>
            </div>
            <Link href="/participant/register" className="elite-button elite-button-primary shrink-0">
              Create an account <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
