import type { ReactNode } from "react"
import { createSiteMetadata } from "@/lib/site-seo"

export const metadata = createSiteMetadata({
  title: "Create an account",
  description: "Create your EliteFund account, choose an account type, and verify your email to get started.",
  noIndex: true,
})

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return children
}
