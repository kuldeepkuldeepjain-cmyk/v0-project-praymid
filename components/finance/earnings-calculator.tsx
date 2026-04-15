"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Calculator, TrendingUp, DollarSign, Calendar, Percent, Info, Sparkles, ArrowRight } from "lucide-react"

interface EarningsCalculatorProps {
  currentBalance?: number
  platformFeePercent?: number
}

export function EarningsCalculator({ currentBalance = 0, platformFeePercent = 5 }: EarningsCalculatorProps) {
  const [contributionAmount, setContributionAmount] = useState(100)
  const [participationsPerMonth, setParticipationsPerMonth] = useState(4)
  const [months, setMonths] = useState(6)
  const [bonusMultiplier, setBonusMultiplier] = useState(1)

  const [projectedEarnings, setProjectedEarnings] = useState({
    gross: 0,
    fees: 0,
    net: 0,
    monthly: 0,
    roi: 0,
  })

  useEffect(() => {
    // Calculate projected earnings
    const baseRewardRate = 0.15 // 15% base reward per participation
    const totalParticipations = participationsPerMonth * months
    const grossContributions = contributionAmount * totalParticipations
    const grossRewards = grossContributions * baseRewardRate * bonusMultiplier
    const fees = grossRewards * (platformFeePercent / 100)
    const netRewards = grossRewards - fees
    const monthlyAvg = netRewards / months
    const roi = (netRewards / grossContributions) * 100

    setProjectedEarnings({
      gross: grossRewards,
      fees,
      net: netRewards,
      monthly: monthlyAvg,
      roi,
    })
  }, [contributionAmount, participationsPerMonth, months, bonusMultiplier, platformFeePercent])

  const presetAmounts = [50, 100, 250, 500, 1000]

  return (
    <Card className="bg-gradient-to-br from-[#1e1b4b] to-[#2e1065] border-[#7c3aed]/30 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            Earnings Calculator
          </CardTitle>
          <Badge className="bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30">
            <Sparkles className="h-3 w-3 mr-1" />
            Estimate
          </Badge>
        </div>
        <CardDescription className="text-[#9ca3af]">
          Calculate your potential rewards based on participation
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Contribution Amount */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-[#9ca3af]">Contribution Amount</Label>
            <span className="text-lg font-bold text-white">${contributionAmount}</span>
          </div>
          <div className="flex gap-2">
            {presetAmounts.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                className={`flex-1 ${
                  contributionAmount === amount
                    ? "border-[#22d3ee] bg-[#22d3ee]/10 text-[#22d3ee]"
                    : "border-[#374151] text-[#9ca3af] hover:border-[#7c3aed]"
                }`}
                onClick={() => setContributionAmount(amount)}
              >
                ${amount}
              </Button>
            ))}
          </div>
          <Input
            type="number"
            value={contributionAmount}
            onChange={(e) => setContributionAmount(Number(e.target.value))}
            className="bg-[#111827] border-[#374151] text-white"
          />
        </div>

        {/* Participations Per Month */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-[#9ca3af]">Participations per Month</Label>
            <span className="text-lg font-bold text-white">{participationsPerMonth}</span>
          </div>
          <Slider
            value={[participationsPerMonth]}
            onValueChange={([value]) => setParticipationsPerMonth(value)}
            min={1}
            max={20}
            step={1}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-[#6b7280]">
            <span>1</span>
            <span>5</span>
            <span>10</span>
            <span>15</span>
            <span>20</span>
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-[#9ca3af]">Duration (Months)</Label>
            <span className="text-lg font-bold text-white">{months}</span>
          </div>
          <Slider
            value={[months]}
            onValueChange={([value]) => setMonths(value)}
            min={1}
            max={24}
            step={1}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-[#6b7280]">
            <span>1</span>
            <span>6</span>
            <span>12</span>
            <span>18</span>
            <span>24</span>
          </div>
        </div>

        {/* Bonus Multiplier */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-[#9ca3af] flex items-center gap-1">
              Rank Bonus
              <Info className="h-3 w-3 text-[#6b7280]" />
            </Label>
            <Badge
              className={`${
                bonusMultiplier === 1
                  ? "bg-[#cd7f32]/20 text-[#cd7f32]"
                  : bonusMultiplier === 1.25
                    ? "bg-[#c0c0c0]/20 text-[#c0c0c0]"
                    : bonusMultiplier === 1.5
                      ? "bg-[#ffd700]/20 text-[#ffd700]"
                      : "bg-[#22d3ee]/20 text-[#22d3ee]"
              } border-0`}
            >
              {bonusMultiplier}x
            </Badge>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Bronze", value: 1, color: "#cd7f32" },
              { label: "Silver", value: 1.25, color: "#c0c0c0" },
              { label: "Gold", value: 1.5, color: "#ffd700" },
              { label: "Platinum", value: 2, color: "#22d3ee" },
            ].map((rank) => (
              <Button
                key={rank.label}
                variant="outline"
                size="sm"
                className={`${
                  bonusMultiplier === rank.value
                    ? "border-[#22d3ee] bg-[#22d3ee]/10"
                    : "border-[#374151] hover:border-[#7c3aed]"
                }`}
                style={{ color: rank.color }}
                onClick={() => setBonusMultiplier(rank.value)}
              >
                {rank.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-3 p-4 rounded-xl bg-[#111827]/50 border border-[#374151]">
          <h4 className="text-sm font-medium text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#22d3ee]" />
            Projected Results
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-[#1f2937] border border-[#374151]">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-[#10b981]" />
                <span className="text-xs text-[#9ca3af]">Net Rewards</span>
              </div>
              <p className="text-xl font-bold text-[#10b981]">${projectedEarnings.net.toFixed(2)}</p>
            </div>

            <div className="p-3 rounded-lg bg-[#1f2937] border border-[#374151]">
              <div className="flex items-center gap-2 mb-1">
                <Percent className="h-4 w-4 text-[#22d3ee]" />
                <span className="text-xs text-[#9ca3af]">ROI</span>
              </div>
              <p className="text-xl font-bold text-[#22d3ee]">{projectedEarnings.roi.toFixed(1)}%</p>
            </div>

            <div className="p-3 rounded-lg bg-[#1f2937] border border-[#374151]">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-[#f59e0b]" />
                <span className="text-xs text-[#9ca3af]">Monthly Avg</span>
              </div>
              <p className="text-xl font-bold text-[#f59e0b]">${projectedEarnings.monthly.toFixed(2)}</p>
            </div>

            <div className="p-3 rounded-lg bg-[#1f2937] border border-[#374151]">
              <div className="flex items-center gap-2 mb-1">
                <Percent className="h-4 w-4 text-[#ef4444]" />
                <span className="text-xs text-[#9ca3af]">Platform Fee</span>
              </div>
              <p className="text-xl font-bold text-[#ef4444]">${projectedEarnings.fees.toFixed(2)}</p>
            </div>
          </div>

          <p className="text-xs text-[#6b7280] text-center">
            * Estimates based on current reward rates. Actual results may vary.
          </p>
        </div>

        {/* CTA */}
        <Button className="w-full h-12 bg-gradient-to-r from-[#7c3aed] to-[#22d3ee] hover:from-[#6d28d9] hover:to-[#06b6d4] text-white font-semibold">
          Start Participating
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  )
}
