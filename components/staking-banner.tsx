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
      className={`relative w-full rounded-2xl overflow-hidden transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
      style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
        border: "1px solid rgba(124, 58, 237, 0.25)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)"
      }}
    >
      {/* Subtle accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg,transparent,rgba(124,58,237,0.6),rgba(99,102,241,0.6),transparent)" }} />

      {/* Content — compact padding */}
      <div className="relative px-3 py-3">
        <StakingModule
          currentBalance={currentBalance}
          participantEmail={participantEmail}
          onBalanceUpdated={onBalanceUpdated}
        />
      </div>
    </div>
  )
}
