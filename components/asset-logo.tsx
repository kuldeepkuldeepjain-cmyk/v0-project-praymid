"use client"

import { useState } from "react"
import Image from "next/image"



// Direct logo URLs keyed by trading symbol — no intermediate ID lookup needed.
// Crypto: CoinGecko CDN with verified numeric image IDs.
// Forex/Commodities: TradingView symbol CDN SVGs.
const LOGO_URLS: Record<string, string> = {
  // Crypto — CoinGecko /thumb/ (small, fast, reliable)
  BTCUSDT:   "https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png",
  ETHUSDT:   "https://assets.coingecko.com/coins/images/279/thumb/ethereum.png",
  BNBUSDT:   "https://assets.coingecko.com/coins/images/825/thumb/bnb-icon2_2x.png",
  SOLUSDT:   "https://assets.coingecko.com/coins/images/4128/thumb/solana.png",
  XRPUSDT:   "https://assets.coingecko.com/coins/images/44/thumb/xrp-symbol-white-128.png",
  DOGEUSDT:  "https://assets.coingecko.com/coins/images/5/thumb/dogecoin.png",
  ADAUSDT:   "https://assets.coingecko.com/coins/images/975/thumb/cardano.png",
  AVAXUSDT:  "https://assets.coingecko.com/coins/images/12559/thumb/Avalanche_Circle_RedWhite_Trans.png",
  MATICUSDT: "https://assets.coingecko.com/coins/images/4713/thumb/matic-token-icon.png",
  SHIBUSDT:  "https://assets.coingecko.com/coins/images/11939/thumb/shiba.png",
  DOTUSDT:   "https://assets.coingecko.com/coins/images/12171/thumb/polkadot.png",
  LTCUSDT:   "https://assets.coingecko.com/coins/images/2/thumb/litecoin.png",
  LINKUSDT:  "https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png",
  UNIUSDT:   "https://assets.coingecko.com/coins/images/12504/thumb/uni.jpg",
  ATOMUSDT:  "https://assets.coingecko.com/coins/images/1481/thumb/cosmos_hub.png",
  NEARUSDT:  "https://assets.coingecko.com/coins/images/10365/thumb/near.jpg",
  APTUSDT:   "https://assets.coingecko.com/coins/images/26455/thumb/aptos_round.png",
  ARBUSDT:   "https://assets.coingecko.com/coins/images/16547/thumb/photo_2023-03-29_21.47.00.jpeg",
  OPUSDT:    "https://assets.coingecko.com/coins/images/25244/thumb/Optimism.png",
  SUIUSDT:   "https://assets.coingecko.com/coins/images/26375/thumb/sui_asset.jpeg",

  BTCUSD:   "https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png",
  ETHUSD:   "https://assets.coingecko.com/coins/images/279/thumb/ethereum.png",
  BNBUSD:   "https://assets.coingecko.com/coins/images/825/thumb/bnb-icon2_2x.png",
  SOLUSD:   "https://assets.coingecko.com/coins/images/4128/thumb/solana.png",
  XRPUSD:   "https://assets.coingecko.com/coins/images/44/thumb/xrp-symbol-white-128.png",
  DOGEUSD:  "https://assets.coingecko.com/coins/images/5/thumb/dogecoin.png",
  ADAUSD:   "https://assets.coingecko.com/coins/images/975/thumb/cardano.png",
  AVAXUSD:  "https://assets.coingecko.com/coins/images/12559/thumb/Avalanche_Circle_RedWhite_Trans.png",
  MATICUSD: "https://assets.coingecko.com/coins/images/4713/thumb/matic-token-icon.png",
  SHIBUSD:  "https://assets.coingecko.com/coins/images/11939/thumb/shiba.png",
  DOTUSD:   "https://assets.coingecko.com/coins/images/12171/thumb/polkadot.png",
  LTCUSD:   "https://assets.coingecko.com/coins/images/2/thumb/litecoin.png",
  LINKUSD:  "https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png",
  UNIUSD:   "https://assets.coingecko.com/coins/images/12504/thumb/uni.jpg",
  ATOMUSD:  "https://assets.coingecko.com/coins/images/1481/thumb/cosmos_hub.png",
  NEARUSD:  "https://assets.coingecko.com/coins/images/10365/thumb/near.jpg",
  APTUSD:   "https://assets.coingecko.com/coins/images/26455/thumb/aptos_round.png",
  ARBUSD:   "https://assets.coingecko.com/coins/images/16547/thumb/photo_2023-03-29_21.47.00.jpeg",
  OPUSD:    "https://assets.coingecko.com/coins/images/25244/thumb/Optimism.png",
  SUIUSD:   "https://assets.coingecko.com/coins/images/26375/thumb/sui_asset.jpeg",
}

const COUNTRY_FLAGS: Record<string, string> = {
  EUR: "https://s3-symbol-logo.tradingview.com/country/EU--big.svg",
  GBP: "https://s3-symbol-logo.tradingview.com/country/GB--big.svg",
  USD: "https://s3-symbol-logo.tradingview.com/country/US--big.svg",
  JPY: "https://s3-symbol-logo.tradingview.com/country/JP--big.svg",
  CHF: "https://s3-symbol-logo.tradingview.com/country/CH--big.svg",
  AUD: "https://s3-symbol-logo.tradingview.com/country/AU--big.svg",
  CAD: "https://s3-symbol-logo.tradingview.com/country/CA--big.svg",
  NZD: "https://s3-symbol-logo.tradingview.com/country/NZ--big.svg",
  SGD: "https://s3-symbol-logo.tradingview.com/country/SG--big.svg",
  HKD: "https://s3-symbol-logo.tradingview.com/country/HK--big.svg",
  NOK: "https://s3-symbol-logo.tradingview.com/country/NO--big.svg",
  SEK: "https://s3-symbol-logo.tradingview.com/country/SE--big.svg",
  DKK: "https://s3-symbol-logo.tradingview.com/country/DK--big.svg",
  MXN: "https://s3-symbol-logo.tradingview.com/country/MX--big.svg",
  ZAR: "https://s3-symbol-logo.tradingview.com/country/ZA--big.svg",
  TRY: "https://s3-symbol-logo.tradingview.com/country/TR--big.svg",
}

const METAL_LOGOS: Record<string, string> = {
  XAU: "https://s3-symbol-logo.tradingview.com/metal/gold--big.svg",
  XAG: "https://s3-symbol-logo.tradingview.com/metal/silver--big.svg",
  XPT: "https://s3-symbol-logo.tradingview.com/metal/platinum--big.svg",
  XPD: "https://s3-symbol-logo.tradingview.com/metal/palladium--big.svg",
  XCU: "https://s3-symbol-logo.tradingview.com/metal/copper--big.svg",
  USOIL: "https://s3-symbol-logo.tradingview.com/crude-oil--big.svg",
}

export function getAssetLogoUrl(symbol: string): string | null {
  if (!symbol) return null
  const key = symbol.toUpperCase().replace(/[/\-]/g, "")
  if (LOGO_URLS[key]) return LOGO_URLS[key]
  
  for (const [metal, url] of Object.entries(METAL_LOGOS)) {
    if (key.startsWith(metal)) return url
  }

  const base = symbol.split("/")[0]?.toUpperCase() ?? key.slice(0, 3)
  if (COUNTRY_FLAGS[base]) return COUNTRY_FLAGS[base]

  return null
}

export function getAssetLogoUrlLarge(symbol: string): string | null {
  return getAssetLogoUrl(symbol)
}

interface AssetLogoProps {
  symbol: string
  name?: string
  size?: number
  className?: string
  bgColor?: string
  /** Override URL instead of deriving from symbol */
  logoUrl?: string
}

/**
 * Renders a real asset logo from CoinGecko (crypto) or TradingView (forex/commodity).
 * Falls back to a styled abbreviation badge if the image fails to load.
 */
export function AssetLogo({
  symbol,
  name,
  size = 32,
  className = "",
  bgColor,
  logoUrl,
}: AssetLogoProps) {
  const [failed, setFailed] = useState(false)

  const resolved = logoUrl ?? getAssetLogoUrl(symbol)
  const abbrev = symbol.replace("/USDT", "").replace("/USD", "").replace("USDT", "").replace("USD", "").slice(0, 4)

  if (!resolved || failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-full flex-shrink-0 font-bold text-white select-none ${className}`}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.3,
          background: bgColor ?? "#6366f1",
        }}
        aria-label={name ?? symbol}
      >
        {abbrev}
      </div>
    )
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: bgColor ? `${bgColor}18` : "transparent",
      }}
    >
      <Image
        src={resolved}
        alt={name ?? symbol}
        width={size}
        height={size}
        className="rounded-full object-contain"
        onError={() => setFailed(true)}
        unoptimized
      />
    </div>
  )
}
