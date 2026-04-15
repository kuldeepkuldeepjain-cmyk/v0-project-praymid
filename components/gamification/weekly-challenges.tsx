"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Target, Gift, Zap, Users, Wallet, CheckCircle2, Sparkles, Timer } from "lucide-react"

interface Challenge {
  id: string
  title: string
  description: string
  type: "participation" | "contribution" | "referral" | "login"
  target: number
  current: number
  reward: number
  expiresAt: Date
  completed: boolean
  claimed: boolean
}

interface WeeklyChallengesProps {
  onClaimReward?: (challengeId: string, reward: number) => void
}

export function WeeklyChallenges({ onClaimReward }: WeeklyChallengesProps) {
  const [timeLeft, setTimeLeft] = useState<string>("")
  const [challenges, setChallenges] = useState<Challenge[]>([])

  useEffect(() => {
    // Calculate time until Sunday midnight
    const now = new Date()
    const sunday = new Date(now)
    sunday.setDate(now.getDate() + (7 - now.getDay()))
    sunday.setHours(23, 59, 59, 999)

    // Mock challenges - in real app, these would come from API
    const mockChallenges: Challenge[] = [
      {
        id: "wc_1",
        title: "Participation Sprint",
        description: "Complete 3 participations this week",
        type: "participation",
        target: 3,
        current: 1,
        reward: 150,
        expiresAt: sunday,
        completed: false,
        claimed: false,
      },
      {
        id: "wc_2",
        title: "Contribution Goal",
        description: "Contribute $200 this week",
        type: "contribution",
        target: 200,
        current: 100,
        reward: 200,
        expiresAt: sunday,
        completed: false,
        claimed: false,
      },
      {
        id: "wc_3",
        title: "Daily Dedication",
        description: "Log in 5 days this week",
        type: "login",
        target: 5,
        current: 3,
        reward: 100,
        expiresAt: sunday,
        completed: false,
        claimed: false,
      },
      {
        id: "wc_4",
        title: "Spread the Word",
        description: "Refer 1 friend this week",
        type: "referral",
        target: 1,
        current: 0,
        reward: 250,
        expiresAt: sunday,
        completed: false,
        claimed: false,
      },
    ]

    setChallenges(
      mockChallenges.map((c) => ({
        ...c,
        completed: c.current >= c.target,
      })),
    )

    // Update countdown every second
    const timer = setInterval(() => {
      const now = new Date()
      const diff = sunday.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft("Resetting...")
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`)
      } else {
        setTimeLeft(`${hours}h ${minutes}m`)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleClaim = (challenge: Challenge) => {
    if (onClaimReward) {
      onClaimReward(challenge.id, challenge.reward)
    }
    setChallenges((prev) => prev.map((c) => (c.id === challenge.id ? { ...c, claimed: true } : c)))
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "participation":
        return Target
      case "contribution":
        return Wallet
      case "referral":
        return Users
      case "login":
        return Zap
      default:
        return Target
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "participation":
        return "from-violet-500 to-purple-600"
      case "contribution":
        return "from-[#E85D3B] to-[#d94f30]"
      case "referral":
        return "from-emerald-500 to-green-600"
      case "login":
        return "from-amber-500 to-orange-500"
      default:
        return "from-violet-500 to-purple-600"
    }
  }

  const completedCount = challenges.filter((c) => c.completed).length
  const pendingRewards = challenges.filter((c) => c.completed && !c.claimed).reduce((acc, c) => acc + c.reward, 0)

  return (
    <Card className="bg-white border border-slate-200 shadow-lg overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-cyan-50 to-blue-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-md">
              <Target className="h-5 w-5 text-white" />
            </div>
            Weekly Challenges
          </CardTitle>
          <Badge className="bg-red-100 text-red-700 border border-red-200">
            <Timer className="h-3 w-3 mr-1" />
            {timeLeft}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-6">
        {/* Progress Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-slate-500">Completed</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {completedCount}/{challenges.length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-slate-500">Pending</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">+{pendingRewards}</p>
          </div>
        </div>

        {/* Challenge List */}
        <div className="space-y-3">
          {challenges.map((challenge) => {
            const IconComponent = getTypeIcon(challenge.type)
            const progress = Math.min((challenge.current / challenge.target) * 100, 100)

            return (
              <div
                key={challenge.id}
                className={`p-4 rounded-xl border transition-all duration-300 ${
                  challenge.completed
                    ? challenge.claimed
                      ? "bg-slate-50 border-slate-200 opacity-60"
                      : "bg-emerald-50 border-emerald-200"
                    : "bg-white border-slate-200 hover:border-violet-300"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${getTypeColor(challenge.type)} shadow-md`}
                  >
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-800">{challenge.title}</h4>
                      {challenge.completed && !challenge.claimed && <Sparkles className="h-4 w-4 text-amber-500" />}
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{challenge.description}</p>

                    <div className="space-y-1">
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            challenge.completed ? "bg-emerald-500" : `bg-gradient-to-r ${getTypeColor(challenge.type)}`
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400">
                          {challenge.current} / {challenge.target}
                        </p>
                        <Badge className="bg-violet-100 text-violet-600 border-0 text-xs">
                          +{challenge.reward} pts
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {challenge.completed && !challenge.claimed && (
                    <Button
                      size="sm"
                      onClick={() => handleClaim(challenge)}
                      className="shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md"
                    >
                      Claim
                    </Button>
                  )}

                  {challenge.claimed && (
                    <Badge className="bg-emerald-100 text-emerald-600 border-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Claimed
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Bonus Info */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-violet-50 to-orange-50 border border-violet-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">Complete All Challenges</p>
              <p className="text-xs text-slate-500">Earn a bonus 500 points for completing all weekly challenges!</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
