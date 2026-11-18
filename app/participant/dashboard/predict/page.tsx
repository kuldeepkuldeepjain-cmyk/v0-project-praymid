"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import {
  Activity,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  History,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  ShieldCheck,
  LockKeyhole,
  RotateCcw,
  WalletCards,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { isParticipantAuthenticated, participantFetch } from "@/lib/auth"
import { getFundedPredictionMaxAmount } from "@/lib/funded-account"
import { LivePredictionMonitor } from "@/components/live-prediction-monitor"
import { ActiveTradeTracker } from "@/components/active-trade-tracker"
import { AssetLogo } from "@/components/asset-logo"
import { PredictionMarketFocus, type PredictionMarketAsset } from "@/components/prediction-market-focus"

// Extended Assets with crypto and commodities
// Logos: CoinGecko CDN for crypto, TradingView CDN for forex/commodities
const CRYPTO_ASSETS: PredictionMarketAsset[] = [
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

// Fixed payout rate: 50% profit (50% platform fee)
const PROFIT_RATE = 0.50

function PredictPageContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [participantData, setParticipantData] = useState<any>(null)
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, any>>({})
  const [priceFlash, setPriceFlash] = useState<Record<string, string>>({})
  const previousPrices = useRef<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [priceError, setPriceError] = useState<string | null>(null)
  const [participantError, setParticipantError] = useState<string | null>(null)

  // Bet dialog states
  const [showBetDialog, setShowBetDialog] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<any>(null)
  const [betDirection, setBetDirection] = useState<"up" | "down">("up")
  const [betAmount, setBetAmount] = useState("")
  const [selectedTimeframe, setSelectedTimeframe] = useState(CRYPTO_TIMEFRAMES[0])
  const userEmail = participantData?.email || "" // Declared userEmail

  // History states
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  
  // Market browsing state
  const [assetFilter, setAssetFilter] = useState<'all' | 'crypto' | 'commodity' | 'forex'>('all')
  const [assetSearch, setAssetSearch] = useState("")
  const [marketDensity, setMarketDensity] = useState<"compact" | "comfortable">("compact")

  // Active trade tracking - for showing overlay on current asset
  const [activeTrades, setActiveTrades] = useState<Record<string, any>>({})
  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState<string | null>(CRYPTO_ASSETS[0].symbol)
  const [isPlacingTrade, setIsPlacingTrade] = useState(false)
  const [isResettingDemo, setIsResettingDemo] = useState(false)
  const [tradeMode, setTradeMode] = useState<"demo" | "real">("demo")

  const [demoAccount, setDemoAccount] = useState({
    starting_balance: 1000,
    available_balance: 1000,
    settled_profit_loss: 0,
    open_trades: 0,
  })
  const demoBalance = Number(demoAccount.available_balance || 0)
  const demoProfitLoss = Number(demoAccount.settled_profit_loss || 0)
  const walletBalance = Number(participantData?.account_balance ?? participantData?.wallet_balance ?? 0)
  const fundedPredictionMax = getFundedPredictionMaxAmount(
    participantData?.account_type,
    walletBalance,
    participantData?.funded_initial_balance,
  )
  const activeBalance = tradeMode === "demo" ? demoBalance : walletBalance
  
  // Filtered assets based on selected market class and search query
  const filteredAssets = CRYPTO_ASSETS.filter((asset) => {
    const matchesType = assetFilter === "all" || asset.type === assetFilter
    const query = assetSearch.trim().toLowerCase()
    const matchesSearch = !query || `${asset.displayName} ${asset.name} ${asset.symbol}`.toLowerCase().includes(query)
    return matchesType && matchesSearch
  })
  const focusedAsset = filteredAssets.find((asset) => asset.symbol === selectedAssetSymbol) ?? filteredAssets[0] ?? null
  const topMovers = CRYPTO_ASSETS
    .map((asset) => {
      const priceData = cryptoPrices[asset.symbol]
      const change = typeof priceData?.change === "number" ? priceData.change : Number.NaN
      return { asset, priceData, change }
    })
    .filter((item) => item.priceData && Number.isFinite(item.change))
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 3)

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

  // Stable refs so interval callbacks don't go stale
  const emailRef = useRef<string>("")
  if (participantData?.email) emailRef.current = participantData.email

  const fetchParticipantData = useCallback(async () => {
    const email = emailRef.current
    if (!email) return
    try {
      const res = await participantFetch(`/api/participant/me?email=${encodeURIComponent(email)}`)
      if (!res.ok) throw new Error(`Participant data unavailable (${res.status})`)
      const json = await res.json()
      if (!json.success || !json.participant) throw new Error("Participant data returned an invalid response")
      setParticipantData((prev: any) => {
        const fresh = { ...prev, ...json.participant }
        localStorage.setItem("participantData", JSON.stringify(fresh))
        return fresh
      })
      setParticipantError(null)
    } catch (error) {
      console.error("[v0] Participant data refresh failed:", error)
      setParticipantError("Account data could not be refreshed. Your current balance and trades remain visible.")
    }
  }, [])

  const loadActiveTrades = useCallback(async () => {
    const email = emailRef.current
    if (!email) return
    try {
      const res = await participantFetch(`/api/participant/predictions?participant_email=${encodeURIComponent(email)}&status=pending`)
      const json = await res.json()
      const data: any[] = json.predictions || []
      if (json.demo_account) {
        setDemoAccount(json.demo_account)
      }
      // Only keep trades that are still genuinely pending from DB
      const tradesMap: Record<string, any> = {}
      data.forEach((trade: any) => {
        if (trade.status === "pending") tradesMap[trade.crypto_pair] = trade
      })
      if (!res.ok) throw new Error(`Active trades unavailable (${res.status})`)
      setActiveTrades(prev => {
        const next: Record<string, any> = { ...tradesMap }
        // Keep locally-placed trades not yet confirmed by DB
        Object.entries(prev).forEach(([pair, t]) => {
          if (t.status === "pending" && !next[pair]) next[pair] = t
        })
        return next
      })
    } catch (error) {
      console.error("[v0] Active trade refresh failed:", error)
      // Never clear active trades on a transient read failure.
    }
  }, [])

  // Initial data load — runs once when email is known
  useEffect(() => {
    if (!mounted || !participantData?.email) return
    fetchParticipantData()
    loadActiveTrades()
  }, [mounted, participantData?.email, fetchParticipantData, loadActiveTrades])

  // Stable polling interval — never re-registers
  useEffect(() => {
    if (!mounted) return
    const iv = setInterval(() => {
      fetchParticipantData()
      loadActiveTrades()
    }, 15000)
    return () => clearInterval(iv)
  }, [mounted, fetchParticipantData, loadActiveTrades])

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
      setPriceError(null)
      setIsLoading(false)

      setTimeout(() => {
        setPriceFlash({})
      }, 500)
    } catch (error) {
      console.error("[v0] Prediction price refresh failed:", error)
      setPriceError(Object.keys(previousPrices.current).length > 0 ? "Live prices are temporarily unavailable. Existing prices remain visible." : "Live prices are unavailable. Please retry when the feed reconnects.")
      setIsLoading(false)
    }

    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 6000) // Update every 6 seconds to reduce load

    return () => clearInterval(interval)
  }, [mounted])

  const handlePlaceBet = async () => {
    if (isPlacingTrade || !selectedAsset) return

    const amount = Number.parseFloat(betAmount)
    const accountLabel = tradeMode === "demo" ? "demo" : "real"
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: `Enter a valid ${accountLabel} amount`, variant: "destructive" })
      return
    }
    if (tradeMode === "real" && fundedPredictionMax !== null && amount > fundedPredictionMax) {
      toast({
        title: "Funded prediction limit exceeded",
        description: `Your current real-trade limit is $${fundedPredictionMax.toFixed(2)}.`,
        variant: "destructive",
      })
      return
    }
    if (amount > activeBalance) {
      toast({
        title: `Not enough ${accountLabel} funds`,
        description: `You have $${activeBalance.toFixed(2)} available in this account.`,
        variant: "destructive",
      })
      return
    }

    setIsPlacingTrade(true)
    try {
      const entryPrice = cryptoPrices[selectedAsset.symbol]?.price
      if (!entryPrice) {
        toast({ title: "Price not available", variant: "destructive" })
        return
      }

      const tradeRes = await participantFetch("/api/participant/predictions", {
        method: "POST",
        body: JSON.stringify({
          participant_email: userEmail,
          crypto_pair: selectedAsset.symbol,
          prediction_type: betDirection,
          amount,
          entry_price: entryPrice,
          timeframe_seconds: selectedTimeframe.seconds,
          balance_source: tradeMode === "demo" ? "demo" : "wallet",
        }),
      })
      const tradeJson = await tradeRes.json()
      const insertedTrade: any = tradeJson.prediction || null
      const insertError = !tradeRes.ok ? tradeJson.error : null

      if (insertError || !insertedTrade) {
        toast({
          title: `Failed to place ${accountLabel} trade`,
          description: insertError || "Please try again.",
          variant: "destructive",
        })
        return
      }

      if (tradeMode === "demo") {
        setDemoAccount((current) => ({
          ...current,
          available_balance: Number(tradeJson.new_balance ?? current.available_balance - amount),
          open_trades: current.open_trades + 1,
        }))
      } else {
        setParticipantData((current: any) => {
          const updated = { ...current, account_balance: Number(tradeJson.new_balance) }
          localStorage.setItem("participantData", JSON.stringify(updated))
          return updated
        })
      }

      setActiveTrades((previous) => ({ ...previous, [selectedAsset.symbol]: insertedTrade }))
      setSelectedAssetSymbol(selectedAsset.symbol)
      setShowBetDialog(false)
      setBetAmount("")
      toast({ title: `${tradeMode === "demo" ? "Demo" : "Real"} trade is live`, description: "Follow the countdown to see the result." })
      setTimeout(() => {
        loadActiveTrades()
        fetchParticipantData()
      }, 500)
    } catch {
      toast({ title: `Failed to place ${accountLabel} trade`, variant: "destructive" })
    } finally {
      setIsPlacingTrade(false)
    }
  }

  const handleResetDemo = async () => {
    if (isResettingDemo || demoAccount.open_trades > 0) return
    setIsResettingDemo(true)
    try {
      const response = await participantFetch("/api/participant/predictions", { method: "DELETE" })
      const data = await response.json()
      if (!response.ok || !data.demo_account) throw new Error(data.error || "Demo account could not be reset")
      setDemoAccount(data.demo_account)
      toast({ title: "Demo account reset", description: "Your practice balance is back to $1,000." })
      loadActiveTrades()
    } catch (error) {
      toast({
        title: "Demo account could not be reset",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsResettingDemo(false)
    }
  }

  const openTradeForAsset = (asset: PredictionMarketAsset, direction: "up" | "down") => {
    setSelectedAsset(asset)
    setSelectedAssetSymbol(asset.symbol)
    setBetDirection(direction)
    setBetAmount("")
    setSelectedTimeframe(asset.type === "commodity" ? COMMODITY_TIMEFRAMES[0] : CRYPTO_TIMEFRAMES[0])
    setShowBetDialog(true)
  }

  // PAGE COMPONENT

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`
    return `$${(volume / 1e3).toFixed(2)}K`
  }

  if (!mounted) {
    return (
      <div className="terminal-page flex min-h-dvh items-center justify-center bg-[var(--terminal-graphite-bg)]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div aria-hidden="true" className="size-12 animate-spin rounded-full border-4 border-[var(--terminal-graphite-border)] border-t-[var(--brand-primary)]" />
          <p className="font-semibold text-[var(--terminal-graphite-text)]">Loading prediction market...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="terminal-page relative min-h-dvh overflow-x-clip text-[var(--terminal-graphite-text)]" style={{ background: "var(--terminal-graphite-bg)" }}>
      {(priceError || participantError) && (
        <div
          role="alert"
          className="relative z-[60] border-b px-3 py-2 backdrop-blur-md"
          style={{
            background: "color-mix(in srgb, var(--terminal-graphite-warning) 12%, var(--terminal-graphite-bg))",
            borderColor: "color-mix(in srgb, var(--terminal-graphite-warning) 36%, var(--terminal-graphite-border))",
          }}
        >
          <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3 text-sm">
            <span className="min-w-0 text-[var(--terminal-graphite-text)]">{priceError || participantError}</span>
            <button
              type="button"
              onClick={() => { fetchParticipantData(); setPriceError(null) }}
              className="shrink-0 font-semibold text-[var(--brand-primary)] underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-xl"
        style={{
          background: "color-mix(in srgb, var(--terminal-graphite-bg) 94%, transparent)",
          borderColor: "var(--terminal-graphite-border)",
        }}
      >
        <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between gap-3 px-3 py-3 sm:px-5 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 rounded-xl border border-[var(--terminal-graphite-border)] text-[var(--terminal-graphite-text)] hover:bg-[var(--terminal-graphite-surface-2)]"
            >
              <Link href="/participant/dashboard" aria-label="Back to dashboard">
                <ArrowLeft aria-hidden="true" />
              </Link>
            </Button>
            <div className="min-w-0">
              <p className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-primary)] sm:block">EliteFund · Live markets</p>
              <h1 className="truncate text-base font-bold text-[var(--terminal-graphite-text)] sm:text-xl">Prediction Market</h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="terminal-panel hidden min-w-32 rounded-xl px-3 py-2 sm:block">
              <p className="text-xs text-[var(--terminal-graphite-muted)]">Demo</p>
              <p className="price-mono text-sm font-bold text-[var(--brand-primary)]">${demoBalance.toFixed(2)}</p>
            </div>
            <div className="terminal-panel hidden min-w-32 rounded-xl px-3 py-2 md:block">
              <p className="text-xs text-[var(--terminal-graphite-muted)]">Real</p>
              <p className="price-mono text-sm font-bold text-[var(--terminal-graphite-positive)]">${walletBalance.toFixed(2)}</p>
            </div>
            <div className="terminal-panel rounded-xl px-2.5 py-1.5 sm:hidden">
              <p className="text-xs text-[var(--terminal-graphite-muted)]">Real balance</p>
              <p className="price-mono text-sm font-bold text-[var(--terminal-graphite-positive)]">${walletBalance.toFixed(2)}</p>
            </div>
            <Button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="h-11 rounded-xl px-3 font-semibold"
              aria-label="Open trade history"
            >
              <History aria-hidden="true" data-icon="inline-start" />
              <span className="hidden sm:inline">History</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-2xl px-3 py-3 sm:px-5 sm:py-6 lg:px-8">
        <header
          className="mb-3 flex flex-col gap-2.5 border-b pb-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:pb-5"
          style={{ borderColor: "var(--terminal-graphite-border)" }}
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--brand-primary)]">
              <Activity aria-hidden="true" className="size-4" />
              Live market desk
            </p>
            <h2 className="mt-1 text-xl font-bold text-[var(--terminal-graphite-text)] sm:mt-2 sm:text-2xl">Choose a market</h2>
            <p className="mt-1 hidden max-w-2xl text-sm leading-relaxed text-[var(--terminal-graphite-muted)] sm:block">
              Compare live crypto, commodity, and forex prices before opening a prediction ticket.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-64">
            <div className="terminal-panel flex items-center justify-between gap-3 rounded-lg px-3 py-2 sm:rounded-xl sm:py-2.5">
              <span className="text-xs text-[var(--terminal-graphite-muted)] sm:text-sm">Markets</span>
              <span className="price-mono text-sm font-semibold text-[var(--terminal-graphite-text)] sm:text-base">{filteredAssets.length}</span>
            </div>
            <div className="terminal-panel flex items-center justify-between gap-3 rounded-lg px-3 py-2 sm:rounded-xl sm:py-2.5">
              <span className="text-xs text-[var(--terminal-graphite-muted)] sm:text-sm">Open trades</span>
              <span className="price-mono text-sm font-semibold text-[var(--terminal-graphite-text)] sm:text-base">{Object.keys(activeTrades).length}</span>
            </div>
          </div>
        </header>

        <section
          aria-labelledby="prediction-account-title"
          className="mb-3 overflow-hidden rounded-xl border sm:mb-5 sm:rounded-2xl"
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 14%, var(--terminal-graphite-surface)), var(--terminal-graphite-surface))",
            borderColor: "color-mix(in srgb, var(--brand-primary) 36%, var(--terminal-graphite-border))",
          }}
        >
          <div className="flex flex-col gap-2.5 p-3 sm:gap-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3 lg:max-w-xl">
              <span className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] sm:flex">
                {tradeMode === "demo" ? <ShieldCheck aria-hidden="true" className="size-5" /> : <WalletCards aria-hidden="true" className="size-5" />}
              </span>
              <div className="min-w-0">
                <h2 id="prediction-account-title" className="text-sm font-bold text-[var(--terminal-graphite-text)] sm:text-base">Prediction account</h2>
                <p className="mt-1 hidden text-sm leading-relaxed text-[var(--terminal-graphite-muted)] sm:block">
                  Practice safely with demo funds, or switch to real mode to trade from your account balance.
                </p>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-2 sm:gap-3 lg:w-[30rem]">
              <ToggleGroup
                type="single"
                value={tradeMode}
                onValueChange={(value) => {
                  if (!value) return
                  setTradeMode(value as "demo" | "real")
                  setBetAmount("")
                }}
                variant="outline"
                className="grid w-full grid-cols-2"
                aria-label="Prediction account"
              >
                <ToggleGroupItem value="demo" className="h-auto min-h-12 flex-col items-start gap-0.5 px-3 py-1.5 sm:min-h-16 sm:gap-1 sm:py-2 data-[state=on]:border-[var(--brand-primary)] data-[state=on]:bg-[color-mix(in_srgb,var(--brand-primary)_12%,var(--terminal-graphite-surface))]">
                  <span className="flex items-center gap-1.5 text-xs text-[var(--terminal-graphite-muted)]"><ShieldCheck aria-hidden="true" /> Demo</span>
                  <span className="price-mono text-base font-bold text-[var(--brand-primary)]">${demoBalance.toFixed(2)}</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="real" className="h-auto min-h-12 flex-col items-start gap-0.5 px-3 py-1.5 sm:min-h-16 sm:gap-1 sm:py-2 data-[state=on]:border-[var(--terminal-graphite-positive)] data-[state=on]:bg-[color-mix(in_srgb,var(--terminal-graphite-positive)_10%,var(--terminal-graphite-surface))]">
                  <span className="flex items-center gap-1.5 text-xs text-[var(--terminal-graphite-muted)]"><WalletCards aria-hidden="true" /> Real</span>
                  <span className="price-mono text-base font-bold text-[var(--terminal-graphite-positive)]">${walletBalance.toFixed(2)}</span>
                </ToggleGroupItem>
              </ToggleGroup>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--terminal-graphite-muted)]">
                <span>{tradeMode === "demo" ? `Practice P/L ${demoProfitLoss >= 0 ? "+" : "−"}$${Math.abs(demoProfitLoss).toFixed(2)}` : "Real trades affect your withdrawable balance"}</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm" disabled={demoAccount.open_trades > 0 || isResettingDemo} className="border-[var(--terminal-graphite-border)] text-[var(--terminal-graphite-text)]">
                      <RotateCcw aria-hidden="true" data-icon="inline-start" />
                      Reset demo
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-[var(--terminal-graphite-border)] bg-[var(--terminal-graphite-surface)] text-[var(--terminal-graphite-text)]">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset demo account?</AlertDialogTitle>
                      <AlertDialogDescription className="text-[var(--terminal-graphite-muted)]">
                        This starts a new practice cycle with $1,000. Your previous demo trades remain archived, while real trades and your real balance stay unchanged.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetDemo}>Reset to $1,000</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              {demoAccount.open_trades > 0 && (
                <p className="text-xs text-[var(--terminal-graphite-warning)]">Wait for {demoAccount.open_trades} active demo {demoAccount.open_trades === 1 ? "trade" : "trades"} to settle before resetting.</p>
              )}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="prediction-market-pulse-title"
          className="mb-5 hidden overflow-hidden rounded-2xl border sm:block"
          style={{
            backgroundColor: "var(--terminal-graphite-surface)",
            borderColor: "var(--terminal-graphite-border)",
          }}
        >
          <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
            <div className="flex min-w-0 items-start gap-3 lg:w-64 lg:shrink-0">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--brand-primary) 14%, var(--terminal-graphite-surface-2))",
                  color: "var(--brand-primary)",
                }}
              >
                <Activity className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 id="prediction-market-pulse-title" className="text-sm font-bold text-[var(--terminal-graphite-text)]">
                    Market pulse
                  </h3>
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: priceError ? "var(--terminal-graphite-warning)" : "var(--terminal-graphite-positive)" }}
                  >
                    <span
                      aria-hidden="true"
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: priceError ? "var(--terminal-graphite-warning)" : "var(--terminal-graphite-positive)" }}
                    />
                    {priceError ? "Delayed" : isLoading ? "Connecting" : "Live"}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-[var(--terminal-graphite-muted)]">
                  The day&apos;s sharpest moves, across every market.
                </p>
              </div>
            </div>

            <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
              {isLoading && topMovers.length === 0 ? (
                Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="terminal-panel-raised min-w-0 rounded-xl p-3" aria-hidden="true">
                    <Skeleton className="size-7 rounded-lg bg-[var(--terminal-graphite-elevated)]" />
                    <Skeleton className="mt-2 h-3 w-16 max-w-full bg-[var(--terminal-graphite-elevated)]" />
                    <Skeleton className="mt-2 h-4 w-12 max-w-full bg-[var(--terminal-graphite-elevated)]" />
                  </div>
                ))
              ) : topMovers.length === 0 ? (
                <p className="col-span-3 self-center py-3 text-sm text-[var(--terminal-graphite-muted)]">
                  Waiting for live quotes to find the biggest moves.
                </p>
              ) : (
                topMovers.map(({ asset, change }) => {
                  const isPositive = change >= 0
                  const meterWidth = Math.min(Math.abs(change), 10) * 5
                  const isFocused = selectedAssetSymbol === asset.symbol
                  return (
                    <button
                      key={asset.symbol}
                      type="button"
                      onClick={() => {
                        setAssetFilter(asset.type)
                        setAssetSearch("")
                        setSelectedAssetSymbol(asset.symbol)
                      }}
                      aria-label={`Explore ${asset.displayName}, ${isPositive ? "up" : "down"} ${Math.abs(change).toFixed(2)} percent in 24 hours`}
                      aria-pressed={isFocused}
                      className="group min-w-0 rounded-xl border p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] sm:p-3"
                      style={{
                        backgroundColor: isFocused
                          ? "color-mix(in srgb, var(--brand-primary) 8%, var(--terminal-graphite-surface-2))"
                          : "var(--terminal-graphite-surface-2)",
                        borderColor: isFocused ? "var(--brand-primary)" : "var(--terminal-graphite-border)",
                      }}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <AssetLogo
                          symbol={asset.symbol}
                          name={asset.name}
                          logoUrl={asset.logo}
                          bgColor={asset.iconBg}
                          size={28}
                          className="shrink-0 rounded-lg"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-[var(--terminal-graphite-text)]">
                            {asset.displayName}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-[var(--terminal-graphite-muted)]">
                            {asset.name}
                          </span>
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        {isPositive ? (
                          <ArrowUp aria-hidden="true" className="size-3.5" style={{ color: "var(--terminal-graphite-positive)" }} />
                        ) : (
                          <ArrowDown aria-hidden="true" className="size-3.5" style={{ color: "var(--terminal-graphite-negative)" }} />
                        )}
                        <span
                          className="price-mono text-sm font-bold"
                          style={{ color: isPositive ? "var(--terminal-graphite-positive)" : "var(--terminal-graphite-negative)" }}
                        >
                          {isPositive ? "+" : ""}{change.toFixed(2)}%
                        </span>
                        <span className="ml-auto text-xs text-[var(--terminal-graphite-muted)]">24h</span>
                      </div>
                      <div
                        aria-hidden="true"
                        className="relative mt-2 h-1 overflow-hidden rounded-full"
                        style={{ backgroundColor: "var(--terminal-graphite-bg)" }}
                      >
                        <span
                          className="absolute inset-y-0 left-1/2 w-px"
                          style={{ backgroundColor: "var(--terminal-graphite-border)" }}
                        />
                        <span
                          className="absolute inset-y-0 rounded-full transition-[left,width] duration-700"
                          style={{
                            left: isPositive ? "50%" : `${50 - meterWidth}%`,
                            width: `${meterWidth}%`,
                            backgroundColor: isPositive ? "var(--terminal-graphite-positive)" : "var(--terminal-graphite-negative)",
                          }}
                        />
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
          <section className="flex min-w-0 flex-col gap-4">
        <div
          aria-label="Filter markets by asset class"
          className="terminal-scroll flex w-full min-w-0 gap-2 overflow-x-auto rounded-2xl border p-1.5"
          role="group"
          style={{ backgroundColor: "var(--terminal-graphite-surface)", borderColor: "var(--terminal-graphite-border)" }}
        >
          {([
            { key: "all", label: "All assets" },
            { key: "crypto", label: "Crypto" },
            { key: "commodity", label: "Commodities" },
            { key: "forex", label: "Forex" },
          ] as const).map(({ key, label }) => {
            const active = assetFilter === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setAssetFilter(key)}
                aria-pressed={active}
                className="min-h-9 shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-[var(--terminal-graphite-surface-2)] sm:min-h-11 sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm"
                style={{
                  backgroundColor: active ? "var(--brand-primary)" : "transparent",
                  borderColor: active ? "var(--brand-primary)" : "transparent",
                  color: active ? "var(--brand-primary-foreground)" : "var(--terminal-graphite-muted)",
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <label className="sr-only" htmlFor="prediction-market-search">Search markets</label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--terminal-graphite-muted)]" />
            <Input
              id="prediction-market-search"
              type="search"
              value={assetSearch}
              onChange={(event) => setAssetSearch(event.target.value)}
              placeholder="Search assets or symbols"
              className="h-11 rounded-xl border-[var(--terminal-graphite-border)] bg-[var(--terminal-graphite-surface)] pl-10 pr-10 text-base text-[var(--terminal-graphite-text)] placeholder:text-[var(--terminal-graphite-muted)] focus-visible:ring-[var(--brand-primary)] sm:text-sm"
            />
            {assetSearch && (
              <button
                type="button"
                onClick={() => setAssetSearch("")}
                aria-label="Clear market search"
                className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--terminal-graphite-muted)] hover:bg-[var(--terminal-graphite-surface-2)] hover:text-[var(--terminal-graphite-text)]"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
            <p className="text-xs text-[var(--terminal-graphite-muted)]" aria-live="polite">
              {filteredAssets.length} {filteredAssets.length === 1 ? "market" : "markets"}
            </p>
            <ToggleGroup
              type="single"
              value={marketDensity}
              onValueChange={(value) => value && setMarketDensity(value as "compact" | "comfortable")}
              variant="outline"
              size="sm"
              className="rounded-xl border border-[var(--terminal-graphite-border)] bg-[var(--terminal-graphite-surface)] p-1"
              aria-label="Market card density"
            >
              <ToggleGroupItem value="compact" className="h-8 rounded-lg px-3 text-xs data-[state=on]:bg-[var(--brand-primary)] data-[state=on]:text-[var(--brand-primary-foreground)]">
                Compact
              </ToggleGroupItem>
              <ToggleGroupItem value="comfortable" className="h-8 rounded-lg px-3 text-xs data-[state=on]:bg-[var(--brand-primary)] data-[state=on]:text-[var(--brand-primary-foreground)]">
                Detail
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {(assetFilter === "forex" || assetFilter === "all") && (
          <div
            className="flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed sm:gap-3 sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm"
            role="status"
            aria-label="Market liquidity notice"
            style={{
              backgroundColor: "color-mix(in srgb, var(--brand-primary) 8%, var(--terminal-graphite-surface))",
              borderColor: "color-mix(in srgb, var(--brand-primary) 28%, var(--terminal-graphite-border))",
            }}
          >
            <Activity aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--brand-primary)]" />
            <p className="text-[var(--terminal-graphite-muted)]">
              Forex prices can update slowly. Unchanged prices are refunded; crypto and commodities may move more reliably.
            </p>
          </div>
        )}

        {focusedAsset && (
          <div className="xl:hidden">
            <PredictionMarketFocus
              asset={focusedAsset}
              priceData={cryptoPrices[focusedAsset.symbol]}
              hasActiveTrade={!!activeTrades[focusedAsset.symbol]}
              isFeedFresh={!priceError}
              compact
              onTrade={(direction) => openTradeForAsset(focusedAsset, direction)}
            />
          </div>
        )}

        {isLoading ? (
          <div className={`grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 ${marketDensity === "compact" ? "gap-2" : "gap-3"}`}>
            {Array.from({ length: 6 }, (_, index) => (
              <article key={index} className="terminal-panel flex flex-col gap-4 rounded-2xl p-4" aria-hidden="true">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-11 shrink-0 rounded-xl bg-[var(--terminal-graphite-elevated)]" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-28 bg-[var(--terminal-graphite-elevated)]" />
                    <Skeleton className="h-3 w-36 max-w-full bg-[var(--terminal-graphite-elevated)]" />
                  </div>
                </div>
                <Skeleton className="h-8 w-40 bg-[var(--terminal-graphite-elevated)]" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-11 rounded-xl bg-[var(--terminal-graphite-elevated)]" />
                  <Skeleton className="h-11 rounded-xl bg-[var(--terminal-graphite-elevated)]" />
                </div>
              </article>
            ))}
          </div>
        ) : filteredAssets.length === 0 ? (
          <Empty
            className="terminal-panel min-h-56 rounded-2xl border-dashed px-5 py-10 text-[var(--terminal-graphite-text)]"
            style={{ borderColor: "var(--terminal-graphite-border)" }}
          >
            <EmptyHeader className="gap-3">
              <EmptyMedia variant="icon" className="rounded-xl text-[var(--brand-primary)]">
                <Search aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle className="text-[var(--terminal-graphite-text)]">No markets found</EmptyTitle>
              <EmptyDescription className="text-[var(--terminal-graphite-muted)]">
                Try another search or clear your market filters.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button type="button" variant="outline" onClick={() => { setAssetSearch(""); setAssetFilter("all") }}>
                Clear search and filters
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className={`grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 ${marketDensity === "compact" ? "gap-2" : "gap-3"}`}>
            {filteredAssets.map((asset) => {
              const priceData = cryptoPrices[asset.symbol]
              const flashColor = priceFlash[asset.symbol]
              const change = Number(priceData?.change ?? 0)
              const isPositive = change >= 0
              const hasActiveTrade = !!activeTrades[asset.symbol]
              const isFocused = focusedAsset?.symbol === asset.symbol
              const borderColor = isFocused
                ? "var(--brand-primary)"
                : flashColor === "green"
                  ? "var(--terminal-graphite-positive)"
                  : flashColor === "red"
                    ? "var(--terminal-graphite-negative)"
                    : hasActiveTrade
                      ? "var(--brand-primary)"
                      : "var(--terminal-graphite-border)"
              const cardBackground = flashColor === "green"
                ? "color-mix(in srgb, var(--terminal-graphite-positive) 8%, var(--terminal-graphite-surface))"
                : flashColor === "red"
                  ? "color-mix(in srgb, var(--terminal-graphite-negative) 8%, var(--terminal-graphite-surface))"
                  : "var(--terminal-graphite-surface)"

              if (!priceData) {
                return (
                  <article
                    key={asset.symbol}
                    className="terminal-panel min-w-0 rounded-2xl p-4"
                    style={{ borderColor: isFocused ? "var(--brand-primary)" : "var(--terminal-graphite-border)" }}
                  >
                    <div className="flex items-center gap-3">
                      <AssetLogo symbol={asset.symbol} name={asset.name} logoUrl={asset.logo} bgColor={asset.iconBg} size={44} className="shrink-0 rounded-xl" />
                      <button
                        type="button"
                        onClick={() => setSelectedAssetSymbol(asset.symbol)}
                        aria-pressed={isFocused}
                        className="flex min-w-0 flex-1 flex-col items-start gap-1 rounded-lg text-left"
                      >
                        <span className="truncate text-base font-semibold text-[var(--terminal-graphite-text)]">{asset.displayName}</span>
                        <span className="truncate text-sm text-[var(--terminal-graphite-muted)]">{asset.name}</span>
                      </button>
                      <a href={asset.chartUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${asset.displayName} chart in a new tab`} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-[var(--brand-primary)] hover:bg-[var(--terminal-graphite-surface-2)]">
                        <BarChart3 aria-hidden="true" className="size-5" />
                      </a>
                    </div>
                    <p className="mt-4 text-sm text-[var(--terminal-graphite-muted)]">Price unavailable</p>
                  </article>
                )
              }

              if (marketDensity === "compact") {
                return (
                  <article
                    key={asset.symbol}
                    className="terminal-panel group min-w-0 rounded-xl p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    style={{
                      backgroundColor: cardBackground,
                      borderColor,
                      boxShadow: isFocused ? "0 0 0 1px var(--brand-primary)" : undefined,
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSelectedAssetSymbol(asset.symbol)}
                        aria-pressed={isFocused}
                        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
                      >
                        <AssetLogo symbol={asset.symbol} name={asset.name} logoUrl={asset.logo} bgColor={asset.iconBg} size={36} className="shrink-0 rounded-lg" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-semibold text-[var(--terminal-graphite-text)]">{asset.displayName}</span>
                            {hasActiveTrade && <span className="size-1.5 shrink-0 rounded-full bg-[var(--brand-primary)]" aria-label="Active trade" />}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-[var(--terminal-graphite-muted)]">{asset.name}</span>
                        </span>
                      </button>
                      <div className="shrink-0 text-right">
                        <p className="price-mono text-base font-bold text-[var(--terminal-graphite-text)]">
                          ${Number(priceData.price).toFixed(priceData.price < 1 ? 5 : 2)}
                        </p>
                        <p className="price-mono text-xs font-semibold" style={{ color: isPositive ? "var(--terminal-graphite-positive)" : "var(--terminal-graphite-negative)" }}>
                          {isPositive ? "+" : ""}{change.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-[1fr_1fr_2.25rem] gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openTradeForAsset(asset, "up")}
                        className="h-8 rounded-lg border text-xs font-semibold"
                        style={{ backgroundColor: "color-mix(in srgb, var(--terminal-graphite-positive) 12%, var(--terminal-graphite-surface))", borderColor: "color-mix(in srgb, var(--terminal-graphite-positive) 38%, var(--terminal-graphite-border))", color: "var(--terminal-graphite-positive)" }}
                      >
                        <ArrowUp aria-hidden="true" data-icon="inline-start" />
                        Up
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openTradeForAsset(asset, "down")}
                        className="h-8 rounded-lg border text-xs font-semibold"
                        style={{ backgroundColor: "color-mix(in srgb, var(--terminal-graphite-negative) 12%, var(--terminal-graphite-surface))", borderColor: "color-mix(in srgb, var(--terminal-graphite-negative) 38%, var(--terminal-graphite-border))", color: "var(--terminal-graphite-negative)" }}
                      >
                        <ArrowDown aria-hidden="true" data-icon="inline-start" />
                        Down
                      </Button>
                      <a href={asset.chartUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${asset.displayName} chart in a new tab`} className="flex size-8 items-center justify-center rounded-lg text-[var(--brand-primary)] transition-colors hover:bg-[var(--terminal-graphite-surface-2)]">
                        <BarChart3 aria-hidden="true" className="size-4" />
                      </a>
                    </div>
                  </article>
                )
              }

              return (
                <article
                  key={asset.symbol}
                  className="terminal-panel min-w-0 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
                  style={{
                    backgroundColor: cardBackground,
                    borderColor,
                    boxShadow: isFocused ? "0 0 0 1px var(--brand-primary)" : undefined,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedAssetSymbol(asset.symbol)}
                      aria-pressed={isFocused}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left"
                    >
                      <AssetLogo symbol={asset.symbol} name={asset.name} logoUrl={asset.logo} bgColor={asset.iconBg} size={44} className="shrink-0 rounded-xl" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-semibold text-[var(--terminal-graphite-text)]">{asset.displayName}</span>
                        <span className="mt-0.5 block truncate text-sm text-[var(--terminal-graphite-muted)]">{asset.name}</span>
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {hasActiveTrade && (
                        <span
                          className="rounded-full border px-2 py-1 text-xs font-semibold text-[var(--brand-primary)]"
                          style={{
                            backgroundColor: "color-mix(in srgb, var(--brand-primary) 10%, var(--terminal-graphite-surface))",
                            borderColor: "color-mix(in srgb, var(--brand-primary) 35%, var(--terminal-graphite-border))",
                          }}
                        >
                          Active
                        </span>
                      )}
                      <a href={asset.chartUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${asset.displayName} chart in a new tab`} className="flex size-11 items-center justify-center rounded-xl text-[var(--brand-primary)] hover:bg-[var(--terminal-graphite-surface-2)]">
                        <BarChart3 aria-hidden="true" className="size-5" />
                      </a>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="price-mono font-mono text-2xl font-bold tracking-tight text-[var(--terminal-graphite-text)] sm:text-3xl">
                      ${priceData.price ? Number(priceData.price).toFixed(priceData.price < 1 ? 6 : 2) : "—"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: isPositive ? "var(--terminal-graphite-positive)" : "var(--terminal-graphite-negative)" }}>
                        {isPositive ? <TrendingUp aria-hidden="true" className="size-4" /> : <TrendingDown aria-hidden="true" className="size-4" />}
                        {isPositive ? "+" : ""}{change.toFixed(2)}%
                      </span>
                      <span className="text-[var(--terminal-graphite-muted)]">Vol {priceData.volume ? formatVolume(priceData.volume) : "—"}</span>
                      <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: priceError ? "var(--terminal-graphite-warning)" : "var(--terminal-graphite-positive)" }}>
                        <span className="size-2 rounded-full" style={{ backgroundColor: priceError ? "var(--terminal-graphite-warning)" : "var(--terminal-graphite-positive)" }} />
                        {priceError ? "Delayed" : "Live"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3" aria-hidden="true">
                    <span className="shrink-0 text-xs font-medium text-[var(--terminal-graphite-muted)]">24h move</span>
                    <div
                      className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full"
                      style={{ backgroundColor: "var(--terminal-graphite-surface-2)" }}
                    >
                      <span
                        className="absolute inset-y-0 left-1/2 w-px"
                        style={{ backgroundColor: "var(--terminal-graphite-border)" }}
                      />
                      <span
                        className="absolute inset-y-0 rounded-full transition-[left,width] duration-700"
                        style={{
                          left: isPositive ? "50%" : `${50 - Math.min(Math.abs(change), 10) * 5}%`,
                          width: `${Math.min(Math.abs(change), 10) * 5}%`,
                          backgroundColor: isPositive ? "var(--terminal-graphite-positive)" : "var(--terminal-graphite-negative)",
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openTradeForAsset(asset, "up")}
                      className="h-11 rounded-xl border font-semibold"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--terminal-graphite-positive) 14%, var(--terminal-graphite-surface))",
                        borderColor: "color-mix(in srgb, var(--terminal-graphite-positive) 48%, var(--terminal-graphite-border))",
                        color: "var(--terminal-graphite-positive)",
                      }}
                    >
                      <ArrowUp aria-hidden="true" data-icon="inline-start" />
                      UP
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openTradeForAsset(asset, "down")}
                      className="h-11 rounded-xl border font-semibold"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--terminal-graphite-negative) 14%, var(--terminal-graphite-surface))",
                        borderColor: "color-mix(in srgb, var(--terminal-graphite-negative) 48%, var(--terminal-graphite-border))",
                        color: "var(--terminal-graphite-negative)",
                      }}
                    >
                      <ArrowDown aria-hidden="true" data-icon="inline-start" />
                      DOWN
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
          </section>
          {focusedAsset && (
            <aside className="hidden min-w-0 xl:sticky xl:top-24 xl:block xl:self-start">
              <PredictionMarketFocus
                asset={focusedAsset}
                priceData={cryptoPrices[focusedAsset.symbol]}
                hasActiveTrade={!!activeTrades[focusedAsset.symbol]}
                isFeedFresh={!priceError}
                compact={marketDensity === "compact"}
                onTrade={(direction) => openTradeForAsset(focusedAsset, direction)}
              />
            </aside>
          )}
        </div>
      </main>

      {/* Bet Dialog */}
      <Dialog open={showBetDialog} onOpenChange={setShowBetDialog}>
        <DialogContent
          className="flex max-h-[90dvh] w-[calc(100vw-1rem)] max-w-md flex-col overflow-hidden rounded-2xl border-[var(--terminal-graphite-border)] p-0 text-[var(--terminal-graphite-text)]"
          style={{ backgroundColor: "var(--terminal-graphite-surface)" }}
        >
          {/* Compact header */}
          <DialogHeader className="flex-shrink-0 px-5 pt-5 pb-3">
            <DialogTitle className="flex items-center gap-3 text-base font-bold">
              <span
                className="inline-flex rounded-full border px-2.5 py-1 text-xs font-bold"
                style={betDirection === "up"
                  ? { backgroundColor: "color-mix(in srgb, var(--terminal-graphite-positive) 14%, var(--terminal-graphite-surface))", borderColor: "color-mix(in srgb, var(--terminal-graphite-positive) 48%, var(--terminal-graphite-border))", color: "var(--terminal-graphite-positive)" }
                  : { backgroundColor: "color-mix(in srgb, var(--terminal-graphite-negative) 14%, var(--terminal-graphite-surface))", borderColor: "color-mix(in srgb, var(--terminal-graphite-negative) 48%, var(--terminal-graphite-border))", color: "var(--terminal-graphite-negative)" }}
              >
                {betDirection.toUpperCase()}
              </span>
              Place Trade
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5">
            {/* Asset Info */}
            <div className="terminal-panel-raised flex items-center gap-3 rounded-xl p-3">
              <Image
                src={selectedAsset?.logo || "/placeholder.svg"}
                alt={selectedAsset?.name || "Asset"}
                width={28}
                height={28}
                className="rounded-full flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight truncate">{selectedAsset?.displayName}</div>
                <div className="price-mono text-sm text-[var(--terminal-graphite-muted)]">
                  ${selectedAsset && cryptoPrices[selectedAsset.symbol]?.price
                    ? cryptoPrices[selectedAsset.symbol].price.toFixed(cryptoPrices[selectedAsset.symbol].price < 1 ? 6 : 2)
                    : "—"}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold text-[var(--terminal-graphite-text)]">Account</Label>
              <ToggleGroup
                type="single"
                value={tradeMode}
                onValueChange={(value) => {
                  if (!value) return
                  setTradeMode(value as "demo" | "real")
                  setBetAmount("")
                }}
                variant="outline"
                className="grid w-full grid-cols-2"
                aria-label="Trade account"
              >
                <ToggleGroupItem value="demo" className="min-h-11 gap-2 data-[state=on]:border-[var(--brand-primary)] data-[state=on]:text-[var(--brand-primary)]">
                  <ShieldCheck aria-hidden="true" /> Demo
                </ToggleGroupItem>
                <ToggleGroupItem value="real" className="min-h-11 gap-2 data-[state=on]:border-[var(--terminal-graphite-positive)] data-[state=on]:text-[var(--terminal-graphite-positive)]">
                  <WalletCards aria-hidden="true" /> Real
                </ToggleGroupItem>
              </ToggleGroup>
              <div
                className="flex items-center justify-between gap-3 rounded-xl border p-3"
                style={{
                  backgroundColor: `color-mix(in srgb, ${tradeMode === "demo" ? "var(--brand-primary)" : "var(--terminal-graphite-positive)"} 9%, var(--terminal-graphite-surface))`,
                  borderColor: `color-mix(in srgb, ${tradeMode === "demo" ? "var(--brand-primary)" : "var(--terminal-graphite-positive)"} 32%, var(--terminal-graphite-border))`,
                }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {tradeMode === "demo" ? <ShieldCheck aria-hidden="true" className="size-5 shrink-0 text-[var(--brand-primary)]" /> : <WalletCards aria-hidden="true" className="size-5 shrink-0 text-[var(--terminal-graphite-positive)]" />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--terminal-graphite-text)]">{tradeMode === "demo" ? "Demo funds" : "Real funds"}</p>
                    <p className="flex items-center gap-1 text-xs text-[var(--terminal-graphite-muted)]">
                      {tradeMode === "demo" && <LockKeyhole aria-hidden="true" className="size-3" />}
                      {tradeMode === "demo" ? "No deposit or withdrawal" : "Wins and losses affect your balance"}
                    </p>
                  </div>
                </div>
                <p className="price-mono shrink-0 font-bold text-[var(--brand-primary)]">${activeBalance.toFixed(2)}</p>
              </div>
            </div>

            {/* Amount Input */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="prediction-amount" className="text-sm font-semibold text-[var(--terminal-graphite-text)]">Amount</Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  min="0.01"
                  max={activeBalance > 0 ? activeBalance : undefined}
                  step="0.01"
                  value={betAmount}
                  onChange={(event) => setBetAmount(event.target.value)}
                  id="prediction-amount"
                  inputMode="decimal"
                  className="h-11 rounded-xl border-[var(--terminal-graphite-border)] bg-[var(--terminal-graphite-bg)] pr-14 text-base text-[var(--terminal-graphite-text)] placeholder:text-[var(--terminal-graphite-muted)] focus-visible:ring-[var(--brand-primary)] sm:text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--terminal-graphite-muted)]">USD</span>
              </div>
              <div aria-label={`Quick ${tradeMode} amounts`} className="grid grid-cols-4 gap-2">
                {[10, 25, 50, 100].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setBetAmount(String(Math.min(amount, activeBalance)))}
                    disabled={activeBalance <= 0}
                    className="min-h-10 rounded-lg border border-[var(--terminal-graphite-border)] bg-[var(--terminal-graphite-surface-2)] px-2 text-sm font-semibold text-[var(--terminal-graphite-text)] transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] disabled:opacity-50"
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 text-sm text-[var(--terminal-graphite-muted)]">
                <span>Available {tradeMode} funds</span>
                <span className="price-mono font-semibold text-[var(--terminal-graphite-text)]">${activeBalance.toFixed(2)}</span>
              </div>
            </div>

            {/* Timeframe Selection */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold text-[var(--terminal-graphite-text)]">
                Duration {selectedAsset?.type === 'commodity' && <span className="font-normal text-[var(--terminal-graphite-muted)]">(Extended)</span>}
              </Label>
                  <div className="grid grid-cols-3 gap-2">
                {(selectedAsset?.type === 'commodity' ? COMMODITY_TIMEFRAMES : CRYPTO_TIMEFRAMES).map((tf) => (
                  <button
                    key={tf.value}
                    type="button"
                    onClick={() => setSelectedTimeframe(tf)}
                    aria-pressed={selectedTimeframe.value === tf.value}
                    className="min-h-11 rounded-xl border px-3 text-sm font-semibold transition-colors"
                    style={selectedTimeframe.value === tf.value
                      ? { backgroundColor: "var(--brand-primary)", borderColor: "var(--brand-primary)", color: "var(--brand-primary-foreground)" }
                      : { backgroundColor: "var(--terminal-graphite-surface-2)", borderColor: "var(--terminal-graphite-border)", color: "var(--terminal-graphite-text)" }}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              {/* Payout Summary */}
              <div
                className="mt-1 rounded-xl border p-3"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--terminal-graphite-positive) 8%, var(--terminal-graphite-surface))",
                  borderColor: "color-mix(in srgb, var(--terminal-graphite-positive) 34%, var(--terminal-graphite-border))",
                }}
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[var(--terminal-graphite-muted)]">Profit rate</span>
                  <span className="font-semibold text-[var(--terminal-graphite-positive)]">50%</span>
                </div>
                <div className="mt-3 flex flex-col gap-2 border-t pt-3" style={{ borderColor: "var(--terminal-graphite-border)" }}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-[var(--terminal-graphite-muted)]">Potential profit</span>
                    <span className="price-mono font-semibold text-[var(--terminal-graphite-positive)]">${((parseFloat(betAmount) || 0) * PROFIT_RATE).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-[var(--terminal-graphite-muted)]">Total payout</span>
                    <span className="price-mono text-base font-bold text-[var(--terminal-graphite-text)]">${((parseFloat(betAmount) || 0) + (parseFloat(betAmount) || 0) * PROFIT_RATE).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Place Trade Button */}
            <Button
              type="button"
              onClick={handlePlaceBet}
              disabled={isPlacingTrade}
              className="h-11 w-full rounded-xl border font-bold text-sm transition-colors disabled:opacity-60"
              style={betDirection === "up"
                ? { backgroundColor: "var(--terminal-graphite-positive)", borderColor: "var(--terminal-graphite-positive)", color: "var(--terminal-graphite-bg)" }
                : { backgroundColor: "var(--terminal-graphite-negative)", borderColor: "var(--terminal-graphite-negative)", color: "var(--terminal-graphite-bg)" }}
            >
              {isPlacingTrade ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Placing...
                </span>
              ) : (
                <>Place {tradeMode === "demo" ? "Demo" : "Real"} {betDirection.toUpperCase()} Trade</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent
          className="max-h-[88dvh] w-[calc(100vw-1rem)] overflow-y-auto rounded-2xl border-[var(--terminal-graphite-border)] sm:max-w-5xl"
          style={{ backgroundColor: "var(--terminal-graphite-surface)" }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[var(--terminal-graphite-text)]">Trade History</DialogTitle>
          </DialogHeader>
          <LivePredictionMonitor
            userEmail={participantData?.email || ""}
            currentPrices={cryptoPrices}
            onBalanceUpdate={loadActiveTrades}
          />
        </DialogContent>
      </Dialog>

      {Object.keys(activeTrades).length > 0 && (
        <div
          aria-label="Open prediction positions"
          className="pointer-events-none fixed inset-x-3 bottom-20 z-50 mx-auto flex max-h-[min(60dvh,36rem)] max-w-sm flex-col gap-3 overflow-y-auto sm:inset-x-auto sm:right-4 sm:bottom-6 sm:mx-0 sm:w-72"
        >
          {Object.entries(activeTrades).map(([pair, trade]) => {
            const price = cryptoPrices[pair]?.price
            if (!price) return null
            return (
              <ActiveTradeTracker
                key={`trade-${trade.id}`}
                activeTrade={trade}
                currentPrice={price}
                onTradeSettled={() => {
                  setActiveTrades((prev) => {
                    const next = { ...prev }
                    delete next[pair]
                    return next
                  })
                  loadActiveTrades()
                  fetchParticipantData()
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function PredictPage() {
  return <PredictPageContent />
}
