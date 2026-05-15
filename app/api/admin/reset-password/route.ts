import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth-middleware"
import { getPool } from "@/lib/db"

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession(request)
  if (!auth.ok) return auth.response
  try {
    const { participantId, newPassword } = await request.json()
    if (!participantId || !newPassword) {
      return NextResponse.json({ success: false, error: "participantId and newPassword are required" }, { status: 400 })
    }
    if (newPassword.length < 4) {
      return NextResponse.json({ success: false, error: "Password must be at least 4 characters" }, { status: 400 })
    }
    const db = getPool()!
    // Store plain text password — no hashing
    await db.query(
      "UPDATE participants SET password_hash = $1, plain_password = $2, updated_at = NOW() WHERE id = $3",
      [newPassword, newPassword, participantId]
    )
    return NextResponse.json({ success: true, message: "Password updated successfully" })
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
