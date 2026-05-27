import { NextRequest, NextResponse } from "next/server"
import { query, execute, queryOne } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email, username, bep20_address } = await request.json()

    if (!email) {
      return NextResponse.json({ success: false, error: "Email required" }, { status: 400 })
    }

    await execute(
      `UPDATE participants
       SET
         username = COALESCE($1, username),
         wallet_address = COALESCE($2, wallet_address),
         bep20_address = COALESCE($3, bep20_address),
         updated_at = NOW()
       WHERE email = $4`,
      [username || null, bep20_address || null, bep20_address || null, email]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating profile:", error)
    return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 })
  }
}
