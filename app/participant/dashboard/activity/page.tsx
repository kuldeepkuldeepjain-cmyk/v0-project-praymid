import { Suspense } from "react"
import LeaderboardContent from "@/app/leaderboard/leaderboard-content"
import { PageLoader } from "@/components/ui/page-loader"

export default function ActivityPage() {
  return (
    <Suspense fallback={<PageLoader variant="list" />}>
      <LeaderboardContent />
    </Suspense>
  )
}
