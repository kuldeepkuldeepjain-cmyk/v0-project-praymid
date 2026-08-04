"use client"

import type React from "react"
import { useRouter } from "next/navigation"
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
} from "lucide-react"
import { useState } from "react"
import { LearnMoreDialog } from "@/components/learn-more-dialog"
import { AIChatbotDialog } from "@/components/ai-chatbot-dialog"

export default function LandingPage() {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeTradingTab, setActiveTradingTab] = useState("forex")

  // Live market data sample
  const marketPairs = [
    { symbol: "EUR/USD", bid: "1.0850", ask: "1.0852", change: "+0.45%", trend: "up" },
    { symbol: "GBP/USD", bid: "1.2780", ask: "1.2782", change: "+1.12%", trend: "up" },
    { symbol: "USD/JPY", bid: "149.45", ask: "149.47", change: "-0.23%", trend: "down" },
    { symbol: "BTC/USD", bid: "62855", ask: "62862", change: "+2.15%", trend: "up" },
    { symbol: "ETH/USD", bid: "2450", ask: "2452", change: "+1.85%", trend: "up" },
    { symbol: "XAU/USD", bid: "2385.50", ask: "2385.70", change: "+0.12%", trend: "up" },
  ]

  const features = [
    {
      icon: CandlestickChart,
      title: "Professional Charts",
      description: "Real-time candlestick charts with 6 timeframes (1M, 5M, 15M, 1H, 4H, 1D)"
    },
    {
      icon: BarChart2,
      title: "Multiple Assets",
      description: "Trade Forex, Commodities, Crypto all in one platform"
    },
    {
      icon: Zap,
      title: "Instant Execution",
      description: "Sub-second order execution with tight spreads"
    },
    {
      icon: Lock,
      title: "Bank Security",
      description: "Enterprise-grade encryption and fund protection"
    },
    {
      icon: Wallet,
      title: "Leverage Trading",
      description: "Trade with up to 500x leverage (use responsibly)"
    },
    {
      icon: Users,
      title: "Live Community",
      description: "Join 15,000+ active traders 24/7"
    },
  ]

  const testimonials = [
    {
      name: "Arjun Patel",
      role: "Professional Trader",
      text: "The terminal is professional-grade. I switched from TradingView and never looked back!",
      avatar: "👨",
    },
    {
      name: "Wei Chen",
      role: "Day Trader",
      text: "Fastest execution I've ever seen. The charting tools are incredible and fees are transparent.",
      avatar: "👨",
    },
    {
      name: "Neha Gupta",
      role: "Swing Trader",
      text: "Finally, a platform that treats retail traders with the same tools as institutions.",
      avatar: "👩",
    },
    {
      name: "Ahmed Khan",
      role: "Forex Specialist",
      text: "The spread on EUR/USD is amazing. This is the future of retail forex trading.",
      avatar: "👨",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-x-hidden text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CandlestickChart className="w-6 h-6 text-cyan-400" />
            <span className="font-bold text-lg sm:text-xl bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              FlowChain Trading
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#platform" className="text-slate-300 hover:text-white font-medium text-sm transition-colors">Platform</a>
            <a href="#features" className="text-slate-300 hover:text-white font-medium text-sm transition-colors">Features</a>
            <a href="#security" className="text-slate-300 hover:text-white font-medium text-sm transition-colors">Security</a>
          </div>

          <div className="hidden md:flex gap-3">
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
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1">
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden absolute top-14 left-0 right-0 bg-slate-900 border-b border-slate-800 p-4 space-y-2">
            <a href="#platform" className="block text-slate-300 font-medium py-2 border-b border-slate-800" onClick={() => setIsMenuOpen(false)}>Platform</a>
            <a href="#features" className="block text-slate-300 font-medium py-2 border-b border-slate-800" onClick={() => setIsMenuOpen(false)}>Features</a>
            <a href="#security" className="block text-slate-300 font-medium py-2" onClick={() => setIsMenuOpen(false)}>Security</a>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="platform" className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden pt-10 sm:pt-16 lg:pt-24 pb-8 sm:pb-12">
        {/* Ambient background */}
        <div className="absolute top-20 right-[10%] w-48 sm:w-72 h-48 sm:h-72 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-transparent rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-20 left-[5%] w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-tr from-blue-500/10 via-cyan-500/10 to-transparent rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '-5s' }}></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6 sm:space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span>LIVE TRADING • PROFESSIONAL PLATFORM</span>
              </div>

              {/* Main Heading */}
              <div className="space-y-4 sm:space-y-6">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
                  <span className="text-white">Trade Forex</span>
                  <br />
                  <span className="relative">
                    <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Like a Pro</span>
                  </span>
                </h1>
                <p className="text-base sm:text-lg lg:text-xl text-slate-300 leading-relaxed max-w-lg">
                  Access real-time forex, commodities, and crypto markets with professional trading tools, zero fees, and instant execution.
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
                  <span className="font-bold text-white text-sm">0% Fees</span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-3 rounded-lg bg-slate-800/60 border border-slate-700 hover:border-blue-500/50 transition-colors">
                  <Lock className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-white text-sm">Bank Security</span>
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
                <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold flex items-center justify-center gap-2 transition-all duration-300">
                  <TrendingUp className="w-4 h-4" />
                  View Platform
                </button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 border-2 border-slate-800 flex items-center justify-center text-white text-xs font-bold">
                      {i}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-slate-100 font-semibold text-sm sm:text-base">15,243 active traders</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="text-xs text-slate-400">Trading 24/7</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content - Live Market Data */}
            <div className="relative hidden lg:flex flex-col gap-4">
              {/* Market Ticker */}
              <div className="space-y-2">
                <h3 className="text-sm font-black tracking-[0.15em] uppercase text-slate-400">Live Market Data</h3>
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
                  <p className="text-lg font-bold text-cyan-400 mt-1">0.2 pips</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Max Leverage</p>
                  <p className="text-lg font-bold text-cyan-400 mt-1">500:1</p>
                </div>
              </div>

              {/* Decorative Element */}
              <div className="mt-4 p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-xs font-bold text-emerald-400 uppercase">Platform Status</span>
                </div>
                <p className="text-xs text-slate-300">All systems operational. Ready to trade.</p>
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

      {/* Testimonials Section */}
      <section className="py-16 sm:py-24 bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Loved by <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Traders</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="p-6 rounded-lg bg-slate-800/40 border border-slate-700 hover:border-cyan-500/50 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl">{testimonial.avatar}</div>
                  <div>
                    <p className="font-bold text-white text-sm">{testimonial.name}</p>
                    <p className="text-xs text-slate-400">{testimonial.role}</p>
                  </div>
                </div>
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-amber-400">★</span>
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">"{testimonial.text}"</p>
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
                  "Enterprise-grade SSL encryption",
                  "Cold wallet fund storage",
                  "Multi-signature authentication",
                  "Real-time fraud monitoring",
                  "Segregated client accounts",
                  "Regular security audits",
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
                <h3 className="text-xl font-bold text-white mb-2">Regulatory Compliance</h3>
                <p className="text-slate-400 mb-4">Operating under strict regulatory oversight with transparent practices and client protection protocols.</p>
                <div className="flex gap-2">
                  <span className="px-3 py-1 rounded bg-slate-700 text-xs text-slate-300">ISO 27001</span>
                  <span className="px-3 py-1 rounded bg-slate-700 text-xs text-slate-300">SOC 2 Type II</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-r from-slate-950 to-slate-900 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">Ready to Start Trading?</h2>
          <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">Join thousands of traders on FlowChain. Get $50 bonus on your first deposit.</p>
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

      {/* Footer */}
      <footer className="py-12 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CandlestickChart className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-white">FlowChain Trading</span>
              </div>
              <p className="text-slate-400 text-sm">Professional forex trading platform for everyone.</p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">Trading Terminal</a></li>
                <li><a href="#" className="hover:text-white transition">API Docs</a></li>
                <li><a href="#" className="hover:text-white transition">Mobile App</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-slate-400 text-sm">© 2024 FlowChain Trading. All rights reserved.</p>
            <div className="flex gap-4 mt-4 sm:mt-0">
              <a href="#" className="text-slate-400 hover:text-white transition">Twitter</a>
              <a href="#" className="text-slate-400 hover:text-white transition">Discord</a>
              <a href="#" className="text-slate-400 hover:text-white transition">Github</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
