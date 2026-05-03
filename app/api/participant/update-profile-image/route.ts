import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email, profile_image } = await request.json()

    if (!email) {
      return NextResponse.json({ success: false, error: "Email required" }, { status: 400 })
    }

    await sql`
      UPDATE participants
      SET profile_image = ${profile_image}, updated_at = NOW()
      WHERE email = ${email}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating profile image:", error)
    return NextResponse.json({ success: false, error: "Failed to update profile image" }, { status: 500 })
  }
}
