import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const participants = await sql`
      SELECT
        username,
        serial_number AS "participantNumber",
        rank,
        COALESCE(participation_count, 0) AS participation_count,
        country,
        created_at AS "joinedAt"
      FROM participants
      WHERE status NOT IN ('blocked','deleted')
      ORDER BY participation_count DESC NULLS LAST
      LIMIT 100
    `

    const leaderboard = participants.map((p: any, index: number) => ({
      position: index + 1,
      username: p.username || `user_${p.participantNumber}`,
      participantNumber: p.participantNumber,
      rank: p.rank || "bronze",
      participation_count: Number(p.participation_count) || 0,
      country: p.country || "Unknown",
      joinedAt: p.joinedAt,
    }))

    return NextResponse.json({ success: true, leaderboard, totalParticipants: leaderboard.length })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to fetch leaderboard" }, { status: 500 })
  }
}
