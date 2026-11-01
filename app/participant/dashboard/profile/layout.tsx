import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: "Profile & identity verification",
  description: "Manage your EliteFund profile, withdrawal wallet, and identity verification from your account workspace.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = { themeColor: "#080e17" }

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}
