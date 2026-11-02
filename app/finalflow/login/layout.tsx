import type { ReactNode } from "react"
import { createSiteMetadata } from "@/lib/site-seo"

export const metadata = createSiteMetadata({
  title: "Staff Sign In",
  description: "Staff sign-in page for the EliteFund platform.",
  noIndex: true,
})

export default function StaffLoginLayout({ children }: { children: ReactNode }) {
  return children
}
