import type { ReactNode } from "react"
import { createSiteMetadata } from "@/lib/site-seo"

export const metadata = createSiteMetadata({
  title: "Setup Diagnostics",
  description: "Internal diagnostics for checking EliteFund application setup and connectivity.",
  noIndex: true,
})

export default function VerifySetupLayout({ children }: { children: ReactNode }) {
  return children
}
