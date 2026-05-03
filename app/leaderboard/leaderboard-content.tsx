"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FlowChainLogo } from "@/components/flowchain-logo"
import { Trophy, ArrowLeft, Crown, Medal, TrendingUp, Coins, Sparkles, Zap, Star, Award, TrendingDown, ArrowUp, ArrowDown, User } from "lucide-react"


interface LeaderboardEntry {
  position: number
  name: string
  username: string
  earnings: number
  avatar: string
  badge?: string
  rankChange?: number // Positive = moved up, Negative = moved down
  statusBadge?: "Newcomer" | "Veteran" | "Rising"
}

// Indian names pool
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
  { name: "Gaurav Bhatt", username: "gaurav_b" },
  { name: "Lakshmi Sundaram", username: "lakshmi_s" },
  { name: "Nikhil Chopra", username: "nikhil_c" },
  { name: "Ananya Bose", username: "ananya_b" },
  { name: "Varun Sinha", username: "varun_s" },
  { name: "Megha Pandey", username: "megha_p" },
  { name: "Siddharth Jain", username: "siddharth_j" },
  { name: "Tanvi Shah", username: "tanvi_s" },
  { name: "Akash Bansal", username: "akash_b" },
  { name: "Ishita Chauhan", username: "ishita_c" },
]

export default function LeaderboardContent() {
  const router = useRouter()
  const [contributorsLeaderboard, setContributorsLeaderboard] = useState<LeaderboardEntry[]>([])
  const [predictionsLeaderboard, setPredictionsLeaderboard] = useState<LeaderboardEntry[]>([])
  const [activeTab, setActiveTab] = useState<"contributors" | "predictions">("contributors")
  const [userStats, setUserStats] = useState<{
    email: string
    username: string
    rank: number
    earnings: number
  } | null>(null)

  useEffect(() => {
    generateDailyLeaderboards()
    fetchUserStats()
  }, [])

  const fetchUserStats = async () => {
    try {
      // Get user email from localStorage
      const participantData = localStorage.getItem("participantData")
      if (!participantData) return

      const data = JSON.parse(participantData)
      const userEmail = data.email

      const res = await fetch(`/api/participant/me`, {
        headers: { "x-participant-email": userEmail },
      })
      const json = await res.json()
      const userData = json.participant
      if (!userData) return

      // Generate daily random rank between 10000-18000
      const today = new Date()
      const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
      
      // Create seed from user email for consistency
      const emailSeed = userEmail.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      const combinedSeed = seed + emailSeed
      
      // Seeded random for daily rank
      const seededRandom = (s: number) => {
        const x = Math.sin(s) * 10000
        return x - Math.floor(x)
      }
      
      // Generate rank between 10000-18000
      const randomRank = Math.floor(10000 + seededRandom(combinedSeed) * 8000)

      setUserStats({
        email: userData.email,
        username: userData.username || userData.email.split("@")[0],
        rank: randomRank,
        earnings: Number(userData.total_earnings || 0),
      })
    } catch (error) {
      console.error("Error fetching user stats:", error)
    }
  }

  const generateDailyLeaderboards = () => {
    // Get today's date as seed for consistent daily rankings
    const today = new Date()
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
    
    // Seeded random number generator
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000
      return x - Math.floor(x)
    }

    // Shuffle names based on daily seed
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

    // Generate contributors leaderboard (higher earnings)
    const contributors = contributorsNames.map((person, index) => {
      const baseEarnings = 5000 - (index * 200)
      const randomVariation = Math.floor(seededRandom(seed + index + 100) * 300) - 150
      const earnings = Math.max(100, baseEarnings + randomVariation)
      
      // Generate rank change (-3 to +3)
      const rankChangeRaw = Math.floor(seededRandom(seed + index + 200) * 7) - 3
      const rankChange = rankChangeRaw === 0 ? undefined : rankChangeRaw
      
      // Assign status badges (Veteran at top, Newcomer at bottom)
      let statusBadge: "Newcomer" | "Veteran" | "Rising" | undefined
      if (index < 5) statusBadge = "Veteran"
      else if (index < 10) statusBadge = "Rising"
      else if (index < 15) statusBadge = "Newcomer"
      
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

    // Generate predictions leaderboard (varied earnings)
    const predictions = predictionsNames.map((person, index) => {
      const baseEarnings = 4500 - (index * 180)
      const randomVariation = Math.floor(seededRandom(seed + index + 500) * 400) - 200
      const earnings = Math.max(80, baseEarnings + randomVariation)
      
      // Generate rank change (-3 to +3)
      const rankChangeRaw = Math.floor(seededRandom(seed + index + 600) * 7) - 3
      const rankChange = rankChangeRaw === 0 ? undefined : rankChangeRaw
      
      // Assign status badges (Veteran at top, Newcomer at bottom)
      let statusBadge: "Newcomer" | "Veteran" | "Rising" | undefined
      if (index < 5) statusBadge = "Veteran"
      else if (index < 10) statusBadge = "Rising"
      else if (index < 15) statusBadge = "Newcomer"
      
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

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-white to-cyan-50" />
      
      {/* Animated mesh gradient */}
      <div 
        className="fixed inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse 80% 80% at 20% 20%, rgba(124, 58, 237, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 80% 80% at 80% 80%, rgba(34, 211, 238, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 80% 80% at 50% 50%, rgba(232, 93, 59, 0.1) 0%, transparent 50%)
          `,
          animation: "meshRotate 20s ease-in-out infinite alternate",
        }}
      />

      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-purple-400/20 rounded-full animate-float"
            style={{
              left: `${(i * 15) + 10}%`,
              top: `${(i * 12) % 80}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${6 + (i % 3)}s`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes meshRotate {
          0% {
            transform: rotate(0deg) scale(1);
          }
          100% {
            transform: rotate(180deg) scale(1.1);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0;
          }
          10% {
            opacity: 0.4;
          }
          50% {
            transform: translateY(-120px) translateX(60px);
            opacity: 0.6;
          }
          90% {
            opacity: 0.4;
          }
        }
      `}</style>

      {/* Header - Mobile Optimized */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
        <div className="container mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-12 sm:h-14 md:h-16 gap-2">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const isAuthenticated = typeof window !== "undefined" && sessionStorage.getItem("participant_token")
                  router.push(isAuthenticated ? "/participant/dashboard" : "/")
                }}
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all px-2 sm:px-3"
              >
                <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <FlowChainLogo size="sm" showTagline={false} />
            </div>
            
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 md:py-12 relative z-10">
        {/* Hero Section - Mobile Optimized */}
        <div className="text-center mb-6 sm:mb-10 md:mb-16 space-y-3 sm:space-y-5">
          <Badge className="mb-3 sm:mb-6 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-purple-100 to-cyan-100 border border-purple-200 text-purple-700 hover:bg-gradient-to-r hover:from-purple-200 hover:to-cyan-200 text-xs sm:text-sm">
            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 inline" />
            Rankings Update Every 24 Hours
          </Badge>
          
          <div className="relative inline-block mb-3 sm:mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 blur-2xl sm:blur-3xl opacity-20 animate-pulse" />
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center shadow-2xl">
              <Trophy className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-slate-900 mb-3 sm:mb-4 md:mb-6 tracking-tight px-4">
            Global <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 bg-clip-text text-transparent">Leaderboard</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto px-4">
            Compete with the best. Top earners from contributions and predictions
          </p>
        </div>

        {/* Tab Switcher - Mobile Optimized with Better Touch Targets */}
        <div className="flex justify-center mb-4 sm:mb-6 md:mb-12 px-2">
          <div className="inline-flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto p-1.5 sm:p-2 bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-slate-200">
            <button
              onClick={() => setActiveTab("contributors")}
              className={`flex items-center gap-2 sm:gap-3 px-4 py-3 sm:px-6 md:px-8 sm:py-4 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 min-h-[48px] ${
                activeTab === "contributors"
                  ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg scale-100 sm:scale-105"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Coins className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <div className="text-left flex-1">
                <div className="text-xs sm:text-sm font-bold">Top Contributors</div>
                <div className={`text-[10px] sm:text-xs ${activeTab === "contributors" ? "text-white/80" : "text-slate-500"}`}>
                  Most Earned
                </div>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("predictions")}
              className={`flex items-center gap-2 sm:gap-3 px-4 py-3 sm:px-6 md:px-8 sm:py-4 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 min-h-[48px] ${
                activeTab === "predictions"
                  ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg scale-100 sm:scale-105"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <div className="text-left flex-1">
                <div className="text-xs sm:text-sm font-bold">Top Predictors</div>
                <div className={`text-[10px] sm:text-xs ${activeTab === "predictions" ? "text-white/80" : "text-slate-500"}`}>
                  Best Wins
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Top 3 Podium - Mobile Stack Layout */}
        {currentLeaderboard.length >= 3 && (
          <div className="mb-6 sm:mb-10 md:mb-16">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 text-center mb-4 sm:mb-6 md:mb-10 flex items-center justify-center gap-2 sm:gap-3 px-2">
              <Award className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-yellow-500 flex-shrink-0" />
              <span>Hall of Champions</span>
            </h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-8 max-w-6xl mx-auto">
              {/* 2nd Place */}
              <div className="order-1 mt-6 sm:mt-8 lg:mt-12">
                <Card className="border border-slate-300 sm:border-2 bg-white/80 backdrop-blur-sm overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-105 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-200/50 to-slate-400/50 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
                  <div className="h-1 sm:h-2 bg-gradient-to-r from-slate-400 to-slate-500" />
                  <CardContent className="p-2 sm:p-4 md:p-6 lg:p-8 text-center relative z-10">
                    <div className="relative inline-block mb-1 sm:mb-2 md:mb-3">
                      <div className="absolute inset-0 bg-slate-400 blur-lg sm:blur-xl opacity-40 animate-pulse" />
                      <div className="relative w-10 h-10 sm:w-14 sm:h-14 md:w-18 md:h-18 lg:w-20 lg:h-20 rounded-lg sm:rounded-xl md:rounded-2xl bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center shadow-lg sm:shadow-xl border sm:border-2 md:border-4 border-white transform -rotate-6">
                        <Medal className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-white" />
                      </div>
                      <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 md:-top-2 md:-right-2 w-5 h-5 sm:w-7 sm:h-7 md:w-10 md:h-10 rounded-full bg-white shadow-md sm:shadow-lg border border-slate-400 sm:border-2 flex items-center justify-center">
                        <span className="text-xs sm:text-sm md:text-base lg:text-lg font-black text-slate-600">2</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-18 md:h-18 lg:w-20 lg:h-20 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm sm:text-lg md:text-xl lg:text-2xl mb-1 sm:mb-2 md:mb-4 shadow-lg sm:shadow-xl ring-1 sm:ring-2 md:ring-4 ring-slate-200">
                      {currentLeaderboard[1].avatar}
                    </div>
                    <Badge className="mb-1 sm:mb-2 md:mb-3 bg-slate-200 text-slate-700 hover:bg-slate-300 text-[8px] sm:text-[10px] md:text-xs hidden sm:inline-flex">
                      <Star className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 mr-0.5 sm:mr-1" />
                      {currentLeaderboard[1].badge}
                    </Badge>
                    <h3 className="text-xs sm:text-sm md:text-lg lg:text-xl font-bold text-slate-900 mb-0.5 sm:mb-1 truncate px-0.5 sm:px-1 md:px-2">{currentLeaderboard[1].name}</h3>
                    <p className="text-[8px] sm:text-[10px] md:text-xs lg:text-sm text-slate-500 mb-2 sm:mb-3 md:mb-4 truncate px-0.5 sm:px-1 md:px-2">@{currentLeaderboard[1].username}</p>
                    <div className="mt-2 sm:mt-3 md:mt-4 lg:mt-6 pt-2 sm:pt-3 md:pt-4 lg:pt-6 border-t border-slate-200">
                      <p className="text-sm sm:text-lg md:text-2xl lg:text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        ${currentLeaderboard[1].earnings.toLocaleString()}
                      </p>
                      <p className="text-[7px] sm:text-[9px] md:text-[10px] lg:text-xs text-slate-500 mt-0.5 sm:mt-1">Total Earnings</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 1st Place */}
              <div className="order-2">
                <Card className="border-2 sm:border-3 md:border-4 border-yellow-400 bg-white overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-105 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-200/30 to-orange-300/30 pointer-events-none" />
                  <div className="h-1.5 sm:h-2 md:h-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 animate-pulse" />
                  <CardContent className="p-2 sm:p-4 md:p-6 lg:p-10 text-center relative z-10">
                    <div className="relative inline-block mb-1 sm:mb-2 md:mb-3">
                      <div className="absolute inset-0 bg-yellow-500 blur-xl sm:blur-2xl md:blur-3xl opacity-50 animate-pulse" />
                      <div className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-xl sm:rounded-2xl md:rounded-3xl bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-600 flex items-center justify-center shadow-xl sm:shadow-2xl border sm:border-2 md:border-4 border-white transform rotate-6">
                        <Crown className="h-6 w-6 sm:h-8 sm:w-8 md:h-12 md:w-12 lg:h-14 lg:w-14 text-white" />
                      </div>
                      <div className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 md:-top-3 md:-right-3 w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12 rounded-full bg-white shadow-lg sm:shadow-xl border sm:border-2 md:border-4 border-yellow-500 flex items-center justify-center">
                        <span className="text-sm sm:text-base md:text-lg lg:text-2xl font-black bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">1</span>
                      </div>
                      <div className="absolute -bottom-1 sm:-bottom-2 left-1/2 -translate-x-1/2 hidden sm:block">
                        <Zap className="h-4 w-4 sm:h-5 sm:w-5 md:h-8 md:w-8 text-yellow-500 animate-bounce" />
                      </div>
                    </div>
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 mx-auto rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-white font-bold text-base sm:text-xl md:text-2xl lg:text-3xl mb-2 sm:mb-3 md:mb-5 shadow-xl sm:shadow-2xl ring-1 sm:ring-2 md:ring-4 ring-yellow-200 animate-pulse">
                      {currentLeaderboard[0].avatar}
                    </div>
                    <Badge className="mb-1 sm:mb-2 md:mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600 text-[8px] sm:text-[10px] md:text-xs lg:text-sm hidden sm:inline-flex">
                      <Crown className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 mr-0.5 sm:mr-1" />
                      {currentLeaderboard[0].badge}
                    </Badge>
                    <h3 className="text-sm sm:text-base md:text-xl lg:text-2xl font-black text-slate-900 mb-0.5 sm:mb-1 md:mb-2 truncate px-0.5 sm:px-1 md:px-2">{currentLeaderboard[0].name}</h3>
                    <p className="text-[9px] sm:text-[11px] md:text-xs lg:text-sm text-slate-500 mb-2 sm:mb-3 md:mb-6 truncate px-0.5 sm:px-1 md:px-2">@{currentLeaderboard[0].username}</p>
                    <div className="mt-2 sm:mt-4 md:mt-8 pt-2 sm:pt-4 md:pt-8 border-t sm:border-t-2 border-yellow-200">
                      <p className="text-base sm:text-xl md:text-3xl lg:text-4xl font-black bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                        ${currentLeaderboard[0].earnings.toLocaleString()}
                      </p>
                      <p className="text-[7px] sm:text-[9px] md:text-xs lg:text-sm text-slate-600 font-semibold mt-0.5 sm:mt-1 md:mt-2">Total Earnings</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 3rd Place */}
              <div className="order-3 mt-6 sm:mt-8 lg:mt-16">
                <Card className="border border-orange-300 sm:border-2 bg-white/80 backdrop-blur-sm overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-105 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-200/50 to-amber-400/50 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
                  <div className="h-1 sm:h-2 bg-gradient-to-r from-orange-400 to-amber-600" />
                  <CardContent className="p-2 sm:p-4 md:p-6 lg:p-8 text-center relative z-10">
                    <div className="relative inline-block mb-1 sm:mb-2 md:mb-3">
                      <div className="absolute inset-0 bg-orange-500 blur-lg sm:blur-xl opacity-40 animate-pulse" />
                      <div className="relative w-10 h-10 sm:w-14 sm:h-14 md:w-18 md:h-18 lg:w-20 lg:h-20 rounded-lg sm:rounded-xl md:rounded-2xl bg-gradient-to-br from-orange-300 to-amber-600 flex items-center justify-center shadow-lg sm:shadow-xl border sm:border-2 md:border-4 border-white transform rotate-6">
                        <Trophy className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-white" />
                      </div>
                      <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 md:-top-2 md:-right-2 w-5 h-5 sm:w-7 sm:h-7 md:w-10 md:h-10 rounded-full bg-white shadow-md sm:shadow-lg border border-orange-400 sm:border-2 flex items-center justify-center">
                        <span className="text-xs sm:text-sm md:text-base lg:text-lg font-black text-orange-600">3</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-18 md:h-18 lg:w-20 lg:h-20 mx-auto rounded-full bg-gradient-to-br from-pink-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm sm:text-lg md:text-xl lg:text-2xl mb-1 sm:mb-2 md:mb-4 shadow-lg sm:shadow-xl ring-1 sm:ring-2 md:ring-4 ring-orange-200">
                      {currentLeaderboard[2].avatar}
                    </div>
                    <Badge className="mb-1 sm:mb-2 md:mb-3 bg-orange-200 text-orange-700 hover:bg-orange-300 text-[8px] sm:text-[10px] md:text-xs hidden sm:inline-flex">
                      <Star className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 mr-0.5 sm:mr-1" />
                      {currentLeaderboard[2].badge}
                    </Badge>
                    <h3 className="text-xs sm:text-sm md:text-lg lg:text-xl font-bold text-slate-900 mb-0.5 sm:mb-1 truncate px-0.5 sm:px-1 md:px-2">{currentLeaderboard[2].name}</h3>
                    <p className="text-[8px] sm:text-[10px] md:text-xs lg:text-sm text-slate-500 mb-2 sm:mb-3 md:mb-4 truncate px-0.5 sm:px-1 md:px-2">@{currentLeaderboard[2].username}</p>
                    <div className="mt-2 sm:mt-3 md:mt-4 lg:mt-6 pt-2 sm:pt-3 md:pt-4 lg:pt-6 border-t border-orange-200">
                      <p className="text-sm sm:text-lg md:text-2xl lg:text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        ${currentLeaderboard[2].earnings.toLocaleString()}
                      </p>
                      <p className="text-[7px] sm:text-[9px] md:text-[10px] lg:text-xs text-slate-500 mt-0.5 sm:mt-1">Total Earnings</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Full Leaderboard - Mobile Optimized */}
        <Card className="border border-slate-200 bg-white/80 backdrop-blur-sm shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-purple-50/30 p-4 sm:p-5 md:p-6 border-b border-slate-200">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center flex-shrink-0">
                <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <span className="truncate">{activeTab === "contributors" ? "Top 20 Contributors" : "Top 20 Prediction Earners"}</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-2 px-2 sm:py-3 sm:px-4 md:py-4 md:px-6 text-[9px] sm:text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-wide">Rank</th>
                  <th className="text-left py-2 px-2 sm:py-3 sm:px-4 md:py-4 md:px-6 text-[9px] sm:text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-wide">Participant</th>
                  <th className="text-right py-2 px-2 sm:py-3 sm:px-4 md:py-4 md:px-6 text-[9px] sm:text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-wide">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {currentLeaderboard.map((entry, i) => {
                  const isTopThree = entry.position <= 3
                  const rankBg = entry.position === 1 
                    ? "bg-gradient-to-br from-yellow-400 to-orange-500" 
                    : entry.position === 2 
                    ? "bg-gradient-to-br from-slate-300 to-slate-500"
                    : entry.position === 3
                    ? "bg-gradient-to-br from-orange-400 to-amber-600"
                    : "bg-slate-100"
                  
                  return (
                    <tr
                      key={entry.position}
                      className="border-b border-slate-100 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-cyan-50/50 transition-all duration-200"
                      style={{ animationDelay: `${i * 0.03}s` }}
                    >
                      <td className="py-2 px-1.5 sm:py-3 sm:px-3 md:py-4 md:px-6">
                        <div className={`inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg ${rankBg} ${isTopThree ? "text-white shadow-lg" : "text-slate-700"} font-bold transition-all text-xs sm:text-sm md:text-base`}>
                          {isTopThree ? (
                            entry.position === 1 ? <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" /> :
                            entry.position === 2 ? <Medal className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" /> :
                            <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                          ) : entry.position}
                        </div>
                      </td>
                      <td className="py-2 px-1.5 sm:py-3 sm:px-3 md:py-4 md:px-6">
                        <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-4">
                          <div 
                            className="w-9 h-9 sm:w-11 sm:h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base md:text-lg shadow-md sm:shadow-lg flex-shrink-0"
                            style={{
                              background: `linear-gradient(135deg, 
                                hsl(${(i * 137.5) % 360}, 70%, 60%), 
                                hsl(${((i * 137.5) + 60) % 360}, 70%, 50%))`
                            }}
                          >
                            {entry.avatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5">
                              <p className="font-bold text-slate-900 text-xs sm:text-sm md:text-base truncate">{entry.name}</p>
                              {entry.rankChange && (
                                <span className={`inline-flex items-center text-[9px] sm:text-[10px] md:text-xs font-bold flex-shrink-0 ${
                                  entry.rankChange > 0 ? "text-green-600" : "text-red-600"
                                }`}>
                                  {entry.rankChange > 0 ? (
                                    <>
                                      <ArrowUp className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3" />
                                      <span className="hidden sm:inline">+{entry.rankChange}</span>
                                    </>
                                  ) : (
                                    <>
                                      <ArrowDown className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3" />
                                      <span className="hidden sm:inline">{entry.rankChange}</span>
                                    </>
                                  )}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] sm:text-xs md:text-sm text-slate-500 truncate">@{entry.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-1.5 sm:py-3 sm:px-3 md:py-4 md:px-6 text-right">
                        <div className="flex flex-col items-end gap-1 sm:gap-1.5">
                          <div className="inline-flex items-center px-1.5 py-1 sm:px-3 sm:py-1.5 md:px-5 md:py-3 rounded-md sm:rounded-lg md:rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-sm">
                            <span className="text-sm sm:text-lg md:text-2xl font-black text-green-700">${entry.earnings.toLocaleString()}</span>
                          </div>
                          {entry.statusBadge && (
                            <Badge className={`hidden sm:inline-flex ${
                              entry.statusBadge === "Newcomer" 
                                ? "bg-cyan-100 text-cyan-700 hover:bg-cyan-200 border-cyan-300" 
                                : entry.statusBadge === "Rising"
                                ? "bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-300"
                                : "bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-300"
                            } border font-semibold text-[10px] sm:text-xs`}>
                              {entry.statusBadge === "Newcomer" && <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />}
                              {entry.statusBadge === "Rising" && <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />}
                              {entry.statusBadge === "Veteran" && <Award className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />}
                              {entry.statusBadge}
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* User Stats Card - Mobile Optimized */}
        {userStats && (
          <div className="mt-8 sm:mt-12 md:mt-16">
            <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 via-white to-cyan-50 overflow-hidden shadow-xl">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center shadow-lg flex-shrink-0">
                      <User className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 mb-0.5 sm:mb-1 truncate">Your Stats</h3>
                      <p className="text-sm sm:text-base text-slate-600 truncate">@{userStats.username}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 flex-1 w-full sm:max-w-xl">
                    <div className="text-center p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white/80 backdrop-blur-sm border border-purple-200">
                      <div className="text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-1">
                        #{userStats.rank.toLocaleString()}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium">Your Rank</p>
                    </div>
                    
                    <div className="text-center p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white/80 backdrop-blur-sm border border-green-200">
                      <div className="text-xl sm:text-2xl md:text-3xl font-black text-green-600 mb-1">
                        ${userStats.earnings.toLocaleString()}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium">Total Earnings</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
