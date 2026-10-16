import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Lending | EliteFund",
  description: "Explore EliteFund lending opportunities, repayment terms, funded account rules, and risk-aware tools.",
  alternates: {
    canonical: "https://elitefund.sbs/lending",
  },
  openGraph: {
    title: "Lending | EliteFund",
    description: "Explore EliteFund lending opportunities, repayment terms, funded account rules, and risk-aware tools.",
    url: "https://elitefund.sbs/lending",
    siteName: "EliteFund",
    type: "website",
  },
}

export default function LendingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
