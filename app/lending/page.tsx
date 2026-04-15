"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TrendingUp,
  DollarSign,
  Target,
  Zap,
  ArrowRight,
  CheckCircle2,
  Wallet,
  BarChart3,
  Rocket,
  Lock,
  Shield,
  Users,
} from "lucide-react"

export default function LendingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-emerald-500/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            FlowChain Lending
          </div>
          <Link href="/">
            <Button variant="outline" className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10">
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section with Image */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
              <Rocket className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-300">Next-Gen P2P Lending</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
              Earn <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">250%+</span> Annual
              Returns
            </h1>

            <p className="text-xl text-slate-300">
              Binary trading with peer-to-peer lending. Maximize your profits through automated matching and real-time trading opportunities.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/participant/register">
                <Button className="w-full sm:w-auto h-12 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold text-lg">
                  Start Trading Now
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button variant="outline" className="w-full sm:w-auto h-12 border-emerald-500/50 text-emerald-400">
                Learn More
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-8">
              <div>
                <div className="text-3xl font-bold text-emerald-400">$2.5M+</div>
                <p className="text-sm text-slate-400">Total Traded</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-cyan-400">50K+</div>
                <p className="text-sm text-slate-400">Active Traders</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 rounded-3xl blur-2xl animate-pulse" />
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-2xl" />
            <Image
              src="/images/binary-profit-burst.jpg"
              alt="Binary Trading Profit Burst"
              width={600}
              height={520}
              className="relative rounded-2xl shadow-[0_0_60px_rgba(16,185,129,0.4)] border-2 border-emerald-500/50 w-full"
              priority
            />
            {/* Floating stat badges */}
            <div className="absolute -top-4 -left-4 bg-emerald-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg animate-bounce">
              +340% Today
            </div>
            <div className="absolute -bottom-4 -right-4 bg-cyan-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
              Live Trades Active
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent to-emerald-900/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Why FlowChain Lending?</h2>
            <p className="text-xl text-slate-300">Unlock financial freedom with our revolutionary platform</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingUp,
                title: "High Returns",
                desc: "Earn up to 250% APY with automated matching and binary trading strategies",
              },
              {
                icon: BarChart3,
                title: "Real-Time Analytics",
                desc: "Advanced dashboard with live trading metrics and performance tracking",
              },
              {
                icon: Zap,
                title: "Instant Matching",
                desc: "AI-powered automatch system connects lenders with borrowers in seconds",
              },
              {
                icon: Shield,
                title: "Secure Platform",
                desc: "Bank-level security with encrypted transactions and smart contracts",
              },
              {
                icon: Lock,
                title: "Your Control",
                desc: "Full custody of your assets with transparent, trustless operations",
              },
              {
                icon: Users,
                title: "Community Driven",
                desc: "Join 50,000+ traders earning passive income daily",
              },
            ].map((feature, i) => {
              const Icon = feature.icon
              return (
                <Card
                  key={i}
                  className="bg-slate-800/50 border-emerald-500/20 hover:border-emerald-500/50 transition-all duration-300 group"
                >
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center group-hover:from-emerald-500/40 group-hover:to-cyan-500/40 transition-all">
                      <Icon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <CardTitle className="text-white mt-4">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-300">{feature.desc}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Full-width Binary Trading Signal Banner */}
      <section className="py-0 relative overflow-hidden">
        <div className="relative h-[420px] w-full">
          <Image
            src="/images/trading-profit-signal.jpg"
            alt="Binary Trading Profit Signal"
            fill
            className="object-cover object-center"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent" />
          <div className="absolute inset-0 flex items-center px-8 md:px-24">
            <div className="max-w-xl space-y-5">
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/40 px-4 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-emerald-300 text-sm font-medium">Live Binary Signals Active</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
                Real-Time <span className="text-emerald-400">Winning</span> Trade Signals
              </h2>
              <p className="text-slate-300 text-lg">
                Our AI monitors 500+ trading pairs and fires profit signals the moment an opportunity emerges.
              </p>
              <div className="flex gap-6">
                <div>
                  <div className="text-3xl font-bold text-emerald-400">94%</div>
                  <div className="text-slate-400 text-sm">Win Rate</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-cyan-400">$12K</div>
                  <div className="text-slate-400 text-sm">Avg Daily Profit</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-yellow-400">+340%</div>
                  <div className="text-slate-400 text-sm">This Week</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Profit Showcase Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="relative order-2 md:order-1">
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 rounded-3xl blur-2xl" />
            <Image
              src="/images/lending-profit-showcase.jpg"
              alt="Lending Profit Showcase"
              width={580}
              height={520}
              className="relative rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.3)] border-2 border-cyan-500/40 w-full"
            />
            <div className="absolute -top-3 -right-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              300% APY
            </div>
          </div>

          <div className="space-y-8 order-1 md:order-2">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Watch Your <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Wealth Grow</span>
            </h2>

            <p className="text-lg text-slate-300">
              Our automated P2P lending system matches your contributions with profitable lending opportunities, generating compounding returns.
            </p>

            {[
              "300% average APY returns",
              "Automated daily profit distributions",
              "Zero management fees",
              "Instant withdrawal capabilities",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold">{item}</p>
                </div>
              </div>
            ))}

            <Link href="/participant/dashboard/payout">
              <Button className="w-full h-12 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white font-semibold text-base">
                Request a Payout
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trading Analytics Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-emerald-900/20 to-transparent">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Advanced <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Trading Analytics</span>
            </h2>

            <p className="text-lg text-slate-300">
              Real-time dashboard with professional-grade analytics. Track every trade, monitor portfolio performance, and optimize your strategy.
            </p>

            {[
              "Live market data and predictions",
              "Automated trading bot integration",
              "Portfolio diversification tools",
              "Risk management controls",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold">{item}</p>
                </div>
              </div>
            ))}

            <Link href="/participant/dashboard/predict">
              <Button className="w-full h-12 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold text-base">
                View Dashboard
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/25 to-cyan-500/25 rounded-3xl blur-2xl" />
            <Image
              src="/images/trading-analytics-dashboard.jpg"
              alt="Trading Analytics Dashboard"
              width={580}
              height={520}
              className="relative rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.35)] border-2 border-emerald-500/40 w-full"
            />
            <div className="absolute -bottom-3 -left-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              Live Analytics
            </div>
          </div>
        </div>
      </section>

      {/* Passive Income Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/25 to-yellow-500/15 rounded-3xl blur-2xl" />
            <Image
              src="/images/p2p-lending-wealth.jpg"
              alt="P2P Lending Wealth Network"
              width={580}
              height={520}
              className="relative rounded-2xl shadow-[0_0_50px_rgba(234,179,8,0.25)] border-2 border-yellow-500/30 w-full"
            />
            <div className="absolute -top-3 -left-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              $500K+ Earned
            </div>
          </div>

          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Build <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Passive Income</span> Today
            </h2>

            <p className="text-lg text-slate-300">
              Start with as little as $10 and watch your investment compound. Our P2P lending model ensures continuous returns even while you sleep.
            </p>

            <div className="space-y-4">
              <div className="bg-slate-800/50 border border-emerald-500/20 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300">Monthly Return</span>
                  <span className="text-2xl font-bold text-emerald-400">+21.5%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2 rounded-full w-1/2" />
                </div>
              </div>

              <div className="bg-slate-800/50 border border-cyan-500/20 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300">Annual Return</span>
                  <span className="text-2xl font-bold text-cyan-400">+258%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-2 rounded-full w-3/4" />
                </div>
              </div>
            </div>

            <Link href="/participant/register">
              <Button className="w-full h-12 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold text-base">
                Create Your Account
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-emerald-900/40 to-cyan-900/40 border-y border-emerald-500/20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8 text-center">
          {[
            { label: "Total Volume", value: "$2.5M+" },
            { label: "Active Traders", value: "50K+" },
            { label: "Avg APY", value: "250%+" },
            { label: "Daily Earnings", value: "$500K+" },
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <p className="text-slate-300">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Full-width Binary Trading Immersive Banner */}
      <section className="relative overflow-hidden">
        <div className="relative h-[500px] w-full">
          <Image
            src="/images/binary-trading-hero.jpg"
            alt="Binary Trading Action"
            fill
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-slate-900/80" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <div className="inline-flex items-center gap-2 bg-yellow-500/20 border border-yellow-400/40 px-5 py-2 rounded-full mb-6">
              <TrendingUp className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-300 text-sm font-semibold">Binary Trading Platform</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-extrabold text-white mb-4 drop-shadow-2xl">
              Trade. Win. <span className="text-emerald-400">Repeat.</span>
            </h2>
            <p className="text-xl text-slate-200 max-w-2xl mb-10 drop-shadow">
              Every second counts in binary trading. Our platform puts you ahead with AI-powered signals and instant execution.
            </p>
            <div className="flex flex-wrap gap-6 justify-center">
              {[
                { label: "Win Rate", value: "94%" },
                { label: "Active Traders", value: "50K+" },
                { label: "Trades Today", value: "1.2M+" },
                { label: "Paid Out", value: "$2.5M+" },
              ].map((s, i) => (
                <div key={i} className="bg-slate-900/70 border border-emerald-500/30 backdrop-blur-sm rounded-xl px-6 py-4 text-center">
                  <div className="text-3xl font-bold text-emerald-400">{s.value}</div>
                  <div className="text-slate-400 text-sm mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Ready to <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Multiply Your Wealth?</span>
          </h2>

          <p className="text-xl text-slate-300">Join thousands of successful traders earning 250%+ annual returns with FlowChain Lending</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link href="/participant/register" className="flex-1 sm:flex-none">
              <Button className="w-full sm:w-auto h-14 px-8 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold text-lg">
                Start Now - It's Free
                <Rocket className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/" className="flex-1 sm:flex-none">
              <Button variant="outline" className="w-full sm:w-auto h-14 px-8 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 font-semibold text-lg">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-slate-700/50 bg-slate-900">
        <div className="max-w-6xl mx-auto text-center text-slate-400">
          <p>&copy; 2024 FlowChain. All rights reserved. | Secure • Transparent • Profitable</p>
        </div>
      </footer>
    </div>
  )
}
