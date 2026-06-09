'use client'

import { ArrowRight, Gift, Zap, Shield, Menu, X, Play } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const liveActivities = [
  { name: 'Rahul', action: 'received', amount: '₹50 Bonus', time: '2 sec ago', icon: '👤', value: '+₹50' },
  { name: 'Sneha', action: 'unlocked', amount: '10x Multiplier', time: '8 sec ago', icon: '⭐', value: '10x' },
  { name: 'Priya', action: 'earned', amount: 'Community Reward', time: '12 sec ago', icon: '💰', value: '+₹230' },
  { name: 'Vikram', action: 'achieved', amount: 'Gold Rank', time: '19 sec ago', icon: '👑', value: '👑' },
  { name: 'New member', action: 'joined from India', amount: '', time: '25 sec ago', icon: '🇮🇳', value: '' },
]

export default function LandingPage() {
  const router = useRouter()
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentActivityIndex((prev) => (prev + 1) % liveActivities.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-900 to-slate-900 overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-b from-purple-500/30 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-t from-blue-500/30 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-20 px-4 md:px-8 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
            FC
          </div>
          <span className="text-lg font-bold text-white">FLOWCHAIN</span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-8">
          {['How It Works', 'Benefits', 'Binary Trading', 'Leaderboard', 'Roadmap', 'About Us'].map((item, idx) => (
            <a
              key={item}
              href="#"
              className={`text-sm font-medium transition ${
                idx === 2 ? 'text-purple-400 border-b-2 border-purple-400 pb-1' : 'text-slate-300 hover:text-white'
              }`}
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/participant/login')}
            className="hidden sm:block text-sm font-medium text-slate-300 hover:text-white transition"
          >
            Sign In
          </button>
          <button
            onClick={() => router.push('/participant/register')}
            className="px-6 py-2 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-semibold hover:shadow-xl hover:shadow-orange-500/30 transition"
          >
            Get Started
          </button>

          {/* Mobile Menu Button */}
          <button className="lg:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed top-16 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-b border-white/10 z-10">
          <div className="flex flex-col gap-4 p-4">
            {['How It Works', 'Benefits', 'Binary Trading', 'Leaderboard', 'Roadmap', 'About Us'].map((item) => (
              <a key={item} href="#" className="text-sm text-slate-300 hover:text-white transition py-2">
                {item}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 md:px-8 pt-20 md:pt-0">
        <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Trust Badge */}
            <div className="flex items-center gap-2 w-fit">
              <span className="text-2xl">⭐</span>
              <span className="text-sm font-semibold text-slate-300">Trusted by 50,000+ participants worldwide</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight text-pretty">
                <span className="text-white">Your Next</span>
                <br />
                <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-red-500 bg-clip-text text-transparent">Reward</span>
                <br />
                <span className="text-white">Is Waiting.</span>
              </h1>
              <p className="text-lg text-slate-300 max-w-md leading-relaxed">
                Join a global community, earn instant bonuses, spin for bigger rewards, and grow together with zero platform fees.
              </p>
            </div>

            {/* Feature Badges */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition">
                <Gift className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">₹50</div>
                  <div className="text-xs text-slate-400">Instant Bonus</div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition">
                <Zap className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">Up To</div>
                  <div className="text-xs text-slate-400">20x Rewards</div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition">
                <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">0%</div>
                  <div className="text-xs text-slate-400">Platform Fees</div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={() => router.push('/participant/register')}
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold hover:shadow-2xl hover:shadow-orange-500/40 transition"
              >
                Reveal My Reward <ArrowRight className="w-5 h-5" />
              </button>
              <button className="flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold transition backdrop-blur-sm">
                <Play className="w-5 h-5" /> Watch Video
              </button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-3 pt-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-slate-950" />
                ))}
              </div>
              <span className="text-sm text-slate-300">
                <strong className="text-white">2,847</strong> people joined today
              </span>
            </div>
          </div>

          {/* Right Content - Sphere + Activity */}
          <div className="relative h-96 md:h-[600px] flex flex-col items-center gap-8">
            {/* 3D Sphere */}
            <div className="relative w-80 h-80 md:w-96 md:h-96">
              {/* Glowing background */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/40 via-blue-500/40 to-indigo-600/40 rounded-full blur-3xl" />

              {/* Animated borders */}
              <div className="absolute inset-0 rounded-full border-4 border-purple-400/30 animate-pulse" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-2 rounded-full border-2 border-blue-400/20 animate-pulse" style={{ animationDuration: '4s', animationDelay: '0.5s' }} />

              {/* Floating Icons */}
              <div className="absolute -top-16 -left-12 w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-3xl animate-bounce" style={{ animationDelay: '-0.2s' }}>
                ₹
              </div>
              <div className="absolute -top-12 -right-8 w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-2xl animate-bounce" style={{ animationDelay: '-0.4s' }}>
                🎁
              </div>
              <div className="absolute -bottom-10 -left-4 w-16 h-16 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-2xl animate-bounce">
                🎯
              </div>
              <div className="absolute -bottom-8 -right-12 w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-3xl animate-bounce" style={{ animationDelay: '-0.6s' }}>
                ₿
              </div>

              {/* Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">FLOWCHAIN</div>
                  <div className="text-2xl font-bold text-orange-500 mt-2">🎁 ₹50</div>
                  <div className="text-sm text-slate-300">Instant Bonus</div>
                </div>

                {/* Spin Card */}
                <div className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-center">
                  <div className="text-xl font-bold">🎡 SPIN & WIN</div>
                  <div className="text-3xl font-black">UP TO 20x</div>
                  <div className="text-sm font-semibold">REWARDS</div>
                </div>

                {/* Platform Fees */}
                <div className="px-4 py-2 rounded-full bg-slate-900/50 border border-slate-700 text-sm font-semibold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" /> 0% PLATFORM FEES
                </div>
              </div>
            </div>

            {/* Live Activity Feed */}
            <div className="w-full max-w-sm bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">LIVE ACTIVITY</h3>
                <span className="flex items-center gap-1 text-xs text-red-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live
                </span>
              </div>

              <div className="space-y-3">
                {liveActivities.map((activity, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-lg transition ${
                      idx === currentActivityIndex ? 'bg-white/10 border border-white/20' : 'opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm flex-shrink-0">
                        {activity.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{activity.name}</p>
                        <p className="text-xs text-slate-400">{activity.action}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {activity.value && <p className="text-xs font-bold text-emerald-400">{activity.value}</p>}
                      <p className="text-xs text-slate-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/participant/dashboard"
                className="flex items-center justify-center gap-2 text-sm font-semibold text-purple-400 hover:text-purple-300 transition pt-2 border-t border-white/10"
              >
                View All Activity <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
