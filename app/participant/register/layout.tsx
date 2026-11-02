import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create your EliteFund account, choose an account type, and verify your email to get started.",
  alternates: { canonical: "/participant/register" },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
