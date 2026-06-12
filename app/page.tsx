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
    {
      icon: "🤲💰",
      title: "$50",
      label: "REWARD",
      description: "For Contributing",
      color: "from-orange-100 to-orange-50",
      titleColor: "text-orange-600",
    },
    {
      icon: "🎡",
      title: "Spin Wheel",
      label: "UP TO 20X REWARD",
      description: "Try your luck daily",
      color: "from-pink-100 to-pink-50",
      titleColor: "text-purple-600",
    },
    {
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/chest-0MObWtt3QP2xSvdNPzuxqFThC1xnnV.png",
      title: "Mystery Chest",
      label: "UP TO $1000 REWARD",
      description: "Unbox big surprises",
      color: "from-yellow-100 to-yellow-50",
      titleColor: "text-yellow-600",
    },
    {
      icon: "📊",
      title: "Binary Trading",
      label: "TRADE & EARN",
      description: "Predict and profit",
      color: "from-blue-100 to-blue-50",
      titleColor: "text-blue-600",
    },
    {
      icon: "💰",
      title: "Stacking",
      label: "PASSIVE REWARDS",
      description: "Stack and grow your wealth",
      color: "from-green-100 to-green-50",
      titleColor: "text-green-600",
    },
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
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-purple-50 overflow-x-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-blue-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlowChainLogo variant="icon" size="sm" />
            <span className="font-bold text-lg sm:text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
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

          {/* Mobile nav buttons */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/participant/login")}
              className="border-blue-200 hover:bg-blue-50 h-8 px-3 text-xs"
            >
              Login
            </Button>
            <Button
              size="sm"
              onClick={() => router.push("/participant/register")}
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-8 px-3 text-xs"
            >
              Join
            </Button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden absolute top-14 left-0 right-0 bg-white border-b border-blue-100 p-4 space-y-2">
            <a href="#rewards" className="block text-slate-600 font-medium py-2 border-b border-slate-100" onClick={() => setIsMenuOpen(false)}>Rewards</a>
            <a href="#benefits" className="block text-slate-600 font-medium py-2 border-b border-slate-100" onClick={() => setIsMenuOpen(false)}>Benefits</a>
            <a href="#trading" className="block text-slate-600 font-medium py-2" onClick={() => setIsMenuOpen(false)}>Trading</a>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-50 via-pink-50/50 to-purple-100/30 overflow-hidden pt-10 sm:pt-16 lg:pt-24 pb-8 sm:pb-12">
        {/* Ambient background elements */}
        <div className="absolute top-20 right-[10%] w-48 sm:w-72 h-48 sm:h-72 bg-gradient-to-br from-purple-200/20 via-pink-200/20 to-transparent rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-20 left-[5%] w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-tr from-blue-200/20 via-purple-200/20 to-transparent rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '-5s' }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-5 sm:space-y-8 animate-fadeIn">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 text-purple-600 font-bold text-sm animate-bounce-in-down delay-100">
                <span className="text-lg">✨</span>
                <span>Trade • Earn • Win Instantly</span>
              </div>

              {/* Main Heading */}
              <div className="space-y-3 sm:space-y-6">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight animate-bounce-in-down delay-200">
                  <span className="text-slate-900">Trade Smarter,</span>
                  <br />
                  <span className="relative">
                    <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-red-500 bg-clip-text text-transparent">Earn More,</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-pink-500 to-red-500 opacity-20 blur-2xl -z-10"></div>
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Win Bigger!</span>
                </h1>
                <p className="text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed max-w-lg animate-stagger-fade-in delay-300">
                  FlowChain is your all-in-one platform to trade binary options, earn rewards, unlock mystery prizes, and grow your crypto effortlessly.
                </p>
              </div>

              {/* Key Features Badges */}
              <div className="flex flex-wrap gap-2 sm:gap-3 animate-stagger-fade-in delay-400">
                <div className="inline-flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-3 rounded-full bg-white/60 border border-white/70 shadow-lg backdrop-blur-sm">
                  <span className="text-base sm:text-xl">🎁</span>
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Instant Reward</p>
                    <p className="font-bold text-slate-900 text-sm sm:text-base">$50 USDT</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-3 rounded-full bg-white/60 border border-white/70 shadow-lg backdrop-blur-sm">
                  <span className="text-base sm:text-xl">⚡</span>
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Zero Platform</p>
                    <p className="font-bold text-slate-900 text-sm sm:text-base">0% Fees</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-3 rounded-full bg-white/60 border border-white/70 shadow-lg backdrop-blur-sm">
                  <span className="text-base sm:text-xl">🛡️</span>
                  <div>
                    <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Secure & Transparent</p>
                    <p className="font-bold text-slate-900 text-sm sm:text-base">100%</p>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 animate-bounce-in-down delay-500">
                <button
                  onClick={() => router.push("/participant/register")}
                  className="group relative w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-full bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-bold shadow-lg hover:shadow-2xl hover:shadow-pink-400/30 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                  <span className="relative flex items-center justify-center gap-2">Start Trading Now <ArrowRight className="w-4 h-4" /></span>
                </button>
                <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-full bg-white/60 hover:bg-white/80 border border-white/70 text-slate-900 font-bold flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg active:scale-95 backdrop-blur-sm">
                  <span className="text-orange-600">▶</span>
                  Explore Features
                </button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center gap-3 sm:gap-4 animate-stagger-fade-in delay-600">
                <div className="flex -space-x-2 sm:-space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-md">
                      {i}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-slate-900 font-semibold text-sm sm:text-base">2,847 people joined today</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs text-slate-500">Live and growing</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content - Mystery Chest & Spin Wheel */}
            <div className="relative hidden lg:flex h-[540px] items-end justify-center animate-fadeIn delay-200">

              {/* Floating Mystery Chest card (top-center) */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-white/90 backdrop-blur-sm border border-purple-100 rounded-2xl px-5 py-3 shadow-xl">
                <img
                  src="/images/mystery-chest-hero.png"
                  alt="Mystery Chest"
                  className="w-12 h-12 object-contain"
                />
                <div>
                  <p className="text-slate-700 font-semibold text-sm">Mystery Chest</p>
                  <p className="text-slate-500 text-xs">Win upto</p>
                  <p className="text-orange-500 font-bold text-lg leading-tight">$1000</p>
                </div>
              </div>

              {/* Mystery Chest image - left/center bottom */}
              <div className="absolute left-0 bottom-0 z-10 w-[220px] animate-bounce-slow">
                <img
                  src="/images/mystery-chest-hero.png"
                  alt="Open mystery chest with coins and gems"
                  className="w-full h-auto object-contain drop-shadow-2xl"
                />
              </div>

              {/* Spin Wheel image - right, vertically centered */}
              <div className="absolute right-0 bottom-8 z-10 w-[320px]">
                {/* Glowing platform under wheel */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-10 bg-gradient-to-r from-orange-400/60 via-pink-400/60 to-purple-400/60 rounded-full blur-xl"></div>
                <img
                  src="/images/spin-wheel-colorful.png"
                  alt="Spin wheel with reward multipliers"
                  className="relative w-full h-auto object-contain drop-shadow-2xl"
                  style={{ filter: "drop-shadow(0 0 40px rgba(249,115,22,0.35))" }}
                />
              </div>

              {/* Crypto coin — USDT green (top right) */}
              <div className="absolute top-16 right-4 z-20 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 border-4 border-white shadow-xl flex items-center justify-center animate-bounce-slow" style={{ animationDelay: "0.3s" }}>
                <span className="text-white font-black text-lg">₮</span>
              </div>

              {/* Crypto coin — BTC orange (mid right) */}
              <div className="absolute top-1/2 -translate-y-1/2 right-0 z-20 w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 border-4 border-white shadow-xl flex items-center justify-center animate-bounce-slow" style={{ animationDelay: "0.7s" }}>
                <span className="text-white font-black text-xl">₿</span>
              </div>

              {/* Crypto coin — ETH silver (bottom right) */}
              <div className="absolute bottom-20 right-2 z-20 w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-700 border-4 border-white shadow-xl flex items-center justify-center animate-bounce-slow" style={{ animationDelay: "1.1s" }}>
                <span className="text-white font-black text-base">Ξ</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rewards Showcase Section */}
      <section id="rewards" className="py-12 sm:py-20 lg:py-32 bg-gradient-to-b from-transparent via-blue-50/50 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 lg:mb-20 animate-fadeIn">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-900 mb-3 sm:mb-6">Choose Your Reward</h2>
            <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto">Flexible options to earn what works best for you</p>
          </div>

          {/* Reward Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
            {rewards.map((reward, idx) => (
              <div
                key={idx}
                className="group relative animate-stagger-scale overflow-hidden rounded-2xl sm:rounded-3xl transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-2"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div
                  className={`relative bg-gradient-to-br ${reward.color} shadow-lg p-4 sm:p-6 lg:p-8 h-full flex flex-col items-center justify-center text-center min-h-[180px] sm:min-h-[220px] lg:min-h-[280px]`}
                >
                  {/* Card shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"></div>

                  <div className="relative z-10 flex flex-col items-center justify-center h-full gap-2 sm:gap-4">
                    {/* Icon or Image */}
                    {reward.image ? (
                      <div className="group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 flex items-center justify-center h-16 sm:h-24 lg:h-32 w-full">
                        <img
                          src={reward.image}
                          alt={reward.title}
                          className="h-full w-auto object-contain drop-shadow-lg group-hover:drop-shadow-2xl transition-all duration-300"
                        />
                      </div>
                    ) : (
                      <div className="text-4xl sm:text-5xl lg:text-7xl group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300">
                        {reward.icon}
                      </div>
                    )}

                    {/* Title */}
                    <h3 className={`text-base sm:text-xl lg:text-3xl font-bold ${reward.titleColor}`}>
                      {reward.title}
                    </h3>

                    {/* Label */}
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 tracking-wider text-center">
                      {reward.label}
                    </p>

                    {/* Description - hidden on mobile */}
                    <p className="hidden sm:block text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs text-center">
                      {reward.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey Section */}
      <section className="py-12 sm:py-20 lg:py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 lg:mb-20 animate-fadeIn">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-900 mb-3 sm:mb-6">Your FlowChain Journey</h2>
            <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto">5 simple steps to unlock unlimited rewards</p>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Animated connecting line - desktop only */}
            <div className="hidden lg:block absolute top-[60px] left-[12.5%] right-[12.5%] h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 w-0 animate-[slide-right_3s_ease-out_forwards]"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 sm:gap-6 lg:gap-4">
              {journey.map((step, idx) => (
                <div key={idx} className="relative animate-bounce-in-down flex sm:block items-center sm:items-start gap-4 sm:gap-0" style={{ animationDelay: `${idx * 150}ms` }}>
                  {/* Step Circle */}
                  <div className="flex justify-center sm:mb-8 flex-shrink-0">
                    <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-xl sm:text-2xl shadow-lg hover:shadow-2xl hover:scale-110 transition-all duration-300 group cursor-pointer">
                      <span className="text-xl sm:text-2xl lg:text-3xl font-bold">{step.num}</span>
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 opacity-0 group-hover:opacity-100 blur transition-opacity duration-300"></div>
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="text-left sm:text-center flex-1">
                    <h4 className="font-bold text-base sm:text-lg text-slate-900 mb-1 sm:mb-2">{step.title}</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Premium Stats Section */}
      <section className="py-12 sm:py-20 lg:py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="group relative animate-stagger-scale overflow-hidden rounded-2xl" style={{ animationDelay: `${idx * 150}ms` }}>
                {/* Premium card with gradient background */}
                <div className="relative p-5 sm:p-6 lg:p-8 h-full bg-gradient-to-br from-white/60 to-white/40 hover:from-white/80 hover:to-white/60 border border-white/70 hover:border-white/90 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm rounded-2xl">
                  {/* Animated background accent */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>

                  <div className="relative space-y-4">
                    {/* Icon and Growth Badge */}
                    <div className="flex items-start justify-between">
                      <div className="text-5xl group-hover:scale-110 transition-transform duration-300">{stat.icon}</div>
                      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-xs font-bold">
                        ↑ {stat.growth}
                      </div>
                    </div>

                    {/* Stat Title */}
                    <div>
                      <p className="text-sm text-slate-600 font-medium mb-2">{stat.title}</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">{stat.value}</p>
                    </div>
                  </div>

                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-12 sm:py-20 lg:py-32 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 lg:mb-20 animate-fadeIn">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-900 mb-3 sm:mb-6">Why FlowChain?</h2>
            <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto">Everything you need to maximize your rewards</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5 lg:gap-8">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="group relative animate-stagger-scale overflow-hidden rounded-2xl" style={{ animationDelay: `${idx * 120}ms` }}>
                <div className="relative p-4 sm:p-6 lg:p-8 h-full text-center bg-white/40 hover:bg-white/60 border border-white/60 hover:border-white/80 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm rounded-2xl">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-br from-orange-500 to-pink-600 bg-clip-text text-transparent mb-2 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
                    {benefit.icon}
                  </div>
                  <h4 className="font-bold text-sm sm:text-base lg:text-lg text-slate-900 mb-1 sm:mb-3">{benefit.title}</h4>
                  <p className="hidden sm:block text-xs sm:text-sm text-slate-600 leading-relaxed">{benefit.desc}</p>
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium CTA Section */}
      <section className="py-10 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto relative overflow-hidden rounded-2xl sm:rounded-3xl animate-stagger-slide-right delay-300">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600"></div>
          <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-white/10 rounded-full blur-3xl -mr-32 sm:-mr-48 -mt-32 sm:-mt-48 animate-float-slow"></div>
          <div className="absolute bottom-0 left-0 w-48 sm:w-72 h-48 sm:h-72 bg-white/10 rounded-full blur-3xl -ml-24 sm:-ml-36 -mb-24 sm:-mb-36 animate-float-slow" style={{ animationDelay: '-5s' }}></div>

          <div className="relative z-10 px-6 sm:px-10 lg:px-12 py-10 sm:py-16 lg:py-20 text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-3 sm:mb-6">
              Ready to Unlock Your First Reward?
            </h2>
            <p className="text-sm sm:text-base lg:text-xl text-white/90 mb-6 sm:mb-10 max-w-2xl mx-auto">
              Join FlowChain today and unlock financial growth, community rewards, and endless opportunities.
            </p>

            <div className="flex justify-center">
              <button
                onClick={() => router.push("/participant/register")}
                className="group relative px-6 sm:px-8 py-3 sm:py-4 rounded-full bg-white text-purple-600 font-bold hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 rounded-full"></div>
                <span className="relative flex items-center justify-center gap-2 text-sm sm:text-base">
                  Enter FlowChain Now <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            </div>

            <div className="mt-6 sm:mt-10 flex items-center justify-center gap-3 sm:gap-4">
              <div className="flex -space-x-2 sm:-space-x-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/30 border-2 border-white"></div>
                ))}
              </div>
              <span className="text-white font-semibold text-sm sm:text-base">50,000+ Active Participants</span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 sm:py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 lg:mb-20 animate-fadeIn">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-900 mb-3 sm:mb-6">Loved by Our Community</h2>
            <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto">Real experiences from real users</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="group relative animate-stagger-scale overflow-hidden rounded-2xl" style={{ animationDelay: `${idx * 150}ms` }}>
                <div className="relative p-5 sm:p-6 lg:p-8 h-full bg-white/50 hover:bg-white/70 border border-white/70 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm rounded-2xl">
                  <div className="flex items-center gap-1 mb-3 sm:mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-base sm:text-lg">★</span>
                    ))}
                  </div>
                  <p className="text-slate-700 mb-4 sm:mb-8 leading-relaxed italic text-sm sm:text-base lg:text-lg">{testimonial.text}</p>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-xl sm:text-2xl shadow-md">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm sm:text-base">{testimonial.name}</p>
                      <p className="text-xs text-slate-500">Verified Participant</p>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Prediction Market Section */}
      <section id="trading" className="py-12 sm:py-20 lg:py-32 bg-gradient-to-br from-purple-50 via-pink-50/50 to-blue-50/30 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl -ml-48 -mb-48"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <div className="mb-10 sm:mb-14 lg:mb-20 animate-fadeIn text-center">
            <div className="inline-flex items-center gap-2 mb-4 sm:mb-6 px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-gradient-to-r from-purple-200/40 to-pink-200/40 border border-purple-300/50">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-purple-600 animate-pulse"></div>
              <span className="text-xs sm:text-sm font-bold text-purple-700">Live Prediction Market</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-900 mb-3 sm:mb-6">
              Predict the Next Market <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">Move</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">Choose whether the market will go <span className="text-green-600 font-semibold">UP</span> or <span className="text-red-600 font-semibold">DOWN</span> before the timer ends.</p>
          </div>

          {/* Prediction Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 mb-8 sm:mb-12 lg:mb-16">
            {[
              {
                icon: "₿",
                title: "Bitcoin",
                symbol: "BTC/USDT",
                change: "+1.64%",
                changeColor: "text-green-600",
                question: "Will BTC be above $108,500 in 5 minutes?",
                target: "$108,500",
                timer: "02:14",
                upPercent: 72,
                downPercent: 28,
              },
              {
                icon: "🟡",
                title: "Gold",
                symbol: "XAU/USD",
                change: "+0.92%",
                changeColor: "text-green-600",
                question: "Will Gold close higher than current price?",
                target: "Current",
                timer: "01:42",
                upPercent: 61,
                downPercent: 39,
              },
              {
                icon: "€",
                title: "EUR/USD",
                symbol: "Forex",
                change: "+0.71%",
                changeColor: "text-green-600",
                question: "Will EUR/USD be above 1.0850 in 5 minutes?",
                target: "1.0850",
                timer: "03:05",
                upPercent: 68,
                downPercent: 32,
              },
              {
                icon: "⬫",
                title: "Crude Oil",
                symbol: "WTI/USDT",
                change: "+1.23%",
                changeColor: "text-green-600",
                question: "Will Crude Oil be above $78.50 in 5 minutes?",
                target: "$78.50",
                timer: "02:33",
                upPercent: 57,
                downPercent: 43,
              },
            ].map((card, idx) => (
              <div key={idx} className="group relative animate-bounce-in-down overflow-hidden rounded-3xl" style={{ animationDelay: `${idx * 100}ms` }}>
                {/* Card background with gradient border effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/70 to-purple-50/70 border border-white/80 rounded-3xl"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-100/20 via-pink-100/10 to-blue-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"></div>

                <div className="relative p-5 sm:p-6 lg:p-7 h-full flex flex-col gap-4 sm:gap-5">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-lg sm:text-xl font-bold text-white shadow-lg">
                        {card.icon}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm sm:text-base">{card.title}</p>
                        <p className="text-slate-500 text-xs">{card.symbol}</p>
                      </div>
                    </div>
                    <div className={`text-sm sm:text-base font-bold ${card.changeColor}`}>
                      ↑ {card.change}
                    </div>
                  </div>

                  {/* Question */}
                  <div className="space-y-2">
                    <p className="text-slate-600 text-xs sm:text-sm font-medium">Will {card.title.toLowerCase()} be above</p>
                    <p className="text-green-600 font-bold text-sm sm:text-base">{card.target} in 5 minutes?</p>
                  </div>

                  {/* Timer */}
                  <div className="flex items-center gap-2 text-slate-600 text-xs sm:text-sm">
                    <span>⏱️</span>
                    <span>{card.timer} Remaining</span>
                  </div>

                  {/* UP/DOWN Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button className="py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-sm transition-all duration-300 hover:shadow-lg hover:shadow-green-500/30 active:scale-95 flex items-center justify-center gap-2">
                      <span>↑</span>
                      <span>UP</span>
                    </button>
                    <button className="py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold text-sm transition-all duration-300 hover:shadow-lg hover:shadow-red-500/30 active:scale-95 flex items-center justify-center gap-2">
                      <span>↓</span>
                      <span>DOWN</span>
                    </button>
                  </div>

                  {/* Community Prediction Bars */}
                  <div className="space-y-2 pt-2 border-t border-slate-200/50">
                    <p className="text-slate-600 text-xs font-semibold">Community Prediction</p>
                    <div className="space-y-1.5">
                      {/* UP bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                            style={{ width: `${card.upPercent}%` }}
                          ></div>
                        </div>
                        <span className="text-green-600 font-bold text-xs w-10 text-right">{card.upPercent}% UP</span>
                      </div>
                      {/* DOWN bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-red-400 to-pink-500 rounded-full"
                            style={{ width: `${card.downPercent}%` }}
                          ></div>
                        </div>
                        <span className="text-red-600 font-bold text-xs w-10 text-right">{card.downPercent}% DOWN</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trade Across Markets Section */}
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 mb-8 sm:mb-12 lg:mb-16 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 transition-all duration-300 animate-stagger-slide-right delay-300 shadow-lg">
            <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-white/5 rounded-full blur-3xl -mr-32 sm:-mr-48 -mt-32 sm:-mt-48"></div>
            <div className="relative z-10 grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-lg sm:text-xl">
                  🌍
                </div>
                <div>
                  <p className="font-bold text-sm sm:text-base">Trade Across Multiple Markets</p>
                  <p className="text-white/70 text-xs">Simple. Fast. Transparent.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-lg">
                  ₿
                </div>
                <div>
                  <p className="font-bold text-sm">Crypto</p>
                  <p className="text-white/70 text-xs">Predict Bitcoin & Altcoins</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-lg">
                  🔄
                </div>
                <div>
                  <p className="font-bold text-sm">Forex</p>
                  <p className="text-white/70 text-xs">Major Currency Pairs</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-lg">
                  🟡
                </div>
                <div>
                  <p className="font-bold text-sm">Commodities</p>
                  <p className="text-white/70 text-xs">Gold, Silver & Oil</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-lg">
                  ⚡
                </div>
                <div>
                  <p className="font-bold text-sm">Live Binary</p>
                  <p className="text-white/70 text-xs">Just UP or DOWN</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-8 sm:p-10 lg:p-16 bg-gradient-to-br from-purple-100/50 to-pink-100/50 border border-purple-200/50 animate-bounce-in-down delay-400 shadow-lg">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-200/30 via-pink-200/30 to-blue-200/30 rounded-full blur-3xl -mr-48 -mt-48"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-100/20 to-pink-100/20 rounded-full blur-3xl -ml-48 -mb-48"></div>
            
            <div className="relative z-10 flex flex-col items-center text-center gap-6 sm:gap-8">
              {/* Crypto icons floating animation */}
              <div className="relative w-full h-32 sm:h-40 lg:h-48 flex items-center justify-center">
                {/* Up arrow */}
                <div className="absolute left-8 sm:left-16 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold animate-bounce-slow shadow-lg" style={{ animationDelay: "0s" }}>
                  ↑
                </div>
                {/* Down arrow */}
                <div className="absolute right-8 sm:right-16 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-red-400 to-pink-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold animate-bounce-slow shadow-lg" style={{ animationDelay: "0.5s" }}>
                  ↓
                </div>
              </div>

              <div className="space-y-2 sm:space-y-4">
                <p className="text-slate-600 text-sm sm:text-base flex items-center justify-center gap-2">
                  <span>👥</span>
                  <span>Thousands of predictions are being placed every minute.</span>
                </p>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
                  Can you predict the next move?
                </h3>
              </div>

              <button
                onClick={() => router.push("/participant/register")}
                className="group relative px-6 sm:px-10 py-3 sm:py-4 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 text-white font-bold text-sm sm:text-base shadow-lg hover:shadow-2xl hover:shadow-purple-400/40 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                <span className="relative flex items-center justify-center gap-2">
                  <span>🚀</span>
                  Start Predicting Now
                  <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            </div>
          </div>

          {/* Live Activity Ticker */}
          <div className="mt-8 sm:mt-12 lg:mt-16 p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-purple-100/50 to-pink-100/50 border border-purple-200/50 overflow-hidden animate-fade-in delay-500 shadow-md">
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-purple-600/20 border border-purple-400/50 flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></div>
                <span className="text-purple-700 font-bold text-xs sm:text-sm">LIVE ACTIVITY</span>
              </div>

              {[
                { user: "Rahul", action: "predicted", asset: "BTC", direction: "↑", color: "text-green-600" },
                { user: "Aman", action: "predicted", asset: "GOLD", direction: "↓", color: "text-red-600" },
                { user: "Sneha", action: "predicted", asset: "EUR/USD", direction: "↑", color: "text-green-600" },
                { user: "Vikram", action: "predicted", asset: "CRUDE", direction: "↑", color: "text-green-600" },
                { user: "Priya", action: "predicted", asset: "ETH", direction: "↓", color: "text-red-600" },
              ].map((activity, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-2 text-slate-700 text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 border border-slate-300/50 rounded-full bg-white/50">
                  <span className="text-orange-500">●</span>
                  <span>{activity.user}</span>
                  <span className="text-slate-600">predicted</span>
                  <span className="font-bold text-slate-900">{activity.asset}</span>
                  <span className={`font-bold ${activity.color}`}>{activity.direction}</span>
                  {idx < 4 && <span className="text-slate-400 mx-2">•</span>}
                </div>
              ))}

              <div className="flex items-center gap-2 px-3 py-2 text-slate-700 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 border border-slate-300/50 rounded-full bg-white/50">
                <span>👥</span>
                <span className="font-bold text-slate-900">+12.4K</span>
                <span className="text-slate-600">online</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp Support Banner */}
      <section className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 py-4 sm:py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm sm:text-base">Need Support & Guidance?</p>
                <p className="text-green-100 text-xs sm:text-sm">Our experts are available on WhatsApp — get instant help 24/7</p>
              </div>
            </div>
            <a
              href="https://wa.me/237651528626"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white text-green-700 font-bold text-sm sm:text-base px-5 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-lg hover:shadow-xl hover:bg-green-50 transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              Chat on WhatsApp
              <span className="text-green-500 font-normal hidden sm:inline">+237 651 528 626</span>
            </a>
          </div>
        </div>
      </section>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/237651528626"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 group flex items-center gap-0 hover:gap-3 w-14 h-14 hover:w-auto hover:px-4 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-2xl hover:shadow-green-500/40 transition-all duration-300 overflow-hidden"
        title="Chat with us on WhatsApp — +237 651 528 626"
      >
        <MessageCircle className="w-7 h-7 flex-shrink-0 mx-auto group-hover:mx-0" />
        <span className="text-sm font-semibold whitespace-nowrap max-w-0 group-hover:max-w-xs opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
          +237 651 528 626
        </span>
      </a>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-slate-900 via-slate-900 to-black text-white pt-14 sm:pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Top: brand block + stats row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16 mb-12 lg:mb-16">

            {/* Brand — spans 2 cols on large */}
            <div className="lg:col-span-2 space-y-5">
              <div className="flex items-center gap-2.5">
                <FlowChainLogo variant="icon" size="sm" />
                <span className="font-bold text-xl tracking-tight">FlowChain</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                FlowChain is a community-driven financial ecosystem built on blockchain transparency. We empower everyday people to grow wealth through referrals, smart trading, and daily rewards — with zero hidden fees.
              </p>

              {/* Key stats */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                {[
                  { value: "50K+", label: "Active Members" },
                  { value: "$2M+", label: "Rewards Paid" },
                  { value: "0%",   label: "Platform Fees" },
                ].map((s) => (
                  <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <div className="text-base sm:text-lg font-bold text-cyan-400">{s.value}</div>
                    <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Social icons */}
              <div className="flex gap-2 pt-1">
                {/* Telegram */}
                <a href="#" aria-label="Telegram" className="w-9 h-9 rounded-full bg-white/10 hover:bg-cyan-500/30 border border-white/10 hover:border-cyan-500/40 flex items-center justify-center transition-all">
                  <svg className="w-4 h-4 text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                </a>
                {/* Twitter / X */}
                <a href="#" aria-label="Twitter" className="w-9 h-9 rounded-full bg-white/10 hover:bg-sky-500/30 border border-white/10 hover:border-sky-500/40 flex items-center justify-center transition-all">
                  <svg className="w-4 h-4 text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                {/* WhatsApp */}
                <a href="https://wa.me/237651528626" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="w-9 h-9 rounded-full bg-white/10 hover:bg-green-500/30 border border-white/10 hover:border-green-500/40 flex items-center justify-center transition-all">
                  <MessageCircle className="w-4 h-4 text-slate-300" />
                </a>
              </div>
            </div>

            {/* Links grid — 3 cols */}
            <div className="lg:col-span-3 grid grid-cols-3 gap-6 sm:gap-8">

              {/* Platform */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-white uppercase tracking-wider">Platform</h4>
                <ul className="space-y-2.5">
                  {[
                    { label: "Earn Rewards",      href: "#rewards"  },
                    { label: "Refer & Earn",       href: "#referral" },
                    { label: "Lucky Spin Wheel",   href: "#spin"     },
                    { label: "Trading Simulator",  href: "#trading"  },
                    { label: "Mystery Box",        href: "#mystery"  },
                    { label: "Leaderboard",        href: "#leaders"  },
                  ].map((l) => (
                    <li key={l.label}>
                      <a href={l.href} className="text-slate-400 hover:text-cyan-400 transition-colors text-xs sm:text-sm">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-white uppercase tracking-wider">Company</h4>
                <ul className="space-y-2.5">
                  {[
                    { label: "About FlowChain", href: "#about"   },
                    { label: "How It Works",    href: "#how"     },
                    { label: "Community",       href: "#community"},
                    { label: "Blog",            href: "#"        },
                    { label: "Careers",         href: "#"        },
                  ].map((l) => (
                    <li key={l.label}>
                      <a href={l.href} className="text-slate-400 hover:text-cyan-400 transition-colors text-xs sm:text-sm">
                        {l.label}
                      </a>
                    </li>
                  ))}
                  <li>
                    <a
                      href="https://wa.me/237651528626"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-green-400 transition-colors text-xs sm:text-sm flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-3 h-3 flex-shrink-0" />
                      WhatsApp Support
                    </a>
                  </li>
                </ul>
              </div>

              {/* Legal */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-white uppercase tracking-wider">Legal</h4>
                <ul className="space-y-2.5">
                  {[
                    { label: "Privacy Policy",    href: "#" },
                    { label: "Terms of Service",  href: "#" },
                    { label: "Security",          href: "#" },
                    { label: "Cookie Policy",     href: "#" },
                    { label: "Risk Disclaimer",   href: "#" },
                  ].map((l) => (
                    <li key={l.label}>
                      <a href={l.href} className="text-slate-400 hover:text-cyan-400 transition-colors text-xs sm:text-sm">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent mb-6" />

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p>&copy; 2025 FlowChain. All rights reserved.</p>
            <p className="text-center">
              Built on blockchain. Powered by community.{" "}
              <span className="text-cyan-600">Zero fees. Unlimited potential.</span>
            </p>
            <p>Made with care for the community</p>
          </div>
        </div>
      </footer>

      <AIChatbotDialog />
      <LearnMoreDialog />
    </div>
  )
}
