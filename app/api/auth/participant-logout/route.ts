import { NextResponse } from "next/server"
import { clearParticipantSession } from "@/lib/session"

export async function POST() {
  try {
    await clearParticipantSession()
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Logout failed" }, { status: 500 })
  }
}
