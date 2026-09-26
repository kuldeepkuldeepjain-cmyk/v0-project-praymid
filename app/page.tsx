"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FlowChainLogo } from "@/components/flowchain-logo"
import {
  ArrowRight,
  TrendingUp,
  BarChart2,
  Shield,
  Zap,
  Check,
  Menu,
  X,
  Lock,
  Globe,
  CandlestickChart,
  Wallet,
  Users,
  Award,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react"
import { useState } from "react"
import { LearnMoreDialog } from "@/components/learn-more-dialog"
import { AIChatbotDialog } from "@/components/ai-chatbot-dialog"

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">{title}</h2>
      <ul className="flex flex-col gap-2 text-xs text-slate-500">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="transition-colors hover:text-white">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeTradingTab, setActiveTradingTab] = useState("forex")

  const marketPairs = [
    { symbol: "EUR/USD", bid: "1.0850", ask: "1.0852", change: "+0.45%", trend: "up" },
    { symbol: "GBP/USD", bid: "1.2780", ask: "1.2782", change: "+1.12%", trend: "up" },
    { symbol: "USD/JPY", bid: "149.45", ask: "149.47", change: "-0.23%", trend: "down" },
    { symbol: "XAU/USD", bid: "2385.50", ask: "2385.70", change: "+0.12%", trend: "up" },
  ]

  const features = [
    {
      icon: CandlestickChart,
      title: "Professional Charts",
      description: "Review price action, positions, and risk across multiple timeframes in one focused workspace."
    },
    {
      icon: BarChart2,
      title: "Multiple Assets",
      description: "Monitor supported forex, metals, and digital asset markets from a single account."
    },
    {
      icon: Zap,
      title: "Order Controls",
      description: "Set entry, stop-loss, take-profit, and size before sending an order."
    },
    {
      icon: Lock,
      title: "Account Security",
      description: "Session controls, verification steps, and clear account activity records."
    },
    {
      icon: Wallet,
      title: "Risk-Aware Sizing",
      description: "Use leverage selectively with visible margin and liquidation information."
    },
    {
      icon: Users,
      title: "Support When Needed",
      description: "Access help resources and account support when you need a clear answer."
    },
  ]

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-cyan-400 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-slate-950">Skip to content</a>
      {/* Navigation */}
      <nav aria-label="Primary navigation" className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlowChainLogo variant="icon" size="xs" showTagline={false} className="h-9 w-9 rounded-lg" />
            <span suppressHydrationWarning className="font-bold text-lg sm:text-xl bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              Elite Fund
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#platform" className="text-slate-300 hover:text-white font-medium text-sm transition-colors">Platform</a>
            <a href="#features" className="text-slate-300 hover:text-white font-medium text-sm transition-colors">Features</a>
            <a href="#programs" className="text-slate-300 hover:text-white font-medium text-sm transition-colors">Programs</a>
            <a href="#security" className="text-slate-300 hover:text-white font-medium text-sm transition-colors">Security</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => router.push("/participant/login")}
              className="px-5 py-2 rounded-lg border border-cyan-500/60 bg-slate-900/80 text-cyan-300 font-semibold text-sm hover:bg-cyan-500/10 hover:border-cyan-400 hover:text-white transition-all duration-200 active:scale-95"
            >
              Login
            </button>
            <button
              onClick={() => router.push("/participant/register")}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-sm shadow-lg hover:shadow-cyan-500/30 transition-all duration-200 active:scale-95 flex items-center gap-2"
            >
              Start Trading <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile nav */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => router.push("/participant/login")}
              className="h-8 px-3 rounded-lg border border-cyan-500/60 bg-slate-900/80 text-cyan-300 font-semibold text-xs hover:bg-cyan-500/10 hover:border-cyan-400 hover:text-white transition-all duration-200 active:scale-95"
            >
              Login
            </button>
            <button aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen(!isMenuOpen)} className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white">
              {isMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div id="mobile-navigation" aria-label="Mobile navigation" className="absolute left-0 right-0 top-14 space-y-2 border-b border-slate-800 bg-slate-900 p-4 shadow-2xl shadow-slate-950/50 md:hidden">
            <a href="#platform" className="block text-slate-300 font-medium py-2 border-b border-slate-800" onClick={() => setIsMenuOpen(false)}>Platform</a>
            <a href="#features" className="block text-slate-300 font-medium py-2 border-b border-slate-800" onClick={() => setIsMenuOpen(false)}>Features</a>
            <a href="#programs" className="block text-slate-300 font-medium py-2 border-b border-slate-800" onClick={() => setIsMenuOpen(false)}>Programs</a>
            <a href="#security" className="block text-slate-300 font-medium py-2 border-b border-slate-800" onClick={() => setIsMenuOpen(false)}>Security</a>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <main id="main-content">
      <section id="platform" className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-8 pt-10 sm:pb-12 sm:pt-16 lg:pb-16 lg:pt-24">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6 sm:space-y-8">
              {/* Badge */}
                <div className="inline-flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-[0.18em]">
                  <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
                  <span>Market access for disciplined traders</span>
                </div>

              {/* Main Heading */}
              <div className="space-y-4 sm:space-y-6">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
                  <span className="text-white">A clearer way</span>
                  <br />
                  <span className="relative">
                    <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">to trade markets.</span>
                  </span>
                </h1>
                <p className="text-base sm:text-lg lg:text-xl text-slate-300 leading-relaxed max-w-lg">
                  Explore supported markets with practical tools for analysis, order management, and risk control. Built for decisions, not promises.
                </p>
              </div>

              {/* Key Features */}
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-3 rounded-lg bg-slate-800/60 border border-slate-700 hover:border-cyan-500/50 transition-colors">
                  <BarChart2 className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white text-sm">Forex + Crypto + Metals</span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-3 rounded-lg bg-slate-800/60 border border-slate-700 hover:border-emerald-500/50 transition-colors">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white text-sm">Transparent costs</span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-3 rounded-lg bg-slate-800/60 border border-slate-700 hover:border-blue-500/50 transition-colors">
                  <Lock className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-white text-sm">Protected access</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={() => router.push("/participant/register")}
                  className="group relative w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold shadow-lg hover:shadow-xl hover:shadow-cyan-500/30 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
                >
                  <span className="relative flex items-center justify-center gap-2">Start Trading <ArrowRight className="w-4 h-4" /></span>
                </button>
                <a href="#features" className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-6 py-3 font-bold text-slate-200 transition-all duration-300 hover:bg-slate-700 hover:text-white sm:w-auto sm:px-8 sm:py-4">
                  <TrendingUp className="h-4 w-4" aria-hidden="true" />
                  Explore platform
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-800 pt-5 text-xs text-slate-400">
                <span className="inline-flex items-center gap-2"><Shield className="h-4 w-4 text-cyan-400" /> Risk information before every order</span>
                <span className="inline-flex items-center gap-2"><Lock className="h-4 w-4 text-cyan-400" /> Secure account access</span>
              </div>
            </div>

            {/* Right Content - Live Market Data */}
            <div className="relative hidden lg:flex flex-col gap-4">
              {/* Market Ticker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-black tracking-[0.15em] uppercase text-slate-400">Indicative market view</h3><span className="text-[10px] uppercase tracking-wider text-slate-500">Illustrative</span></div>
                <div className="grid gap-2">
                  {marketPairs.slice(0, 3).map((pair) => (
                    <div key={pair.symbol} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-700 hover:border-cyan-500/50 transition-colors">
                      <div>
                        <p className="font-bold text-white text-sm">{pair.symbol}</p>
                        <p className="text-xs text-slate-400">BID: {pair.bid}</p>
                      </div>
                      <div className="text-right">
                        <p className="price-mono text-sm font-black" style={{ color: pair.trend === 'up' ? '#10b981' : '#ef4444' }}>
                          {pair.change}
                        </p>
                        <div className="text-xs text-slate-400">ASK: {pair.ask}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Avg Spread</p>
                  <p className="text-lg font-bold text-cyan-400 mt-1">Variable</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Max Leverage</p>
                  <p className="text-lg font-bold text-cyan-400 mt-1">Account-based</p>
                </div>
              </div>

              {/* Decorative Element */}
              <div className="mt-4 p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-xs font-bold text-emerald-400 uppercase">Trading workspace</span>
                </div>
                <p className="text-xs text-slate-300">Review your market, size, and risk settings before placing an order.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-24 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Everything You Need <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">to Trade</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">Professional tools built for traders, by traders</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => {
              const Icon = feature.icon
              return (
                <div key={i} className="p-6 rounded-lg bg-slate-800/40 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/60 transition-all duration-300 group">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mb-4 group-hover:from-cyan-500/30 group-hover:to-blue-500/30 transition-colors">
                    <Icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Funded account plans */}
      <section id="programs" className="border-t border-slate-800 bg-slate-900 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Funded account programs</p>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Choose the trading capacity that fits your plan.</h2>
            <p className="mt-4 text-base leading-7 text-slate-400">Review the account size, rules, eligibility, and risk limits before selecting a program. Program availability and terms may vary.</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { name: "Entry", fee: "$50", balance: "$5,000", icon: Sparkles, tone: "from-cyan-500/20 to-blue-500/20" },
              { name: "Starter", fee: "$100", balance: "$10,000", icon: Wallet, tone: "from-blue-500/20 to-indigo-500/20" },
              { name: "Popular", fee: "$250", balance: "$25,000", icon: TrendingUp, tone: "from-cyan-500/30 to-blue-500/30", featured: true },
              { name: "Pro", fee: "$500", balance: "$50,000", icon: Award, tone: "from-amber-500/20 to-orange-500/20" },
              { name: "Advanced", fee: "$1,000", balance: "$100,000", icon: Globe, tone: "from-emerald-500/20 to-cyan-500/20" },
            ].map((plan) => {
              const Icon = plan.icon
              return (
                <div key={plan.name} className={`relative rounded-2xl border p-5 ${plan.featured ? "border-cyan-400/70 bg-slate-800/80 shadow-lg shadow-cyan-500/10" : "border-slate-700 bg-slate-950/60"}`}>
                  {plan.featured && <span className="absolute -top-3 right-4 rounded-full bg-cyan-400 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-950">Most selected</span>}
                  <div className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${plan.tone}`}>
                    <Icon className="h-5 w-5 text-cyan-300" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-white">{plan.name} plan</h3>
                  <p className="mt-4 text-xs uppercase tracking-wider text-slate-500">Program fee</p>
                  <p className="mt-1 text-2xl font-bold text-slate-100">{plan.fee}</p>
                  <div className="my-4 h-px bg-slate-800" />
                  <p className="text-xs uppercase tracking-wider text-slate-500">Trading balance</p>
                  <p className="mt-1 text-2xl font-extrabold text-cyan-300">{plan.balance}</p>
                  <p className="mt-4 text-xs leading-5 text-slate-500">Rules, drawdown limits, and eligibility apply. Review terms before registration.</p>
                  <Link href="/participant/register" className={`mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${plan.featured ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-input bg-background hover:bg-accent hover:text-accent-foreground"}`}>
                    Review program <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Operating principles */}
      <section className="border-t border-slate-800 bg-slate-900 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">A practical operating model</p>
              <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">Built around the decisions that matter.</h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-slate-400">Elite Fund keeps the trading workflow focused: understand the market, define the risk, place the order, and review the result. No performance claims. No shortcuts around risk.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["01", "Prepare", "Review market context, available margin, and the order conditions before you commit capital."],
              ["02", "Control", "Use position sizing, stop-loss and take-profit levels to keep the plan visible while you trade."],
              ["03", "Review", "Track open and closed positions with clear records so every decision can be evaluated."],
            ].map(([number, title, description]) => (
              <div key={number} className="rounded-xl border border-slate-700 bg-slate-950/50 p-6">
                <span className="font-mono text-xs text-cyan-400">{number}</span>
                <h3 className="mt-8 text-xl font-bold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-16 sm:py-24 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Security You Can <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Trust</span>
              </h2>
              <div className="space-y-4">
                {[
                  "Encrypted account sessions",
                  "Verified participant access",
                  "Protected profile controls",
                  "Clear transaction records",
                  "Risk and activity visibility",
                  "Support for account issues",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-emerald-400" />
                    <span className="text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="p-6 rounded-lg bg-slate-800/40 border border-slate-700">
                <Shield className="w-16 h-16 text-cyan-400 mb-4 opacity-60" />
                <h3 className="text-xl font-bold text-white mb-2">Clarity is part of security</h3>
                <p className="text-slate-400 mb-4">We show the important account, order, and risk information in the workflow so you can make informed decisions.</p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded bg-slate-700 px-3 py-1 text-xs text-slate-300">Account controls</span>
                  <span className="rounded bg-slate-700 px-3 py-1 text-xs text-slate-300">Activity records</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-r from-slate-950 to-slate-900 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">Ready to review the platform?</h2>
          <p suppressHydrationWarning className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">Create an account to explore the terminal, available programs, and the rules that apply before you trade.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => router.push("/participant/register")}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-4 text-lg"
            >
              Create Account <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <button
              onClick={() => router.push("/participant/login")}
              className="px-8 py-4 rounded-lg border border-cyan-500/60 bg-slate-900/80 text-cyan-300 font-semibold text-lg hover:bg-cyan-500/10 hover:border-cyan-400 hover:text-white transition-all duration-200 active:scale-95"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950" aria-label="Footer">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.8fr_repeat(4,1fr)] lg:gap-6">
            <div className="max-w-xs">
              <div className="mb-3 flex items-center gap-2.5">
                <FlowChainLogo variant="icon" size="xs" showTagline={false} className="h-8 w-8 rounded-md" />
                <span className="text-base font-bold tracking-tight text-white">ELITE FUND</span>
              </div>
              <p className="text-sm font-semibold leading-6 text-slate-200">Professional trading infrastructure for modern traders.</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">Trade smart. Manage risk. Trade with confidence.</p>
            </div>

            <FooterColumn title="Platform" links={[
              ["Trading Terminal", "/participant/dashboard"],
              ["Trader Dashboard", "/participant/dashboard"],
              ["API Docs", "/privacy"],
              ["Mobile App", "/participant/dashboard"],
            ]} />
            <FooterColumn title="For Traders" links={[
              ["How It Works", "#features"],
              ["Programs", "#programs"],
              ["Payouts", "/participant/dashboard/payout"],
              ["FAQ", "/lending"],
              ["Affiliate", "/participant/dashboard/refer"],
            ]} />
            <FooterColumn title="Company" links={[
              ["About Us", "#security"],
              ["Contact", "/participant/dashboard/settings/help"],
              ["Help Center", "/participant/dashboard/settings/help"],
              ["Blog", "/lending"],
              ["Careers", "/participant/register"],
            ]} />
            <FooterColumn title="Legal" links={[
              ["Terms", "/terms"],
              ["Privacy", "/privacy"],
              ["Risk Disclosure", "/terms"],
              ["AML/KYC", "/privacy"],
              ["Cookies", "/cookies"],
            ]} />
          </div>

          <div className="flex flex-col gap-3 border-y border-slate-800 py-4 text-xs md:flex-row md:items-center md:justify-between" role="note">
            <div className="flex items-start gap-2.5 text-slate-400">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              <p><span className="font-semibold text-amber-300">Risk disclosure:</span> Trading involves significant risk. Past performance does not guarantee future results.</p>
            </div>
            <Link href="/terms" className="shrink-0 font-semibold text-slate-300 transition hover:text-white">Read terms</Link>
          </div>

          <div className="flex flex-col gap-3 py-4 text-xs sm:flex-row sm:items-center sm:justify-between">
            <p className="text-slate-500">© 2026 Elite Fund. All rights reserved.</p>
            <div className="flex items-center gap-4 text-slate-400">
              <a href="#" aria-label="Elite Fund on X" className="font-semibold transition hover:text-white">X</a>
              <a href="#" aria-label="Elite Fund on Discord" className="inline-flex items-center gap-1.5 transition hover:text-white"><MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />Discord</a>
              <a href="#" aria-label="Elite Fund on Telegram" className="inline-flex items-center gap-1.5 transition hover:text-white"><Send className="h-3.5 w-3.5" aria-hidden="true" />Telegram</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
