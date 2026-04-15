import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdminSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { message } = await request.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get all participant emails
    const { data: participants } = await supabase
      .from("participants")
      .select("email")
    
    if (!participants || participants.length === 0) {
      return NextResponse.json({ error: "No participants found" }, { status: 404 })
    }

    // Create broadcast notification for all participants
    const notifications = participants.map((p) => ({
      user_email: p.email,
      type: "info",
      title: "Admin Announcement",
      message: message.trim(),
      read_status: false,
    }))

    const { error } = await supabase.from("notifications").insert(notifications)

    if (error) {
      console.error("[v0] Broadcast error:", error)
      return NextResponse.json({ error: "Failed to send broadcast" }, { status: 500 })
    }

    // Log activity
    await supabase.from("audit_logs").insert({
      action: "global_broadcast",
      description: `Admin sent global broadcast: "${message.substring(0, 50)}${message.length > 50 ? "..." : ""}"`,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, message: "Broadcast sent successfully" })
  } catch (error) {
    console.error("[v0] Broadcast API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
