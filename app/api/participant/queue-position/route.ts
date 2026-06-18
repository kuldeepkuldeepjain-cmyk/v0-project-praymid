import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

    const db = getPool()!
    const { rows } = await db.query(
      "SELECT queue_position, queue_start_date FROM participants WHERE email = $1", [email]
    )
    const participant = rows[0]
    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 })

    const now = new Date()
    let queuePosition = participant.queue_position
    let queueStartDate = participant.queue_start_date

    if (!queuePosition || !queueStartDate) {
      const randomPosition = Math.floor(Math.random() * (80 - 30 + 1)) + 30
      queueStartDate = now.toISOString()
      await db.query("UPDATE participants SET queue_position = $1, queue_start_date = $2 WHERE email = $3",
        [randomPosition, queueStartDate, email])
      return NextResponse.json({ success: true, position: randomPosition, startDate: queueStartDate, daysElapsed: 0 })
    }

    const startDate = new Date(queueStartDate)
    const daysElapsed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    const targetDays = 7
    const decrement = (queuePosition - 1) / targetDays
    const newPosition = Math.max(1, Math.ceil(queuePosition - daysElapsed * decrement))

    if (newPosition !== queuePosition) {
      await db.query("UPDATE participants SET queue_position = $1 WHERE email = $2", [newPosition, email])
    }

    return NextResponse.json({
      success: true, position: newPosition, initialPosition: queuePosition,
      startDate: queueStartDate, daysElapsed: Math.floor(daysElapsed * 10) / 10,
      estimatedDaysToOne: Math.max(0, targetDays - daysElapsed),
    })
  } catch (error) {
    console.error("[v0] Error fetching queue position:", error)
    return NextResponse.json({ error: "Failed to fetch queue position" }, { status: 500 })
  }
}
