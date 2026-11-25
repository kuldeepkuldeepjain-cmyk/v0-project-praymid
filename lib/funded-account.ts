import { contractSize } from "@/lib/forex-instruments"

export const FUNDED_MAX_DRAWDOWN_PERCENT = 3
export const FUNDED_SINGLE_TRADE_DRAWDOWN_PERCENT = 1

const FUNDED_PLANS = [
  { baseAmount: 5_000, topUpAmount: 50 },
  { baseAmount: 10_000, topUpAmount: 100 },
  { baseAmount: 25_000, topUpAmount: 250 },
  { baseAmount: 50_000, topUpAmount: 500 },
  { baseAmount: 100_000, topUpAmount: 1_000 },
] as const

function toPositiveNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function getFundedBaseAmount(accountBalance: unknown, configuredAmount?: unknown): number {
  const configured = toPositiveNumber(configuredAmount)
  const configuredPlan = FUNDED_PLANS.find((plan) => plan.baseAmount === configured)
  if (configuredPlan) return configuredPlan.baseAmount

  const balance = toPositiveNumber(accountBalance)
  if (!balance) return 0

  return FUNDED_PLANS.reduce((closest, plan) => {
    const currentDistance = Math.abs(plan.baseAmount - balance)
    const closestDistance = Math.abs(closest.baseAmount - balance)
    return currentDistance < closestDistance ? plan : closest
  }).baseAmount
}

export function getFundedTopUpAmount(baseAmount: number): number {
  const plan = FUNDED_PLANS.find((item) => item.baseAmount === baseAmount)
  return plan?.topUpAmount ?? Math.max(0, baseAmount * 0.01)
}

export function getFundedPredictionMaxAmount(
  accountType: unknown,
  accountBalance: unknown,
  configuredAmount?: unknown,
): number | null {
  if (accountType !== "funded") return null

  const balance = Number(accountBalance)
  const baseAmount = getFundedBaseAmount(accountBalance, configuredAmount)
  if (!Number.isFinite(balance) || !baseAmount) return 0

  // A funded prediction stake is a single trade, so it cannot exceed either
  // the existing $100 cap or the account's 1% single-trade loss allowance.
  const availableProfit = balance > baseAmount ? balance - baseAmount : 100
  return Math.min(availableProfit, getFundedSingleTradeLossLimit(baseAmount))
}

export function getFundedLossLimit(baseAmount: number): number {
  return Math.max(0, baseAmount * (FUNDED_MAX_DRAWDOWN_PERCENT / 100))
}

export function getFundedMinimumBalance(baseAmount: number): number {
  return Math.max(0, baseAmount - getFundedLossLimit(baseAmount))
}

export function getFundedSingleTradeLossLimit(baseAmount: number): number {
  return Math.max(0, baseAmount * (FUNDED_SINGLE_TRADE_DRAWDOWN_PERCENT / 100))
}

export function getFundedTradeRiskAmount(
  pair: string,
  lotSize: number,
  entryPrice: number,
  stopLoss: number,
): number | null {
  if (![lotSize, entryPrice, stopLoss].every(Number.isFinite) || lotSize <= 0 || entryPrice <= 0 || stopLoss <= 0) {
    return null
  }

  const quoteRisk = Math.abs(entryPrice - stopLoss) * lotSize * contractSize(pair)
  const usdBaseAdjustment = pair.split("/")[0] === "USD" ? 1 / entryPrice : 1
  const risk = quoteRisk * usdBaseAdjustment
  return Number.isFinite(risk) ? Number(risk.toFixed(2)) : null
}

export function getFundedEquity(initialBalance: unknown, availableBalance: unknown, committedFunds: unknown = 0): number {
  const initial = toPositiveNumber(initialBalance)
  const available = Number(availableBalance)
  const committed = Math.max(0, Number(committedFunds) || 0)
  return initial > 0 && Number.isFinite(available) ? available + committed : 0
}

export function isFundedDrawdownBreached(accountType: unknown, initialBalance: unknown, availableBalance: unknown, committedFunds: unknown = 0): boolean {
  if (accountType !== "funded") return false
  const initial = toPositiveNumber(initialBalance)
  const equity = getFundedEquity(initial, availableBalance, committedFunds)
  const breachEquityLevel = getFundedMinimumBalance(initial)
  return initial > 0 && equity < breachEquityLevel
}

export interface FundedDrawdownSnapshot {
  initialBalance: number
  maxDrawdownPercent: number
  maxLossAllowed: number
  breachEquity: number
  currentEquity: number
  remainingDrawdown: number
  drawdownUsedPercent: number
  status: "ACTIVE" | "BREACHED"
  warningLevel: "normal" | "warning" | "critical" | "breached"
}

export function getFundedDrawdownSnapshot(
  accountType: unknown,
  initialBalance: unknown,
  availableBalance: unknown,
  committedFunds: unknown = 0,
  isBreached = false,
): FundedDrawdownSnapshot | null {
  if (accountType !== "funded") return null
  const initial = toPositiveNumber(initialBalance)
  if (!initial) return null

  const maxLossAllowed = getFundedLossLimit(initial)
  const breachEquity = getFundedMinimumBalance(initial)
  const currentEquity = getFundedEquity(initial, availableBalance, committedFunds)
  const drawdown = Math.max(0, initial - currentEquity)
  const remainingDrawdown = Math.max(0, maxLossAllowed - drawdown)
  const drawdownUsedPercent = maxLossAllowed > 0 ? Math.min(100, (drawdown / maxLossAllowed) * 100) : 0
  const breached = isBreached || isFundedDrawdownBreached(accountType, initial, availableBalance, committedFunds)

  let warningLevel: FundedDrawdownSnapshot["warningLevel"] = "normal"
  if (breached) warningLevel = "breached"
  else if (drawdownUsedPercent >= 90) warningLevel = "critical"
  else if (drawdownUsedPercent >= 75) warningLevel = "warning"

  return {
    initialBalance: initial,
    maxDrawdownPercent: FUNDED_MAX_DRAWDOWN_PERCENT,
    maxLossAllowed,
    breachEquity,
    currentEquity,
    remainingDrawdown,
    drawdownUsedPercent,
    status: breached ? "BREACHED" : "ACTIVE",
    warningLevel,
  }
}

export function getFundedPayoutAmount(accountBalance: unknown, configuredAmount?: unknown): number {
  const balance = toPositiveNumber(accountBalance)
  const baseAmount = getFundedBaseAmount(accountBalance, configuredAmount)
  // Funded accounts receive 90% of eligible profit when not in breach.
  return balance > baseAmount ? Math.round((balance - baseAmount) * 0.9 * 100) / 100 : 0
}

export function isFundedBalanceBelowMinimum(
  accountType: unknown,
  balance: unknown,
  configuredAmount?: unknown,
  amountInTrades: unknown = 0,
): boolean {
  if (accountType !== "funded") return false

  const availableBalance = Number(balance)
  const committedFunds = Number(amountInTrades) || 0
  const totalFunds = availableBalance + Math.max(0, committedFunds)
  const baseAmount = getFundedBaseAmount(totalFunds, configuredAmount)
  if (!Number.isFinite(availableBalance) || availableBalance < 0 || !baseAmount) return false

  // Total equity is available cash plus funds committed to open positions.
  return totalFunds < getFundedMinimumBalance(baseAmount)
}

export { FUNDED_PLANS }
