import type { Metadata } from "next"
import { ParticipantReferralsWorkspace } from "@/components/participant-referrals-workspace"

export const metadata: Metadata = {
  title: "Referrals",
  description: "Share your EliteFund invitation and track your referral rewards.",
  robots: { index: false, follow: false },
}

export default function ReferPage() {
  return <ParticipantReferralsWorkspace />
}
