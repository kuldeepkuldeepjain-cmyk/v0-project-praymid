"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  DollarSign,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  BarChart3,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { isParticipantAuthenticated } from "@/lib/auth"
import { createClient } from "@/lib/supabase/client"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AssetLogo } from "@/components/asset-logo"

const CRYPTO_ASSETS: Record<string, { name: string; color: string }> = {
  // Crypto
  BTCUSDT: { name: 'Bitcoin', color: '#F7931A' },
  ETHUSDT: { name: 'Ethereum', color: '#627EEA' },
  BNBUSDT: { name: 'BNB', color: '#F3BA2F' },
  SOLUSDT: { name: 'Solana', color: '#14F195' },
  XRPUSDT: { name: 'XRP', color: '#00AAE4' },
  DOGEUSDT: { name: 'Dogecoin', color: '#C2A633' },
  ADAUSDT: { name: 'Cardano', color: '#0033AD' },
  AVAXUSDT: { name: 'Avalanche', color: '#E84142' },
  MATICUSDT: { name: 'Polygon', color: '#8247E5' },
  SHIBUSDT: { name: 'Shiba Inu', color: '#FFA409' },
  DOTUSDT: { name: 'Polkadot', color: '#E6007A' },
  LTCUSDT: { name: 'Litecoin', color: '#A0A0A0' },
  LINKUSDT: { name: 'Chainlink', color: '#2A5ADA' },
  UNIUSDT: { name: 'Uniswap', color: '#FF007A' },
  ATOMUSDT: { name: 'Cosmos', color: '#2E3148' },
  NEARUSDT: { name: 'NEAR Protocol', color: '#00C08B' },
  APTUSDT: { name: 'Aptos', color: '#27AE60' },
  ARBUSDT: { name: 'Arbitrum', color: '#28A0F0' },
  OPUSDT: { name: 'Optimism', color: '#FF0420' },
  SUIUSDT: { name: 'Sui', color: '#4DA2FF' },
  // Commodities
  XAUUSD: { name: 'Gold', color: '#FFD700' },
  XAGUSD: { name: 'Silver', color: '#C0C0C0' },
  XCUUSD: { name: 'Copper', color: '#B87333' },
  USOIL: { name: 'Crude Oil', color: '#2C2C2C' },
  // Forex
  EURUSD: { name: 'EUR/USD', color: '#003399' },
  GBPUSD: { name: 'GBP/USD', color: '#012169' },
  USDJPY: { name: 'USD/JPY', color: '#BC002D' },
  USDCHF: { name: 'USD/CHF', color: '#FF0000' },
  AUDUSD: { name: 'AUD/USD', color: '#00008B' },
  USDCAD: { name: 'USD/CAD', color: '#FF0000' },
  NZDUSD: { name: 'NZD/USD', color: '#00247D' },
  EURGBP: { name: 'EUR/GBP', color: '#003399' },
  EURJPY: { name: 'EUR/JPY', color: '#003399' },
  GBPJPY: { name: 'GBP/JPY', color: '#012169' },
}

export default function PredictionHistoryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [participantData, setParticipantData] = useState<any>(null)
  const [predictions, setPredictions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'won' | 'lost' | 'pending'>('all')
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null)
  
  // Live price data for chart
  const [livePrices, setLivePrices] = useState<Record<string, number>>({})
  const [priceHistory, setPriceHistory] = useState<any[]>([])

  // Statistics
  const [stats, setStats] = useState({
    totalTrades: 0,
    won: 0,
    lost: 0,
    pending: 0,
    totalProfit: 0,
    totalLoss: 0,
    winRate: 0,
    avgProfit: 0,
  })

  useEffect(() => {
    setMounted(true)
    const isAuthenticated = isParticipantAuthenticated()
    
    if (!isAuthenticated) {
      router.push("/participant/login")
      return
    }

    const storedData = localStorage.getItem("participantData")
    if (storedData) {
      try {
        const data = JSON.parse(storedData)
        setParticipantData(data)
      } catch (error) {
        console.error("Error parsing participant data:", error)
      }
    }
  }, [router])

  // Fetch predictions
  useEffect(() => {
    if (!mounted || !participantData?.email) return

    const fetchPredictions = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("predictions")
          .select("*")
          .eq("participant_email", participantData.email)
          .order("created_at", { ascending: false })
          .limit(50)

        if (error) return

        setPredictions(data || [])
        calculateStats(data || [])
        setIsLoading(false)
      } catch (error) {
        setIsLoading(false)
      }
    }

    fetchPredictions()
    const interval = setInterval(fetchPredictions, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [mounted, participantData?.email])

  // Fetch live prices
  useEffect(() => {
    if (!mounted) return

    const fetchPrices = async () => {
      try {
        const response = await fetch('/api/crypto/prices')
        const result = await response.json()
        if (result.success) {
          const prices: Record<string, number> = {}
          Object.keys(result.prices).forEach(symbol => {
            prices[symbol] = result.prices[symbol].price
          })
          setLivePrices(prices)
          
          // Add to price history for chart
          const timestamp = new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          })
          setPriceHistory(prev => {
            const newHistory = [...prev, { time: timestamp, ...prices }]
            return newHistory.slice(-20) // Keep last 20 data points
          })
        }
      } catch (error) {
        console.error("Error fetching prices:", error)
      }
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 6000)
    return () => clearInterval(interval)
  }, [mounted])

  const calculateStats = (data: any[]) => {
    const won = data.filter(p => p.status === 'won').length
    const lost = data.filter(p => p.status === 'lost').length
    const pending = data.filter(p => p.status === 'pending').length
    
    const totalProfit = data
      .filter(p => p.status === 'won')
      .reduce((sum, p) => sum + (p.profit_loss || 0), 0)
    
    const totalLoss = Math.abs(data
      .filter(p => p.status === 'lost')
      .reduce((sum, p) => sum + (p.profit_loss || 0), 0))
    
    const settled = won + lost
    const winRate = settled > 0 ? (won / settled) * 100 : 0
    
    const avgProfit = won > 0 ? totalProfit / won : 0

    setStats({
      totalTrades: data.length,
      won,
      lost,
      pending,
      totalProfit,
      totalLoss,
      winRate,
      avgProfit,
    })
  }

  const filteredPredictions = predictions.filter(p => {
    if (filter === 'all') return true
    if (filter === 'won') return p.status === 'won'
    if (filter === 'lost') return p.status === 'lost'
    if (filter === 'pending') return p.status === 'pending'
    return true
  })

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/participant/dashboard/predict">
                <Button variant="ghost" size="icon" className="rounded-lg hover:bg-slate-800">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Trading History
                </h1>
                <p className="text-sm text-slate-400">Track your prediction performance</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-900/50 border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Trades</p>
                <p className="text-xl font-black text-white">{stats.totalTrades}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Win Rate</p>
                <p className="text-xl font-black text-emerald-400">{stats.winRate.toFixed(1)}%</p>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Profit</p>
                <p className="text-xl font-black text-emerald-400">${stats.totalProfit.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Loss</p>
                <p className="text-xl font-black text-red-400">${stats.totalLoss.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Live Price Chart */}
        {priceHistory.length > 0 && (
          <Card className="bg-slate-900/50 border-slate-800 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Live Market Price</h3>
                <p className="text-sm text-slate-400">Real-time asset price tracking</p>
              </div>
              <BarChart3 className="h-5 w-5 text-blue-400" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceHistory}>
                  <defs>
                    <linearGradient id="colorBTC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F7931A" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F7931A" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorETH" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#627EEA" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#627EEA" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      border: '1px solid #1e293b',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="BTCUSDT" 
                    stroke="#F7931A" 
                    fill="url(#colorBTC)"
                    name="BTC"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="ETHUSDT" 
                    stroke="#627EEA" 
                    fill="url(#colorETH)"
                    name="ETH"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 bg-slate-900/50 rounded-xl p-2 border border-slate-800">
          {[
            { value: 'all', label: 'All Trades', icon: Activity },
            { value: 'won', label: 'Won', icon: TrendingUp },
            { value: 'lost', label: 'Lost', icon: TrendingDown },
            { value: 'pending', label: 'Active', icon: Clock },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as any)}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                filter === tab.value
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <tab.icon className="h-4 w-4 inline mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Predictions List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        ) : filteredPredictions.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-800 p-12 text-center">
            <Target className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No predictions found</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredPredictions.map((prediction) => {
              const asset = CRYPTO_ASSETS[prediction.crypto_pair]
              const isWon = prediction.status === 'won'
              const isLost = prediction.status === 'lost'
              const isPending = prediction.status === 'pending'
              const currentPrice = livePrices[prediction.crypto_pair]
              const priceChange = currentPrice ? ((currentPrice - prediction.entry_price) / prediction.entry_price) * 100 : 0

              return (
                <Card 
                  key={prediction.id}
                  className={`border-2 transition-all hover:scale-[1.01] cursor-pointer ${
                    isWon ? 'bg-emerald-950/30 border-emerald-800/50' :
                    isLost ? 'bg-red-950/30 border-red-800/50' :
                    'bg-slate-900/50 border-slate-800'
                  }`}
                  onClick={() => setSelectedPrediction(prediction)}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <AssetLogo
                          symbol={prediction.crypto_pair}
                          name={asset?.name || prediction.crypto_pair}
                          bgColor={asset?.color}
                          size={40}
                        />
                        <div>
                          <p className="font-bold text-white">{prediction.crypto_pair}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(prediction.created_at).toLocaleDateString()} {new Date(prediction.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      
                      {isPending ? (
                        <div className="flex items-center gap-2 bg-blue-500/20 px-3 py-1 rounded-full">
                          <Clock className="h-4 w-4 text-blue-400 animate-pulse" />
                          <span className="text-sm font-bold text-blue-400">Active</span>
                        </div>
                      ) : isWon ? (
                        <div className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1 rounded-full">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span className="text-sm font-bold text-emerald-400">Won</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1 rounded-full">
                          <XCircle className="h-4 w-4 text-red-400" />
                          <span className="text-sm font-bold text-red-400">Lost</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Direction</p>
                        <div className={`flex items-center gap-1 ${
                          prediction.prediction_type === 'up' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {prediction.prediction_type === 'up' ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          <span className="font-bold">{prediction.prediction_type.toUpperCase()}</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400 mb-1">Entry Price</p>
                        <p className="font-bold text-white">${prediction.entry_price?.toFixed(2)}</p>
                      </div>

                      {isPending && currentPrice && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Current Price</p>
                          <p className={`font-bold ${priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            ${currentPrice.toFixed(2)}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="text-xs text-slate-400 mb-1">Amount</p>
                        <p className="font-bold text-white">${prediction.amount?.toFixed(2)}</p>
                      </div>

                      {!isPending && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1">P/L</p>
                          <p className={`font-bold ${isWon ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isWon ? '+' : ''}{prediction.profit_loss?.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
