import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

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
