"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  Gift,
  Calendar,
  Clock,
  Trophy,
  Star,
  Flame,
  Snowflake,
  Sun,
  Leaf,
  PartyPopper,
  Crown,
  Gem,
  ArrowRight,
} from "lucide-react"

interface SeasonalEvent {
  id: string
  name: string
  description: string
  theme: "winter" | "spring" | "summer" | "autumn" | "special"
  startDate: Date
  endDate: Date
  rewards: {
    tier: string
    requirement: number
    reward: string
    points: number
  }[]
  currentProgress: number
  isActive: boolean
}

interface SeasonalEventsProps {
  participationCount: number
}

export function SeasonalEvents({ participationCount = 0 }: SeasonalEventsProps) {
  const [currentEvent, setCurrentEvent] = useState<SeasonalEvent | null>(null)
  const [timeLeft, setTimeLeft] = useState<string>("")

  useEffect(() => {
    // Mock current event - in real app, this would come from API
    const now = new Date()
    const eventEnd = new Date(now)
    eventEnd.setDate(eventEnd.getDate() + 14) // 2 weeks from now

    const mockEvent: SeasonalEvent = {
      id: "new_year_2025",
      name: "New Year Celebration",
      description: "Ring in 2025 with exclusive rewards and bonuses!",
      theme: "special",
      startDate: new Date("2025-01-01"),
      endDate: eventEnd,
      rewards: [
        { tier: "Participant", requirement: 1, reward: "New Year Badge", points: 100 },
        { tier: "Enthusiast", requirement: 5, reward: "Golden Firework Avatar", points: 300 },
        { tier: "Champion", requirement: 10, reward: "2025 Trophy", points: 500 },
        { tier: "Legend", requirement: 25, reward: "Diamond Crown + 2x Bonus", points: 1500 },
      ],
      currentProgress: participationCount,
      isActive: true,
    }

    setCurrentEvent(mockEvent)

    // Update countdown
    const timer = setInterval(() => {
      const now = new Date()
      const diff = eventEnd.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft("Event Ended")
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      setTimeLeft(`${days}d ${hours}h ${minutes}m`)
    }, 1000)

    return () => clearInterval(timer)
  }, [participationCount])

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case "winter":
        return Snowflake
      case "spring":
        return Leaf
      case "summer":
        return Sun
      case "autumn":
        return Leaf
      case "special":
        return PartyPopper
      default:
        return Star
    }
  }

  const getThemeGradient = (theme: string) => {
    switch (theme) {
      case "winter":
        return "from-cyan-400 via-blue-500 to-violet-500"
      case "spring":
        return "from-emerald-400 via-cyan-400 to-violet-400"
      case "summer":
        return "from-amber-400 via-orange-500 to-pink-500"
      case "autumn":
        return "from-amber-500 via-orange-500 to-red-500"
      case "special":
        return "from-amber-400 via-pink-500 to-violet-500"
      default:
        return "from-violet-500 to-[#E85D3B]"
    }
  }

  const getTierIcon = (index: number) => {
    switch (index) {
      case 0:
        return Star
      case 1:
        return Trophy
      case 2:
        return Crown
      case 3:
        return Gem
      default:
        return Star
    }
  }

  if (!currentEvent) {
    return (
      <Card className="bg-white border border-slate-200 shadow-lg">
        <CardContent className="p-8 text-center">
          <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No Active Events</h3>
          <p className="text-sm text-slate-500">Check back soon for seasonal events and promotions!</p>
        </CardContent>
      </Card>
    )
  }

  const ThemeIcon = getThemeIcon(currentEvent.theme)
  const currentTierIndex = currentEvent.rewards.findIndex((r) => currentEvent.currentProgress < r.requirement)
  const nextTier = currentEvent.rewards[currentTierIndex] || currentEvent.rewards[currentEvent.rewards.length - 1]
  const prevTier = currentEvent.rewards[currentTierIndex - 1]
  const progressToNextTier = prevTier
    ? ((currentEvent.currentProgress - prevTier.requirement) / (nextTier.requirement - prevTier.requirement)) * 100
    : (currentEvent.currentProgress / nextTier.requirement) * 100

  return (
    <Card className="bg-white border border-slate-200 shadow-lg overflow-hidden">
      {/* Event Banner */}
      <div className={`relative h-32 bg-gradient-to-r ${getThemeGradient(currentEvent.theme)} overflow-hidden`}>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2220%22 height=%2220%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cdefs%3E%3Cpattern id=%22stars%22 width=%2220%22 height=%2220%22 patternUnits=%22userSpaceOnUse%22%3E%3Ccircle cx=%222%22 cy=%222%22 r=%221%22 fill=%22rgba(255,255,255,0.3)%22/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22url(%23stars)%22/%3E%3C/svg%3E')]" />
        <div className="absolute inset-0 flex items-center justify-between px-6">
          <div>
            <Badge className="bg-white/20 text-white border-0 mb-2">
              <Sparkles className="h-3 w-3 mr-1" />
              Limited Time
            </Badge>
            <h2 className="text-2xl font-bold text-white">{currentEvent.name}</h2>
            <p className="text-white/80 text-sm">{currentEvent.description}</p>
          </div>
          <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <ThemeIcon className="h-10 w-10 text-white" />
          </div>
        </div>
        {/* Floating particles */}
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-white/40 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <CardContent className="p-6 space-y-4">
        {/* Timer */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm text-slate-500">Event Ends In</p>
              <p className="text-lg font-bold text-slate-800">{timeLeft}</p>
            </div>
          </div>
          <Badge className="bg-red-100 text-red-600 border border-red-200">
            <Flame className="h-3 w-3 mr-1" />
            Active
          </Badge>
        </div>

        {/* Progress to Next Tier */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Progress to {nextTier.tier}</span>
            <span className="text-sm font-medium text-violet-600">
              {currentEvent.currentProgress}/{nextTier.requirement}
            </span>
          </div>
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${getThemeGradient(currentEvent.theme)} rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(progressToNextTier, 100)}%` }}
            />
          </div>
        </div>

        {/* Reward Tiers */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-500">Reward Tiers</h4>
          <div className="grid grid-cols-2 gap-2">
            {currentEvent.rewards.map((tier, index) => {
              const TierIcon = getTierIcon(index)
              const isUnlocked = currentEvent.currentProgress >= tier.requirement
              const isCurrent = index === currentTierIndex

              return (
                <div
                  key={tier.tier}
                  className={`p-3 rounded-xl border transition-all duration-300 ${
                    isUnlocked
                      ? "bg-emerald-50 border-emerald-200"
                      : isCurrent
                        ? "bg-violet-50 border-violet-300 animate-pulse"
                        : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        isUnlocked ? `bg-gradient-to-br ${getThemeGradient(currentEvent.theme)}` : "bg-slate-200"
                      }`}
                    >
                      <TierIcon className={`h-4 w-4 ${isUnlocked ? "text-white" : "text-slate-400"}`} />
                    </div>
                    <div>
                      <p className={`text-xs font-medium ${isUnlocked ? "text-slate-800" : "text-slate-500"}`}>
                        {tier.tier}
                      </p>
                      <p className="text-xs text-slate-400">{tier.requirement} participations</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs ${isUnlocked ? "text-emerald-600" : "text-slate-400"}`}>{tier.reward}</p>
                    <Badge
                      className={`text-xs ${
                        isUnlocked ? "bg-emerald-100 text-emerald-600 border-0" : "bg-slate-100 text-slate-500 border-0"
                      }`}
                    >
                      +{tier.points}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA */}
        <Button
          className={`w-full h-12 bg-gradient-to-r ${getThemeGradient(currentEvent.theme)} hover:opacity-90 text-white font-semibold shadow-lg`}
        >
          <Gift className="h-4 w-4 mr-2" />
          Participate Now
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  )
}
