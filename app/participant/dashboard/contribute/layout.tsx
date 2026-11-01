import type { Metadata } from "next"

export const metadata: Metadata = {
  title: { absolute: "Add Funds | EliteFund" },
  description: "Fund your EliteFund trading account with USDT or INR using UPI and bank transfer. Review payment instructions, apply a promo code, and track your funding request.",
  robots: { index: false, follow: false },
}

export default function FundingLayout({ children }: { children: React.ReactNode }) {
  return children
}
