import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const participantId = searchParams.get("participantId")
    if (!participantId) {
      return NextResponse.json({ success: true, count: 0 })
    }
    const rows = await sql`SELECT COUNT(*) as count FROM invite_logs WHERE participant_id = ${participantId}`
    return NextResponse.json({ success: true, count: Number(rows[0]?.count || 0) })
  } catch (error) {
    console.error("[v0] Error fetching invite count:", error)
    return NextResponse.json({ success: true, count: 0 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { userId, contacts, participantEmail } = await request.json()
    if (!userId || !Array.isArray(contacts)) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }
    let logged = 0
    for (const contact of contacts) {
      try {
        await sql`
          INSERT INTO invite_logs (participant_id, participant_email, contact_hash, contact_type, invite_method)
          VALUES (${userId}, ${participantEmail || userId}, ${contact.contactPhone || null}, 'phone', 'app_share')
          ON CONFLICT DO NOTHING
        `
        logged++
      } catch {}
    }
    return NextResponse.json({ success: true, logged })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to log invites" }, { status: 500 })
  }
}
