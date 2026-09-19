const FUNDED_PLANS = [
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

export function getFundedLossLimit(baseAmount: number): number {
  // Funded accounts are frozen after a 2% loss of total funds.
  return Math.max(0, baseAmount * 0.02)
}

export function getFundedMinimumBalance(baseAmount: number): number {
  return Math.max(0, baseAmount - getFundedLossLimit(baseAmount))
}

export function getFundedPayoutAmount(accountBalance: unknown, configuredAmount?: unknown): number {
  const balance = toPositiveNumber(accountBalance)
  const baseAmount = getFundedBaseAmount(accountBalance, configuredAmount)
  return balance > baseAmount ? Math.round((balance - baseAmount) * 0.8 * 100) / 100 : 0
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

  // Total funds are cash still available plus stakes/margin committed to open trades.
  // Freeze only once equity falls below 98% of the funded amount (2% loss limit).
  return totalFunds < getFundedMinimumBalance(baseAmount)
}

export { FUNDED_PLANS }
