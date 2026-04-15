"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Gift, Flame, CheckCircle2, Lock, Sparkles, Calendar, Zap, Trophy } from "lucide-react"

interface DailyReward {
  day: number
  points: number
  bonus?: string
  claimed: boolean
  unlocked: boolean
}

interface DailyRewardsProps {
  currentStreak: number
  lastClaimDate?: string
  totalPointsEarned: number
  onClaimReward?: (day: number, points: number) => void
}

export function DailyRewards({
  currentStreak = 0,
  lastClaimDate,
  totalPointsEarned = 0,
  onClaimReward,
}: DailyRewardsProps) {
  const [rewards, setRewards] = useState<DailyReward[]>([])
  const [canClaimToday, setCanClaimToday] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    // Generate 7-day reward cycle
    const baseRewards: DailyReward[] = [
      { day: 1, points: 10, claimed: false, unlocked: true },
      { day: 2, points: 15, claimed: false, unlocked: false },
      { day: 3, points: 20, claimed: false, unlocked: false },
      { day: 4, points: 25, claimed: false, unlocked: false },
      { day: 5, points: 35, bonus: "2x Bonus", claimed: false, unlocked: false },
      { day: 6, points: 45, claimed: false, unlocked: false },
      { day: 7, points: 100, bonus: "Weekly Jackpot", claimed: false, unlocked: false },
    ]

    // Mark rewards based on current streak
    const updatedRewards = baseRewards.map((reward, index) => ({
      ...reward,
      claimed: index < currentStreak,
      unlocked: index <= currentStreak,
    }))

    setRewards(updatedRewards)

    // Check if user can claim today
    if (lastClaimDate) {
      const lastClaim = new Date(lastClaimDate)
      const today = new Date()
      const diffTime = today.getTime() - lastClaim.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      setCanClaimToday(diffDays >= 1)
    } else {
      setCanClaimToday(true)
    }
  }, [currentStreak, lastClaimDate])

  const handleClaim = (day: number, points: number) => {
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 3000)

    if (onClaimReward) {
      onClaimReward(day, points)
    }
  }

  const currentDayReward = rewards.find((r) => !r.claimed && r.unlocked)

  return (
    <Card className="bg-white border border-slate-200 shadow-lg overflow-hidden relative">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                backgroundColor: ["#E85D3B", "#7c3aed", "#f59e0b", "#10b981"][Math.floor(Math.random() * 4)],
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${0.5 + Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      <CardHeader className="pb-2 bg-gradient-to-r from-orange-50 to-amber-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#ea580c] flex items-center justify-center shadow-md">
              <Gift className="h-5 w-5 text-white" />
            </div>
            Daily Rewards
          </CardTitle>
          <Badge className="bg-orange-100 text-orange-700 border border-orange-200">
            <Flame className="h-3 w-3 mr-1" />
            {currentStreak} Day Streak
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-6">
        {/* Streak Progress */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-600">Weekly Progress</span>
            <span className="text-sm font-medium text-violet-600">{currentStreak}/7 Days</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-[#E85D3B] rounded-full transition-all duration-500"
              style={{ width: `${(currentStreak / 7) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {rewards.map((reward) => (
              <div
                key={reward.day}
                className={`h-1.5 w-1.5 rounded-full ${reward.claimed ? "bg-[#E85D3B]" : "bg-slate-300"}`}
              />
            ))}
          </div>
        </div>

        {/* Reward Cards */}
        <div className="grid grid-cols-7 gap-2">
          {rewards.map((reward) => (
            <div
              key={reward.day}
              className={`relative p-2 rounded-lg text-center transition-all duration-300 ${
                reward.claimed
                  ? "bg-emerald-50 border border-emerald-200"
                  : reward.unlocked
                    ? "bg-violet-50 border border-violet-300 animate-pulse"
                    : "bg-slate-50 border border-slate-200 opacity-50"
              }`}
            >
              {reward.bonus && (
                <div className="absolute -top-1 -right-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                </div>
              )}
              <div className="text-xs text-slate-500 mb-1">Day {reward.day}</div>
              <div className="flex items-center justify-center mb-1">
                {reward.claimed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : reward.unlocked ? (
                  <Gift className="h-5 w-5 text-violet-500" />
                ) : (
                  <Lock className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <div
                className={`text-xs font-bold ${
                  reward.claimed ? "text-emerald-600" : reward.unlocked ? "text-slate-800" : "text-slate-400"
                }`}
              >
                +{reward.points}
              </div>
            </div>
          ))}
        </div>

        {/* Claim Button */}
        {currentDayReward && canClaimToday && (
          <Button
            onClick={() => handleClaim(currentDayReward.day, currentDayReward.points)}
            className="w-full h-12 bg-gradient-to-r from-[#E85D3B] to-[#d94f30] hover:from-[#d94f30] hover:to-[#c44528] text-white font-semibold shadow-lg"
          >
            <Gift className="h-4 w-4 mr-2" />
            Claim Day {currentDayReward.day} Reward (+{currentDayReward.points} pts)
          </Button>
        )}

        {!canClaimToday && currentStreak > 0 && (
          <div className="text-center p-4 rounded-xl bg-slate-50 border border-slate-200">
            <Calendar className="h-6 w-6 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Come back tomorrow to continue your streak!</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
            <Zap className="h-4 w-4 text-amber-600 mx-auto mb-1" />
            <div className="text-lg font-bold text-slate-800">{totalPointsEarned}</div>
            <div className="text-xs text-slate-500">Total Points</div>
          </div>
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-center">
            <Flame className="h-4 w-4 text-red-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-slate-800">{currentStreak}</div>
            <div className="text-xs text-slate-500">Current Streak</div>
          </div>
          <div className="p-3 rounded-lg bg-violet-50 border border-violet-200 text-center">
            <Trophy className="h-4 w-4 text-violet-600 mx-auto mb-1" />
            <div className="text-lg font-bold text-slate-800">{Math.floor(currentStreak / 7)}</div>
            <div className="text-xs text-slate-500">Weeks Done</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
