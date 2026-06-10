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
            <div className="relative hidden sm:flex h-[300px] sm:h-[400px] lg:h-[600px] items-center justify-center animate-fadeIn delay-200">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-100/30 to-pink-100/30 rounded-3xl blur-2xl"></div>
              
              {/* Spin Wheel */}
              <div className="absolute right-12 top-10 sm:right-20 sm:top-20 animate-spin-slow">
                <svg width="280" height="280" viewBox="0 0 280 280" className="filter drop-shadow-2xl">
                  {/* Outer circle ring */}
                  <circle cx="140" cy="140" r="135" fill="none" stroke="url(#wheelGradient)" strokeWidth="3" opacity="0.8"/>
                  {/* Inner circles */}
                  <circle cx="140" cy="140" r="120" fill="url(#wheelBg)"/>
                  
                  <defs>
                    <linearGradient id="wheelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#9b59b6"/>
                      <stop offset="50%" stopColor="#e74c3c"/>
                      <stop offset="100%" stopColor="#3498db"/>
                    </linearGradient>
                    <radialGradient id="wheelBg">
                      <stop offset="0%" stopColor="#f5f3ff"/>
                      <stop offset="100%" stopColor="#e8d5f2"/>
                    </radialGradient>
                  </defs>
                  
                  {/* Segments with text */}
                  <g textAnchor="middle" dominantBaseline="middle" fontSize="20" fontWeight="bold">
                    {/* 3.0x - top */}
                    <text x="140" y="35" fill="#f97316">3.0x</text>
                    {/* 2.5x - top right */}
                    <text x="210" y="80" fill="#ec4899">2.5x</text>
                    {/* 5.0x - right */}
                    <text x="235" y="140" fill="#8b5cf6">5.0x</text>
                    {/* 0.5x - bottom right */}
                    <text x="210" y="200" fill="#06b6d4">0.5x</text>
                    {/* 2.0x - bottom */}
                    <text x="140" y="240" fill="#22c55e">2.0x</text>
                    {/* 1.5x - bottom left */}
                    <text x="70" y="200" fill="#f59e0b">1.5x</text>
                    {/* 4.0x - left */}
                    <text x="45" y="140" fill="#ec4899">4.0x</text>
                    {/* 10.0x - top left */}
                    <text x="70" y="80" fill="#22c55e">10.0x</text>
                  </g>
                </svg>
                
                {/* Center button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-black rounded-full flex items-center justify-center cursor-pointer hover:shadow-2xl transition-all duration-300">
                      <div className="text-center">
                        <p className="text-white font-bold text-xs sm:text-sm">SPIN</p>
                        <p className="text-white font-bold text-lg sm:text-2xl">WIN BIG</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pointer triangle at top */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                  <div className="w-0 h-0 border-l-8 border-r-8 border-t-12 border-l-transparent border-r-transparent border-t-pink-500"></div>
                </div>
              </div>

              {/* Mystery Chest */}
              <div className="absolute left-0 bottom-10 sm:bottom-20 w-32 sm:w-48 h-24 sm:h-32 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-lg shadow-2xl overflow-hidden animate-bounce-slow">
                {/* Chest shine effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent"></div>
                {/* Chest interior */}
                <div className="absolute inset-2 bg-gradient-to-b from-purple-500 to-purple-700 rounded">
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                    <div className="text-2xl sm:text-4xl">💰</div>
                    <p className="text-white font-bold text-xs sm:text-sm">Mystery Chest</p>
                    <p className="text-orange-300 font-bold text-sm sm:text-xl">Win upto</p>
                    <p className="text-orange-300 font-bold text-lg sm:text-2xl">$1000</p>
                  </div>
                </div>
              </div>

              {/* Crypto coin decorations */}
              <div className="absolute top-20 right-8 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg text-2xl sm:text-3xl">
                ₿
              </div>
              <div className="absolute bottom-32 right-12 w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg text-xl sm:text-2xl">
                ₿
              </div>
              <div className="absolute bottom-40 left-8 w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg text-xl sm:text-2xl">
                ◆
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

      {/* Live Trading Dashboard */}
      <section id="trading" className="py-12 sm:py-20 lg:py-32 bg-gradient-to-b from-slate-50 via-blue-50/50 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 sm:mb-12 lg:mb-20 animate-fadeIn">
            <div className="inline-flex items-center gap-2 mb-4 sm:mb-6 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/50">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-xs sm:text-sm font-bold text-red-700">Live Market</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-900 mb-2 sm:mb-4">Live Trading Dashboard</h2>
            <p className="text-base sm:text-xl text-slate-600">Monitor real-time crypto prices and market movements</p>
          </div>

          {/* Trading Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-10 lg:mb-12">
            {cryptoAssets.map((asset, idx) => (
              <div key={idx} className="group relative animate-stagger-scale overflow-hidden rounded-2xl" style={{ animationDelay: `${idx * 120}ms` }}>
                <div className="relative p-4 sm:p-5 lg:p-6 h-full bg-white/50 hover:bg-white/70 border border-white/70 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm rounded-2xl">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 text-white flex items-center justify-center text-sm sm:text-lg lg:text-xl font-bold shadow-md flex-shrink-0">
                      {asset.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">{asset.symbol}</p>
                      <p className="text-[10px] sm:text-xs text-slate-500 truncate">{asset.name}</p>
                    </div>
                  </div>
                  <p className="text-lg sm:text-xl lg:text-3xl font-bold text-slate-900 mb-2 sm:mb-3">{asset.price}</p>
                  <div className="flex gap-1 sm:gap-2">
                    <div className={`flex-1 py-1 sm:py-2 rounded-lg font-bold text-white text-center text-[10px] sm:text-sm ${asset.change.startsWith('+') ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-pink-600'}`}>
                      {asset.change.startsWith('+') ? '↑ UP' : '↓ DN'}
                    </div>
                    <div className={`flex-1 py-1 sm:py-2 rounded-lg font-bold text-center text-[10px] sm:text-sm border ${asset.change.startsWith('+') ? 'text-green-600 border-green-300 bg-green-50/50' : 'text-red-600 border-red-300 bg-red-50/50'}`}>
                      {asset.change}
                    </div>
                  </div>
                  <div className={`absolute bottom-0 left-0 right-0 h-1 ${asset.change.startsWith('+') ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-pink-500'} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Features Badge Section */}
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-stagger-slide-right delay-200">
            <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-white/5 rounded-full blur-3xl -mr-32 sm:-mr-48 -mt-32 sm:-mt-48 animate-float-slow"></div>
            <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 lg:gap-8 text-white">
              {[
                { icon: Shield, title: "Secure & Safe", desc: "Bank-level security protocols protect all transactions" },
                { icon: Lock, title: "Transparent", desc: "100% transparent operations with real-time tracking" },
                { icon: Zap, title: "Fast & Automated", desc: "Instant tracking and automated payouts every second" },
                { icon: Users, title: "Community Driven", desc: "Built for members, by members with collective growth" },
              ].map((item, i) => {
                const Icon = item.icon
                return (
                  <div key={i} className="group">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <p className="font-bold text-sm sm:text-base lg:text-lg">{item.title}</p>
                    </div>
                    <p className="text-white/80 text-xs sm:text-sm leading-relaxed">{item.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-slate-900 via-slate-900 to-black text-white py-10 sm:py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-12 mb-8 sm:mb-12 lg:mb-16">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-2 lg:col-span-1 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 mb-2 sm:mb-4">
                <FlowChainLogo variant="icon" size="sm" />
                <span className="font-bold text-lg sm:text-xl">FlowChain</span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">Building a community-driven financial platform with zero fees and unlimited rewards.</p>
              <div className="flex gap-2 pt-1 sm:pt-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors"></div>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors"></div>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors"></div>
              </div>
            </div>

            {/* Product Links */}
            <div className="space-y-2 sm:space-y-4">
              <h4 className="font-bold text-sm sm:text-base lg:text-lg">Product</h4>
              <ul className="space-y-1 sm:space-y-2">
                <li><a href="#rewards" className="text-slate-400 hover:text-white transition-colors text-xs sm:text-sm">Rewards</a></li>
                <li><a href="#benefits" className="text-slate-400 hover:text-white transition-colors text-xs sm:text-sm">Benefits</a></li>
                <li><a href="#trading" className="text-slate-400 hover:text-white transition-colors text-xs sm:text-sm">Trading</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors text-xs sm:text-sm">Pricing</a></li>
              </ul>
            </div>

            {/* Company Links */}
            <div className="space-y-2 sm:space-y-4">
              <h4 className="font-bold text-sm sm:text-base lg:text-lg">Company</h4>
              <ul className="space-y-1 sm:space-y-2">
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors text-xs sm:text-sm">About</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors text-xs sm:text-sm">Blog</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors text-xs sm:text-sm">Careers</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors text-xs sm:text-sm">Contact</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-2 sm:space-y-4">
              <h4 className="font-bold text-sm sm:text-base lg:text-lg">Legal</h4>
              <ul className="space-y-1 sm:space-y-2">
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors text-xs sm:text-sm">Privacy</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors text-xs sm:text-sm">Terms</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors text-xs sm:text-sm">Security</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors text-xs sm:text-sm">Cookies</a></li>
              </ul>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6 sm:mb-8"></div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
            <p className="text-slate-500 text-xs sm:text-sm">&copy; 2025 FlowChain. All rights reserved.</p>
            <p className="text-slate-500 text-xs sm:text-sm">Made with love for the community</p>
          </div>
        </div>
      </footer>

      <AIChatbotDialog />
      <LearnMoreDialog />
    </div>
  )
}
