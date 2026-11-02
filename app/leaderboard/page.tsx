import { Suspense } from "react"
import LeaderboardContent from "./leaderboard-content"
import { createSiteMetadata } from "@/lib/site-seo"

export const metadata = createSiteMetadata({
  title: "Leaderboard Preview",
  description: "A sample leaderboard layout for the EliteFund trading platform.",
  noIndex: true,
})

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50 flex items-center justify-center">
          <div className="text-center">
            <div className="h-12 w-12 border-4 border-violet-200 border-t-[#E85D3B] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading leaderboard...</p>
          </div>
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  )
}
