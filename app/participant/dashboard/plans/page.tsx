import type { Metadata } from "next"
import { ParticipantPlansPage } from "@/components/participant-plans-page"

export const metadata: Metadata = {
  title: "Plans | EliteFund",
  description: "Compare EliteFund funded, challenge and normal account options.",
  robots: { index: false, follow: false },
}

export default function PlansPage() {
  return <ParticipantPlansPage />
}
