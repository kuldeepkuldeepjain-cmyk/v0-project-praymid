import { contractSize, pip } from "@/lib/forex-instruments"

export type ChallengeStatus = "not_started" | "pending_payment" | "payment_rejected" | "active" | "passed" | "failed"

export interface ChallengePlan {
  key: string
  name: string
  fee: number
  startingBalance: number
  profitTargetPercent: number
  dailyLossLimitPercent: number
  maxDrawdownPercent: number
  minimumTradingDays: number
  leverage: number
}

export const DEFAULT_CHALLENGE_PLANS: ChallengePlan[] = [
  { key: "challenge_5k", name: "Challenge 5K", fee: 49, startingBalance: 5_000, profitTargetPercent: 8, dailyLossLimitPercent: 5, maxDrawdownPercent: 10, minimumTradingDays: 5, leverage: 30 },
  { key: "challenge_10k", name: "Challenge 10K", fee: 89, startingBalance: 10_000, profitTargetPercent: 8, dailyLossLimitPercent: 5, maxDrawdownPercent: 10, minimumTradingDays: 5, leverage: 30 },
  { key: "challenge_25k", name: "Challenge 25K", fee: 179, startingBalance: 25_000, profitTargetPercent: 8, dailyLossLimitPercent: 5, maxDrawdownPercent: 10, minimumTradingDays: 5, leverage: 30 },
]

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
) {
  const profitTarget = plan.startingBalance * (1 + plan.profitTargetPercent / 100)
  const maxEquityDrawdown = plan.startingBalance * (1 - plan.maxDrawdownPercent / 100)
  const dailyLossFloor = dayStartEquity * (1 - plan.dailyLossLimitPercent / 100)
  const breached = equity <= maxEquityDrawdown || equity <= dailyLossFloor
  const eligibleToPass = equity >= profitTarget && tradingDays >= plan.minimumTradingDays
  const profitPercent = ((equity - plan.startingBalance) / plan.startingBalance) * 100
  const dailyLossPercent = dayStartEquity > 0 ? ((dayStartEquity - equity) / dayStartEquity) * 100 : 0
  const drawdownPercent = ((plan.startingBalance - equity) / plan.startingBalance) * 100

  return {
    profitTarget,
    maxEquityDrawdown,
    dailyLossFloor,
    breached,
    eligibleToPass,
    profitPercent,
    dailyLossPercent,
    drawdownPercent,
    status: breached ? "failed" : eligibleToPass ? "passed" : status,
  }
}

export function calculateChallengeMargin(pair: string, lotSize: number, price: number, leverage: number) {
  if (![lotSize, price, leverage].every(Number.isFinite) || lotSize <= 0 || price <= 0 || leverage <= 0) return 0
  const base = pair.split("/")[0]
  const notional = base === "USD" ? lotSize * contractSize(pair) : lotSize * contractSize(pair) * price
  return Number((notional / leverage).toFixed(2))
}

export function calculateChallengePnl(
  pair: string,
  direction: "BUY" | "SELL",
  lotSize: number,
  openPrice: number,
  closePrice: number,
  swap = 0,
) {
  if (![lotSize, openPrice, closePrice, swap].every(Number.isFinite) || lotSize <= 0 || openPrice <= 0 || closePrice <= 0) {
    return { pnl: 0, pips: 0 }
  }

  const pipSize = pip(pair)
  if (pipSize <= 0) return { pnl: 0, pips: 0 }

  const directionMultiplier = direction === "BUY" ? 1 : -1
  const priceDelta = (closePrice - openPrice) * directionMultiplier
  const pipCount = priceDelta / pipSize
  const isUsdBase = pair.split("/")[0] === "USD"
  const pipValue = isUsdBase
    ? (lotSize * contractSize(pair) * pipSize) / closePrice
    : lotSize * contractSize(pair) * pipSize

  return {
    pnl: Number((pipCount * pipValue + swap).toFixed(2)),
    pips: Number(pipCount.toFixed(1)),
  }
}
