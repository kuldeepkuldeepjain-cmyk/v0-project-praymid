import type { Metadata, Viewport } from "next"
import LandingExperience from "@/components/landing-experience"
import { createSiteMetadata } from "@/lib/site-seo"

export const metadata: Metadata = createSiteMetadata({
  title: "Funded Trading Challenges & Accounts",
  description:
    "Compare EliteFund funded trading challenges by account size, fee, profit target, daily loss limit, and drawdown. Review eligibility and terms before choosing a plan.",
  canonicalPath: "/",
  keywords: [
    "funded trading challenge",
    "funded trading accounts",
    "prop trading challenge",
    "funded account evaluation",
    "trading challenge fees",
    "trading challenge rules",
    "trading drawdown limits",
    "trading risk management",
  ],
})

export const viewport: Viewport = { themeColor: "#080e17", colorScheme: "dark" }

export default function LandingPage() {
  return <LandingExperience />
}
