"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileCheck2,
  LockKeyhole,
  PiggyBank,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
} from "lucide-react"
import { FlowChainLogo } from "@/components/flowchain-logo"

const terms = [
  { label: "3 months", months: 3, apr: 8.25 },
  { label: "6 months", months: 6, apr: 9.5 },
  { label: "12 months", months: 12, apr: 11.25 },
]

const portfolioBars = [42, 51, 46, 58, 62, 57, 69, 74, 70, 82, 78, 88]

export default function LendingPage() {
  const [amount, setAmount] = useState(2500)
  const [term, setTerm] = useState(6)
  const [showFaq, setShowFaq] = useState(false)

  const selectedTerm = terms.find((item) => item.months === term) ?? terms[1]
  const monthlyRate = selectedTerm.apr / 100 / 12
  const monthlyPayment = amount * (monthlyRate * (1 + monthlyRate) ** term) / ((1 + monthlyRate) ** term - 1)
  const totalRepayment = monthlyPayment * term
  const totalInterest = totalRepayment - amount
  const formatMoney = (value: number) => `$${Math.round(value).toLocaleString("en-US")}`
  const repaymentLabel = useMemo(() => `${formatMoney(monthlyPayment)} / month`, [monthlyPayment])

  return (
    <main className="lending-page min-h-screen overflow-hidden">
      <nav className="lending-nav">
        <div className="lending-shell flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3" aria-label="Elite Fund home">
            <FlowChainLogo variant="icon" size="xs" showTagline={false} className="h-9 w-9 rounded-xl" />
            <span className="lending-brand">ELITEFUND</span>
          </Link>
          <div className="hidden items-center gap-7 text-sm text-[var(--lending-muted)] md:flex">
            <a href="#how-it-works" className="hover:text-[var(--lending-ink)]">How it works</a>
            <a href="#calculator" className="hover:text-[var(--lending-ink)]">Calculator</a>
            <a href="#safety" className="hover:text-[var(--lending-ink)]">Safety</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/participant/login" className="hidden rounded-lg px-3 py-2 text-sm text-[var(--lending-muted)] hover:text-[var(--lending-ink)] sm:block">Sign in</Link>
            <Link href="/participant/register" className="lending-button lending-button-small">Open account <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      </nav>

      <section className="lending-shell lending-hero grid gap-12 pb-16 pt-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pb-24 lg:pt-28">
        <div>
          <div className="lending-eyebrow"><span className="lending-live-dot" /> Regulated-style lending workflow</div>
          <h1 className="lending-display mt-5 max-w-3xl">Put your cash to work. <span>With terms you can see.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[var(--lending-muted)] sm:text-lg">A transparent marketplace for fixed-term lending. Compare opportunities, understand the downside, and choose how much capital you want exposed.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#calculator" className="lending-button justify-center">Calculate a loan <ArrowRight className="h-4 w-4" /></a>
            <Link href="/participant/register" className="lending-button lending-button-quiet justify-center">Start lending</Link>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs text-[var(--lending-muted)]">
            <span className="flex items-center gap-2"><LockKeyhole className="h-3.5 w-3.5 text-[var(--lending-accent)]" /> Funds held in custody</span>
            <span className="flex items-center gap-2"><FileCheck2 className="h-3.5 w-3.5 text-[var(--lending-accent)]" /> Clear repayment schedule</span>
          </div>
        </div>

        <div className="lending-snapshot">
          <div className="flex items-start justify-between border-b border-[var(--lending-line)] pb-5">
            <div><p className="lending-label">Marketplace overview</p><p className="mt-1 text-lg font-semibold">Today&apos;s lending book</p></div>
            <span className="lending-status"><span className="lending-live-dot" /> Live</span>
          </div>
          <div className="grid grid-cols-2 gap-5 py-6">
            <div><p className="lending-label">Active capital</p><p className="mt-2 text-2xl font-semibold tracking-tight">$8.42M</p><p className="mt-1 text-xs text-[var(--lending-positive)]">+4.8% this quarter</p></div>
            <div><p className="lending-label">Weighted APR</p><p className="mt-2 text-2xl font-semibold tracking-tight">10.4%</p><p className="mt-1 text-xs text-[var(--lending-muted)]">Across 1,284 notes</p></div>
          </div>
          <div className="lending-chart" aria-label="12 month lending volume chart">
            {portfolioBars.map((height, index) => <span key={index} style={{ height: `${height}%` }} className={index === portfolioBars.length - 1 ? "lending-bar lending-bar-current" : "lending-bar"} />)}
          </div>
          <div className="mt-4 flex justify-between text-[10px] uppercase tracking-[0.16em] text-[var(--lending-muted)]"><span>Jan</span><span>Jun</span><span>Dec</span></div>
        </div>
      </section>

      <section id="how-it-works" className="lending-shell border-t border-[var(--lending-line)] py-16 lg:py-20">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="lending-eyebrow">A calmer way to lend</p><h2 className="lending-heading mt-3">Simple by design. Specific by default.</h2></div><p className="max-w-sm text-sm leading-6 text-[var(--lending-muted)]">Every opportunity shows its term, rate, repayment cadence, and risk tier before you commit.</p></div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[{ icon: SlidersHorizontal, number: "01", title: "Choose your terms", text: "Set a target rate, duration, and amount that match your liquidity needs." }, { icon: BadgeCheck, number: "02", title: "Review the borrower", text: "See verification, collateral coverage, payment history, and risk grade." }, { icon: WalletCards, number: "03", title: "Track every payment", text: "Your dashboard shows principal, interest, next payment, and maturity date." }].map((item) => { const Icon = item.icon; return <article key={item.number} className="lending-step"><span className="lending-step-number">{item.number}</span><Icon className="mt-8 h-5 w-5 text-[var(--lending-accent)]" /><h3 className="mt-5 text-lg font-semibold">{item.title}</h3><p className="mt-3 text-sm leading-6 text-[var(--lending-muted)]">{item.text}</p></article> })}
        </div>
      </section>

      <section id="calculator" className="lending-shell py-16 lg:py-20">
        <div className="lending-calculator grid gap-10 p-5 sm:p-8 lg:grid-cols-[1.1fr_.9fr] lg:p-10">
          <div><p className="lending-eyebrow">Repayment calculator</p><h2 className="lending-heading mt-3">Know the payment before you apply.</h2><p className="mt-4 max-w-lg text-sm leading-6 text-[var(--lending-muted)]">Adjust the amount and term to see an illustrative estimate. Your final rate depends on underwriting and the selected lending product.</p>
            <div className="mt-9 space-y-8">
              <div><div className="mb-3 flex items-center justify-between"><label htmlFor="loan-amount" className="lending-label">Loan amount</label><span className="text-lg font-semibold">{formatMoney(amount)}</span></div><input id="loan-amount" type="range" min="500" max="25000" step="500" value={amount} onChange={(event) => setAmount(Number(event.target.value))} className="lending-range" /><div className="mt-2 flex justify-between text-xs text-[var(--lending-muted)]"><span>$500</span><span>$25,000</span></div></div>
              <div><p className="lending-label mb-3">Repayment term</p><div className="grid grid-cols-3 gap-2">{terms.map((item) => <button key={item.months} type="button" onClick={() => setTerm(item.months)} className={`lending-term ${term === item.months ? "lending-term-active" : ""}`}>{item.label}<span>{item.apr.toFixed(2)}% APR</span></button>)}</div></div>
            </div>
          </div>
          <div className="lending-result"><div className="flex items-center justify-between"><p className="lending-label">Illustrative offer</p><CircleHelp className="h-4 w-4 text-[var(--lending-muted)]" aria-label="Illustrative estimate" /></div><p className="mt-4 text-4xl font-semibold tracking-tight">{repaymentLabel}</p><div className="mt-8 space-y-4 border-y border-[var(--lending-line)] py-5 text-sm"><div className="flex justify-between"><span className="text-[var(--lending-muted)]">Principal</span><span>{formatMoney(amount)}</span></div><div className="flex justify-between"><span className="text-[var(--lending-muted)]">Estimated interest</span><span className="text-[var(--lending-positive)]">{formatMoney(totalInterest)}</span></div><div className="flex justify-between"><span className="text-[var(--lending-muted)]">Total repayment</span><span>{formatMoney(totalRepayment)}</span></div></div><div className="mt-5 flex items-center justify-between text-xs text-[var(--lending-muted)]"><span>APR {selectedTerm.apr.toFixed(2)}%</span><span>{term} monthly payments</span></div><Link href="/participant/register" className="lending-button mt-7 w-full justify-center">Continue application <ArrowRight className="h-4 w-4" /></Link></div>
        </div>
      </section>

      <section id="safety" className="lending-shell border-t border-[var(--lending-line)] py-16 lg:py-20"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start"><div><p className="lending-eyebrow">Built for informed decisions</p><h2 className="lending-heading mt-3">The important details stay in view.</h2><p className="mt-4 text-sm leading-6 text-[var(--lending-muted)]">Lending involves risk, including late or missed payments and loss of principal. We make the trade-offs visible so you can size positions responsibly.</p></div><div className="grid gap-3 sm:grid-cols-2">{[{ icon: ShieldCheck, title: "Risk grades", text: "Compare estimated default risk and coverage before funding." }, { icon: CalendarDays, title: "Payment clarity", text: "See exact due dates, maturity, and amortization details." }, { icon: BarChart3, title: "Portfolio view", text: "Diversify across terms, grades, and borrower categories." }, { icon: Clock3, title: "Liquidity first", text: "Keep a cash buffer and only commit funds you can hold." }].map((item) => { const Icon = item.icon; return <div key={item.title} className="lending-safety-item"><Icon className="h-5 w-5 text-[var(--lending-accent)]" /><div><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-sm leading-5 text-[var(--lending-muted)]">{item.text}</p></div></div> })}</div></div></section>

      <section className="lending-shell pb-16"><div className="lending-callout flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"><div><p className="lending-label">Ready when you are</p><h2 className="mt-2 text-2xl font-semibold">Open your account and explore real terms.</h2></div><Link href="/participant/register" className="lending-button lending-button-small justify-center">Get started <ArrowRight className="h-4 w-4" /></Link></div></section>

      <footer className="lending-footer"><div className="lending-shell flex flex-col gap-4 py-8 text-xs text-[var(--lending-muted)] sm:flex-row sm:items-center sm:justify-between"><span>© 2026 Elite Fund. Lending involves risk.</span><div className="flex gap-5"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><button type="button" onClick={() => setShowFaq((value) => !value)} className="hover:text-[var(--lending-ink)]">FAQ <ChevronDown className={`ml-1 inline h-3 w-3 transition-transform ${showFaq ? "rotate-180" : ""}`} /></button></div></div>{showFaq && <div className="lending-shell border-t border-[var(--lending-line)] py-5 text-xs text-[var(--lending-muted)]">Rates shown are illustrative and may change based on underwriting, product availability, and market conditions. Past performance is not a guarantee of future results.</div>}</footer>
    </main>
  )
}
