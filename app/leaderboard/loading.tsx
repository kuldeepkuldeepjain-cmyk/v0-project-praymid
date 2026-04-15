export default function Loading() {
  return (
    <div className="min-h-screen bg-[#111827] flex items-center justify-center">
      <div className="text-center">
        <div className="h-12 w-12 border-4 border-[#22d3ee]/30 border-t-[#22d3ee] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading leaderboard...</p>
      </div>
    </div>
  )
}
