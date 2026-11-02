import type { Viewport } from "next"
import LandingExperience from "@/components/landing-experience"

export const viewport: Viewport = { themeColor: "#f5f9fd" }

export default function LandingPage() {
  return <LandingExperience />
}
