import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const email = request.nextUrl.searchParams.get("email")
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

    const rows = await sql`SELECT queue_position, queue_start_date FROM participants WHERE email = ${email} LIMIT 1`
    const participant = rows[0]
    if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 })

    const now = new Date()
    let { queue_position, queue_start_date } = participant

    if (!queue_position || !queue_start_date) {
      const randomPosition = Math.floor(Math.random() * (80 - 30 + 1)) + 30
      queue_start_date = now.toISOString()
      await sql`UPDATE participants SET queue_position = ${randomPosition}, queue_start_date = ${queue_start_date} WHERE email = ${email}`
      return NextResponse.json({ success: true, position: randomPosition, startDate: queue_start_date, daysElapsed: 0 })
    }

    const daysElapsed = (now.getTime() - new Date(queue_start_date).getTime()) / (1000 * 60 * 60 * 24)
    const targetDays = 7
    const decrement = (queue_position - 1) / targetDays
    const newPosition = Math.max(1, Math.ceil(queue_position - daysElapsed * decrement))

    if (newPosition !== queue_position) {
      await sql`UPDATE participants SET queue_position = ${newPosition} WHERE email = ${email}`
    }

    return NextResponse.json({
      success: true,
      position: newPosition,
      initialPosition: queue_position,
      startDate: queue_start_date,
      daysElapsed: Math.floor(daysElapsed * 10) / 10,
      estimatedDaysToOne: Math.max(0, targetDays - daysElapsed),
    })
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch queue position" }, { status: 500 })
  }
}
