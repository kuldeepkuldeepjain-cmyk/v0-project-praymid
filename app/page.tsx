"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FlowChainLogo } from "@/components/flowchain-logo"
import {
  ArrowRight,
  Gift,
  Zap,
  Shield,
  Users,
  Wallet,
  Check,
  Award,
  Menu,
  X,
  Sparkles,
  TrendingUp,
  Lock,
  Flame,
  Star,
  Crown,
  Globe,
  BarChart3,
  MessageCircle,
} from "lucide-react"
import { useState } from "react"
import { LearnMoreDialog } from "@/components/learn-more-dialog"
import { AIChatbotDialog } from "@/components/ai-chatbot-dialog"
import { AnimatedSphere } from "@/components/animated-sphere"

export default function LandingPage() {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  const rewards = [
    { icon: "🎁", amount: "$50", label: "BONUS", color: "from-orange-100 to-red-100" },
    { icon: "⚙️", multiplier: "5x", label: "REWARD", color: "from-pink-100 to-purple-100" },
    { icon: "🎡", multiplier: "20x", label: "REWARD", color: "from-amber-100 to-orange-100", featured: true },
    { icon: "⚙️", multiplier: "10x", label: "REWARD", color: "from-purple-100 to-pink-100" },
    { icon: "👑", label: "GOLD RANK", color: "from-yellow-100 to-amber-100" },
  ]

  const stats = [
    { icon: "🎁", title: "Bonuses Unlocked Today", value: "$145,230 USDT", growth: "15.6%" },
    { icon: "⚙️", title: "Spins Activated Today", value: "9,842", growth: "12.8%" },
    { icon: "👥", title: "New Members Today", value: "3,257", growth: "18.3%" },
    { icon: "💰", title: "Rewards Distributed Today", value: "$2,984,520 USDT", growth: "16.7%" },
  ]

  const benefits = [
    { icon: "0%", title: "Zero Fees", desc: "Keep 100% of your rewards." },
    { icon: "🎁", title: "Instant Bonuses", desc: "Get bonus on every contribution." },
    { icon: "⚙️", title: "Up To 20x Rewards", desc: "Higher rewards, bigger growth." },
    { icon: "👑", title: "Rank Benefits", desc: "Exclusive perks as you level up." },
    { icon: "🌍", title: "Global Community", desc: "Join members worldwide." },
  ]

  const journey = [
    { num: "1", title: "Create Account", desc: "Sign up in 30 seconds and join the community" },
    { num: "2", title: "Get $50 USDT Bonus", desc: "Instant bonus on your first contribution" },
    { num: "3", title: "Spin The Wheel", desc: "Spin and win up to 20x rewards" },
    { num: "4", title: "Unlock Rewards", desc: "More contributions unlock bigger rewards" },
    { num: "5", title: "Grow Together", desc: "Rank up, earn more and grow with community" },
  ]

  const cryptoAssets = [
    { symbol: "BTC/USDT", name: "Bitcoin", price: "$62,855.40", change: "-0.34%", icon: "₿" },
    { symbol: "ETH/USDT", name: "Ethereum", price: "$1,675.42", change: "+0.00%", icon: "Ξ" },
    { symbol: "SOL/USDT", name: "Solana", price: "$66.61", change: "+1.64%", icon: "◆" },
    { symbol: "XRP/USDT", name: "Ripple", price: "$1.17", change: "+2.64%", icon: "✕" },
    { symbol: "USDT/USD", name: "Tether", price: "$1.00", change: "+0.01%", icon: "₮" },
  ]

  const testimonials = [
    {
      name: "Arjun Patel",
      text: "FlowChain changed the way I think about community rewards. The bonuses and rewards are amazing!",
      avatar: "👨",
      rating: 5,
    },
    {
      name: "Neha Gupta",
      text: "Transparent, zero fees, and real rewards. The $50 USDT bonus is a great start for everyone!",
      avatar: "👩",
      rating: 5,
    },
    {
      name: "Rohan Mehta",
      text: "The spin wheel is super exciting! I won 10x and it was completely unexpected!",
      avatar: "👨",
      rating: 5,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-purple-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-blue-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              FlowChain
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#rewards" className="text-slate-600 hover:text-slate-900 font-medium">
              Rewards
            </a>
            <a href="#benefits" className="text-slate-600 hover:text-slate-900 font-medium">
              Benefits
            </a>
            <a href="#trading" className="text-slate-600 hover:text-slate-900 font-medium">
              Trading
            </a>
          </div>

          <div className="hidden md:flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/participant/login")}
              className="border-blue-200 hover:bg-blue-50"
            >
              Login
            </Button>
            <Button
              onClick={() => router.push("/participant/register")}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Get Started <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-blue-100 p-4 space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/participant/login")}
            >
              Login
            </Button>
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
              onClick={() => router.push("/participant/register")}
            >
              Get Started
            </Button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-purple-50/30 overflow-hidden pt-24 pb-12">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-20 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left Column */}
            <div className="space-y-8">
              {/* Trust Badge */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-2xl">⭐</span>
                <span className="text-slate-700 font-medium">Trusted by 50,000+ participants worldwide</span>
              </div>

              {/* Main Heading */}
              <div className="space-y-4">
                <h1 className="text-5xl sm:text-6xl font-bold leading-tight">
                  <span className="text-slate-900">Your Next</span>
                  <br />
                  <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Reward</span>
                  <br />
                  <span className="text-slate-900">Is Waiting.</span>
                </h1>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Join a global community, earn instant bonuses, spin for bigger rewards, and grow together with zero platform fees.
                </p>
              </div>

              {/* Key Features */}
              <div className="flex flex-wrap gap-4 pt-4">
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-3 rounded-lg border border-slate-200">
                  <span className="text-2xl">🎁</span>
                  <div>
                    <p className="text-xs text-slate-500">Instant Bonus</p>
                    <p className="font-bold text-slate-900">$50 USDT</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-3 rounded-lg border border-slate-200">
                  <span className="text-2xl">⚙️</span>
                  <div>
                    <p className="text-xs text-slate-500">Up To</p>
                    <p className="font-bold text-slate-900">20x Rewards</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-3 rounded-lg border border-slate-200">
                  <span className="text-2xl">🛡️</span>
                  <div>
                    <p className="text-xs text-slate-500">Platform</p>
                    <p className="font-bold text-slate-900">0% Fees</p>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 pt-6">
                <button
                  onClick={() => router.push("/participant/register")}
                  className="px-8 py-4 rounded-full bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                  Reveal My Reward →
                </button>
                <button className="px-8 py-4 rounded-full bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-900 font-semibold flex items-center gap-2 transition-all hover:bg-slate-50">
                  <span className="text-red-600">▶</span>
                  Watch Video
                </button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center gap-3 pt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                      {i}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-slate-900 font-semibold">2,847 people joined today</p>
                  <div className="flex gap-1 mt-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs text-slate-500">Live</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Animated Sphere */}
            <div className="relative h-full">
              <AnimatedSphere />
            </div>
          </div>
        </div>
      </section>

      {/* Rewards Showcase Section */}
      <section id="rewards" className="py-20 bg-gradient-to-b from-transparent via-blue-50/50 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              What Could <span className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">Your First Reward</span> Be?
            </h2>
            <p className="text-lg text-slate-600">
              Rewards are random, exciting and unlimited. Spin, earn and grow!
            </p>
          </div>

          {/* Reward Cards Carousel */}
          <div className="flex gap-4 overflow-x-auto pb-8 snap-x snap-mandatory">
            {rewards.map((reward, idx) => (
              <div
                key={idx}
                className={`flex-shrink-0 w-40 sm:w-48 rounded-2xl p-6 text-center transition-all ${
                  reward.featured
                    ? "ring-2 ring-purple-500 scale-105 shadow-2xl bg-gradient-to-br from-amber-100 via-orange-100 to-red-100"
                    : `bg-gradient-to-br ${reward.color} shadow-lg hover:shadow-xl`
                }`}
              >
                <div className="text-5xl mb-3">{reward.icon}</div>
                {reward.amount && <div className="text-3xl font-bold text-orange-600 mb-1">{reward.amount}</div>}
                {reward.multiplier && <div className="text-3xl font-bold text-purple-600 mb-1">{reward.multiplier}</div>}
                <div className="text-sm font-bold text-slate-700">{reward.label}</div>
              </div>
            ))}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-blue-100/50">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{stat.icon}</div>
                  <div className="text-green-600 text-sm font-semibold">▲ {stat.growth}</div>
                </div>
                <h4 className="text-sm text-slate-600 mb-2">{stat.title}</h4>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold">
              Your Journey <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">Starts Here</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-0">
            {journey.map((step, idx) => (
              <div key={idx} className="relative">
                {idx < journey.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[50%] w-full h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
                )}
                <div className="relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg mb-4 z-10">
                      {step.num}
                    </div>
                    <h4 className="font-bold text-slate-900 mb-2">{step.title}</h4>
                    <p className="text-sm text-slate-600">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mystery Crate & Benefits Section */}
      <section id="benefits" className="py-20 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            {/* Mystery Crate */}
            <div>
              <p className="text-sm font-semibold text-blue-600 mb-2">⭐ MYSTERY REWARD CRATE</p>
              <h3 className="text-4xl font-bold mb-4">
                Mystery Reward <span className="text-purple-600">Crate</span>
              </h3>
              <p className="text-slate-600 mb-4 font-semibold">Second contribution unlocks the mystery.</p>
              <p className="text-slate-600 mb-8">
                The more you contribute, the bigger the surprises! Unlock exclusive rewards with every level-up in our mystery crate system.
              </p>
              <Button className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white h-12 px-8">
                Open My Crate <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            
            {/* Crate Image */}
            <div className="flex justify-center">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Jun%209%2C%202026%2C%2004_02_53%20PM-diiq3xu8cvdNgBL4AJuKgCEf50qwYQ.png"
                alt="Mystery Crate"
                className="max-w-md w-full h-auto rounded-2xl shadow-2xl"
              />
            </div>
          </div>

          {/* Why Members Love FlowChain */}
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold mb-4">Why Members Love <span className="text-blue-600">FlowChain</span></h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="text-center">
                <div className="text-5xl mb-4">{benefit.icon}</div>
                <h4 className="font-bold text-slate-900 mb-2">{benefit.title}</h4>
                <p className="text-sm text-slate-600">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rewards Hero CTA */}
      <section className="py-20 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 rounded-3xl mx-4 sm:mx-auto sm:max-w-6xl my-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full -ml-36 -mb-36"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Ready to Unlock Your First Reward?
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Join FlowChain today and unlock financial growth, community rewards, and endless opportunities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-purple-600 hover:bg-gray-100 h-12 px-8 font-bold"
              onClick={() => router.push("/participant/register")}
            >
              Enter FlowChain Now <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-white/30 border border-white"></div>
              ))}
            </div>
            <span className="text-white font-semibold">50,000+ Active Participants</span>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">What Our Community Says</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="bg-white rounded-xl p-8 shadow-sm hover:shadow-lg transition-shadow border border-blue-100/50">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl">{testimonial.avatar}</div>
                  <div>
                    <h4 className="font-bold text-slate-900">{testimonial.name}</h4>
                    <div className="flex gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-slate-600 italic">"{testimonial.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Prediction Market Section */}
      <section id="trading" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-4xl font-bold">Live Prediction Market</h2>
              <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">Live</span>
            </div>
            <p className="text-lg text-slate-600">Trade crypto, commodities & forex with live prices</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {cryptoAssets.map((asset, idx) => (
              <div key={idx} className="bg-white rounded-xl p-6 border border-blue-100/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold">
                    {asset.icon}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{asset.symbol}</p>
                    <p className="text-xs text-slate-500">{asset.name}</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900 mb-2">{asset.price}</p>
                <div className="flex gap-2">
                  <div className={`flex-1 py-2 rounded-lg font-semibold text-white text-center text-sm ${asset.change.startsWith('+') ? 'bg-green-500' : 'bg-red-500'}`}>
                    {asset.change.startsWith('+') ? '↑ UP' : '↓ DOWN'}
                  </div>
                  <div className={`flex-1 py-2 rounded-lg font-semibold text-center text-sm ${asset.change.startsWith('+') ? 'text-green-600 border border-green-300' : 'text-red-600 border border-red-300'}`}>
                    {asset.change}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
              <div>
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-80" />
                <p className="font-semibold mb-1">Secure & Safe</p>
                <p className="text-sm opacity-80">Bank-level security</p>
              </div>
              <div>
                <Lock className="w-8 h-8 mx-auto mb-2 opacity-80" />
                <p className="font-semibold mb-1">Transparent System</p>
                <p className="text-sm opacity-80">100% transparent</p>
              </div>
              <div>
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-80" />
                <p className="font-semibold mb-1">Fast & Automated</p>
                <p className="text-sm opacity-80">Instant tracking & payouts</p>
              </div>
              <div>
                <Users className="w-8 h-8 mx-auto mb-2 opacity-80" />
                <p className="font-semibold mb-1">Community Driven</p>
                <p className="text-sm opacity-80">Built for members, by members</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="font-bold text-lg mb-4">FlowChain</h3>
              <p className="text-slate-400 text-sm">Building a community-driven financial platform.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between">
            <p className="text-slate-400 text-sm">© 2025 FlowChain. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <MessageCircle className="w-5 h-5 cursor-pointer hover:text-blue-400" />
              <Star className="w-5 h-5 cursor-pointer hover:text-yellow-400" />
              <TrendingUp className="w-5 h-5 cursor-pointer hover:text-green-400" />
            </div>
          </div>
        </div>
      </footer>

      <AIChatbotDialog />
      <LearnMoreDialog />
    </div>
  )
}
