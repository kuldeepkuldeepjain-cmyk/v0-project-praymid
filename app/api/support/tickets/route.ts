import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { participantEmail, category, subject, message, participantName } = await request.json()
    if (!participantEmail || !subject || !message) return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })

    const participant = await sql`SELECT id, full_name FROM participants WHERE email = ${participantEmail} LIMIT 1`
    const rows = await sql`
      INSERT INTO support_tickets (participant_id, participant_email, participant_name, subject, message, status, priority, category)
      VALUES (${participant[0]?.id || null}, ${participantEmail}, ${participantName || participant[0]?.full_name || participantEmail.split("@")[0]}, ${subject}, ${message}, 'open', ${category === "payment" || category === "account" ? "high" : "medium"}, ${category || null})
      RETURNING *
    `
    return NextResponse.json({ success: true, ticket: rows[0] })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to create ticket" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const tickets = await sql`SELECT * FROM support_tickets ORDER BY created_at DESC`
    return NextResponse.json({ success: true, tickets })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to fetch tickets" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { ticketId, status, admin_response, admin_id } = await request.json()
    if (!ticketId) return NextResponse.json({ success: false, error: "Ticket ID required" }, { status: 400 })

    const now = new Date().toISOString()
    const isResolved = status === "resolved" || status === "closed"
    const rows = await sql`
      UPDATE support_tickets
      SET status = ${status}, admin_response = ${admin_response || null}, admin_id = ${admin_id || null},
          updated_at = ${now}, resolved_at = ${isResolved ? now : null}
      WHERE id = ${ticketId}
      RETURNING *
    `
    if (rows.length === 0) return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 })
    return NextResponse.json({ success: true, ticket: rows[0] })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to update ticket" }, { status: 500 })
  }
}
