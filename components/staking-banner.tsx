"use client"

import { StakingModule } from "@/components/staking-module"
import { useState, useEffect } from "react"

interface StakingBannerProps {
  currentBalance?: number
  participantEmail?: string
  onBalanceUpdated?: (newBalance: number) => void
}

export function StakingBanner({
  currentBalance = 0,
  participantEmail = "",
  onBalanceUpdated,
}: StakingBannerProps) {
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
        background: "linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(59, 130, 246, 0.15) 50%, rgba(99, 102, 241, 0.15) 100%)",
        border: "1px solid rgba(168, 85, 247, 0.3)",
      }}
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-purple-400/20 via-blue-400/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-br from-indigo-400/20 via-purple-400/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Content */}
      <div className="relative px-4 sm:px-6 py-6 sm:py-8">
        <StakingModule
          currentBalance={currentBalance}
          participantEmail={participantEmail}
          onBalanceUpdated={onBalanceUpdated}
        />
      </div>
    </div>
  )
}
