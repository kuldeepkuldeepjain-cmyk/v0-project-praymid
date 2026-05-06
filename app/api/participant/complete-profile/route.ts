import { getPool } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireParticipantSession } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  const auth = await requireParticipantSession(request)
  if (!auth.ok) return auth.response
  try {
    const { email, full_name, wallet_address, full_address } = await request.json()
    if (!email || !full_name || !wallet_address || !full_address) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }
    if (!wallet_address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json({ error: "Invalid BEP20 wallet address format" }, { status: 400 })
    }
    const db = getPool()!
    const { rows: existing } = await db.query(
      "SELECT email FROM participants WHERE wallet_address = ?AND email != $2", [wallet_address, email]
    )
    if (existing.length > 0) {
      return NextResponse.json({ error: "This wallet address is already registered to another account" }, { status: 400 })
    }
    const { rows } = await db.query(
      `UPDATE participants SET full_name=$1, wallet_address=$2, full_address=$3, details_completed=true, updated_at=NOW()
       WHERE email=?RETURNING *`,
      [full_name, wallet_address, full_address, email]
    )
    return NextResponse.json({ success: true, message: "Profile completed successfully", data: rows[0] })
  } catch (error) {
    console.error("[v0] Error in complete-profile route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
