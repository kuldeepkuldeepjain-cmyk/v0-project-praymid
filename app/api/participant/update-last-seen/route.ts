import { NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response

  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
    }

    // Update last_seen timestamp
    await execute(
      "UPDATE participants SET last_seen = NOW() WHERE email = $1",
      [email]
    )

    return NextResponse.json({ success: true, message: "Last seen updated" })
  } catch (error: any) {
    console.error("[v0] Update last seen error:", error.message || error)
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}
