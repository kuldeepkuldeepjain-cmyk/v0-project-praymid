import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { requireAdminSession, requireParticipantSession } from "@/lib/auth-middleware"
import type { SupportTicket } from "@/lib/types"

export const dynamic = "force-dynamic"

let schemaReady: Promise<void> | null = null

async function ensureSupportTicketsTable() {
  if (!schemaReady) {
    schemaReady = query(`
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
    `).then(() => undefined).catch((error) => {
      schemaReady = null
      throw error
    })
  }
  await schemaReady
}

function normalizeCategory(category: unknown): SupportTicket["category"] {
  const value = String(category || "general").toLowerCase()
  if (value.includes("payment") || value.includes("payout") || value.includes("withdrawal")) return "payment"
  if (value.includes("account")) return "account"
  if (value.includes("technical") || value.includes("mt5")) return "technical"
  return "general"
}

function toTicket(row: Record<string, unknown>): SupportTicket {
  return {
    id: String(row.id),
    participantId: String(row.participant_id),
    participantEmail: String(row.participant_email),
    participantName: String(row.participant_name),
    subject: String(row.subject),
    message: String(row.message),
    status: row.status as SupportTicket["status"],
    priority: row.priority as SupportTicket["priority"],
    category: row.category as SupportTicket["category"],
    created_at: new Date(String(row.created_at)).toISOString(),
    updated_at: new Date(String(row.updated_at)).toISOString(),
    resolved_at: row.resolved_at ? new Date(String(row.resolved_at)).toISOString() : undefined,
    admin_response: row.admin_response ? String(row.admin_response) : undefined,
    admin_id: row.admin_id ? String(row.admin_id) : undefined,
  }
}

async function requireSupportStaff(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth
  return auth
}

export async function POST(request: NextRequest) {
  try {
    const participant = await requireParticipantSession(request)
    if (!participant.ok) return participant.response

    const body = await request.json()
    const subject = String(body.subject || "Support request").trim().slice(0, 160)
    const message = String(body.message || "").trim().slice(0, 5000)
    if (!message) return NextResponse.json({ success: false, error: "Message is required" }, { status: 400 })

    await ensureSupportTicketsTable()
    const id = `TICKET-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const category = normalizeCategory(body.category)
    const priority = category === "payment" || category === "account" ? "high" : "medium"
    const participantName = String(body.participantName || participant.email.split("@")[0]).trim().slice(0, 120)
    const rows = await query<Record<string, unknown>>(
      `INSERT INTO support_tickets (id, participant_id, participant_email, participant_name, subject, message, status, priority, category)
       VALUES ($1, $2, $3, $4, $5, $6, 'open', $7, $8) RETURNING *`,
      [id, participant.participantId, participant.email, participantName, subject || "Support request", message, priority, category],
    )
    return NextResponse.json({ success: true, ticket: toTicket(rows[0]) })
  } catch (error) {
    console.error("[v0] Error creating support ticket:", error)
    return NextResponse.json({ success: false, error: "Failed to create ticket" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const staff = await requireSupportStaff(request)
    if (!staff.ok) return staff.response
    await ensureSupportTicketsTable()
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM support_tickets ORDER BY CASE WHEN status = 'open' THEN 0 WHEN status = 'in_progress' THEN 1 ELSE 2 END, created_at DESC LIMIT 500`,
    )
    return NextResponse.json({ success: true, tickets: rows.map(toTicket) })
  } catch (error) {
    console.error("[v0] Error fetching support tickets:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch tickets" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const staff = await requireSupportStaff(request)
    if (!staff.ok) return staff.response
    const body = await request.json()
    const ticketId = String(body.ticketId || "")
    const status = ["open", "in_progress", "resolved", "closed"].includes(body.status) ? body.status : "in_progress"
    const response = String(body.admin_response || "").trim().slice(0, 5000)
    if (!ticketId || !response) return NextResponse.json({ success: false, error: "Ticket and response are required" }, { status: 400 })

    await ensureSupportTicketsTable()
    const ticket = await queryOne<Record<string, unknown>>(
      `UPDATE support_tickets SET status = $2, admin_response = $3, admin_id = $4, updated_at = NOW(), resolved_at = CASE WHEN $2 IN ('resolved', 'closed') THEN NOW() ELSE NULL END WHERE id = $1 RETURNING *`,
      [ticketId, status, response, staff.email],
    )
    if (!ticket) return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 })
    return NextResponse.json({ success: true, ticket: toTicket(ticket) })
  } catch (error) {
    console.error("[v0] Error updating support ticket:", error)
    return NextResponse.json({ success: false, error: "Failed to update ticket" }, { status: 500 })
  }
}
