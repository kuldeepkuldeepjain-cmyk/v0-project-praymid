// ─── Shared instrument catalog ─────────────────────────────────────────────
// Single source of truth for every tradable instrument (forex, commodities,
// crypto) so the trading UI and the rates/candles API routes never drift
// out of sync when instruments are added or repriced.

export type AssetCategory = "Forex" | "Commodities" | "Crypto"

export type PairConfig = { base: string; quote: string; symbol: string; category: AssetCategory }

// ── Forex majors + commodities (static) ─────────────────────────────────────
const FOREX_CONFIG: PairConfig[] = [
  { base: "EUR", quote: "USD", symbol: "EUR/USD", category: "Forex" },
  { base: "GBP", quote: "USD", symbol: "GBP/USD", category: "Forex" },
  { base: "USD", quote: "JPY", symbol: "USD/JPY", category: "Forex" },
  { base: "USD", quote: "CHF", symbol: "USD/CHF", category: "Forex" },
  { base: "AUD", quote: "USD", symbol: "AUD/USD", category: "Forex" },
  { base: "USD", quote: "CAD", symbol: "USD/CAD", category: "Forex" },
  { base: "NZD", quote: "USD", symbol: "NZD/USD", category: "Forex" },
  { base: "EUR", quote: "GBP", symbol: "EUR/GBP", category: "Forex" },
]

const COMMODITIES_CONFIG: PairConfig[] = [
  { base: "XAU", quote: "USD", symbol: "XAU/USD", category: "Commodities" },
  { base: "XAG", quote: "USD", symbol: "XAG/USD", category: "Commodities" },
]

const FOREX_YAHOO: Record<string, string> = {
  "EUR/USD": "EURUSD=X", "GBP/USD": "GBPUSD=X", "USD/JPY": "USDJPY=X", "USD/CHF": "USDCHF=X",
  "AUD/USD": "AUDUSD=X", "USD/CAD": "USDCAD=X", "NZD/USD": "NZDUSD=X", "EUR/GBP": "EURGBP=X",
  "XAU/USD": "GC=F", "XAG/USD": "SI=F",
}

const FOREX_SPREADS: Record<string, number> = {
  "EUR/USD": 0.00015, "GBP/USD": 0.00020, "USD/JPY": 0.013, "USD/CHF": 0.00020,
  "AUD/USD": 0.00018, "USD/CAD": 0.00020, "NZD/USD": 0.00025, "EUR/GBP": 0.00018,
  "XAU/USD": 0.50, "XAG/USD": 0.03,
}

const FOREX_SWAPS: Record<string, [number, number]> = {
  "EUR/USD": [-5.80, 0.60], "GBP/USD": [-4.20, 0.20], "USD/JPY": [1.20, -3.40],
  "USD/CHF": [0.80, -2.80], "AUD/USD": [-2.60, -0.40], "USD/CAD": [0.60, -2.90],
  "NZD/USD": [-1.80, -0.60], "EUR/GBP": [-4.10, 0.50],
  "XAU/USD": [-10.50, -3.50], "XAG/USD": [-2.80, -1.20],
}

const FOREX_SEEDS: Record<string, number> = {
  "EUR/USD": 1.1050, "GBP/USD": 1.2750, "USD/JPY": 149.50, "USD/CHF": 0.9050,
  "AUD/USD": 0.6550, "USD/CAD": 1.3650, "NZD/USD": 0.6050, "EUR/GBP": 0.8650,
  "XAU/USD": 3350.0, "XAG/USD": 34.50,
}

const FOREX_FULL_NAMES: Record<string, string> = {
  "EUR/USD": "Euro / US Dollar", "GBP/USD": "British Pound", "USD/JPY": "US Dollar / Yen",
  "USD/CHF": "Swiss Franc", "AUD/USD": "Australian Dollar", "USD/CAD": "Canadian Dollar",
  "NZD/USD": "New Zealand Dollar", "EUR/GBP": "Euro / Pound",
  "XAU/USD": "Gold Spot", "XAG/USD": "Silver Spot",
}

const FOREX_ICONS: Record<string, string> = { "XAU/USD": "Au", "XAG/USD": "Ag" }

const FOREX_DECIMALS: Record<string, number> = {
  "USD/JPY": 3,
  "XAU/USD": 2, "XAG/USD": 3,
}

// ── Crypto catalog (generated from a seed price so every downstream value
//    — decimals, pip size, contract size, spread, swap — stays consistent
//    for every coin, including the 50 top altcoins added below) ────────────

type CryptoDef = { ticker: string; name: string; seed: number; icon?: string; decimals?: number; pip?: number; contractSize?: number }

// Majors kept at their original hand-tuned precision (pre-dates the alt list)
const CRYPTO_MAJORS: CryptoDef[] = [
  { ticker: "BTC", name: "Bitcoin",  seed: 97000.0, icon: "₿", decimals: 1, pip: 1.0,   contractSize: 1 },
  { ticker: "ETH", name: "Ethereum", seed: 3200.0,  icon: "Ξ", decimals: 2, pip: 0.1,   contractSize: 10 },
  { ticker: "BNB", name: "BNB Chain",seed: 580.0,   icon: "BNB", decimals: 2, pip: 0.01,  contractSize: 100 },
  { ticker: "SOL", name: "Solana",   seed: 180.0,   icon: "◎", decimals: 3, pip: 0.001, contractSize: 100 },
  { ticker: "XRP", name: "Ripple XRP", seed: 0.55,  icon: "✕", decimals: 4, pip: 0.0001, contractSize: 10000 },
  { ticker: "ADA", name: "Cardano",  seed: 0.45,    icon: "₳", decimals: 4, pip: 0.0001, contractSize: 10000 },
]

// Top 50 altcoins by market cap/recognition, priced with an approximate seed.
// Precision (decimals/pip/contractSize) is derived automatically from the
// seed price via `bucketFor` below — no need to hand-tune each one.
const CRYPTO_ALTS: CryptoDef[] = [
  { ticker: "DOGE",  name: "Dogecoin",       seed: 0.12 },
  { ticker: "TRX",   name: "TRON",           seed: 0.16 },
  { ticker: "DOT",   name: "Polkadot",       seed: 4.5 },
  { ticker: "MATIC", name: "Polygon",        seed: 0.45 },
  { ticker: "LTC",   name: "Litecoin",       seed: 75.0 },
  { ticker: "SHIB",  name: "Shiba Inu",      seed: 0.0000135 },
  { ticker: "AVAX",  name: "Avalanche",      seed: 22.0 },
  { ticker: "LINK",  name: "Chainlink",      seed: 13.0 },
  { ticker: "ATOM",  name: "Cosmos",         seed: 4.2 },
  { ticker: "UNI",   name: "Uniswap",        seed: 7.0 },
  { ticker: "ETC",   name: "Ethereum Classic", seed: 18.0 },
  { ticker: "XLM",   name: "Stellar",        seed: 0.10 },
  { ticker: "ICP",   name: "Internet Computer", seed: 5.5 },
  { ticker: "FIL",   name: "Filecoin",       seed: 3.2 },
  { ticker: "APT",   name: "Aptos",          seed: 6.5 },
  { ticker: "ARB",   name: "Arbitrum",       seed: 0.45 },
  { ticker: "OP",    name: "Optimism",       seed: 1.3 },
  { ticker: "NEAR",  name: "NEAR Protocol",  seed: 3.5 },
  { ticker: "VET",   name: "VeChain",        seed: 0.025 },
  { ticker: "ALGO",  name: "Algorand",       seed: 0.16 },
  { ticker: "HBAR",  name: "Hedera",         seed: 0.06 },
  { ticker: "IMX",   name: "Immutable",      seed: 0.9 },
  { ticker: "RNDR",  name: "Render",         seed: 4.5 },
  { ticker: "INJ",   name: "Injective",      seed: 12.0 },
  { ticker: "TIA",   name: "Celestia",       seed: 3.0 },
  { ticker: "SUI",   name: "Sui",            seed: 1.6 },
  { ticker: "SEI",   name: "Sei",            seed: 0.20 },
  { ticker: "AAVE",  name: "Aave",           seed: 165.0 },
  { ticker: "MKR",   name: "Maker",          seed: 1500.0 },
  { ticker: "GRT",   name: "The Graph",      seed: 0.10 },
  { ticker: "SAND",  name: "The Sandbox",    seed: 0.30 },
  { ticker: "MANA",  name: "Decentraland",   seed: 0.28 },
  { ticker: "AXS",   name: "Axie Infinity",  seed: 3.8 },
  { ticker: "THETA", name: "Theta Network",  seed: 0.75 },
  { ticker: "EOS",   name: "EOS",            seed: 0.65 },
  { ticker: "FTM",   name: "Fantom",         seed: 0.55 },
  { ticker: "FLOW",  name: "Flow",           seed: 0.45 },
  { ticker: "XTZ",   name: "Tezos",          seed: 0.60 },
  { ticker: "KAVA",  name: "Kava",           seed: 0.35 },
  { ticker: "EGLD",  name: "MultiversX",     seed: 22.0 },
  { ticker: "RUNE",  name: "THORChain",      seed: 2.0 },
  { ticker: "CRV",   name: "Curve DAO",      seed: 0.55 },
  { ticker: "LDO",   name: "Lido DAO",       seed: 0.85 },
  { ticker: "PEPE",  name: "Pepe",           seed: 0.0000085 },
  { ticker: "WIF",   name: "dogwifhat",      seed: 1.1 },
  { ticker: "BONK",  name: "Bonk",           seed: 0.0000155 },
  { ticker: "KAS",   name: "Kaspa",          seed: 0.09 },
  { ticker: "STX",   name: "Stacks",         seed: 0.85 },
  { ticker: "QNT",   name: "Quant",          seed: 85.0 },
  { ticker: "GALA",  name: "Gala",           seed: 0.02 },
]

function bucketFor(seed: number): { decimals: number; pip: number; contractSize: number } {
  if (seed >= 100)   return { decimals: 2, pip: 0.01,        contractSize: 10 }
  if (seed >= 10)    return { decimals: 3, pip: 0.001,       contractSize: 100 }
  if (seed >= 1)     return { decimals: 4, pip: 0.0001,      contractSize: 1000 }
  if (seed >= 0.1)   return { decimals: 5, pip: 0.00001,     contractSize: 1000 }
  if (seed >= 0.01)  return { decimals: 6, pip: 0.000001,    contractSize: 10000 }
  if (seed >= 0.001) return { decimals: 7, pip: 0.0000001,   contractSize: 100000 }
  return                     { decimals: 9, pip: 0.000000001, contractSize: 1000000 }
}

function clamp(v: number, lo: number, hi: number): number { return Math.min(hi, Math.max(lo, v)) }

const CRYPTO_DEFS: CryptoDef[] = [...CRYPTO_MAJORS, ...CRYPTO_ALTS]

export const PAIRS_CONFIG: PairConfig[] = [
  ...FOREX_CONFIG,
  ...COMMODITIES_CONFIG,
  ...CRYPTO_DEFS.map((c): PairConfig => ({ base: c.ticker, quote: "USD", symbol: `${c.ticker}/USD`, category: "Crypto" })),
]

export const YAHOO_SYMBOLS: Record<string, string> = {
  ...FOREX_YAHOO,
  ...Object.fromEntries(CRYPTO_DEFS.map(c => [`${c.ticker}/USD`, `${c.ticker}-USD`])),
}

export const TYPICAL_SPREADS: Record<string, number> = {
  ...FOREX_SPREADS,
  ...Object.fromEntries(CRYPTO_DEFS.map(c => {
    if (c.ticker === "BTC") return [`${c.ticker}/USD`, 5.0]
    if (c.ticker === "ETH") return [`${c.ticker}/USD`, 1.5]
    if (c.ticker === "BNB") return [`${c.ticker}/USD`, 0.30]
    if (c.ticker === "SOL") return [`${c.ticker}/USD`, 0.10]
    if (c.ticker === "XRP") return [`${c.ticker}/USD`, 0.001]
    if (c.ticker === "ADA") return [`${c.ticker}/USD`, 0.0005]
    // Proportional to price (~0.06% of mid) so micro-priced coins (e.g. PEPE)
    // don't get a spread floor that dwarfs the price itself.
    return [`${c.ticker}/USD`, parseFloat(clamp(c.seed * 0.0006, c.seed * 0.00002, 5).toPrecision(3))]
  })),
}

export const SWAP_RATES: Record<string, [number, number]> = {
  ...FOREX_SWAPS,
  ...Object.fromEntries(CRYPTO_DEFS.map(c => {
    if (c.ticker === "BTC") return [`${c.ticker}/USD`, [-25.0, -25.0]]
    if (c.ticker === "ETH") return [`${c.ticker}/USD`, [-8.0, -8.0]]
    if (c.ticker === "BNB") return [`${c.ticker}/USD`, [-5.0, -5.0]]
    if (c.ticker === "SOL") return [`${c.ticker}/USD`, [-3.0, -3.0]]
    if (c.ticker === "XRP") return [`${c.ticker}/USD`, [-1.5, -1.5]]
    if (c.ticker === "ADA") return [`${c.ticker}/USD`, [-1.2, -1.2]]
    const { contractSize } = bucketFor(c.seed)
    const notional = contractSize * c.seed
    const rate = -clamp(notional * 0.00008, 0.05, 20)
    return [`${c.ticker}/USD`, [rate, rate] as [number, number]]
  })),
}

export const SEED_PRICES: Record<string, number> = {
  ...FOREX_SEEDS,
  ...Object.fromEntries(CRYPTO_DEFS.map(c => [`${c.ticker}/USD`, c.seed])),
}

export const FULL_NAMES: Record<string, string> = {
  ...FOREX_FULL_NAMES,
  ...Object.fromEntries(CRYPTO_DEFS.map(c => [`${c.ticker}/USD`, c.name])),
}

export const ASSET_ICON: Record<string, string> = {
  ...FOREX_ICONS,
  ...Object.fromEntries(CRYPTO_DEFS.filter(c => c.icon).map(c => [`${c.ticker}/USD`, c.icon as string])),
}

const CRYPTO_TICKERS = new Set(CRYPTO_DEFS.map(c => c.ticker))

const CRYPTO_PRECISION: Record<string, { decimals: number; pip: number; contractSize: number }> = Object.fromEntries(
  CRYPTO_DEFS.map(c => [
    c.ticker,
    c.decimals != null && c.pip != null && c.contractSize != null
      ? { decimals: c.decimals, pip: c.pip, contractSize: c.contractSize }
      : bucketFor(c.seed),
  ])
)

// ── Instrument helpers ───────────────────────────────────────────────────────

export function isJpy(sym: string): boolean { return sym.includes("JPY") }
export function isCrypto(sym: string): boolean { return CRYPTO_TICKERS.has(sym.split("/")[0]) }
export function isGold(sym: string): boolean { return sym.startsWith("XAU") }
export function isSilver(sym: string): boolean { return sym.startsWith("XAG") }
export function isCommodity(sym: string): boolean { return isGold(sym) || isSilver(sym) }

export function decimals(sym: string): number {
  if (FOREX_DECIMALS[sym] != null) return FOREX_DECIMALS[sym]
  const ticker = sym.split("/")[0]
  if (CRYPTO_PRECISION[ticker]) return CRYPTO_PRECISION[ticker].decimals
  return isJpy(sym) ? 3 : 5
}

export function pip(sym: string): number {
  if (isGold(sym)) return 0.01
  if (isSilver(sym)) return 0.001
  const ticker = sym.split("/")[0]
  if (CRYPTO_PRECISION[ticker]) return CRYPTO_PRECISION[ticker].pip
  return isJpy(sym) ? 0.01 : 0.0001
}

export function contractSize(sym: string): number {
  if (isGold(sym)) return 100        // 100 troy oz
  if (isSilver(sym)) return 5000     // 5000 troy oz
  const ticker = sym.split("/")[0]
  if (CRYPTO_PRECISION[ticker]) return CRYPTO_PRECISION[ticker].contractSize
  return 100000                       // standard forex lot
}
