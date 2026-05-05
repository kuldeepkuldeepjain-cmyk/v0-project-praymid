import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { userId, contacts } = await request.json()
    if (!userId || !contacts || !Array.isArray(contacts)) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }
    const db = getPool()!
    for (const contact of contacts) {
      await db.query(
        `INSERT INTO invite_logs (user_id, contact_phone, contact_name, status, sent_at)
         VALUES ($1, $2, $3, 'sent', NOW())`,
        [userId, contact.contactPhone || null, contact.contactName || null]
      )
    }
    return NextResponse.json({ success: true, logged: contacts.length })
  } catch (error) {
    console.error("[v0] Invite log error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
