"use client"
import { Zap, TrendingUp, Star, Lock, Flame } from "lucide-react"
import { useState, useEffect } from "react"

export function StakingBanner() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div
      className={`relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl transition-all duration-700 ${
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
      style={{
        background: "linear-gradient(135deg, rgba(251, 146, 60, 0.15) 0%, rgba(249, 115, 22, 0.15) 50%, rgba(234, 179, 8, 0.15) 100%)",
        border: "1px solid rgba(251, 146, 60, 0.3)",
      }}
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-orange-400/20 via-amber-400/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-br from-yellow-400/20 via-orange-400/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        
        {/* Animated flame particles */}
        <div className="absolute top-10 right-10 w-12 h-12 bg-gradient-to-br from-red-400/30 to-orange-400/20 rounded-full blur-xl animate-bounce" style={{ animationDuration: "3s" }} />
        <div className="absolute bottom-20 left-1/4 w-8 h-8 bg-gradient-to-br from-yellow-400/30 to-orange-400/20 rounded-full blur-lg animate-bounce" style={{ animationDuration: "2.5s", animationDelay: "0.5s" }} />
      </div>

      {/* Content */}
      <div className="relative px-4 sm:px-6 py-6 sm:py-8 space-y-4">
        {/* Header with badge */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg flex-shrink-0">
              <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">Staking Rewards</h3>
              <p className="text-xs sm:text-sm text-slate-600">Lock your winnings & earn passive income</p>
            </div>
          </div>
          <div className="bg-red-100 text-red-700 text-xs sm:text-sm font-bold px-3 py-1.5 rounded-full flex items-center gap-1 flex-shrink-0">
            <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            NEW
          </div>
        </div>

        {/* Main CTA Section */}
        <div className="bg-gradient-to-r from-white/60 to-white/40 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-white/50">
          <div className="flex items-start gap-3 sm:gap-4 mb-4">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
              <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-1">Coming Soon</h4>
              <p className="text-sm sm:text-base text-slate-700">
                Stake your Flowchain coins and earn <span className="font-bold text-orange-600">8-15% APY</span> in rewards
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="bg-white/70 rounded-lg p-2.5 sm:p-3 text-center">
              <div className="text-xs text-slate-600 mb-0.5">Min Stake</div>
              <div className="text-sm sm:text-base font-bold text-orange-600">$100</div>
            </div>
            <div className="bg-white/70 rounded-lg p-2.5 sm:p-3 text-center">
              <div className="text-xs text-slate-600 mb-0.5">Lock Period</div>
              <div className="text-sm sm:text-base font-bold text-orange-600">30 Days</div>
            </div>
          </div>
        </div>

        {/* Flowchain Coin Listing Announcement */}
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-purple-300/50 backdrop-blur-sm">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
                🚀 Flowchain Coin Exchange Listing
              </h4>
              <p className="text-sm sm:text-base text-slate-700 mb-2">
                Get ready! Flowchain (FLOW) token will be listed on major exchanges very soon. Early stakers will get exclusive pre-launch benefits and higher rewards!
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-block bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  Early Access
                </span>
                <span className="inline-block bg-pink-100 text-pink-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  Extra Rewards
                </span>
                <span className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  Exclusive Bonus
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button className="w-full relative overflow-hidden group rounded-xl sm:rounded-2xl px-4 py-3 sm:py-4 font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-lg text-sm sm:text-base"
          style={{
            background: "linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%)",
            boxShadow: "0 8px 24px rgba(249, 115, 22, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
          <div className="relative flex items-center justify-center gap-2">
            <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Notify Me for Staking Launch</span>
          </div>
        </button>

        {/* Info text */}
        <p className="text-center text-xs sm:text-sm text-slate-600">
          Be among the first to stake and earn exclusive bonuses when staking launches
        </p>
      </div>
    </div>
  )
}
