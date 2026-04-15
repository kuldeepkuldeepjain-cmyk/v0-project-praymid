"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Crown, Medal, TrendingUp, Coins, Sparkles, Zap, Star, Award, ArrowUp, ArrowDown } from "lucide-react"

interface LeaderboardEntry {
  position: number
  name: string
  username: string
  earnings: number
  avatar: string
  badge?: string
  rankChange?: number
  statusBadge?: "Newcomer" | "Veteran" | "Rising"
}

interface LeaderboardViewProps {
  mode?: "full" | "compact"
  initialTab?: "contributors" | "predictions"
}

const INDIAN_NAMES = [
  { name: "Rajesh Kumar", username: "rajesh_k" },
  { name: "Priya Sharma", username: "priya_s" },
  { name: "Amit Patel", username: "amit_p" },
  { name: "Sneha Gupta", username: "sneha_g" },
  { name: "Vikram Singh", username: "vikram_s" },
  { name: "Anjali Reddy", username: "anjali_r" },
  { name: "Rahul Verma", username: "rahul_v" },
  { name: "Pooja Mehta", username: "pooja_m" },
  { name: "Arjun Nair", username: "arjun_n" },
  { name: "Neha Joshi", username: "neha_j" },
  { name: "Karan Desai", username: "karan_d" },
  { name: "Ritu Kapoor", username: "ritu_k" },
  { name: "Sanjay Rao", username: "sanjay_r" },
  { name: "Deepika Iyer", username: "deepika_i" },
  { name: "Rohit Agarwal", username: "rohit_a" },
  { name: "Kavita Malhotra", username: "kavita_m" },
  { name: "Aditya Khanna", username: "aditya_k" },
  { name: "Simran Sethi", username: "simran_s" },
  { name: "Manoj Pillai", username: "manoj_p" },
  { name: "Divya Menon", username: "divya_m" },
]

export function LeaderboardView({ mode = "full", initialTab = "contributors" }: LeaderboardViewProps) {
  const [contributorsLeaderboard, setContributorsLeaderboard] = useState<LeaderboardEntry[]>([])
  const [predictionsLeaderboard, setPredictionsLeaderboard] = useState<LeaderboardEntry[]>([])
  const [activeTab, setActiveTab] = useState<"contributors" | "predictions">(initialTab)

  useEffect(() => {
    generateDailyLeaderboards()
  }, [])

  const generateDailyLeaderboards = () => {
    const today = new Date()
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
    
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000
      return x - Math.floor(x)
    }

    const shuffleArray = (array: typeof INDIAN_NAMES, seed: number) => {
      const shuffled = [...array]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(seed + i) * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled
    }

    const contributorsNames = shuffleArray(INDIAN_NAMES, seed).slice(0, 20)
    const predictionsNames = shuffleArray(INDIAN_NAMES, seed + 1000).slice(0, 20)

    const contributors = contributorsNames.map((person, index) => {
      const baseEarnings = 5000 - (index * 200)
      const randomVariation = Math.floor(seededRandom(seed + index + 100) * 300) - 150
      const earnings = Math.max(100, baseEarnings + randomVariation)
      const rankChangeRaw = Math.floor(seededRandom(seed + index + 200) * 7) - 3
      const rankChange = rankChangeRaw === 0 ? undefined : rankChangeRaw
      
      let statusBadge: "Newcomer" | "Veteran" | "Rising" | undefined
      if (index < 5) statusBadge = "Newcomer"
      else if (index < 10) statusBadge = "Rising"
      else if (index < 15) statusBadge = "Veteran"
      
      return {
        position: index + 1,
        name: person.name,
        username: person.username,
        earnings: earnings,
        avatar: person.name.charAt(0),
        badge: index < 3 ? (index === 0 ? "Champion" : index === 1 ? "Elite" : "Rising Star") : undefined,
        rankChange: rankChange,
        statusBadge: statusBadge,
      }
    })

    const predictions = predictionsNames.map((person, index) => {
      const baseEarnings = 4500 - (index * 180)
      const randomVariation = Math.floor(seededRandom(seed + index + 500) * 400) - 200
      const earnings = Math.max(80, baseEarnings + randomVariation)
      const rankChangeRaw = Math.floor(seededRandom(seed + index + 600) * 7) - 3
      const rankChange = rankChangeRaw === 0 ? undefined : rankChangeRaw
      
      let statusBadge: "Newcomer" | "Veteran" | "Rising" | undefined
      if (index < 5) statusBadge = "Newcomer"
      else if (index < 10) statusBadge = "Rising"
      else if (index < 15) statusBadge = "Veteran"
      
      return {
        position: index + 1,
        name: person.name,
        username: person.username,
        earnings: earnings,
        avatar: person.name.charAt(0),
        badge: index < 3 ? (index === 0 ? "Champion" : index === 1 ? "Elite" : "Rising Star") : undefined,
        rankChange: rankChange,
        statusBadge: statusBadge,
      }
    })

    setContributorsLeaderboard(contributors)
    setPredictionsLeaderboard(predictions)
  }

  const currentLeaderboard = activeTab === "contributors" ? contributorsLeaderboard : predictionsLeaderboard
  const displayLimit = mode === "compact" ? 10 : 20

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200">
          <button
            onClick={() => setActiveTab("contributors")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 text-sm ${
              activeTab === "contributors"
                ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md scale-105"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Coins className="h-4 w-4" />
            <span>Top Contributors</span>
          </button>
          <button
            onClick={() => setActiveTab("predictions")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 text-sm ${
              activeTab === "predictions"
                ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-md scale-105"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Top Predictors</span>
          </button>
        </div>
      </div>

      {/* Top 3 Podium */}
      {currentLeaderboard.length >= 3 && (
        <div className="mb-8">
          <div className="grid md:grid-cols-3 gap-6">
            {/* 2nd Place */}
            <div className="md:order-1 md:mt-8">
              <Card className="border-2 border-slate-300 bg-white/90 backdrop-blur-sm overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="h-2 bg-gradient-to-r from-slate-400 to-slate-500" />
                <CardContent className="p-6 text-center">
                  <div className="relative inline-block mb-3">
                    <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center shadow-lg border-4 border-white">
                      <Medal className="h-8 w-8 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white shadow-md border-2 border-slate-400 flex items-center justify-center">
                      <span className="text-sm font-black text-slate-600">2</span>
                    </div>
                  </div>
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl mb-3 shadow-lg ring-4 ring-slate-200">
                    {currentLeaderboard[1].avatar}
                  </div>
                  {currentLeaderboard[1].badge && (
                    <Badge className="mb-2 text-xs bg-slate-200 text-slate-700">
                      <Star className="h-3 w-3 mr-1" />
                      {currentLeaderboard[1].badge}
                    </Badge>
                  )}
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{currentLeaderboard[1].name}</h3>
                  <p className="text-xs text-slate-500 mb-3">@{currentLeaderboard[1].username}</p>
                  <div className="pt-3 border-t border-slate-200">
                    <p className="text-2xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      ${currentLeaderboard[1].earnings.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Total Earnings</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 1st Place */}
            <div className="md:order-2">
              <Card className="border-4 border-yellow-400 bg-white overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <div className="h-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 animate-pulse" />
                <CardContent className="p-8 text-center">
                  <div className="relative inline-block mb-4">
                    <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-600 flex items-center justify-center shadow-xl border-4 border-white">
                      <Crown className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-white shadow-lg border-4 border-yellow-500 flex items-center justify-center">
                      <span className="text-xl font-black bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">1</span>
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                      <Zap className="h-6 w-6 text-yellow-500 animate-bounce" />
                    </div>
                  </div>
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-xl ring-4 ring-yellow-200 animate-pulse">
                    {currentLeaderboard[0].avatar}
                  </div>
                  {currentLeaderboard[0].badge && (
                    <Badge className="mb-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm">
                      <Crown className="h-3 w-3 mr-1" />
                      {currentLeaderboard[0].badge}
                    </Badge>
                  )}
                  <h3 className="text-xl font-black text-slate-900 mb-2">{currentLeaderboard[0].name}</h3>
                  <p className="text-sm text-slate-500 mb-4">@{currentLeaderboard[0].username}</p>
                  <div className="pt-4 border-t-2 border-yellow-200">
                    <p className="text-3xl font-black bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                      ${currentLeaderboard[0].earnings.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-600 font-semibold mt-1">Total Earnings</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 3rd Place */}
            <div className="md:order-3 md:mt-12">
              <Card className="border-2 border-orange-300 bg-white/90 backdrop-blur-sm overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="h-2 bg-gradient-to-r from-orange-400 to-amber-600" />
                <CardContent className="p-6 text-center">
                  <div className="relative inline-block mb-3">
                    <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-orange-300 to-amber-600 flex items-center justify-center shadow-lg border-4 border-white">
                      <Trophy className="h-8 w-8 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white shadow-md border-2 border-orange-400 flex items-center justify-center">
                      <span className="text-sm font-black text-orange-600">3</span>
                    </div>
                  </div>
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-pink-400 to-orange-500 flex items-center justify-center text-white font-bold text-xl mb-3 shadow-lg ring-4 ring-orange-200">
                    {currentLeaderboard[2].avatar}
                  </div>
                  {currentLeaderboard[2].badge && (
                    <Badge className="mb-2 text-xs bg-orange-200 text-orange-700">
                      <Star className="h-3 w-3 mr-1" />
                      {currentLeaderboard[2].badge}
                    </Badge>
                  )}
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{currentLeaderboard[2].name}</h3>
                  <p className="text-xs text-slate-500 mb-3">@{currentLeaderboard[2].username}</p>
                  <div className="pt-3 border-t border-orange-200">
                    <p className="text-2xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                      ${currentLeaderboard[2].earnings.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Total Earnings</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Rest of Leaderboard */}
      <div className="space-y-3">
        {currentLeaderboard.slice(3, displayLimit).map((entry) => (
          <Card
            key={entry.position}
            className="border border-slate-200 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] overflow-hidden"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Position */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <span className="text-lg font-black text-slate-700">{entry.position}</span>
                </div>

                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {entry.avatar}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-slate-900 truncate">{entry.name}</h4>
                    {entry.rankChange && (
                      <div className={`flex items-center gap-0.5 text-xs font-bold ${entry.rankChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.rankChange > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {Math.abs(entry.rankChange)}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">@{entry.username}</p>
                </div>

                {/* Earnings */}
                <div className="text-right">
                  <p className="text-lg font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    ${entry.earnings.toLocaleString()}
                  </p>
                  {entry.statusBadge && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      {entry.statusBadge}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
