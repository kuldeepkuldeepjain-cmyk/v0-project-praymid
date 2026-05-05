import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
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

    const supabase = getServiceClient()
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    const { error } = await supabase
      .from("participants")
      .update({
        password: hashedPassword,
        plain_password: newPassword,
      })
      .eq("id", participantId)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Password updated successfully" })
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
