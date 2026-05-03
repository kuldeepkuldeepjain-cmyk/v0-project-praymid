import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response

  try {
    const { message } = await request.json()
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const participants = await sql`SELECT email FROM participants`
    if (!participants.length) {
      return NextResponse.json({ error: "No participants found" }, { status: 404 })
    }

    // Bulk insert notifications
    for (const p of participants) {
      await sql`
        INSERT INTO notifications (user_email, type, title, message, read_status)
        VALUES (${p.email}, 'info', 'Admin Announcement', ${message.trim()}, false)
      `
    }

    await sql`
      INSERT INTO audit_logs (action, description)
      VALUES ('global_broadcast', ${'Admin broadcast: "' + message.substring(0, 80) + (message.length > 80 ? '...' : '') + '"'})
    `

    return NextResponse.json({ success: true, message: `Broadcast sent to ${participants.length} participants` })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
