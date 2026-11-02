import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your EliteFund account using your email or mobile number and password or PIN.",
  alternates: { canonical: "/participant/login" },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
