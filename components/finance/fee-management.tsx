"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Percent, Info, TrendingDown, Shield, Zap, Crown, Gift, ArrowDown } from "lucide-react"

interface FeeStructure {
  tier: string
  baseFeePrecent: number
  description: string
  requirements: string
  benefits: string[]
}

interface FeeManagementProps {
  currentTier?: string
  currentFeePercent?: number
  totalFeesPaid?: number
  feesSavedThisMonth?: number
}

export function FeeManagement({
  currentTier = "Standard",
  currentFeePercent = 5,
  totalFeesPaid = 125.5,
  feesSavedThisMonth = 25.0,
}: FeeManagementProps) {
  const feeStructures: FeeStructure[] = [
    {
      tier: "Standard",
      baseFeePrecent: 5,
      description: "Default tier for all participants",
      requirements: "No requirements",
      benefits: ["Basic support", "Standard payout speed"],
    },
    {
      tier: "Silver",
      baseFeePrecent: 4,
      description: "Reduced fees for active participants",
      requirements: "10+ participations",
      benefits: ["Priority support", "Faster payouts", "1% fee reduction"],
    },
    {
      tier: "Gold",
      baseFeePrecent: 3,
      description: "Premium rates for top contributors",
      requirements: "25+ participations OR $5,000+ total",
      benefits: ["VIP support", "Same-day payouts", "2% fee reduction", "Exclusive events"],
    },
    {
      tier: "Platinum",
      baseFeePrecent: 2,
      description: "Elite rates for our best members",
      requirements: "50+ participations OR $10,000+ total",
      benefits: ["Dedicated manager", "Instant payouts", "3% fee reduction", "All event access", "Custom features"],
    },
  ]

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "Standard":
        return Shield
      case "Silver":
        return Zap
      case "Gold":
        return Crown
      case "Platinum":
        return Gift
      default:
        return Shield
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Standard":
        return { bg: "from-[#6b7280] to-[#4b5563]", text: "#9ca3af", border: "#6b7280" }
      case "Silver":
        return { bg: "from-[#c0c0c0] to-[#a8a8a8]", text: "#c0c0c0", border: "#c0c0c0" }
      case "Gold":
        return { bg: "from-[#ffd700] to-[#f59e0b]", text: "#ffd700", border: "#ffd700" }
      case "Platinum":
        return { bg: "from-[#22d3ee] to-[#06b6d4]", text: "#22d3ee", border: "#22d3ee" }
      default:
        return { bg: "from-[#6b7280] to-[#4b5563]", text: "#9ca3af", border: "#6b7280" }
    }
  }

  const currentTierIndex = feeStructures.findIndex((f) => f.tier === currentTier)
  const nextTier = feeStructures[currentTierIndex + 1]

  return (
    <Card className="bg-gradient-to-br from-[#1e1b4b] to-[#2e1065] border-[#7c3aed]/30 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] flex items-center justify-center">
              <Percent className="h-5 w-5 text-white" />
            </div>
            Fee Structure
          </CardTitle>
          <Badge
            className="border"
            style={{
              backgroundColor: `${getTierColor(currentTier).text}20`,
              color: getTierColor(currentTier).text,
              borderColor: `${getTierColor(currentTier).border}50`,
            }}
          >
            {currentTier} Tier
          </Badge>
        </div>
        <CardDescription className="text-[#9ca3af]">Your current fee rate and how to unlock lower fees</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Fee Display */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#7c3aed]/20 to-[#22d3ee]/20 border border-[#7c3aed]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#9ca3af]">Your Current Fee Rate</p>
              <p className="text-4xl font-bold text-white">{currentFeePercent}%</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-[#10b981]">
                <TrendingDown className="h-4 w-4" />
                <span className="text-sm font-medium">-${feesSavedThisMonth.toFixed(2)}</span>
              </div>
              <p className="text-xs text-[#9ca3af]">Saved this month</p>
            </div>
          </div>
        </div>

        {/* Fee Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-[#111827]/50 border border-[#374151]">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="h-4 w-4 text-[#ef4444]" />
              <span className="text-sm text-[#9ca3af]">Total Fees Paid</span>
            </div>
            <p className="text-xl font-bold text-white">${totalFeesPaid.toFixed(2)}</p>
          </div>
          <div className="p-4 rounded-xl bg-[#111827]/50 border border-[#374151]">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-4 w-4 text-[#10b981]" />
              <span className="text-sm text-[#9ca3af]">Total Saved</span>
            </div>
            <p className="text-xl font-bold text-[#10b981]">${feesSavedThisMonth.toFixed(2)}</p>
          </div>
        </div>

        {/* Next Tier Progress */}
        {nextTier && (
          <div className="p-4 rounded-xl bg-[#111827]/50 border border-[#374151]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[#9ca3af]">Upgrade to {nextTier.tier}</span>
              <Badge className="bg-[#f59e0b]/20 text-[#f59e0b] border-0 text-xs">
                <ArrowDown className="h-3 w-3 mr-1" />
                {currentFeePercent - nextTier.baseFeePrecent}% less
              </Badge>
            </div>
            <p className="text-xs text-[#6b7280] mb-2">{nextTier.requirements}</p>
            <div className="h-2 bg-[#374151] rounded-full overflow-hidden">
              <div className="h-full w-3/5 bg-gradient-to-r from-[#7c3aed] to-[#22d3ee] rounded-full" />
            </div>
          </div>
        )}

        {/* Fee Tiers */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-[#9ca3af] flex items-center gap-1">
            <Info className="h-3 w-3" />
            All Fee Tiers
          </h4>
          <div className="space-y-2">
            {feeStructures.map((structure) => {
              const TierIcon = getTierIcon(structure.tier)
              const colors = getTierColor(structure.tier)
              const isCurrentTier = structure.tier === currentTier

              return (
                <div
                  key={structure.tier}
                  className={`p-4 rounded-xl border transition-all duration-300 ${
                    isCurrentTier
                      ? "bg-[#22d3ee]/10 border-[#22d3ee]/30"
                      : "bg-[#111827]/50 border-[#374151] hover:border-[#7c3aed]/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${colors.bg}`}
                    >
                      <TierIcon className="h-6 w-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white">{structure.tier}</h4>
                        {isCurrentTier && (
                          <Badge className="bg-[#22d3ee]/20 text-[#22d3ee] border-0 text-xs">Current</Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#9ca3af]">{structure.requirements}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold" style={{ color: colors.text }}>
                        {structure.baseFeePrecent}%
                      </p>
                      <p className="text-xs text-[#6b7280]">fee rate</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
