import { ParticipantProfileWorkspace } from "@/components/participant-profile-workspace"

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  return <ParticipantProfileWorkspace initialSection={tab === "verification" || tab === "activity" ? tab : "profile"} />
}
