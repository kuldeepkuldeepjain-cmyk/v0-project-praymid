export type ChallengeStatus = "not_started" | "pending_payment" | "active" | "passed" | "failed"

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
  return ({ not_started: "Not started", pending_payment: "Payment pending", active: "In progress", passed: "Passed", failed: "Failed" } as Record<string, string>)[String(status)] ?? "Not started"
}

export function getChallengeSnapshot(plan: ChallengePlan, equity: number, dayStartEquity: number, tradingDays: number, status: ChallengeStatus = "active") {
  const profitTarget = plan.startingBalance * (1 + plan.profitTargetPercent / 100)
  const maxEquityDrawdown = plan.startingBalance * (1 - plan.maxDrawdownPercent / 100)
  const dailyLossFloor = dayStartEquity * (1 - plan.dailyLossLimitPercent / 100)
  const breached = equity < maxEquityDrawdown || equity < dailyLossFloor
  const eligibleToPass = equity >= profitTarget && tradingDays >= plan.minimumTradingDays
  return { profitTarget, maxEquityDrawdown, dailyLossFloor, breached, eligibleToPass, status: breached ? "failed" : eligibleToPass ? "passed" : status }
}
