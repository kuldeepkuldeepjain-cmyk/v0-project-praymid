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
import { LandingFooter } from "@/components/landing-footer"
import { LandingHeader } from "@/components/landing-header"
import { MarketPreview } from "@/components/landing-market-preview"

const features = [
  {
    icon: CandlestickChart,
    title: "Read the market",
    description: "Bring supported instruments and chart context into one focused trading workspace.",
  },
  {
    icon: Shield,
    title: "Define risk first",
    description: "Review size, stop-loss, take-profit, and account limits before an order is placed.",
  },
  {
    icon: BarChart2,
    title: "See your exposure",
    description: "Keep positions, margin, and account activity visible while you manage a trade.",
  },
  {
    icon: Users,
    title: "Build consistency",
    description: "Use clear records and support resources to review decisions over time.",
  },
]

const steps = [
  {
    number: "01",
    title: "Choose an account",
    description: "Compare available challenge sizes and review the full rules before registering.",
  },
  {
    number: "02",
    title: "Trade your process",
    description: "Use the platform to assess markets, plan your risk, and manage each position.",
  },
  {
    number: "03",
    title: "Review your progress",
    description: "Track activity against the applicable evaluation rules and account terms.",
  },
]

const faqs = [
  {
    question: "What is Elite Fund?",
    answer:
      "Elite Fund provides a trading workspace and challenge programs for eligible traders. Platform access, instruments, and program terms depend on the account you select.",
  },
  {
    question: "What are the challenge rules?",
    answer:
      "The rules shown on this page include an 8% profit target, a 5% daily loss limit, a 10% maximum drawdown, and five minimum trading days. Review the current account terms before registering, since program availability and eligibility can vary.",
  },
  {
    question: "Are the market prices shown live?",
    answer:
      "No. The market panel is an illustrative interface preview. It does not show live quotes and should not be used to make trading decisions.",
  },
  {
    question: "Does a challenge guarantee funding or profits?",
    answer:
      "No. Completing an evaluation does not remove market risk or guarantee a particular outcome. Progression is subject to the applicable rules, eligibility checks, and account terms.",
  },
  {
    question: "Where can I read the full risk and account terms?",
    answer:
      "Read the Terms and Privacy pages before registering. Trading involves significant risk, and you should only trade with an understanding of the potential losses.",
  },
]

export default function LandingExperience() {
  return (
    <div className="elite-landing min-h-screen overflow-x-hidden font-sans">
      <LandingHeader />

      <main id="main-content">
        <section id="platform" className="elite-hero relative isolate overflow-hidden">
          <div className="elite-hero-art" aria-hidden="true" />
          <div className="elite-hero-scrim" aria-hidden="true" />
          <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:min-h-[690px] lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:px-10 lg:py-24">
            <div className="elite-hero-copy max-w-2xl">
              <p className="elite-eyebrow mb-5 inline-flex items-center gap-2.5">
                <span className="elite-eyebrow-dot" aria-hidden="true" />
                Market access for disciplined traders
              </p>
              <h1 className="elite-display text-balance">
                Trade with a plan.
                <span className="block elite-brand-text">Stay in control.</span>
              </h1>
              <p className="elite-copy mt-6 max-w-xl text-base sm:text-lg">
                A focused workspace for analyzing markets, defining risk, and managing positions—without the noise or the promises.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="#programs" className="elite-button elite-button-primary">
                  Explore challenge plans <ArrowRight aria-hidden="true" />
                </Link>
                <Link href="/participant/login" className="elite-button elite-button-secondary">
                  Trader login
                </Link>
              </div>
              <div className="elite-hero-trust mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t pt-5 text-sm">
                <span className="inline-flex items-center gap-2"><Shield className="elite-brand-text size-4" aria-hidden="true" /> Risk rules in view</span>
                <span className="inline-flex items-center gap-2"><Lock className="elite-brand-text size-4" aria-hidden="true" /> Secure account access</span>
              </div>
            </div>

            <MarketPreview />
          </div>
        </section>

        <section id="features" className="elite-section elite-section-divider">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="elite-section-heading max-w-3xl">
              <p className="elite-eyebrow">A workspace with purpose</p>
              <h2 className="elite-heading mt-4 text-balance">The essentials, without the noise.</h2>
              <p className="elite-copy mt-4 max-w-2xl">
                Tools that help you understand the setup, define the risk, and stay close to the details that matter.
              </p>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, description }) => (
                <article key={title} className="elite-feature-card">
                  <div className="elite-feature-icon"><Icon aria-hidden="true" /></div>
                  <h3 className="mt-6 text-lg font-semibold">{title}</h3>
                  <p className="elite-copy mt-2 text-sm">{description}</p>
                </article>
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
                Keep your market view, position sizing, and risk settings close together. The platform is designed to support a deliberate process—not replace your judgment.
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

        <section id="programs" className="elite-section elite-section-divider">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="elite-eyebrow">Challenge account planner</p>
              <h2 className="elite-heading mt-4 text-balance">Know the numbers before you begin.</h2>
              <p className="elite-copy mx-auto mt-4 max-w-2xl">
                Select an account size to see the reference amounts implied by the published challenge rules.
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
              <p className="elite-copy max-w-md text-sm">Every account is governed by its own published rules and verification requirements.</p>
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
                Read the account terms, challenge rules, and risk disclosures before you register. Trading carries risk, and a challenge is not a promise of profits or funding.
              </p>
            </div>
            <div className="elite-trust-panel grid gap-5 sm:grid-cols-2">
              <div>
                <Shield className="elite-brand-text size-6" aria-hidden="true" />
                <h3 className="mt-4 font-semibold">Account controls</h3>
                <p className="elite-copy mt-2 text-sm">Verification steps and clear account activity records support safer account access.</p>
              </div>
              <div>
                <Wallet className="elite-brand-text size-6" aria-hidden="true" />
                <h3 className="mt-4 font-semibold">Risk information</h3>
                <p className="elite-copy mt-2 text-sm">Review margin, position size, and applicable limits as part of your trading routine.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="elite-section elite-section-alt">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:px-10">
            <div className="max-w-md">
              <p className="elite-eyebrow">Good to know</p>
              <h2 className="elite-heading mt-4 text-balance">Questions, answered.</h2>
              <p className="elite-copy mt-4">Start with the details that help you decide whether the platform and program fit your needs.</p>
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
              <p className="elite-copy mt-4">Explore the available programs, read the terms, and decide if Elite Fund is right for you.</p>
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
