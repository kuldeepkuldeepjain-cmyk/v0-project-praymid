import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get participant data
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("queue_position, queue_start_date, created_at")
      .eq("email", email)
      .single()

    if (participantError) throw participantError

    const now = new Date()
    let queuePosition = participant?.queue_position
    let queueStartDate = participant?.queue_start_date

    // If no queue position or start date, initialize it
    if (!queuePosition || !queueStartDate) {
      // Assign a random position between 30-80
      const randomPosition = Math.floor(Math.random() * (80 - 30 + 1)) + 30
      queueStartDate = now.toISOString()

      await supabase
        .from("participants")
        .update({
          queue_position: randomPosition,
          queue_start_date: queueStartDate,
        })
        .eq("email", email)

      return NextResponse.json({
        success: true,
        position: randomPosition,
        startDate: queueStartDate,
        daysElapsed: 0,
      })
    }

    // Calculate days elapsed since queue start
    const startDate = new Date(queueStartDate)
    const msElapsed = now.getTime() - startDate.getTime()
    const daysElapsed = msElapsed / (1000 * 60 * 60 * 24)

    // Calculate new position based on 7-day progression to #1
    // Position decreases linearly over 7 days
    const initialPosition = queuePosition
    const targetDays = 7
    const decrement = (initialPosition - 1) / targetDays
    const newPosition = Math.max(1, Math.ceil(initialPosition - (daysElapsed * decrement)))

    // Update position if it changed
    if (newPosition !== queuePosition) {
      await supabase
        .from("participants")
        .update({ queue_position: newPosition })
        .eq("email", email)
    }

    return NextResponse.json({
      success: true,
      position: newPosition,
      initialPosition,
      startDate: queueStartDate,
      daysElapsed: Math.floor(daysElapsed * 10) / 10, // Round to 1 decimal
      estimatedDaysToOne: Math.max(0, targetDays - daysElapsed),
    })
  } catch (error) {
    console.error("[v0] Error fetching queue position:", error)
    return NextResponse.json(
      { error: "Failed to fetch queue position" },
      { status: 500 }
    )
  }
}
