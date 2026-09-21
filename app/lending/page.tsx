"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { FlowChainLogo } from "@/components/flowchain-logo"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TrendingUp,
  DollarSign,
  Target,
  Zap,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Rocket,
  Lock,
  Shield,
  Users,
  MessageCircle,
} from "lucide-react"

export default function LendingPage() {
  return (
    <div className="lending-page min-h-screen bg-slate-950 text-slate-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-blue-500/20">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="flex items-center gap-2">
              <FlowChainLogo variant="icon" size="xs" showTagline={false} className="h-9 w-9 rounded-lg" />
              <div className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                Elite Fund
              </div>
            </div>
          </div>
          <Link href="/">
            <Button variant="outline" className="text-xs sm:text-sm border-blue-500/50 text-blue-400 hover:bg-blue-500/10 h-9 sm:h-10">
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section with Image */}
      <section className="pt-20 sm:pt-32 pb-12 sm:pb-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div className="space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full text-xs sm:text-sm">
              <Rocket className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
              <span className="text-blue-300">Next-Gen P2P Lending</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Earn <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">250%+</span> Annual
              Returns
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-slate-300">
              Binary trading with peer-to-peer lending. Maximize your profits through automated matching and real-time trading opportunities.
            </p>

            <div className="flex flex-col gap-3 pt-2 sm:pt-4">
              <Link href="/participant/register" className="w-full">
                <Button className="w-full h-11 sm:h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold text-base sm:text-lg">
                  Start Trading Now
                  <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 sm:pt-8">
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-blue-400">$2.5M+</div>
                <p className="text-xs sm:text-sm text-slate-400">Total Traded</p>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-cyan-400">50K+</div>
                <p className="text-xs sm:text-sm text-slate-400">Active Traders</p>
              </div>
            </div>
          </div>

          <div className="relative hidden md:block">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/30 to-cyan-500/30 rounded-3xl blur-2xl animate-pulse" />
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl" />
            <Image
              src="/images/binary-profit-burst.jpg"
              alt="Binary Trading Profit Burst"
              width={600}
              height={520}
              className="relative rounded-2xl shadow-[0_0_60px_rgba(37,99,235,0.4)] border-2 border-blue-500/50 w-full"
              priority
            />
            {/* Floating stat badges */}
            <div className="absolute -top-4 -left-4 bg-blue-500 text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-lg animate-bounce">
              +340% Today
            </div>
            <div className="absolute -bottom-4 -right-4 bg-cyan-500 text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-lg">
              Live Trades Active
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-20 px-4 bg-gradient-to-b from-transparent to-blue-900/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-4">Why Elite Fund?</h2>
            <p className="text-sm sm:text-base md:text-xl text-slate-300">Unlock financial freedom with our revolutionary platform</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
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
                  className="bg-slate-800/50 border-blue-500/20 hover:border-blue-500/50 transition-all duration-300 group"
                >
                  <CardHeader>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center group-hover:from-blue-500/40 group-hover:to-cyan-500/40 transition-all">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                    </div>
                    <CardTitle className="text-white mt-3 sm:mt-4 text-base sm:text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-300 text-sm sm:text-base">{feature.desc}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Full-width Binary Trading Signal Banner */}
      <section className="py-0 relative overflow-hidden">
        <div className="relative h-64 sm:h-80 md:h-96 lg:h-[420px] w-full">
          <Image
            src="/images/trading-profit-signal.jpg"
            alt="Binary Trading Profit Signal"
            fill
            className="object-cover object-center"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent" />
          <div className="absolute inset-0 flex items-center px-4 sm:px-8 md:px-12 lg:px-24">
            <div className="max-w-xl space-y-3 sm:space-y-5">
              <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/40 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-blue-300 text-xs sm:text-sm font-medium">Live Binary Signals Active</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
                Real-Time <span className="text-blue-400">Winning</span> Trade Signals
              </h2>
              <p className="text-slate-300 text-sm sm:text-base md:text-lg">
                Our AI monitors 500+ trading pairs and fires profit signals the moment an opportunity emerges.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-blue-400">94%</div>
                  <div className="text-slate-400 text-xs sm:text-sm">Win Rate</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-cyan-400">$12K</div>
                  <div className="text-slate-400 text-xs sm:text-sm">Avg Daily Profit</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-yellow-400">+340%</div>
                  <div className="text-slate-400 text-xs sm:text-sm">This Week</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Profit Showcase Section */}
      <section className="py-12 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div className="relative order-2 md:order-1 hidden md:block">
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-3xl blur-2xl" />
            <Image
              src="/images/lending-profit-showcase.jpg"
              alt="Lending Profit Showcase"
              width={580}
              height={520}
              className="relative rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.3)] border-2 border-cyan-500/40 w-full"
            />
            <div className="absolute -top-3 -right-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg">
              300% APY
            </div>
          </div>

          <div className="space-y-6 sm:space-y-8 order-1 md:order-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white">
              Watch Your <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Wealth Grow</span>
            </h2>

            <p className="text-base sm:text-lg text-slate-300">
              Our automated P2P lending system matches your contributions with profitable lending opportunities, generating compounding returns.
            </p>

            {[
              "300% average APY returns",
              "Automated daily profit distributions",
              "Zero management fees",
              "Instant withdrawal capabilities",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 sm:gap-4">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold text-sm sm:text-base">{item}</p>
                </div>
              </div>
            ))}

            <Link href="/participant/dashboard/payout" className="block">
              <Button className="w-full h-11 sm:h-12 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold text-base">
                Request a Payout
                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trading Analytics Section */}
      <section className="py-12 sm:py-20 px-4 bg-gradient-to-b from-blue-900/20 to-transparent">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div className="space-y-6 sm:space-y-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white">
              Advanced <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Trading Analytics</span>
            </h2>

            <p className="text-base sm:text-lg text-slate-300">
              Real-time dashboard with professional-grade analytics. Track every trade, monitor portfolio performance, and optimize your strategy.
            </p>

            {[
              "Live market data and predictions",
              "Automated trading bot integration",
              "Portfolio diversification tools",
              "Risk management controls",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 sm:gap-4">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold text-sm sm:text-base">{item}</p>
                </div>
              </div>
            ))}

            <Link href="/participant/dashboard/predict" className="block">
              <Button className="w-full h-11 sm:h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold text-base">
                View Dashboard
                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
          </div>

          <div className="relative hidden md:block">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/25 to-cyan-500/25 rounded-3xl blur-2xl" />
            <Image
              src="/images/trading-analytics-dashboard.jpg"
              alt="Trading Analytics Dashboard"
              width={580}
              height={520}
              className="relative rounded-2xl shadow-[0_0_50px_rgba(37,99,235,0.35)] border-2 border-blue-500/40 w-full"
            />
            <div className="absolute -bottom-3 -left-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg">
              Live Analytics
            </div>
          </div>
        </div>
      </section>

      {/* Passive Income Section */}
      <section className="py-12 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div className="relative hidden md:block">
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/25 to-yellow-500/15 rounded-3xl blur-2xl" />
            <Image
              src="/images/p2p-lending-wealth.jpg"
              alt="P2P Lending Wealth Network"
              width={580}
              height={520}
              className="relative rounded-2xl shadow-[0_0_50px_rgba(234,179,8,0.25)] border-2 border-yellow-500/30 w-full"
            />
            <div className="absolute -top-3 -left-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg">
              $500K+ Earned
            </div>
          </div>

          <div className="space-y-6 sm:space-y-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white">
              Build <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Passive Income</span> Today
            </h2>

            <p className="text-base sm:text-lg text-slate-300">
              Start with as little as $10 and watch your investment compound. Our P2P lending model ensures continuous returns even while you sleep.
            </p>

            <div className="space-y-3 sm:space-y-4">
              <div className="bg-slate-800/50 border border-blue-500/20 rounded-lg p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 text-sm sm:text-base">Monthly Return</span>
                  <span className="text-xl sm:text-2xl font-bold text-blue-400">+21.5%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full w-1/2" />
                </div>
              </div>

              <div className="bg-slate-800/50 border border-cyan-500/20 rounded-lg p-4 sm:p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 text-sm sm:text-base">Annual Return</span>
                  <span className="text-xl sm:text-2xl font-bold text-cyan-400">+258%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full w-3/4" />
                </div>
              </div>
            </div>

            <Link href="/participant/register" className="block">
              <Button className="w-full h-11 sm:h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold text-base">
                Create Your Account
                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-20 px-4 bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border-y border-blue-500/20">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 text-center">
          {[
            { label: "Total Volume", value: "$2.5M+" },
            { label: "Active Traders", value: "50K+" },
            { label: "Avg APY", value: "250%+" },
            { label: "Daily Earnings", value: "$500K+" },
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-1 sm:mb-2">
                {stat.value}
              </div>
              <p className="text-slate-300 text-xs sm:text-sm md:text-base">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Full-width Binary Trading Immersive Banner */}
      <section className="relative overflow-hidden">
        <div className="relative h-64 sm:h-96 md:h-[500px] w-full">
          <Image
            src="/images/binary-trading-hero.jpg"
            alt="Binary Trading Action"
            fill
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-slate-900/80" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <div className="inline-flex items-center gap-2 bg-yellow-500/20 border border-yellow-400/40 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full mb-3 sm:mb-6">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
              <span className="text-yellow-300 text-xs sm:text-sm font-semibold">Binary Trading Platform</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold text-white mb-2 sm:mb-4 drop-shadow-2xl leading-tight">
              Trade. Win. <span className="text-blue-400">Repeat.</span>
            </h2>
            <p className="text-sm sm:text-base md:text-xl text-slate-200 max-w-2xl mb-6 sm:mb-10 drop-shadow px-2">
              Every second counts in binary trading. Our platform puts you ahead with AI-powered signals and instant execution.
            </p>
            <div className="flex flex-wrap gap-3 sm:gap-6 justify-center px-2">
              {[
                { label: "Win Rate", value: "94%" },
                { label: "Active Traders", value: "50K+" },
                { label: "Trades Today", value: "1.2M+" },
                { label: "Paid Out", value: "$2.5M+" },
              ].map((s, i) => (
                <div key={i} className="bg-slate-900/70 border border-blue-500/30 backdrop-blur-sm rounded-lg sm:rounded-xl px-3 sm:px-6 py-2 sm:py-4 text-center">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-400">{s.value}</div>
                  <div className="text-slate-400 text-xs sm:text-sm mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Support & Guidance Section */}
      <section className="py-8 sm:py-12 px-4 bg-gradient-to-r from-blue-900/30 to-cyan-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="bg-slate-800/60 border border-blue-500/30 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                  Need Support & Guidance?
                </h3>
                <p className="text-sm sm:text-base text-slate-300">Connect with our expert team on WhatsApp for instant assistance and personalized guidance</p>
              </div>
              <a
                href="https://wa.me/237651528626"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0"
              >
                <Button className="h-11 sm:h-12 px-4 sm:px-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold text-sm sm:text-base flex items-center gap-2 shadow-lg hover:shadow-xl transition-all">
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  Chat on WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white">
            Ready to <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Multiply Your Wealth?</span>
          </h2>

          <p className="text-base sm:text-lg md:text-xl text-slate-300">Join thousands of successful traders building their future with Elite Fund</p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4 sm:pt-8">
            <Link href="/participant/register" className="flex-1 sm:flex-none">
              <Button className="w-full sm:w-auto h-11 sm:h-14 px-6 sm:px-8 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold text-base sm:text-lg">
                Start Now - It's Free
                <Rocket className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
            <Link href="/" className="flex-1 sm:flex-none">
              <Button variant="outline" className="w-full sm:w-auto h-11 sm:h-14 px-6 sm:px-8 border-blue-500/50 text-blue-400 hover:bg-blue-500/10 font-semibold text-base sm:text-lg">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Floating WhatsApp Support Button */}
      <a
        href="https://wa.me/237651528626"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full flex items-center justify-center shadow-2xl hover:shadow-green-500/50 transition-all duration-300 hover:scale-110 group"
        title="Chat with us on WhatsApp"
      >
        <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-12 right-0 bg-slate-900 text-white text-xs sm:text-sm px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          +237 651 528 626
        </span>
      </a>

      {/* Footer */}
      <footer className="lending-footer border-t border-slate-800 bg-slate-950 px-4 pt-12 sm:pt-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 border-b border-slate-800 pb-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <FlowChainLogo variant="icon" size="xs" showTagline={false} className="h-9 w-9 rounded-lg" />
                <div>
                  <p className="text-base font-bold tracking-tight text-white">Elite Fund</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400">Built for disciplined growth</p>
                </div>
              </div>
              <p className="max-w-sm text-sm leading-6 text-slate-400">A member-first financial platform for transparent participation, managed opportunities, and clear account reporting.</p>
              <div className="flex items-center gap-2 text-xs text-emerald-300"><Shield className="h-4 w-4" /> Secure account access and encrypted data</div>
            </div>
            <div>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-200">Platform</h3>
              <div className="grid gap-3 text-sm text-slate-400"><Link className="hover:text-cyan-300" href="/lending">Lending overview</Link><Link className="hover:text-cyan-300" href="/participant/register">Create an account</Link><Link className="hover:text-cyan-300" href="/participant/login">Member login</Link><Link className="hover:text-cyan-300" href="/participant/dashboard">Member dashboard</Link></div>
            </div>
            <div>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-200">Company</h3>
              <div className="grid gap-3 text-sm text-slate-400"><Link className="hover:text-cyan-300" href="/">About Elite Fund</Link><a className="hover:text-cyan-300" href="https://wa.me/237651528626" target="_blank" rel="noopener noreferrer">Contact support</a><Link className="hover:text-cyan-300" href="/leaderboard">Community leaderboard</Link><Link className="hover:text-cyan-300" href="/terms">Terms of Use</Link><Link className="hover:text-cyan-300" href="/privacy">Privacy Policy</Link><Link className="hover:text-cyan-300" href="/cookies">Cookie Policy</Link><a className="hover:text-cyan-300" href="mailto:admin@elitefund.sbs">admin@elitefund.sbs</a><a className="hover:text-cyan-300" href="mailto:admin@elitefund.sbs">admin@elitefund.sbs</a><a className="hover:text-cyan-300" href="mailto:admin@elitefund.sbs">admin@elitefund.sbs</a><span>Cameroon · Online platform</span><a className="hover:text-cyan-300" href="mailto:admin@elitefund.sbs">admin@elitefund.sbs</a></div>
            </div>
            <div>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-200">Member support</h3>
              <p className="mb-4 text-sm leading-6 text-slate-400">Questions about your account, funding, or withdrawals? Our team is available through WhatsApp and email.</p>
              <div className="mb-4 grid gap-2 text-xs">
                <a className="text-cyan-300 hover:text-cyan-200" href="mailto:support@elitefund.sbs">support@elitefund.sbs</a>
                <a className="text-slate-400 hover:text-slate-200" href="mailto:help@elitefund.sbs">help@elitefund.sbs</a>
              </div>
              <a href="https://wa.me/237651528626" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-400/20"><MessageCircle className="h-4 w-4" /> Chat with support</a>
            </div>
          </div>
          <div className="flex flex-col gap-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-start sm:justify-between">
            <p>&copy; 2026 Elite Fund. All rights reserved.</p>
            <p className="max-w-xl leading-5 sm:text-right">Risk notice: returns are not guaranteed. Participation involves financial risk. Review the terms of each opportunity and only contribute funds you can afford to commit.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
