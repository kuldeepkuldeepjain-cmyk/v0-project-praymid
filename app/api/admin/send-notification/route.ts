import { query } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"

let schemaReady: Promise<void> | null = null

async function ensureSupportTicketsTable() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS support_tickets (
          id TEXT PRIMARY KEY,
          participant_id TEXT NOT NULL,
          participant_email TEXT NOT NULL,
          participant_name TEXT NOT NULL,
          subject TEXT NOT NULL,
          message TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'open',
          priority TEXT NOT NULL DEFAULT 'medium',
          category TEXT NOT NULL DEFAULT 'general',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          resolved_at TIMESTAMPTZ,
          admin_response TEXT,
          admin_id TEXT
        )
      `)
      await query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_email TEXT NOT NULL,
          type TEXT DEFAULT 'info',
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          read_status BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `)
      await query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_email ON notifications(user_email)`)
    })().catch((error) => {
      schemaReady = null
      throw error
    })
  }
  await schemaReady
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession(req)
  if (!auth.ok) return auth.response

  try {
    const { recipientType, recipientEmail, title, message, type } = await req.json()

    const notificationTitle = String(title || "Message from Admin").trim().slice(0, 200)
    const notificationMessage = String(message || "").trim().slice(0, 2000)
    const notificationType = ["info", "success", "warning", "error"].includes(type) ? type : "info"

    if (!notificationMessage) {
      return NextResponse.json({ success: false, error: "Message is required" }, { status: 400 })
    }

    await ensureSupportTicketsTable()

    if (recipientType === "all") {
      const participants = await query<{ id: string; email: string; full_name: string | null }>(
        `SELECT id, email, full_name FROM participants WHERE is_deleted IS NOT TRUE`,
      )
      if (participants.length === 0) {
        return NextResponse.json({ success: false, error: "No participants found" }, { status: 404 })
      }

      for (const p of participants) {
        await query(
          `INSERT INTO notifications (user_email, title, message, type, read_status, created_at)
           VALUES ($1, $2, $3, $4, false, NOW())`,
          [p.email, notificationTitle, notificationMessage, notificationType],
        )
        const ticketId = `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        await query(
          `INSERT INTO support_tickets (id, participant_id, participant_email, participant_name, subject, message, status, priority, category, admin_response, admin_id, resolved_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'resolved', 'medium', 'general', $7, $8, NOW())`,
          [ticketId, p.id, p.email, p.full_name || p.email.split("@")[0], notificationTitle, "Message from the support team", notificationMessage, auth.email],
        )
      }

      return NextResponse.json({ success: true, count: participants.length })
    }

    const targetEmail = String(recipientEmail || "").trim().toLowerCase()
    if (!targetEmail) {
      return NextResponse.json({ success: false, error: "Recipient email is required" }, { status: 400 })
    }

    const participant = await query<{ id: string; email: string; full_name: string | null }>(
      `SELECT id, email, full_name FROM participants WHERE LOWER(email) = $1 LIMIT 1`,
      [targetEmail],
    )
    if (participant.length === 0) {
      return NextResponse.json({ success: false, error: "Participant not found" }, { status: 404 })
    }
    const p = participant[0]

    await query(
      `INSERT INTO notifications (user_email, title, message, type, read_status, created_at)
       VALUES ($1, $2, $3, $4, false, NOW())`,
      [p.email, notificationTitle, notificationMessage, notificationType],
    )

    const ticketId = `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    await query(
      `INSERT INTO support_tickets (id, participant_id, participant_email, participant_name, subject, message, status, priority, category, admin_response, admin_id, resolved_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'resolved', 'medium', 'general', $7, $8, NOW())`,
      [ticketId, p.id, p.email, p.full_name || p.email.split("@")[0], notificationTitle, "Message from the support team", notificationMessage, auth.email],
    )

    return NextResponse.json({ success: true, count: 1 })
  } catch (error: any) {
    console.error("[v0] Error sending admin notification:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}
