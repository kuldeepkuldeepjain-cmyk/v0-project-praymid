"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Star, Crown, Target, Award, Zap, Users, Wallet, CheckCircle2, Lock } from "lucide-react"

interface Milestone {
  id: string
  title: string
  description: string
  icon: "trophy" | "medal" | "star" | "crown" | "target" | "award" | "zap" | "users" | "wallet"
  requirement: number
  current: number
  reward: number
  category: "participation" | "contribution" | "referral" | "streak"
  unlocked: boolean
  celebrationShown: boolean
}

interface MilestoneCelebrationsProps {
  participationCount: number
  totalContributed: number
  referralCount: number
  currentStreak: number
  onMilestoneUnlock?: (milestone: Milestone) => void
}

const iconMap = {
  trophy: Trophy,
  medal: Medal,
  star: Star,
  crown: Crown,
  target: Target,
  award: Award,
  zap: Zap,
  users: Users,
  wallet: Wallet,
}

export function MilestoneCelebrations({
  participationCount = 0,
  totalContributed = 0,
  referralCount = 0,
  currentStreak = 0,
  onMilestoneUnlock,
}: MilestoneCelebrationsProps) {
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebratingMilestone, setCelebratingMilestone] = useState<Milestone | null>(null)

  const milestones: Milestone[] = [
    // Participation milestones
    {
      id: "first_step",
      title: "First Step",
      description: "Complete your first participation",
      icon: "star",
      requirement: 1,
      current: participationCount,
      reward: 50,
      category: "participation",
      unlocked: participationCount >= 1,
      celebrationShown: false,
    },
    {
      id: "getting_started",
      title: "Getting Started",
      description: "Complete 5 participations",
      icon: "medal",
      requirement: 5,
      current: participationCount,
      reward: 100,
      category: "participation",
      unlocked: participationCount >= 5,
      celebrationShown: false,
    },
    {
      id: "dedicated",
      title: "Dedicated Member",
      description: "Complete 10 participations",
      icon: "trophy",
      requirement: 10,
      current: participationCount,
      reward: 250,
      category: "participation",
      unlocked: participationCount >= 10,
      celebrationShown: false,
    },
    {
      id: "veteran",
      title: "Veteran",
      description: "Complete 25 participations",
      icon: "award",
      requirement: 25,
      current: participationCount,
      reward: 500,
      category: "participation",
      unlocked: participationCount >= 25,
      celebrationShown: false,
    },
    {
      id: "legend",
      title: "Legend",
      description: "Complete 50 participations",
      icon: "crown",
      requirement: 50,
      current: participationCount,
      reward: 1000,
      category: "participation",
      unlocked: participationCount >= 50,
      celebrationShown: false,
    },

    // Contribution milestones
    {
      id: "contributor",
      title: "Contributor",
      description: "Contribute $500 total",
      icon: "wallet",
      requirement: 500,
      current: totalContributed,
      reward: 100,
      category: "contribution",
      unlocked: totalContributed >= 500,
      celebrationShown: false,
    },
    {
      id: "supporter",
      title: "Supporter",
      description: "Contribute $1,000 total",
      icon: "wallet",
      requirement: 1000,
      current: totalContributed,
      reward: 200,
      category: "contribution",
      unlocked: totalContributed >= 1000,
      celebrationShown: false,
    },
    {
      id: "champion",
      title: "Champion",
      description: "Contribute $5,000 total",
      icon: "wallet",
      requirement: 5000,
      current: totalContributed,
      reward: 500,
      category: "contribution",
      unlocked: totalContributed >= 5000,
      celebrationShown: false,
    },

    // Streak milestones
    {
      id: "consistent",
      title: "Consistent",
      description: "Maintain a 7-day streak",
      icon: "zap",
      requirement: 7,
      current: currentStreak,
      reward: 100,
      category: "streak",
      unlocked: currentStreak >= 7,
      celebrationShown: false,
    },
    {
      id: "unstoppable",
      title: "Unstoppable",
      description: "Maintain a 30-day streak",
      icon: "zap",
      requirement: 30,
      current: currentStreak,
      reward: 500,
      category: "streak",
      unlocked: currentStreak >= 30,
      celebrationShown: false,
    },

    // Referral milestones
    {
      id: "networker",
      title: "Networker",
      description: "Refer 3 friends",
      icon: "users",
      requirement: 3,
      current: referralCount,
      reward: 150,
      category: "referral",
      unlocked: referralCount >= 3,
      celebrationShown: false,
    },
    {
      id: "influencer",
      title: "Influencer",
      description: "Refer 10 friends",
      icon: "users",
      requirement: 10,
      current: referralCount,
      reward: 500,
      category: "referral",
      unlocked: referralCount >= 10,
      celebrationShown: false,
    },
  ]

  const unlockedCount = milestones.filter((m) => m.unlocked).length
  const totalRewards = milestones.filter((m) => m.unlocked).reduce((acc, m) => acc + m.reward, 0)

  const triggerCelebration = (milestone: Milestone) => {
    setCelebratingMilestone(milestone)
    setShowCelebration(true)
    if (onMilestoneUnlock) {
      onMilestoneUnlock(milestone)
    }
    setTimeout(() => {
      setShowCelebration(false)
      setCelebratingMilestone(null)
    }, 4000)
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "participation":
        return "from-violet-500 to-purple-600"
      case "contribution":
        return "from-[#E85D3B] to-[#d94f30]"
      case "streak":
        return "from-amber-500 to-orange-500"
      case "referral":
        return "from-emerald-500 to-green-600"
      default:
        return "from-violet-500 to-purple-600"
    }
  }

  return (
    <Card className="bg-white border border-slate-200 shadow-lg overflow-hidden relative">
      {/* Celebration Overlay */}
      {showCelebration && celebratingMilestone && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center animate-bounce">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-xl">
              <Trophy className="h-12 w-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Milestone Unlocked!</h3>
            <p className="text-xl text-violet-600 font-semibold mb-2">{celebratingMilestone.title}</p>
            <p className="text-slate-500 mb-4">{celebratingMilestone.description}</p>
            <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-lg px-4 py-2">
              +{celebratingMilestone.reward} Points
            </Badge>
          </div>
          {/* Confetti */}
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                backgroundColor: ["#E85D3B", "#7c3aed", "#f59e0b", "#10b981"][Math.floor(Math.random() * 4)],
                animationDelay: `${Math.random() * 1}s`,
                animationDuration: `${1 + Math.random()}s`,
              }}
            />
          ))}
        </div>
      )}

      <CardHeader className="pb-2 bg-gradient-to-r from-violet-50 to-purple-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-[#E85D3B] flex items-center justify-center shadow-md">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            Milestones
          </CardTitle>
          <Badge className="bg-violet-100 text-violet-700 border border-violet-200">
            {unlockedCount}/{milestones.length} Unlocked
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-6">
        {/* Total Rewards */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-violet-50 to-orange-50 border border-violet-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Rewards Earned</p>
              <p className="text-2xl font-bold text-slate-800">{totalRewards} pts</p>
            </div>
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Award className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        {/* Milestone List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {milestones.map((milestone) => {
            const IconComponent = iconMap[milestone.icon]
            const progress = Math.min((milestone.current / milestone.requirement) * 100, 100)

            return (
              <div
                key={milestone.id}
                className={`p-4 rounded-xl border transition-all duration-300 ${
                  milestone.unlocked
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-slate-50 border-slate-200 hover:border-violet-300"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                      milestone.unlocked ? `bg-gradient-to-br ${getCategoryColor(milestone.category)}` : "bg-slate-200"
                    }`}
                  >
                    {milestone.unlocked ? (
                      <IconComponent className="h-6 w-6 text-white" />
                    ) : (
                      <Lock className="h-5 w-5 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-semibold ${milestone.unlocked ? "text-slate-800" : "text-slate-500"}`}>
                        {milestone.title}
                      </h4>
                      {milestone.unlocked && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{milestone.description}</p>

                    {!milestone.unlocked && (
                      <div className="space-y-1">
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${getCategoryColor(milestone.category)} rounded-full transition-all duration-500`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-400">
                          {milestone.current} / {milestone.requirement}
                        </p>
                      </div>
                    )}
                  </div>

                  <Badge
                    className={`shrink-0 ${
                      milestone.unlocked
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    +{milestone.reward}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
