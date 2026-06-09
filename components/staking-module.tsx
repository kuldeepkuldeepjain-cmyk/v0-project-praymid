"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import {
  TrendingUp,
  Lock,
  Zap,
  Search,
  X,
  Loader2,
  ChevronRight,
  Calendar,
  Gift,
  Target,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"

interface StakingCoin {
  id: number
  coin_symbol: string
  coin_name: string
  apy: number
  risk_level: string
  enabled: boolean
  logo_url?: string
}

interface Stake {
  id: number
  coin_symbol: string
  coin_name: string
  amount: number
  apy: number
  daily_reward: number
  start_date: string
  end_date: string
  total_earned: number
  status: string
}

interface StakingModuleProps {
  currentBalance: number
  participantEmail: string
  onBalanceUpdated?: (newBalance: number) => void
}

const COIN_LOGOS: Record<string, string> = {
  BTC: "₿",
  ETH: "Ξ",
  BNB: "⬡",
  SOL: "◎",
  XRP: "✕",
  DOGE: "Ð",
  ADA: "₳",
  AVAX: "▲",
  LINK: "⛓",
  DOT: "●",
  TRX: "⧉",
  LTC: "Ł",
  ATOM: "⚛",
  MATIC: "M",
  ARB: "Ⓐ",
  APT: "A",
  SUI: "S",
  TON: "◆",
  NEAR: "N",
  FLOW: "F",
}

export function StakingModule({ currentBalance, participantEmail, onBalanceUpdated }: StakingModuleProps) {
  const { toast } = useToast()
  const [view, setView] = useState<"dashboard" | "select" | "input" | "active">("dashboard")
  const [coins, setCoins] = useState<StakingCoin[]>([])
  const [stakes, setStakes] = useState<Stake[]>([])
  const [selectedCoin, setSelectedCoin] = useState<StakingCoin | null>(null)
  const [stakeAmount, setStakeAmount] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [isStaking, setIsStaking] = useState(false)

  // Fetch staking coins
  useEffect(() => {
    const fetchCoins = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/participant/staking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_staking_coins" }),
        })

        if (!response.ok) throw new Error("Failed to fetch coins")
        const data = await response.json()
        setCoins(data.coins || [])
      } catch (error) {
        console.error("[v0] Failed to fetch coins:", error)
        toast({ title: "Error", description: "Failed to load staking coins", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    fetchCoins()
  }, [toast])

  // Fetch stakes
  useEffect(() => {
    const fetchStakes = async () => {
      try {
        const response = await fetch("/api/participant/staking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_stakes", participantEmail }),
        })

        if (!response.ok) throw new Error("Failed to fetch stakes")
        const data = await response.json()
        setStakes(data.stakes || [])
      } catch (error) {
        console.error("[v0] Failed to fetch stakes:", error)
      }
    }

    if (participantEmail) {
      fetchStakes()
      const interval = setInterval(fetchStakes, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [participantEmail])

  const filteredCoins = coins.filter(
    (coin) =>
      coin.coin_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coin.coin_symbol.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCoinSelect = (coin: StakingCoin) => {
    setSelectedCoin(coin)
    setView("input")
    setStakeAmount("")
  }

  const handleStake = async () => {
    if (!selectedCoin || !stakeAmount) {
      toast({ title: "Error", description: "Please enter a valid amount", variant: "destructive" })
      return
    }

    const amount = parseFloat(stakeAmount)
    if (isNaN(amount) || amount < 10) {
      toast({
        title: "Minimum Amount",
        description: "Minimum staking amount is $10",
        variant: "destructive",
      })
      return
    }

    if (amount > currentBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You have $${currentBalance.toFixed(2)} available`,
        variant: "destructive",
      })
      return
    }

    try {
      setIsStaking(true)
      const response = await fetch("/api/participant/staking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_stake",
          participantEmail,
          coinSymbol: selectedCoin.coin_symbol,
          amount,
          currentBalance,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create stake")
      }

      const data = await response.json()
      toast({
        title: "Staking Successful",
        description: `Staked $${amount} in ${selectedCoin.coin_name} at ${selectedCoin.apy}% APY`,
      })

      onBalanceUpdated?.(data.newBalance)

      // Refresh stakes
      const stakesResponse = await fetch("/api/participant/staking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_stakes", participantEmail }),
      })
      const stakesData = await stakesResponse.json()
      setStakes(stakesData.stakes || [])

      setView("active")
      setSelectedCoin(null)
      setStakeAmount("")
    } catch (error) {
      console.error("[v0] Staking error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create stake",
        variant: "destructive",
      })
    } finally {
      setIsStaking(false)
    }
  }

  // Calculate dashboard stats
  const dashboardStats = {
    totalLocked: stakes.reduce((sum, s) => (s.status === "Active" ? sum + s.amount : sum), 0),
    totalEarned: stakes.reduce((sum, s) => sum + s.total_earned, 0),
    activeStakes: stakes.filter((s) => s.status === "Active").length,
    averageApy: stakes.length > 0 ? (stakes.reduce((sum, s) => sum + s.apy, 0) / stakes.length).toFixed(1) : "0",
  }

  return (
    <div className="w-full space-y-6">
      {/* Dashboard View */}
      {view === "dashboard" && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                Staking Dashboard
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Lock your assets and earn passive income</p>
            </div>
            {/* APY Range Badge */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-600 dark:to-blue-700 rounded-lg px-4 py-2 text-white font-bold text-lg shadow-lg">
              8-25% APY
            </div>
          </div>

          {/* Stats Cards - Professional Dark Theme */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Locked */}
            <Card className="border border-slate-700 dark:border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-800 dark:to-slate-900 shadow-lg">
              <CardContent className="p-4">
                <p className="text-slate-400 dark:text-slate-400 text-sm font-semibold mb-1">Total Locked</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">${dashboardStats.totalLocked.toFixed(2)}</p>
              </CardContent>
            </Card>

            {/* Total Earned */}
            <Card className="border border-slate-700 dark:border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-800 dark:to-slate-900 shadow-lg">
              <CardContent className="p-4">
                <p className="text-slate-400 dark:text-slate-400 text-sm font-semibold mb-1">Total Earned</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">${dashboardStats.totalEarned.toFixed(2)}</p>
              </CardContent>
            </Card>

            {/* Active Stakes */}
            <Card className="border border-slate-700 dark:border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-800 dark:to-slate-900 shadow-lg">
              <CardContent className="p-4">
                <p className="text-slate-400 dark:text-slate-400 text-sm font-semibold mb-1">Active Stakes</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{dashboardStats.activeStakes}</p>
              </CardContent>
            </Card>

            {/* Average APY */}
            <Card className="border border-slate-700 dark:border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-800 dark:to-slate-900 shadow-lg">
              <CardContent className="p-4">
                <p className="text-slate-400 dark:text-slate-400 text-sm font-semibold mb-1">Average APY</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{dashboardStats.averageApy}%</p>
              </CardContent>
            </Card>

            {/* Start Staking Button */}
            <Card className="border border-blue-600 dark:border-blue-600 bg-gradient-to-br from-blue-700 to-blue-900 dark:from-blue-700 dark:to-blue-900 cursor-pointer hover:from-blue-600 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-800 transition-all shadow-lg" onClick={() => setView("select")}>
              <CardContent className="p-4 h-full flex items-center justify-center">
                <button className="flex flex-col items-center gap-2 w-full">
                  <Zap className="h-6 w-6 text-blue-200 dark:text-blue-300" />
                  <span className="text-sm font-bold text-blue-100 dark:text-blue-200">Start Staking</span>
                </button>
              </CardContent>
            </Card>
          </div>

          {/* Active Stakes Section */}
          {dashboardStats.activeStakes > 0 && (
            <Card className="border border-slate-700 dark:border-slate-700 bg-slate-800 dark:bg-slate-800 shadow-lg">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Active Stakes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stakes
                  .filter((s) => s.status === "Active")
                  .map((stake) => (
                    <div
                      key={stake.id}
                      className="bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-700 dark:to-slate-800 rounded-lg p-4 border border-slate-600 dark:border-slate-600 hover:border-slate-500 dark:hover:border-slate-500 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-600 dark:to-blue-800 flex items-center justify-center text-white font-bold">
                            {COIN_LOGOS[stake.coin_symbol] || stake.coin_symbol[0]}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{stake.coin_name}</p>
                            <p className="text-slate-400 dark:text-slate-400 text-sm">${stake.amount.toFixed(2)} at {stake.apy}% APY</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600 dark:text-green-400">+${stake.daily_reward.toFixed(4)}/day</p>
                          <p className="text-slate-400 dark:text-slate-400 text-sm">Total: ${stake.total_earned.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="h-1 bg-slate-700 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-600 to-blue-600 dark:from-green-600 dark:to-blue-600"
                          style={{
                            width: `${Math.min(
                              ((new Date().getTime() - new Date(stake.start_date).getTime()) /
                                (new Date(stake.end_date).getTime() - new Date(stake.start_date).getTime())) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* Available Coins Section - Display all coins with selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Available Coins</h3>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mt-1">Earn 8-25% APY on your cryptocurrency</p>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{coins.length} coins available</p>
            </div>

            {loading ? (
              <Card className="border border-slate-700 dark:border-slate-700 bg-slate-800 dark:bg-slate-800 shadow-lg">
                <CardContent className="p-8 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                </CardContent>
              </Card>
            ) : coins.length === 0 ? (
              <Card className="border border-slate-700 dark:border-slate-700 bg-slate-800 dark:bg-slate-800 shadow-lg">
                <CardContent className="p-8 flex flex-col items-center justify-center gap-3">
                  <AlertCircle className="h-8 w-8 text-slate-500 dark:text-slate-400" />
                  <p className="text-slate-500 dark:text-slate-400 text-center">No staking coins available yet. Please check back soon.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {coins.map((coin) => (
                  <button
                    key={coin.id}
                    onClick={() => {
                      setSelectedCoin(coin)
                      setView("input")
                      setStakeAmount("")
                    }}
                    className="group bg-gradient-to-br from-slate-700 to-slate-800 dark:from-slate-700 dark:to-slate-800 rounded-lg p-4 border border-slate-600 dark:border-slate-600 hover:border-blue-600 dark:hover:border-blue-600 hover:bg-gradient-to-br hover:from-slate-600 hover:to-slate-700 dark:hover:from-slate-600 dark:hover:to-slate-700 transition-all cursor-pointer"
                  >
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-600 dark:to-blue-800 flex items-center justify-center text-white font-bold mb-2 group-hover:scale-110 transition-transform">
                      {COIN_LOGOS[coin.coin_symbol] || coin.coin_symbol[0]}
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm mb-1">{coin.coin_symbol}</p>
                    <p className="text-slate-400 dark:text-slate-400 text-xs mb-2">{coin.coin_name}</p>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-blue-600 dark:text-blue-400 font-bold text-sm">{coin.apy}% APY</p>
                      <ChevronRight className="h-3 w-3 text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <span
                      className={`inline-block text-xs font-bold px-1.5 py-0.5 rounded-full ${
                        coin.risk_level === "Low"
                          ? "bg-green-600 text-green-100 dark:bg-green-600 dark:text-green-100"
                          : coin.risk_level === "Medium"
                            ? "bg-yellow-600 text-yellow-100 dark:bg-yellow-600 dark:text-yellow-100"
                            : "bg-red-600 text-red-100 dark:bg-red-600 dark:text-red-100"
                      }`}
                    >
                      {coin.risk_level}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Coin Selection View */}
      {view === "select" && (
        <Card className="border border-slate-700 dark:border-slate-700 bg-slate-800 dark:bg-slate-800 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-700 dark:border-slate-700">
            <div>
              <CardTitle className="text-slate-900 dark:text-white">Select Cryptocurrency</CardTitle>
              <p className="text-slate-400 dark:text-slate-400 text-sm mt-1">Choose a coin to start earning 8-25% APY</p>
            </div>
            <button
              onClick={() => {
                setView("dashboard")
                setSearchQuery("")
              }}
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {/* Coins Grid - All 20 coins displayed */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
            ) : coins.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-slate-500 dark:text-slate-400">No coins available yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {coins.map((coin) => (
                  <button
                    key={coin.id}
                    onClick={() => {
                      console.log("[v0] Selected coin:", coin)
                      handleCoinSelect(coin)
                    }}
                    className="group relative bg-gradient-to-br from-slate-700 to-slate-800 dark:from-slate-700 dark:to-slate-800 rounded-lg p-4 border-2 border-slate-600 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 active:scale-95"
                  >
                    {/* Hover glow effect */}
                    <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-blue-500/10 to-transparent" />
                    
                    {/* Content */}
                    <div className="relative space-y-2">
                      {/* Coin Icon */}
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-600 dark:to-blue-800 flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform">
                        {COIN_LOGOS[coin.coin_symbol] || coin.coin_symbol[0]}
                      </div>
                      
                      {/* Coin Symbol */}
                      <p className="font-bold text-slate-900 dark:text-white text-base">{coin.coin_symbol}</p>
                      
                      {/* Coin Name */}
                      <p className="text-slate-400 dark:text-slate-400 text-xs line-clamp-1">{coin.coin_name}</p>
                      
                      {/* APY */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">{coin.apy}% APY</span>
                      </div>
                      
                      {/* Risk Badge */}
                      <span
                        className={`inline-block text-xs font-bold px-2 py-1 rounded-full w-full text-center ${
                          coin.risk_level === "Low"
                            ? "bg-green-600 text-green-100 dark:bg-green-600 dark:text-green-100"
                            : coin.risk_level === "Medium"
                              ? "bg-yellow-600 text-yellow-100 dark:bg-yellow-600 dark:text-yellow-100"
                              : "bg-red-600 text-red-100 dark:bg-red-600 dark:text-red-100"
                        }`}
                      >
                        {coin.risk_level} Risk
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* Info Footer */}
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-700 dark:to-slate-800 rounded-lg p-4 border border-slate-600 dark:border-slate-600 mt-4">
              <p className="text-slate-300 dark:text-slate-300 text-sm">
                <span className="font-semibold">💡 Tip:</span> Lower APY coins have lower risk, higher APY coins have higher risk. Select based on your risk tolerance.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staking Input View */}
      {view === "input" && selectedCoin && (
        <Card className="border border-slate-700 dark:border-slate-700 bg-slate-800 dark:bg-slate-800 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-700 dark:border-slate-700">
            <CardTitle className="text-slate-900 dark:text-white flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-600 dark:to-blue-800 flex items-center justify-center text-white font-bold">
                {COIN_LOGOS[selectedCoin.coin_symbol] || selectedCoin.coin_symbol[0]}
              </div>
              Stake {selectedCoin.coin_name}
            </CardTitle>
            <button
              onClick={() => setView("select")}
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stake Info */}
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-700 dark:to-slate-800 rounded-lg p-4 border border-slate-600 dark:border-slate-600 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 dark:text-slate-400">APY</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">{selectedCoin.apy}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 dark:text-slate-400">Lock Period</span>
                <span className="font-bold text-slate-900 dark:text-white">30 Days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 dark:text-slate-400">Risk Level</span>
                <span
                  className={`font-bold text-sm px-2 py-1 rounded ${
                    selectedCoin.risk_level === "Low"
                      ? "bg-green-600 text-green-100 dark:bg-green-600 dark:text-green-100"
                      : selectedCoin.risk_level === "Medium"
                        ? "bg-yellow-600 text-yellow-100 dark:bg-yellow-600 dark:text-yellow-100"
                        : "bg-red-600 text-red-100 dark:bg-red-600 dark:text-red-100"
                  }`}
                >
                  {selectedCoin.risk_level}
                </span>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-slate-900 dark:text-white font-semibold mb-2">Amount to Stake</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="Enter amount (min. $10)"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="bg-slate-700 dark:bg-slate-700 border border-slate-600 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-500 pr-16"
                />
                <button
                  onClick={() => setStakeAmount(currentBalance.toString())}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs font-semibold transition-colors"
                >
                  Max
                </button>
              </div>
              <p className="text-slate-400 dark:text-slate-400 text-sm mt-2">Available: ${currentBalance.toFixed(2)}</p>
            </div>

            {/* Reward Calculation */}
            {stakeAmount && parseFloat(stakeAmount) >= 10 && (
              <div className="bg-blue-600/20 dark:bg-blue-600/20 border border-blue-600 dark:border-blue-600 rounded-lg p-3 space-y-1">
                <p className="text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Your Daily Reward
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  ${((parseFloat(stakeAmount) * selectedCoin.apy) / 100 / 365).toFixed(4)} per day
                </p>
                <p className="text-blue-700 dark:text-blue-400 text-sm">
                  ${((parseFloat(stakeAmount) * selectedCoin.apy) / 100 / 365 * 30).toFixed(2)} over 30 days
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => setView("select")}
                variant="outline"
                className="flex-1 border-slate-600 dark:border-slate-600 text-slate-900 dark:text-white hover:bg-slate-700 dark:hover:bg-slate-700"
              >
                Back
              </Button>
              <Button
                onClick={handleStake}
                disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) < 10}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-600 dark:to-blue-700 text-white font-bold hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-700 dark:hover:to-blue-800 disabled:opacity-50"
              >
                {isStaking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Staking...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Confirm Stake
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active View */}
      {view === "active" && (
        <div className="space-y-4">
          <Button
            onClick={() => setView("dashboard")}
            variant="outline"
            className="border-purple-500/50 text-purple-300 hover:bg-purple-800"
          >
            <ChevronRight className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <p className="text-purple-200 text-center">Your stake has been created successfully</p>
        </div>
      )}
    </div>
  )
}
