import { NextRequest, NextResponse } from "next/server"
import { query, execute, queryOne } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email, profile_image } = await request.json()

    if (!email) {
      return NextResponse.json({ success: false, error: "Email required" }, { status: 400 })
    }

    await execute(
      `UPDATE participants
       SET profile_image = $1, updated_at = NOW()
       WHERE email = $2`,
      [profile_image, email]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating profile image:", error)
    return NextResponse.json({ success: false, error: "Failed to update profile image" }, { status: 500 })
  }
}
