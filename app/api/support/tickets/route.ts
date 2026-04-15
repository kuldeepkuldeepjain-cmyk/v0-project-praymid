import { type NextRequest, NextResponse } from "next/server"
import type { SupportTicket } from "@/lib/types"

const supportTickets: SupportTicket[] = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { participantEmail, category, subject, message } = body

    const newTicket: SupportTicket = {
      id: `TICKET-${Date.now()}`,
      participantId: participantEmail,
      participantEmail,
      participantName: participantEmail.split("@")[0],
      subject,
      message,
      status: "open",
      priority: category === "payment" || category === "account" ? "high" : "medium",
      category,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    supportTickets.unshift(newTicket)

    console.log("[v0] New support ticket created:", newTicket)

    return NextResponse.json({ success: true, ticket: newTicket })
  } catch (error) {
    console.error("[v0] Error creating support ticket:", error)
    return NextResponse.json({ success: false, error: "Failed to create ticket" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ success: true, tickets: supportTickets })
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { ticketId, status, admin_response, admin_id } = body

    const ticket = supportTickets.find((t) => t.id === ticketId)
    if (!ticket) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 })
    }

    ticket.status = status
    ticket.admin_response = admin_response
    ticket.admin_id = admin_id
    ticket.updated_at = new Date().toISOString()
    if (status === "resolved" || status === "closed") {
      ticket.resolved_at = new Date().toISOString()
    }

    return NextResponse.json({ success: true, ticket })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to update ticket" }, { status: 500 })
  }
}
