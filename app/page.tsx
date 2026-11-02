import type { Viewport } from "next"
import LandingExperience from "@/components/landing-experience"

export const viewport: Viewport = { themeColor: "#080e17", colorScheme: "dark" }

export default function LandingPage() {
  return <LandingExperience />
}
