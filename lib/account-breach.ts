export type BreachAccount = {
  account_type?: string | null
  funded_breach_status?: string | null
  funded_breach_at?: string | Date | null
  challenge_status?: string | null
  challenge_failed_at?: string | Date | null
}

export function getAccountBreach(account?: BreachAccount | null) {
  if (!account) return null
  if (account.account_type === "funded" && account.funded_breach_status === "breached") {
    return {
      reason: "Funded account breached: the maximum drawdown limit was reached. Trading balance reset to $0.00.",
      occurredAt: account.funded_breach_at ?? null,
    }
  }
  if (account.account_type === "challenge" && (account.challenge_status === "failed"
    || (account.challenge_failed_at && ["pending_payment", "payment_rejected"].includes(account.challenge_status || "")))) {
    return {
      reason: "Challenge failed: a daily loss or maximum drawdown limit was reached. Trading balance reset to $0.00.",
      occurredAt: account.challenge_failed_at ?? null,
    }
  }
  return null
}

export function isCurrentBreachPayment(account: BreachAccount, createdAt: string | Date | null) {
  const breach = getAccountBreach(account)
  if (!breach || !createdAt) return false
  const paymentTime = new Date(createdAt).getTime()
  return Number.isFinite(paymentTime) && (!breach.occurredAt || paymentTime >= new Date(breach.occurredAt).getTime())
}
