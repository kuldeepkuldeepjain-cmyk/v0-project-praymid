import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { email, bep20_address } = await request.json()

    if (!email || !bep20_address) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(bep20_address)) {
      return NextResponse.json({ error: "Invalid BEP20 address format" }, { status: 400 })
    }

    const db = getPool()!
    const result = await db.query(
      "UPDATE participants SET wallet_address = $1, bep20_address = $1, updated_at = NOW() WHERE email = ?RETURNING id, email, wallet_address",
      [bep20_address, email]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "BEP20 address updated successfully", data: result[0] })
  } catch (error) {
    console.error("Update BEP20 error:", error)
    return NextResponse.json({ error: "Failed to update BEP20 address" }, { status: 500 })
  }
}
