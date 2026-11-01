export const MIN_WITHDRAWAL = 50

export const PAYOUT_NETWORKS = [
  { id: "BEP20", label: "BNB Smart Chain", ticker: "USDT (BEP20)", fee: 1, eta: "1–5 minutes", addressHint: "Starts with 0x, 42 characters" },
  { id: "TRC20", label: "Tron Network", ticker: "USDT (TRC20)", fee: 1, eta: "1–5 minutes", addressHint: "Starts with T, 34 characters" },
  { id: "ERC20", label: "Ethereum", ticker: "USDT (ERC20)", fee: 5, eta: "5–30 minutes", addressHint: "Starts with 0x, 42 characters" },
  { id: "INR", label: "UPI or bank account", ticker: "Indian Rupees (INR)", fee: 0, eta: "1–2 business days", addressHint: "UPI ID or bank account details" },
] as const

export type PayoutNetwork = (typeof PAYOUT_NETWORKS)[number]
export type NetworkId = PayoutNetwork["id"]
export const QUICK_PERCENTAGES = [25, 50, 75, 100] as const

export interface PayoutRecord {
  id: string
  amount: number | string
  status: string
  payout_method?: string | null
  wallet_address?: string | null
  bep20_address?: string | null
  transaction_hash?: string | null
  created_at?: string | null
  requested_at?: string | null
  processed_at?: string | null
  matched_at?: string | null
  wallet_balance_before?: number | string | null
  wallet_balance_after?: number | string | null
  admin_notes?: string | null
  participant_confirmed?: boolean | null
  confirmed_at?: string | null
  dispute_status?: string | null
  dispute_raised_at?: string | null
}

export function formatPayoutAmount(value: number | string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Number(value) || 0)
}

export function formatPayoutDate(value?: string | null, includeTime = false): string {
  if (!value || Number.isNaN(new Date(value).getTime())) return "Not available"
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } as const : {}),
  }).format(new Date(value))
}

export function getPayoutStatus(status: string): { label: string; description: string } {
  switch (status) {
    case "pending": return { label: "Requested", description: "Your request is waiting for review." }
    case "processing": return { label: "In review", description: "Your payout is being reviewed and processed." }
    case "assigned": return { label: "Processing", description: "Your payout has been assigned for processing." }
    case "approved": return { label: "Approved", description: "Your payout is approved and awaiting transfer." }
    case "completed": return { label: "Sent", description: "Marked as sent. Check your destination and confirm receipt below." }
    case "rejected": return { label: "Rejected", description: "This request was not approved. Review the reason below, if provided." }
    default: return { label: status.replaceAll("_", " ") || "Unknown", description: "View the transfer details for this request." }
  }
}
