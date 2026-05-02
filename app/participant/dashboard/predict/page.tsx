"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  History,
  ExternalLink,
  BarChart3,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { isParticipantAuthenticated } from "@/lib/auth"

import { LivePredictionMonitor } from "@/components/live-prediction-monitor"
import { ActiveTradeTracker } from "@/components/active-trade-tracker"
import { AssetLogo } from "@/components/asset-logo"

// Extended Assets with crypto and commodities
// Logos: CoinGecko CDN for crypto, TradingView CDN for forex/commodities
const CRYPTO_ASSETS = [
  // Cryptocurrencies
  { symbol: 'BTCUSDT', displayName: 'BTC/USDT', name: 'Bitcoin', logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png', iconBg: '#F7931A', chartUrl: 'https://www.tradingview.com/chart/?symbol=BINANCE:BTCUSDT', type: 'crypto' },
  { symbol: 'ETHUSDT', displayName: 'ETH/USDT', name: 'Ethereum', logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png', iconBg: '#627EEA', chartUrl: 'https://www.tradingview.com/chart/?symbol=BINANCE:ETHUSDT', type: 'crypto' },
  { symbol: 'BNBUSDT', displayName: 'BNB/USDT', name: 'Binance Coin', logo: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png', iconBg: '#F3BA2F', chartUrl: 'https://www.tradingview.com/chart/?symbol=BINANCE:BNBUSDT', type: 'crypto' },
  { symbol: 'SOLUSDT', displayName: 'SOL/USDT', name: 'Solana', logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png', iconBg: '#9945FF', chartUrl: 'https://www.tradingview.com/chart/?symbol=BINANCE:SOLUSDT', type: 'crypto' },
  { symbol: 'XRPUSDT', displayName: 'XRP/USDT', name: 'Ripple', logo: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png', iconBg: '#00AAE4', chartUrl: 'https://www.tradingview.com/chart/?symbol=BINANCE:XRPUSDT', type: 'crypto' },
  { symbol: 'DOGEUSDT', displayName: 'DOGE/USDT', name: 'Dogecoin', logo: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png', iconBg: '#C2A633', chartUrl: 'https://www.tradingview.com/chart/?symbol=BINANCE:DOGEUSDT', type: 'crypto' },
  { symbol: 'ADAUSDT', displayName: 'ADA/USDT', name: 'Cardano', logo: 'https://assets.coingecko.com/coins/images/975/large/cardano.png', iconBg: '#0033AD', chartUrl: 'https://www.tradingview.com/chart/?symbol=BINANCE:ADAUSDT', type: 'crypto' },
  { symbol: 'AVAXUSDT', displayName: 'AVAX/USDT', name: 'Avalanche', logo: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png', iconBg: '#E84142', chartUrl: 'https://www.tradingview.com/chart/?symbol=BINANCE:AVAXUSDT', type: 'crypto' },
  { symbol: 'MATICUSDT', displayName: 'MATIC/USDT', name: 'Polygon', logo: 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png', iconBg: '#8247E5', chartUrl: 'https://www.tradingview.com/chart/?symbol=BINANCE:MATICUSDT', type: 'crypto' },
  { symbol: 'SHIBUSDT', displayName: 'SHIB/USDT', name: 'Shiba Inu', logo: 'https://assets.coingecko.com/coins/images/11939/large/shiba.png', iconBg: '#FFA409', chartUrl: 'https://www.tradingview.com/chart/?symbol=BINANCE:SHIBUSDT', type: 'crypto' },
  // New Cryptocurrencies
  { symbol: 'DOTUSDT', displayName: 'DOT/USDT', name: 'Polkadot', logo: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png', iconBg: '#E6007A', chartUrl: 'https://www.tradingview.com/chart/?symbol=BINANCE:DOTUSDT', type: 'crypto' },
  { symbol: 'LTCUSDT', displayName: 'LTC/USDT', name: 'Litecoin', logo: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png', iconBg: '#A0A0A0', chartUrl: 'https://www.tradingview.com/chart/?symbol=BINANCE:LTCUSDT', type: 'crypto' },
  { symbol: 'LINKUSDT', displayName: 'LINK/USDT', name: 'Chainlink', logo: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png', iconBg: '#2A5ADA', chartUrl: 'https://www.tradingview.com/chart/?symbol=BINANCE:LINKUSDT', type: 'crypto' },
  { symbol: 'UNIUSDT', displayName: 'UNI/USDT', name: 'Uniswap', logo: 'https://assets.coingecko.com/coins/images/12504/large/uni.jpg', iconBg: '#FF007A', chartUrl: 'https://www.tradingview.com/chart/?symbol=BINANCE:UNIUSDT', type: 'crypto' },
  { symbol: 'ATOMUSDT', displayName: 'ATOM/USDT', name: 'Cosmos', logo: 'https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png', iconBg: '#2E3148', chartUrl: 'https://www.tradingview.com/chart/?symbol=BINANCE:ATOMUSDT', type: 'crypto' },
  { symbol: 'NEARUSDT', displayName: 'NEAR/USDT', name: 'NEAR Protocol', logo: 'https://assets.coingecko.com/coins/images/10365/large/near.jpg', iconBg: '#00C08B', chartUrl: 'https://www.tradingview.com/chart/?symbol=BINANCE:NEARUSDT', type: 'crypto' },
  { symbol: 'APTUSDT', displayName: 'APT/USDT', name: 'Aptos', logo: 'https://assets.coingecko.com/coins/images/26455/large/aptos_round.png', iconBg: '#27AE60', chartUrl: 'https://www.tradingview.com/chart/?symbol=BINANCE:APTUSDT', type: 'crypto' },
  { symbol: 'ARBUSDT', displayName: 'ARB/USDT', name: 'Arbitrum', logo: 'https://assets.coingecko.com/coins/images/16547/large/photo_2023-03-29_21.47.00.jpeg', iconBg: '#28A0F0', chartUrl: 'https://www.tradingview.com/chart/?symbol=BINANCE:ARBUSDT', type: 'crypto' },
  { symbol: 'OPUSDT', displayName: 'OP/USDT', name: 'Optimism', logo: 'https://assets.coingecko.com/coins/images/25244/large/Optimism.png', iconBg: '#FF0420', chartUrl: 'https://www.tradingview.com/chart/?symbol=BINANCE:OPUSDT', type: 'crypto' },
  { symbol: 'SUIUSDT', displayName: 'SUI/USDT', name: 'Sui', logo: 'https://assets.coingecko.com/coins/images/26375/large/sui_asset.jpeg', iconBg: '#4DA2FF', chartUrl: 'https://www.tradingview.com/chart/?symbol=BINANCE:SUIUSDT', type: 'crypto' },
  // Commodities
  { symbol: 'XAUUSD', displayName: 'GOLD/USD', name: 'Gold', logo: 'https://s3-symbol-logo.tradingview.com/metal/gold--big.svg', iconBg: '#FFD700', chartUrl: 'https://www.tradingview.com/chart/?symbol=OANDA:XAUUSD', type: 'commodity' },
  { symbol: 'XAGUSD', displayName: 'SILVER/USD', name: 'Silver', logo: 'https://s3-symbol-logo.tradingview.com/metal/silver--big.svg', iconBg: '#C0C0C0', chartUrl: 'https://www.tradingview.com/chart/?symbol=OANDA:XAGUSD', type: 'commodity' },
  { symbol: 'XCUUSD', displayName: 'COPPER/USD', name: 'Copper', logo: 'https://s3-symbol-logo.tradingview.com/metal/copper--big.svg', iconBg: '#B87333', chartUrl: 'https://www.tradingview.com/chart/?symbol=COMEX:HG1!', type: 'commodity' },
  { symbol: 'USOIL', displayName: 'CRUDE/USD', name: 'Crude Oil', logo: 'https://s3-symbol-logo.tradingview.com/crude-oil--big.svg', iconBg: '#2C2C2C', chartUrl: 'https://www.tradingview.com/chart/?symbol=TVC:USOIL', type: 'commodity' },
  // Forex Pairs
  { symbol: 'EURUSD', displayName: 'EUR/USD', name: 'Euro / US Dollar', logo: 'https://s3-symbol-logo.tradingview.com/country/EU--big.svg', iconBg: '#003399', chartUrl: 'https://www.tradingview.com/chart/?symbol=OANDA:EURUSD', type: 'forex' },
  { symbol: 'GBPUSD', displayName: 'GBP/USD', name: 'British Pound / US Dollar', logo: 'https://s3-symbol-logo.tradingview.com/country/GB--big.svg', iconBg: '#012169', chartUrl: 'https://www.tradingview.com/chart/?symbol=OANDA:GBPUSD', type: 'forex' },
  { symbol: 'USDJPY', displayName: 'USD/JPY', name: 'US Dollar / Japanese Yen', logo: 'https://s3-symbol-logo.tradingview.com/country/JP--big.svg', iconBg: '#BC002D', chartUrl: 'https://www.tradingview.com/chart/?symbol=OANDA:USDJPY', type: 'forex' },
  { symbol: 'USDCHF', displayName: 'USD/CHF', name: 'US Dollar / Swiss Franc', logo: 'https://s3-symbol-logo.tradingview.com/country/CH--big.svg', iconBg: '#FF0000', chartUrl: 'https://www.tradingview.com/chart/?symbol=OANDA:USDCHF', type: 'forex' },
  { symbol: 'AUDUSD', displayName: 'AUD/USD', name: 'Australian Dollar / US Dollar', logo: 'https://s3-symbol-logo.tradingview.com/country/AU--big.svg', iconBg: '#00008B', chartUrl: 'https://www.tradingview.com/chart/?symbol=OANDA:AUDUSD', type: 'forex' },
  { symbol: 'USDCAD', displayName: 'USD/CAD', name: 'US Dollar / Canadian Dollar', logo: 'https://s3-symbol-logo.tradingview.com/country/CA--big.svg', iconBg: '#FF0000', chartUrl: 'https://www.tradingview.com/chart/?symbol=OANDA:USDCAD', type: 'forex' },
  { symbol: 'NZDUSD', displayName: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', logo: 'https://s3-symbol-logo.tradingview.com/country/NZ--big.svg', iconBg: '#00247D', chartUrl: 'https://www.tradingview.com/chart/?symbol=OANDA:NZDUSD', type: 'forex' },
  { symbol: 'EURGBP', displayName: 'EUR/GBP', name: 'Euro / British Pound', logo: 'https://s3-symbol-logo.tradingview.com/country/EU--big.svg', iconBg: '#003399', chartUrl: 'https://www.tradingview.com/chart/?symbol=OANDA:EURGBP', type: 'forex' },
  { symbol: 'EURJPY', displayName: 'EUR/JPY', name: 'Euro / Japanese Yen', logo: 'https://s3-symbol-logo.tradingview.com/country/EU--big.svg', iconBg: '#003399', chartUrl: 'https://www.tradingview.com/chart/?symbol=OANDA:EURJPY', type: 'forex' },
  { symbol: 'GBPJPY', displayName: 'GBP/JPY', name: 'British Pound / Japanese Yen', logo: 'https://s3-symbol-logo.tradingview.com/country/GB--big.svg', iconBg: '#012169', chartUrl: 'https://www.tradingview.com/chart/?symbol=OANDA:GBPJPY', type: 'forex' },
]

// Timeframes for crypto trade duration (short-term)
const CRYPTO_TIMEFRAMES = [
  { label: "1M", value: 1, seconds: 60 },
  { label: "3M", value: 3, seconds: 180 },
  { label: "5M", value: 5, seconds: 300 },
  { label: "10M", value: 10, seconds: 600 },
  { label: "15M", value: 15, seconds: 900 },
]

// Timeframes for commodity trade duration (longer-term)
const COMMODITY_TIMEFRAMES = [
  { label: "30M", value: 30, seconds: 1800 },
  { label: "1H", value: 60, seconds: 3600 },
  { label: "2H", value: 120, seconds: 7200 },
  { label: "5H", value: 300, seconds: 18000 },
  { label: "10H", value: 600, seconds: 36000 },
  { label: "24H", value: 1440, seconds: 86400 },
]

// Combined TIMEFRAMES array
const TIMEFRAMES = [...CRYPTO_TIMEFRAMES, ...COMMODITY_TIMEFRAMES]

// Fixed payout rate: 80% profit (20% platform fee)
const PROFIT_RATE = 0.80

function PredictPageContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [participantData, setParticipantData] = useState<any>(null)
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, any>>({})
  const [priceFlash, setPriceFlash] = useState<Record<string, string>>({})
  const previousPrices = useRef<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Bet dialog states
  const [showBetDialog, setShowBetDialog] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<any>(null)
  const [betDirection, setBetDirection] = useState<"up" | "down">("up")
  const [betAmount, setBetAmount] = useState("")
  const [selectedTimeframe, setSelectedTimeframe] = useState(CRYPTO_TIMEFRAMES[0])
  const userEmail = participantData?.email || "" // Declared userEmail

  // History states
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  
  // Filter state
  const [assetFilter, setAssetFilter] = useState<'all' | 'crypto' | 'commodity' | 'forex'>('all')

  // Active trade tracking - for showing overlay on current asset
  const [activeTrades, setActiveTrades] = useState<Record<string, any>>({})
  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState<string | null>(null)
  const [isPlacingTrade, setIsPlacingTrade] = useState(false)

  // Balance source: "wallet" = account_balance, "referral" = bonus_balance
  const [balanceSource, setBalanceSource] = useState<"wallet" | "referral">("wallet")

  // Support both account_balance (correct) and wallet_balance (legacy) for compatibility
  const walletBalance = Number(participantData?.account_balance ?? participantData?.wallet_balance ?? 0)
  // bonus_balance is the referral earnings column in the DB (confirmed by schema).
  // referral_earnings is an alias returned by /api/participant/me for compatibility.
  const referralBalance = Number(
    participantData?.bonus_balance ||
    participantData?.referral_earnings ||
    0
  )
  const activeBalance = balanceSource === "referral" ? referralBalance : walletBalance
  
  // Filtered assets based on selected filter
  const filteredAssets = CRYPTO_ASSETS.filter(asset => {
    if (assetFilter === 'all') return true
    return asset.type === assetFilter
  })

  // Mount and authentication - Load from localStorage FIRST
  useEffect(() => {
    setMounted(true)
    const isAuthenticated = isParticipantAuthenticated()
    
    if (!isAuthenticated) {
      router.push("/participant/login")
      return
    }

    // CRITICAL: Load from localStorage FIRST to display balance immediately
    const storedData = localStorage.getItem("participantData")
    if (storedData) {
      try {
        const data = JSON.parse(storedData)
        setParticipantData(data)
      } catch (error) {
        console.error("Error parsing stored participant data:", error)
      }
    }
  }, [router])

  // Refresh participant data from database via service-role API (bypasses RLS)
  useEffect(() => {
    if (!mounted || !participantData?.email) return

    const fetchParticipantData = async () => {
      try {
        const res = await fetch(`/api/participant/me?email=${encodeURIComponent(participantData.email)}`)
        if (!res.ok) return
        const json = await res.json()
        if (json.success && json.participant) {
          const fresh = { ...participantData, ...json.participant }
          setParticipantData(fresh)
          localStorage.setItem("participantData", JSON.stringify(fresh))
        }
      } catch (error) {
        console.error("[v0] Error fetching participant data:", error)
      }
    }

    // Load active trades for the user via API
    const loadActiveTrades = async () => {
      try {
        const res = await fetch(`/api/participant/predictions?participant_email=${encodeURIComponent(participantData.email)}&status=pending`)
        const result = await res.json()
        if (result.success && result.predictions) {
          const tradesMap: Record<string, any> = {}
          result.predictions.forEach((trade: any) => {
            tradesMap[trade.crypto_pair] = trade
          })
          setActiveTrades(tradesMap)
        }
      } catch (error) {
        console.error("Error loading active trades:", error)
      }
    }

    // Initial fetch
    fetchParticipantData()
    loadActiveTrades()
    
    // Refresh participant data periodically
    const balanceInterval = setInterval(() => {
      fetchParticipantData()
      loadActiveTrades()
    }, 15000) // Check every 15 seconds

    return () => {
      clearInterval(balanceInterval)
    }
  }, [mounted, participantData?.email])

  // Fetch crypto prices
  useEffect(() => {
    if (!mounted) return

    const fetchPrices = async () => {
      try {
        const response = await fetch('/api/crypto/prices')
        const result = await response.json()

        if (!result.success) {
          throw new Error('Failed to fetch prices')
        }

        const pricesMap = result.prices

        // Handle price flash animations
        for (const symbol of Object.keys(pricesMap)) {
          const price = pricesMap[symbol].price
          if (previousPrices.current[symbol]) {
            if (price > previousPrices.current[symbol]) {
              setPriceFlash(prev => ({ ...prev, [symbol]: 'green' }))
            } else if (price < previousPrices.current[symbol]) {
              setPriceFlash(prev => ({ ...prev, [symbol]: 'red' }))
            }
          }
          previousPrices.current[symbol] = price
        }

        setCryptoPrices(pricesMap)
        setIsLoading(false)

        setTimeout(() => {
          setPriceFlash({})
        }, 500)
      } catch (error) {
        console.error("Failed to fetch prices:", error)
        setIsLoading(false)
      }
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 6000) // Update every 6 seconds to reduce load

    return () => clearInterval(interval)
  }, [mounted])

  const handlePlaceBet = async () => {
    if (isPlacingTrade) return // Prevent double-click
    
    if (!betAmount || parseFloat(betAmount) <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" })
      return
    }

    const amount = parseFloat(betAmount)
    if (amount > activeBalance) {
      toast({
        title: "Insufficient balance",
        description: balanceSource === "referral"
          ? "Not enough referral earnings. Switch to Wallet Balance or earn more referral rewards."
          : "Not enough wallet balance.",
        variant: "destructive"
      })
      return
    }

    setIsPlacingTrade(true)
    try {
      const entryPrice = cryptoPrices[selectedAsset.symbol]?.price
      if (!entryPrice) {
        toast({ title: "Price not available", variant: "destructive" })
        setIsPlacingTrade(false)
        return
      }

      // Place trade via server API (handles participant lookup, balance deduction, transaction log)
      const tradeRes = await fetch("/api/participant/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_email: userEmail,
          crypto_pair: selectedAsset.symbol,
          prediction_type: betDirection,
          amount,
          entry_price: entryPrice,
          leverage: 1,
          status: "pending",
          timeframe_seconds: selectedTimeframe.seconds,
          balance_source: balanceSource,
        }),
      })

      const tradeResult = await tradeRes.json()

      if (!tradeRes.ok || tradeResult.error) {
        toast({ title: "Failed to place trade", description: tradeResult.error, variant: "destructive" })
        setIsPlacingTrade(false)
        return
      }

      const currentFieldBalance = balanceSource === "referral" ? referralBalance : walletBalance
      const newFieldBalance = currentFieldBalance - amount

      const updatedData = balanceSource === "referral"
        ? { ...participantData, bonus_balance: newFieldBalance }
        : { ...participantData, account_balance: newFieldBalance }

      setParticipantData(updatedData)
      localStorage.setItem("participantData", JSON.stringify(updatedData))
      
      // Use the REAL database trade (with correct ID for settlement API)
      setActiveTrades((prev) => ({
        ...prev,
        [selectedAsset.symbol]: insertedTrade
      }))
      
      // Keep user on current asset to see the trade tracker
      setSelectedAssetSymbol(selectedAsset.symbol)
      
      // Close dialog immediately - the live tracker card is the feedback
      setShowBetDialog(false)
      setBetAmount("")
    } catch (error) {
      toast({ title: "Failed to place trade", variant: "destructive" })
    } finally {
      setIsPlacingTrade(false)
    }
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`
    return `$${(volume / 1e3).toFixed(2)}K`
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-100/80 to-blue-100/80 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-700 font-semibold">Loading Prediction Market...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-100/80 to-blue-100/80 relative overflow-hidden">
      {/* Decorative Background Elements - Hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute top-20 right-10 w-64 h-64 bg-purple-300/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-blue-300/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-300/10 rounded-full blur-3xl" />
      </div>
      
      {/* Header - Mobile Optimized */}
      <div className="border-b bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm relative">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3 md:py-4">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
              <Link href="/participant/dashboard">
                <Button variant="ghost" size="icon" className="rounded-lg sm:rounded-xl hover:bg-slate-100 h-8 w-8 sm:h-10 sm:w-10">
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className="hidden sm:flex h-8 w-8 md:h-9 md:w-9 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 items-center justify-center shadow-md flex-shrink-0">
                    <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                  <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent truncate">
                    Prediction Market
                  </h1>
                </div>
                <p className="text-[10px] sm:text-xs md:text-sm text-slate-500 hidden sm:block">Trade crypto, commodities & forex with live prices</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border border-purple-200">
                  <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium">Wallet</div>
                  <div className="text-xs sm:text-sm font-black text-purple-600">${walletBalance.toFixed(2)}</div>
                </div>
                {referralBalance > 0 && (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border border-emerald-200">
                    <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium">Referral</div>
                    <div className="text-xs sm:text-sm font-black text-emerald-600">${referralBalance.toFixed(2)}</div>
                  </div>
                )}
              </div>
              <Button
                onClick={() => setShowHistoryModal(true)}
                className="rounded-lg sm:rounded-xl font-bold gap-1 sm:gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2 h-auto"
              >
                <History className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">History</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Mobile Optimized */}
      <div className="container mx-auto px-2 sm:px-3 md:px-4 py-3 sm:py-4 md:py-6 relative z-10">
        {/* Filter Tabs - Mobile Optimized */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 mb-3 sm:mb-4 md:mb-6 bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 md:p-2 border border-slate-200 sm:border-2 w-full overflow-x-auto shadow-md">
          {([
            { key: 'all',       label: 'All Assets'  },
            { key: 'crypto',    label: 'Crypto'      },
            { key: 'commodity', label: 'Commodities' },
            { key: 'forex',     label: 'Forex'       },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setAssetFilter(key)}
              className={`flex-none px-3 py-2 sm:px-4 sm:py-2 md:px-6 md:py-2.5 rounded-lg sm:rounded-xl font-bold transition-all text-xs sm:text-sm md:text-base whitespace-nowrap ${
                assetFilter === key
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Low-liquidity warning — shown when Forex tab is active or forex assets are visible */}
        {(assetFilter === "forex" || assetFilter === "all") && (
          <div className="mb-3 sm:mb-4 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-amber-900 shadow-sm">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <p className="text-xs leading-relaxed">
              <span className="font-bold">Low Liquidity Warning:</span> Forex pairs move slowly and may show no movement during short timeframes. If no price change is detected when your trade closes, your bet amount will be automatically refunded to your wallet — no profit, no loss. Consider trading crypto or commodity pairs for more reliable results.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 sm:h-44 md:h-48 bg-white/50 rounded-xl sm:rounded-2xl shadow-sm" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            {filteredAssets.map((asset) => {
              const priceData = cryptoPrices[asset.symbol]
              
              // Show loading state for assets without price data yet
              if (!priceData) {
                return (
                  <div
                    key={asset.symbol}
                    className="relative overflow-hidden bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 border border-slate-200 sm:border-2 shadow-md"
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 mb-3 sm:mb-4">
                      <AssetLogo
                        symbol={asset.symbol}
                        name={asset.name}
                        logoUrl={asset.logo}
                        bgColor={asset.iconBg}
                        size={44}
                        className="rounded-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm sm:text-base md:text-lg text-slate-900 truncate">{asset.displayName}</h3>
                        <p className="text-[10px] sm:text-xs text-slate-500 truncate">{asset.name}</p>
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-500">Loading price...</div>
                  </div>
                )
              }

              const flashColor = priceFlash[asset.symbol]
              const isPositive = priceData.change >= 0

              // Check if this asset has an active trade
              const hasActiveTrade = !!activeTrades[asset.symbol]

              return (
                <div
                  key={asset.symbol}
                  onClick={() => {
                    setSelectedAssetSymbol(asset.symbol)
                  }}
                  className={`relative overflow-hidden bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] shadow-md cursor-pointer ${
                    flashColor === 'green' 
                      ? 'border-green-400 bg-green-50/30' 
                      : flashColor === 'red' 
                      ? 'border-red-400 bg-red-50/30' 
                      : hasActiveTrade
                      ? 'border-blue-400 sm:border-2 bg-blue-50/20'
                      : 'border-slate-200 sm:border-2'
                  }`}
                >
                  {/* Active Trade Indicator */}
                  {hasActiveTrade && (
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                      
                    </div>
                  )}
                  {/* Header - Compact on Mobile */}
                  <div className="flex justify-between items-start mb-2 sm:mb-3 md:mb-4">
                    <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 flex-1 min-w-0">
                      <AssetLogo
                        symbol={asset.symbol}
                        name={asset.name}
                        logoUrl={asset.logo}
                        bgColor={asset.iconBg}
                        size={44}
                        className="rounded-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm sm:text-base md:text-lg text-slate-900 truncate">{asset.displayName}</h3>
                        <p className="text-[10px] sm:text-xs text-slate-500 truncate">{asset.name}</p>
                      </div>
                    </div>
                    <a
                      href={asset.chartUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                    >
                      <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                    </a>
                  </div>

                  {/* Price - Responsive Sizing */}
                  <div className="mb-2 sm:mb-3">
                    <div className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900">
                      ${priceData?.price ? priceData.price.toFixed(priceData.price < 1 ? 6 : 2) : '0.00'}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 mt-1">
                      <span className={`flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />}
                        {isPositive ? '+' : ''}{priceData?.change ? priceData.change.toFixed(2) : '0.00'}%
                      </span>
                      <span className="text-[10px] sm:text-xs text-slate-500">
                        Vol: {priceData?.volume ? formatVolume(priceData.volume) : '$0'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons - Mobile Optimized */}
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    <Button
                      onClick={() => {
                        setSelectedAsset(asset)
                        setBetDirection("up")
                        setBetAmount("")
                        setBalanceSource("wallet")
                        // Reset to appropriate timeframe for asset type
                        setSelectedTimeframe(asset.type === 'commodity' ? COMMODITY_TIMEFRAMES[0] : CRYPTO_TIMEFRAMES[0])
                        setShowBetDialog(true)
                      }}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-lg sm:rounded-xl h-9 sm:h-10 md:h-12 shadow-lg text-xs sm:text-sm"
                    >
                      <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                      UP
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedAsset(asset)
                        setBetDirection("down")
                        setBetAmount("")
                        setBalanceSource("wallet")
                        // Reset to appropriate timeframe for asset type
                        setSelectedTimeframe(asset.type === 'commodity' ? COMMODITY_TIMEFRAMES[0] : CRYPTO_TIMEFRAMES[0])
                        setShowBetDialog(true)
                      }}
                      className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold rounded-lg sm:rounded-xl h-9 sm:h-10 md:h-12 shadow-lg text-xs sm:text-sm"
                    >
                      <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                      DOWN
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bet Dialog */}
      <Dialog open={showBetDialog} onOpenChange={setShowBetDialog}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-xs sm:max-w-sm p-0 overflow-hidden max-h-[90dvh] flex flex-col">
          {/* Compact header */}
          <DialogHeader className="px-4 pt-4 pb-2 flex-shrink-0">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black text-white ${betDirection === "up" ? "bg-green-500" : "bg-red-500"}`}>
                {betDirection.toUpperCase()}
              </span>
              Place Trade
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-3">
            {/* Asset Info */}
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg">
              <Image
                src={selectedAsset?.logo || "/placeholder.svg"}
                alt={selectedAsset?.name || "Asset"}
                width={28}
                height={28}
                className="rounded-full flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight truncate">{selectedAsset?.displayName}</div>
                <div className="text-[10px] text-slate-500">
                  ${selectedAsset && cryptoPrices[selectedAsset.symbol]?.price ? cryptoPrices[selectedAsset.symbol].price.toFixed(2) : '0.00'}
                </div>
              </div>
            </div>

            {/* Balance Source Toggle */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Use Balance From</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setBalanceSource("wallet")}
                  className={`flex flex-col items-start px-2.5 py-2 rounded-lg border-2 transition-all text-left ${
                    balanceSource === "wallet"
                      ? "border-purple-500 bg-purple-50"
                      : "border-slate-200 hover:border-purple-300 bg-white"
                  }`}
                >
                  <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Wallet</span>
                  <span className={`text-sm font-black ${balanceSource === "wallet" ? "text-purple-700" : "text-slate-800"}`}>
                    ${walletBalance.toFixed(2)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceSource("referral")}
                  className={`flex flex-col items-start px-2.5 py-2 rounded-lg border-2 transition-all text-left ${
                    balanceSource === "referral"
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 hover:border-emerald-300 bg-white"
                  }`}
                >
                  <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Referral</span>
                  <span className={`text-sm font-black ${balanceSource === "referral" ? "text-emerald-700" : "text-slate-800"}`}>
                    ${referralBalance.toFixed(2)}
                  </span>
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Amount</Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="h-9 text-sm pr-14 border-slate-300 focus:border-purple-500 rounded-lg"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">USDT</span>
              </div>
              <div className="text-[10px] text-slate-500">
                Available: <span className={`font-semibold ${balanceSource === "referral" ? "text-emerald-600" : "text-purple-600"}`}>${activeBalance.toFixed(2)}</span>
              </div>
            </div>

            {/* Timeframe Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">
                Duration {selectedAsset?.type === 'commodity' && <span className="text-slate-400 font-normal">(Extended)</span>}
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(selectedAsset?.type === 'commodity' ? COMMODITY_TIMEFRAMES : CRYPTO_TIMEFRAMES).map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => setSelectedTimeframe(tf)}
                    className={`h-8 rounded-lg text-xs font-bold transition-all ${
                      selectedTimeframe.value === tf.value
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md scale-105"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              {/* Payout Summary */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 mt-1">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-emerald-700">Profit Rate</span>
                  <span className="font-bold text-emerald-800">80%</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Platform Fee</span>
                  <span className="text-slate-600">20%</span>
                </div>
                <div className="border-t border-emerald-200 mt-2 pt-1.5 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-700">Potential Profit</span>
                    <span className="font-bold text-emerald-800">${((parseFloat(betAmount) || 0) * PROFIT_RATE).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-emerald-700">Total Payout</span>
                    <span className="font-bold text-sm text-emerald-900">${((parseFloat(betAmount) || 0) + (parseFloat(betAmount) || 0) * PROFIT_RATE).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Place Trade Button */}
            <Button
              onClick={handlePlaceBet}
              disabled={isPlacingTrade}
              className={`w-full h-9 rounded-lg font-bold text-sm text-white ${
                betDirection === "up"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  : "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
              } disabled:opacity-60`}
            >
              {isPlacingTrade ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Placing...
                </span>
              ) : (
                <>Place {betDirection.toUpperCase()} Trade</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Trade History</DialogTitle>
          </DialogHeader>
          <LivePredictionMonitor
            userEmail={participantData?.email || ""}
            currentPrices={cryptoPrices}
            onBalanceUpdate={async () => {
              // Refresh participant data when balance updates
              const storedData = localStorage.getItem("participantData")
              if (!storedData) return
              const parsedData = JSON.parse(storedData)
              const email = parsedData?.email
              if (!email) return
              const { data } = await supabase
                .from("participants")
                .select("*")
                .eq("email", email)
                .single()
              if (data) {
                setParticipantData(data)
                localStorage.setItem("participantData", JSON.stringify(data))
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Active Trade Tracker - Shows for selected asset with active trade */}
      {selectedAssetSymbol && activeTrades[selectedAssetSymbol] && cryptoPrices[selectedAssetSymbol] && (
        <ActiveTradeTracker
          activeTrade={activeTrades[selectedAssetSymbol]}
          currentPrice={cryptoPrices[selectedAssetSymbol].price}
          onTradeSettled={() => {}}
        />
      )}
    </div>
  )
}

export default function PredictPage() {
  return <PredictPageContent />
}
