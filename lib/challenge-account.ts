import { contractSize, pip } from "@/lib/forex-instruments"

export type ChallengeStatus = "not_started" | "pending_payment" | "payment_rejected" | "active" | "passed" | "failed"

export interface ChallengePlan {
  key: string
  name: string
  fee: number
  originalFee?: number
  discountPercent?: number
  startingBalance: number
  profitTargetPercent: number
  dailyLossLimitPercent: number
  maxDrawdownPercent: number
  minimumTradingDays: number
  maximumTradingDays?: number
  dailyProfitCreditPercent?: number
  leverage: number
}

export const DEFAULT_CHALLENGE_PLANS: ChallengePlan[] = [
  { key: "challenge_5k", name: "Challenge 5K", fee: 12.5, originalFee: 25, discountPercent: 50, startingBalance: 5_000, profitTargetPercent: 8, dailyLossLimitPercent: 5, maxDrawdownPercent: 10, minimumTradingDays: 5, maximumTradingDays: 5, dailyProfitCreditPercent: 4, leverage: 30 },
  { key: "challenge_10k", name: "Challenge 10K", fee: 89, startingBalance: 10_000, profitTargetPercent: 8, dailyLossLimitPercent: 5, maxDrawdownPercent: 10, minimumTradingDays: 5, maximumTradingDays: 5, dailyProfitCreditPercent: 4, leverage: 30 },
  { key: "challenge_25k", name: "Challenge 25K", fee: 179, startingBalance: 25_000, profitTargetPercent: 8, dailyLossLimitPercent: 5, maxDrawdownPercent: 10, minimumTradingDays: 5, maximumTradingDays: 5, dailyProfitCreditPercent: 4, leverage: 30 },
]

const challengeFeeFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })

export function formatChallengeFee(fee: number) {
  return challengeFeeFormatter.format(fee)
}

export function getChallengeRewardAmount(plan: ChallengePlan, passedEquity: number) {
  if (plan.key === "challenge_5k" || !Number.isFinite(passedEquity)) return 0
  const profitCents = Math.max(0, Math.round(passedEquity * 100) - Math.round(plan.startingBalance * 100))
  return Math.floor(profitCents / 2) / 100
}

export function getChallengePlan(key: unknown, plans = DEFAULT_CHALLENGE_PLANS) {
  return plans.find((plan) => plan.key === String(key)) ?? null
}

export function getChallengeStatusLabel(status: unknown) {
  return ({
    not_started: "Not started",
    pending_payment: "Payment pending",
    payment_rejected: "Payment needs attention",
    active: "In progress",
    passed: "Passed",
    failed: "Failed",
  } as Record<string, string>)[String(status)] ?? "Not started"
}

export function getChallengeSnapshot(
  plan: ChallengePlan,
  equity: number,
  dayStartEquity: number,
  tradingDays: number,
  status: ChallengeStatus = "active",
  creditedProfit = 0,
  deadlineReached = false,
) {
  const profitTarget = plan.startingBalance * (1 + plan.profitTargetPercent / 100)
  const maxEquityDrawdown = plan.startingBalance * (1 - plan.maxDrawdownPercent / 100)
  const dailyLossFloor = dayStartEquity * (1 - plan.dailyLossLimitPercent / 100)
  const breached = equity <= maxEquityDrawdown || equity <= dailyLossFloor
  const eligibleToPass = !breached && equity >= profitTarget && creditedProfit >= plan.startingBalance * plan.profitTargetPercent / 100 && tradingDays >= plan.minimumTradingDays && tradingDays <= (plan.maximumTradingDays ?? 5)
  const creditedProfitPercent = (creditedProfit / plan.startingBalance) * 100
  const profitPercent = ((equity - plan.startingBalance) / plan.startingBalance) * 100
  const dailyLossPercent = dayStartEquity > 0 ? ((dayStartEquity - equity) / dayStartEquity) * 100 : 0
  const drawdownPercent = ((plan.startingBalance - equity) / plan.startingBalance) * 100

  return {
    profitTarget,
    maxEquityDrawdown,
    dailyLossFloor,
    breached,
    deadlineReached,
    eligibleToPass,
    creditedProfit,
    creditedProfitPercent,
    profitPercent,
    dailyLossPercent,
    drawdownPercent,
    status: breached ? "failed" : eligibleToPass ? "passed" : deadlineReached ? "failed" : status,
  }
}

export type ChallengeConversionRates = Record<string, { bid: number; ask: number }>

function quoteToUsd(pair: string, price: number, rates?: ChallengeConversionRates | null): number | null {
  const [base, quote] = pair.split("/")
  if (quote === "USD") return 1
  if (base === "USD") return 1 / price
  const direct = rates?.[`${quote}/USD`]
  if (direct && direct.bid > 0 && direct.ask >= direct.bid) return (direct.bid + direct.ask) / 2
  const inverse = rates?.[`USD/${quote}`]
  if (inverse && inverse.bid > 0 && inverse.ask >= inverse.bid) return 2 / (inverse.bid + inverse.ask)
  return null
}

export function calculateChallengeMargin(pair: string, lotSize: number, price: number, leverage: number, rates?: ChallengeConversionRates | null) {
  if (![lotSize, price, leverage].every(Number.isFinite) || lotSize <= 0 || price <= 0 || leverage <= 0) return 0
  const [base] = pair.split("/")
  const conversion = quoteToUsd(pair, price, rates)
  if (conversion === null) return 0
  const notional = base === "USD" ? lotSize * contractSize(pair) : lotSize * contractSize(pair) * price * conversion
  return Number((notional / leverage).toFixed(2))
}

export function calculateChallengePnl(
  pair: string,
  direction: "BUY" | "SELL",
  lotSize: number,
  openPrice: number,
  closePrice: number,
  swap = 0,
  rates?: ChallengeConversionRates | null,
) {
  if (![lotSize, openPrice, closePrice, swap].every(Number.isFinite) || lotSize <= 0 || openPrice <= 0 || closePrice <= 0) {
    return { pnl: 0, pips: 0 }
  }

  const pipSize = pip(pair)
  if (pipSize <= 0) return { pnl: 0, pips: 0 }

  const conversion = quoteToUsd(pair, closePrice, rates)
  if (conversion === null) return { pnl: Number.NaN, pips: 0 }
  const directionMultiplier = direction === "BUY" ? 1 : -1
  const priceDelta = (closePrice - openPrice) * directionMultiplier
  const pipCount = priceDelta / pipSize
  const pipValue = lotSize * contractSize(pair) * pipSize * conversion

  return {
    pnl: Number((pipCount * pipValue + swap).toFixed(2)),
    pips: Number(pipCount.toFixed(1)),
  }
}
