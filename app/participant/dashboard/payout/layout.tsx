import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: { absolute: "Payouts | EliteFund" },
  description: "Request an EliteFund payout, review your eligible balance and transfer estimates, and track withdrawal status, receiving details, and payout confirmations.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = { themeColor: "#080e17" }

export default function PayoutLayout({ children }: { children: React.ReactNode }) {
  return children
}
