import { NextResponse } from "next/server"
import { clearAdminSession } from "@/lib/session"

export async function POST() {
  try {
    await clearAdminSession()
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Logout failed" }, { status: 500 })
  }
}
