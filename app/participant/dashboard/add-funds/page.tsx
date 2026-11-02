import type { Metadata } from "next"
import { Suspense } from "react"
import { AddFundsPage } from "@/components/add-funds-page"
import { PageLoader } from "@/components/ui/page-loader"

export const metadata: Metadata = {
  title: "Add Funds | EliteFund",
  description: "Fund your EliteFund account and track your payment review.",
  robots: { index: false, follow: false },
}

export default function Page() {
  return <Suspense fallback={<PageLoader variant="subpage" />}><AddFundsPage /></Suspense>
}
