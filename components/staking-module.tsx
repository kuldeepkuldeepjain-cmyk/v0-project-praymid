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
  BTC: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/bitcoin/default.svg",
  ETH: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/ethereum/default.svg",
  BNB: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/binancecoin/default.svg",
  SOL: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/solana/default.svg",
  XRP: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/ripple/default.svg",
  DOGE: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/dogecoin/default.svg",
  ADA: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/cardano/default.svg",
  AVAX: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/avalanche-2/default.svg",
  LINK: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/chainlink/default.svg",
  DOT: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/polkadot/default.svg",
  TRX: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/tron/default.svg",
  LTC: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/litecoin/default.svg",
  ATOM: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/cosmos/default.svg",
  MATIC: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/polygon/default.svg",
  ARB: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/arbitrum/default.svg",
  APT: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/aptos/default.svg",
  SUI: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/sui/default.svg",
  TON: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/ton/default.svg",
  NEAR: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/near-protocol/default.svg",
  FLOW: "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/flow/default.svg",
}

export function StakingModule({ currentBalance, participantEmail, onBalanceUpdated }: StakingModuleProps) {
  const { toast } = useToast()
  const [view, setView] = useState<"dashboard" | "select" | "input" | "active">("dashboard")
  const [coins, setCoins] = useState<StakingCoin[]>([])
  const [stakes, setStakes] = useState<Stake[]>([])
  const [selectedCoin, setSelectedCoin] = useState<StakingCoin | null>(null)
  const [failedLogos, setFailedLogos] = useState<Set<string>>(new Set())
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

        if (!response.ok) {
          throw new Error(`Failed to fetch coins: ${response.status}`)
        }
        
        const data = await response.json()
        
        // Use coins from API (which now includes hardcoded fallback)
        setCoins(data.coins || [])
        setLoading(false)
      } catch (error) {
        console.error("[v0] Failed to fetch coins:", error)
        // Use hardcoded coins as final fallback
        const hardcodedCoins = [
          { id: 1, coin_symbol: 'BTC', coin_name: 'Bitcoin', apy: 8, risk_level: 'Low', enabled: true },
          { id: 2, coin_symbol: 'ETH', coin_name: 'Ethereum', apy: 9, risk_level: 'Low', enabled: true },
          { id: 3, coin_symbol: 'BNB', coin_name: 'Binance Coin', apy: 10, risk_level: 'Low', enabled: true },
          { id: 4, coin_symbol: 'DOGE', coin_name: 'Dogecoin', apy: 11, risk_level: 'Low', enabled: true },
          { id: 5, coin_symbol: 'SOL', coin_name: 'Solana', apy: 12, risk_level: 'Medium', enabled: true },
          { id: 6, coin_symbol: 'XRP', coin_name: 'XRP', apy: 13, risk_level: 'Medium', enabled: true },
          { id: 7, coin_symbol: 'ADA', coin_name: 'Cardano', apy: 14, risk_level: 'Medium', enabled: true },
          { id: 8, coin_symbol: 'LINK', coin_name: 'Chainlink', apy: 15, risk_level: 'Medium', enabled: true },
          { id: 9, coin_symbol: 'DOT', coin_name: 'Polkadot', apy: 16, risk_level: 'Medium', enabled: true },
          { id: 10, coin_symbol: 'AVAX', coin_name: 'Avalanche', apy: 17, risk_level: 'Medium', enabled: true },
          { id: 11, coin_symbol: 'TRX', coin_name: 'Tron', apy: 18, risk_level: 'High', enabled: true },
          { id: 12, coin_symbol: 'LTC', coin_name: 'Litecoin', apy: 19, risk_level: 'High', enabled: true },
          { id: 13, coin_symbol: 'ATOM', coin_name: 'Cosmos', apy: 20, risk_level: 'High', enabled: true },
          { id: 14, coin_symbol: 'MATIC', coin_name: 'Polygon', apy: 21, risk_level: 'High', enabled: true },
          { id: 15, coin_symbol: 'ARB', coin_name: 'Arbitrum', apy: 22, risk_level: 'High', enabled: true },
          { id: 16, coin_symbol: 'APT', coin_name: 'Aptos', apy: 23, risk_level: 'High', enabled: true },
          { id: 17, coin_symbol: 'SUI', coin_name: 'Sui', apy: 24, risk_level: 'High', enabled: true },
          { id: 18, coin_symbol: 'TON', coin_name: 'Ton', apy: 24, risk_level: 'High', enabled: true },
          { id: 19, coin_symbol: 'FLOW', coin_name: 'Flow', apy: 25, risk_level: 'High', enabled: true },
          { id: 20, coin_symbol: 'NEAR', coin_name: 'Near Protocol', apy: 25, risk_level: 'High', enabled: true },
        ]
        setCoins(hardcodedCoins)
        setLoading(false)
      }
    }

    fetchCoins()
  }, [])

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
    <div className="w-full space-y-3">
      {/* Dashboard View */}
      {view === "dashboard" && (
        <>
          {/* Compact Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-600/30 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="text-white text-xs font-bold leading-none">Staking</p>
                <p className="text-slate-400 text-[10px] leading-none mt-0.5">Earn passive income</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-violet-300 bg-violet-500/15 border border-violet-500/25 rounded-full px-2 py-0.5">8–25% APY</span>
              <button onClick={() => setView("select")} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-white text-[10px] font-bold transition-all active:scale-95" style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>
                <Zap className="h-3 w-3" /> Stake
              </button>
            </div>
          </div>

          {/* Compact 4-stat grid */}
          <div className="grid grid-cols-4 gap-1.5">
            <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-2 text-center">
              <p className="text-violet-300 text-[9px] uppercase tracking-wide">Locked</p>
              <p className="text-white text-xs font-bold mt-0.5">${dashboardStats.totalLocked.toFixed(0)}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2 text-center">
              <p className="text-emerald-300 text-[9px] uppercase tracking-wide">Earned</p>
              <p className="text-white text-xs font-bold mt-0.5">${dashboardStats.totalEarned.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-2 text-center">
              <p className="text-orange-300 text-[9px] uppercase tracking-wide">Active</p>
              <p className="text-white text-xs font-bold mt-0.5">{dashboardStats.activeStakes}</p>
            </div>
            <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-2 text-center">
              <p className="text-cyan-300 text-[9px] uppercase tracking-wide">Avg APY</p>
              <p className="text-white text-xs font-bold mt-0.5">{dashboardStats.averageApy}%</p>
            </div>
          </div>

          {/* Active Stakes Section */}
          {dashboardStats.activeStakes > 0 && (
            <div className="space-y-1.5">
              <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Active Stakes</p>
              {stakes
                .filter((s) => s.status === "Active")
                .map((stake) => (
                  <div key={stake.id} className="rounded-xl bg-white/5 border border-white/8 p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {failedLogos.has(stake.coin_symbol) ? (
                            <span className="text-[10px] font-bold text-violet-400">{stake.coin_symbol[0]}</span>
                          ) : (
                            <img src={COIN_LOGOS[stake.coin_symbol]} alt={stake.coin_symbol} className="h-5 w-5 object-contain" onError={() => setFailedLogos(prev => new Set([...prev, stake.coin_symbol]))} />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-white text-xs">{stake.coin_symbol}</p>
                          <p className="text-slate-400 text-[10px]">${stake.amount.toFixed(0)} · {stake.apy}% APY</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-400 text-xs">+${stake.daily_reward.toFixed(4)}/d</p>
                        <p className="text-slate-400 text-[10px]">Earned: ${stake.total_earned.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="h-0.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500" style={{ width: `${Math.min(((new Date().getTime() - new Date(stake.start_date).getTime()) / (new Date(stake.end_date).getTime() - new Date(stake.start_date).getTime())) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Available Coins Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Available Coins</p>
              <p className="text-slate-500 text-[10px]">{coins.length} coins</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
              </div>
            ) : coins.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <AlertCircle className="h-6 w-6 text-slate-500" />
                <p className="text-slate-400 text-xs text-center">No coins available yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {coins.map((coin) => (
                  <button
                    key={coin.id}
                    onClick={() => { setSelectedCoin(coin); setView("input"); setStakeAmount("") }}
                    className="group rounded-xl p-2.5 border border-white/8 hover:border-violet-500/40 bg-white/5 hover:bg-violet-500/10 transition-all text-left active:scale-95"
                  >
                    <div className="h-9 w-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center mb-2 overflow-hidden">
                      {failedLogos.has(coin.coin_symbol) ? (
                        <span className="text-xs font-bold text-violet-400">{coin.coin_symbol[0]}</span>
                      ) : (
                        <img src={COIN_LOGOS[coin.coin_symbol]} alt={coin.coin_symbol} className="h-7 w-7 object-contain" onError={() => setFailedLogos(prev => new Set([...prev, coin.coin_symbol]))} />
                      )}
                    </div>
                    <p className="font-bold text-white text-[11px] leading-none">{coin.coin_symbol}</p>
                    <p className="text-slate-400 text-[9px] mt-0.5 mb-1.5 truncate">{coin.coin_name}</p>
                    <p className="text-violet-400 font-bold text-[11px]">{coin.apy}%</p>
                    <span className={`inline-block text-[9px] font-bold px-1 py-0.5 rounded mt-0.5 ${coin.risk_level === "Low" ? "bg-emerald-500/20 text-emerald-400" : coin.risk_level === "Medium" ? "bg-orange-500/20 text-orange-400" : "bg-red-500/20 text-red-400"}`}>
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
                    className="group relative bg-gradient-to-br from-purple-100 to-purple-50 dark:from-slate-700 dark:to-slate-800 rounded-lg p-4 border-2 border-purple-300 dark:border-slate-600 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 active:scale-95"
                  >
                    {/* Hover glow effect */}
                    <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-purple-500/10 to-transparent" />
                    
                    {/* Content */}
                    <div className="relative space-y-2">
                      {/* Coin Icon */}
                      <div className="h-12 w-12 rounded-full bg-white border-2 border-purple-300 dark:bg-slate-600 dark:border-slate-500 flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden">
                        {failedLogos.has(coin.coin_symbol) ? (
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center text-white font-bold text-sm">
                            {coin.coin_symbol[0]}
                          </div>
                        ) : (
                          <img 
                            src={COIN_LOGOS[coin.coin_symbol]} 
                            alt={coin.coin_symbol}
                            className="h-10 w-10 object-contain"
                            onError={() => {
                              setFailedLogos(prev => new Set([...prev, coin.coin_symbol]))
                            }}
                          />
                        )}
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
