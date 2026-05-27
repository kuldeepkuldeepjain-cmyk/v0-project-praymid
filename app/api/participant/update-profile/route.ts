import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email, username, bep20_address } = await request.json()

    if (!email) {
      return NextResponse.json({ success: false, error: "Email required" }, { status: 400 })
    }

    await sql`
      UPDATE participants
      SET
        username = COALESCE(${username || null}, username),
        wallet_address = COALESCE(${bep20_address || null}, wallet_address),
        bep20_address = COALESCE(${bep20_address || null}, bep20_address),
        updated_at = NOW()
      WHERE email = ${email}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating profile:", error)
    return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 })
  }
}
