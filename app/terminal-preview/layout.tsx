import type { ReactNode } from "react"
import { createSiteMetadata } from "@/lib/site-seo"

export const metadata = createSiteMetadata({
  title: "Trading Workspace Preview",
  description: "An interactive preview route for the EliteFund trading workspace.",
  noIndex: true,
})

export default function TerminalPreviewLayout({ children }: { children: ReactNode }) {
  return children
}
