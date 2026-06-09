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
      icon: "📦",
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
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-purple-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-blue-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlowChainLogo variant="icon" size="sm" />
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
        {/* Ambient background elements */}
        <div className="absolute top-20 right-[10%] w-72 h-72 bg-gradient-to-br from-orange-200/20 via-pink-200/20 to-transparent rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-20 left-[5%] w-96 h-96 bg-gradient-to-tr from-blue-200/20 via-purple-200/20 to-transparent rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '-5s' }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-200px)]">
            {/* Left Content */}
            <div className="space-y-8 animate-fadeIn">
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-orange-50 to-pink-50 border border-orange-200/50 rounded-full px-6 py-3 animate-bounce-in-down delay-100">
                <span className="text-2xl">⭐</span>
                <span className="text-sm font-semibold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">Trusted by 50,000+ participants</span>
              </div>

              {/* Main Heading */}
              <div className="space-y-6">
                <h1 className="text-6xl sm:text-7xl font-bold leading-tight animate-bounce-in-down delay-200">
                  <span className="text-slate-900">Your Next</span>
                  <br />
                  <span className="relative">
                    <span className="bg-gradient-to-r from-orange-600 via-pink-600 to-red-600 bg-clip-text text-transparent">Reward</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-pink-600 to-red-600 opacity-20 blur-2xl -z-10"></div>
                  </span>
                  <br />
                  <span className="text-slate-900">Is Waiting.</span>
                </h1>
                <p className="text-xl text-slate-600 leading-relaxed max-w-lg animate-stagger-fade-in delay-300">
                  Join a global community, earn instant bonuses, spin for bigger rewards, and grow together with zero platform fees.
                </p>
              </div>

              {/* Key Features Badges */}
              <div className="flex flex-wrap gap-3 pt-4 animate-stagger-fade-in delay-400">
                <div className="group relative inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/60 hover:bg-white/80 border border-white/70 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm">
                  <span className="text-xl">🎁</span>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Instant Bonus</p>
                    <p className="font-bold text-slate-900">$50 USDT</p>
                  </div>
                </div>
                <div className="group relative inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/60 hover:bg-white/80 border border-white/70 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm">
                  <span className="text-xl">⚙️</span>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Up To</p>
                    <p className="font-bold text-slate-900">20x Rewards</p>
                  </div>
                </div>
                <div className="group relative inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/60 hover:bg-white/80 border border-white/70 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm">
                  <span className="text-xl">🛡️</span>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Platform</p>
                    <p className="font-bold text-slate-900">0% Fees</p>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 pt-6 animate-bounce-in-down delay-500">
                <button
                  onClick={() => router.push("/participant/register")}
                  className="group relative px-8 py-4 rounded-full bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-bold shadow-lg hover:shadow-2xl hover:shadow-pink-400/30 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                  <span className="relative flex items-center gap-2">Reveal My Reward <ArrowRight className="w-4 h-4" /></span>
                </button>
                <button className="px-8 py-4 rounded-full bg-white/60 hover:bg-white/80 border border-white/70 text-slate-900 font-bold flex items-center gap-2 transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95 backdrop-blur-sm">
                  <span className="text-red-600">▶</span>
                  Watch Video
                </button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center gap-4 pt-4 animate-stagger-fade-in delay-600">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 border-2 border-white flex items-center justify-center text-white text-xs font-bold hover:scale-125 hover:z-10 transition-transform shadow-md hover:shadow-lg">
                      {i}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-slate-900 font-semibold">2,847 people joined today</p>
                  <div className="flex gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs text-slate-500">Live and growing</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content - Animated Sphere */}
            <div className="relative h-full min-h-[400px] lg:min-h-[600px] flex items-center justify-center animate-fadeIn delay-200">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-100/30 to-pink-100/30 rounded-3xl blur-2xl"></div>
              <AnimatedSphere />
            </div>
          </div>
        </div>
      </section>

      {/* Rewards Showcase Section */}
      <section id="rewards" className="py-32 bg-gradient-to-b from-transparent via-blue-50/50 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 animate-fadeIn">
            <h2 className="text-5xl sm:text-6xl font-bold text-slate-900 mb-6">Choose Your Reward</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">Flexible options to earn what works best for you</p>
          </div>

          {/* Reward Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {rewards.map((reward, idx) => (
              <div
                key={idx}
                className="group relative animate-stagger-scale overflow-hidden rounded-3xl transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-2"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div
                  className={`relative bg-gradient-to-br ${reward.color} shadow-lg p-8 h-full flex flex-col items-center justify-center text-center min-h-[280px]`}
                >
                  {/* Card shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl pointer-events-none"></div>

                  <div className="relative z-10 flex flex-col items-center justify-center h-full gap-4">
                    {/* Icon */}
                    <div className="text-6xl sm:text-7xl group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300">
                      {reward.icon}
                    </div>

                    {/* Title */}
                    <h3 className={`text-2xl sm:text-3xl font-bold ${reward.titleColor}`}>
                      {reward.title}
                    </h3>

                    {/* Label */}
                    <p className="text-xs sm:text-sm font-bold text-slate-500 tracking-wider">
                      {reward.label}
                    </p>

                    {/* Description */}
                    <p className="text-sm text-slate-600 leading-relaxed max-w-xs">
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
      <section className="py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 animate-fadeIn">
            <h2 className="text-5xl sm:text-6xl font-bold text-slate-900 mb-6">Your FlowChain Journey</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">5 simple steps to unlock unlimited rewards</p>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Animated connecting line - desktop only */}
            <div className="hidden lg:block absolute top-[60px] left-[12.5%] right-[12.5%] h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 w-0 animate-[slide-right_3s_ease-out_forwards]"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 lg:gap-4">
              {journey.map((step, idx) => (
                <div key={idx} className="relative animate-bounce-in-down" style={{ animationDelay: `${idx * 150}ms` }}>
                  {/* Step Circle */}
                  <div className="flex justify-center mb-8">
                    <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg hover:shadow-2xl hover:scale-110 transition-all duration-300 group cursor-pointer">
                      <span className="text-3xl font-bold">{step.num}</span>
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 opacity-0 group-hover:opacity-100 blur transition-opacity duration-300"></div>
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="text-center">
                    <h4 className="font-bold text-lg text-slate-900 mb-2">{step.title}</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Premium Stats Section */}
      <section className="py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="group relative animate-stagger-scale overflow-hidden rounded-2xl" style={{ animationDelay: `${idx * 150}ms` }}>
                {/* Premium card with gradient background */}
                <div className="relative p-8 h-full bg-gradient-to-br from-white/60 to-white/40 hover:from-white/80 hover:to-white/60 border border-white/70 hover:border-white/90 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm rounded-2xl">
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

      {/* Mystery Crate & Benefits Section */}
      <section id="benefits" className="py-32 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 animate-fadeIn">
            <h2 className="text-5xl sm:text-6xl font-bold text-slate-900 mb-6">Why FlowChain?</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">Everything you need to maximize your rewards</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="group relative animate-stagger-scale overflow-hidden rounded-2xl" style={{ animationDelay: `${idx * 120}ms` }}>
                <div className="relative p-8 h-full text-center bg-white/40 hover:bg-white/60 border border-white/60 hover:border-white/80 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm rounded-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                  
                  <div className="relative">
                    <div className="text-5xl sm:text-6xl font-bold bg-gradient-to-br from-orange-500 to-pink-600 bg-clip-text text-transparent mb-4 group-hover:scale-110 transition-transform duration-300">
                      {benefit.icon}
                    </div>
                    <h4 className="font-bold text-lg text-slate-900 mb-3">{benefit.title}</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">{benefit.desc}</p>
                  </div>

                  {/* Hover accent */}
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rewards Hero CTA */}
      {/* Premium CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto relative overflow-hidden rounded-3xl animate-stagger-slide-right delay-300">
          {/* Premium gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600"></div>

          {/* Floating ambient elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48 animate-float-slow"></div>
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -ml-36 -mb-36 animate-float-slow" style={{ animationDelay: '-5s' }}></div>

          {/* Content */}
          <div className="relative z-10 px-8 sm:px-12 py-20 text-center">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 animate-stagger-fade-in delay-400">
              Ready to Unlock Your First Reward?
            </h2>
            <p className="text-lg sm:text-xl text-white/90 mb-12 max-w-2xl mx-auto animate-stagger-fade-in delay-500">
              Join FlowChain today and unlock financial growth, community rewards, and endless opportunities.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-bounce-in-down delay-600">
              <button
                onClick={() => router.push("/participant/register")}
                className="group relative px-8 py-4 rounded-full bg-white text-purple-600 font-bold hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 rounded-full"></div>
                <span className="relative flex items-center justify-center gap-2">
                  Enter FlowChain Now <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            </div>

            {/* Stats line */}
            <div className="mt-12 flex items-center justify-center gap-4 animate-stagger-fade-in delay-700">
              <div className="flex -space-x-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-white/30 border-2 border-white hover:scale-125 transition-transform hover:z-10 hover:bg-white/40"></div>
                ))}
              </div>
              <span className="text-white font-semibold">50,000+ Active Participants</span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 animate-fadeIn">
            <h2 className="text-5xl sm:text-6xl font-bold text-slate-900 mb-6">Loved by Our Community</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">Real experiences from real users</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="group relative animate-stagger-scale overflow-hidden rounded-2xl" style={{ animationDelay: `${idx * 150}ms` }}>
                {/* Premium card background */}
                <div className="relative p-8 h-full bg-white/50 hover:bg-white/70 border border-white/70 hover:border-white/90 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm rounded-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>

                  <div className="relative">
                    {/* Star Rating */}
                    <div className="flex items-center gap-1 mb-6">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <span key={i} className="text-yellow-400 text-lg hover:scale-110 transition-transform" style={{ transitionDelay: `${i * 50}ms` }}>
                          ★
                        </span>
                      ))}
                    </div>

                    {/* Testimonial Text */}
                    <p className="text-slate-700 mb-8 leading-relaxed italic text-lg">{testimonial.text}</p>

                    {/* User Info */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-2xl shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                          {testimonial.avatar}
                        </div>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{testimonial.name}</p>
                        <p className="text-xs text-slate-500">Verified Participant</p>
                      </div>
                    </div>
                  </div>

                  {/* Accent line */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Prediction Market Section - Premium Trading Dashboard */}
      <section id="trading" className="py-32 bg-gradient-to-b from-slate-50 via-blue-50/50 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-20 animate-fadeIn">
            <div className="inline-flex items-center gap-3 mb-6 px-4 py-2 rounded-full bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/50">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-sm font-bold text-red-700">Live Market</span>
            </div>
            <h2 className="text-5xl sm:text-6xl font-bold text-slate-900 mb-4">Live Trading Dashboard</h2>
            <p className="text-xl text-slate-600">Monitor real-time crypto prices and market movements</p>
          </div>

          {/* Trading Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-12">
            {cryptoAssets.map((asset, idx) => (
              <div key={idx} className="group relative animate-stagger-scale overflow-hidden rounded-2xl" style={{ animationDelay: `${idx * 120}ms` }}>
                {/* Premium trading card */}
                <div className="relative p-6 h-full bg-white/50 hover:bg-white/70 border border-white/70 hover:border-white/90 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm rounded-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>

                  <div className="relative space-y-4">
                    {/* Asset Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 text-white flex items-center justify-center text-xl font-bold shadow-md group-hover:scale-110 transition-transform">
                        {asset.icon}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{asset.symbol}</p>
                        <p className="text-xs text-slate-500">{asset.name}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div>
                      <p className="text-3xl font-bold text-slate-900 mb-2">{asset.price}</p>
                    </div>

                    {/* Change indicators */}
                    <div className="flex gap-2">
                      <div className={`flex-1 py-2 rounded-lg font-bold text-white text-center text-sm transition-all ${asset.change.startsWith('+') ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg' : 'bg-gradient-to-r from-red-500 to-pink-600 hover:shadow-lg'}`}>
                        {asset.change.startsWith('+') ? '↑ UP' : '↓ DOWN'}
                      </div>
                      <div className={`flex-1 py-2 rounded-lg font-bold text-center text-sm border-2 transition-all ${asset.change.startsWith('+') ? 'text-green-600 border-green-300 bg-green-50/50' : 'text-red-600 border-red-300 bg-red-50/50'}`}>
                        {asset.change}
                      </div>
                    </div>
                  </div>

                  {/* Bottom accent line */}
                  <div className={`absolute bottom-0 left-0 right-0 h-1 ${asset.change.startsWith('+') ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-pink-500'} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Premium Features Badge Section */}
          <div className="relative overflow-hidden rounded-3xl p-12 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-stagger-slide-right delay-200">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-48 -mt-48 animate-float-slow"></div>

            <div className="relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-white">
                <div className="group">
                  <div className="flex items-center gap-3 mb-3 hover:scale-110 transition-transform">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Shield className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-lg">Secure & Safe</p>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">Bank-level security protocols protect all transactions and data</p>
                </div>

                <div className="group">
                  <div className="flex items-center gap-3 mb-3 hover:scale-110 transition-transform">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Lock className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-lg">Transparent System</p>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">100% transparent operations with real-time tracking and verification</p>
                </div>

                <div className="group">
                  <div className="flex items-center gap-3 mb-3 hover:scale-110 transition-transform">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Zap className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-lg">Fast & Automated</p>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">Instant tracking and automated payouts every second</p>
                </div>

                <div className="group">
                  <div className="flex items-center gap-3 mb-3 hover:scale-110 transition-transform">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-lg">Community Driven</p>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">Built for members, by members with collective growth</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Footer */}
      <footer className="bg-gradient-to-b from-slate-900 via-slate-900 to-black text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <FlowChainLogo variant="icon" size="sm" />
                <span className="font-bold text-xl">FlowChain</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Building a community-driven financial platform with zero fees and unlimited rewards.</p>
              <div className="flex gap-2 pt-2">
                <div className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors"></div>
                <div className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors"></div>
                <div className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors"></div>
              </div>
            </div>

            {/* Product Links */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg">Product</h4>
              <ul className="space-y-2">
                <li><a href="#rewards" className="text-slate-400 hover:text-white transition-colors">Rewards</a></li>
                <li><a href="#benefits" className="text-slate-400 hover:text-white transition-colors">Benefits</a></li>
                <li><a href="#trading" className="text-slate-400 hover:text-white transition-colors">Trading</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>

            {/* Company Links */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-8"></div>

          {/* Bottom Footer */}
          <div className="flex flex-col md:flex-row items-center justify-between">
            <p className="text-slate-500 text-sm">&copy; 2025 FlowChain. All rights reserved.</p>
            <p className="text-slate-500 text-sm">Made with ❤️ for the community</p>
          </div>
        </div>
      </footer>

      <AIChatbotDialog />
      <LearnMoreDialog />
    </div>
  )
}
