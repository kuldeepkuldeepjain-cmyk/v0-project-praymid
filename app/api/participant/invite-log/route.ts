import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { userId, contacts } = await request.json()

    if (!userId || !contacts || !Array.isArray(contacts)) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    console.log("[v0] Logging", contacts.length, "invites for user", userId)

    const supabase = await createClient()

    // Prepare invite log entries
    const inviteLogs = contacts.map((contact: any) => ({
      user_id: userId,
      contact_phone: contact.contactPhone,
      contact_name: contact.contactName,
      status: "sent",
      created_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
    }))

    // Insert into invite_logs table
    const { data, error } = await supabase
      .from("invite_logs")
      .insert(inviteLogs)
      .select()

    if (error) {
      console.error("[v0] Error inserting invite logs:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log("[v0] Successfully logged", data.length, "invites")

    return NextResponse.json({
      success: true,
      logged: data.length,
    })
  } catch (error) {
    console.error("[v0] Invite log error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
