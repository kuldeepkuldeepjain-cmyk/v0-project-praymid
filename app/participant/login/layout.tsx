import type { ReactNode } from "react"
import { createSiteMetadata } from "@/lib/site-seo"

export const metadata = createSiteMetadata({
  title: "Sign in",
  description: "Sign in to your EliteFund account using your email or mobile number and password or PIN.",
  noIndex: true,
})

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children
}
